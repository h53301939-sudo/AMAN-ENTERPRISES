import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import WorkerProfileModal from '../components/worker/WorkerProfileModal';
import { useToast } from '../context/ToastContext';
import { 
  UserCheck, 
  Plus, 
  Trash2, 
  Edit2, 
  Truck, 
  Phone, 
  Mail, 
  BarChart2,
  Banknote,
  CreditCard,
  DollarSign
} from 'lucide-react';

export default function WorkersPage() {
  const { toast } = useToast();
  const [workers, setWorkers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [selectedProfileWorkerId, setSelectedProfileWorkerId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    assignedVehicle: ''
  });

  const fetchData = async () => {
    try {
      const [wRes, vRes] = await Promise.all([
        API.get('/auth/workers'),
        API.get('/vehicles')
      ]);
      setWorkers(wRes.data || []);
      setVehicles(vRes.data || []);
    } catch (err) {
      console.error('Error loading workers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingWorker(null);
    setFormData({ name: '', email: '', password: 'worker123', phone: '', assignedVehicle: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (w) => {
    setEditingWorker(w);
    setFormData({
      name: w.name,
      email: w.email,
      password: '', // Leave blank if not changing password
      phone: w.phone || '',
      assignedVehicle: w.assignedVehicle?._id || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingWorker) {
        await API.put(`/auth/workers/${editingWorker._id}`, formData);
        toast.success(`Worker "${formData.name}" profile updated! 👷`, 'Worker Updated');
      } else {
        await API.post('/auth/workers', formData);
        toast.success(`New worker "${formData.name}" registered successfully! 👷`, 'Worker Created');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save worker', 'Save Error');
    }
  };

  const handleToggleStatus = async (worker) => {
    const isCurrentlyActive = worker.active !== false;
    const confirmMsg = isCurrentlyActive
      ? `Are you sure you want to BLOCK ${worker.name}? They will be unable to log in or make sales.`
      : `Unblock and activate ${worker.name}'s account?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await API.put(`/auth/workers/${worker._id}`, { active: !isCurrentlyActive });
      toast.success(
        isCurrentlyActive ? `${worker.name} has been blocked.` : `${worker.name} has been unblocked and activated!`,
        'Status Changed'
      );
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update worker status', 'Update Error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Remove worker staff account?')) {
      try {
        await API.delete(`/auth/workers/${id}`);
        toast.success('Worker account deleted.', 'Worker Removed');
        fetchData();
      } catch (err) {
        toast.error('Failed to delete worker', 'Delete Error');
      }
    }
  };

  if (loading) return <LoadingSkeleton count={4} />;

  return (
    <div className="space-y-6">
      
      {/* 🌟 PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <UserCheck className="w-6 h-6 text-pepsi-blue" />
            <span>Salesman & Worker Staff Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor worker performance, lifetime sales, profits, van assignment, and access control.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-pepsi-blue text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 hover:bg-blue-700 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Salesman</span>
        </button>
      </div>

      {/* 👥 WORKERS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.map((w) => {
          const isActive = w.active !== false;
          return (
            <div 
              key={w._id} 
              className={`bg-white dark:bg-slate-800 p-6 rounded-2xl border transition shadow-sm space-y-4 relative ${
                isActive 
                  ? 'border-slate-200 dark:border-slate-700' 
                  : 'border-red-300 dark:border-red-900/50 bg-red-50/10'
              }`}
            >
              
              {/* Header: Name + Toggle Switch + Edit/Delete Actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">{w.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center space-x-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{w.email}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 font-semibold flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{w.phone || 'No Phone Number'}</span>
                  </p>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => handleOpenEditModal(w)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                    title="Edit Worker Info"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(w._id)}
                    className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 transition"
                    title="Delete Worker Account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Status Row with Interactive Toggle Switch */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Account Access:</span>
                
                {/* 🔘 MODERN TOGGLE SWITCH */}
                <div className="flex items-center space-x-2">
                  <span className={`text-[11px] font-extrabold transition-colors ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                    {isActive ? 'Active' : 'Blocked'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    onClick={() => handleToggleStatus(w)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-pepsi-blue focus:ring-offset-2 ${
                      isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    title={isActive ? 'Click to Block Worker' : 'Click to Unblock Worker'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Van Assignment Info */}
              <div className="text-xs flex items-center justify-between">
                <span className="text-slate-500 flex items-center space-x-1">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Assigned Van:</span>
                </span>
                <span className="font-extrabold text-blue-600 dark:text-blue-400">
                  {w.assignedVehicle?.vehicleNumber || 'Unassigned'}
                </span>
              </div>

              {/* 📊 TODAY'S ROUTE PERFORMANCE & SETTLEMENT STRIP */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-2">
                
                {/* 🛒 Sales Performance (Primary) */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Today's Sales:</span>
                  <div className="text-right">
                    <span className="text-sm font-black text-[#DC2626] dark:text-blue-400 block leading-tight">
                      ₹{Number(w.todayShiftSummary?.todaySalesGross || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {w.todayShiftSummary?.todayCases || 0} Boxes • {w.todayShiftSummary?.salesCount || 0} Orders
                    </span>
                  </div>
                </div>

                {/* 💵 Compact Cash & UPI Settlement Strip */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-2 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">💵 Cash In-Hand:</span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      ₹{Number(w.todayShiftSummary?.todayCashInHand || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-2 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">📱 UPI Direct:</span>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                      ₹{Number(w.todayShiftSummary?.todayUpiDirect || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Action: View Profile & Analytics */}
              <div className="pt-1">
                <button
                  onClick={() => setSelectedProfileWorkerId(w._id)}
                  className="w-full py-2.5 px-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#800f0f] dark:text-blue-300 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition shadow-sm active:scale-[0.99] cursor-pointer"
                >
                  <BarChart2 className="w-4 h-4" />
                  <span>View Sales, Invoices & Cash Profile</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* 👤 CREATE / EDIT WORKER MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingWorker ? 'Edit Salesman Worker Account' : 'Register Salesman Worker Account'}>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ramesh Kumar"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="salesman@pepsi.com"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 00000"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {editingWorker ? 'New Password (leave blank to keep current)' : 'Initial Password'}
            </label>
            <input
              type="password"
              required={!editingWorker}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assign Van Vehicle</label>
            <select
              value={formData.assignedVehicle}
              onChange={(e) => setFormData({ ...formData, assignedVehicle: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
            >
              <option value="">-- Select Van --</option>
              {vehicles.map(v => <option key={v._id} value={v._id}>{v.vehicleNumber} ({v.vehicleName})</option>)}
            </select>
          </div>

          <button type="submit" className="w-full py-3 bg-pepsi-blue text-white font-bold rounded-xl hover:bg-blue-700 transition">
            {editingWorker ? 'Save Worker Changes' : 'Create Worker Account'}
          </button>
        </form>
      </Modal>

      {/* 📈 WORKER PERFORMANCE PROFILE & LIFETIME ANALYTICS MODAL */}
      <WorkerProfileModal
        isOpen={Boolean(selectedProfileWorkerId)}
        onClose={() => setSelectedProfileWorkerId(null)}
        workerId={selectedProfileWorkerId}
        onWorkerUpdated={fetchData}
      />

    </div>
  );
}
