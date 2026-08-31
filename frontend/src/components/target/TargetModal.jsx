import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import API from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Target as TargetIcon, CheckCircle, Loader2, AlertCircle, User as UserIcon } from 'lucide-react';

export default function TargetModal({
  isOpen,
  onClose,
  currentTarget,
  workerId = null,
  workerName = '',
  onTargetSaved
}) {
  const { toast } = useToast();
  const [targetCases, setTargetCases] = useState(workerId ? 1000 : 5000);
  const [targetRevenue, setTargetRevenue] = useState(workerId ? 500000 : 2500000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (currentTarget) {
      setTargetCases(currentTarget.targetCases || (workerId ? 1000 : 5000));
      setTargetRevenue(currentTarget.targetRevenue || (workerId ? 500000 : 2500000));
    } else {
      setTargetCases(workerId ? 1000 : 5000);
      setTargetRevenue(workerId ? 500000 : 2500000);
    }
  }, [currentTarget, workerId, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await API.post('/targets', {
        workerId: workerId || null,
        targetCases: Number(targetCases),
        targetRevenue: Number(targetRevenue)
      });
      toast.success(
        workerName ? `Monthly target for ${workerName} saved! 🎯` : 'Agency monthly sales target saved! 🎯',
        'Target Saved'
      );
      if (onTargetSaved) onTargetSaved();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save sales target';
      setErrorMessage(msg);
      toast.error(msg, 'Save Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = workerName 
    ? `Set Monthly Target: ${workerName}` 
    : 'Set Agency Monthly Sales Target';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/30 text-pepsi-blue dark:text-blue-300 rounded-xl">
          {workerName ? (
            <div className="w-8 h-8 rounded-lg bg-[#DC2626] text-white flex items-center justify-center font-bold text-sm shrink-0">
              <UserIcon className="w-4 h-4" />
            </div>
          ) : (
            <TargetIcon className="w-6 h-6 flex-shrink-0" />
          )}
          <div>
            <h4 className="font-extrabold text-sm">
              {workerName ? `Goal Setting for ${workerName}` : 'Monthly Agency Goal Setting'}
            </h4>
            <p className="text-[11px] opacity-80">
              {workerName 
                ? 'Assign custom monthly volume & revenue targets for this salesman.' 
                : 'Set target volume (boxes) & revenue goals for the overall agency.'}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Target Volume (Total Boxes)
          </label>
          <div className="relative">
            <input
              type="number"
              min="10"
              step="10"
              value={targetCases}
              onChange={(e) => setTargetCases(e.target.value)}
              required
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl font-black text-slate-900 dark:text-white text-sm"
              placeholder={workerId ? "e.g. 1000" : "e.g. 5000"}
            />
            <span className="absolute right-3 top-3 text-[11px] font-bold text-slate-400">Boxes</span>
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Target Revenue (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
            <input
              type="number"
              min="1000"
              step="5000"
              value={targetRevenue}
              onChange={(e) => setTargetRevenue(e.target.value)}
              required
              className="w-full p-2.5 pl-7 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl font-black text-slate-900 dark:text-white text-sm"
              placeholder={workerId ? "e.g. 500000" : "e.g. 2500000"}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-pepsi-blue text-white font-extrabold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center space-x-2 shadow-md mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>SAVING TARGET...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>{workerName ? 'Save Worker Target' : 'Save Agency Sales Target'}</span>
            </>
          )}
        </button>
      </form>
    </Modal>
  );
}
