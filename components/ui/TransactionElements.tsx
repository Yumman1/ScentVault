import React from 'react';
import { Package, MapPin, Gauge, Info, ChevronRight, Check } from 'lucide-react';
import { Perfume } from '../../types';

// --- STEP INDICATOR ---
interface StepIndicatorProps {
  currentStep: number;
  steps: { label: string; icon: React.ReactNode }[];
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, steps }) => {
  return (
    <div className="flex items-center justify-between mb-8 px-2">
      {steps.map((step, i) => {
        const isCompleted = i + 1 < currentStep;
        const isActive = i + 1 === currentStep;
        
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-2 group transition-all duration-500">
              <div className={`
                w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 relative
                ${isActive ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 scale-110' : ''}
                ${isCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : ''}
                ${!isActive && !isCompleted ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500' : ''}
              `}>
                {isCompleted ? <Check size={18} /> : step.icon}
                {isActive && (
                    <span className="absolute -inset-1 rounded-2xl border-2 border-indigo-600 animate-ping opacity-20 pointer-events-none"></span>
                )}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-600'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-[2px] flex-1 mx-4 rounded-full transition-colors duration-700 ${isCompleted ? 'bg-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800'}`}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// --- PERFUME IDENTITY TAG ---
interface PerfumeTagProps {
  perfume?: Perfume;
  currentStock?: number;
}

export const PerfumeTag: React.FC<PerfumeTagProps> = ({ perfume, currentStock }) => {
  if (!perfume) return null;
  
  return (
    <div className="p-5 bg-slate-900/5 dark:bg-indigo-500/5 border border-slate-200 dark:border-indigo-500/10 rounded-3xl mb-6 animate-in slide-in-from-top-4 duration-500 overflow-hidden relative group">
      {/* Decorative Blur */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-1 block">Selected Perfume</span>
          <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
            {perfume.name}
          </h4>
          <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Code: {perfume.code}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Dosage</span>
             <span className="text-sm font-black text-slate-900 dark:text-white">{perfume.dosage}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 py-3 border-t border-slate-100 dark:border-slate-800">
         <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"><Info size={14} /></div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Scent Notes</p>
                <div className="flex flex-wrap gap-1 mt-1">
                    {perfume.olfactiveNotes?.slice(0, 3).map((note, i) => (
                        <span key={i} className="text-[9px] font-black px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded uppercase">{note}</span>
                    ))}
                    {(perfume.olfactiveNotes?.length || 0) > 3 && <span className="text-[9px] font-black text-slate-400">+{perfume.olfactiveNotes!.length - 3}</span>}
                </div>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${currentStock && currentStock <= (perfume.lowStockAlert || 0) ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}><Gauge size={14} /></div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-0.5 text-right">Inventory Hub</p>
                <p className={`text-sm font-black text-slate-900 dark:text-white text-right ${currentStock && currentStock <= (perfume.lowStockAlert || 0) ? 'text-rose-500' : ''}`}>
                    {currentStock?.toFixed(2) || '0.00'} <span className="text-[10px] font-bold uppercase">kg</span>
                </p>
            </div>
         </div>
      </div>
    </div>
  );
};

// --- STOCK IMPACT GAUGE ---
interface StockImpactGaugeProps {
  current: number;
  delta: number;
  threshold?: number;
  unit?: string;
}

export const StockImpactGauge: React.FC<StockImpactGaugeProps> = ({ current, delta, threshold = 0, unit = 'kg' }) => {
  const result = Math.max(0, current - delta);
  const isDanger = result <= threshold;
  const percentChange = current > 0 ? (delta / current) * 100 : 0;

  return (
    <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
      <div className="flex justify-between items-end mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Projected Load</span>
        <div className="text-right">
            <p className={`text-base font-black ${isDanger ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                {result.toFixed(2)} <span className="text-[10px] uppercase font-bold">{unit}</span>
            </p>
            <p className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter">-{percentChange.toFixed(1)}% Velocity</p>
        </div>
      </div>
      
      {/* Gauge Visual Bar */}
      <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
        <div 
          className="h-full bg-slate-400 dark:bg-slate-600 transition-all duration-1000" 
          style={{ width: `${Math.max(0, 100 - percentChange)}%` }}
        />
        <div 
          className="h-full bg-rose-500/40 animate-pulse transition-all duration-1000" 
          style={{ width: `${Math.min(100, percentChange)}%` }}
        />
      </div>
      
      {isDanger && (
        <p className="mt-2 text-[10px] font-black text-rose-500 uppercase flex items-center gap-1">
            <Info size={10} /> Critical Level Shift: Threshold Breach ({threshold}{unit})
        </p>
      )}
    </div>
  );
};
