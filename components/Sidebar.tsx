import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  Tag,
  History,
  Moon,
  Sun,
  Monitor,
  LogOut,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserRole } from '../types';

interface SidebarProps {
  currentView: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView }) => {
  const { currentUser } = useInventory();
  const { user: authUser, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const sessionEmail = authUser?.email?.trim() || '';
  const sidebarName =
    (currentUser?.name || profile?.name || '').trim() ||
    (typeof authUser?.user_metadata?.name === 'string' ? authUser.user_metadata.name.trim() : '') ||
    sessionEmail ||
    'Account';
  const sidebarRole = currentUser?.role ?? profile?.role;

  // Define full menu
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'General' },
    { id: 'reports', label: 'Reports & Export', icon: FileText, category: 'General' },
    
    // Master Data
    { id: 'suppliers', label: 'Suppliers', icon: Users, category: 'Master Data' },
    { id: 'packing', label: 'Packing Types', icon: Package, category: 'Master Data' },
    { id: 'locations', label: 'Locations', icon: MapPin, category: 'Master Data' },
    { id: 'perfumes', label: 'Perfume Archive', icon: FlaskConical, category: 'Master Data' },
    { id: 'tags', label: 'Scent Library', icon: Tag, category: 'Master Data' },
    { id: 'customers', label: 'Customers', icon: Users, category: 'Master Data' },
    
    // Transactions
    { id: 'gate-in', label: 'Inbound Log', icon: ArrowDownToLine, category: 'Transactions' },
    { id: 'gate-out', label: 'Outbound Log', icon: ArrowUpFromLine, category: 'Transactions' },
    { id: 'transfer', label: 'Internal Transfer', icon: ArrowRightLeft, category: 'Transactions' },

    // System
    { id: 'users', label: 'User Profiles', icon: ShieldCheck, category: 'System' },
    { id: 'audit', label: 'Activity History', icon: History, category: 'System' },
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
            <h3 className="px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 opacity-50">
              {category}
            </h3>
            <ul className="space-y-1 px-4">
              {visibleItems.filter(i => i.category === category).map(item => (
                <li key={item.id}>
                  <NavLink
                    to={`/${item.id}`}
                    className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-200 group ${
                      isActive 
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      
      <div className="p-6 bg-slate-950/50 border-t border-slate-800">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-700">
                {sidebarName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate" title={sessionEmail || sidebarName}>
                  {sidebarName}
                </p>
                <p className="text-[10px] text-slate-500 font-medium tracking-tight truncate" title={sidebarRole || sessionEmail}>
                  {sidebarRole ? `Role: ${sidebarRole}` : sessionEmail}
                </p>
              </div>
            </div>
            
            <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800">
                <button 
                    onClick={() => setTheme('light')} 
                    className={`p-1.5 rounded-md transition-colors ${theme === 'light' ? 'bg-slate-800 text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
                    title="Light Mode"
                >
                    <Sun size={14} />
                </button>
                <button 
                    onClick={() => setTheme('dark')} 
                    className={`p-1.5 rounded-md transition-colors ${theme === 'dark' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                    title="Dark Mode"
                >
                    <Moon size={14} />
                </button>
                <button 
                    onClick={() => setTheme('system')} 
                    className={`p-1.5 rounded-md transition-colors ${theme === 'system' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                    title="System Theme"
                >
                    <Monitor size={14} />
                </button>
            </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate('/', { replace: true });
          }}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-rose-400 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-900/50 transition-colors"
        >
          <LogOut size={14} strokeWidth={2.5} />
          Sign out
        </button>
      </div>
    </div>
  );
};