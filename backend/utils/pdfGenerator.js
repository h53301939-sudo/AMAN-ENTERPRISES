const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const Setting = require('../models/Setting');

const getSafeSettings = async () => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      return await Setting.findOne().lean().exec();
    }
  } catch (e) {}
  return null;
};

/**
 * Dynamically stream formatted PDF Invoice directly to HTTP response
 * @param {Object} sale - Populated sale object
 * @param {Object} res - Express response stream
 */
const streamInvoicePdf = async (sale, res) => {
  const settings = await getSafeSettings();
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=Invoice_${sale.invoiceNumber}.pdf`);

  doc.pipe(res);
  buildInvoiceContent(doc, sale, settings);
  doc.end();
};

/**
 * Generate PDF Invoice as in-memory Buffer for direct WhatsApp delivery
 * @param {Object} sale - Populated sale object
 * @returns {Promise<Buffer>}
 */
const generateInvoicePdfBuffer = async (sale) => {
  const settings = await getSafeSettings();
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      buildInvoiceContent(doc, sale, settings);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

function buildInvoiceContent(doc, sale, settings = null) {
  // Look for logo file dynamically in backend/assets or frontend/src/assets
  const possibleLogos = [
    path.join(__dirname, '../assets/amanlogo.jpg'),
    path.join(__dirname, '../assets/balajilogo.png'),
    path.join(__dirname, '../../frontend/src/assets/amanlogo.jpg')
  ];
  const logoPath = possibleLogos.find(p => fs.existsSync(p));

  // Company metadata from settings or fallback defaults
  const companyName = settings?.companyName || 'AMAN ENTERPRISES';
  const companyAddress = settings?.address || 'Main Wholesale Market, Station Road';
  const companyPhone = settings?.phone || '+91 98765 43210';
  const companyEmail = settings?.email || 'sales@amanenterprises.com';
  const footerNote = settings?.invoiceFooter || 'Thank you for choosing Aman Enterprises!';

  // -----------------------------------------------------------------
  // 1. TOP HEADER & TRI-COLOR BRANDING BAR
  // -----------------------------------------------------------------
  // Signature Tri-Color Accent Line at top
  doc.rect(40, 20, 171, 3).fill('#0051A5');
  doc.rect(211, 20, 171, 3).fill('#E31E24');
  doc.rect(382, 20, 173, 3).fill('#FFC72C');

  let textStartX = 40;
  if (logoPath) {
    try {
      doc.save();
      doc.circle(65, 58, 22).clip();
      doc.image(logoPath, 43, 36, { width: 44, height: 44 });
      doc.restore();
      doc.circle(65, 58, 22).lineWidth(1.2).strokeColor('#0051A5').stroke();
      textStartX = 96;
    } catch (e) {
      textStartX = 40;
    }
  }

  // Company Name & Subtitle Info
  doc.fillColor('#0051A5').fontSize(16).font('Helvetica-Bold').text(companyName, textStartX, 36);
  doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(companyAddress, textStartX, 56, { width: 310 });
  doc.fontSize(8).fillColor('#64748B').text(`Ph: ${companyPhone}  •  Email: ${companyEmail}`, textStartX, 70);

  // Sales Invoice Title Pill (Top-Right)
  doc.fillColor('#E0F2FE').roundedRect(420, 35, 135, 18, 4).fill();
  doc.fillColor('#0369A1').fontSize(8.5).font('Helvetica-Bold').text('SALES INVOICE', 420, 39, { width: 135, align: 'center' });
  doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text(`#${sale.invoiceNumber}`, 370, 58, { width: 185, align: 'right' });
  const saleDateObj = new Date(sale.createdAt || Date.now());
  const saleDateFormatted = `${saleDateObj.toLocaleDateString('en-IN')} • ${saleDateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(`Date: ${saleDateFormatted}`, 370, 72, { width: 185, align: 'right' });

  // Subtle Header Divider
  doc.strokeColor('#E2E8F0').lineWidth(0.8).moveTo(40, 90).lineTo(555, 90).stroke();

  // -----------------------------------------------------------------
  // 2. CUSTOMER & PAYMENT BREAKDOWN CARDS
  // -----------------------------------------------------------------
  const cardY = 100;
  const cardH = 68;

  // Left Card: Billed to Customer
  doc.fillColor('#F8FAFC').roundedRect(40, cardY, 250, cardH, 8).fill();
  doc.strokeColor('#E2E8F0').lineWidth(0.6).roundedRect(40, cardY, 250, cardH, 8).stroke();

  doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica-Bold').text('BILLED TO CUSTOMER', 50, cardY + 8);
  doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text(sale.customer?.shopName || 'Valued Customer', 50, cardY + 20, { width: 230 });
  doc.fillColor('#334155').fontSize(8.5).font('Helvetica').text(`Owner: ${sale.customer?.ownerName || 'N/A'} (Ph: ${sale.customer?.phone || 'N/A'})`, 50, cardY + 34, { width: 230 });
  const custAddress = sale.customer?.address || sale.customerAddress || 'Main Market';
  doc.fillColor('#64748B').fontSize(8).font('Helvetica').text(`Address: ${custAddress}`, 50, cardY + 48, { width: 230 });

  // Right Card: Source, Salesman & Payment Breakdown
  doc.fillColor('#F8FAFC').roundedRect(305, cardY, 250, cardH, 8).fill();
  doc.strokeColor('#E2E8F0').lineWidth(0.6).roundedRect(305, cardY, 250, cardH, 8).stroke();

  doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica-Bold').text('SOURCE, SALESMAN & PAYMENT', 315, cardY + 6);
  doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(`Salesman: ${sale.worker?.name || 'Authorized Staff'}`, 315, cardY + 18, { width: 230 });
  doc.fillColor('#475569').fontSize(8).font('Helvetica').text(`Dispatch: ${sale.vehicle?.vehicleNumber ? `Van (${sale.vehicle.vehicleNumber})` : 'Direct Warehouse Counter'}`, 315, cardY + 30, { width: 230 });

  const pMode = (sale.paymentMethod || 'Cash').toUpperCase();
  doc.fillColor('#475569').fontSize(8).font('Helvetica').text('Payment Mode: ', 315, cardY + 42, { continued: true });
  doc.fillColor('#0051A5').font('Helvetica-Bold').text(pMode);

  // -----------------------------------------------------------------
  // 3. ITEMS TABLE (WITH SELLING UNIT)
  // -----------------------------------------------------------------
  const tableHeaderY = 178;
  doc.fillColor('#F1F5F9').rect(40, tableHeaderY, 515, 20).fill();
  doc.strokeColor('#E2E8F0').lineWidth(0.8).moveTo(40, tableHeaderY + 20).lineTo(555, tableHeaderY + 20).stroke();

  doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold');
  doc.text('#', 48, tableHeaderY + 6);
  doc.text('ITEM DESCRIPTION', 70, tableHeaderY + 6);
  doc.text('UNIT', 250, tableHeaderY + 6, { width: 50, align: 'center' });
  doc.text('QTY', 310, tableHeaderY + 6, { width: 45, align: 'center' });
  doc.text('RATE (Rs)', 365, tableHeaderY + 6, { width: 85, align: 'right' });
  doc.text('AMOUNT (Rs)', 460, tableHeaderY + 6, { width: 85, align: 'right' });

  // Table Rows
  let currentY = tableHeaderY + 26;
  const items = sale.items || [];

  items.forEach((item, index) => {
    if (currentY > 700) {
      doc.addPage();
      currentY = 40;
    }

    doc.fillColor('#64748B').fontSize(8.5).font('Helvetica').text(`${index + 1}`, 48, currentY);
    const itemName = item.productName || item.product?.name || 'Balaji Item';
    const unitType = item.unitType || (item.size === 'Hanger' ? 'Hanger' : 'Box');

    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9).text(itemName, 70, currentY, { width: 175 });
    doc.fillColor('#0284C7').font('Helvetica-Bold').fontSize(8.5).text(unitType, 250, currentY, { width: 50, align: 'center' });
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9).text(`${item.quantity}`, 310, currentY, { width: 45, align: 'center' });
    doc.fillColor('#334155').font('Helvetica').fontSize(8.5).text(`Rs.${Number(item.unitPrice || 0).toFixed(2)}`, 365, currentY, { width: 85, align: 'right' });
    const itemTotal = item.totalAmount || (item.quantity * item.unitPrice) || 0;
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9.5).text(`Rs.${Number(itemTotal).toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });

    currentY += 18;
    doc.strokeColor('#F1F5F9').lineWidth(0.5).moveTo(40, currentY - 2).lineTo(555, currentY - 2).stroke();
  });

  // Table Bottom Divider
  doc.strokeColor('#E2E8F0').lineWidth(0.8).moveTo(40, currentY + 4).lineTo(555, currentY + 4).stroke();
  currentY += 16;

  // -----------------------------------------------------------------
  // 4. SUMMARY & TOTALS (MATCHING IMAGE 1)
  // -----------------------------------------------------------------
  const subTotal = sale.subTotal || sale.items?.reduce((acc, i) => acc + (i.totalAmount || 0), 0) || sale.netTotal;
  const discount = Number(sale.discount || 0);

  // Left: Paid / Due Status Badge & Note
  if (sale.status === 'Paid' || (sale.dueAmount <= 0 && sale.paidAmount >= sale.netTotal)) {
    doc.fillColor('#ECFDF5').roundedRect(40, currentY, 80, 18, 9).fill();
    doc.strokeColor('#A7F3D0').lineWidth(0.6).roundedRect(40, currentY, 80, 18, 9).stroke();
    doc.fillColor('#065F46').fontSize(7.5).font('Helvetica-Bold').text('PAID FULL', 40, currentY + 5, { width: 80, align: 'center' });
  } else {
    doc.fillColor('#FEF3C7').roundedRect(40, currentY, 110, 18, 9).fill();
    doc.strokeColor('#FDE68A').lineWidth(0.6).roundedRect(40, currentY, 110, 18, 9).stroke();
    doc.fillColor('#92400E').fontSize(7.5).font('Helvetica-Bold').text(`DUE: Rs.${Number(sale.dueAmount).toFixed(2)}`, 40, currentY + 5, { width: 110, align: 'center' });
  }

  // Footer Tagline Note (under badge)
  doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#94A3B8').text(footerNote, 40, currentY + 24, { width: 280 });

  // Right: Sub Total, Discount, Net Total, Paid Amount
  const rightLabelX = 330;
  const rightValX = 455;
  const rightValW = 90;

  if (discount > 0) {
    doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text('Sub Total:', rightLabelX, currentY, { width: 120, align: 'right' });
    doc.fillColor('#334155').fontSize(8.5).font('Helvetica').text(`Rs.${subTotal.toFixed(2)}`, rightValX, currentY, { width: rightValW, align: 'right' });
    currentY += 14;

    doc.fillColor('#059669').fontSize(8.5).font('Helvetica-Bold').text('Discount:', rightLabelX, currentY, { width: 120, align: 'right' });
    doc.text(`-Rs.${discount.toFixed(2)}`, rightValX, currentY, { width: rightValW, align: 'right' });
    currentY += 14;
  }

  // Net Total Top Line
  doc.strokeColor('#E2E8F0').lineWidth(0.8).moveTo(360, currentY).lineTo(555, currentY).stroke();
  currentY += 6;

  doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('Net Total:', rightLabelX, currentY, { width: 120, align: 'right' });
  doc.fillColor('#002B7F').fontSize(13).font('Helvetica-Bold').text(`Rs.${Number(sale.netTotal || 0).toFixed(2)}`, rightValX, currentY - 1, { width: rightValW, align: 'right' });
  currentY += 18;

  if (sale.paidAmount !== undefined) {
    doc.fillColor('#059669').fontSize(8.5).font('Helvetica-Bold').text('Paid Amount:', rightLabelX, currentY, { width: 120, align: 'right' });
    doc.text(`Rs.${Number(sale.paidAmount || 0).toFixed(2)}`, rightValX, currentY, { width: rightValW, align: 'right' });
  }
}

