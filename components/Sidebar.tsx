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
  ShieldCheck
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
    
    // Admin only usually
    { id: 'users', label: 'Users', icon: ShieldCheck, category: 'System Forms' },
    { id: 'suppliers', label: 'Suppliers', icon: Users, category: 'System Forms' },
    { id: 'customers', label: 'Customers', icon: Users, category: 'System Forms' },
    { id: 'packing', label: 'Packing Types', icon: Package, category: 'System Forms' },
    { id: 'locations', label: 'Locations', icon: MapPin, category: 'System Forms' },
    
    // Transactions
    { id: 'perfumes', label: 'Perfume Master', icon: FlaskConical, category: 'Transactions' },
    { id: 'gate-in', label: 'Gate In Log', icon: ArrowDownToLine, category: 'Transactions' },
    { id: 'gate-out', label: 'Gate Out Log', icon: ArrowUpFromLine, category: 'Transactions' },
    { id: 'transfer', label: 'Stock Transfer', icon: ArrowRightLeft, category: 'Transactions' },
  ];

  const canAccess = (itemId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === UserRole.Admin) return true;

    if (currentUser.role === UserRole.Operator) {
        // Operators: Dashboard (Stock view), Gate In, Gate Out, Transfer. 
        // Cannot access Master Forms (Suppliers, Perfumes etc) or Reports (per spec strictness, though mostly reports are read only).
        // Prompt says: "Operator: Can do Gate in and Gate out"
        return ['dashboard', 'gate-in', 'gate-out', 'transfer'].includes(itemId);
    }

    if (currentUser.role === UserRole.Viewer) {
        // Viewer: Dashboard, Reports. No forms.
        return ['dashboard', 'reports'].includes(itemId);
    }

    return false;
  };

  const visibleItems = menuItems.filter(item => canAccess(item.id));
  const categories = Array.from(new Set(visibleItems.map(item => item.category)));

  return (
    <div className="w-64 bg-slate-800 text-white flex flex-col h-full min-h-screen">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold flex items-center gap-2">
           <FlaskConical className="text-pink-400" /> ScentVault
        </h1>
        <p className="text-xs text-slate-400 mt-1">Inventory Management</p>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {categories.map(category => (
          <div key={category} className="mb-6">
            <h3 className="px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {category}
            </h3>
            <ul>
              {visibleItems.filter(i => i.category === category).map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => setView(item.id)}
                    className={`w-full flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                      currentView === item.id 
                        ? 'bg-slate-700 text-white border-r-4 border-pink-500' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      
      {/* Current Role Display */}
      <div className="p-4 border-t border-slate-700 text-xs text-slate-400">
        Role: <span className="font-bold text-slate-200">{currentUser?.role}</span>
      </div>
    </div>
  );
};
