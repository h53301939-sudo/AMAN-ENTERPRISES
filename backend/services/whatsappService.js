const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { generateInvoicePdfBuffer, generatePurchaseOrderPdfBuffer } = require('../utils/pdfGenerator');

const AUTH_DIR = path.join(__dirname, '../whatsapp_auth');

// Dynamic import helper for ESM baileys package
let baileysModule = null;
async function getBaileys() {
  if (!baileysModule) {
    baileysModule = await import('@whiskeysockets/baileys');
  }
  return baileysModule;
}

// Global in-memory state
let sock = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
let latestQrDataUrl = null;
let connectedUserJid = null;
let connectedNumber = null;
let isInitializing = false;
let reconnectTimer = null;
let heartbeatTimer = null;

// Ensure auth dir exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

/**
 * Robust Indian Mobile & International Phone JID Normalizer
 * Handles: +91 98893 61658, 09889361658, 919889361658, 9889361658, 8932094428, etc.
 */
function normalizeWhatsAppJid(rawPhone) {
  if (!rawPhone) return null;
  const digits = String(rawPhone).replace(/\D/g, '');
  if (!digits || digits.length < 10) return null;

  let clean = digits;
  // If 11 digits starting with 0 (e.g. 09889361658), remove leading 0
  if (clean.length === 11 && clean.startsWith('0')) {
    clean = clean.slice(1);
  }

  // Standard Indian 10-digit number
  if (clean.length === 10) {
    clean = `91${clean}`;
  } else if (clean.length > 10 && clean.startsWith('91')) {
    // Already has 91 country prefix
  } else if (clean.length >= 10) {
    // Fallback: take last 10 digits and add 91
    clean = `91${clean.slice(-10)}`;
  }

  return `${clean}@s.whatsapp.net`;
}

/**
 * Wait until socket connection is active (up to timeoutMs)
 */
async function ensureConnected(timeoutMs = 15000) {
  if (connectionStatus === 'connected' && sock) return true;

  // If not initializing and disconnected, attempt to initialize if creds exist
  if (connectionStatus === 'disconnected' && fs.existsSync(path.join(AUTH_DIR, 'creds.json'))) {
    initWhatsApp(false);
  }

  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (connectionStatus === 'connected' && sock) return true;
    await new Promise(r => setTimeout(r, 600));
  }

  return connectionStatus === 'connected' && sock !== null;
}

/**
 * Initialize Baileys WhatsApp Socket (Clean Singleton Pattern)
 */
async function initWhatsApp(forceNew = false) {
  if (isInitializing) return;
  isInitializing = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Aggressively destroy previous socket to eliminate zombie sockets & Code 440 Stream conflicts
  if (sock) {
    try {
      sock.ev.removeAllListeners();
      sock.ws?.close();
      sock.end?.();
    } catch (e) {}
    sock = null;
  }

  try {
    const baileys = await getBaileys();
    const makeWASocket = baileys.default || baileys.makeWASocket;
    const { useMultiFileAuthState, makeCacheableSignalKeyStore, DisconnectReason } = baileys;

    if (forceNew && fs.existsSync(AUTH_DIR)) {
      try {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      } catch (e) {
        console.warn('[WhatsApp] Error clearing auth dir:', e.message);
      }
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    connectionStatus = 'connecting';
    latestQrDataUrl = null;

    // Use memory caching for Signal keys to avoid disk lock contention on sequential document dispatches
    const keyLogger = pino({ level: 'silent' });
    const keys = makeCacheableSignalKeyStore ? makeCacheableSignalKeyStore(state.keys, keyLogger) : state.keys;

    sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: keys
      },
      printQRInTerminal: false,
      logger: keyLogger,
      browser: ['David Traders ERP', 'Chrome', '122.0.0'],
      syncFullHistory: false,
      keepAliveIntervalMs: 15000,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      emitOwnEvents: false,
      retryRequestDelayMs: 350,
      maxRetries: 5,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        connectionStatus = 'qr_ready';
        try {
          latestQrDataUrl = await QRCode.toDataURL(qr);
        } catch (qrErr) {
          console.error('[WhatsApp] Error generating QR data URL:', qrErr);
        }
      }

      if (connection === 'open') {
        connectionStatus = 'connected';
        latestQrDataUrl = null;
        connectedUserJid = sock?.user?.id || '';
        connectedNumber = connectedUserJid.split(':')[0].split('@')[0] || '';
        console.log(`✅ [WhatsApp Gateway] Connected successfully! Business Number: +${connectedNumber}`);

        // Start heartbeat monitor
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(async () => {
          if (connectionStatus === 'connected' && sock) {
            try {
              await sock.sendPresenceUpdate('available');
            } catch (hbErr) {
              console.warn('[WhatsApp] Heartbeat ping failed, refreshing connection...', hbErr.message);
              scheduleReconnect(1500);
            }
          }
        }, 45000);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || 'Unknown reason';
        console.warn(`⚠️ [WhatsApp Gateway] Connection closed. Code: ${statusCode}, Reason: ${reason}`);

        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }

        // Clean up closed socket
        if (sock) {
          try {
            sock.ev.removeAllListeners();
          } catch (e) {}
          sock = null;
        }

        if (statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403) {
          connectionStatus = 'disconnected';
          latestQrDataUrl = null;
          connectedNumber = null;
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch (e) {}
          console.log('[WhatsApp Gateway] Logged out from WhatsApp device. Auth session cleared.');
        } else if (statusCode === 440 || statusCode === DisconnectReason.connectionReplaced) {
          // Conflict: WhatsApp Web is active in another tab / terminal or phone session
          connectionStatus = 'disconnected';
          console.warn('⚠️ [WhatsApp Gateway] Session conflict (Code 440). Pausing 8s before reconnect to allow duplicate process to clear...');
          scheduleReconnect(8000);
        } else {
          // Normal network drop / reconnect
          connectionStatus = 'connecting';
          scheduleReconnect(3000);
        }
      }
    });

  } catch (err) {
    console.error('❌ [WhatsApp Gateway] Error initializing socket:', err);
    connectionStatus = 'disconnected';
    scheduleReconnect(6000);
  } finally {
    isInitializing = false;
  }
}

