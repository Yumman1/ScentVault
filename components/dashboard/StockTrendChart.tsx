import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { useInventory } from '../../context/InventoryContext';

export const StockTrendChart = () => {
  const { gateInLogs, gateOutLogs, perfumes } = useInventory();

  const data = useMemo(() => {
    // Last 7 days accumulation
    const days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return days.map(date => {
      const inbound = gateInLogs
        .filter(l => l.date === date)
        .reduce((sum, l) => sum + l.netWeight, 0);
      const outbound = gateOutLogs
        .filter(l => l.date === date)
        .reduce((sum, l) => sum + l.netWeight, 0);
      
      return {
        date: new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        "Inbound (kg)": Number(inbound.toFixed(2)),
        "Outbound (kg)": Number(outbound.toFixed(2))
      };
    });
  }, [gateInLogs, gateOutLogs]);

  const topPerfumes = useMemo(() => {
      const perfumeUsage: Record<string, number> = {};
      gateOutLogs.forEach(log => {
          perfumeUsage[log.perfumeId] = (perfumeUsage[log.perfumeId] || 0) + log.netWeight;
      });

      return Object.entries(perfumeUsage)
        .map(([id, weight]) => ({
            name: perfumes.find(p => p.id === id)?.name || 'Unknown',
            weight: Number(weight.toFixed(2))
        }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5);
  }, [gateOutLogs, perfumes]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-soft border border-slate-200 dark:border-slate-700 transition-colors">
        <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Inventory Velocity</h3>
            <div className="flex gap-4 text-[10px] font-black uppercase tracking-[0.2em]">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><div className="w-2 rounded-full h-2 bg-indigo-500"></div> Inbound</div>
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><div className="w-2 rounded-full h-2 bg-rose-500"></div> Outbound</div>
            </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={window.matchMedia('(prefers-color-scheme: dark)').matches || document.documentElement.classList.contains('dark') ? '#334155' : '#f1f5f9'} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} 
              />
              <Tooltip 
                contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', 
                    fontSize: '12px',
                    backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
                    color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#0f172a',
                }}
                itemStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em' }}
                cursor={{ stroke: document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0', strokeWidth: 2 }}
              />
              <Area type="monotone" dataKey="Inbound (kg)" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
              <Area type="monotone" dataKey="Outbound (kg)" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-soft border border-slate-200 dark:border-slate-700 transition-colors">
        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-8">High Demand Perfumes</h3>
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={topPerfumes} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#475569', fontSize: 10, fontWeight: 900 }}
                        width={100}
                    />
                    <Tooltip 
                         contentStyle={{ 
                             borderRadius: '16px', 
                             border: 'none', 
                             boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                             backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
                             color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#0f172a',
                         }}
                         cursor={{ fill: document.documentElement.classList.contains('dark') ? '#1e293b' : '#f8fafc' }}
                    />
                    <Bar dataKey="weight" radius={[0, 8, 8, 0]} barSize={24}>
                        {topPerfumes.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'][index % 5]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
