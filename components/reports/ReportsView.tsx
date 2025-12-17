import React, { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Button } from '../ui/Button';
import { 
  FileDown, FileSpreadsheet, Search, Filter, X, 
  DollarSign, Coins, ChevronDown, ChevronUp, Scale,
  MapPin, Package, ArrowRightLeft, Lock
} from 'lucide-react';

type ReportType = 'inventory' | 'transactions' | 'low-stock';

export const ReportsView = () => {
  const { 
    perfumes, suppliers, locations, packingTypes,
    gateInLogs, gateOutLogs, transferLogs,
    getMainLocations, getSubLocations,
    currentUser, hasPermission
  } = useInventory();

  const [activeTab, setActiveTab] = useState<ReportType>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  
  // Filter States
  const [filterLocation, setFilterLocation] = useState('');
  const [filterSubLocation, setFilterSubLocation] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterOlfactive, setFilterOlfactive] = useState('');
  const [filterType, setFilterType] = useState('');
  
  // Price Filter States
  const [filterPriceUSDMin, setFilterPriceUSDMin] = useState('');
  const [filterPriceUSDMax, setFilterPriceUSDMax] = useState('');
  const [filterPricePKRMin, setFilterPricePKRMin] = useState('');
  const [filterPricePKRMax, setFilterPricePKRMax] = useState('');

  // Permissions Checks
  const canViewPrices = hasPermission('view_prices');
  const allowedLocationIds = currentUser?.permissions?.allowedLocationIds || [];
  const isLocationRestricted = allowedLocationIds.length > 0;

  // Derived Filter Options
  const mainLocations = getMainLocations().filter(l => 
    !isLocationRestricted || allowedLocationIds.includes(l.id)
  );

  const subLocations = useMemo(() => {
    if (!filterLocation) return [];
    return getSubLocations(filterLocation); // Sublocations technically belong to main, permissions usually on main
  }, [filterLocation, locations]);
  
  const olfactiveOptions = useMemo(() => {
    const notes = new Set<string>();
    perfumes.forEach(p => {
        if (Array.isArray(p.olfactiveNotes)) {
            p.olfactiveNotes.forEach(n => n && notes.add(n));
        }
    });
    return Array.from(notes).sort();
  }, [perfumes]);

  const clearFilters = () => {
    setFilterLocation('');
    setFilterSubLocation('');
    setFilterSupplier('');
    setFilterOlfactive('');
    setFilterType('');
    setFilterPriceUSDMin('');
    setFilterPriceUSDMax('');
    setFilterPricePKRMin('');
    setFilterPricePKRMax('');
  };

  const hasActiveFilters = !!(
    filterLocation || filterSubLocation || filterSupplier || filterOlfactive || filterType ||
    filterPriceUSDMin || filterPriceUSDMax || filterPricePKRMin || filterPricePKRMax
  );

  // --- Calculations ---
  
  const getLogWeight = (log: any) => {
    if (typeof log.netWeight === 'number' && log.netWeight > 0) {
        return log.netWeight;
    }
    
    if (log.packingTypeId) {
        const pt = packingTypes.find(p => p.id === log.packingTypeId);
        if (pt && pt.qtyPerPacking) {
            return log.packingQty * pt.qtyPerPacking;
        }
    }
    
    return 0;
  };

  // Check if price matches filters
  const checkPriceFilter = (priceUSD: number | undefined, pricePKR: number | undefined) => {
      // If user can't see prices, ignore these filters (or force them to not filter)
      if (!canViewPrices) return true;

      const usd = priceUSD || 0;
      const pkr = pricePKR || 0;
      
      if (filterPriceUSDMin && usd < Number(filterPriceUSDMin)) return false;
      if (filterPriceUSDMax && usd > Number(filterPriceUSDMax)) return false;
      if (filterPricePKRMin && pkr < Number(filterPricePKRMin)) return false;
      if (filterPricePKRMax && pkr > Number(filterPricePKRMax)) return false;
      
      return true;
  };

  // Check if a log/record matches allowed locations
  const checkLocationPermission = (mainLocId?: string, fromLocId?: string, toLocId?: string) => {
      if (!isLocationRestricted) return true;
      
      if (mainLocId && allowedLocationIds.includes(mainLocId)) return true;
      if (fromLocId && allowedLocationIds.includes(fromLocId)) return true;
      if (toLocId && allowedLocationIds.includes(toLocId)) return true;
      
      return false;
  };

  // Calculate current stock per perfume
  const inventoryData = useMemo(() => {
    const stockMap: Record<string, { weight: number, batches: Record<string, number> }> = {};

    // Initialize map
    perfumes.forEach(p => {
      stockMap[p.id] = { weight: 0, batches: {} };
    });

    const updateBatch = (perfumeId: string, batch: string, weight: number) => {
        if (!stockMap[perfumeId]) return;
        const current = stockMap[perfumeId].batches[batch] || 0;
        stockMap[perfumeId].batches[batch] = current + weight;
    };

    // Add Gate In
    gateInLogs.forEach(log => {
      if (!checkLocationPermission(log.mainLocationId)) return;
      if (filterLocation && log.mainLocationId !== filterLocation) return;
      if (filterSubLocation && log.subLocationId !== filterSubLocation) return;
      
      if (stockMap[log.perfumeId]) {
        const w = getLogWeight(log);
        stockMap[log.perfumeId].weight += w;
        if (log.importReference) updateBatch(log.perfumeId, log.importReference, w);
      }
    });

    // Subtract Gate Out
    gateOutLogs.forEach(log => {
      if (!checkLocationPermission(log.mainLocationId)) return;
      if (filterLocation && log.mainLocationId !== filterLocation) return;
      if (filterSubLocation && log.subLocationId !== filterSubLocation) return;

      if (stockMap[log.perfumeId]) {
        const w = getLogWeight(log);
        stockMap[log.perfumeId].weight -= w;
        if (log.batchNumber) updateBatch(log.perfumeId, log.batchNumber, -w);
      }
    });

    // Transfers
    // Note: For inventory summary, transfers are net zero globally, but if filtering by location:
    // If filtering by location A: Inbound from B adds stock, Outbound to B removes stock.
    // If viewing 'All' but restricted to locations A & B: internal transfers between A & B don't change 'viewable' total, but transfers to C do.
    
    // For simplicity in this view: stock is calculated based on what sits in the filtered location(s).
    transferLogs.forEach(log => {
        const isFromAllowed = checkLocationPermission(log.fromMainLocationId);
        const isToAllowed = checkLocationPermission(log.toMainLocationId);
        
        // Filter logic:
        // If filterLocation is set, we only care about movements in/out of THAT location.
        // If filterLocation is NOT set, we sum up stock across ALL ALLOWED locations.
        
        const w = getLogWeight(log);

        // Deduct from Source
        if (isFromAllowed && (!filterLocation || log.fromMainLocationId === filterLocation) && (!filterSubLocation || log.fromSubLocationId === filterSubLocation)) {
             if (stockMap[log.perfumeId]) {
                stockMap[log.perfumeId].weight -= w;
                if (log.batchNumber) updateBatch(log.perfumeId, log.batchNumber, -w);
            }
        }

        // Add to Dest
        if (isToAllowed && (!filterLocation || log.toMainLocationId === filterLocation) && (!filterSubLocation || log.toSubLocationId === filterSubLocation)) {
             if (stockMap[log.perfumeId]) {
                stockMap[log.perfumeId].weight += w;
                if (log.batchNumber) updateBatch(log.perfumeId, log.batchNumber, w);
            }
        }
    });

    return perfumes.map(p => {
      const stock = stockMap[p.id] || { weight: 0, batches: {} };
      const supplier = suppliers.find(s => s.id === p.supplierId);
      
      const batchEntries = Object.entries(stock.batches).filter(([_, w]) => w > 0.001);

      const primaryBatchEntry = batchEntries.sort((a, b) => b[1] - a[1])[0];
      const primaryBatch = primaryBatchEntry ? primaryBatchEntry[0] : '-';

      const activeBatches = batchEntries
        .map(([b]) => b)
        .sort()
        .join(', ');

      if (filterSupplier && p.supplierId !== filterSupplier) return null;
      if (filterOlfactive && (!p.olfactiveNotes || !p.olfactiveNotes.includes(filterOlfactive))) return null;

      // Price Filter Check
      if (!checkPriceFilter(p.priceUSD, p.pricePKR)) return null;

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        supplierName: supplier?.name || 'Unknown',
        currentWeight: stock.weight,
        primaryBatch: primaryBatch,
        activeBatches: activeBatches || '-',
        unitPriceUSD: p.priceUSD,
        unitPricePKR: p.pricePKR || 0,
        totalValueUSD: stock.weight * p.priceUSD,
        totalValuePKR: stock.weight * (p.pricePKR || 0),
        lowStockAlert: p.lowStockAlert,
        isLowStock: stock.weight <= p.lowStockAlert
      };
    }).filter(item => {
        if (!item) return false;
        return item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
               item.code.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [
      perfumes, gateInLogs, gateOutLogs, transferLogs, suppliers, packingTypes, searchTerm, 
      filterLocation, filterSubLocation, filterSupplier, filterOlfactive,
      filterPriceUSDMin, filterPriceUSDMax, filterPricePKRMin, filterPricePKRMax,
      allowedLocationIds, isLocationRestricted, canViewPrices
  ]);

  const summaryMetrics = useMemo(() => {
    return inventoryData.reduce((acc, item) => ({
        usd: acc.usd + item.totalValueUSD,
        pkr: acc.pkr + item.totalValuePKR,
        weight: acc.weight + item.currentWeight
    }), { usd: 0, pkr: 0, weight: 0 });
  }, [inventoryData]);

  const transactionData = useMemo(() => {
    const logs: any[] = [];

    const checkPerfume = (perfumeId: string) => {
        const p = perfumes.find(x => x.id === perfumeId);
        if (!p) return false;
        if (filterSupplier && p.supplierId !== filterSupplier) return false;
        if (filterOlfactive && (!p.olfactiveNotes || !p.olfactiveNotes.includes(filterOlfactive))) return false;
        return p;
    };

    if (!filterType || filterType === 'Gate In') {
      gateInLogs.forEach(l => {
          if (!checkLocationPermission(l.mainLocationId)) return;
          if (filterLocation && l.mainLocationId !== filterLocation) return;
          if (filterSubLocation && l.subLocationId !== filterSubLocation) return;
          
          const p = checkPerfume(l.perfumeId);
          if (!p) return;

          // Gate In uses price from log if available
          const logPriceUSD = l.priceUSD !== undefined ? l.priceUSD : p.priceUSD;
          const logPricePKR = l.pricePKR !== undefined ? l.pricePKR : p.pricePKR;

          if (!checkPriceFilter(logPriceUSD, logPricePKR)) return;

          const loc = locations.find(x => x.id === l.mainLocationId);
          const subLoc = l.subLocationId ? locations.find(x => x.id === l.subLocationId) : null;
          
          logs.push({
              date: l.date,
              type: 'Gate In',
              perfumeName: p.name,
              batch: l.importReference,
              weight: getLogWeight(l),
              details: `Inv: ${l.supplierInvoice} -> ${loc?.name}${subLoc ? ` (${subLoc.name})` : ''}`,
              priceUSD: logPriceUSD,
              pricePKR: logPricePKR,
              raw: l
          });
      });
    }

    if (!filterType || filterType === 'Gate Out') {
      gateOutLogs.forEach(l => {
          if (!checkLocationPermission(l.mainLocationId)) return;
          if (filterLocation && l.mainLocationId !== filterLocation) return;
          if (filterSubLocation && l.subLocationId !== filterSubLocation) return;

          const p = checkPerfume(l.perfumeId);
          if (!p) return;

          // Gate Out uses master price
          if (!checkPriceFilter(p.priceUSD, p.pricePKR)) return;

          const loc = locations.find(x => x.id === l.mainLocationId);
          const subLoc = l.subLocationId ? locations.find(x => x.id === l.subLocationId) : null;

          logs.push({
              date: l.date,
              type: 'Gate Out',
              perfumeName: p.name,
              batch: l.batchNumber,
              weight: -getLogWeight(l),
              details: `${loc?.name}${subLoc ? ` (${subLoc.name})` : ''} -> ${l.usage}`,
              priceUSD: p.priceUSD, 
              pricePKR: p.pricePKR,
              raw: l
          });
      });
    }

    if (!filterType || filterType === 'Transfer') {
      transferLogs.forEach(l => {
          // Permission Check: User needs to see EITHER from OR to location to see the log
          const fromAllowed = checkLocationPermission(l.fromMainLocationId);
          const toAllowed = checkLocationPermission(l.toMainLocationId);
          if (!fromAllowed && !toAllowed) return;

          const isFrom = l.fromMainLocationId === filterLocation && (!filterSubLocation || l.fromSubLocationId === filterSubLocation);
          const isTo = l.toMainLocationId === filterLocation && (!filterSubLocation || l.toSubLocationId === filterSubLocation);

          if (filterLocation && !isFrom && !isTo) return;

          const p = checkPerfume(l.perfumeId);
          if (!p) return;

          // Transfer uses master price
          if (!checkPriceFilter(p.priceUSD, p.pricePKR)) return;

          const fromLoc = locations.find(x => x.id === l.fromMainLocationId);
          const toLoc = locations.find(x => x.id === l.toMainLocationId);
          const fromSubLoc = l.fromSubLocationId ? locations.find(x => x.id === l.fromSubLocationId) : null;
          const toSubLoc = l.toSubLocationId ? locations.find(x => x.id === l.toSubLocationId) : null;
          
          let weight = getLogWeight(l);
          if (filterLocation) {
              if (isFrom && isTo) {
                  weight = 0; 
              } else if (isFrom) {
                  weight = -Math.abs(weight);
              } else if (isTo) {
                  weight = Math.abs(weight);
              }
          }

          logs.push({
              date: l.date,
              type: 'Stock Transfer',
              perfumeName: p.name,
              batch: l.batchNumber,
              weight: weight,
              details: `${fromLoc?.name}${fromSubLoc ? ` (${fromSubLoc.name})` : ''} -> ${toLoc?.name}${toSubLoc ? ` (${toSubLoc.name})` : ''}`,
              priceUSD: p.priceUSD,
              pricePKR: p.pricePKR,
              raw: l
          });
      });
    }

    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter(item => item.perfumeName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [
      gateInLogs, gateOutLogs, transferLogs, perfumes, locations, packingTypes, searchTerm, 
      filterLocation, filterSubLocation, filterSupplier, filterOlfactive, filterType,
      filterPriceUSDMin, filterPriceUSDMax, filterPricePKRMin, filterPricePKRMax,
      allowedLocationIds, isLocationRestricted, canViewPrices
  ]);

  const lowStockData = useMemo(() => {
    return inventoryData.filter(i => i.isLowStock);
  }, [inventoryData]);

  const exportPDF = () => {
    const doc = new jsPDF();
    const title = activeTab === 'inventory' ? 'Inventory Summary' : activeTab === 'low-stock' ? 'Low Stock Alert' : 'Transaction History';
    
    doc.setFontSize(18);
    doc.text(`ScentVault - ${title}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    let filterText = '';
    if (filterLocation) {
        filterText += `Loc: ${locations.find(l=>l.id===filterLocation)?.name}`;
        if (filterSubLocation) {
            filterText += ` / ${locations.find(l=>l.id===filterSubLocation)?.name}`;
        }
        filterText += '  ';
    }
    if (filterType) filterText += `Type: ${filterType === 'Transfer' ? 'Stock Transfer' : filterType}  `;
    if (filterSupplier) filterText += `Supp: ${suppliers.find(s=>s.id===filterSupplier)?.name}  `;
    if (filterOlfactive) filterText += `Note: ${filterOlfactive}  `;
    
    // Only show price filters if user can see prices
    if (canViewPrices) {
        if (filterPriceUSDMin || filterPriceUSDMax) filterText += `USD: ${filterPriceUSDMin || '0'} - ${filterPriceUSDMax || 'Max'}  `;
        if (filterPricePKRMin || filterPricePKRMax) filterText += `PKR: ${filterPricePKRMin || '0'} - ${filterPricePKRMax || 'Max'}  `;
    }

    if (filterText) doc.text(`Filters: ${filterText}`, 14, 36);

    if (activeTab === 'inventory') {
        doc.setFontSize(10);
        doc.setTextColor(79, 70, 229); 
        doc.text(`Total Weight: ${summaryMetrics.weight.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`, 14, filterText ? 42 : 36);
        
        if (canViewPrices) {
            doc.text(`Total Value (USD): $${summaryMetrics.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 70, filterText ? 42 : 36);
            doc.text(`Total Value (PKR): Rs ${summaryMetrics.pkr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, filterText ? 42 : 36);
        }
        doc.setTextColor(0, 0, 0); 
        doc.setFontSize(11);
    }

    let head = [];
    let body = [];

    if (activeTab === 'inventory' || activeTab === 'low-stock') {
        const data = activeTab === 'inventory' ? inventoryData : lowStockData;
        const headers = ['Code', 'Name', 'Supplier', 'Primary Batch', 'Batch(es)', 'Weight'];
        if (canViewPrices) {
            headers.push('Val (USD)', 'Val (PKR)');
        }
        headers.push('Status');

        head = [headers];
        
        body = data.map(r => {
            const row = [
                r.code, 
                r.name, 
                r.supplierName,
                r.primaryBatch,
                r.activeBatches,
                r.currentWeight.toFixed(2)
            ];
            if (canViewPrices) {
                row.push(`$${r.totalValueUSD.toFixed(0)}`);
                row.push(`Rs ${r.totalValuePKR.toFixed(0)}`);
            }
            row.push(r.isLowStock ? 'LOW' : 'OK');
            return row;
        });
    } else {
        const headers = ['Date', 'Type', 'Perfume', 'Batch #', 'Weight'];
        if (canViewPrices) {
            headers.push('Unit Price ($)', 'Unit Price (PKR)');
        }
        headers.push('Details');
        head = [headers];

        body = transactionData.map(r => {
            const row = [
                r.date, r.type, r.perfumeName, r.batch, r.weight.toFixed(2)
            ];
            if (canViewPrices) {
                row.push(r.priceUSD ? `$${r.priceUSD.toFixed(2)}` : '-');
                row.push(r.pricePKR ? `Rs${r.pricePKR.toFixed(2)}` : '-');
            }
            row.push(r.details);
            return row;
        });
    }

    autoTable(doc, {
        startY: filterText ? (activeTab === 'inventory' ? 48 : 42) : (activeTab === 'inventory' ? 42 : 40),
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 }
    });

    doc.save(`${title.toLowerCase().replace(' ', '_')}.pdf`);
  };

  const exportExcel = () => {
    const title = activeTab === 'inventory' ? 'Inventory Summary' : activeTab === 'low-stock' ? 'Low Stock Alert' : 'Transaction History';
    let data = [];

    if (activeTab === 'inventory' || activeTab === 'low-stock') {
        const source = activeTab === 'inventory' ? inventoryData : lowStockData;
        data = source.map(r => {
            const row: any = {
                Code: r.code,
                Name: r.name,
                Supplier: r.supplierName,
                'Primary Batch': r.primaryBatch,
                'Active Batches': r.activeBatches,
                'Current Weight (KG)': r.currentWeight
            };
            if (canViewPrices) {
                row['Unit Price (USD)'] = r.unitPriceUSD;
                row['Unit Price (PKR)'] = r.unitPricePKR;
                row['Total Value (USD)'] = r.totalValueUSD;
                row['Total Value (PKR)'] = r.totalValuePKR;
            }
            row.Status = r.isLowStock ? 'LOW STOCK' : 'OK';
            return row;
        });
    } else {
        data = transactionData.map(r => {
            const row: any = {
                Date: r.date,
                Type: r.type,
                Perfume: r.perfumeName,
                Batch: r.batch,
                Weight: r.weight
            };
            if (canViewPrices) {
                row['Unit Price (USD)'] = r.priceUSD || 0;
                row['Unit Price (PKR)'] = r.pricePKR || 0;
            }
            row.Details = r.details;
            return row;
        });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${title.toLowerCase().replace(' ', '_')}.xlsx`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Reports Center</h2>
        <div className="flex gap-2">
            <Button variant="outline" onClick={exportPDF} className="flex items-center gap-2">
                <FileDown size={18} /> PDF
            </Button>
            <Button variant="outline" onClick={exportExcel} className="flex items-center gap-2">
                <FileSpreadsheet size={18} /> Excel
            </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Report Tabs */}
        <div className="flex border-b border-gray-200">
            <button 
                onClick={() => setActiveTab('inventory')}
                className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'inventory' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                Inventory Summary
            </button>
            <button 
                onClick={() => setActiveTab('transactions')}
                className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'transactions' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                Movement History
            </button>
            <button 
                onClick={() => setActiveTab('low-stock')}
                className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'low-stock' ? 'bg-red-50 text-red-700 border-b-2 border-red-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                Low Stock Alerts
            </button>
        </div>

        {/* Toolbar with Collapsible Filters */}
        <div className="border-b border-gray-200 bg-white">
            <div className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                {/* Search Bar - Always visible */}
                <div className="relative flex-1 w-full sm:max-w-md">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search name, code, or details..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${isFilterPanelOpen || hasActiveFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                        <Filter size={16} />
                        Filters
                        {hasActiveFilters && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">
                                {[
                                    filterLocation, filterSubLocation, filterType, filterSupplier, filterOlfactive,
                                    filterPriceUSDMin, filterPriceUSDMax, filterPricePKRMin, filterPricePKRMax
                                ].filter(Boolean).length}
                            </span>
                        )}
                        {isFilterPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            {/* Collapsible Filter Panel */}
            {isFilterPanelOpen && (
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Group 1: Location Scope */}
                        <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 mb-1 pb-2 border-b border-gray-100">
                                <MapPin size={16} className="text-indigo-500"/>
                                <h4 className="text-sm font-semibold text-gray-700">Location Scope</h4>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Main Location</label>
                                <div className="relative">
                                    <select 
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                                        value={filterLocation}
                                        onChange={(e) => { setFilterLocation(e.target.value); setFilterSubLocation(''); }}
                                    >
                                        <option value="">All Locations</option>
                                        {mainLocations.map(l => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Sub Location</label>
                                <select 
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                                    value={filterSubLocation}
                                    onChange={(e) => setFilterSubLocation(e.target.value)}
                                    disabled={!filterLocation}
                                >
                                    <option value="">All Sub Locations</option>
                                    {subLocations.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Group 2: Product Attributes (Including Price) */}
                        <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 mb-1 pb-2 border-b border-gray-100">
                                <Package size={16} className="text-indigo-500"/>
                                <h4 className="text-sm font-semibold text-gray-700">Product & Price</h4>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Supplier</label>
                                <select 
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                                    value={filterSupplier}
                                    onChange={(e) => setFilterSupplier(e.target.value)}
                                >
                                    <option value="">All Suppliers</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Olfactive Note</label>
                                <select 
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                                    value={filterOlfactive}
                                    onChange={(e) => setFilterOlfactive(e.target.value)}
                                >
                                    <option value="">All Notes</option>
                                    {olfactiveOptions.map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Price Filters - Only show if has permission */}
                            {canViewPrices && (
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Unit Price (USD)</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="number" 
                                                placeholder="Min" 
                                                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500"
                                                value={filterPriceUSDMin}
                                                onChange={e => setFilterPriceUSDMin(e.target.value)}
                                            />
                                            <input 
                                                type="number" 
                                                placeholder="Max" 
                                                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500"
                                                value={filterPriceUSDMax}
                                                onChange={e => setFilterPriceUSDMax(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Unit Price (PKR)</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="number" 
                                                placeholder="Min" 
                                                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500"
                                                value={filterPricePKRMin}
                                                onChange={e => setFilterPricePKRMin(e.target.value)}
                                            />
                                            <input 
                                                type="number" 
                                                placeholder="Max" 
                                                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500"
                                                value={filterPricePKRMax}
                                                onChange={e => setFilterPricePKRMax(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                            {!canViewPrices && (
                                <div className="pt-2 border-t border-gray-100">
                                    <p className="text-xs text-gray-400 italic flex items-center gap-1"><Lock size={10}/> Pricing Data Hidden</p>
                                </div>
                            )}
                        </div>

                        {/* Group 3: Transaction & Actions */}
                        <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm space-y-3 flex flex-col">
                            <div className="flex items-center gap-2 mb-1 pb-2 border-b border-gray-100">
                                <ArrowRightLeft size={16} className="text-indigo-500"/>
                                <h4 className="text-sm font-semibold text-gray-700">Filters & Options</h4>
                            </div>
                            
                            <div className="flex-1 space-y-3">
                                {activeTab === 'transactions' ? (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Movement Type</label>
                                        <select 
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                                            value={filterType}
                                            onChange={(e) => setFilterType(e.target.value)}
                                        >
                                            <option value="">All Types</option>
                                            <option value="Gate In">Gate In</option>
                                            <option value="Gate Out">Gate Out</option>
                                            <option value="Transfer">Stock Transfer</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-400 italic py-2">
                                        No additional filters available for this report type.
                                    </div>
                                )}
                            </div>

                            <div className="pt-2">
                                <Button 
                                    variant="outline" 
                                    onClick={clearFilters}
                                    disabled={!hasActiveFilters}
                                    className={`w-full flex items-center justify-center gap-2 text-xs h-9 ${hasActiveFilters ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-gray-400'}`}
                                >
                                    <X size={14} /> Clear All Filters
                                </Button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
            
            {/* Active Filters Summary Strip */}
            {!isFilterPanelOpen && hasActiveFilters && (
                <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-100 flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-medium text-indigo-800 mr-2">Active Filters:</span>
                    {filterLocation && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-white border border-indigo-200 text-xs text-indigo-700">
                            Loc: {mainLocations.find(l=>l.id===filterLocation)?.name}
                        </span>
                    )}
                    {filterSubLocation && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-white border border-indigo-200 text-xs text-indigo-700">
                            Sub: {subLocations.find(l=>l.id===filterSubLocation)?.name}
                        </span>
                    )}
                    {filterType && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-white border border-indigo-200 text-xs text-indigo-700">
                            Type: {filterType === 'Transfer' ? 'Stock Transfer' : filterType}
                        </span>
                    )}
                    {filterSupplier && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-white border border-indigo-200 text-xs text-indigo-700">
                            Supp: {suppliers.find(s=>s.id===filterSupplier)?.name}
                        </span>
                    )}
                    {filterOlfactive && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-white border border-indigo-200 text-xs text-indigo-700">
                            Note: {filterOlfactive}
                        </span>
                    )}
                    {(filterPriceUSDMin || filterPriceUSDMax) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-white border border-indigo-200 text-xs text-indigo-700">
                            USD: {filterPriceUSDMin || '0'} - {filterPriceUSDMax || 'Max'}
                        </span>
                    )}
                    {(filterPricePKRMin || filterPricePKRMax) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-white border border-indigo-200 text-xs text-indigo-700">
                            PKR: {filterPricePKRMin || '0'} - {filterPricePKRMax || 'Max'}
                        </span>
                    )}
                    <button onClick={clearFilters} className="ml-auto text-xs text-red-600 hover:text-red-800 underline">Clear All</button>
                </div>
            )}
            
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
                <span>Result Count:</span>
                <span className="font-medium text-gray-700">
                    {activeTab === 'inventory' && `${inventoryData.length} items`}
                    {activeTab === 'transactions' && `${transactionData.length} records`}
                    {activeTab === 'low-stock' && `${lowStockData.length} alerts`}
                </span>
            </div>
        </div>

        {/* Inventory Value Summary */}
        {activeTab === 'inventory' && (
             <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-indigo-50/50 border-b border-indigo-100">
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Weight */}
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-indigo-50 shadow-sm">
                        <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                            <Scale size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Total Weight</p>
                            <p className="text-lg font-bold text-gray-800">
                                {summaryMetrics.weight.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-gray-500">kg</span>
                            </p>
                        </div>
                    </div>

                    {/* USD */}
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-indigo-50 shadow-sm">
                        <div className={`p-2 rounded-full ${canViewPrices ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                            {canViewPrices ? <DollarSign size={20} /> : <Lock size={20} />}
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Total Value (USD)</p>
                            <p className="text-lg font-bold text-gray-800">
                                {canViewPrices ? `$${summaryMetrics.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '---'}
                            </p>
                        </div>
                    </div>

                    {/* PKR */}
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-indigo-50 shadow-sm">
                        <div className={`p-2 rounded-full ${canViewPrices ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-400'}`}>
                            {canViewPrices ? <Coins size={20} /> : <Lock size={20} />}
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Total Value (PKR)</p>
                            <p className="text-lg font-bold text-gray-800">
                                {canViewPrices ? `Rs ${summaryMetrics.pkr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '---'}
                            </p>
                        </div>
                    </div>
                 </div>
            </div>
        )}

        {/* Tables */}
        <div className="overflow-x-auto">
            {(activeTab === 'inventory' || activeTab === 'low-stock') && (
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                        <tr>
                            <th className="px-6 py-3">Code</th>
                            <th className="px-6 py-3">Perfume Name</th>
                            <th className="px-6 py-3">Supplier</th>
                            <th className="px-6 py-3">Primary Batch</th>
                            <th className="px-6 py-3">Batch(es)</th>
                            <th className="px-6 py-3 text-right">Stock (KG)</th>
                            {canViewPrices && <th className="px-6 py-3 text-right">Value (USD)</th>}
                            {canViewPrices && <th className="px-6 py-3 text-right">Value (PKR)</th>}
                            <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {(activeTab === 'inventory' ? inventoryData : lowStockData).map((item) => (
                            <tr key={item.id} className={item.isLowStock ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}>
                                <td className="px-6 py-3 font-medium text-gray-900">{item.code}</td>
                                <td className="px-6 py-3">{item.name}</td>
                                <td className="px-6 py-3">{item.supplierName}</td>
                                <td className="px-6 py-3 font-mono text-xs text-indigo-600">{item.primaryBatch}</td>
                                <td className="px-6 py-3 text-xs text-gray-500 max-w-[200px] break-words">{item.activeBatches}</td>
                                <td className="px-6 py-3 text-right font-mono">{item.currentWeight.toFixed(2)}</td>
                                {canViewPrices && <td className="px-6 py-3 text-right text-gray-500">${item.totalValueUSD.toLocaleString()}</td>}
                                {canViewPrices && <td className="px-6 py-3 text-right text-gray-500">Rs {item.totalValuePKR.toLocaleString()}</td>}
                                <td className="px-6 py-3 text-center">
                                    {item.isLowStock ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            Low Stock
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            OK
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {((activeTab === 'inventory' ? inventoryData : lowStockData).length === 0) && (
                            <tr><td colSpan={canViewPrices ? 8 : 6} className="px-6 py-8 text-center text-gray-400">No records found</td></tr>
                        )}
                    </tbody>
                </table>
            )}

            {activeTab === 'transactions' && (
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                        <tr>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Perfume</th>
                            <th className="px-6 py-3">Batch #</th>
                            <th className="px-6 py-3 text-right">Weight (KG)</th>
                            {canViewPrices && <th className="px-6 py-3 text-right">Unit Price (USD)</th>}
                            {canViewPrices && <th className="px-6 py-3 text-right">Unit Price (PKR)</th>}
                            <th className="px-6 py-3">Details (Source/Dest)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {transactionData.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-6 py-3 whitespace-nowrap">{item.date}</td>
                                <td className="px-6 py-3">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium 
                                        ${item.type === 'Gate In' ? 'bg-green-100 text-green-800' : 
                                          item.type === 'Gate Out' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {item.type}
                                    </span>
                                </td>
                                <td className="px-6 py-3 font-medium text-gray-900">{item.perfumeName}</td>
                                <td className="px-6 py-3 font-mono text-xs">{item.batch || '-'}</td>
                                <td className={`px-6 py-3 text-right font-mono ${item.weight < 0 ? 'text-red-600' : item.weight > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                    {item.weight > 0 ? '+' : ''}{Math.abs(item.weight).toFixed(2)}
                                </td>
                                {canViewPrices && <td className="px-6 py-3 text-right text-xs text-gray-500">
                                    {item.priceUSD ? `$${item.priceUSD.toFixed(2)}` : '-'}
                                </td>}
                                {canViewPrices && <td className="px-6 py-3 text-right text-xs text-gray-500">
                                    {item.pricePKR ? `Rs${item.pricePKR.toFixed(2)}` : '-'}
                                </td>}
                                <td className="px-6 py-3 text-xs text-gray-500">{item.details}</td>
                            </tr>
                        ))}
                         {transactionData.length === 0 && (
                            <tr><td colSpan={canViewPrices ? 8 : 6} className="px-6 py-8 text-center text-gray-400">No transactions found</td></tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
      </div>
    </div>
  );
};
