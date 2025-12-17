import React, { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { GateInLog, GateOutLog, StockTransferLog, GateOutUsage } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Pencil, Trash2, X } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- HELPER: CALCULATE BATCH STOCK ---
// Modified to optionally exclude a specific log (to support editing: we "add back" the stock from the log being edited)
const getAvailableBatches = (
  perfumeId: string, 
  locationId: string, 
  gateInLogs: any[], 
  gateOutLogs: any[], 
  transferLogs: any[],
  excludeLogId?: string 
) => {
  if (!perfumeId || !locationId) return [];
  
  const batchMap: Record<string, number> = {};
  const normalize = (s: string) => (s || '').trim();

  // 1. Gate In (Inflow)
  gateInLogs.forEach(l => {
    if (l.id === excludeLogId) return; // Ignored for calculation if this is the log we are editing (if we were editing a Gate In, it wouldn't supply stock, but usually we exclude out-going logs to free up stock)
    
    if (l.perfumeId === perfumeId && l.mainLocationId === locationId) {
      const batch = normalize(l.importReference);
      if (batch) {
        batchMap[batch] = (batchMap[batch] || 0) + Number(l.netWeight);
      }
    }
  });

  // 2. Gate Out (Outflow)
  gateOutLogs.forEach(l => {
    if (l.id === excludeLogId) return; // If we are editing THIS gate out, ignore it so its weight is effectively available again
    
    if (l.perfumeId === perfumeId && l.mainLocationId === locationId) {
      const batch = normalize(l.batchNumber);
      if (batch) {
        batchMap[batch] = (batchMap[batch] || 0) - Number(l.netWeight);
      }
    }
  });

  // 3. Transfers (Flow)
  transferLogs.forEach(l => {
    if (l.id === excludeLogId) return; // Same for transfers

    if (l.perfumeId === perfumeId) {
      const batch = normalize(l.batchNumber);
      if (batch) {
         // Out from here
         if (l.fromMainLocationId === locationId) {
            batchMap[batch] = (batchMap[batch] || 0) - Number(l.netWeight);
         }
         // In to here
         if (l.toMainLocationId === locationId) {
            batchMap[batch] = (batchMap[batch] || 0) + Number(l.netWeight);
         }
      }
    }
  });

  return Object.entries(batchMap)
      .map(([batch, weight]) => ({ batch, weight }))
      .filter(item => item.weight > 0.001) // Filter out empty/negative stock (floating point tolerance)
      .sort((a, b) => b.weight - a.weight); // Sort largest batches first
};

// --- SHARED HOOK FOR CYCLICAL LOGIC ---
const useCyclicalWeight = (packingTypeId: string, packingTypes: any[]) => {
  const [qty, setQty] = useState<string>('');
  const [weight, setWeight] = useState<string>('');

  const packingType = packingTypes.find(pt => pt.id === packingTypeId);
  const unitQty = packingType ? packingType.qtyPerPacking : 0;

  const handleQtyChange = (val: string) => {
    setQty(val);
    if (unitQty && val) {
      setWeight((Number(val) * unitQty).toFixed(2));
    } else if (!val) {
      setWeight('');
    }
  };

  const handleWeightChange = (val: string) => {
    setWeight(val);
    if (unitQty && val) {
      setQty((Number(val) / unitQty).toFixed(2)); 
    } else if (!val) {
      setQty('');
    }
  };

  return { qty, weight, handleQtyChange, handleWeightChange, setQty, setWeight };
};

