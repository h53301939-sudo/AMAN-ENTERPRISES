import React, { useRef, useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { Printer, Download, CheckCircle, Clock, Send, Share2, MessageCircle, FileText, Loader2, Phone, Zap, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import API from '../../services/api';
import amanLogo from '../../assets/amanlogo.jpg';

export default function InvoiceModal({ isOpen, onClose, sale, isNewSale = false }) {
  const invoiceRef = useRef(null);
  const [agencySettings, setAgencySettings] = useState(null);
  const [fetchedCustomer, setFetchedCustomer] = useState(null);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [waServerSending, setWaServerSending] = useState(false);
  const [waServerSuccess, setWaServerSuccess] = useState('');
  const [waServerNotice, setWaServerNotice] = useState('');

  useEffect(() => {
    if (isOpen && sale) {
      API.get('/settings')
        .then(res => setAgencySettings(res.data))
        .catch(err => console.error('Error fetching invoice agency settings:', err));

      const cust = sale.customer;
      const cId = typeof cust === 'string' ? cust : cust?._id;
      if (cId && (!cust || typeof cust === 'string' || !cust.phone)) {
        API.get(`/customers/${cId}`)
          .then(res => setFetchedCustomer(res.data))
          .catch(err => console.warn('Could not fetch customer by ID:', err));
      } else {
        setFetchedCustomer(null);
      }
    }
  }, [isOpen, sale]);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  // Helper to generate the exact A4 PDF Blob matching the on-screen invoice design (with Logo guaranteed)
  const generatePdfBlob = async () => {
    if (!invoiceRef.current) return null;
    const element = invoiceRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      imageTimeout: 0,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 800,
      onclone: (clonedDoc) => {
        const clonedEl = clonedDoc.getElementById('printable-invoice');
        if (clonedEl) {
          clonedEl.style.width = '780px';
          clonedEl.style.minWidth = '780px';
          clonedEl.style.maxWidth = '780px';
        }
      }
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    return pdf.output('blob');
  };

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      const pdfBlob = await generatePdfBlob();
      if (pdfBlob) {
        const fileName = `Invoice_${sale.invoiceNumber}.pdf`;
        const url = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const calculatedSubTotal = sale.subTotal || sale.items?.reduce((acc, item) => acc + (item.totalAmount || 0), 0) || sale.netTotal;
  const calculatedDiscount = Number(sale.discount || 0) || (calculatedSubTotal > sale.netTotal ? (calculatedSubTotal - sale.netTotal) : 0);

  // Extract Customer Shop and Details cleanly (prioritizing loaded or fetched customer object)
  const customerObj = fetchedCustomer || ((sale.customer && typeof sale.customer === 'object') ? sale.customer : {});
  const customerName = customerObj.shopName || (typeof sale.customer === 'string' && sale.customer.length > 5 ? sale.customer : 'Valued Customer');
  const ownerName = customerObj.ownerName || '';
  const customerPhone = customerObj.phone || sale.customerPhone || '';
  const customerAddress = customerObj.address || sale.customerAddress || (typeof sale.customer === 'object' ? sale.customer?.address : '') || '';

  // 🚀 AUTOMATED SERVER-SIDE HIGH-RESOLUTION PDF DELIVERY (EXACT IMAGE 2 LAYOUT)
  const handleSendAutomatedPdf = async () => {
    if (waServerSending || isGeneratingPdf) return;
    setWaServerSending(true);
    setWaServerSuccess('');
    setWaServerNotice('');

    try {
      // 1. Render the EXACT beautiful canvas layout with round Pepsi logo & cards
      const pdfBlob = await generatePdfBlob();
      if (!pdfBlob) throw new Error('Could not generate PDF document');

      // 2. Check WhatsApp Gateway status
      const statusRes = await API.get('/whatsapp/status');
      if (statusRes.data?.isReady) {
        // Send exact visual PDF blob via multipart FormData
        const formData = new FormData();
        formData.append('pdfFile', pdfBlob, `Invoice_${sale.invoiceNumber}.pdf`);
        formData.append('phone', customerPhone);
        formData.append('invoiceNumber', sale.invoiceNumber);
        formData.append('netTotal', sale.netTotal);
        formData.append('dueAmount', sale.dueAmount);
        formData.append('paymentMethod', sale.paymentMethod);
        if (sale.paymentMethod === 'Split') {
          formData.append('cashAmount', sale.cashAmount || 0);
          formData.append('upiAmount', sale.upiAmount || 0);
        }
        formData.append('createdAt', sale.createdAt);

        const res = await API.post('/whatsapp/send-pdf', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data?.success || res.status === 200) {
          setWaServerNotice('');
          setWaServerSuccess(res.data?.message || `🎉 Official PDF Invoice #${sale.invoiceNumber} delivered directly to customer WhatsApp!`);
          setTimeout(() => setWaServerSuccess(''), 7000);
        }
      } else {
        setWaServerNotice('⚠️ WhatsApp Gateway is not connected. Please connect WhatsApp in System Settings.');
        setTimeout(() => setWaServerNotice(''), 7000);
      }
    } catch (err) {
      console.error('Server WhatsApp send error:', err);
      const errMsg = err.response?.data?.message || '⚠️ Failed to deliver PDF invoice. Please check WhatsApp connection in Settings.';
      setWaServerNotice(errMsg);
      setTimeout(() => setWaServerNotice(''), 7000);
    } finally {
      setWaServerSending(false);
    }
  };
  const companyName = agencySettings?.companyName || 'AMAN ENTERPRISES';
  const agencyAddress = agencySettings?.address || 'Main Wholesale Market, Station Road';
  const agencyPhone = agencySettings?.phone || '+91 98765 43210';
  const agencyEmail = agencySettings?.email || 'sales@amanenterprises.com';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Tax Invoice #${sale.invoiceNumber}`} maxWidth="max-w-4xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700 flex-wrap gap-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Phone className="w-3.5 h-3.5 text-blue-600" />
            <span>Customer Contact: <strong className="text-slate-900 dark:text-white">{customerPhone ? `+91 ${customerPhone}` : 'Not provided'}</strong></span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <Lock className="w-3 h-3 opacity-60" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow transition disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <Lock className="w-3 h-3 opacity-80" />
              <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

        <div 
          className="w-full overflow-x-auto bg-slate-100 dark:bg-slate-900/60 p-2 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div
            ref={invoiceRef}
            id="printable-invoice"
            className="p-6 bg-white text-slate-900 rounded-xl border border-slate-200 space-y-6 shadow-sm mx-auto"
            style={{ minWidth: '780px', width: '780px' }}
          >
            <div className="flex items-start justify-between border-b pb-5 border-slate-200">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-sm border border-slate-200/80 flex-shrink-0 p-0.5">
                  <img src={amanLogo} alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-blue-900 tracking-tight leading-none">{companyName}</h2>
                  <p className="text-xs font-semibold text-slate-700 capitalize leading-snug">{agencyAddress}</p>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-medium">
                    <span>Ph: {agencyPhone}</span>
                    <span>• Email: {agencyEmail}</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="inline-block text-xs font-black px-3 py-1 rounded bg-blue-100 text-blue-800 uppercase tracking-wide">SALES INVOICE</span>
                <h3 className="text-sm font-black text-slate-900 mt-1.5">#{sale.invoiceNumber}</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Date: {new Date(sale.createdAt || Date.now()).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>

            {/* 📦 CUSTOMER & SALESMAN DETAILS CARD (MATCHING USER SCREENSHOT EXACTLY) */}
            <div className="grid grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs items-start">
              {/* Left Side: Billed to Customer */}
              <div className="space-y-0.5">
                <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">BILLED TO CUSTOMER</p>
                <h4 className="font-black text-slate-900 text-sm mt-0.5">{customerName}</h4>
                <p className="font-semibold text-slate-700">
                  {ownerName ? `Owner: ${ownerName}` : ''}
                  {customerPhone ? ` (Ph: +91 ${customerPhone})` : ''}
                </p>
                <p className="text-slate-500 font-medium pt-0.5">
                  <span className="text-slate-400 font-bold">Address:</span> {customerAddress || 'N/A'}
                </p>
              </div>
              
              {/* Right Side: Source, Salesman & Payment Mode */}
              <div className="text-right space-y-0.5">
                <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">SOURCE & SALESMAN</p>
                <p className="font-bold text-slate-800 text-xs mt-0.5">
                  Salesman: <span className="font-black text-slate-900">{sale.worker?.name || 'Authorized Staff'}</span>
                </p>
                <p className="font-medium text-slate-600 text-xs">
                  Dispatch: <span className="font-extrabold text-slate-800">{sale.vehicle?.vehicleNumber ? `Van (${sale.vehicle.vehicleNumber})` : 'Direct Warehouse Counter'}</span>
                </p>
                <p className="font-medium text-slate-600 text-xs">
                  Payment Mode: <strong className="font-black text-[#0051A5] uppercase">{sale.paymentMethod || 'Cash'}</strong>
                </p>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-black">{item.productName || item.product?.name || 'Item'}</td>
                    <td className="py-2.5 px-3 text-center">{item.quantity} {item.unitType || 'Box'}</td>
                    <td className="py-2.5 px-3 text-right">₹{Number(item.unitPrice || 0).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-black">₹{Number(item.totalAmount || (item.quantity * item.unitPrice) || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-end border-t pt-4 border-slate-200 text-xs">
              <div className="space-y-1">
                {sale.dueAmount > 0 ? (
                  <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-[11px]">
                    <Clock className="w-3.5 h-3.5" /> <span>OUTSTANDING DUE: ₹{Number(sale.dueAmount).toFixed(2)}</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5" /> <span>PAID IN FULL</span>
                  </span>
                )}
                <p className="text-[10px] text-slate-400 italic">{agencySettings?.invoiceFooter || 'Thank you for choosing Aman Enterprises!'}</p>
              </div>

              {/* FINANCIAL SUMMARY BREAKDOWN BOX */}
              <div className="w-64 space-y-1.5 text-right font-medium">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Sub Total:</span>
                  <span className="font-extrabold text-slate-900">₹{Number(calculatedSubTotal).toFixed(2)}</span>
                </div>
                {Number(calculatedDiscount) > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 font-extrabold">
                    <span>Discount:</span>
                    <span>-₹{Number(calculatedDiscount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 border-t pt-1.5 border-slate-200">
                  <span>Net Total:</span>
                  <span className="text-blue-900 text-lg">₹{Number(sale.netTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-700 font-extrabold pt-0.5">
                  <span>Amount Paid:</span>
                  <span>₹{Number(sale.paidAmount !== undefined ? sale.paidAmount : (sale.netTotal - (sale.dueAmount || 0))).toFixed(2)}</span>
                </div>
                {Number(sale.dueAmount || 0) > 0 && (
                  <div className="flex justify-between text-xs text-red-600 font-extrabold">
                    <span>Balance Due:</span>
                    <span>₹{Number(sale.dueAmount).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
