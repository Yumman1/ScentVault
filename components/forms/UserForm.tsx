import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { User, UserRole } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Pencil, Trash2, X, ShieldCheck, Shield, Eye, Lock, MapPin, Check, Globe, UserPlus } from 'lucide-react';

export const UserForm = () => {
  const { users, updateUser, deleteUser, currentUser, getMainLocations } = useInventory();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initialForm: User = { 
    id: '', 
    name: '', 
    role: UserRole.Viewer,
    permissions: {
        canViewPrices: false,
        allowedLocationIds: []
    }
  };
  
  const [formData, setFormData] = useState<User>(initialForm);
  const [accessScope, setAccessScope] = useState<'all' | 'specific'>('all');

  const mainLocations = getMainLocations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const finalPermissions = { ...formData.permissions };

    if (formData.role === UserRole.Operator) {
        finalPermissions.canViewPrices = false;
        finalPermissions.allowedLocationIds = []; 
    } else if (formData.role === UserRole.Admin) {
        finalPermissions.canViewPrices = true;
        finalPermissions.allowedLocationIds = []; 
    } else if (formData.role === UserRole.Viewer) {
        if (accessScope === 'all') {
            finalPermissions.allowedLocationIds = [];
        } else {
            if (finalPermissions.allowedLocationIds.length === 0) {
                alert("Please select at least one location for Restricted access.");
                return;
            }
        }
    }

    const userData = { ...formData, permissions: finalPermissions };

    setSaving(true);
    try {
      await updateUser(editingId, { ...userData, id: editingId });
      setEditingId(null);
      setFormData(initialForm);
      setAccessScope('all');
      alert('User updated');
    } catch {
      alert('Could not save changes. Confirm you are signed in as an Admin and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: User) => {
    setFormData({
        ...item,
        permissions: {
            canViewPrices: item.permissions?.canViewPrices || false,
            allowedLocationIds: item.permissions?.allowedLocationIds || []
        }
    });
    
    const hasSpecificLocs = item.permissions?.allowedLocationIds && item.permissions.allowedLocationIds.length > 0;
    setAccessScope(hasSpecificLocs ? 'specific' : 'all');
    
    setEditingId(item.id);
  };

  const handleDelete = (id: string) => {
      if (id === currentUser?.id) {
          alert("You cannot delete yourself.");
          return;
      }
      if (window.confirm("User accounts are managed in Supabase. Open instructions?")) {
          deleteUser(id);
      }
  };

  const handleCancel = () => {
    setFormData(initialForm);
    setAccessScope('all');
    setEditingId(null);
  };

  const toggleLocation = (locId: string) => {
      const current = formData.permissions?.allowedLocationIds || [];
      const updated = current.includes(locId) 
        ? current.filter(id => id !== locId)
        : [...current, locId];
      
      setFormData({
          ...formData,
          permissions: {
              ...formData.permissions!,
              allowedLocationIds: updated
          }
      });
      
      if (accessScope === 'all') {
          setAccessScope('specific');
      }
  };

  return (
    <div className="space-y-8">
      <div className="p-6 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg border border-indigo-100 dark:border-indigo-900 flex gap-4 items-start">
        <UserPlus className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" size={22} />
        <div className="text-sm text-indigo-900 dark:text-indigo-200 space-y-2">
          <p className="font-semibold">Adding new logins</p>
          <p className="text-indigo-800/90 dark:text-indigo-300/90 leading-relaxed">
            New team members should use the <strong>Sign Up</strong> option on the login screen. After they verify email and sign in, they appear in the table below where you can set role and permissions.
            Promote your first administrator in the Supabase SQL editor if needed (see comments in <code className="text-xs bg-white/50 dark:bg-slate-900/50 px-1 rounded">.env.example</code>).
          </p>
        </div>
      </div>

      {editingId ? (
      <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 transition-colors">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Pencil size={20} className="text-indigo-600"/>
                Edit User Configuration
            </h3>
            <Button type="button" variant="secondary" onClick={handleCancel} className="text-xs flex items-center gap-1 dark:bg-slate-700 dark:hover:bg-slate-600"><X size={14}/> Cancel Edit</Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Input label="User Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          
          <Select 
            label="System Role" 
            options={Object.values(UserRole).map(t => ({ value: t, label: t }))}
            value={formData.role} 
            onChange={e => {
                const newRole = e.target.value as UserRole;
                setFormData({ ...formData, role: newRole });
                if (newRole !== UserRole.Viewer) setAccessScope('all');
            }} 
          />
        </div>

        {formData.role === UserRole.Viewer && (
            <div className="border border-indigo-100 dark:border-indigo-900 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm ring-1 ring-black/5">
                <div className="bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-950 dark:to-slate-900 px-4 py-3 border-b border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                        <Shield size={16} className="text-indigo-600 dark:text-indigo-400" /> 
                        Viewer Permissions
                    </h4>
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-indigo-200 dark:border-indigo-800 uppercase tracking-wide">Configuration</span>
                </div>
                
                <div className="p-6 space-y-8">
                    <div>
                        <h5 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-3">Financial Data Visibility</h5>
                        <div 
                            className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                                formData.permissions?.canViewPrices 
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 ring-1 ring-green-500/20' 
                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                            }`}
                            onClick={() => setFormData(prev => ({...prev, permissions: {...prev.permissions!, canViewPrices: !prev.permissions?.canViewPrices}}))}
                        >
                            <div className={`mt-0.5 p-2 rounded-full flex-shrink-0 ${formData.permissions?.canViewPrices ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500'}`}>
                                {formData.permissions?.canViewPrices ? <Check size={18} strokeWidth={3} /> : <Lock size={18} />}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">View Prices & Valuations</p>
                                    <div className={`w-11 h-6 rounded-full flex items-center transition-colors px-1 ${formData.permissions?.canViewPrices ? 'bg-green-500 justify-end' : 'bg-gray-300 dark:bg-slate-700 justify-start'}`}>
                                        <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                                    If enabled, this user can see unit prices (USD/PKR) and total stock valuations in dashboards and reports.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-slate-800"></div>

                    <div>
                        <h5 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-3">Location Access Scope</h5>
                        
                        <div className="flex flex-col sm:flex-row gap-4 mb-4">
                             <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                 accessScope === 'all'
                                 ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-500 relative shadow-sm' 
                                 : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                             }`}>
                                <input 
                                    type="radio" 
                                    name="locScope" 
                                    className="sr-only"
                                    checked={accessScope === 'all'}
                                    onChange={() => setAccessScope('all')}
                                />
                                <div className={`p-2 rounded-lg ${accessScope === 'all' ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}`}>
                                    <Globe size={20} />
                                </div>
                                <div>
                                    <span className={`block text-sm font-bold ${accessScope === 'all' ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-700 dark:text-slate-300'}`}>All Locations</span>
                                    <span className="block text-xs text-gray-500 dark:text-slate-500">Full access to all warehouses</span>
                                </div>
                                {accessScope === 'all' && <div className="absolute top-2 right-2 text-indigo-500"><Check size={16} /></div>}
                             </label>

                             <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                 accessScope === 'specific'
                                 ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-500 relative shadow-sm' 
                                 : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                             }`}>
                                <input 
                                    type="radio" 
                                    name="locScope" 
                                    className="sr-only"
                                    checked={accessScope === 'specific'}
                                    onChange={() => setAccessScope('specific')}
                                />
                                <div className={`p-2 rounded-lg ${accessScope === 'specific' ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}`}>
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <span className={`block text-sm font-bold ${accessScope === 'specific' ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-700 dark:text-slate-300'}`}>Restricted Access</span>
                                    <span className="block text-xs text-gray-500 dark:text-slate-500">Specific locations only</span>
                                </div>
                                {accessScope === 'specific' && <div className="absolute top-2 right-2 text-indigo-500"><Check size={16} /></div>}
                             </label>
                        </div>

                         <div className={`transition-all duration-300 ease-in-out ${accessScope === 'specific' ? 'opacity-100 max-h-96' : 'opacity-40 pointer-events-none max-h-96 blur-[1px]'}`}>
                              <div className="flex justify-between items-end mb-2">
                                 <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Select Permitted Locations</p>
                                 <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                                     {formData.permissions?.allowedLocationIds.length} Selected
                                 </span>
                              </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 overflow-y-auto max-h-60 p-1">
                                {mainLocations.map(loc => {
                                    const isSelected = formData.permissions?.allowedLocationIds.includes(loc.id);
                                    return (
                                         <div 
                                             key={loc.id}
                                             onClick={() => toggleLocation(loc.id)}
                                             className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors group ${
                                                 isSelected 
                                                 ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm' 
                                                 : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                                             }`}
                                         >
                                             <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 group-hover:border-indigo-400'}`}>
                                                 {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                                             </div>
                                             <span className={`text-sm font-medium ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-700 dark:text-slate-400'}`}>{loc.name}</span>
                                         </div>
                                    );
                                })}
                                 {mainLocations.length === 0 && (
                                     <div className="col-span-full p-4 text-center text-sm text-gray-500 dark:text-slate-500 bg-gray-50 dark:bg-slate-900 rounded border border-dashed border-gray-300 dark:border-slate-700">
                                         No locations defined in the system.
                                     </div>
                                 )}
                             </div>
                             {accessScope === 'specific' && formData.permissions?.allowedLocationIds.length === 0 && (
                                 <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                                     <X size={12}/> Please select at least one location.
                                 </p>
                             )}
                        </div>
                    </div>
                </div>
            </div>
        )}
        
         {formData.role === UserRole.Operator && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-lg border border-blue-100 dark:border-blue-900 flex items-start gap-3">
                 <Shield size={20} className="mt-0.5 flex-shrink-0" />
                 <div>
                     <p className="font-bold mb-1">Operator Role Configured</p>
                     <p>Operators have standard access to Transaction Forms (Gate In, Gate Out, Transfer) but cannot view sensitive Pricing or Valuation data. Location access is Global.</p>
                 </div>
             </div>
         )}

         <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700 flex justify-end">
           <Button type="submit" className="px-8" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
         </div>
       </form>
      ) : (
        <div className="p-8 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-gray-200 dark:border-slate-600 text-center text-gray-500 dark:text-slate-400 text-sm">
          Select <strong>Edit</strong> on a user in the table below to change their role or permissions.
        </div>
      )}
 
       <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden transition-colors">
         <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
              <h3 className="font-medium text-gray-700 dark:text-slate-200">System Users</h3>
              <span className="text-xs text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-gray-200 dark:border-slate-700">{users.length} Users</span>
         </div>
         <div className="overflow-x-auto">
             <table className="w-full text-sm text-left text-gray-700 dark:text-slate-300">
                 <thead className="text-xs text-gray-500 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700">
                    <tr>
                        <th className="px-6 py-3">User ID</th>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3">Permissions Scope</th>
                        <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                </thead>
                 <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                     {users.map(u => (
                         <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors">
                             <td className="px-6 py-3 font-mono text-xs text-gray-500 dark:text-slate-400">{u.id}</td>
                             <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">
                                <div className="flex items-center gap-3">
                                     <div className={`p-1.5 rounded-full ${
                                         u.role === UserRole.Admin ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 
                                         u.role === UserRole.Operator ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 
                                         'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                                     }`}>
                                         {u.role === UserRole.Admin ? <ShieldCheck size={16}/> : 
                                          u.role === UserRole.Operator ? <Shield size={16}/> : 
                                          <Eye size={16}/>}
                                     </div>
                                     <div>
                                         {u.name}
                                         {currentUser?.id === u.id && <span className="ml-2 text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800 font-semibold">YOU</span>}
                                     </div>
                                </div>
                            </td>
                            <td className="px-6 py-3">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border
                                    ${u.role === UserRole.Admin ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 
                                      u.role === UserRole.Operator ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                      'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                    {u.role}
                                </span>
                            </td>
                             <td className="px-6 py-3 text-xs text-gray-500 dark:text-slate-400">
                                {u.role === UserRole.Admin ? (
                                    <span className="text-indigo-600 font-medium">Full System Access</span>
                                ) : u.role === UserRole.Operator ? (
                                    <span className="text-blue-600">Transactions Only</span>
                                ) : (
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full ${u.permissions?.canViewPrices ? 'bg-green-500' : 'bg-red-400'}`}></span>
                                            Prices: {u.permissions?.canViewPrices ? 'Visible' : 'Hidden'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full ${!u.permissions?.allowedLocationIds.length ? 'bg-indigo-500' : 'bg-orange-400'}`}></span>
                                            Locations: {u.permissions?.allowedLocationIds.length ? `${u.permissions.allowedLocationIds.length} Restricted` : 'Global Access'}
                                        </div>
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-3 text-right">
                                 <div className="flex justify-end gap-2">
                                     <button type="button" onClick={() => handleEdit(u)} className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded transition-colors" title="Edit User">
                                         <Pencil size={16}/>
                                     </button>
                                     {u.id !== currentUser?.id && (
                                         <button type="button" onClick={() => handleDelete(u.id)} className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded transition-colors" title="Remove user (Supabase)">
                                             <Trash2 size={16}/>
                                         </button>
                                     )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