// --- GATE IN ---
export const GateInForm = () => {
  const { 
    perfumes, suppliers, packingTypes, locations, 
    getMainLocations, getSubLocations, 
    addGateInLog, updateGateInLog, deleteGateInLog, 
    gateInLogs, hasPermission 
  } = useInventory();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPerfumeId, setSelectedPerfumeId] = useState('');
  const [importRef, setImportRef] = useState('');
  const [selectedPackingTypeId, setSelectedPackingTypeId] = useState('');
  const [mainLocId, setMainLocId] = useState('');
  const [subLocId, setSubLocId] = useState('');
  const [invoice, setInvoice] = useState('');
  const [remarks, setRemarks] = useState('');
  const [priceUSD, setPriceUSD] = useState<string>('');
  const [pricePKR, setPricePKR] = useState<string>('');

  const { qty, weight, handleQtyChange, handleWeightChange, setQty, setWeight } = useCyclicalWeight(selectedPackingTypeId, packingTypes);

  // Derived Values
  const selectedPerfume = perfumes.find(p => p.id === selectedPerfumeId);
  const supplier = selectedPerfume ? suppliers.find(s => s.id === selectedPerfume.supplierId) : null;
  const subLocations = mainLocId ? getSubLocations(mainLocId) : [];
  const canViewPrices = hasPermission('view_prices');

  // Auto-populate prices when perfume changes, ONLY if not editing (to preserve historical data)
  useEffect(() => {
    if (selectedPerfume && !editingId) {
        setPriceUSD(selectedPerfume.priceUSD?.toString() || '');
        setPricePKR(selectedPerfume.pricePKR?.toString() || '');
    }
  }, [selectedPerfume, editingId]);

  const handlePackingTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newId = e.target.value;
      setSelectedPackingTypeId(newId);
      const pt = packingTypes.find(p => p.id === newId);
      const unit = pt?.qtyPerPacking || 0;
      
      if (qty && unit) {
          setWeight((Number(qty) * unit).toFixed(2));
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if batch exists (exclude current if editing)
    const batchExists = gateInLogs.some(log => 
      log.id !== editingId &&
      log.perfumeId === selectedPerfumeId &&
      log.mainLocationId === mainLocId &&
      log.importReference.trim().toLowerCase() === importRef.trim().toLowerCase()
    );

    if (batchExists) {
        const confirm = window.confirm(
            `Batch '${importRef}' already exists for this perfume at this location.\n\nDo you want to add to the existing batch stock?`
        );
        if (!confirm) return;
    }

    const logData: GateInLog = {
      id: editingId || generateId(),
      date, perfumeId: selectedPerfumeId, importReference: importRef,
      packingTypeId: selectedPackingTypeId, packingQty: Number(qty), netWeight: Number(weight),
      mainLocationId: mainLocId, subLocationId: subLocId, supplierInvoice: invoice, remarks,
      priceUSD: priceUSD ? Number(priceUSD) : undefined,
      pricePKR: pricePKR ? Number(pricePKR) : undefined
    };

    if (editingId) {
        updateGateInLog(editingId, logData);
        alert('Gate In Entry Updated');
        handleCancel();
    } else {
        addGateInLog(logData);
        alert('Gate In Logged');
        setQty(''); setWeight(''); setImportRef(''); setInvoice('');
    }
  };

  const handleEdit = (log: GateInLog) => {
      setEditingId(log.id);
      setDate(log.date);
      setSelectedPerfumeId(log.perfumeId);
      setImportRef(log.importReference);
      setSelectedPackingTypeId(log.packingTypeId);
      setQty(log.packingQty.toString());
      setWeight(log.netWeight.toString());
      setMainLocId(log.mainLocationId);
      setSubLocId(log.subLocationId || '');
      setInvoice(log.supplierInvoice);
      setRemarks(log.remarks);
      setPriceUSD(log.priceUSD?.toString() || '');
      setPricePKR(log.pricePKR?.toString() || '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
      if(window.confirm("Are you sure you want to delete this Gate In entry? Stock will be removed.")) {
          deleteGateInLog(id);
          if (editingId === id) handleCancel();
      }
  };

  const handleCancel = () => {
      setEditingId(null);
      setDate(new Date().toISOString().split('T')[0]);
      setSelectedPerfumeId('');
      setImportRef('');
      setSelectedPackingTypeId('');
      setQty('');
      setWeight('');
      setMainLocId('');
      setSubLocId('');
      setInvoice('');
      setRemarks('');
      setPriceUSD('');
      setPricePKR('');
  };

  return (
    <div className="space-y-8">
        <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-green-700">{editingId ? 'Edit Gate In Entry' : 'Gate In Log (Receiving)'}</h3>
            {editingId && <Button type="button" variant="secondary" onClick={handleCancel} className="text-xs flex items-center gap-1"><X size={14}/> Cancel Edit</Button>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            <Select 
            label="Perfume Name"
            options={perfumes.map(p => ({ value: p.id, label: p.name }))}
            value={selectedPerfumeId}
            onChange={e => setSelectedPerfumeId(e.target.value)}
            required
            />
            <Input label="Perfume Code" value={selectedPerfume?.code || ''} readOnly className="bg-gray-100" />
            <Input label="Supplier" value={supplier?.name || ''} readOnly className="bg-gray-100" />
            <Input 
            label="Batch / Lot # (Import Ref)" 
            value={importRef} 
            onChange={e => setImportRef(e.target.value)} 
            placeholder="Enter new batch number"
            required 
            />
            <Select 
            label="Packing Type"
            options={packingTypes.map(pt => ({ value: pt.id, label: pt.name }))}
            value={selectedPackingTypeId}
            onChange={handlePackingTypeChange}
            required
            />
            <Input label="Packing Qty" type="number" value={qty} onChange={e => handleQtyChange(e.target.value)} required />
            <Input label="Net Weight (KG)" type="number" value={weight} onChange={e => handleWeightChange(e.target.value)} required />
            
            <Select 
            label="Main Location"
            options={getMainLocations().map(l => ({ value: l.id, label: l.name }))}
            value={mainLocId}
            onChange={e => { setMainLocId(e.target.value); setSubLocId(''); }}
            required
            />
            <Select 
            label="Sub Location"
            options={subLocations.map(l => ({ value: l.id, label: l.name }))}
            value={subLocId}
            onChange={e => setSubLocId(e.target.value)}
            disabled={!mainLocId}
            />
            <Input label="Supplier Invoice #" value={invoice} onChange={e => setInvoice(e.target.value)} />
            
            {canViewPrices && (
                <>
                    <Input 
                        label="Unit Price (USD)" 
                        type="number" 
                        step="0.01" 
                        value={priceUSD} 
                        onChange={e => setPriceUSD(e.target.value)} 
                    />
                    <Input 
                        label="Unit Price (PKR)" 
                        type="number" 
                        step="0.01" 
                        value={pricePKR} 
                        onChange={e => setPricePKR(e.target.value)} 
                    />
                </>
            )}
        </div>
        <div className="mt-4">
            <Input label="Remarks" value={remarks} onChange={e => setRemarks(e.target.value)} />
        </div>
        <div className="mt-4 flex justify-end">
            <Button type="submit" className="bg-green-600 hover:bg-green-700">{editingId ? 'Update Entry' : 'Save Gate In'}</Button>
        </div>
        </form>

        {/* List of recent transactions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <h3 className="px-6 py-4 border-b border-gray-100 font-medium text-gray-700 bg-gray-50">Recent Gate In Entries</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Perfume</th>
                            <th className="px-6 py-3">Batch</th>
                            <th className="px-6 py-3 text-right">Weight</th>
                            <th className="px-6 py-3">Location</th>
                            <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {gateInLogs.slice().reverse().slice(0, 10).map(log => {
                            const p = perfumes.find(x => x.id === log.perfumeId);
                            const loc = locations.find(x => x.id === log.mainLocationId);
                            return (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-3">{log.date}</td>
                                    <td className="px-6 py-3 font-medium">{p?.name}</td>
                                    <td className="px-6 py-3 font-mono text-xs">{log.importReference}</td>
                                    <td className="px-6 py-3 text-right">{log.netWeight.toFixed(2)}</td>
                                    <td className="px-6 py-3 text-xs">{loc?.name}</td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEdit(log)} className="text-indigo-600 hover:text-indigo-900"><Pencil size={14}/></button>
                                            <button onClick={() => handleDelete(log.id)} className="text-red-600 hover:text-red-900"><Trash2 size={14}/></button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                        {gateInLogs.length === 0 && <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-400">No entries yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

// --- GATE OUT ---
export const GateOutForm = () => {
  const { 
    perfumes, suppliers, packingTypes, customers, locations,
    getMainLocations, getSubLocations, 
    addGateOutLog, updateGateOutLog, deleteGateOutLog,
    gateInLogs, gateOutLogs, transferLogs 
  } = useInventory();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPerfumeId, setSelectedPerfumeId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [selectedPackingTypeId, setSelectedPackingTypeId] = useState('');
  const [mainLocId, setMainLocId] = useState('');
  const [subLocId, setSubLocId] = useState('');
  const [usage, setUsage] = useState<GateOutUsage>(GateOutUsage.Production);
  const [customerId, setCustomerId] = useState('');
  const [remarks, setRemarks] = useState('');

  const { qty, weight, handleQtyChange, handleWeightChange, setQty, setWeight } = useCyclicalWeight(selectedPackingTypeId, packingTypes);

  const selectedPerfume = perfumes.find(p => p.id === selectedPerfumeId);
  const subLocations = mainLocId ? getSubLocations(mainLocId) : [];

  // Calculate available batches for the selected perfume at the selected location
  const availableBatches = useMemo(() => {
    // If editing, exclude the current log so we can 're-select' the stock we previously consumed
    return getAvailableBatches(selectedPerfumeId, mainLocId, gateInLogs, gateOutLogs, transferLogs, editingId || undefined);
  }, [selectedPerfumeId, mainLocId, gateInLogs, gateOutLogs, transferLogs, editingId]);

  // Derive available Packing Types based on active batches in inventory
  const availablePackingTypes = useMemo(() => {
    if (!availableBatches.length) return [];
    const typeIds = new Set<string>();
    const batchNames = new Set(availableBatches.map(b => b.batch));

    gateInLogs.forEach(l => {
        if (l.perfumeId === selectedPerfumeId && l.mainLocationId === mainLocId && batchNames.has(l.importReference)) {
            typeIds.add(l.packingTypeId);
        }
    });

    transferLogs.forEach(l => {
        if (l.perfumeId === selectedPerfumeId && l.toMainLocationId === mainLocId && batchNames.has(l.batchNumber)) {
            typeIds.add(l.packingTypeId);
        }
    });

    const filtered = packingTypes.filter(pt => typeIds.has(pt.id));
    return filtered.length > 0 ? filtered : packingTypes;
  }, [availableBatches, gateInLogs, transferLogs, packingTypes, selectedPerfumeId, mainLocId]);


  // Auto-populate when Batch is selected
  useEffect(() => {
    // Only auto-populate if NOT editing, or if editing but changing batch manually
    // Actually, improved UX: Only populate if weight is empty to avoid overwriting user edits
    if (!editingId || (editingId && weight === '')) {
        const batch = availableBatches.find(b => b.batch === batchNumber);
        if (batch) {
            setWeight(batch.weight.toFixed(2));
            const pt = packingTypes.find(p => p.id === selectedPackingTypeId);
            if (pt && pt.qtyPerPacking) {
                setQty((batch.weight / pt.qtyPerPacking).toFixed(2));
            }
        }
    }
  }, [batchNumber, editingId]); 

  const handlePackingTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedPackingTypeId(newId);
    const pt = packingTypes.find(p => p.id === newId);
    const unit = pt?.qtyPerPacking || 0;
    
    if (unit > 0) {
        if (weight) {
           setQty((Number(weight) / unit).toFixed(2));
        } else if (qty) {
           setWeight((Number(qty) * unit).toFixed(2));
        }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const logData: GateOutLog = {
      id: editingId || generateId(),
      date, perfumeId: selectedPerfumeId, packingTypeId: selectedPackingTypeId, 
      packingQty: Number(qty), netWeight: Number(weight), mainLocationId: mainLocId, 
      subLocationId: subLocId, usage, customerId: usage === GateOutUsage.Sale ? customerId : undefined, 
      remarks, batchNumber
    };

    if (editingId) {
        updateGateOutLog(editingId, logData);
        alert('Gate Out Entry Updated');
        handleCancel();
    } else {
        addGateOutLog(logData);
        alert('Gate Out Logged');
        setQty(''); setWeight(''); setBatchNumber('');
    }
  };

  const handleEdit = (log: GateOutLog) => {
      setEditingId(log.id);
      setDate(log.date);
      setSelectedPerfumeId(log.perfumeId);
      setMainLocId(log.mainLocationId);
      // Important: Set batch AFTER perfume/loc so dependencies work, but React state batching might require care.
      // We set them all; the useEffect dependencies will re-run but we are setting values.
      setBatchNumber(log.batchNumber);
      setSelectedPackingTypeId(log.packingTypeId);
      setQty(log.packingQty.toString());
      setWeight(log.netWeight.toString());
      setSubLocId(log.subLocationId || '');
      setUsage(log.usage);
      setCustomerId(log.customerId || '');
      setRemarks(log.remarks);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if(window.confirm("Are you sure you want to delete this Gate Out entry? Stock will be returned.")) {
        deleteGateOutLog(id);
        if (editingId === id) handleCancel();
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedPerfumeId('');
    setBatchNumber('');
    setSelectedPackingTypeId('');
    setQty('');
    setWeight('');
    setMainLocId('');
    setSubLocId('');
    setUsage(GateOutUsage.Production);
    setCustomerId('');
    setRemarks('');
  };

  return (
    <div className="space-y-8">
        <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-red-700">{editingId ? 'Edit Gate Out Entry' : 'Gate Out Log (Issuing)'}</h3>
            {editingId && <Button type="button" variant="secondary" onClick={handleCancel} className="text-xs flex items-center gap-1"><X size={14}/> Cancel Edit</Button>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            <Select 
            label="Perfume Name"
            options={perfumes.map(p => ({ value: p.id, label: p.name }))}
            value={selectedPerfumeId}
            onChange={e => setSelectedPerfumeId(e.target.value)}
            required
            />
            <Input label="Perfume Code" value={selectedPerfume?.code || ''} readOnly className="bg-gray-100" />
            
            <Select 
            label="From Main Location"
            options={getMainLocations().map(l => ({ value: l.id, label: l.name }))}
            value={mainLocId}
            onChange={e => { setMainLocId(e.target.value); setSubLocId(''); setBatchNumber(''); }}
            required
            />

            <Select 
            label="Batch / Lot #"
            options={availableBatches.map(b => ({ 
                value: b.batch, 
                label: `${b.batch} — ${b.weight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg Available` 
            }))}
            value={batchNumber}
            onChange={e => setBatchNumber(e.target.value)}
            disabled={!mainLocId || !selectedPerfumeId}
            required
            />

            <Select 
            label="Packing Type"
            options={availablePackingTypes.map(pt => ({ value: pt.id, label: pt.name }))}
            value={selectedPackingTypeId}
            onChange={handlePackingTypeChange}
            required
            />
            <Input label="Packing Qty" type="number" value={qty} onChange={e => handleQtyChange(e.target.value)} required />
            <Input label="Net Weight (KG)" type="number" value={weight} onChange={e => handleWeightChange(e.target.value)} required />
            
            <Select 
            label="From Sub Location"
            options={subLocations.map(l => ({ value: l.id, label: l.name }))}
            value={subLocId}
            onChange={e => setSubLocId(e.target.value)}
            disabled={!mainLocId}
            />

            <Select 
            label="Usage"
            options={Object.values(GateOutUsage).map(u => ({ value: u, label: u }))}
            value={usage}
            onChange={e => setUsage(e.target.value as GateOutUsage)}
            />
            {usage === GateOutUsage.Sale && (
            <Select 
                label="Customer"
                options={customers.map(c => ({ value: c.id, label: c.name }))}
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                required
            />
            )}
        </div>
        <div className="mt-4">
            <Input label="Remarks" value={remarks} onChange={e => setRemarks(e.target.value)} />
        </div>
        <div className="mt-4 flex justify-end">
            <Button type="submit" className="bg-red-600 hover:bg-red-700">{editingId ? 'Update Entry' : 'Save Gate Out'}</Button>
        </div>
        </form>

        {/* List of recent transactions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <h3 className="px-6 py-4 border-b border-gray-100 font-medium text-gray-700 bg-gray-50">Recent Gate Out Entries</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Perfume</th>
                            <th className="px-6 py-3">Batch</th>
                            <th className="px-6 py-3 text-right">Weight</th>
                            <th className="px-6 py-3">Usage</th>
                            <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {gateOutLogs.slice().reverse().slice(0, 10).map(log => {
                            const p = perfumes.find(x => x.id === log.perfumeId);
                            const cust = customers.find(c => c.id === log.customerId);
                            return (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-3">{log.date}</td>
                                    <td className="px-6 py-3 font-medium">{p?.name}</td>
                                    <td className="px-6 py-3 font-mono text-xs">{log.batchNumber}</td>
                                    <td className="px-6 py-3 text-right">{log.netWeight.toFixed(2)}</td>
                                    <td className="px-6 py-3 text-xs">
                                        {log.usage}
                                        {log.usage === GateOutUsage.Sale && cust ? ` (${cust.name})` : ''}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEdit(log)} className="text-indigo-600 hover:text-indigo-900"><Pencil size={14}/></button>
                                            <button onClick={() => handleDelete(log.id)} className="text-red-600 hover:text-red-900"><Trash2 size={14}/></button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                        {gateOutLogs.length === 0 && <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-400">No entries yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

// --- STOCK TRANSFER ---
export const StockTransferForm = () => {
  const { 
    perfumes, suppliers, packingTypes, locations,
    getMainLocations, getSubLocations, 
    addTransferLog, updateTransferLog, deleteTransferLog,
    gateInLogs, gateOutLogs, transferLogs 
  } = useInventory();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPerfumeId, setSelectedPerfumeId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [selectedPackingTypeId, setSelectedPackingTypeId] = useState('');
  const [fromMainLocId, setFromMainLocId] = useState('');
  const [fromSubLocId, setFromSubLocId] = useState('');
  const [toMainLocId, setToMainLocId] = useState('');
  const [toSubLocId, setToSubLocId] = useState('');
  const [remarks, setRemarks] = useState('');

  const { qty, weight, handleQtyChange, handleWeightChange, setQty, setWeight } = useCyclicalWeight(selectedPackingTypeId, packingTypes);

  const selectedPerfume = perfumes.find(p => p.id === selectedPerfumeId);
  const fromSubLocations = fromMainLocId ? getSubLocations(fromMainLocId) : [];
  const toSubLocations = toMainLocId ? getSubLocations(toMainLocId) : [];

  // Calculate available batches for the selected perfume at the FROM location
  const availableBatches = useMemo(() => {
    return getAvailableBatches(selectedPerfumeId, fromMainLocId, gateInLogs, gateOutLogs, transferLogs, editingId || undefined);
  }, [selectedPerfumeId, fromMainLocId, gateInLogs, gateOutLogs, transferLogs, editingId]);

   // Derive available Packing Types based on active batches in inventory at FROM location
   const availablePackingTypes = useMemo(() => {
    if (!availableBatches.length) return [];
    
    const typeIds = new Set<string>();
    const batchNames = new Set(availableBatches.map(b => b.batch));

    gateInLogs.forEach(l => {
        if (l.perfumeId === selectedPerfumeId && l.mainLocationId === fromMainLocId && batchNames.has(l.importReference)) {
            typeIds.add(l.packingTypeId);
        }
    });

    transferLogs.forEach(l => {
        if (l.perfumeId === selectedPerfumeId && l.toMainLocationId === fromMainLocId && batchNames.has(l.batchNumber)) {
            typeIds.add(l.packingTypeId);
        }
    });

    const filtered = packingTypes.filter(pt => typeIds.has(pt.id));
    return filtered.length > 0 ? filtered : packingTypes;
  }, [availableBatches, gateInLogs, transferLogs, packingTypes, selectedPerfumeId, fromMainLocId]);


  // Auto-populate when Batch is selected
  useEffect(() => {
    if (!editingId || (editingId && weight === '')) {
        const batch = availableBatches.find(b => b.batch === batchNumber);
        if (batch) {
            setWeight(batch.weight.toFixed(2));
            const pt = packingTypes.find(p => p.id === selectedPackingTypeId);
            if (pt && pt.qtyPerPacking) {
                setQty((batch.weight / pt.qtyPerPacking).toFixed(2));
            }
        }
    }
  }, [batchNumber, editingId]);

  const handlePackingTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedPackingTypeId(newId);
    const pt = packingTypes.find(p => p.id === newId);
    const unit = pt?.qtyPerPacking || 0;
    
    if (unit > 0) {
        if (weight) {
           setQty((Number(weight) / unit).toFixed(2));
        } else if (qty) {
           setWeight((Number(qty) * unit).toFixed(2));
        }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const logData: StockTransferLog = {
      id: editingId || generateId(),
      date, perfumeId: selectedPerfumeId, packingTypeId: selectedPackingTypeId, 
      packingQty: Number(qty), netWeight: Number(weight), 
      fromMainLocationId: fromMainLocId, fromSubLocationId: fromSubLocId,
      toMainLocationId: toMainLocId, toSubLocationId: toSubLocId,
      remarks, batchNumber
    };

    if (editingId) {
        updateTransferLog(editingId, logData);
        alert('Transfer Updated');
        handleCancel();
    } else {
        addTransferLog(logData);
        alert('Stock Transferred');
        setQty(''); setWeight(''); setBatchNumber('');
    }
  };

  const handleEdit = (log: StockTransferLog) => {
    setEditingId(log.id);
    setDate(log.date);
    setSelectedPerfumeId(log.perfumeId);
    setFromMainLocId(log.fromMainLocationId);
    setBatchNumber(log.batchNumber);
    setSelectedPackingTypeId(log.packingTypeId);
    setQty(log.packingQty.toString());
    setWeight(log.netWeight.toString());
    setFromSubLocId(log.fromSubLocationId || '');
    setToMainLocId(log.toMainLocationId);
    setToSubLocId(log.toSubLocationId || '');
    setRemarks(log.remarks);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if(window.confirm("Are you sure you want to delete this Transfer?")) {
        deleteTransferLog(id);
        if (editingId === id) handleCancel();
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedPerfumeId('');
    setBatchNumber('');
    setSelectedPackingTypeId('');
    setQty('');
    setWeight('');
    setFromMainLocId('');
    setFromSubLocId('');
    setToMainLocId('');
    setToSubLocId('');
    setRemarks('');
  };

  return (
    <div className="space-y-8">
        <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-blue-700">{editingId ? 'Edit Stock Transfer' : 'Stock Transfer Log'}</h3>
            {editingId && <Button type="button" variant="secondary" onClick={handleCancel} className="text-xs flex items-center gap-1"><X size={14}/> Cancel Edit</Button>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            <Select 
            label="Perfume Name"
            options={perfumes.map(p => ({ value: p.id, label: p.name }))}
            value={selectedPerfumeId}
            onChange={e => setSelectedPerfumeId(e.target.value)}
            required
            />
            <Input label="Perfume Code" value={selectedPerfume?.code || ''} readOnly className="bg-gray-100" />
            
            {/* FROM */}
            <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <h4 className="md:col-span-2 font-medium text-gray-500">From</h4>
                <Select 
                label="Main Location"
                options={getMainLocations().map(l => ({ value: l.id, label: l.name }))}
                value={fromMainLocId}
                onChange={e => { setFromMainLocId(e.target.value); setFromSubLocId(''); setBatchNumber(''); }}
                required
                />
                <Select 
                label="Batch / Lot #"
                options={availableBatches.map(b => ({ 
                value: b.batch, 
                label: `${b.batch} — ${b.weight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg Available` 
                }))}
                value={batchNumber}
                onChange={e => setBatchNumber(e.target.value)}
                disabled={!fromMainLocId || !selectedPerfumeId}
                required
                />
                <Select 
                label="Sub Location"
                options={fromSubLocations.map(l => ({ value: l.id, label: l.name }))}
                value={fromSubLocId}
                onChange={e => setFromSubLocId(e.target.value)}
                disabled={!fromMainLocId}
                />
            </div>

            <Select 
            label="Packing Type"
            options={availablePackingTypes.map(pt => ({ value: pt.id, label: pt.name }))}
            value={selectedPackingTypeId}
            onChange={handlePackingTypeChange}
            required
            />
            <Input label="Packing Qty" type="number" value={qty} onChange={e => handleQtyChange(e.target.value)} required />
            <Input label="Net Weight (KG)" type="number" value={weight} onChange={e => handleWeightChange(e.target.value)} required />
            
            {/* TO */}
            <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <h4 className="md:col-span-2 font-medium text-gray-500">To</h4>
                <Select 
                label="Main Location"
                options={getMainLocations().map(l => ({ value: l.id, label: l.name }))}
                value={toMainLocId}
                onChange={e => { setToMainLocId(e.target.value); setToSubLocId(''); }}
                required
                />
                <Select 
                label="Sub Location"
                options={toSubLocations.map(l => ({ value: l.id, label: l.name }))}
                value={toSubLocId}
                onChange={e => setToSubLocId(e.target.value)}
                disabled={!toMainLocId}
                />
            </div>

        </div>
        <div className="mt-4">
            <Input label="Remarks" value={remarks} onChange={e => setRemarks(e.target.value)} />
        </div>
        <div className="mt-4 flex justify-end">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">{editingId ? 'Update Transfer' : 'Transfer Stock'}</Button>
        </div>
        </form>

        {/* List of recent transactions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <h3 className="px-6 py-4 border-b border-gray-100 font-medium text-gray-700 bg-gray-50">Recent Stock Transfers</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Perfume</th>
                            <th className="px-6 py-3">Batch</th>
                            <th className="px-6 py-3 text-right">Weight</th>
                            <th className="px-6 py-3">From</th>
                            <th className="px-6 py-3">To</th>
                            <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {transferLogs.slice().reverse().slice(0, 10).map(log => {
                            const p = perfumes.find(x => x.id === log.perfumeId);
                            const fromLoc = locations.find(x => x.id === log.fromMainLocationId);
                            const toLoc = locations.find(x => x.id === log.toMainLocationId);
                            return (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-3">{log.date}</td>
                                    <td className="px-6 py-3 font-medium">{p?.name}</td>
                                    <td className="px-6 py-3 font-mono text-xs">{log.batchNumber}</td>
                                    <td className="px-6 py-3 text-right">{log.netWeight.toFixed(2)}</td>
                                    <td className="px-6 py-3 text-xs">{fromLoc?.name}</td>
                                    <td className="px-6 py-3 text-xs">{toLoc?.name}</td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEdit(log)} className="text-indigo-600 hover:text-indigo-900"><Pencil size={14}/></button>
                                            <button onClick={() => handleDelete(log.id)} className="text-red-600 hover:text-red-900"><Trash2 size={14}/></button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                        {transferLogs.length === 0 && <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-400">No transfers yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};
