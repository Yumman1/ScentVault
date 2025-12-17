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
    // 1. Calculate Stock Levels per Perfume
    const stockMap: Record<string, number> = {};
    const perfumeSupplierMap: Record<string, string> = {};
    const supplierLastStockedMap: Record<string, number> = {}; // timestamp

    // Map Perfume -> Supplier for quick lookup
    perfumes.forEach(p => {
        perfumeSupplierMap[p.id] = p.supplierId;
    });
    
    // Helper to get weight
    const getWeight = (log: any) => {
      if (typeof log.netWeight === 'number' && log.netWeight > 0) return log.netWeight;
      // Fallback if netWeight missing but packing exists
      const pt = packingTypes.find(p => p.id === log.packingTypeId);
      if (pt) return (log.packingQty || 0) * pt.qtyPerPacking;
      return 0;
    };

    // Filter logs based on user location permissions?
    // Dashboard aggregate usually shows global, but strictly for Viewers with restrictions, we might want to filter.
    // For simplicity in Dashboard overview, we'll keep global counts but hide values if restricted.
    // If strict location filtering is required for dashboard totals:
    const allowedLocs = currentUser?.permissions?.allowedLocationIds || [];
    const isLocRestricted = allowedLocs.length > 0;

    const filterLogLoc = (l: any) => {
       if (!isLocRestricted) return true;
       // Check if transaction touches an allowed location
       // For Gate In/Out: mainLocationId
       // For Transfer: fromMainLocationId OR toMainLocationId
       if (l.mainLocationId) return allowedLocs.includes(l.mainLocationId);
       if (l.fromMainLocationId) return allowedLocs.includes(l.fromMainLocationId) || allowedLocs.includes(l.toMainLocationId);
       return true;
    };

    gateInLogs.filter(filterLogLoc).forEach(l => {
      stockMap[l.perfumeId] = (stockMap[l.perfumeId] || 0) + getWeight(l);

      // Track Last Stocked Date per Supplier
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

    // 2. Aggregate Totals
    let totalValueUSD = 0;
    let totalValuePKR = 0;
    let totalWeight = 0;
    let lowStockCount = 0;
    const supplierStatsMap: Record<string, { count: number; valueUSD: number; valuePKR: number; weight: number }> = {};

    perfumes.forEach(p => {
      const currentWeight = stockMap[p.id] || 0;
      
      // Only count positive stock for value (floating point safety)
      if (currentWeight > 0.001) {
        const valUSD = currentWeight * (p.priceUSD || 0);
        const valPKR = currentWeight * (p.pricePKR || 0);
        
        totalWeight += currentWeight;
        totalValueUSD += valUSD;
        totalValuePKR += valPKR;

        // Supplier Aggregation
        if (!supplierStatsMap[p.supplierId]) {
          supplierStatsMap[p.supplierId] = { count: 0, valueUSD: 0, valuePKR: 0, weight: 0 };
        }
        supplierStatsMap[p.supplierId].count += 1; // Count unique perfumes in stock
        supplierStatsMap[p.supplierId].valueUSD += valUSD;
        supplierStatsMap[p.supplierId].valuePKR += valPKR;
        supplierStatsMap[p.supplierId].weight += currentWeight;
      }

      // Low Stock Check (even if 0)
      if (currentWeight <= (p.lowStockAlert || 0)) {
        lowStockCount++;
      }
    });

    // 3. Format Supplier Table Data
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
    }).sort((a, b) => b.valueUSD - a.valueUSD); // Sort by highest value

    // 4. Recent Activity Log
    const combinedLogs = [
      ...gateInLogs.filter(filterLogLoc).map(l => ({ ...l, type: 'Gate In', ts: new Date(l.date).getTime() })),
      ...gateOutLogs.filter(filterLogLoc).map(l => ({ ...l, type: 'Gate Out', ts: new Date(l.date).getTime() })),
      ...transferLogs.filter(filterLogLoc).map(l => ({ ...l, type: 'Transfer', ts: new Date(l.date).getTime() }))
    ].sort((a, b) => b.ts - a.ts).slice(0, 5); // Last 5

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

  // --- Render Helpers ---
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Perfumes */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Perfumes</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{dashboardData.totalPerfumes}</h3>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FlaskConical size={20} />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Registered Master Items</p>
        </div>

        {/* Low Stock */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Low Stock</p>
              <h3 className={`text-2xl font-bold mt-1 ${dashboardData.lowStockCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                {dashboardData.lowStockCount}
              </h3>
            </div>
            <div className={`p-2 rounded-lg ${dashboardData.lowStockCount > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'}`}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Items below alert level</p>
        </div>

        {/* Value USD */}
        {canViewPrices ? (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Value (USD)</p>
                <h3 className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(dashboardData.totalValueUSD, 'USD')}</h3>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <DollarSign size={20} />
                </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">Current Stock Valuation</p>
            </div>
        ) : (
            <div className="bg-gray-50 p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center items-center opacity-70">
                <Lock size={24} className="text-gray-400 mb-2"/>
                <span className="text-xs text-gray-500">Valuation Hidden</span>
            </div>
        )}

        {/* Value PKR */}
        {canViewPrices ? (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Value (PKR)</p>
                <h3 className="text-2xl font-bold text-teal-700 mt-1">{formatCurrency(dashboardData.totalValuePKR, 'PKR')}</h3>
                </div>
                <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                <Coins size={20} />
                </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">Current Stock Valuation</p>
            </div>
         ) : (
            <div className="bg-gray-50 p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center items-center opacity-70">
                <Lock size={24} className="text-gray-400 mb-2"/>
                <span className="text-xs text-gray-500">Valuation Hidden</span>
            </div>
        )}

        {/* Total Weight */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Stock</p>
              <h3 className="text-2xl font-bold text-blue-700 mt-1">{dashboardData.totalWeight.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-sm font-normal text-gray-500">kg</span></h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Package size={20} />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Net Weight Available</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COL: Supplier Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-500"/>
              Supplier Inventory Holdings
            </h3>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{dashboardData.supplierTable.length} Active Suppliers</span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                <tr>
                  <th className="px-6 py-3">Supplier</th>
                  <th className="px-6 py-3 text-center">Items Stocked</th>
                  <th className="px-6 py-3">Last Stocked</th>
                  <th className="px-6 py-3 text-right">Weight (KG)</th>
                  {canViewPrices && <th className="px-6 py-3 text-right">Value (USD)</th>}
                  {canViewPrices && <th className="px-6 py-3 text-right">Value (PKR)</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dashboardData.supplierTable.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-medium text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-400">{s.contact}</div>
                    </td>
                    <td className="px-6 py-3 text-center">
                       {s.itemsInStock > 0 ? (
                           <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">{s.itemsInStock}</span>
                       ) : (
                           <span className="text-gray-300">-</span>
                       )}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                        {s.lastStocked || '-'}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs">{s.stockWeight > 0 ? s.stockWeight.toFixed(1) : '-'}</td>
                    {canViewPrices && <td className="px-6 py-3 text-right font-medium text-gray-900">{s.valueUSD > 0 ? formatCurrency(s.valueUSD, 'USD') : '-'}</td>}
                    {canViewPrices && <td className="px-6 py-3 text-right text-xs text-gray-500">{s.valuePKR > 0 ? formatCurrency(s.valuePKR, 'PKR') : '-'}</td>}
                  </tr>
                ))}
                {dashboardData.supplierTable.length === 0 && (
                   <tr><td colSpan={canViewPrices ? 6 : 4} className="p-6 text-center text-gray-400">No supplier data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COL: Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Recent Activity</h3>
          </div>
          <div className="p-0">
            {dashboardData.recentActivity.map((log, idx) => (
              <div key={log.id} className={`p-4 flex items-start gap-3 ${idx !== dashboardData.recentActivity.length -1 ? 'border-b border-gray-100' : ''}`}>
                <div className={`mt-1 p-1.5 rounded-full flex-shrink-0 
                  ${log.type === 'Gate In' ? 'bg-green-100 text-green-600' : 
                    log.type === 'Gate Out' ? 'bg-red-100 text-red-600' : 
                    'bg-blue-100 text-blue-600'}`}>
                  {log.type === 'Gate In' && <ArrowDownToLine size={14} />}
                  {log.type === 'Gate Out' && <ArrowUpFromLine size={14} />}
                  {log.type === 'Transfer' && <ArrowRightLeft size={14} />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{log.perfumeName}</p>
                  <div className="flex gap-2 items-center mt-0.5">
                    <span className="text-xs text-gray-500">{log.date}</span>
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{log.type}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {log.type === 'Gate In' ? 'Received' : log.type === 'Gate Out' ? 'Issued' : 'Moved'} 
                    <span className="font-mono ml-1 font-medium text-gray-700">{log.weight.toFixed(2)} kg</span>
                  </p>
                </div>
              </div>
            ))}
             {dashboardData.recentActivity.length === 0 && (
                 <div className="p-8 text-center text-gray-400 text-sm">No recent transactions</div>
             )}
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-xl text-center">
             <span className="text-xs text-indigo-600 font-medium cursor-pointer hover:underline">View Full Transaction History</span>
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
      
      // Admin Forms
      case 'users': return <div className="p-8"><h2 className="text-2xl font-bold mb-4">User Management</h2><UserForm /></div>;
      case 'suppliers': return <div className="p-8"><h2 className="text-2xl font-bold mb-4">Suppliers</h2><SupplierForm /></div>;
      case 'customers': return <div className="p-8"><h2 className="text-2xl font-bold mb-4">Customers</h2><CustomerForm /></div>;
      case 'packing': return <div className="p-8"><h2 className="text-2xl font-bold mb-4">Packing Types</h2><PackingTypeForm /></div>;
      case 'locations': return <div className="p-8"><h2 className="text-2xl font-bold mb-4">Locations</h2><LocationForm /></div>;
      
      // Transactions
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
             {/* User Switcher for Demo Purposes */}
             <div className="flex items-center gap-2">
                 <span className="text-xs text-gray-500">Switch User:</span>
                 <select 
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                    value={currentUser?.id}
                    onChange={(e) => {
                        const user = users.find(u => u.id === e.target.value);
                        if(user) setCurrentUser(user);
                        // Reset view to dashboard on user switch to avoid permission error on current view
                        setCurrentView('dashboard');
                    }}
                 >
                     {users.map(u => (
                         <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                     ))}
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
