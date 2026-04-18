import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../../context/InventoryContext';
import { DashboardCard } from './DashboardCard';
import { 
  Scale,
  Package, 
  FlaskConical, 
  TrendingUp, 
  PlusCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock,
  ArrowRightLeft,
  Activity,
  DollarSign,
  Briefcase,
  Factory,
  Truck,
  Banknote,
  PackagePlus,
  AlertTriangle
} from 'lucide-react';

import { 
    ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell 
} from 'recharts';
import { UserRole, GateOutUsage, SupplierType } from '../../types';
import { StockTrendChart } from './StockTrendChart';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">{data.name}</p>
        <div className="space-y-3">
          <div className="flex justify-between gap-8 items-center">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-tight">Active SKUs</span>
            <span className="text-white font-black">{data.skuCount}</span>
          </div>
          <div className="flex justify-between gap-8 items-center border-t border-slate-800 pt-2">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-tight">Net Weight</span>
            <span className="text-white font-black">{data.weight.toLocaleString()} kg</span>
          </div>
          <div className="flex justify-between gap-8 items-center border-t border-slate-800 pt-2">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-tight">On-Hand Value</span>
            <span className="text-emerald-400 font-black">
              {data.supplierType === SupplierType.International ? '$' : 'Rs.'} {Math.round(data.valuation).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

interface DashboardProps {
  searchTerm: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ searchTerm }) => {
  const { 
    perfumes, suppliers, currentUser, getPerfumeStockBreakdown,
    hasPermission, gateInLogs, gateOutLogs, transferLogs
  } = useInventory();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = React.useState<'24h' | '30d'>('24h');

  const isOperator = currentUser?.role === UserRole.Operator;

  const stats = useMemo(() => {
    let totalWeight = 0;
    let totalValueUSD = 0;
    let totalValuePKR = 0;
    let lowStock = 0;
    
    // Period calculation
    const limitDate = new Date();
    if (timeRange === '24h') {
        limitDate.setHours(limitDate.getHours() - 24);
    } else {
        limitDate.setDate(limitDate.getDate() - 30);
    }
    const dateLimitStr = limitDate.toISOString().split('T')[0];

    let inductionPeriod = 0;
    let dispatchPeriod = 0;
    let productionWeight = 0;
    let salesWeight = 0;

    perfumes.forEach(p => {
        const breakdown = getPerfumeStockBreakdown(p.id);
        const weight = breakdown.reduce((acc, b) => acc + b.weight, 0);
        totalWeight += weight;
        totalValueUSD += weight * (p.priceUSD || 0);
        totalValuePKR += weight * (p.pricePKR || 0);
        if (weight <= (p.lowStockAlert || 0)) lowStock++;
    });

    gateInLogs.filter(l => l.date >= dateLimitStr).forEach(l => inductionPeriod += l.netWeight);
    
    gateOutLogs.filter(l => l.date >= dateLimitStr).forEach(l => {
        dispatchPeriod += l.netWeight;
        if (l.usage === GateOutUsage.Production) {
            productionWeight += l.netWeight;
        } else if (l.usage === GateOutUsage.Sale) {
            salesWeight += l.netWeight;
        }
    });

    return { 
        totalWeight, lowStock, totalItems: perfumes.length,
        valUSD: totalValueUSD, valPKR: totalValuePKR,
        inductionPeriod,
        dispatchPeriod,
        productionWeight,
        salesWeight
    };
  }, [perfumes, getPerfumeStockBreakdown, gateInLogs, gateOutLogs, timeRange]);

  const supplierDistribution = useMemo(() => {
    const dist: Record<string, { weight: number, skuCount: number, valuation: number, type: SupplierType }> = {};
    
    perfumes.forEach(p => {
        const s = suppliers.find(x => x.id === p.supplierId);
        if (!s) return;

        const breakdown = getPerfumeStockBreakdown(p.id);
        const weight = breakdown.reduce((acc, b) => acc + b.weight, 0);
        if (weight <= 0) return;

        const val = s.type === SupplierType.International ? weight * (p.priceUSD || 0) : weight * (p.pricePKR || 0);

        if (!dist[s.name]) {
            dist[s.name] = { weight: 0, skuCount: 0, valuation: 0, type: s.type };
        }
        dist[s.name].weight += weight;
        dist[s.name].skuCount += 1;
        dist[s.name].valuation += val;
    });

    return Object.entries(dist)
        .map(([name, data]) => ({ 
            name, 
            weight: data.weight, 
            skuCount: data.skuCount, 
            valuation: data.valuation,
            supplierType: data.type 
        }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5);
  }, [perfumes, suppliers, getPerfumeStockBreakdown]);

  const recentMovements = useMemo(() => {
      const merged = [
          ...gateInLogs.map(l => ({ ...l, type: 'Inbound', color: 'text-emerald-500' })),
          ...gateOutLogs.map(l => ({ ...l, type: 'Dispatch', color: 'text-rose-500' })),
          ...transferLogs.map(l => ({ ...l, type: 'Transfer', color: 'text-indigo-500' }))
      ];
      return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [gateInLogs, gateOutLogs, transferLogs]);

  const filteredPerfumes = useMemo(() => {
    return perfumes
        .filter(p => 
            (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.code || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, 5);
  }, [perfumes, searchTerm]);

  return (
    <div className="p-10 space-y-12 animate-in fade-in duration-700 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Inventory Overview</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-4 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System active as <span className="text-indigo-600 font-black">{currentUser?.role || 'User'}</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex shadow-sm">
          <button 
            onClick={() => setTimeRange('24h')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${timeRange === '24h' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
          >
            24h
          </button>
          <button 
            onClick={() => setTimeRange('30d')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${timeRange === '30d' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
          >
            30d
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <DashboardCard 
                title="Total Stock Load" 
                value={`${stats.totalWeight.toLocaleString()} kg`} 
                subtitle="Net Managed Weight" 
                icon={Scale} 
                bgColor="bg-slate-900" 
                iconColor="text-slate-100"
            />
            {hasPermission('view_prices') && (
                <>
                    <DashboardCard 
                        title="Current Valuation (PKR)" 
                        value={`Rs. ${Math.round(stats.valPKR).toLocaleString()}`} 
                        subtitle="Consolidated PKR Value" 
                        icon={Banknote} 
                        bgColor="bg-slate-800" 
                        iconColor="text-amber-400"
                    />
                    <DashboardCard 
                        title="Current Valuation (USD)" 
                        value={`$ ${Math.round(stats.valUSD).toLocaleString()}`} 
                        subtitle="Consolidated USD Value" 
                        icon={DollarSign} 
                        bgColor="bg-indigo-600" 
                        iconColor="text-white"
                        bgOpacity="bg-opacity-100"
                    />
                </>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <DashboardCard 
                title="Factory Consumption" 
                value={`${stats.productionWeight.toLocaleString()} kg`} 
                subtitle={`${timeRange === '24h' ? 'Last 24 Hours' : 'Last 30 Days'} Internal`} 
                icon={Factory} 
                bgColor="bg-amber-500" 
                iconColor="text-white"
                bgOpacity="bg-opacity-100"
            />
            <DashboardCard 
                title="Commercial Sales" 
                value={`${stats.salesWeight.toLocaleString()} kg`} 
                subtitle={`${timeRange === '24h' ? 'Last 24 Hours' : 'Last 30 Days'} External`} 
                icon={Briefcase} 
                bgColor="bg-rose-500" 
                iconColor="text-white"
                bgOpacity="bg-opacity-100"
            />
            <DashboardCard 
                title="Total Inbound" 
                value={`${stats.inductionPeriod.toLocaleString()} kg`} 
                subtitle={`${timeRange === '24h' ? 'Last 24 Hours' : 'Last 30 Days'} Induction`} 
                icon={PackagePlus} 
                bgColor="bg-emerald-500" 
                iconColor="text-white"
                bgOpacity="bg-opacity-100"
            />
            <DashboardCard 
                title="Total Outbound" 
                value={`${stats.dispatchPeriod.toLocaleString()} kg`} 
                subtitle={`${timeRange === '24h' ? 'Last 24 Hours' : 'Last 30 Days'} Dispatch`} 
                icon={Truck} 
                bgColor="bg-slate-700" 
                iconColor="text-white"
                bgOpacity="bg-opacity-100"
            />
       </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] shadow-soft border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-10">
            <h3 className="font-black text-slate-900 dark:text-white text-xl tracking-tight flex items-center gap-2">
                Latest Activity
            </h3>
            <button 
              onClick={() => navigate('/reports')}
              className="px-6 py-2 bg-slate-50 dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-50 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              Full Ledger Audit
            </button>
          </div>
          
          <div className="space-y-6">
              {recentMovements.map((move: any, idx) => {
                  const p = perfumes.find(x => x.id === move.perfumeId);
                  const isLast = idx === recentMovements.length - 1;
                  return (
                      <div key={idx} className={`flex items-center justify-between pb-6 ${!isLast ? 'border-b border-slate-50 dark:border-slate-700/50' : ''} group`}>
                          <div className="flex items-center gap-5">
                               <div className={`p-4 rounded-3xl ${
                                  move.type === 'Inbound' ? 'bg-emerald-50 dark:bg-emerald-900/30' : 
                                  move.type === 'Dispatch' && (move as any).usage === GateOutUsage.Production ? 'bg-amber-50 dark:bg-amber-900/30' :
                                  move.type === 'Dispatch' ? 'bg-rose-50 dark:bg-rose-900/30' : 
                                  'bg-indigo-50 dark:bg-indigo-900/30'
                                } transition-all group-hover:scale-105`}>
                                  {move.type === 'Inbound' ? <ArrowDownToLine size={18} className="text-emerald-600" /> : 
                                   move.type === 'Dispatch' && (move as any).usage === GateOutUsage.Production ? <FlaskConical size={18} className="text-amber-600" /> :
                                   move.type === 'Dispatch' ? <ArrowUpFromLine size={18} className="text-rose-600" /> : 
                                   <ArrowRightLeft size={18} className="text-indigo-600" />}
                               </div>
                              <div>
                                  <div className="font-black text-slate-900 dark:text-white text-base leading-tight uppercase tracking-tight">{p?.name || 'Unknown Item'}</div>
                                   <div className="flex items-center gap-3 mt-1">
                                       <span className={`text-[10px] font-black uppercase tracking-widest ${
                                           move.type === 'Inbound' ? 'text-emerald-500' : 
                                           move.type === 'Dispatch' && (move as any).usage === GateOutUsage.Production ? 'text-amber-500' :
                                           move.type === 'Dispatch' ? 'text-rose-500' : 'text-indigo-500'
                                       }`}>
                                           {move.type} {move.type === 'Dispatch' ? `(${ (move as any).usage })` : ''}
                                       </span>
                                       <span className="text-[10px] text-slate-400 font-mono font-bold tracking-tight">{move.date}</span>
                                   </div>
                              </div>
                          </div>
                          <div className="text-right">
                              <div className="text-xl font-black text-slate-900 dark:text-white">{move.netWeight.toFixed(1)} <span className="text-xs font-normal text-slate-400">kg</span></div>
                              <p className="text-[10px] font-black text-slate-400 uppercase font-mono tracking-widest">{move.importReference || move.batchNumber || 'Batch Entry'}</p>
                          </div>
                      </div>
                  );
              })}
              {recentMovements.length === 0 && (
                  <div className="py-20 text-center text-slate-300 font-black italic">No logistical movements recorded yet.</div>
              )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-10">
            {/* Olfactive DNA radar */}
            <div className="bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] shadow-soft border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                <div className="relative z-10 h-[340px]">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-8 flex items-center gap-2">
                        Supplier Distribution <span className="text-indigo-500 text-[10px] uppercase font-black tracking-[0.2em]">(Global Load)</span>
                    </h3>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={supplierDistribution} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} 
                                width={120}
                            />
                            <Tooltip 
                                cursor={{ fill: '#f8fafc', fillOpacity: 0.4 }}
                                content={<CustomTooltip />}
                            />
                            <Bar dataKey="weight" radius={[0, 10, 10, 0]}>
                                {supplierDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#6366f1', '#f59e0b', '#ec4899', '#10b981', '#64748b'][index % 5]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
        </div>
      </div>
    </div>
  );
};