/**
 * Schedule a safe reconnect
 */
function scheduleReconnect(delayMs = 3000) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    isInitializing = false;
    initWhatsApp(false);
  }, delayMs);
}

/**
 * Get current Gateway status
 */
function getStatus() {
  return {
    status: connectionStatus,
    qrCode: latestQrDataUrl,
    connectedNumber: connectedNumber,
    isReady: connectionStatus === 'connected' && sock !== null
  };
}

/**
 * Disconnect and logout current linked device
 */
async function disconnectWhatsApp() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  try {
    if (sock) {
      await sock.logout().catch(() => {});
      sock.end();
      sock = null;
    }
  } catch (e) {}

  connectionStatus = 'disconnected';
  latestQrDataUrl = null;
  connectedNumber = null;

  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
  } catch (e) {}

  return { message: 'WhatsApp device disconnected successfully' };
}

// 📦 Sequential FIFO Send Queue to prevent WebSocket payload collision during rapid billing
let sendQueue = Promise.resolve();

/**
 * Send custom PDF document safely via FIFO queue
 */
function queueSend(fn) {
  sendQueue = sendQueue.then(async () => {
    try {
      return await fn();
    } catch (err) {
      throw err;
    } finally {
      // 400ms breather between sequential messages
      await new Promise(r => setTimeout(r, 400));
    }
  });
  return sendQueue;
}

/**
 * Send the high-definition frontend PDF invoice document directly to customer's WhatsApp with auto-retry
 * @param {string} rawPhone - Customer phone number
 * @param {Buffer} pdfBuffer - Real PDF binary buffer matching frontend invoice modal design
 * @param {Object} invoiceMeta - Invoice metadata
 */
async function sendCustomPdfDocument(rawPhone, pdfBuffer, invoiceMeta = {}) {
  return queueSend(async () => {
    const isReady = await ensureConnected(12000);
    if (!isReady || !sock) {
      throw new Error('WhatsApp Gateway is currently reconnecting or offline. Please ensure WhatsApp is connected in Settings.');
    }

    const jid = normalizeWhatsAppJid(rawPhone);
    if (!jid) {
      throw new Error(`Invalid customer phone number: "${rawPhone}". Please ensure a valid 10-digit mobile number.`);
    }

    const fileName = `Invoice_${invoiceMeta.invoiceNumber || 'PEP'}.pdf`;
    const dateObj = new Date(invoiceMeta.createdAt || Date.now());
    const dateStr = `${dateObj.toLocaleDateString('en-IN')}, ${dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    let paymentDisplay = invoiceMeta.paymentMethod || 'Cash';
    if (invoiceMeta.paymentMethod === 'Split') {
      paymentDisplay = `Split (Cash: ₹${invoiceMeta.cashAmount || 0} | UPI: ₹${invoiceMeta.upiAmount || 0})`;
    } else if (invoiceMeta.paymentMethod === 'Credit') {
      const paid = Number(invoiceMeta.paidAmount || (Number(invoiceMeta.cashAmount || 0) + Number(invoiceMeta.upiAmount || 0)));
      if (paid > 0) {
        if (Number(invoiceMeta.cashAmount || 0) > 0 && Number(invoiceMeta.upiAmount || 0) > 0) {
          paymentDisplay = `Credit (Paid: Cash ₹${invoiceMeta.cashAmount} + UPI ₹${invoiceMeta.upiAmount})`;
        } else if (Number(invoiceMeta.cashAmount || 0) > 0) {
          paymentDisplay = `Credit (Paid Cash: ₹${invoiceMeta.cashAmount})`;
        } else if (Number(invoiceMeta.upiAmount || 0) > 0) {
          paymentDisplay = `Credit (Paid UPI: ₹${invoiceMeta.upiAmount})`;
        } else {
          paymentDisplay = `Credit (Paid: ₹${paid})`;
        }
      } else {
        paymentDisplay = 'Credit (100% Due)';
      }
    }
    const caption = 
`🧾 *AMAN ENTERPRISES*
----------------------------------------
*SALES INVOICE:* #${invoiceMeta.invoiceNumber || 'N/A'}
*Date & Time:* ${dateStr}
*Customer:* ${invoiceMeta.customerName || 'Valued Customer'}
*Payment Mode:* ${paymentDisplay}
💰 *NET TOTAL:* ₹${Number(invoiceMeta.netTotal || 0).toFixed(2)}
${invoiceMeta.dueAmount > 0 ? `⚠️ *DUE BALANCE:* ₹${Number(invoiceMeta.dueAmount).toFixed(2)}` : '✅ *STATUS:* PAID FULL'}

Attached is your official PDF Tax Invoice.
Thank you for choosing Aman Enterprises!`;

    // Auto-retry up to 3 times on temporary socket drops
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (connectionStatus !== 'connected' || !sock) {
          await ensureConnected(8000);
        }

        const result = await sock.sendMessage(jid, {
          document: pdfBuffer,
          mimetype: 'application/pdf',
          fileName: fileName,
          caption: caption
        });

        console.log(`✅ [WhatsApp Gateway] Invoice #${invoiceMeta.invoiceNumber} PDF delivered to ${jid} (Attempt ${attempt})`);
        return result;
      } catch (err) {
        lastError = err;
        console.warn(`⚠️ [WhatsApp Gateway] Send attempt ${attempt} failed for #${invoiceMeta.invoiceNumber}: ${err.message}`);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    }

    throw new Error(lastError?.message || 'Failed to deliver PDF invoice via WhatsApp after 3 attempts');
  });
}

