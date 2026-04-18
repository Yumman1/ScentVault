import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  bgColor: string;     // Explicit e.g. 'bg-amber-500'
  iconColor: string;   // Explicit e.g. 'text-amber-500'
  bgOpacity?: string;  // Optional e.g. 'bg-opacity-10'
  trend?: number;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  bgColor, 
  iconColor,
  bgOpacity = 'bg-opacity-10',
  trend 
}) => (
  <div className="glass-card p-6 rounded-[2rem] shadow-soft border border-slate-200/60 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 group-hover:scale-110 transition-transform duration-500 ${bgColor}`}></div>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-4 rounded-2xl ${bgColor} ${bgOpacity} shadow-sm`}>
        <Icon size={22} className={iconColor} />
      </div>
      {trend !== undefined && (
        <span className={`text-[10px] font-black px-3 py-1 rounded-full ${trend > 0 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{title}</p>
      <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">{value}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-black">{subtitle}</p>
    </div>
  </div>
);
