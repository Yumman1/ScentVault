import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Supplier, Customer, PackingType, Location, Perfume,
  GateInLog, GateOutLog, StockTransferLog,
  User, UserRole
} from '../types';

interface InventoryContextType {
  suppliers: Supplier[];
  customers: Customer[];
  packingTypes: PackingType[];
  locations: Location[];
  perfumes: Perfume[];
  gateInLogs: GateInLog[];
  gateOutLogs: GateOutLog[];
  transferLogs: StockTransferLog[];
  users: User[];
  currentUser: User | null;
  
  addSupplier: (s: Supplier) => void;
  updateSupplier: (id: string, s: Supplier) => void;
  addCustomer: (c: Customer) => void;
  updateCustomer: (id: string, c: Customer) => void;
  addPackingType: (p: PackingType) => void;
  updatePackingType: (id: string, p: PackingType) => void;
  addLocation: (l: Location) => void;
  updateLocation: (id: string, l: Location) => void;
  addPerfume: (p: Perfume) => void;
  updatePerfume: (id: string, p: Perfume) => void;
  
  addGateInLog: (l: GateInLog) => void;
  updateGateInLog: (id: string, l: GateInLog) => void;
  deleteGateInLog: (id: string) => void;

  addGateOutLog: (l: GateOutLog) => void;
  updateGateOutLog: (id: string, l: GateOutLog) => void;
  deleteGateOutLog: (id: string) => void;

  addTransferLog: (l: StockTransferLog) => void;
  updateTransferLog: (id: string, l: StockTransferLog) => void;
  deleteTransferLog: (id: string) => void;
  
  // User Management
  addUser: (u: User) => void;
  updateUser: (id: string, u: User) => void;
  deleteUser: (id: string) => void;
  setCurrentUser: (u: User) => void;

  // Database Management
  exportDatabase: () => void;
  importDatabase: (jsonData: string) => void;
  resetDatabase: () => void;

  // Helpers
  getMainLocations: () => Location[];
  getSubLocations: (mainLocationId: string) => Location[];
  hasPermission: (permission: 'view_prices' | 'manage_users' | 'manage_master_data') => boolean;
}

