import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Supplier, Customer, PackingType, Location, Perfume,
  GateInLog, GateOutLog, StockTransferLog,
  User, UserRole
} from '../types';

interface StockPosition {
  mainLocationId: string;
  subLocationId?: string;
  batch: string;
  weight: number;
}

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
  
  addUser: (u: User) => void;
  updateUser: (id: string, u: User) => void;
  deleteUser: (id: string) => void;
  setCurrentUser: (u: User) => void;

  exportDatabase: () => void;
  importDatabase: (jsonData: string) => void;
  resetDatabase: () => void;

  getMainLocations: () => Location[];
  getSubLocations: (mainLocationId: string) => Location[];
  hasPermission: (permission: 'view_prices' | 'manage_users' | 'manage_master_data') => boolean;
  
  // Refined Stock Helpers
  getBatchStock: (perfumeId: string, locationId: string, excludeLogId?: string) => { batch: string; weight: number }[];
  getPerfumeStockBreakdown: (perfumeId: string) => StockPosition[];
  getPerfumeMovementHistory: (perfumeId: string) => any[];
}

const STORAGE_KEY = 'scentvault_db_v1';

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const loadInitial = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Critical: Failed to load data from localStorage", e);
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

  const [users, setUsers] = useState<User[]>(initial?.users || [defaultAdmin]);
  const [currentUser, setCurrentUser] = useState<User>(initial?.currentUser || defaultAdmin);

  useEffect(() => {
    try {
      const dataToSave = {
        suppliers, customers, packingTypes, locations, perfumes,
        gateInLogs, gateOutLogs, transferLogs, users, currentUser
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.error("Storage Error: Local storage might be full", e);
    }
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

  const exportDatabase = () => {
    const data = {
        suppliers, customers, packingTypes, locations, perfumes,
        gateInLogs, gateOutLogs, transferLogs, users, currentUser,
        exportDate: new Date().toISOString()
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
    } catch (e) {
        alert("Error importing database. Invalid file format.");
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

  const getMainLocations = useCallback(() => locations.filter(l => l.type === 'Main Location'), [locations]);
  const getSubLocations = useCallback((mainId: string) => locations.filter(l => l.type === 'Sub Location' && l.parentId === mainId), [locations]);

  const hasPermission = (permission: 'view_prices' | 'manage_users' | 'manage_master_data') => {
    if (!currentUser) return false;
    if (currentUser.role === UserRole.Admin) return true;
    if (permission === 'view_prices') return !!currentUser.permissions?.canViewPrices;
    return false;
  };

  const getPerfumeStockBreakdown = useCallback((perfumeId: string): StockPosition[] => {
    const stockMap: Record<string, number> = {};
    const normalize = (s: string) => (s || 'Unknown Batch').trim();
    
    const getKey = (main: string, sub: string, batch: string) => `${main}|${sub || ''}|${batch}`;

    gateInLogs.forEach(l => {
      if (l.perfumeId === perfumeId) {
        const k = getKey(l.mainLocationId, l.subLocationId || '', normalize(l.importReference));
        stockMap[k] = (stockMap[k] || 0) + Number(l.netWeight);
      }
    });

    gateOutLogs.forEach(l => {
      if (l.perfumeId === perfumeId) {
        const k = getKey(l.mainLocationId, l.subLocationId || '', normalize(l.batchNumber));
        stockMap[k] = (stockMap[k] || 0) - Number(l.netWeight);
      }
    });

    transferLogs.forEach(l => {
      if (l.perfumeId === perfumeId) {
        const batch = normalize(l.batchNumber);
        const fromKey = getKey(l.fromMainLocationId, l.fromSubLocationId || '', batch);
        const toKey = getKey(l.toMainLocationId, l.toSubLocationId || '', batch);
        
        stockMap[fromKey] = (stockMap[fromKey] || 0) - Number(l.netWeight);
        stockMap[toKey] = (stockMap[toKey] || 0) + Number(l.netWeight);
      }
    });

    return Object.entries(stockMap)
      .map(([key, weight]) => {
        const [mainLocId, subLocId, batch] = key.split('|');
        return { mainLocationId: mainLocId, subLocationId: subLocId || undefined, batch, weight };
      })
      .filter(item => Math.abs(item.weight) > 0.001);
  }, [gateInLogs, gateOutLogs, transferLogs]);

  const getPerfumeMovementHistory = useCallback((perfumeId: string) => {
      const history: any[] = [];
      gateInLogs.filter(l => l.perfumeId === perfumeId).forEach(l => history.push({ ...l, type: 'IN' }));
      gateOutLogs.filter(l => l.perfumeId === perfumeId).forEach(l => history.push({ ...l, type: 'OUT' }));
      transferLogs.filter(l => l.perfumeId === perfumeId).forEach(l => history.push({ ...l, type: 'TRANSFER' }));
      return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [gateInLogs, gateOutLogs, transferLogs]);

  const getBatchStock = useCallback((perfumeId: string, locationId: string, excludeLogId?: string) => {
    const batchMap: Record<string, number> = {};
    const normalize = (s: string) => (s || '').trim();

    gateInLogs.forEach(l => {
      if (l.perfumeId === perfumeId && l.mainLocationId === locationId) {
        const b = normalize(l.importReference);
        if (b) batchMap[b] = (batchMap[b] || 0) + Number(l.netWeight);
      }
    });

    gateOutLogs.forEach(l => {
      if (l.id === excludeLogId) return;
      if (l.perfumeId === perfumeId && l.mainLocationId === locationId) {
        const b = normalize(l.batchNumber);
        if (b) batchMap[b] = (batchMap[b] || 0) - Number(l.netWeight);
      }
    });

    transferLogs.forEach(l => {
      if (l.id === excludeLogId) return;
      if (l.perfumeId === perfumeId) {
        const b = normalize(l.batchNumber);
        if (b) {
          if (l.fromMainLocationId === locationId) batchMap[b] = (batchMap[b] || 0) - Number(l.netWeight);
          if (l.toMainLocationId === locationId) batchMap[b] = (batchMap[b] || 0) + Number(l.netWeight);
        }
      }
    });

    return Object.entries(batchMap)
      .map(([batch, weight]) => ({ batch, weight }))
      .filter(item => item.weight > 0.001)
      .sort((a, b) => b.weight - a.weight);
  }, [gateInLogs, gateOutLogs, transferLogs]);

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
      getMainLocations, getSubLocations, hasPermission,
      getBatchStock,
      getPerfumeStockBreakdown,
      getPerfumeMovementHistory
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