import React, { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Button } from '../ui/Button';
import { 
  FileDown, FileSpreadsheet, Search, Filter, X, 
  DollarSign, Coins, ChevronDown, ChevronUp, Scale,
  MapPin, Package, ArrowRightLeft, Lock, ArrowLeft,
  Info, History, Clock, TrendingDown, TrendingUp
} from 'lucide-react';

type ReportType = 'inventory' | 'transactions' | 'low-stock';

export const ReportsView = () => {
  const { 
    perfumes, suppliers, locations, packingTypes,
    gateInLogs, gateOutLogs, transferLogs,
    getMainLocations, getSubLocations,
    currentUser, hasPermission, getPerfumeStockBreakdown,
    getPerfumeMovementHistory
  } = useInventory();

  const [activeTab, setActiveTab] = useState<ReportType>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  
  // Drill-down State
  const [drillDownPerfumeId, setDrillDownPerfumeId] = useState<string | null>(null);
  const [drillDownTab, setDrillDownTab] = useState<'stock' | 'history'>('stock');

  // Filter States
  const [filterLocation, setFilterLocation] = useState('');
  const [filterSubLocation, setFilterSubLocation] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterOlfactive, setFilterOlfactive] = useState('');
  const [filterType, setFilterType] = useState('');
  
  // Price Filter States
  const [filterPriceUSDMin, setFilterPriceUSDMin] = useState('');
  const [filterPriceUSDMax, setFilterPriceUSDMax] = useState('');

  // Permissions Checks
  const canViewPrices = hasPermission('view_prices');
  const allowedLocationIds = currentUser?.permissions?.allowedLocationIds || [];
  const isLocationRestricted = allowedLocationIds.length > 0;

  const mainLocations = getMainLocations().filter(l => 
    !isLocationRestricted || allowedLocationIds.includes(l.id)
  );

  const clearFilters = () => {
    setFilterLocation('');
    setFilterSubLocation('');
    setFilterSupplier('');
    setFilterOlfactive('');
    setFilterType('');
    setFilterPriceUSDMin('');
    setFilterPriceUSDMax('');
  };

  const hasActiveFilters = !!(
    filterLocation || filterSubLocation || filterSupplier || filterOlfactive || filterType ||
    filterPriceUSDMin || filterPriceUSDMax
  );

  const checkPriceFilter = (priceUSD: number | undefined) => {
      if (!canViewPrices) return true;
      const usd = priceUSD || 0;
      if (filterPriceUSDMin && usd < Number(filterPriceUSDMin)) return false;
      if (filterPriceUSDMax && usd > Number(filterPriceUSDMax)) return false;
      return true;
  };

  const checkLocationPermission = (mainLocId?: string) => {
      if (!isLocationRestricted) return true;
      if (mainLocId && allowedLocationIds.includes(mainLocId)) return true;
      return false;
  };

  // Summary logic
  const inventoryData = useMemo(() => {
    return perfumes.map(p => {
      const breakdown = getPerfumeStockBreakdown(p.id);
      
      const filteredBreakdown = breakdown.filter(pos => {
        if (!checkLocationPermission(pos.mainLocationId)) return false;
        if (filterLocation && pos.mainLocationId !== filterLocation) return false;
        if (filterSubLocation && pos.subLocationId !== filterSubLocation) return false;
        return true;
      });

      const totalWeight = filteredBreakdown.reduce((acc, b) => acc + b.weight, 0);
      const supplier = suppliers.find(s => s.id === p.supplierId);
      
      const batchEntries = filteredBreakdown
        .filter(b => b.weight > 0.001)
        .sort((a, b) => b.weight - a.weight);

      const primaryBatch = batchEntries[0]?.batch || '-';
      const activeBatches = batchEntries.map(b => b.batch).sort().join(', ');

      if (filterSupplier && p.supplierId !== filterSupplier) return null;
      if (filterOlfactive && (!p.olfactiveNotes || !p.olfactiveNotes.includes(filterOlfactive))) return null;
      if (!checkPriceFilter(p.priceUSD)) return null;

      const isLowStock = totalWeight <= p.lowStockAlert;
      const isCritical = totalWeight <= (p.lowStockAlert * 0.5);

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        supplierName: supplier?.name || 'Unknown',
        currentWeight: totalWeight,
        primaryBatch,
        activeBatches: activeBatches || '-',
        unitPriceUSD: p.priceUSD,
        unitPricePKR: p.pricePKR || 0,
        totalValueUSD: totalWeight * p.priceUSD,
        totalValuePKR: totalWeight * (p.pricePKR || 0),
        lowStockAlert: p.lowStockAlert,
        isLowStock,
        isCritical,
        fullBreakdown: filteredBreakdown
      };
    }).filter(item => {
        if (!item) return false;
        return item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
               item.code.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [
      perfumes, suppliers, getPerfumeStockBreakdown, filterLocation, filterSubLocation, 
      filterSupplier, filterOlfactive, searchTerm, filterPriceUSDMin, filterPriceUSDMax,
      allowedLocationIds, isLocationRestricted, canViewPrices
  ]);

  const summaryMetrics = useMemo(() => {
    return inventoryData.reduce((acc, item) => ({
        usd: acc.usd + item.totalValueUSD,
        pkr: acc.pkr + item.totalValuePKR,
        weight: acc.weight + item.currentWeight
    }), { usd: 0, pkr: 0, weight: 0 });
  }, [inventoryData]);

  const exportPDF = () => {
    const doc = new jsPDF();
    const title = activeTab === 'inventory' ? 'Inventory Summary' : activeTab === 'low-stock' ? 'Low Stock Alert' : 'Transaction History';
    doc.setFontSize(18);
    doc.text(`ScentVault - ${title}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    let head = [['Code', 'Name', 'Supplier', 'Primary Batch', 'Weight', 'Status']];
    let body = inventoryData.map(r => [
        r.code, r.name, r.supplierName, r.primaryBatch, 
        r.currentWeight.toFixed(2), 
        r.isCritical ? 'CRITICAL' : r.isLowStock ? 'LOW' : 'OK'
    ]);

    autoTable(doc, {
        startY: 40,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 }
    });
    doc.save(`${title.toLowerCase().replace(' ', '_')}.pdf`);
  };

  const renderDrillDown = () => {
      const p = inventoryData.find(i => i.id === drillDownPerfumeId);
      if (!p) return null;

      const movementHistory = getPerfumeMovementHistory(p.id);

      return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-6 bg-slate-900 text-white rounded-t-3xl flex justify-between items-center border-b border-slate-800">
                  <div className="flex items-center gap-5">
                      <button 
                        onClick={() => setDrillDownPerfumeId(null)} 
                        className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all shadow-lg"
                      >
                          <ArrowLeft size={20} />
                      </button>
                      <div>
                          <div className="flex items-center gap-3">
                              <h3 className="text-2xl font-black">{p.name}</h3>
                              <span className="bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border border-indigo-500/30">{p.code}</span>
                          </div>
                          <p className="text-xs text-slate-400 flex items-center gap-2 mt-1 font-medium">
                              <MapPin size={12} className="text-indigo-500" /> Managed Hub: {p.supplierName}
                          </p>
                      </div>
                  </div>
                  <div className="flex gap-4 items-center">
                      <div className="text-right">
                          <p className="text-3xl font-black text-white">{p.currentWeight.toFixed(2)} <span className="text-lg font-normal text-slate-500">kg</span></p>
                          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Total Available</p>
                      </div>
                      <div className={`h-12 w-1 border-r border-slate-700 ml-4`}></div>
                      <div className="flex flex-col gap-1 ml-4">
                          {p.isLowStock && (
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${p.isCritical ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'}`}>
                                  {p.isCritical ? 'Critical Level' : 'Low Stock'}
                              </span>
                          )}
                          {!p.isLowStock && (
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                                  Healthy Stock
                              </span>
                          )}
                      </div>
                  </div>
              </div>

              <div className="bg-white border-x border-b border-slate-200 rounded-b-3xl shadow-xl overflow-hidden min-h-[500px]">
                  <div className="flex border-b border-slate-100 bg-slate-50/50 p-1">
                      <button 
                        onClick={() => setDrillDownTab('stock')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all rounded-2xl ${drillDownTab === 'stock' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                          <Package size={16} /> Batch Distribution
                      </button>
                      <button 
                        onClick={() => setDrillDownTab('history')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all rounded-2xl ${drillDownTab === 'history' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                          <History size={16} /> Movement History
                      </button>
                  </div>

                  <div className="p-8">
                      {drillDownTab === 'stock' ? (
                          <div className="overflow-hidden border border-slate-100 rounded-2xl">
                              <table className="w-full text-sm text-left">
                                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                      <tr>
                                          <th className="px-8 py-5">Batch Ident</th>
                                          <th className="px-8 py-5">Storage Facility</th>
                                          <th className="px-8 py-5 text-right">Qty (KG)</th>
                                          {canViewPrices && <th className="px-8 py-5 text-right">Value Asset</th>}
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                      {p.fullBreakdown.sort((a, b) => b.weight - a.weight).map((pos, idx) => {
                                          const mLoc = locations.find(l => l.id === pos.mainLocationId);
                                          const sLoc = locations.find(l => l.id === pos.subLocationId);
                                          return (
                                              <tr key={idx} className="hover:bg-slate-50/50">
                                                  <td className="px-8 py-5">
                                                      <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">{pos.batch}</span>
                                                  </td>
                                                  <td className="px-8 py-5">
                                                      <div className="flex items-center gap-2">
                                                          <MapPin size={14} className="text-slate-300" />
                                                          <span>{mLoc?.name || 'Unknown'}</span>
                                                          {sLoc && <span className="text-slate-400 text-xs font-normal">/ {sLoc.name}</span>}
                                                      </div>
                                                  </td>
                                                  <td className="px-8 py-5 text-right font-black text-slate-900">{pos.weight.toFixed(2)}</td>
                                                  {canViewPrices && (
                                                      <td className="px-8 py-5 text-right text-slate-500 font-mono">
                                                          ${(pos.weight * (p.unitPriceUSD || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                      </td>
                                                  )}
                                              </tr>
                                          )
                                      })}
                                  </tbody>
                              </table>
                          </div>
                      ) : (
                          <div className="space-y-4">
                              {movementHistory.map((log, idx) => (
                                  <div key={idx} className="flex items-center gap-6 p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all">
                                      <div className={`p-4 rounded-xl flex-shrink-0 ${log.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : log.type === 'OUT' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                          {log.type === 'IN' ? <TrendingUp size={20} /> : log.type === 'OUT' ? <TrendingDown size={20} /> : <ArrowRightLeft size={20} />}
                                      </div>
                                      <div className="flex-1">
                                          <div className="flex items-center justify-between mb-1">
                                              <p className="text-sm font-bold text-slate-800">{log.type === 'IN' ? 'Inbound Logistic' : log.type === 'OUT' ? 'Outbound Dispatch' : 'Internal Transfer'}</p>
                                              <span className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1">
                                                  <Clock size={10} /> {log.date}
                                              </span>
                                          </div>
                                          <div className="flex gap-4 text-xs text-slate-500">
                                              <p><span className="font-bold text-slate-400">Batch:</span> {log.importReference || log.batchNumber}</p>
                                              <p><span className="font-bold text-slate-400">Ref:</span> {log.supplierInvoice || log.usage || 'Internal'}</p>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <p className={`text-lg font-black ${log.type === 'IN' ? 'text-emerald-600' : log.type === 'OUT' ? 'text-rose-600' : 'text-indigo-600'}`}>
                                              {log.type === 'IN' ? '+' : log.type === 'OUT' ? '-' : ''}{log.netWeight.toFixed(2)} kg
                                          </p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Supply Intelligence</h2>
            <p className="text-slate-500 font-medium mt-1">Audit-ready inventory monitoring and dispatch tracking.</p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" onClick={exportPDF} className="flex items-center gap-2 bg-white h-12 px-6 rounded-2xl shadow-sm border-slate-200 hover:border-indigo-500 transition-all font-bold text-slate-700">
                <FileDown size={18} /> Export PDF
            </Button>
            <Button onClick={() => {}} className="flex items-center gap-2 h-12 px-6 rounded-2xl shadow-lg shadow-indigo-500/20 font-bold">
                <FileSpreadsheet size={18} /> Excel Report
            </Button>
        </div>
      </div>

      {drillDownPerfumeId ? (
          renderDrillDown()
      ) : (
          <div className="bg-white rounded-[2.5rem] shadow-soft border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-100 p-2 bg-slate-50/50">
                {(['inventory', 'transactions', 'low-stock'] as ReportType[]).map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-4 text-sm font-black transition-all rounded-3xl ${activeTab === tab ? 'bg-white shadow-md text-indigo-700 ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        {tab === 'inventory' ? 'Master Summary' : tab === 'transactions' ? 'Logistics History' : 'Alert Registry'}
                    </button>
                ))}
            </div>

            <div className="p-8">
                <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-8">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Filter by SKU, name, or batch signature..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 transition-all font-medium"
                        />
                    </div>
                    <button
                        onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                        className={`flex items-center gap-3 px-8 h-14 rounded-3xl border font-bold transition-all ${isFilterPanelOpen || hasActiveFilters ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}
                    >
                        <Filter size={18} />
                        Refine
                        {isFilterPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {isFilterPanelOpen && (
                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Network Hub</label>
                            <select 
                                className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10"
                                value={filterLocation}
                                onChange={(e) => setFilterLocation(e.target.value)}
                            >
                                <option value="">Entire Network</option>
                                {mainLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Partner Supplier</label>
                            <select 
                                className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10"
                                value={filterSupplier}
                                onChange={(e) => setFilterSupplier(e.target.value)}
                            >
                                <option value="">All Partners</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button onClick={clearFilters} className="w-full h-12 rounded-2xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all">
                                Wipe Filters
                            </button>
                        </div>
                    </div>
                )}

                <div className="overflow-hidden border border-slate-100 rounded-3xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-6">Perfume Asset</th>
                                <th className="px-8 py-6">Batch Tracking</th>
                                <th className="px-8 py-6 text-right">Net On-Hand</th>
                                <th className="px-8 py-6 text-center">Status</th>
                                <th className="px-8 py-6 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                            {inventoryData.map((item) => (
                                <tr 
                                  key={item.id} 
                                  className="hover:bg-indigo-50/30 transition-all cursor-pointer group"
                                  onClick={() => setDrillDownPerfumeId(item.id)}
                                >
                                    <td className="px-8 py-6">
                                        <div className="font-black text-slate-900">{item.name}</div>
                                        <div className="text-[10px] font-mono text-indigo-500 font-bold mt-1 uppercase">{item.code}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-wrap gap-2 max-w-[200px]">
                                            {item.activeBatches.split(', ').slice(0, 2).map((b, idx) => (
                                                <span key={idx} className="bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded text-[10px] font-mono font-bold shadow-sm">{b}</span>
                                            ))}
                                            {item.activeBatches.split(', ').length > 2 && <span className="text-[10px] font-bold text-slate-400">+{item.activeBatches.split(', ').length - 2}</span>}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <span className={`font-black text-lg ${item.isLowStock ? 'text-rose-600' : 'text-slate-900'}`}>{item.currentWeight.toFixed(2)}</span>
                                        <span className="text-slate-400 ml-1 text-xs">kg</span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                                            item.isCritical ? 'bg-rose-100 text-rose-700' :
                                            item.isLowStock ? 'bg-amber-100 text-amber-700' :
                                            'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {item.isCritical ? 'Critical' : item.isLowStock ? 'Low' : 'Secure'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-300 group-hover:text-indigo-600 group-hover:border-indigo-500 transition-all shadow-sm">
                                            <Info size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {inventoryData.length === 0 && (
                                <tr><td colSpan={5} className="px-8 py-32 text-center text-slate-300 italic font-medium">No inventory records match your criteria.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};