import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import PWAInstallButton from '../components/common/PWAInstallButton';
import { useToast } from '../context/ToastContext';
import { Settings, Save, CheckCircle, ShieldCheck, MessageCircle, QrCode, RefreshCw, PowerOff, CheckCircle2, Phone, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // WhatsApp Gateway State
  const [waStatus, setWaStatus] = useState({ status: 'disconnected', qrCode: null, connectedNumber: null, isReady: false });
  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await API.get('/settings');
      setSettings(res.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWaStatus = async () => {
    try {
      const res = await API.get('/whatsapp/status');
      setWaStatus(res.data);
    } catch (err) {
      console.warn('Error fetching WhatsApp status:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchWaStatus();
  }, []);

  // Poll WhatsApp status every 3 seconds if connecting or QR is active
  useEffect(() => {
    let interval = null;
    if (waStatus.status === 'qr_ready' || waStatus.status === 'connecting') {
      interval = setInterval(() => {
        fetchWaStatus();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [waStatus.status]);

  const handleConnectWhatsApp = async () => {
    setWaLoading(true);
    setWaError('');
    try {
      const res = await API.post('/whatsapp/connect');
      setWaStatus(res.data);
    } catch (err) {
      setWaError(err.response?.data?.message || 'Failed to start WhatsApp connection');
    } finally {
      setWaLoading(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!window.confirm('Are you sure you want to disconnect this WhatsApp device?')) return;
    setWaLoading(true);
    try {
      await API.post('/whatsapp/disconnect');
      setWaStatus({ status: 'disconnected', qrCode: null, connectedNumber: null, isReady: false });
      toast.success('WhatsApp disconnected successfully', 'WhatsApp Status');
    } catch (err) {
      toast.error('Failed to disconnect WhatsApp', 'Error');
    } finally {
      setWaLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put('/settings', settings);
      setSettings(res.data);
      setSavedSuccess(true);
      toast.success('Agency settings & invoice header updated successfully! ⚙️', 'Settings Saved');
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      toast.error('Failed to save settings', 'Error');
    }
  };

  if (loading) return <LoadingSkeleton count={4} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          System & Company Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure distribution agency details, WhatsApp automated PDF gateway, hub address, and invoice headers
        </p>
      </div>

      {savedSuccess && (
        <div className="flex items-center space-x-2 p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200">
          <CheckCircle className="w-4 h-4" />
          <span>Settings updated successfully!</span>
        </div>
      )}

      {/* 📲 WHATSAPP AUTOMATED PDF GATEWAY CARD */}
      <div className="bg-gradient-to-br from-emerald-900/10 via-white dark:via-slate-800 to-teal-900/10 p-4 sm:p-6 rounded-2xl border border-emerald-200 dark:border-emerald-700/60 shadow-sm space-y-4 max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3 border-slate-100 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Automated WhatsApp PDF Gateway
                </h3>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-full whitespace-nowrap inline-flex">
                  100% Free / Self-Hosted
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Automatically delivers the real green PDF invoice document directly to customer's WhatsApp upon POS sale
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="self-start sm:self-center shrink-0">
            {waStatus.status === 'connected' ? (
              <span className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-black">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Connected (+{waStatus.connectedNumber})</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Not Connected</span>
              </span>
            )}
          </div>
        </div>

        {waError && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{waError}</span>
          </div>
        )}

        {/* 🟢 CONNECTED STATE */}
        {waStatus.status === 'connected' && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>WhatsApp Gateway is Active & Linked!</span>
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Official invoices are automatically delivered as PDF documents from your number: <strong>+{waStatus.connectedNumber}</strong>
              </p>
            </div>
            <button
              onClick={handleDisconnectWhatsApp}
              disabled={waLoading}
              className="w-full sm:w-auto justify-center px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <PowerOff className="w-3.5 h-3.5" />
              <span>Disconnect Device</span>
            </button>
          </div>
        )}

        {/* 🟡 QR CODE READY STATE */}
        {waStatus.status === 'qr_ready' && waStatus.qrCode && (
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center p-3 bg-white rounded-xl shadow-md border border-slate-100">
              <img src={waStatus.qrCode} alt="WhatsApp QR Code" className="w-44 h-44 sm:w-48 sm:h-48 rounded-lg" />
              <p className="text-[10px] font-extrabold text-slate-500 uppercase mt-2 tracking-wider flex items-center space-x-1">
                <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                <span>Scan with your phone</span>
              </p>
            </div>
            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 max-w-sm w-full">
              <h4 className="font-black text-sm text-slate-900 dark:text-white">How to link your WhatsApp:</h4>
              <ol className="list-decimal list-inside space-y-1.5 font-semibold text-slate-600 dark:text-slate-300">
                <li>Open <strong>WhatsApp</strong> on your phone</li>
                <li>Tap <strong>Menu (⋮)</strong> or <strong>Settings</strong></li>
                <li>Tap <strong>Linked Devices</strong> → <strong>Link a Device</strong></li>
                <li>Point your phone camera at this QR code to pair</li>
              </ol>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold pt-1">
                ✨ Once scanned, this page will automatically update to Connected!
              </p>
            </div>
          </div>
        )}

        {/* ⚪ DISCONNECTED STATE */}
        {waStatus.status !== 'connected' && waStatus.status !== 'qr_ready' && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl gap-3.5">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800 dark:text-white">Link your business phone to send real PDF documents</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Click below to generate a one-time QR code.</p>
            </div>
            <button
              onClick={handleConnectWhatsApp}
              disabled={waLoading}
              className="w-full sm:w-auto justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center space-x-2 disabled:opacity-50"
            >
              {waLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
              <span>{waLoading ? 'Starting WhatsApp Gateway...' : 'Connect WhatsApp (Scan QR)'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 🏢 REAL DISTRIBUTION AGENCY DETAILS CARD */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 max-w-3xl">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b pb-3 border-slate-100 dark:border-slate-700">
          <Settings className="w-4 h-4 text-pepsi-blue" />
          <span>Real Distribution Agency Details</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Company / Agency Name</label>
            <input
              type="text"
              required
              value={settings.companyName || ''}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              placeholder="e.g. Shree Pepsi Beverages Distribution Agency"
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-black text-slate-900 dark:text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Phone</label>
              <input
                type="text"
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Email</label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="agency@pepsi-distributor.com"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Distribution Hub Street Address</label>
            <textarea
              rows={2}
              value={settings.address || ''}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              placeholder="Enter complete real street address..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Printed Invoice Footer Note</label>
            <input
              type="text"
              value={settings.invoiceFooter || ''}
              onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
              placeholder="Thank you for choosing Pepsi Products!"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-semibold"
            />
          </div>

          <button type="submit" className="w-full sm:w-auto justify-center py-3 px-6 bg-pepsi-blue text-white font-extrabold rounded-xl hover:bg-blue-700 transition flex items-center space-x-2 text-sm shadow">
            <Save className="w-4 h-4" />
            <span>Save Distribution Agency Details</span>
          </button>
        </form>
      </div>

      {/* 📲 Progressive Web App (PWA) Direct Install Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center space-x-2">
          <span>📲</span>
          <span>Mobile & Desktop App Installation (PWA)</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Install the full Pepsi ERP standalone application on your Android phone, tablet or Windows/Mac computer for 1-tap launcher access without browser address bars.
        </p>
        <PWAInstallButton variant="settings" />
      </div>
    </div>
  );
}
