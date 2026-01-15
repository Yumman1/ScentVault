import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { GateInLog, GateOutLog, StockTransferLog, GateOutUsage } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Pencil, Trash2, X, PlusCircle, History, ArrowRight, MapPin, Package, ArrowRightLeft, AlertTriangle } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- SHARED HOOK FOR CYCLICAL LOGIC ---
const useCyclicalWeight = (packingTypeId: string, packingTypes: any[]) => {
  const [qty, setQty] = useState<string>('');
  const [weight, setWeight] = useState<string>('');

  const packingType = packingTypes.find(pt => pt.id === packingTypeId);
  const unitQty = packingType ? Number(packingType.qtyPerPacking) : 0;

  const handleQtyChange = useCallback((val: string) => {
    setQty(val);
    const numVal = Number(val);
    if (unitQty && !isNaN(numVal) && val !== '') {
      setWeight((numVal * unitQty).toFixed(2));
    } else if (val === '') {
      setWeight('');
    }
  }, [unitQty]);

  const handleWeightChange = useCallback((val: string) => {
    setWeight(val);
    const numVal = Number(val);
    if (unitQty && !isNaN(numVal) && val !== '') {
      setQty((numVal / unitQty).toFixed(2));
    } else if (val === '') {
      setQty('');
    }
  }, [unitQty]);

  return { qty, weight, handleQtyChange, handleWeightChange, setQty, setWeight };
};

