import React, { useState } from 'react';
import { v4 as generateId } from 'uuid';
import { useInventory } from '../../context/InventoryContext';
import { SupplierType, LocationType, Supplier, Customer, PackingType, Location } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Pencil, Trash2, X } from 'lucide-react';
import { ConfirmationModal } from '../ui/ConfirmationModal';

// --- SUPPLIER FORM ---
export const SupplierForm = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useInventory();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  
  const initialForm = { name: '', contactPerson: '', type: SupplierType.Local, phone: '', email: '' };
  const [formData, setFormData] = useState(initialForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateSupplier(editingId, { ...formData, id: editingId });
      setEditingId(null);
      alert('Supplier Updated');
    } else {
      addSupplier({ ...formData, id: generateId() });
      alert('Supplier Added');
    }
    setFormData(initialForm);
  };

  const handleEdit = (item: Supplier) => {
    setFormData(item);
    setEditingId(item.id);
  };

  const handleCancel = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  return (
    <>
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 transition-colors">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">{editingId ? 'Edit Supplier' : 'New Supplier'}</h3>
            {editingId && <Button type="button" variant="secondary" onClick={handleCancel} className="text-xs flex items-center gap-1"><X size={14}/> Cancel Edit</Button>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Contact Person" value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} />
          <Select 
            label="Supplier Type" 
            options={Object.values(SupplierType).map(t => ({ value: t, label: t }))}
            value={formData.type} 
            onChange={e => setFormData({ ...formData, type: e.target.value as SupplierType })} 
          />
          <Input label="Phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit">{editingId ? 'Update Supplier' : 'Save Supplier'}</Button>
        </div>
      </form>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden transition-colors">
        <h3 className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 font-medium text-gray-700 dark:text-slate-200 bg-gray-50 dark:bg-slate-900/50">Registered Suppliers</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700 dark:text-slate-300">
                <thead className="text-xs text-gray-500 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700">
                    <tr>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Contact</th>
                        <th className="px-6 py-3">Phone</th>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {suppliers.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{s.name}</td>
                            <td className="px-6 py-3"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{s.type}</span></td>
                            <td className="px-6 py-3">{s.contactPerson}</td>
                            <td className="px-6 py-3">{s.phone}</td>
                            <td className="px-6 py-3">{s.email}</td>
                             <td className="px-6 py-3 text-right">
                                <div className="flex justify-end gap-3">
                                    <button onClick={() => handleEdit(s)} className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-bold flex items-center gap-1 group">
                                        <Pencil size={14} className="group-hover:scale-110 transition-transform"/> Edit
                                    </button>
                                    <button onClick={() => setDeleteTarget(s.id)} className="text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 group">
                                        <Trash2 size={14} className="group-hover:scale-110 transition-transform"/> Delete
                                    </button>
                                </div>
                             </td>
                        </tr>
                    ))}
                    {suppliers.length === 0 && <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-400">No suppliers found.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>
    </div>
    <ConfirmationModal 
      isOpen={!!deleteTarget}
      title="Delete Supplier Record"
      message="This will permanently remove this supplier from the system. This can ONLY be performed if there are no perfumes linked to this supplier."
      confirmText="Delete Supplier"
      type="danger"
      onConfirm={() => {
        if (deleteSupplier(deleteTarget!)) {
          setDeleteTarget(null);
        }
      }}
      onCancel={() => setDeleteTarget(null)}
    />
    </>
  );
};

