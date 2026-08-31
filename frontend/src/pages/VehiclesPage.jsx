import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import { Truck, Plus, User, CheckCircle, Package, Edit2, Trash2, Lock, Loader2 } from 'lucide-react';

export default function VehiclesPage() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    vehicleNumber: '',
    vehicleName: '',
    driverName: '',
    assignedWorker: '',
    capacityCrates: 250,
    status: 'Available'
  });

  const fetchData = async () => {
    try {
      const [vRes, wRes] = await Promise.all([
        API.get('/vehicles'),
        API.get('/auth/workers')
      ]);
      setVehicles(vRes.data || []);
      setWorkers(wRes.data || []);
    } catch (err) {
      console.error('Error loading vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingVehicle(null);
    setFormData({
      vehicleNumber: `MH-04-XX-${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleName: 'Tata Ace Van',
      driverName: '',
      assignedWorker: workers[0]?._id || '',
      capacityCrates: 250,
      status: 'Available'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (v) => {
    setEditingVehicle(v);
    setFormData({
      vehicleNumber: v.vehicleNumber,
      vehicleName: v.vehicleName,
      driverName: v.driverName || '',
      assignedWorker: v.assignedWorker?._id || '',
      capacityCrates: v.capacityCrates || 250,
      status: v.status || 'Available'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        await API.put(`/vehicles/${editingVehicle._id}`, formData);
        toast.success(`Vehicle "${formData.vehicleNumber}" details updated! 🚚`, 'Vehicle Updated');
      } else {
        await API.post('/vehicles', formData);
        toast.success(`Vehicle "${formData.vehicleNumber}" added to fleet! 🚚`, 'Vehicle Registered');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save vehicle', 'Save Error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this vehicle from fleet?')) {
      try {
        await API.delete(`/vehicles/${id}`);
        toast.success('Vehicle removed from fleet.', 'Vehicle Deleted');
        fetchData();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete vehicle', 'Delete Error');
      }
    }
  };

  if (loading) return <LoadingSkeleton count={4} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Van Fleet & Vehicle Inventory
          </h1>
          
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-2 px-4 py-2.5 bg-pepsi-blue text-white rounded-xl font-bold text-xs shadow hover:bg-blue-700 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <Lock className="w-3.5 h-3.5 opacity-80" />
          <span>Add Delivery Vehicle</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((v) => (
          <div key={v._id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/40 text-pepsi-blue rounded-xl">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{v.vehicleNumber}</h3>
                    <p className="text-xs text-slate-500">{v.vehicleName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                    v.status === 'On Route' || v.status === 'Loaded'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}>
                    {v.status}
                  </span>
                  <button
                    onClick={() => handleOpenEditModal(v)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                    title="Edit Vehicle"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(v._id)}
                    className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 transition"
                    title="Delete Vehicle"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 border-t pt-3 border-slate-100 dark:border-slate-700 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Driver / Salesman:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{v.assignedWorker?.name || v.driverName || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Van Capacity:</span>
                  <span className="font-bold">{v.capacityCrates} Boxes</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Current Loaded Stock:</span>
                  <span className="font-extrabold text-blue-600 dark:text-blue-400">
                    {v.totalStockUnits || 0} Boxes (₹{v.totalStockValue?.toLocaleString() || 0})
                  </span>
                </div>
              </div>

              {/* Breakdown List of Items Currently Loaded on this Van */}
              <div className="bg-slate-50 dark:bg-slate-700/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <span>Van Inventory Breakdown</span>
                  <span>{v.stockItems?.length || 0} SKUs</span>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto text-xs pr-1">
                  {v.stockItems && v.stockItems.length > 0 ? (
                    v.stockItems.map((st) => (
                      <div key={st._id} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/60 dark:border-slate-600/60">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {st.product?.name} ({st.product?.size || 'Standard'})
                        </span>
                        <span className="font-extrabold text-pepsi-blue dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded text-[11px]">
                          {st.quantity} Boxes
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-400 italic text-center py-2">
                      No stock currently loaded on this van.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingVehicle ? 'Edit Delivery Vehicle' : 'Register Delivery Vehicle'}>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Vehicle Registration Number</label>
              <input
                type="text"
                required
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Vehicle Model / Name</label>
              <input
                type="text"
                required
                value={formData.vehicleName}
                onChange={(e) => setFormData({ ...formData, vehicleName: e.target.value })}
                placeholder="e.g. Tata Ace Van 1"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assign Worker / Salesman</label>
              <select
                value={formData.assignedWorker}
                onChange={(e) => setFormData({ ...formData, assignedWorker: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              >
                <option value="">-- Unassigned --</option>
                {workers.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Capacity (Boxes)</label>
              <input
                type="number"
                required
                value={formData.capacityCrates}
                onChange={(e) => setFormData({ ...formData, capacityCrates: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
            >
              <option value="Available">Available</option>
              <option value="Loaded">Loaded</option>
              <option value="On Route">On Route</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-3 bg-pepsi-blue text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <Lock className="w-3.5 h-3.5 text-white/80" />
                <span>Saving Vehicle...</span>
              </>
            ) : (
              <span>{editingVehicle ? 'Save Vehicle Changes' : 'Save Vehicle'}</span>
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
}