/**
 * Dynamically stream formatted Purchase Order (PO) directly to HTTP response
 * Note: Does NOT include rates/prices as per user requirement (Item Name, Size, Quantity Cases only)
 * @param {Object} po - Populated Purchase Order object
 * @param {Object} res - Express response stream
 */
const streamPurchaseOrderPdf = (po, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=PurchaseOrder_${po.poNumber}.pdf`);

  doc.pipe(res);
  buildPurchaseOrderContent(doc, po);
  doc.end();
};

/**
 * Generate Purchase Order PDF Buffer for direct WhatsApp delivery to supplier
 * @param {Object} po - Populated Purchase Order object
 * @returns {Promise<Buffer>}
 */
const generatePurchaseOrderPdfBuffer = (po) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      buildPurchaseOrderContent(doc, po);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

function buildPurchaseOrderContent(doc, po) {
  const logoPath = path.join(__dirname, '../assets/pepsi-logo.png');

  // Draw Header
  let textStartX = 40;
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 40, 35, { width: 46, height: 46 });
      textStartX = 96;
    } catch (e) {}
  }

  // Company Name & Info
  doc.fillColor('#002B7F').fontSize(18).font('Helvetica-Bold').text('AMAN ENTERPRISES', textStartX, 38);
  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text('Main Wholesale Market, Station Road • Ph: 9876543210', textStartX, 58);
  doc.fontSize(8).fillColor('#64748B').text('GSTIN: 09ABCDE1234F1Z5', textStartX, 70);

  // PO Title Pill (Right)
  doc.fillColor('#E0F2FE').rect(400, 35, 155, 20).fill();
  doc.fillColor('#0369A1').fontSize(9).font('Helvetica-Bold').text('PURCHASE ORDER (PO)', 400, 41, { width: 155, align: 'center' });
  doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text(`#${po.poNumber}`, 370, 60, { width: 185, align: 'right' });
  const poDateObj = new Date(po.orderDate || Date.now());
  const poDateFormatted = `${poDateObj.toLocaleDateString('en-IN')} • ${poDateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(`Date: ${poDateFormatted}`, 370, 73, { width: 185, align: 'right' });

  // Divider
  doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, 92).lineTo(555, 92).stroke();

  // Supplier & PO Details Cards
  const cardY = 102;
  doc.fillColor('#F8FAFC').roundedRect(40, cardY, 250, 72, 6).fill();
  doc.strokeColor('#E2E8F0').lineWidth(0.5).roundedRect(40, cardY, 250, 72, 6).stroke();

  doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica-Bold').text('SUPPLIER / BOTTLING PLANT', 50, cardY + 8);
  doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text(po.supplierName || po.supplier?.name || 'Snacks & Namkeen Supplier', 50, cardY + 20);
  doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text(`Contact: ${po.supplier?.contactPerson || 'Sales Team'} (Ph: ${po.supplierPhone || po.supplier?.phone || 'N/A'})`, 50, cardY + 34);
  const supAddress = po.supplierAddress || po.supplier?.address || 'Industrial Manufacturing Plant';
  doc.fillColor('#64748B').fontSize(8).text(`Address: ${supAddress}`, 50, cardY + 48, { width: 230 });

  // Order Details Card (Right)
  doc.fillColor('#F8FAFC').roundedRect(305, cardY, 250, 72, 6).fill();
  doc.strokeColor('#E2E8F0').lineWidth(0.5).roundedRect(305, cardY, 250, 72, 6).stroke();

  doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica-Bold').text('ORDER DISPATCH DETAILS', 315, cardY + 8);
  doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(`Issued By: ${po.createdBy?.name || 'Aman Enterprises Management'}`, 315, cardY + 20);
  const deliveryDateStr = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN') : 'Immediate / Next Dispatch';
  doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text(`Expected Delivery: ${deliveryDateStr}`, 315, cardY + 34);
  doc.fillColor('#002B7F').fontSize(8.5).font('Helvetica-Bold').text(`Status: ${po.status || 'Sent to Supplier'}`, 315, cardY + 48);

  // Table Header (Item, Size, Quantity Boxes - NO RATES)
  const tableHeaderY = 186;
  doc.fillColor('#002B7F').rect(40, tableHeaderY, 515, 22).fill();
  doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
  doc.text('#', 48, tableHeaderY + 6);
  doc.text('Item Description', 80, tableHeaderY + 6);
  doc.text('Size / Packaging', 300, tableHeaderY + 6, { width: 120, align: 'left' });
  doc.text('Quantity (Boxes)', 430, tableHeaderY + 6, { width: 115, align: 'right' });

  // Table Rows
  let currentY = tableHeaderY + 28;
  const items = po.items || [];

  items.forEach((item, index) => {
    if (currentY > 700) {
      doc.addPage();
      currentY = 40;
    }

    if (index % 2 === 1) {
      doc.fillColor('#F8FAFC').rect(40, currentY - 4, 515, 20).fill();
    }

    doc.fillColor('#64748B').fontSize(8.5).font('Helvetica').text(`${index + 1}`, 48, currentY);
    const itemName = item.productName || item.product?.name || 'Snacks Item';
    const itemSize = item.size || item.product?.size || '-';

    doc.fillColor('#0F172A').font('Helvetica-Bold').text(itemName, 80, currentY, { width: 210 });
    doc.fillColor('#475569').font('Helvetica').text(itemSize, 300, currentY, { width: 120, align: 'left' });
    doc.fillColor('#002B7F').font('Helvetica-Bold').fontSize(9.5).text(`${item.quantity} Boxes`, 430, currentY, { width: 115, align: 'right' });

    currentY += 20;
  });

  doc.strokeColor('#E2E8F0').lineWidth(0.8).moveTo(40, currentY + 4).lineTo(555, currentY + 4).stroke();
  currentY += 16;

  // Summary Card: Total Quantity Ordered
  const totalCases = po.totalCases || items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);

  doc.fillColor('#F1F5F9').roundedRect(40, currentY, 515, 32, 6).fill();
  doc.strokeColor('#CBD5E1').lineWidth(0.5).roundedRect(40, currentY, 515, 32, 6).stroke();

  doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text('TOTAL ORDER VOLUME:', 55, currentY + 10);
  doc.fillColor('#002B7F').fontSize(12).font('Helvetica-Bold').text(`${totalCases} BOXES`, 380, currentY + 9, { width: 165, align: 'right' });

  currentY += 45;

  // Special Notes (if any)
  if (po.notes) {
    doc.fillColor('#64748B').fontSize(8).font('Helvetica-Bold').text('SPECIAL INSTRUCTIONS / NOTES:', 40, currentY);
    doc.fillColor('#334155').fontSize(8.5).font('Helvetica').text(po.notes, 40, currentY + 12, { width: 515 });
    currentY += 32;
  }

  // Authorized Signatory Block
  const sigY = Math.max(currentY + 20, 680);
  doc.strokeColor('#CBD5E1').lineWidth(0.8).moveTo(380, sigY).lineTo(550, sigY).stroke();
  doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text('Authorized Signatory', 380, sigY + 6, { width: 170, align: 'center' });
  doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text('Aman Enterprises', 380, sigY + 18, { width: 170, align: 'center' });

  // Footer Note
  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#94A3B8').text('This is an official Purchase Order issued by Aman Enterprises. Please process delivery as scheduled.', 40, 770, { align: 'center', width: 515 });
}

module.exports = {
  streamInvoicePdf,
  generateInvoicePdfBuffer,
  streamPurchaseOrderPdf,
  generatePurchaseOrderPdfBuffer
};