// --- CUSTOMER FORM ---
export const CustomerForm = () => {
  const { customers, addCustomer, updateCustomer } = useInventory();
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialForm = { name: '', address: '', phone: '', email: '' };
  const [formData, setFormData] = useState(initialForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        updateCustomer(editingId, { ...formData, id: editingId });
        setEditingId(null);
        alert('Customer Updated');
    } else {
        addCustomer({ ...formData, id: generateId() });
        alert('Customer Added');
    }
    setFormData(initialForm);
  };

  const handleEdit = (item: Customer) => {
    setFormData(item);
    setEditingId(item.id);
  };

  const handleCancel = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 transition-colors">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">{editingId ? 'Edit Customer' : 'New Customer'}</h3>
            {editingId && <Button type="button" variant="secondary" onClick={handleCancel} className="text-xs flex items-center gap-1"><X size={14}/> Cancel Edit</Button>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
          <Input label="Phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit">{editingId ? 'Update Customer' : 'Save Customer'}</Button>
        </div>
      </form>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden transition-colors">
        <h3 className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 font-medium text-gray-700 dark:text-slate-200 bg-gray-50 dark:bg-slate-900/50">Registered Customers</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700 dark:text-slate-300">
                <thead className="text-xs text-gray-500 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700">
                    <tr>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Address</th>
                        <th className="px-6 py-3">Phone</th>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {customers.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{c.name}</td>
                            <td className="px-6 py-3">{c.address}</td>
                            <td className="px-6 py-3">{c.phone}</td>
                            <td className="px-6 py-3">{c.email}</td>
                            <td className="px-6 py-3 text-right">
                                <button onClick={() => handleEdit(c)} className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-bold flex items-center gap-1 justify-end w-full">
                                    <Pencil size={14}/> Edit
                                </button>
                            </td>
                        </tr>
                    ))}
                    {customers.length === 0 && <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-400">No customers found.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

// --- PACKING TYPE FORM ---
export const PackingTypeForm = () => {
  const { packingTypes, addPackingType, updatePackingType } = useInventory();
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialForm = { name: '', qtyPerPacking: '' };
  const [formData, setFormData] = useState(initialForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
        name: formData.name, 
        qtyPerPacking: Number(formData.qtyPerPacking)
    };

    if (editingId) {
        updatePackingType(editingId, { ...data, id: editingId });
        setEditingId(null);
        alert('Packing Type Updated');
    } else {
        addPackingType({ ...data, id: generateId() });
        alert('Packing Type Added');
    }
    setFormData(initialForm);
  };

  const handleEdit = (item: PackingType) => {
    setFormData({
        name: item.name,
        qtyPerPacking: item.qtyPerPacking.toString()
    });
    setEditingId(item.id);
  };

  const handleCancel = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 transition-colors">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">{editingId ? 'Edit Packing Type' : 'New Packing Type'}</h3>
            {editingId && <Button type="button" variant="secondary" onClick={handleCancel} className="text-xs flex items-center gap-1"><X size={14}/> Cancel Edit</Button>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Packing Type Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          <Input 
            label="Qty per Packing" 
            type="number" 
            value={formData.qtyPerPacking} 
            onChange={e => setFormData({ ...formData, qtyPerPacking: e.target.value })} 
            placeholder="e.g., 200 (for 200kg drum)"
            required 
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit">{editingId ? 'Update Packing Type' : 'Save Packing Type'}</Button>
        </div>
      </form>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden transition-colors">
        <h3 className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 font-medium text-gray-700 dark:text-slate-200 bg-gray-50 dark:bg-slate-900/50">Registered Packing Types</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700 dark:text-slate-300">
                <thead className="text-xs text-gray-500 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700">
                    <tr>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Standard Qty</th>
                        <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {packingTypes.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{p.name}</td>
                            <td className="px-6 py-3 font-mono">{p.qtyPerPacking}</td>
                            <td className="px-6 py-3 text-right">
                                <button onClick={() => handleEdit(p)} className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-bold flex items-center gap-1 justify-end w-full">
                                    <Pencil size={14}/> Edit
                                </button>
                            </td>
                        </tr>
                    ))}
                    {packingTypes.length === 0 && <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-400">No packing types defined.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

// --- LOCATION FORM ---
export const LocationForm = () => {
  const { locations, addLocation, updateLocation, deleteLocation, getMainLocations } = useInventory();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const initialForm = { name: '', type: LocationType.Main, parentId: '' };
  const [formData, setFormData] = useState(initialForm);

  const mainLocations = getMainLocations();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { 
        name: formData.name, 
        type: formData.type, 
        parentId: formData.type === LocationType.Sub ? formData.parentId : undefined 
    };

    if (editingId) {
        updateLocation(editingId, { ...data, id: editingId });
        setEditingId(null);
        alert('Location Updated');
    } else {
        addLocation({ ...data, id: generateId() });
        alert('Location Added');
    }
    setFormData(initialForm);
  };

  const handleEdit = (item: Location) => {
    setFormData({
        name: item.name,
        type: item.type,
        parentId: item.parentId || ''
    });
    setEditingId(item.id);
  };

  const handleCancel = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  return (
    <>
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 transition-colors">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">{editingId ? 'Edit Location' : 'New Location'}</h3>
            {editingId && <Button type="button" variant="secondary" onClick={handleCancel} className="text-xs flex items-center gap-1"><X size={14}/> Cancel Edit</Button>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Location Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          <Select 
            label="Location Type" 
            options={Object.values(LocationType).map(t => ({ value: t, label: t }))}
            value={formData.type} 
            onChange={e => setFormData({ ...formData, type: e.target.value as LocationType })} 
          />
          {formData.type === LocationType.Sub && (
            <Select 
              label="Link to Main Location" 
              options={mainLocations.map(l => ({ value: l.id, label: l.name }))}
              value={formData.parentId} 
              onChange={e => setFormData({ ...formData, parentId: e.target.value })} 
              required
            />
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit">{editingId ? 'Update Location' : 'Save Location'}</Button>
        </div>
      </form>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden transition-colors">
        <h3 className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 font-medium text-gray-700 dark:text-slate-200 bg-gray-50 dark:bg-slate-900/50">Registered Locations</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700 dark:text-slate-300">
                <thead className="text-xs text-gray-500 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700">
                    <tr>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Parent Location</th>
                        <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {mainLocations.map(main => (
                        <React.Fragment key={main.id}>
                            {/* Main Location Row */}
                            <tr className="bg-gray-50/50 dark:bg-slate-900/20 hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors">
                                <td className="px-6 py-4 font-black text-gray-900 dark:text-white">{main.name}</td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Main Hub</span>
                                </td>
                                <td className="px-6 py-4 text-gray-400 font-bold text-[10px] uppercase tracking-tighter">-</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-3">
                                        <button onClick={() => handleEdit(main)} className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-bold flex items-center gap-1 text-xs">
                                            <Pencil size={12}/> Edit
                                        </button>
                                        <button onClick={() => setDeleteTarget(main.id)} className="text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 text-xs group">
                                            <Trash2 size={12} className="group-hover:scale-110 transition-transform"/> Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            {/* Sub Locations under this Main */}
                            {locations.filter(sub => sub.parentId === main.id).map(sub => (
                                <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors border-l-4 border-primary-500/20 dark:border-primary-500/10">
                                    <td className="px-6 py-3 pl-12 font-medium text-gray-700 dark:text-slate-300 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                                        {sub.name}
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">Sub Zone</span>
                                    </td>
                                    <td className="px-6 py-3 text-gray-400 text-xs italic">{main.name}</td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-3">
                                            <button onClick={() => handleEdit(sub)} className="text-slate-400 dark:text-slate-500 hover:text-primary-500 dark:hover:text-primary-400 font-bold flex items-center gap-1 text-xs">
                                                <Pencil size={12}/> Edit
                                            </button>
                                            <button onClick={() => setDeleteTarget(sub.id)} className="text-rose-400 hover:text-rose-600 font-bold flex items-center gap-1 text-xs group">
                                                <Trash2 size={12} className="group-hover:scale-110 transition-transform"/> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                    {locations.length === 0 && <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-400">No locations defined.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>
    </div>
    <ConfirmationModal 
      isOpen={!!deleteTarget}
      title="Delete Location Record"
      message="This will permanently remove this location from the system. This can ONLY be performed if there is no movement history linked to this location and (for Main Hubs) no sub-zones remain."
      confirmText="Delete Location"
      type="danger"
      onConfirm={() => {
        if (deleteLocation(deleteTarget!)) {
          setDeleteTarget(null);
        }
      }}
      onCancel={() => setDeleteTarget(null)}
    />
    </>
  );
};