const STORAGE_KEY = 'scentvault_db_v1';

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial data from localStorage if available
  const loadInitial = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load data from localStorage", e);
    }
    return null;
  };

  const initial = loadInitial();

  const [suppliers, setSuppliers] = useState<Supplier[]>(initial?.suppliers || []);
  const [customers, setCustomers] = useState<Customer[]>(initial?.customers || []);
  const [packingTypes, setPackingTypes] = useState<PackingType[]>(initial?.packingTypes || []);
  const [locations, setLocations] = useState<Location[]>(initial?.locations || []);
  const [perfumes, setPerfumes] = useState<Perfume[]>(initial?.perfumes || []);
  const [gateInLogs, setGateInLogs] = useState<GateInLog[]>(initial?.gateInLogs || []);
  const [gateOutLogs, setGateOutLogs] = useState<GateOutLog[]>(initial?.gateOutLogs || []);
  const [transferLogs, setTransferLogs] = useState<StockTransferLog[]>(initial?.transferLogs || []);

  const defaultAdmin: User = { 
    id: 'admin-1', 
    name: 'Super Admin', 
    role: UserRole.Admin,
    permissions: { canViewPrices: true, allowedLocationIds: [] } 
  };

  const [users, setUsers] = useState<User[]>(initial?.users || [
    defaultAdmin,
    { id: 'op-1', name: 'Warehouse Operator', role: UserRole.Operator, permissions: { canViewPrices: false, allowedLocationIds: [] } },
    { id: 'view-1', name: 'Restricted Viewer', role: UserRole.Viewer, permissions: { canViewPrices: false, allowedLocationIds: [] } }
  ]);
  
  const [currentUser, setCurrentUser] = useState<User>(initial?.currentUser || defaultAdmin);

  // Auto-sync to localStorage on every change
  useEffect(() => {
    const dataToSave = {
      suppliers, customers, packingTypes, locations, perfumes,
      gateInLogs, gateOutLogs, transferLogs, users, currentUser
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [suppliers, customers, packingTypes, locations, perfumes, gateInLogs, gateOutLogs, transferLogs, users, currentUser]);

  const addSupplier = (s: Supplier) => setSuppliers(prev => [...prev, s]);
  const updateSupplier = (id: string, s: Supplier) => setSuppliers(prev => prev.map(item => item.id === id ? s : item));

  const addCustomer = (c: Customer) => setCustomers(prev => [...prev, c]);
  const updateCustomer = (id: string, c: Customer) => setCustomers(prev => prev.map(item => item.id === id ? c : item));

  const addPackingType = (p: PackingType) => setPackingTypes(prev => [...prev, p]);
  const updatePackingType = (id: string, p: PackingType) => setPackingTypes(prev => prev.map(item => item.id === id ? p : item));

  const addLocation = (l: Location) => setLocations(prev => [...prev, l]);
  const updateLocation = (id: string, l: Location) => setLocations(prev => prev.map(item => item.id === id ? l : item));

  const addPerfume = (p: Perfume) => setPerfumes(prev => [...prev, p]);
  const updatePerfume = (id: string, p: Perfume) => setPerfumes(prev => prev.map(item => item.id === id ? p : item));

  const addGateInLog = (l: GateInLog) => setGateInLogs(prev => [...prev, l]);
  const updateGateInLog = (id: string, l: GateInLog) => setGateInLogs(prev => prev.map(item => item.id === id ? l : item));
  const deleteGateInLog = (id: string) => setGateInLogs(prev => prev.filter(item => item.id !== id));

  const addGateOutLog = (l: GateOutLog) => setGateOutLogs(prev => [...prev, l]);
  const updateGateOutLog = (id: string, l: GateOutLog) => setGateOutLogs(prev => prev.map(item => item.id === id ? l : item));
  const deleteGateOutLog = (id: string) => setGateOutLogs(prev => prev.filter(item => item.id !== id));

  const addTransferLog = (l: StockTransferLog) => setTransferLogs(prev => [...prev, l]);
  const updateTransferLog = (id: string, l: StockTransferLog) => setTransferLogs(prev => prev.map(item => item.id === id ? l : item));
  const deleteTransferLog = (id: string) => setTransferLogs(prev => prev.filter(item => item.id !== id));

  const addUser = (u: User) => setUsers(prev => [...prev, u]);
  const updateUser = (id: string, u: User) => {
    setUsers(prev => prev.map(item => item.id === id ? u : item));
    if (currentUser?.id === id) setCurrentUser(u);
  };
  const deleteUser = (id: string) => setUsers(prev => prev.filter(u => u.id !== id));

  // --- Database Management ---
  const exportDatabase = () => {
    const data = {
        suppliers, customers, packingTypes, locations, perfumes,
        gateInLogs, gateOutLogs, transferLogs, users, currentUser,
        exportDate: new Date().toISOString(),
        version: "1.0"
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scentvault_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importDatabase = (jsonData: string) => {
    try {
        const data = JSON.parse(jsonData);
        if (data.suppliers) setSuppliers(data.suppliers);
        if (data.customers) setCustomers(data.customers);
        if (data.packingTypes) setPackingTypes(data.packingTypes);
        if (data.locations) setLocations(data.locations);
        if (data.perfumes) setPerfumes(data.perfumes);
        if (data.gateInLogs) setGateInLogs(data.gateInLogs);
        if (data.gateOutLogs) setGateOutLogs(data.gateOutLogs);
        if (data.transferLogs) setTransferLogs(data.transferLogs);
        if (data.users) setUsers(data.users);
        if (data.currentUser) setCurrentUser(data.currentUser);
        alert("Database Imported Successfully!");
    } catch (e) {
        alert("Error importing database. Please ensure it is a valid ScentVault backup file.");
        console.error(e);
    }
  };

  const resetDatabase = () => {
      setSuppliers([]);
      setCustomers([]);
      setPackingTypes([]);
      setLocations([]);
      setPerfumes([]);
      setGateInLogs([]);
      setGateOutLogs([]);
      setTransferLogs([]);
      setUsers([defaultAdmin]);
      setCurrentUser(defaultAdmin);
      localStorage.removeItem(STORAGE_KEY);
  };

  const getMainLocations = () => locations.filter(l => l.type === 'Main Location');
  const getSubLocations = (mainId: string) => locations.filter(l => l.type === 'Sub Location' && l.parentId === mainId);

  const hasPermission = (permission: 'view_prices' | 'manage_users' | 'manage_master_data') => {
    if (!currentUser) return false;
    if (currentUser.role === UserRole.Admin) return true;
    if (permission === 'view_prices') return !!currentUser.permissions?.canViewPrices;
    return false;
  };

  return (
    <InventoryContext.Provider value={{
      suppliers, customers, packingTypes, locations, perfumes,
      gateInLogs, gateOutLogs, transferLogs, users, currentUser,
      addSupplier, updateSupplier,
      addCustomer, updateCustomer,
      addPackingType, updatePackingType,
      addLocation, updateLocation,
      addPerfume, updatePerfume,
      addGateInLog, updateGateInLog, deleteGateInLog,
      addGateOutLog, updateGateOutLog, deleteGateOutLog,
      addTransferLog, updateTransferLog, deleteTransferLog,
      addUser, updateUser, deleteUser, setCurrentUser,
      exportDatabase, importDatabase, resetDatabase,
      getMainLocations, getSubLocations, hasPermission
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error("useInventory must be used within InventoryProvider");
  return context;
};