// --- GATE IN ---
export const GateInForm = () => {
  const { 
    perfumes, suppliers, packingTypes, 
    getMainLocations, getSubLocations, 
    addGateInLog, updateGateInLog, deleteGateInLog, 
    gateInLogs, hasPermission, locations
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

  const selectedPerfume = perfumes.find(p => p.id === selectedPerfumeId);
  const subLocations = useMemo(() => mainLocId ? getSubLocations(mainLocId) : [], [mainLocId, getSubLocations]);
  const canViewPrices = hasPermission('view_prices');

  useEffect(() => {
    if (selectedPerfume && !editingId) {
        setPriceUSD(selectedPerfume.priceUSD?.toString() || '');
        setPricePKR(selectedPerfume.pricePKR?.toString() || '');
    }
  }, [selectedPerfume, editingId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const logData: GateInLog = {
      id: editingId || generateId(),
      date, perfumeId: selectedPerfumeId, importReference: importRef,
      packingTypeId: selectedPackingTypeId, packingQty: Number(qty), netWeight: Number(weight),
      mainLocationId: mainLocId, subLocationId: subLocId || undefined, supplierInvoice: invoice, remarks,
      priceUSD: priceUSD ? Number(priceUSD) : undefined,
      pricePKR: pricePKR ? Number(pricePKR) : undefined
    };

    if (editingId) {
        updateGateInLog(editingId, logData);
        alert('Entry Updated');
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
  };

  const handleCancel = () => {
      setEditingId(null);
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
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-soft border border-slate-200 sticky top-24">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {editingId ? <Pencil size={18} className="text-primary-500" /> : <PlusCircle size={18} className="text-success" />}
                        {editingId ? 'Edit Entry' : 'Log Gate In'}
                    </h3>
                    {editingId && <button type="button" onClick={handleCancel} className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>}
                </div>

                <div className="space-y-1">
                    <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                    <Select 
                        label="Perfume"
                        options={perfumes.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
                        value={selectedPerfumeId}
                        onChange={e => setSelectedPerfumeId(e.target.value)}
                        required
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Batch #" value={importRef} onChange={e => setImportRef(e.target.value)} required />
                        <Select 
                            label="Packing"
                            options={packingTypes.map(pt => ({ value: pt.id, label: pt.name }))}
                            value={selectedPackingTypeId}
                            onChange={e => setSelectedPackingTypeId(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Packing Qty" type="number" value={qty} onChange={e => handleQtyChange(e.target.value)} required />
                        <Input label="Net Weight (KG)" type="number" step="0.01" value={weight} onChange={e => handleWeightChange(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
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
                    </div>
                    <Input label="Supplier Invoice #" value={invoice} onChange={e => setInvoice(e.target.value)} />
                    {canViewPrices && (
                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Price (USD)" type="number" step="0.01" value={priceUSD} onChange={e => setPriceUSD(e.target.value)} />
                            <Input label="Price (PKR)" type="number" step="0.01" value={pricePKR} onChange={e => setPricePKR(e.target.value)} />
                        </div>
                    )}
                    <Input label="Remarks" value={remarks} onChange={e => setRemarks(e.target.value)} />
                </div>

                <Button type="submit" className="w-full mt-4 py-3 shadow-lg shadow-primary-500/20">{editingId ? 'Update Record' : 'Log Movement'}</Button>
            </form>
        </div>

        <div className="xl:col-span-2">
            <div className="bg-white rounded-2xl shadow-soft border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><History size={16} /> Recent Movements</h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Log</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[11px] text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Item Details</th>
                                <th className="px-6 py-4">Batch</th>
                                <th className="px-6 py-4 text-right">Net Weight</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {gateInLogs.slice().reverse().slice(0, 15).map(log => {
                                const p = perfumes.find(x => x.id === log.perfumeId);
                                const loc = locations.find(x => x.id === log.mainLocationId);
                                return (
                                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">{log.date}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-800">{p?.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{p?.code}</div>
                                        </td>
                                        <td className="px-6 py-4"><span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">{log.importReference}</span></td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-success">{log.netWeight.toFixed(2)} kg</td>
                                        <td className="px-6 py-4 text-xs text-slate-500">{loc?.name}</td>
                                        <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(log)} className="p-1.5 text-slate-400 hover:text-primary-500 transition-colors"><Pencil size={14}/></button>
                                                <button onClick={() => deleteGateInLog(log.id)} className="p-1.5 text-slate-400 hover:text-accent transition-colors"><Trash2 size={14}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {gateInLogs.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No movements recorded yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
};

// --- GATE OUT (ISSUING) ---
export const GateOutForm = () => {
  const { 
    perfumes, packingTypes, customers, locations,
    getMainLocations, getSubLocations, 
    addGateOutLog, updateGateOutLog, deleteGateOutLog,
    gateOutLogs, getBatchStock 
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

  const availableBatches = useMemo(() => {
    return getBatchStock(selectedPerfumeId, mainLocId, subLocId || undefined, editingId || undefined);
  }, [selectedPerfumeId, mainLocId, subLocId, editingId, getBatchStock]);

  const subLocations = useMemo(() => mainLocId ? getSubLocations(mainLocId) : [], [mainLocId, getSubLocations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // VALIDATION: Check stock availability
    const selectedBatch = availableBatches.find(b => b.batch === batchNumber);
    if (!selectedBatch || Number(weight) > selectedBatch.weight) {
        alert(`Insufficient Stock! Available: ${selectedBatch?.weight.toFixed(2) || 0} kg. Requested: ${Number(weight).toFixed(2)} kg.`);
        return;
    }

    const logData: GateOutLog = {
      id: editingId || generateId(),
      date, perfumeId: selectedPerfumeId, packingTypeId: selectedPackingTypeId, 
      packingQty: Number(qty), netWeight: Number(weight), mainLocationId: mainLocId, 
      subLocationId: subLocId || undefined, usage, customerId: usage === GateOutUsage.Sale ? customerId : undefined, 
      remarks, batchNumber
    };

    if (editingId) {
        updateGateOutLog(editingId, logData);
        alert('Entry Updated');
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
      setSubLocId(log.subLocationId || '');
      setBatchNumber(log.batchNumber);
      setSelectedPackingTypeId(log.packingTypeId);
      setQty(log.packingQty.toString());
      setWeight(log.netWeight.toString());
      setUsage(log.usage);
      setCustomerId(log.customerId || '');
      setRemarks(log.remarks);
  };

  const handleCancel = () => {
    setEditingId(null);
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
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-soft border border-slate-200 sticky top-24">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {editingId ? <Pencil size={18} className="text-primary-500" /> : <PlusCircle size={18} className="text-accent" />}
                        {editingId ? 'Edit Issue' : 'Log Gate Out'}
                    </h3>
                    {editingId && <button type="button" onClick={handleCancel} className="text-xs font-semibold text-slate-400 hover:text-slate-600">Cancel</button>}
                </div>

                <div className="space-y-1">
                    <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                    <Select 
                        label="Perfume"
                        options={perfumes.map(p => ({ value: p.id, label: p.name }))}
                        value={selectedPerfumeId}
                        onChange={e => { setSelectedPerfumeId(e.target.value); setBatchNumber(''); }}
                        required
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Select 
                            label="From Location"
                            options={getMainLocations().map(l => ({ value: l.id, label: l.name }))}
                            value={mainLocId}
                            onChange={e => { setMainLocId(e.target.value); setSubLocId(''); setBatchNumber(''); }}
                            required
                        />
                        <Select 
                            label="Sub Location"
                            options={subLocations.map(l => ({ value: l.id, label: l.name }))}
                            value={subLocId}
                            onChange={e => { setSubLocId(e.target.value); setBatchNumber(''); }}
                            disabled={!mainLocId}
                        />
                    </div>
                    <Select 
                        label="Available Batch"
                        options={availableBatches.map(b => ({ value: b.batch, label: `${b.batch} (${b.weight.toFixed(2)} kg here)` }))}
                        value={batchNumber}
                        onChange={e => {
                            setBatchNumber(e.target.value);
                            const b = availableBatches.find(x => x.batch === e.target.value);
                            if (b) {
                                setWeight(b.weight.toFixed(2));
                                const pt = packingTypes.find(x => x.id === selectedPackingTypeId);
                                if (pt?.qtyPerPacking) setQty((b.weight / pt.qtyPerPacking).toFixed(2));
                            }
                        }}
                        required
                        disabled={!selectedPerfumeId || !mainLocId}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Select 
                            label="Packing"
                            options={packingTypes.map(pt => ({ value: pt.id, label: pt.name }))}
                            value={selectedPackingTypeId}
                            onChange={e => setSelectedPackingTypeId(e.target.value)}
                            required
                        />
                         <Input label="Net Weight (KG)" type="number" step="0.01" value={weight} onChange={e => handleWeightChange(e.target.value)} required />
                    </div>
                    <Input label="Packing Qty" type="number" value={qty} onChange={e => handleQtyChange(e.target.value)} required />
                    
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        <Select label="Usage" options={Object.values(GateOutUsage).map(u => ({ value: u, label: u }))} value={usage} onChange={e => setUsage(e.target.value as GateOutUsage)} />
                        {usage === GateOutUsage.Sale && (
                            <Select label="Customer" options={customers.map(c => ({ value: c.id, label: c.name }))} value={customerId} onChange={e => setCustomerId(e.target.value)} required />
                        )}
                    </div>
                </div>

                <Button type="submit" variant="primary" className="w-full mt-6 bg-accent hover:bg-rose-600 shadow-rose-500/20">{editingId ? 'Update Issue' : 'Issue Stock'}</Button>
            </form>
        </div>

        <div className="xl:col-span-2">
            <div className="bg-white rounded-2xl shadow-soft border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-slate-700">Outbound History</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[11px] text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Item</th>
                                <th className="px-6 py-4">Batch</th>
                                <th className="px-6 py-4 text-right">Net Weight</th>
                                <th className="px-6 py-4">Destination</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {gateOutLogs.slice().reverse().slice(0, 15).map(log => {
                                const p = perfumes.find(x => x.id === log.perfumeId);
                                const cust = customers.find(c => c.id === log.customerId);
                                return (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">{log.date}</td>
                                        <td className="px-6 py-4 font-semibold text-slate-800">{p?.name}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{log.batchNumber}</td>
                                        <td className="px-6 py-4 text-right font-bold text-accent">{log.netWeight.toFixed(2)} kg</td>
                                        <td className="px-6 py-4 text-xs font-medium text-slate-500">{log.usage === 'Sale' ? cust?.name : log.usage}</td>
                                        <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(log)} className="p-1.5 text-slate-400 hover:text-primary-500"><Pencil size={14}/></button>
                                                <button onClick={() => deleteGateOutLog(log.id)} className="p-1.5 text-slate-400 hover:text-accent"><Trash2 size={14}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
};

// --- STOCK TRANSFER ---
export const StockTransferForm = () => {
  const { 
    perfumes, packingTypes, locations,
    getMainLocations, getSubLocations, 
    addTransferLog, updateTransferLog, deleteTransferLog,
    transferLogs, getBatchStock 
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

  const availableBatches = useMemo(() => {
    return getBatchStock(selectedPerfumeId, fromMainLocId, fromSubLocId || undefined, editingId || undefined);
  }, [selectedPerfumeId, fromMainLocId, fromSubLocId, editingId, getBatchStock]);

  const fromSubLocations = useMemo(() => fromMainLocId ? getSubLocations(fromMainLocId) : [], [fromMainLocId, getSubLocations]);
  const toSubLocations = useMemo(() => toMainLocId ? getSubLocations(toMainLocId) : [], [toMainLocId, getSubLocations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (fromMainLocId === toMainLocId && fromSubLocId === toSubLocId) {
        alert("Error: Origin and Destination must be different.");
        return;
    }

    // VALIDATION: Check stock availability at origin
    const selectedBatch = availableBatches.find(b => b.batch === batchNumber);
    if (!selectedBatch || Number(weight) > selectedBatch.weight) {
        alert(`Transfer Blocked! Available at origin: ${selectedBatch?.weight.toFixed(2) || 0} kg. Requested: ${Number(weight).toFixed(2)} kg.`);
        return;
    }

    const logData: StockTransferLog = {
      id: editingId || generateId(),
      date, perfumeId: selectedPerfumeId, packingTypeId: selectedPackingTypeId, 
      packingQty: Number(qty), netWeight: Number(weight), 
      fromMainLocationId: fromMainLocId, fromSubLocationId: fromSubLocId || undefined,
      toMainLocationId: toMainLocId, toSubLocationId: toSubLocId || undefined,
      remarks, batchNumber
    };

    if (editingId) {
        updateTransferLog(editingId, logData);
        alert('Transfer Updated');
        handleCancel();
    } else {
        addTransferLog(logData);
        alert('Stock Transferred Successfully');
        setQty(''); setWeight(''); setBatchNumber(''); setRemarks('');
    }
  };

  const handleEdit = (log: StockTransferLog) => {
      setEditingId(log.id);
      setDate(log.date);
      setSelectedPerfumeId(log.perfumeId);
      setFromMainLocId(log.fromMainLocationId);
      setFromSubLocId(log.fromSubLocationId || '');
      setToMainLocId(log.toMainLocationId);
      setToSubLocId(log.toSubLocationId || '');
      setBatchNumber(log.batchNumber);
      setSelectedPackingTypeId(log.packingTypeId);
      setQty(log.packingQty.toString());
      setWeight(log.netWeight.toString());
      setRemarks(log.remarks);
  };

  const handleCancel = () => {
    setEditingId(null);
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

  const getLocName = (id?: string) => locations.find(l => l.id === id)?.name || '-';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] shadow-soft border border-slate-200 sticky top-24">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-indigo-50 text-indigo-600`}>
                            {editingId ? <Pencil size={20} /> : <ArrowRightLeft size={20} />}
                        </div>
                        {editingId ? 'Modify Transfer' : 'Internal Transfer'}
                    </h3>
                    {editingId && <button type="button" onClick={handleCancel} className="text-xs font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest">Cancel</button>}
                </div>

                <div className="space-y-4">
                    <Input label="Transfer Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                    <Select 
                        label="Perfume Asset"
                        options={perfumes.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
                        value={selectedPerfumeId}
                        onChange={e => { setSelectedPerfumeId(e.target.value); setBatchNumber(''); }}
                        required
                    />

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                           <MapPin size={10} /> Origin Warehouse
                        </p>
                        <Select 
                            label="From Main Location"
                            options={getMainLocations().map(l => ({ value: l.id, label: l.name }))}
                            value={fromMainLocId}
                            onChange={e => { setFromMainLocId(e.target.value); setFromSubLocId(''); setBatchNumber(''); }}
                            required
                        />
                        <Select 
                            label="From Sub Location"
                            options={fromSubLocations.map(l => ({ value: l.id, label: l.name }))}
                            value={fromSubLocId}
                            onChange={e => { setFromSubLocId(e.target.value); setBatchNumber(''); }}
                            disabled={!fromMainLocId}
                        />
                    </div>

                    <Select 
                        label="Batch to Move"
                        options={availableBatches.map(b => ({ value: b.batch, label: `${b.batch} (${b.weight.toFixed(2)} kg here)` }))}
                        value={batchNumber}
                        onChange={e => {
                            setBatchNumber(e.target.value);
                            const b = availableBatches.find(x => x.batch === e.target.value);
                            if (b) {
                                setWeight(b.weight.toFixed(2));
                                const pt = packingTypes.find(x => x.id === selectedPackingTypeId);
                                if (pt?.qtyPerPacking) setQty((b.weight / pt.qtyPerPacking).toFixed(2));
                            }
                        }}
                        required
                        disabled={!selectedPerfumeId || !fromMainLocId}
                    />

                    <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 space-y-3">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                           <MapPin size={10} /> Destination Hub
                        </p>
                        <Select 
                            label="To Main Location"
                            options={getMainLocations().map(l => ({ value: l.id, label: l.name }))}
                            value={toMainLocId}
                            onChange={e => { setToMainLocId(e.target.value); setToSubLocId(''); }}
                            required
                        />
                        <Select 
                            label="To Sub Location"
                            options={toSubLocations.map(l => ({ value: l.id, label: l.name }))}
                            value={toSubLocId}
                            onChange={e => setToSubLocId(e.target.value)}
                            disabled={!toMainLocId}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Select 
                            label="Unit Packing"
                            options={packingTypes.map(pt => ({ value: pt.id, label: pt.name }))}
                            value={selectedPackingTypeId}
                            onChange={e => setSelectedPackingTypeId(e.target.value)}
                            required
                        />
                        <Input label="Net Weight (KG)" type="number" step="0.01" value={weight} onChange={e => handleWeightChange(e.target.value)} required />
                    </div>
                    <Input label="Packing Quantity" type="number" value={qty} onChange={e => handleQtyChange(e.target.value)} required />
                    <Input label="Move Remarks" value={remarks} onChange={e => setRemarks(e.target.value)} />
                </div>

                <Button type="submit" className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 font-black tracking-widest uppercase text-xs">Execute Transfer</Button>
            </form>
        </div>

        <div className="xl:col-span-2 space-y-8">
            <div className="bg-white rounded-[2.5rem] shadow-soft border border-slate-200 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-black text-slate-900 text-lg">Transfer Logistics Record</h3>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global History</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-slate-400 uppercase tracking-[0.2em] bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-6">Timeline</th>
                                <th className="px-8 py-6">Asset & Batch</th>
                                <th className="px-8 py-6">Movement Logic</th>
                                <th className="px-8 py-6 text-right">Net Load</th>
                                <th className="px-8 py-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transferLogs.slice().reverse().slice(0, 15).map(log => {
                                const p = perfumes.find(x => x.id === log.perfumeId);
                                return (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-all group">
                                        <td className="px-8 py-6 text-slate-400 font-mono text-[10px] font-bold">{log.date}</td>
                                        <td className="px-8 py-6">
                                            <div className="font-black text-slate-800">{p?.name}</div>
                                            <div className="text-[10px] text-indigo-500 font-bold font-mono mt-1 uppercase">Batch: {log.batchNumber}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                                <div className="px-2 py-1 bg-slate-100 rounded-lg">{getLocName(log.fromMainLocationId)}</div>
                                                <ArrowRight size={14} className="text-slate-300" />
                                                <div className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg">{getLocName(log.toMainLocationId)}</div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right font-black text-slate-900">{log.netWeight.toFixed(2)} <span className="text-slate-400 text-[10px] font-normal">kg</span></td>
                                        <td className="px-8 py-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(log)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-500 transition-all"><Pencil size={14}/></button>
                                                <button onClick={() => deleteTransferLog(log.id)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-500 hover:border-rose-500 transition-all"><Trash2 size={14}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {transferLogs.length === 0 && (
                                <tr><td colSpan={5} className="px-8 py-32 text-center text-slate-300 font-bold italic text-lg">No stock transfers recorded in the ledger.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
};