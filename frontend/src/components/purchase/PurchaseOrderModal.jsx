import React, { useState } from 'react';
import Modal from '../common/Modal';
import API from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  Printer, 
  Download, 
  Send, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Package, 
  Loader2, 
  Building2,
  Truck
} from 'lucide-react';
import amanLogo from '../../assets/amanlogo.jpg';

export default function PurchaseOrderModal({ isOpen, onClose, po, onPoUpdated }) {
  const { toast } = useToast();
  const [sendingWa, setSendingWa] = useState(false);
  const [showWaConfirm, setShowWaConfirm] = useState(false);

  if (!po) return null;

  const totalCases = po.totalCases || (po.items || []).reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);

  // 🖨️ Handle Browser Print
  const handlePrint = () => {
    window.print();
  };

  // 📄 Handle PDF Download / Stream
  const handleDownloadPdf = () => {
    const token = localStorage.getItem('pepsi_token');
    const pdfUrl = `${API.defaults.baseURL}/purchase-orders/${po._id}/pdf?token=${token}`;
    window.open(pdfUrl, '_blank');
  };

  // 📱 Handle Direct WhatsApp Dispatch (Self-Hosted Baileys Gateway)
  const handleSendWhatsApp = async () => {
    setSendingWa(true);
    try {
      const res = await API.post(`/purchase-orders/${po._id}/send-whatsapp`, {
        phone: po.supplierPhone || po.supplier?.phone
      });

      toast.success(res.data?.message || 'Purchase Order PDF delivered directly to supplier WhatsApp! 🚀', 'WhatsApp Delivered');
      if (onPoUpdated) onPoUpdated();
    } catch (err) {
      console.error('Error sending PO via WhatsApp:', err);
      toast.error(err.response?.data?.message || 'Failed to send Purchase Order PDF via self-hosted WhatsApp', 'WhatsApp Error');
    } finally {
      setSendingWa(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Purchase Order #${po.poNumber}`}>
      <div className="space-y-4 text-slate-800 dark:text-slate-200">
        
        {/* 🖨️ ACTION TOOLBAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between sm:justify-start space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-[#DC2626] dark:text-blue-300">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Sent to Supplier
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:flex sm:items-center sm:space-x-2">
            {/* Direct WhatsApp Send with Surety Trigger */}
            <button
              onClick={() => setShowWaConfirm(!showWaConfirm)}
              disabled={sendingWa}
              className="flex items-center justify-center space-x-1 px-2 sm:px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-[11px] sm:text-xs shadow-sm transition disabled:opacity-50"
              title="Send PO PDF via WhatsApp"
            >
              {sendingWa ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <MessageSquare className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{sendingWa ? 'Sending...' : 'WhatsApp'}</span>
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPdf}
              className="flex items-center justify-center space-x-1 px-2 sm:px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl font-bold text-[11px] sm:text-xs transition"
              title="Download Official PDF"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Download</span>
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="flex items-center justify-center space-x-1 px-2 sm:px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl font-bold text-[11px] sm:text-xs transition"
              title="Print Purchase Order"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Print</span>
            </button>
          </div>
        </div>

        {/* 🛡️ INLINE WHATSAPP SURETY CONFIRMATION PROMPT */}
        {showWaConfirm && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs animate-slide-up">
            <div className="flex items-center space-x-2 truncate mr-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 font-black text-[9px] uppercase tracking-wider shrink-0 border border-emerald-200 dark:border-emerald-700">
                Message from System
              </span>
              <span className="font-bold text-emerald-900 dark:text-emerald-200 truncate">
                Send PO PDF to <strong>+{po.supplierPhone || po.supplier?.phone || 'Supplier'}</strong> via WhatsApp?
              </span>
            </div>
            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowWaConfirm(false)}
                className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWaConfirm(false);
                  handleSendWhatsApp();
                }}
                disabled={sendingWa}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black shadow transition flex items-center space-x-1"
              >
                <span>✓ Yes, Send</span>
              </button>
            </div>
          </div>
        )}

        {/* 📄 PRINTABLE PURCHASE ORDER DOCUMENT SHEET */}
        <div id="printable-po" className="bg-white dark:bg-slate-800 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 select-text">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-sm border border-slate-200/80 flex-shrink-0 p-0.5">
                <img src={amanLogo} alt="Aman Enterprises Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#0051A5] dark:text-blue-400 tracking-wide uppercase">
                  AMAN ENTERPRISES
                </h2>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Main Wholesale Market, Station Road • Ph: +91 9876543210
                </p>
                <p className="text-[10px] text-slate-400">GSTIN: 09ABCDE1234F1Z5</p>
              </div>
            </div>

            <div className="sm:text-right bg-blue-50 dark:bg-blue-950/40 px-3.5 py-2 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <span className="text-[10px] font-extrabold uppercase text-[#DC2626] dark:text-blue-400 tracking-wider block">
                Official Purchase Order
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                #{po.poNumber}
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Date: {new Date(po.orderDate || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Supplier & Delivery Info Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Supplier Details */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 mr-1" />
                Supplier / Bottling Plant
              </span>
              <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                {po.supplierName}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Contact: <span className="font-semibold">{po.supplier?.contactPerson || 'Sales Desk'}</span>
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Phone: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{po.supplierPhone || po.supplier?.phone || 'N/A'}</span>
              </p>
              {po.supplierAddress && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Address: {po.supplierAddress}
                </p>
              )}
            </div>

            {/* Order Dispatch Details */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block flex items-center space-x-1">
                <Truck className="w-3.5 h-3.5 mr-1" />
                Delivery Information
              </span>
              <p className="text-slate-600 dark:text-slate-300">
                Expected Delivery: <span className="font-bold text-slate-900 dark:text-white">{po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN') : 'Immediate Dispatch'}</span>
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Issued By: <span className="font-semibold">{po.createdBy?.name || 'David Traders Admin'}</span>
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Delivery Location: <span className="font-semibold text-slate-800 dark:text-slate-200">Main Warehouse, Kaithwaliya</span>
              </p>
            </div>
          </div>

          {/* Itemized Table (Item Name, Size, Quantity - NO RATES) */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#800f0f] text-white uppercase text-[10px] font-extrabold tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5 w-12 text-center">#</th>
                  <th className="px-3.5 py-2.5">Item Description</th>
                  <th className="px-3.5 py-2.5">Size / Packaging</th>
                  <th className="px-3.5 py-2.5 text-right font-black">Ordered Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {(po.items || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-3.5 py-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="px-3.5 py-3 font-extrabold text-slate-900 dark:text-white">
                      {item.productName || item.product?.name}
                    </td>
                    <td className="px-3.5 py-3 text-slate-600 dark:text-slate-300 font-semibold">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px]">
                        {item.size || item.product?.size || '-'}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <span className="font-black text-sm text-[#DC2626] dark:text-blue-400">
                        {item.quantity} Boxes
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Cases Banner */}
          <div className="flex items-center justify-between p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <Package className="w-4 h-4 text-[#DC2626] dark:text-blue-400" />
              <span>Total Volume Ordered:</span>
            </span>
            <span className="text-base font-black text-[#800f0f] dark:text-blue-300">
              {totalCases} BOXES
            </span>
          </div>

          {/* Special Notes (if any) */}
          {po.notes && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40 text-xs">
              <span className="font-bold text-amber-800 dark:text-amber-300 block mb-0.5">Special Instructions / Notes:</span>
              <p className="text-slate-700 dark:text-slate-300">{po.notes}</p>
            </div>
          )}

          {/* Signatory Footer */}
          <div className="pt-6 flex justify-between items-end text-xs text-slate-500 dark:text-slate-400">
            <p className="text-[10px] italic">
              This is a computer-generated Purchase Order issued by David Traders.
            </p>
            <div className="text-center">
              <div className="w-44 border-b border-slate-300 dark:border-slate-600 mb-1" />
              <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Authorized Signatory</span>
              <p className="text-[10px]">David Traders</p>
            </div>
          </div>

        </div>

      </div>
    </Modal>
  );
}
