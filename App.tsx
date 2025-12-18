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
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ArrowRightLeft,
  Coins,
  Lock
} from 'lucide-react';
import { UserRole } from './types';

// --- DASHBOARD COMPONENT ---
const Dashboard = () => {
  const { 
    perfumes, suppliers, packingTypes,
    gateInLogs, gateOutLogs, transferLogs,
    currentUser, hasPermission
  } = useInventory();

  const canViewPrices = hasPermission('view_prices');

  // --- Real-time Stock Calculation Logic ---
  const dashboardData = useMemo(() => {
    const stockMap: Record<string, number> = {};
    const perfumeSupplierMap: Record<string, string> = {};
    const supplierLastStockedMap: Record<string, number> = {}; 

    perfumes.forEach(p => {
        perfumeSupplierMap[p.id] = p.supplierId;
    });
    
    const getWeight = (log: any) => {
      if (typeof log.netWeight === 'number' && log.netWeight > 0) return log.netWeight;
      const pt = packingTypes.find(p => p.id === log.packingTypeId);
      if (pt) return (log.packingQty || 0) * pt.qtyPerPacking;
      return 0;
    };

    const allowedLocs = currentUser?.permissions?.allowedLocationIds || [];
    const isLocRestricted = allowedLocs.length > 0;

    const filterLogLoc = (l: any) => {
       if (!isLocRestricted) return true;
       if (l.mainLocationId) return allowedLocs.includes(l.mainLocationId);
       if (l.fromMainLocationId) return allowedLocs.includes(l.fromMainLocationId) || allowedLocs.includes(l.toMainLocationId);
       return true;
    };

    gateInLogs.filter(filterLogLoc).forEach(l => {
      stockMap[l.perfumeId] = (stockMap[l.perfumeId] || 0) + getWeight(l);
      const sId = perfumeSupplierMap[l.perfumeId];
      if (sId) {
          const logTs = new Date(l.date).getTime();
          if (!supplierLastStockedMap[sId] || logTs > supplierLastStockedMap[sId]) {
              supplierLastStockedMap[sId] = logTs;
          }
      }
    });

    gateOutLogs.filter(filterLogLoc).forEach(l => {
      stockMap[l.perfumeId] = (stockMap[l.perfumeId] || 0) - getWeight(l);
    });

    let totalValueUSD = 0;
    let totalValuePKR = 0;
    let totalWeight = 0;
    let lowStockCount = 0;
    const supplierStatsMap: Record<string, { count: number; valueUSD: number; valuePKR: number; weight: number }> = {};

    perfumes.forEach(p => {
      const currentWeight = stockMap[p.id] || 0;
      if (currentWeight > 0.001) {
        const valUSD = currentWeight * (p.priceUSD || 0);
        const valPKR = currentWeight * (p.pricePKR || 0);
        totalWeight += currentWeight;
        totalValueUSD += valUSD;
        totalValuePKR += valPKR;

        if (!supplierStatsMap[p.supplierId]) {
          supplierStatsMap[p.supplierId] = { count: 0, valueUSD: 0, valuePKR: 0, weight: 0 };
        }
        supplierStatsMap[p.supplierId].count += 1;
        supplierStatsMap[p.supplierId].valueUSD += valUSD;
        supplierStatsMap[p.supplierId].valuePKR += valPKR;
        supplierStatsMap[p.supplierId].weight += currentWeight;
      }
      if (currentWeight <= (p.lowStockAlert || 0)) {
        lowStockCount++;
      }
    });

    const supplierTable = suppliers.map(s => {
      const stats = supplierStatsMap[s.id] || { count: 0, valueUSD: 0, valuePKR: 0, weight: 0 };
      const lastStockedTs = supplierLastStockedMap[s.id];
      return {
        id: s.id,
        name: s.name,
        contact: s.contactPerson,
        itemsInStock: stats.count,
        stockWeight: stats.weight,
        valueUSD: stats.valueUSD,
        valuePKR: stats.valuePKR,
        lastStocked: lastStockedTs ? new Date(lastStockedTs).toISOString().split('T')[0] : null
      };
    }).sort((a, b) => b.valueUSD - a.valueUSD);

    const combinedLogs = [
      ...gateInLogs.filter(filterLogLoc).map(l => ({ ...l, type: 'Gate In', ts: new Date(l.date).getTime() })),
      ...gateOutLogs.filter(filterLogLoc).map(l => ({ ...l, type: 'Gate Out', ts: new Date(l.date).getTime() })),
      ...transferLogs.filter(filterLogLoc).map(l => ({ ...l, type: 'Transfer', ts: new Date(l.date).getTime() }))
    ].sort((a, b) => b.ts - a.ts).slice(0, 5);

    const recentActivity = combinedLogs.map(log => {
      const p = perfumes.find(x => x.id === log.perfumeId);
      return {
        id: log.id,
        type: log.type,
        date: log.date,
        perfumeName: p?.name || 'Unknown',
        weight: getWeight(log)
      };
    });

    return {
      totalPerfumes: perfumes.length,
      lowStockCount,
      totalValueUSD,
      totalValuePKR,
      totalWeight,
      supplierTable,
      recentActivity
    };
  }, [perfumes, suppliers, packingTypes, gateInLogs, gateOutLogs, transferLogs, currentUser]);

  const formatCurrency = (val: number, currency: 'USD' | 'PKR') => {
    return currency === 'USD' 
      ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      : `Rs ${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
        <p className="text-gray-500 text-sm">Real-time inventory metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Perfumes</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{dashboardData.totalPerfumes}</h3>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><FlaskConical size={20} /></div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Registered Master Items</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Low Stock</p>
              <h3 className={`text-2xl font-bold mt-1 ${dashboardData.lowStockCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                {dashboardData.lowStockCount}
              </h3>
            </div>
            <div className={`p-2 rounded-lg ${dashboardData.lowStockCount > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'}`}><AlertTriangle size={20} /></div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Items below alert level</p>
        </div>

        {canViewPrices ? (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Value (USD)</p>
                <h3 className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(dashboardData.totalValueUSD, 'USD')}</h3>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={20} /></div>
            </div>
            <p className="text-xs text-gray-400 mt-3">Current Stock Valuation</p>
            </div>
        ) : (
            <div className="bg-gray-50 p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center items-center opacity-70">
                <Lock size={24} className="text-gray-400 mb-2"/><span className="text-xs text-gray-500">Valuation Hidden</span>
            </div>
        )}

        {canViewPrices ? (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Value (PKR)</p>
                <h3 className="text-2xl font-bold text-teal-700 mt-1">{formatCurrency(dashboardData.totalValuePKR, 'PKR')}</h3>
                </div>
                <div className="p-2 bg-teal-50 text-teal-600 rounded-lg"><Coins size={20} /></div>
            </div>
            <p className="text-xs text-gray-400 mt-3">Current Stock Valuation</p>
            </div>
         ) : (
            <div className="bg-gray-50 p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center items-center opacity-70">
                <Lock size={24} className="text-gray-400 mb-2"/><span className="text-xs text-gray-500">Valuation Hidden</span>
            </div>
        )}

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Stock</p>
              <h3 className="text-2xl font-bold text-blue-700 mt-1">{dashboardData.totalWeight.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-sm font-normal text-gray-500">kg</span></h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package size={20} /></div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Net Weight Available</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><TrendingUp size={18} className="text-indigo-500"/>Supplier Inventory Holdings</h3>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{dashboardData.supplierTable.length} Suppliers</span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                <tr>
                  <th className="px-6 py-3">Supplier</th>
                  <th className="px-6 py-3 text-center">Items</th>
                  <th className="px-6 py-3">Last Stocked</th>
                  <th className="px-6 py-3 text-right">Weight (KG)</th>
                  {canViewPrices && <th className="px-6 py-3 text-right">Value (USD)</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dashboardData.supplierTable.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3"><div className="font-medium text-gray-900">{s.name}</div><div className="text-xs text-gray-400">{s.contact}</div></td>
                    <td className="px-6 py-3 text-center">{s.itemsInStock > 0 ? <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">{s.itemsInStock}</span> : '-'}</td>
                    <td className="px-6 py-3 text-xs text-gray-500">{s.lastStocked || '-'}</td>
                    <td className="px-6 py-3 text-right font-mono text-xs">{s.stockWeight > 0 ? s.stockWeight.toFixed(1) : '-'}</td>
                    {canViewPrices && <td className="px-6 py-3 text-right font-medium text-gray-900">{s.valueUSD > 0 ? formatCurrency(s.valueUSD, 'USD') : '-'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="p-5 border-b border-gray-100"><h3 className="font-bold text-gray-800">Recent Activity</h3></div>
          <div className="p-0">
            {dashboardData.recentActivity.map((log, idx) => (
              <div key={log.id} className={`p-4 flex items-start gap-3 ${idx !== dashboardData.recentActivity.length -1 ? 'border-b border-gray-100' : ''}`}>
                <div className={`mt-1 p-1.5 rounded-full flex-shrink-0 ${log.type === 'Gate In' ? 'bg-green-100 text-green-600' : log.type === 'Gate Out' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  {log.type === 'Gate In' && <ArrowDownToLine size={14} />}{log.type === 'Gate Out' && <ArrowUpFromLine size={14} />}{log.type === 'Transfer' && <ArrowRightLeft size={14} />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{log.perfumeName}</p>
                  <div className="flex gap-2 items-center mt-0.5"><span className="text-xs text-gray-500">{log.date}</span><span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{log.type}</span></div>
                  <p className="text-xs text-gray-500 mt-1">{log.type === 'Gate In' ? 'Received' : log.type === 'Gate Out' ? 'Issued' : 'Moved'} <span className="font-mono ml-1 font-medium text-gray-700">{log.weight.toFixed(2)} kg</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { users, currentUser, setCurrentUser } = useInventory();
  const [currentView, setCurrentView] = useState('dashboard');

  const renderView = () => {
    switch(currentView) {
      case 'dashboard': return <Dashboard />;
      case 'reports': return <ReportsView />;
      case 'database': return <div className="p-8"><h2 className="text-2xl font-bold mb-4">Database Settings</h2><DatabaseSettings /></div>;
      case 'users': return <div className="p-8"><h2 className="text-2xl font-bold mb-4">User Management</h2><UserForm /></div>;
      case 'suppliers': return <div className="p-8"><h2 className="text-2xl font-bold mb-4">Suppliers</h2><SupplierForm /></div>;
      case 'customers': return <div className="p-8"><h2 className="text-2xl font-bold mb-4">Customers</h2><CustomerForm /></div>;
      case 'packing': return <div className="p-8"><h2 className="text-2xl font-bold mb-4">Packing Types</h2><PackingTypeForm /></div>;
      case 'locations': return <div className="p-8"><h2 className="text-2xl font-bold mb-4">Locations</h2><LocationForm /></div>;
      case 'perfumes': return <div className="p-8"><h2 className="text-2xl font-bold mb-4">Perfume Management</h2><PerfumeMasterForm /></div>;
      case 'gate-in': return <div className="p-8"><h2 className="text-2xl font-bold mb-4">Gate In</h2><GateInForm /></div>;
      case 'gate-out': return <div className="p-8"><h2 className="text-2xl font-bold mb-4">Gate Out</h2><GateOutForm /></div>;
      case 'transfer': return <div className="p-8"><h2 className="text-2xl font-bold mb-4">Stock Transfer</h2><StockTransferForm /></div>;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-gray-900">
      <Sidebar currentView={currentView} setView={setCurrentView} />
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm h-16 flex items-center px-8 justify-between sticky top-0 z-10">
           <span className="text-lg font-medium text-gray-600 capitalize">{currentView.replace('-', ' ')}</span>
           <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                 <span className="text-xs text-gray-500">Switch User:</span>
                 <select className="text-sm border border-gray-300 rounded px-2 py-1" value={currentUser?.id} onChange={(e) => {
                        const user = users.find(u => u.id === e.target.value);
                        if(user) setCurrentUser(user);
                        setCurrentView('dashboard');
                    }}>
                     {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                 </select>
             </div>
             <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm">
                 {currentUser?.name.charAt(0)}
             </div>
           </div>
        </header>
        {renderView()}
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
