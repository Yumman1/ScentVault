import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  MapPin, 
  FlaskConical, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ArrowRightLeft,
  FileText,
  ShieldCheck,
  Database,
  Tag
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { UserRole } from '../types';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const { currentUser } = useInventory();

  // Define full menu
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'General' },
    { id: 'reports', label: 'Reports & Export', icon: FileText, category: 'General' },
    
    // Master Data
    { id: 'perfumes', label: 'Perfume Master', icon: FlaskConical, category: 'Master Data' },
    { id: 'tags', label: 'Olfactive Notes', icon: Tag, category: 'Master Data' },
    { id: 'suppliers', label: 'Suppliers', icon: Users, category: 'Master Data' },
    { id: 'customers', label: 'Customers', icon: Users, category: 'Master Data' },
    { id: 'packing', label: 'Packing Types', icon: Package, category: 'Master Data' },
    { id: 'locations', label: 'Locations', icon: MapPin, category: 'Master Data' },
    
    // Transactions
    { id: 'gate-in', label: 'Gate In Log', icon: ArrowDownToLine, category: 'Transactions' },
    { id: 'gate-out', label: 'Gate Out Log', icon: ArrowUpFromLine, category: 'Transactions' },
    { id: 'transfer', label: 'Stock Transfer', icon: ArrowRightLeft, category: 'Transactions' },

    // System
    { id: 'users', label: 'User Management', icon: ShieldCheck, category: 'System' },
    { id: 'database', label: 'Database & Backup', icon: Database, category: 'System' },
  ];

  const canAccess = (itemId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === UserRole.Admin) return true;

    if (currentUser.role === UserRole.Operator) {
        // Operators can only do logistics transactions + dashboard
        return ['dashboard', 'gate-in', 'gate-out', 'transfer'].includes(itemId);
    }

    if (currentUser.role === UserRole.Viewer) {
        // Viewers are strictly restricted to analytics
        return ['dashboard', 'reports'].includes(itemId);
    }

    return false;
  };

  const visibleItems = menuItems.filter(item => canAccess(item.id));
  const categories = Array.from(new Set(visibleItems.map(item => item.category)));

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-full min-h-screen border-r border-slate-800">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-primary-600 p-2 rounded-lg shadow-lg shadow-primary-900/20">
            <FlaskConical size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tighter">SCENT<span className="text-primary-500">VAULT</span></h1>
        </div>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] ml-11">Enterprise Core</p>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {categories.map(category => (
          <div key={category} className="mb-6">
            <h3 className="px-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 opacity-50">
              {category}
            </h3>
            <ul className="space-y-1 px-4">
              {visibleItems.filter(i => i.category === category).map(item => {
                const isActive = currentView === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setView(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group ${
                        isActive 
                          ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' 
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      
      <div className="p-6 bg-slate-950/50 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-700">
            {currentUser?.name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200">{currentUser?.name || 'Anonymous'}</p>
            <p className="text-[10px] text-slate-500 font-medium">Role: {currentUser?.role || 'Guest'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};