/**
 * Automatically send generated PDF document invoice directly to customer's WhatsApp
 * @param {string} rawPhone - Customer phone number
 * @param {Object} sale - Populated sale object
 */
async function sendInvoicePdfDirect(rawPhone, sale) {
  const pdfBuffer = await generateInvoicePdfBuffer(sale);
  return sendCustomPdfDocument(rawPhone, pdfBuffer, {
    invoiceNumber: sale.invoiceNumber,
    customerName: sale.customer?.shopName || 'Valued Customer',
    paymentMethod: sale.paymentMethod,
    cashAmount: sale.cashAmount,
    upiAmount: sale.upiAmount,
    netTotal: sale.netTotal,
    dueAmount: sale.dueAmount,
    createdAt: sale.createdAt
  });
}

/**
 * Automatically send generated Purchase Order PDF directly to supplier's WhatsApp with auto-retry
 * @param {string} rawPhone - Supplier phone number
 * @param {Object} po - Populated Purchase Order object
 */
async function sendPurchaseOrderPdfDirect(rawPhone, po) {
  return queueSend(async () => {
    const isReady = await ensureConnected(12000);
    if (!isReady || !sock) {
      throw new Error('WhatsApp Gateway is not connected. Please connect WhatsApp in System Settings.');
    }

    const jid = normalizeWhatsAppJid(rawPhone);
    if (!jid) {
      throw new Error(`Invalid supplier phone number: "${rawPhone}". Please ensure a valid 10-digit mobile number.`);
    }

    const pdfBuffer = await generatePurchaseOrderPdfBuffer(po);
    const fileName = `PurchaseOrder_${po.poNumber || 'PO'}.pdf`;
    const dateStr = new Date(po.orderDate || Date.now()).toLocaleDateString('en-IN');
    const deliveryStr = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN') : 'Immediate / Next Dispatch';
    const caption = 
`📋 *PURCHASE ORDER: #${po.poNumber}*
*AMAN ENTERPRISES*
----------------------------------------
*Date:* ${dateStr}
*Supplier:* ${po.supplierName || 'Supplier'}
*Expected Delivery:* ${deliveryStr}
*Total Volume:* ${po.totalCases || 0} Boxes
${po.notes ? `\n📝 *Notes:* ${po.notes}` : ''}

📎 *Attached is our official Purchase Order PDF. Please check the PDF for full item and size specifications.*

Please confirm receipt and dispatch schedule. Thank you!`;

    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (connectionStatus !== 'connected' || !sock) {
          await ensureConnected(8000);
        }

        const result = await sock.sendMessage(jid, {
          document: pdfBuffer,
          mimetype: 'application/pdf',
          fileName: fileName,
          caption: caption
        });

        console.log(`✅ [WhatsApp Gateway] PO #${po.poNumber} PDF delivered to ${jid} (Attempt ${attempt})`);
        return result;
      } catch (err) {
        lastError = err;
        console.warn(`⚠️ [WhatsApp Gateway] Send attempt ${attempt} failed for PO #${po.poNumber}: ${err.message}`);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    }

    throw new Error(lastError?.message || 'Failed to deliver Purchase Order PDF via WhatsApp after 3 attempts');
  });
}

// Auto-initialize on server boot if auth directory exists
if (fs.existsSync(path.join(AUTH_DIR, 'creds.json'))) {
  initWhatsApp(false);
}

module.exports = {
  initWhatsApp,
  getStatus,
  disconnectWhatsApp,
  sendCustomPdfDocument,
  sendInvoicePdfDirect,
  sendPurchaseOrderPdfDirect
};
