import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { Warehouse, CheckCircle, Plus, Trash2, Loader2, Truck, AlertTriangle, RotateCcw, ClipboardList, Lock } from 'lucide-react';

export default function VehicleLoadingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [loadItems, setLoadItems] = useState([{ product: '', cases: '' }]);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDemand, setIsLoadingDemand] = useState(false);

  // ⚠️ Stale unreturned stock warning states (Only triggers if loaded >= 12 hours ago)
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [isReturningStock, setIsReturningStock] = useState(false);

  // 📋 Auto-Fill loading items from pending booked customer orders
  const handleAutoFillFromBookedOrders = async () => {
    setIsLoadingDemand(true);
    try {
      const res = await API.get('/customer-orders/demand-summary');
      const demandList = res.data?.demandList || [];

      if (!demandList.length) {
        toast.info('No active booked orders found to load', 'Demand Summary');
        return;
      }

      const populatedItems = demandList.map(d => ({
        product: d.product?._id || d.product,
        cases: String(d.totalQuantity)
      }));

      setLoadItems(populatedItems);
      toast.success(`Auto-filled ${res.data.totalBookedCases} cases from ${res.data.totalBookedOrdersCount} booked customer orders! 📋`, 'Demand Loaded');
    } catch (err) {
      console.error('Error fetching demand summary:', err);
      toast.error('Failed to load booked demand', 'Error');
    } finally {
      setIsLoadingDemand(false);
    }
  };

  const fetchData = async (suppressModal = false) => {
    try {
      const [vRes, pRes, hRes] = await Promise.all([
        API.get('/vehicles'),
        API.get('/products'),
        API.get('/loading/history')
      ]);

      let vList = vRes.data || [];
      if (user?.role === 'worker') {
        const assignedId = user?.assignedVehicle?._id || user?.assignedVehicle;
        if (assignedId) {
          const matchingVan = vList.find(v => String(v._id) === String(assignedId));
          vList = matchingVan ? [matchingVan] : [];
        } else {
          vList = [];
        }
      }

      setVehicles(vList);
      setProducts(pRes.data || []);
      setLoadingHistory(hRes.data || []);
      
      let vid = (user?.role === 'worker' ? (user?.assignedVehicle?._id || user?.assignedVehicle) : selectedVehicle) || (vList && vList[0]?._id) || '';
      setSelectedVehicle(vid);
      if (pRes.data && pRes.data.length > 0) {
        setLoadItems([{ product: pRes.data[0]._id, cases: '' }]);
      }

      // Check if selected vehicle has stale unreturned stock (>= 12 hours)
      if (!suppressModal && vid) {
        const vObj = vList.find(v => String(v._id) === String(vid));
        if (vObj && vObj.isStaleStock) {
          setIsWarningModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Error fetching loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleVehicleChange = (vid) => {
    setSelectedVehicle(vid);
    const vObj = vehicles.find(v => String(v._id) === String(vid));
    if (vObj && vObj.isStaleStock) {
      setIsWarningModalOpen(true);
    }
  };

  // ↩️ Button 1: Return all unreturned van stock to Warehouse
  const handleReturnVanStockToWarehouse = async () => {
    const vObj = vehicles.find(v => String(v._id) === String(selectedVehicle));
    if (!vObj || !vObj.stockItems || vObj.stockItems.length === 0) {
      setIsWarningModalOpen(false);
      return;
    }

    setIsReturningStock(true);
    try {
      const returnPayload = vObj.stockItems.map(item => ({
        product: item.product._id || item.product,
        quantity: Number(item.quantity)
      }));

      await API.post('/returns', {
        vehicleId: selectedVehicle,
        items: returnPayload,
        remarks: `Returned unreturned stock (loaded > 12h ago) from ${vObj.vehicleNumber}`
      });

      toast.success(`Successfully returned ${vObj.totalStockUnits} cases to Central Warehouse! 📦`, 'Stock Returned');
      setIsWarningModalOpen(false);
      await fetchData(true);
    } catch (err) {
      console.error('Error returning stock to warehouse:', err);
      toast.error(err.response?.data?.message || 'Failed to return stock to warehouse', 'Return Failed');
    } finally {
      setIsReturningStock(false);
    }
  };

  // ➔ Button 2: Continue with existing loaded stock
  const handleContinueWithExistingStock = () => {
    setIsWarningModalOpen(false);
    toast.info('Continuing with existing van stock. You can now load additional cases.', 'Carry Forward');
  };

  const handleAddItem = () => {
    setLoadItems([...loadItems, { product: products[0]?._id || '', cases: '' }]);
  };

  const handleRemoveItem = (idx) => {
    setLoadItems(loadItems.filter((_, i) => i !== idx));
  };

  const handleConfirmLoading = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Single-click locking

    setIsSubmitting(true);
    try {
      const itemsPayload = loadItems.map(i => ({
        product: i.product,
        quantity: Number(i.cases) // Quantity in Cases
      }));

      const res = await API.post('/loading', {
        vehicleId: selectedVehicle,
        items: itemsPayload,
        remarks
      });

      toast.success(res.data?.message || 'Cases loaded successfully onto Van! 🚚', 'Van Loaded');
      setLoadItems([{ product: products[0]?._id || '', cases: '' }]);
      setRemarks('');
      fetchData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load stock', 'Loading Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingSkeleton count={4} />;

  const currentVehicleObj = vehicles.find(v => String(v._id) === String(selectedVehicle));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Vehicle Loading & Stock Transfer (Boxes)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {user?.role === 'worker' 
              ? 'Transfer product boxes from Central Warehouse onto your assigned delivery van'
              : 'Select items from Admin dropdown and transfer Boxes from Warehouse to Delivery Van'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loading Wizard Form (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Warehouse className="w-4 h-4 text-pepsi-blue" />
            <span>Warehouse Stock Transfer to Van</span>
          </h3>

          <form onSubmit={handleConfirmLoading} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {user?.role === 'worker' ? 'Your Assigned Delivery Van' : 'Select Target Delivery Van'}
              </label>

              {user?.role === 'worker' ? (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center space-x-2.5 shadow-sm">
                  <Truck className="w-5 h-5 text-pepsi-blue shrink-0" />
                  <div>
                    <span className="font-extrabold text-sm text-[#800f0f] dark:text-blue-300 block">
                      {vehicles[0]
                        ? `${vehicles[0].vehicleNumber} (${vehicles[0].vehicleName})`
                        : (user?.assignedVehicle?.vehicleNumber ? `${user.assignedVehicle.vehicleNumber} (${user.assignedVehicle.vehicleName || 'Van'})` : 'No Van Assigned')}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Assigned Driver: {user?.name || 'Worker'}
                    </span>
                  </div>
                </div>
              ) : (
                <select
                  required
                  value={selectedVehicle}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-extrabold text-slate-900 dark:text-white text-sm"
                >
                  {vehicles.map(v => (
                    <option key={v._id} value={v._id}>
                      {v.vehicleNumber} ({v.vehicleName}) - Driver: {v.assignedWorker?.name || v.driverName || 'Unassigned'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Select Items to Load (Boxes)
                </label>
                <button
                  type="button"
                  onClick={handleAutoFillFromBookedOrders}
                  disabled={isLoadingDemand}
                  className="self-start sm:self-auto px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#DC2626] dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl font-bold text-[11px] flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
                  title="Auto-fill total boxes required across all customer advance bookings"
                >
                  {isLoadingDemand ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardList className="w-3.5 h-3.5" />}
                  <span>📋 Auto-Fill From Booked Orders</span>
                </button>
              </div>

              {loadItems.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-600">
                  <div className="flex-1">
                    <select
                      required
                      value={item.product}
                      onChange={(e) => {
                        const updated = [...loadItems];
                        updated[idx].product = e.target.value;
                        setLoadItems(updated);
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-bold text-slate-900 dark:text-white"
                    >
                      {products.map(p => (
                        <option key={p._id} value={p._id}>
                          {p.name} | Size: {p.size || 'Standard'} | Box Selling Price: ₹{p.sellingPrice} | Available Warehouse: {p.warehouseStock || 0} Boxes
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-32">
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Boxes"
                      value={item.cases}
                      onChange={(e) => {
                        const updated = [...loadItems];
                        updated[idx].cases = e.target.value;
                        setLoadItems(updated);
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  {loadItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddItem}
                className="text-pepsi-blue dark:text-blue-400 font-bold flex items-center space-x-1 hover:underline pt-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Item Line</span>
              </button>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Remarks</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Morning route loading"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-pepsi-blue text-white rounded-xl font-black text-sm hover:bg-blue-700 transition flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <Lock className="w-3.5 h-3.5 text-white/80" />
                  <span>Transferring Boxes...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm & Transfer Boxes to Van</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Recent Loading History (1 col) */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Recent Van Loadings</span>
          </h3>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {loadingHistory.map((h) => {
              const vanNumber = h.destId?.vehicleNumber || h.vehicle?.vehicleNumber || 'Van';
              const vanName = h.destId?.vehicleName || '';
              const prodName = h.product?.name || 'Stock Item';
              const prodSize = h.product?.size ? `(${h.product.size})` : '';
              const cases = Number(h.quantity || 0);
              const workerName = h.user?.name || h.loadedBy?.name || 'Admin';

              return (
                <div key={h._id} className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600 space-y-1.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-black text-slate-900 dark:text-white text-xs block">
                        {vanNumber} {vanName ? `• ${vanName}` : ''}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {prodName} {prodSize}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(h.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-600 text-xs">
                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                      Boxes Loaded: <span className="font-black text-emerald-600 dark:text-emerald-400">{cases} Boxes</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      By: {workerName}
                    </div>
                  </div>
                </div>
              );
            })}
            {loadingHistory.length === 0 && (
              <p className="text-center py-6 text-slate-400 text-xs italic">No load logs found.</p>
            )}
          </div>
        </div>
      </div>

      {/* ⚠️ STALE UNRETURNED VAN STOCK RESOLUTION MODAL (ONLY TRIGGERS IF LOADED >= 12 HOURS AGO) */}
      {isWarningModalOpen && currentVehicleObj && currentVehicleObj.isStaleStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-amber-200 dark:border-amber-900/60 relative overflow-hidden flex flex-col transform transition-all animate-slide-up p-6 text-center space-y-4">
            
            {/* Top Warning Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 z-10" />

            {/* Top "Message from System" Pill Badge */}
            <div className="flex items-center justify-center pt-1">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800/80 text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Message from System</span>
              </span>
            </div>

            {/* Warning Icon Badge */}
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
            </div>

            {/* Title & Van Info */}
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Unreturned Stock Detected in Van!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                {currentVehicleObj.vehicleNumber} ({currentVehicleObj.vehicleName})
                {currentVehicleObj.assignedWorker?.name ? ` • Driver: ${currentVehicleObj.assignedWorker.name}` : ''}
              </p>
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400 pt-1">
                {currentVehicleObj.totalStockUnits} Boxes
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Yeh stock pichle dispatch ({Math.round(currentVehicleObj.hoursSinceLastLoad)} ghante pehle) se van me load hai aur warehouse me return nahi hua hai.
              </p>
            </div>

            {/* Minimal Stock Breakdown List */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto space-y-1 text-left">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block pb-1 border-b border-slate-200 dark:border-slate-700">
                Van Inventory Breakdown
              </span>
              {(currentVehicleObj.stockItems || []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-semibold py-0.5">
                  <span className="truncate max-w-[200px] text-slate-800 dark:text-slate-200">
                    {item.product?.name || 'Item'} {item.product?.size ? `(${item.product.size})` : ''}
                  </span>
                  <span className="font-black text-amber-600 dark:text-amber-400 shrink-0">
                    {item.quantity} Boxes
                  </span>
                </div>
              ))}
            </div>

            {/* 2 HORIZONTAL ACTION BUTTONS */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Button 1: Return Items into Warehouse */}
              <button
                type="button"
                onClick={handleReturnVanStockToWarehouse}
                disabled={isReturningStock}
                className="py-3 px-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 font-black rounded-xl transition active:scale-95 text-xs flex flex-col items-center justify-center space-y-0.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isReturningStock ? (
                  <div className="flex items-center space-x-1.5 py-1">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    <span>Returning...</span>
                  </div>
                ) : (
                  <>
                    <span className="font-black text-xs">↩️ Return to Warehouse</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">(Unload & Sync 0)</span>
                  </>
                )}
              </button>

              {/* Button 2: Continue with already loaded stock */}
              <button
                type="button"
                onClick={handleContinueWithExistingStock}
                disabled={isReturningStock}
                className="py-3 px-3 bg-[#DC2626] hover:bg-blue-700 text-white font-black rounded-xl transition shadow-lg shadow-blue-600/25 active:scale-95 text-xs flex flex-col items-center justify-center space-y-0.5 cursor-pointer"
              >
                <span className="font-black text-xs">Keep & Continue ➔</span>
                <span className="text-[10px] text-blue-200 font-medium">(Carry Forward & Load)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
