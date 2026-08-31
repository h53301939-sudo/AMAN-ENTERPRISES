import React from 'react';
import { X, Check, Target as TargetIcon } from 'lucide-react';
import targetDartboardImg from '../../assets/target_dartboard_3d.jpg';
import goldTrophyImg from '../../assets/gold_trophy_3d.jpg';

export default function TargetMotivationModal({
  isOpen,
  onClose,
  targetData,
  userName = 'Champion',
  role = 'worker' // 'worker' | 'admin'
}) {
  if (!isOpen) return null;

  const casesPct = targetData?.casesProgressPct || 0;
  const revenuePct = targetData?.revenueProgressPct || 0;
  const isAchieved = targetData?.pacingStatus === 'TARGET_ACHIEVED' || casesPct >= 100 || revenuePct >= 100;

  // Extract first name for friendly greeting
  const displayName = userName?.split(' ')[0] || userName || 'Champion';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden flex flex-col transform transition-all animate-slide-up">
        
        {/* ✕ Close Icon at Top Right */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition z-20"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Content Row: Left Details + Right 3D Illustration */}
        <div className="flex items-start justify-between gap-3 sm:gap-4 pt-1 pr-6">
          
          {/* Left Column: Greeting + Status Pill + Headline + Subtitle */}
          <div className="space-y-3 flex-1">
            
            {/* Welcome Back & Name */}
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 leading-none">
                Welcome back,
              </p>
              <h2 className={`text-2xl sm:text-3xl font-black mt-1 tracking-tight ${
                isAchieved 
                  ? 'text-[#16A34A] dark:text-emerald-400' 
                  : 'text-[#EA580C] dark:text-orange-500'
              }`}>
                {displayName}!
              </h2>
            </div>

            {/* Pill Badge */}
            <div>
              {isAchieved ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-300 text-xs font-black border border-emerald-200 dark:border-emerald-800/60">
                  <span className="w-4 h-4 rounded-full bg-[#16A34A] text-white flex items-center justify-center text-[10px]">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                  <span>Target Achieved</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FFF7ED] dark:bg-orange-950/50 text-[#C2410C] dark:text-orange-300 text-xs font-black border border-orange-200 dark:border-orange-800/60">
                  <TargetIcon className="w-3.5 h-3.5 text-[#EA580C] dark:text-orange-400" />
                  <span>Target Not Achieved</span>
                </span>
              )}
            </div>

            {/* Headline & Subtitle */}
            <div className="space-y-1 pt-0.5">
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {isAchieved ? (
                  <span>Congratulations! 🎉</span>
                ) : (
                  <span>Don't give up! 💪</span>
                )}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-xs">
                {isAchieved ? (
                  role === 'admin'
                    ? 'Your agency has successfully achieved this month\'s target. Keep up the amazing work!'
                    : 'You have achieved your target today. Keep up the amazing work!'
                ) : (
                  role === 'admin'
                    ? 'Agency is close to the monthly target. A little more effort and you\'ll get there!'
                    : 'You\'re close to your target. A little more effort and you\'ll get there!'
                )}
              </p>
            </div>

          </div>

          {/* Right Column: 3D Illustration Asset */}
          <div className="shrink-0 w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center relative">
            <img
              src={isAchieved ? goldTrophyImg : targetDartboardImg}
              alt={isAchieved ? 'Target Achieved Trophy' : 'Target Dartboard'}
              className="w-full h-full object-contain drop-shadow-md rounded-2xl"
            />
          </div>

        </div>

        {/* 🔘 BOTTOM 2 BUTTONS: 1st "Main Karunga", 2nd "Cancel" */}
        <div className="grid grid-cols-2 gap-3 mt-6 pt-2">
          
          {/* 1st Button: Main Karunga / Continue */}
          <button
            type="button"
            onClick={onClose}
            className={`w-full py-3 px-4 text-white font-extrabold rounded-2xl transition shadow-md active:scale-95 text-xs sm:text-sm flex items-center justify-center space-x-1.5 ${
              isAchieved
                ? 'bg-[#16A34A] hover:bg-[#15803D] shadow-emerald-600/25'
                : 'bg-[#EA580C] hover:bg-[#C2410C] shadow-orange-600/25'
            }`}
          >
            <span>{isAchieved ? 'Continue 🚀' : 'Main Karunga 💪'}</span>
          </button>

          {/* 2nd Button: Cancel */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition active:scale-95 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center"
          >
            <span>Cancel</span>
          </button>

        </div>

      </div>
    </div>
  );
}
