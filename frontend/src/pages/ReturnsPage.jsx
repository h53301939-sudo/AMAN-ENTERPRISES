import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { CornerUpLeft, CheckCircle, Truck, Package, AlertCircle, Loader2 } from 'lucide-react';

export default function ReturnsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [vanStocks, setVanStocks] = useState([]);
  const [returnItems, setReturnItems] = useState({});
  const [returnsHistory, setReturnsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [vRes, rRes] = await Promise.all([
        API.get('/vehicles'),
        API.get('/returns')
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
      setReturnsHistory(rRes.data || []);
      let vid = user?.assignedVehicle?._id || user?.assignedVehicle || (vList && vList[0]?._id) || '';
      setSelectedVehicle(vid);
      if (vid) fetchVanStock(vid);
    } catch (err) {
      console.error('Error loading returns data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVanStock = async (vid) => {
    try {
      const res = await API.get(`/vehicles/${vid}/stock`);
      const stocks = (res.data?.stocks || []).filter(s => s.product && s.quantity > 0);
      setVanStocks(stocks);
      const initialMap = {};
      stocks.forEach(s => {
        if (s.product?._id) {
          initialMap[s.product._id] = s.quantity; // Default return all remaining cases
        }
      });
      setReturnItems(initialMap);
    } catch (err) {
      console.error('Error fetching vehicle stock:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVehicleChange = (vid) => {
    setSelectedVehicle(vid);
    fetchVanStock(vid);
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // LOCK AGAINST DOUBLE CLICKING
    setErrorMessage('');

    const items = Object.keys(returnItems)
      .filter(pid => returnItems[pid] > 0)
      .map(pid => ({ product: pid, quantity: Number(returnItems[pid]) }));

    if (items.length === 0) {
      setErrorMessage('No items selected for return');
      return;
    }

    setIsSubmitting(true);
    try {
      await API.post('/returns', {
        vehicleId: selectedVehicle,
        items
      });
      toast.success('End of day stock boxes returned to warehouse successfully! 📦', 'Returns Completed');
      setReturnItems({});
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to process return';
      setErrorMessage(msg);
      toast.error(msg, 'Return Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingSkeleton count={4} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            End-of-Day Van Stock Return (Boxes)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Transfer unsold boxes from van inventory back to central warehouse stock at end of shift
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Return Wizard */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-200 dark:border-slate-700">
            <CornerUpLeft className="w-5 h-5 text-pepsi-blue" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Process Unsold Stock Boxes Return</h3>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {user?.role === 'worker' ? 'Your Assigned Delivery Van' : 'Select Delivery Van'}
              </label>
              {user?.role === 'worker' ? (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-pepsi-blue shrink-0" />
                  <span className="font-extrabold text-xs text-[#800f0f] dark:text-blue-300">
                    {vehicles[0]
                      ? `${vehicles[0].vehicleNumber} (${vehicles[0].vehicleName})`
                      : (user?.assignedVehicle?.vehicleNumber ? `${user.assignedVehicle.vehicleNumber} (${user.assignedVehicle.vehicleName || 'Van'})` : 'No Van Assigned')}
                  </span>
                </div>
              ) : (
                <select
                  value={selectedVehicle}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-900 dark:text-white"
                >
                  {vehicles.map(v => (
                    <option key={v._id} value={v._id}>{v.vehicleNumber} ({v.vehicleName})</option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300">Remaining Van Boxes to Return</label>
              {vanStocks.map((vs) => (
                <div key={vs._id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {vs.product?.name} ({vs.product?.size || 'Standard'})
                    </p>
                    <p className="text-[10px] text-slate-400">On Van: {vs.quantity} Boxes | Box Price: ₹{vs.product?.sellingPrice} / Box</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-slate-500">Return Boxes:</span>
                    <input
                      type="number"
                      max={vs.quantity}
                      min="0"
                      value={returnItems[vs.product?._id] ?? vs.quantity}
                      onChange={(e) => setReturnItems({ ...returnItems, [vs.product._id]: e.target.value })}
                      className="w-20 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-black text-center text-slate-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
              ))}
              {vanStocks.length === 0 && (
                <p className="text-center py-6 text-slate-400 italic">No remaining boxes on this van to return.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || vanStocks.length === 0}
              className="w-full py-3.5 bg-pepsi-blue text-white font-extrabold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center space-x-2 shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>RETURNING STOCK TO WAREHOUSE...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Return Stock Boxes to Warehouse & Close Shift</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* History */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Recent Return Log History</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {returnsHistory.map((r) => (
              <div key={r._id} className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700 text-xs space-y-1">
                <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>{r.vehicle?.vehicleNumber}</span>
                  <span className="text-emerald-600 font-extrabold">{r.totalQuantity} Boxes Returned</span>
                </div>
                <p className="text-[11px] text-slate-500">Worker: {r.worker?.name} | {new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
