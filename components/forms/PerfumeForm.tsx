import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Pencil, X, AlertCircle } from 'lucide-react';
import { Perfume } from '../../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const PerfumeMasterForm = () => {
  const { addPerfume, updatePerfume, perfumes, suppliers } = useInventory();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initialForm = {
    name: '', code: '', supplierId: '', dosage: '', 
    priceUSD: '', pricePKR: '', lowStockAlert: '', remarks: ''
  };
  const [formData, setFormData] = useState(initialForm);
  
  // Tag system state
  const [currentTag, setCurrentTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  // Simulated list of existing tags in the system
  const [existingTags, setExistingTags] = useState<string[]>(['Fruity', 'Floral', 'Oud', 'Woody', 'Citrus']);

  const handleAddTag = () => {
    if (!currentTag.trim()) return;
    if (!tags.includes(currentTag)) {
      setTags([...tags, currentTag]);
      // If tag is new to system, add to existing (simulation)
      if (!existingTags.includes(currentTag)) {
        setExistingTags([...existingTags, currentTag]);
      }
    }
    setCurrentTag('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation: Check for duplicate code
    const duplicateCode = perfumes.find(p => 
      p.code.toLowerCase() === formData.code.toLowerCase() && p.id !== editingId
    );

    if (duplicateCode) {
      setError(`Error: Perfume code '${formData.code}' already exists. Please use a unique code.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const perfumeData = {
      name: formData.name,
      code: formData.code,
      supplierId: formData.supplierId,
      dosage: Number(formData.dosage),
      priceUSD: Number(formData.priceUSD),
      pricePKR: Number(formData.pricePKR),
      lowStockAlert: Number(formData.lowStockAlert),
      olfactiveNotes: tags,
      remarks: formData.remarks
    };

    if (editingId) {
      updatePerfume(editingId, { ...perfumeData, id: editingId });
      setEditingId(null);
      alert('Perfume Updated');
    } else {
      addPerfume({ ...perfumeData, id: generateId() });
      alert('Perfume Added to Master List');
    }
    
    // Reset
    setFormData(initialForm);
    setTags([]);
    setError(null);
  };

  const handleEdit = (perfume: Perfume) => {
    setError(null);
    setFormData({
      name: perfume.name,
      code: perfume.code,
      supplierId: perfume.supplierId,
      dosage: perfume.dosage.toString(),
      priceUSD: perfume.priceUSD.toString(),
      pricePKR: perfume.pricePKR.toString(),
      lowStockAlert: perfume.lowStockAlert.toString(),
      remarks: perfume.remarks
    });
    setTags(perfume.olfactiveNotes || []);
    setEditingId(perfume.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setFormData(initialForm);
    setTags([]);
    setEditingId(null);
    setError(null);
  };

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">{editingId ? 'Edit Perfume' : 'New Perfume'}</h3>
            {editingId && <Button type="button" variant="secondary" onClick={handleCancel} className="text-xs flex items-center gap-1"><X size={14}/> Cancel Edit</Button>}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start gap-2 rounded-r">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Validation Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Perfume Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Perfume Code" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} required />
          <Select 
            label="Supplier" 
            options={suppliers.map(s => ({ value: s.id, label: s.name }))}
            value={formData.supplierId}
            onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
            required
          />
          <Input 
            label="Dosage (%)" type="number" step="0.01" 
            value={formData.dosage} onChange={e => setFormData({ ...formData, dosage: e.target.value })} 
          />
          <Input 
            label="Price (USD)" type="number" step="0.01" 
            value={formData.priceUSD} onChange={e => setFormData({ ...formData, priceUSD: e.target.value })} 
          />
          <Input 
            label="Price (PKR)" type="number" step="0.01" 
            value={formData.pricePKR} onChange={e => setFormData({ ...formData, pricePKR: e.target.value })} 
          />
          <Input 
            label="Low Stock Alert (KG)" type="number" 
            value={formData.lowStockAlert} onChange={e => setFormData({ ...formData, lowStockAlert: e.target.value })} 
          />
        </div>

        {/* Tags Section */}
        <div className="mt-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Olfactive Notes (Tags)</label>
          <div className="flex gap-2 mb-2">
            <input 
              list="tag-suggestions"
              className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md"
              value={currentTag}
              onChange={e => setCurrentTag(e.target.value)}
              placeholder="Type or select a tag..."
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            />
            <datalist id="tag-suggestions">
              {existingTags.map(tag => <option key={tag} value={tag} />)}
            </datalist>
            <Button type="button" onClick={handleAddTag} variant="secondary">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span key={tag} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="text-indigo-600 hover:text-indigo-900 font-bold">&times;</button>
              </span>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
          <textarea 
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
            value={formData.remarks}
            onChange={e => setFormData({ ...formData, remarks: e.target.value })}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit">{editingId ? 'Update Perfume' : 'Save Perfume'}</Button>
        </div>
      </form>

      {/* Perfume List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <h3 className="px-6 py-4 border-b border-gray-100 font-medium text-gray-700 bg-gray-50">Perfume Master List</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                        <th className="px-6 py-3">Code</th>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Supplier</th>
                        <th className="px-6 py-3">Olfactive Notes</th>
                        <th className="px-6 py-3 text-right">Dosage (%)</th>
                        <th className="px-6 py-3 text-right">Price (USD)</th>
                        <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {perfumes.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium text-gray-900">{p.code}</td>
                            <td className="px-6 py-3 font-medium">{p.name}</td>
                            <td className="px-6 py-3">{getSupplierName(p.supplierId)}</td>
                            <td className="px-6 py-3">
                              <div className="flex flex-wrap gap-1">
                                {p.olfactiveNotes.map((note, idx) => (
                                  <span key={idx} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{note}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-right">{p.dosage}%</td>
                            <td className="px-6 py-3 text-right">${p.priceUSD.toFixed(2)}</td>
                            <td className="px-6 py-3 text-right">
                                <button onClick={() => handleEdit(p)} className="text-indigo-600 hover:text-indigo-900 font-medium flex items-center gap-1 justify-end w-full">
                                    <Pencil size={14}/> Edit
                                </button>
                            </td>
                        </tr>
                    ))}
                    {perfumes.length === 0 && <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-400">No perfumes defined.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};