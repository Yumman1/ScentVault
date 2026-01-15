import React, { useState, useMemo } from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { Sidebar } from './components/Sidebar';
import { 
  SupplierForm, 
  CustomerForm, 
  PackingTypeForm, 
  LocationForm 
} from './components/forms/SystemForms';
import { UserForm } from './components/forms/UserForm';
import { PerfumeMasterForm } from './components/forms/PerfumeForm';
import { 
  GateInForm, 
  GateOutForm, 
  StockTransferForm 
} from './components/forms/TransactionForms';
import { ReportsView } from './components/reports/ReportsView';
import { DatabaseSettings } from './components/settings/DatabaseSettings';
import { 
  DollarSign, 
  AlertTriangle, 
  Package, 
  FlaskConical, 
  TrendingUp, 
  Search,
  ChevronDown,
  User as UserIcon,
  Bell,
  CheckCircle2,
  PlusCircle,
  BarChart3,
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock
} from 'lucide-react';
import { UserRole } from './types';

const DashboardCard = ({ title, value, subtitle, icon: Icon, color, trend }: any) => (
  <div className="glass-card p-6 rounded-[2rem] shadow-soft border border-slate-200/60 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 group-hover:scale-110 transition-transform duration-500 ${color}`}></div>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-4 rounded-2xl ${color} bg-opacity-10 shadow-sm`}>
        <Icon size={22} className={color.replace('bg-', 'text-')} />
      </div>
      {trend && (
        <span className={`text-[10px] font-black px-3 py-1 rounded-full ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div>
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      <h3 className="text-3xl font-black text-slate-900 mt-1">{value}</h3>
      <p className="text-xs text-slate-500 mt-2 font-bold">{subtitle}</p>
    </div>
  </div>
);

interface DashboardProps {
  setView: (view: string) => void;
  searchTerm: string;
}

const Dashboard: React.FC<DashboardProps> = ({ setView, searchTerm }) => {
  const { 
    perfumes, suppliers, hasPermission, currentUser, getPerfumeStockBreakdown
  } = useInventory();

  const isOperator = currentUser?.role === UserRole.Operator;

  const stats = useMemo(() => {
    let totalWeight = 0;
    let lowStock = 0;

    perfumes.forEach(p => {
        const breakdown = getPerfumeStockBreakdown(p.id);
        const weight = breakdown.reduce((acc, b) => acc + b.weight, 0);
        totalWeight += weight;
        if (weight <= (p.lowStockAlert || 0)) lowStock++;
    });

    return { totalWeight, lowStock, totalItems: perfumes.length };
  }, [perfumes, getPerfumeStockBreakdown]);

  const filteredPerfumes = useMemo(() => {
    return perfumes
        .filter(p => 
            (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.code || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, 5);
  }, [perfumes, searchTerm]);

  return (
    <div className="p-10 space-y-12 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Command Center</h2>
          <p className="text-slate-500 mt-2 font-bold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            System running optimally as <span className="text-indigo-600 font-black">{currentUser?.role || 'User'}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <DashboardCard 
          title="Master Inventory" 
          value={stats.totalItems} 
          subtitle="Unique SKUs" 
          icon={FlaskConical} 
          color="bg-indigo-500" 
          trend={2.4}
        />
        <DashboardCard 
          title="Stock Alerts" 
          value={stats.lowStock} 
          subtitle="At Risk" 
          icon={AlertTriangle} 
          color={stats.lowStock > 0 ? "bg-rose-500" : "bg-emerald-500"} 
        />
        <DashboardCard 
          title="Net Weight" 
          value={`${stats.totalWeight.toLocaleString()} kg`} 
          subtitle="Aggregated Stock" 
          icon={Package} 
          color="bg-slate-800" 
        />
        <DashboardCard 
          title="Supply Base" 
          value={suppliers.length} 
          subtitle="Active Partnerships" 
          icon={TrendingUp} 
          color="bg-amber-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3 bg-white p-10 rounded-[3rem] shadow-soft border border-slate-200">
          <div className="flex justify-between items-center mb-10">
            <h3 className="font-black text-slate-900 text-2xl tracking-tight">Rapid Inventory Pulse</h3>
            <button 
              onClick={() => setView('reports')}
              className="px-6 py-2 bg-slate-50 text-indigo-700 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-50 transition-all border border-slate-200"
            >
              Full Analytics
            </button>
          </div>
          <div className="space-y-8">
            {filteredPerfumes.map(p => {
                const breakdown = getPerfumeStockBreakdown(p.id);
                const stock = breakdown.reduce((acc, b) => acc + b.weight, 0);
                const alertThreshold = p.lowStockAlert || 1;
                const pct = Math.min((stock / (alertThreshold * 3)) * 100, 100);
                return (
                    <div key={p.id} className="group cursor-pointer" onClick={() => setView('reports')}>
                        <div className="flex justify-between items-end mb-3">
                            <div>
                                <span className="font-black text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{p.name}</span>
                                <p className="text-[10px] font-bold text-slate-400 font-mono">{p.code}</p>
                            </div>
                            <span className="font-mono font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">{stock.toFixed(1)} kg</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                            <div className={`h-full transition-all duration-1000 ${stock <= alertThreshold ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }}></div>
                        </div>
                    </div>
                );
            })}
            {filteredPerfumes.length === 0 && (
                <div className="py-20 text-center space-y-4">
                    <p className="text-slate-300 font-black italic text-xl">No assets found matching your query.</p>
                </div>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-2 bg-indigo-600 p-10 rounded-[3rem] shadow-2xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white opacity-5 rounded-full"></div>
            <div className="relative z-10">
                <h3 className="text-3xl font-black mb-2 tracking-tight">Quick Actions</h3>
                <p className="text-indigo-200 text-sm font-bold mb-10">Optimized logistic workflows.</p>
                <div className="grid grid-cols-1 gap-4">
                    <button 
                    onClick={() => setView('gate-in')}
                    className="bg-white/10 hover:bg-white/20 transition-all p-6 rounded-[2rem] flex items-center gap-5 border border-white/10 group"
                    >
                        <div className="p-4 bg-white/10 rounded-2xl group-hover:scale-110 transition-transform">
                            <ArrowDownToLine size={24} className="text-indigo-200 group-hover:text-white" />
                        </div>
                        <div className="text-left">
                            <p className="font-black text-lg">Inbound Log</p>
                            <p className="text-xs text-indigo-300 font-bold">Process new stock arrivals</p>
                        </div>
                    </button>
                    <button 
                    onClick={() => !isOperator ? setView('perfumes') : null}
                    disabled={isOperator}
                    className={`bg-white/10 p-6 rounded-[2rem] flex items-center gap-5 border border-white/10 group transition-all ${isOperator ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20'}`}
                    >
                        <div className="p-4 bg-white/10 rounded-2xl group-hover:scale-110 transition-transform">
                            {isOperator ? <Lock size={24} className="text-indigo-200" /> : <PlusCircle size={24} className="text-indigo-200 group-hover:text-white" />}
                        </div>
                        <div className="text-left">
                            <p className="font-black text-lg">Create Asset</p>
                            <p className="text-xs text-indigo-300 font-bold">{isOperator ? 'Administrative only' : 'Add to perfume master'}</p>
                        </div>
                    </button>
                    <button 
                    onClick={() => setView('gate-out')}
                    className="bg-white/10 hover:bg-white/20 transition-all p-6 rounded-[2rem] flex items-center gap-5 border border-white/10 group"
                    >
                        <div className="p-4 bg-white/10 rounded-2xl group-hover:scale-110 transition-transform">
                            <ArrowUpFromLine size={24} className="text-indigo-200 group-hover:text-white" />
                        </div>
                        <div className="text-left">
                            <p className="font-black text-lg">Outbound Issue</p>
                            <p className="text-xs text-indigo-300 font-bold">Dispatch stock for production</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { users, currentUser, setCurrentUser } = useInventory();
  const [currentView, setCurrentView] = useState('dashboard');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [dashboardSearch, setDashboardSearch] = useState('');

  const renderView = () => {
    const role = currentUser?.role;
    const isViewer = role === UserRole.Viewer;
    const isAdmin = role === UserRole.Admin;

    switch(currentView) {
      case 'dashboard': return <Dashboard setView={setCurrentView} searchTerm={dashboardSearch} />;
      case 'reports': return <ReportsView />;
      case 'gate-in': 
        if (isViewer) return <Dashboard setView={setCurrentView} searchTerm={dashboardSearch} />;
        return <div className="p-10"><GateInForm /></div>;
      case 'gate-out': 
        if (isViewer) return <Dashboard setView={setCurrentView} searchTerm={dashboardSearch} />;
        return <div className="p-10"><GateOutForm /></div>;
      case 'transfer': 
        if (isViewer) return <Dashboard setView={setCurrentView} searchTerm={dashboardSearch} />;
        return <div className="p-10"><StockTransferForm /></div>;
      case 'users': 
        if (!isAdmin) return <Dashboard setView={setCurrentView} searchTerm={dashboardSearch} />;
        return <div className="p-10"><UserForm /></div>;
      case 'database': 
        if (!isAdmin) return <Dashboard setView={setCurrentView} searchTerm={dashboardSearch} />;
        return <div className="p-10"><DatabaseSettings /></div>;
      case 'suppliers': 
        if (!isAdmin) return <Dashboard setView={setCurrentView} searchTerm={dashboardSearch} />;
        return <div className="p-10"><SupplierForm /></div>;
      case 'customers': 
        if (!isAdmin) return <Dashboard setView={setCurrentView} searchTerm={dashboardSearch} />;
        return <div className="p-10"><CustomerForm /></div>;
      case 'packing': 
        if (!isAdmin) return <Dashboard setView={setCurrentView} searchTerm={dashboardSearch} />;
        return <div className="p-10"><PackingTypeForm /></div>;
      case 'locations': 
        if (!isAdmin) return <Dashboard setView={setCurrentView} searchTerm={dashboardSearch} />;
        return <div className="p-10"><LocationForm /></div>;
      case 'perfumes': 
        if (!isAdmin) return <Dashboard setView={setCurrentView} searchTerm={dashboardSearch} />;
        return <div className="p-10"><PerfumeMasterForm /></div>;
      default: return <Dashboard setView={setCurrentView} searchTerm={dashboardSearch} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100">
      <Sidebar currentView={currentView} setView={setCurrentView} />
      <main className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white/70 backdrop-blur-2xl sticky top-0 z-40 border-b border-slate-200 h-24 flex items-center px-12 justify-between">
           <div className="flex items-center gap-8">
               <span className="text-xl font-black text-slate-900 tracking-tighter capitalize border-l-4 border-indigo-600 pl-4 py-1">
                   {currentView.replace('-', ' ')}
               </span>
               <div className="hidden lg:flex items-center gap-4 bg-slate-100 px-6 py-3 rounded-2xl border border-slate-200 group focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:bg-white transition-all">
                   <Search size={18} className="text-slate-400" />
                   <input 
                      type="text" 
                      placeholder="Global Intelligence Search..." 
                      className="text-sm font-bold outline-none w-64 bg-transparent text-slate-700" 
                      value={dashboardSearch}
                      onChange={(e) => setDashboardSearch(e.target.value)}
                   />
               </div>
           </div>
           
           <div className="flex items-center gap-8">
             <button className="text-slate-400 hover:text-indigo-600 transition-all relative p-2 rounded-xl hover:bg-indigo-50">
                 <Bell size={24} />
                 <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
             </button>
             
             <div className="relative">
                 <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-4 bg-white hover:bg-slate-50 transition-all pl-1.5 pr-5 py-1.5 rounded-2xl border border-slate-200 group shadow-sm"
                 >
                     <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-sm shadow-xl">
                         {currentUser?.name?.charAt(0) || '?'}
                     </div>
                     <div className="text-left">
                         <p className="text-sm font-black text-slate-900 leading-none">{currentUser?.name || 'User'}</p>
                         <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{currentUser?.role || 'Guest'}</p>
                     </div>
                     <ChevronDown size={16} className="text-slate-300 group-hover:text-indigo-600 transition-all" />
                 </button>

                 {showUserMenu && (
                     <div className="absolute right-0 mt-4 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 py-3 animate-in slide-in-from-top-4 duration-300 ring-1 ring-slate-900/5">
                         <div className="px-5 py-4 border-b border-slate-50 mb-2">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Accounts</p>
                         </div>
                         {users.map(u => (
                             <button 
                                key={u.id}
                                onClick={() => { setCurrentUser(u); setShowUserMenu(false); setCurrentView('dashboard'); }}
                                className={`w-full text-left px-5 py-3.5 text-sm flex items-center gap-4 hover:bg-slate-50 transition-all ${currentUser?.id === u.id ? 'bg-indigo-50/50' : ''}`}
                             >
                                 <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black ${currentUser?.id === u.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}>
                                     {u.name?.charAt(0) || '?'}
                                 </div>
                                 <div className="flex-1">
                                     <p className={`font-black ${currentUser?.id === u.id ? 'text-indigo-700' : 'text-slate-700'}`}>{u.name || 'Anonymous'}</p>
                                     <p className="text-[10px] text-slate-400 font-bold uppercase">{u.role}</p>
                                 </div>
                                 {currentUser?.id === u.id && <CheckCircle2 size={16} className="text-indigo-600" />}
                             </button>
                         ))}
                     </div>
                 )}
             </div>
           </div>
        </header>
        <div className="flex-1 overflow-y-auto">
            {renderView()}
        </div>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <InventoryProvider>
      <AppContent />
    </InventoryProvider>
  );
};

export default App;