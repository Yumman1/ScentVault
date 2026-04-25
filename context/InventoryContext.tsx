import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Supplier, Customer, PackingType, Location, Perfume,
  GateInLog, GateOutLog, StockTransferLog,
  User, UserRole, MovementHistoryItem,
  AuditAction, AuditEntity, AuditEntry
} from '../types';
import { useAuth } from './AuthContext';
import { profileService } from '../services/profileService';
import { v4 as generateId } from 'uuid';

// Services
import { supplierService } from '../services/supplierService';
import { customerService } from '../services/customerService';
import { perfumeService } from '../services/perfumeService';
import { locationService } from '../services/locationService';
import { packingTypeService } from '../services/packingTypeService';
import { transactionService } from '../services/transactionService';
import { auditService } from '../services/auditService';
import { olfactiveNoteService } from '../services/olfactiveNoteService';
import { computeStockPositions, type StockPosition } from '../lib/stock';

interface InventoryContextType {
  // Data
  suppliers: Supplier[];
  customers: Customer[];
  packingTypes: PackingType[];
  locations: Location[];
  perfumes: Perfume[];
  olfactiveNotes: string[];
  gateInLogs: GateInLog[];
  gateOutLogs: GateOutLog[];
  transferLogs: StockTransferLog[];
  users: User[];
  currentUser: User | null;

  // Loading & Error
  isLoading: boolean;
  error: string | null;

  // Location CRUD
  addLocation: (l: Location) => void;
  updateLocation: (id: string, l: Location) => void;
  deleteLocation: (id: string) => boolean;

  // Perfume CRUD
  addPerfume: (p: Perfume) => void;
  updatePerfume: (id: string, p: Perfume) => void;
  deletePerfume: (id: string) => boolean;

  // Supplier CRUD
  addSupplier: (s: Supplier) => void;
  updateSupplier: (id: string, s: Supplier) => void;
  deleteSupplier: (id: string) => boolean;

  // Customer CRUD
  addCustomer: (c: Customer) => void;
  updateCustomer: (id: string, c: Customer) => void;

  // Packing Types
  addPackingType: (p: PackingType) => void;
  updatePackingType: (id: string, p: PackingType) => void;
  deletePackingType: (id: string) => boolean;

  // Olfactive Notes
  addOlfactiveNote: (name: string) => void;
  updateOlfactiveNote: (oldName: string, newName: string) => void;
  deleteOlfactiveNote: (name: string) => void;

  // Transaction Logs
  addGateInLog: (l: GateInLog) => void;
  updateGateInLog: (id: string, l: GateInLog) => void;
  deleteGateInLog: (id: string) => void;

  addGateOutLog: (l: GateOutLog) => void;
  updateGateOutLog: (id: string, l: GateOutLog) => void;
  deleteGateOutLog: (id: string) => void;

  addTransferLog: (l: StockTransferLog) => void;
  updateTransferLog: (id: string, l: StockTransferLog) => void;
  deleteTransferLog: (id: string) => void;

  // User management
  updateUser: (id: string, u: User) => Promise<void>;
  deleteUser: (id: string) => void;
  setCurrentUser: (u: User) => void;

  // Database operations
  exportDatabase: () => Promise<void>;
  importDatabase: (jsonData: string) => void;
  resetDatabase: () => void;

  // Location helpers
  getMainLocations: () => Location[];
  getSubLocations: (mainLocationId: string) => Location[];
  hasPermission: (permission: 'view_prices' | 'manage_users' | 'manage_master_data') => boolean;

  // Stock calculations
  getBatchStock: (perfumeId: string, locationId: string, subLocationId?: string, excludeLogId?: string) => { batch: string; packingTypeId: string; weight: number; arrivalDate: string }[];
  getPerfumeStockBreakdown: (perfumeId: string) => StockPosition[];
  getPerfumeMovementHistory: (perfumeId: string) => MovementHistoryItem[];

  // Audit & Undo
  auditLogs: AuditEntry[];
  undoAction: () => void;
  canUndo: boolean;

  // Refresh helper
  refreshData: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, refreshProfile } = useAuth();

  // ── State ────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packingTypes, setPackingTypes] = useState<PackingType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [olfactiveNotes, setOlfactiveNotes] = useState<string[]>([]);
  const [gateInLogs, setGateInLogs] = useState<GateInLog[]>([]);
  const [gateOutLogs, setGateOutLogs] = useState<GateOutLog[]>([]);
  const [transferLogs, setTransferLogs] = useState<StockTransferLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(profile);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [undoStack, setUndoStack] = useState<{ entity: AuditEntity; previousState: any } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Sync profile from AuthContext ────────────────────────────
  useEffect(() => {
    if (profile) {
      setCurrentUser(profile);
    }
  }, [profile]);

  // ── Audit Logger ─────────────────────────────────────────────
  const logAudit = useCallback((action: AuditAction, entity: AuditEntity, entityId: string, details: string, previousState?: any) => {
    const entry: AuditEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'system',
      userName: currentUser?.name || 'System',
      action,
      entity,
      entityId,
      details,
      previousState: previousState ? JSON.stringify(previousState) : undefined
    };

    // Optimistic local update
    setAuditLogs(prev => [entry, ...prev].slice(0, 500));

    // Fire-and-forget to Supabase
    auditService.create(entry).catch(err => console.error('Audit log failed:', err));

    // Populate undo stack for reversible operations
    if (action !== AuditAction.Undo && previousState !== undefined && previousState !== null) {
      setUndoStack({ entity, previousState });
    }
  }, [currentUser]);

  // ── Data Fetching ────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        suppliersData,
        customersData,
        packingTypesData,
        locationsData,
        perfumesData,
        notesData,
        gateInData,
        gateOutData,
        transferData,
        auditData,
        usersData,
      ] = await Promise.all([
        supplierService.getAll(),
        customerService.getAll(),
        packingTypeService.getAll(),
        locationService.getAll(),
        perfumeService.getAll(),
        olfactiveNoteService.getAll(),
        transactionService.getAllGateIn(),
        transactionService.getAllGateOut(),
        transactionService.getAllTransfers(),
        auditService.getAll().catch(() => [] as AuditEntry[]), // Non-blocking for viewers
        profileService.getAll().catch(() => [] as User[]),
      ]);

      setSuppliers(suppliersData);
      setCustomers(customersData);
      setPackingTypes(packingTypesData);
      setLocations(locationsData);
      setPerfumes(perfumesData);
      setOlfactiveNotes(notesData);
      setGateInLogs(gateInData);
      setGateOutLogs(gateOutData);
      setTransferLogs(transferData);
      setAuditLogs(auditData);
      setUsers(usersData);
    } catch (err: any) {
      console.error('Failed to fetch inventory data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch when component mounts
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const refreshData = useCallback(async () => {
    await fetchAllData();
  }, [fetchAllData]);

  // ── Supplier CRUD ────────────────────────────────────────────
  const addSupplier = useCallback((s: Supplier) => {
    setSuppliers(prev => [...prev, s]);
    supplierService.create(s).then(() => {
      logAudit(AuditAction.Create, AuditEntity.Supplier, s.id, `Added supplier ${s.name}`);
    }).catch(err => {
      console.error('Failed to create supplier:', err);
      setSuppliers(prev => prev.filter(x => x.id !== s.id));
    });
  }, [logAudit]);

  const updateSupplier = useCallback((id: string, s: Supplier) => {
    const previous = suppliers.find(x => x.id === id);
    setSuppliers(prev => prev.map(item => item.id === id ? s : item));
    supplierService.update(id, s).then(() => {
      logAudit(AuditAction.Update, AuditEntity.Supplier, id, `Updated supplier ${s.name}`);
    }).catch(err => {
      console.error('Failed to update supplier:', err);
      if (previous) setSuppliers(prev => prev.map(item => item.id === id ? previous : item));
    });
  }, [suppliers, logAudit]);

  const deleteSupplier = useCallback((id: string) => {
    const s = suppliers.find(x => x.id === id);
    if (!s) return false;

    const linkedPerfumes = perfumes.filter(p => p.supplierId === id);
    if (linkedPerfumes.length > 0) {
      alert(`Cannot delete supplier '${s.name}'. It is linked to ${linkedPerfumes.length} active perfumes. Delete the perfumes first.`);
      return false;
    }

    setSuppliers(prev => prev.filter(item => item.id !== id));
    supplierService.delete(id).then(() => {
      logAudit(AuditAction.Delete, AuditEntity.Supplier, id, `Deleted supplier: ${s.name}`);
    }).catch(err => {
      console.error('Failed to delete supplier:', err);
      setSuppliers(prev => [...prev, s]);
    });
    return true;
  }, [suppliers, perfumes, logAudit]);

  // ── Customer CRUD ────────────────────────────────────────────
  const addCustomer = useCallback((c: Customer) => {
    setCustomers(prev => [...prev, c]);
    customerService.create(c).then(() => {
      logAudit(AuditAction.Create, AuditEntity.Customer, c.id, `Added customer ${c.name}`);
    }).catch(err => {
      console.error('Failed to create customer:', err);
      setCustomers(prev => prev.filter(x => x.id !== c.id));
    });
  }, [logAudit]);

  const updateCustomer = useCallback((id: string, c: Customer) => {
    const previous = customers.find(x => x.id === id);
    setCustomers(prev => prev.map(item => item.id === id ? c : item));
    customerService.update(id, c).then(() => {
      logAudit(AuditAction.Update, AuditEntity.Customer, id, `Updated customer ${c.name}`);
    }).catch(err => {
      console.error('Failed to update customer:', err);
      if (previous) setCustomers(prev => prev.map(item => item.id === id ? previous : item));
    });
  }, [customers, logAudit]);

  // ── Packing Type CRUD ────────────────────────────────────────
  const addPackingType = useCallback((p: PackingType) => {
    setPackingTypes(prev => [...prev, p]);
    packingTypeService.create(p).then(() => {
      logAudit(AuditAction.Create, AuditEntity.PackingType, p.id, `Added packing type ${p.name}`);
    }).catch(err => {
      console.error('Failed to create packing type:', err);
      setPackingTypes(prev => prev.filter(x => x.id !== p.id));
    });
  }, [logAudit]);

  const updatePackingType = useCallback((id: string, p: PackingType) => {
    const previous = packingTypes.find(x => x.id === id);
    setPackingTypes(prev => prev.map(item => item.id === id ? p : item));
    packingTypeService.update(id, p).then(() => {
      logAudit(AuditAction.Update, AuditEntity.PackingType, id, `Updated packing type ${p.name}`);
    }).catch(err => {
      console.error('Failed to update packing type:', err);
      if (previous) setPackingTypes(prev => prev.map(item => item.id === id ? previous : item));
    });
  }, [packingTypes, logAudit]);

  const deletePackingType = useCallback((id: string) => {
    const p = packingTypes.find(x => x.id === id);
    if (!p) return false;

    setPackingTypes(prev => prev.filter(item => item.id !== id));
    packingTypeService.delete(id).then(() => {
      logAudit(AuditAction.Delete, AuditEntity.PackingType, id, `Deleted packing type: ${p.name}`);
    }).catch(err => {
      console.error('Failed to delete packing type:', err);
      setPackingTypes(prev => [...prev, p]);
    });
    return true;
  }, [packingTypes, logAudit]);

  // ── Location CRUD ────────────────────────────────────────────
  const addLocation = useCallback((l: Location) => {
    setLocations(prev => [...prev, l]);
    locationService.create(l).then(() => {
      logAudit(AuditAction.Create, AuditEntity.Location, l.id, `Added location ${l.name}`);
    }).catch(err => {
      console.error('Failed to create location:', err);
      setLocations(prev => prev.filter(x => x.id !== l.id));
    });
  }, [logAudit]);

  const updateLocation = useCallback((id: string, l: Location) => {
    const previous = locations.find(x => x.id === id);
    setLocations(prev => prev.map(item => item.id === id ? l : item));
    locationService.update(id, l).then(() => {
      logAudit(AuditAction.Update, AuditEntity.Location, id, `Updated location ${l.name}`);
    }).catch(err => {
      console.error('Failed to update location:', err);
      if (previous) setLocations(prev => prev.map(item => item.id === id ? previous : item));
    });
  }, [locations, logAudit]);

  const deleteLocation = useCallback((id: string) => {
    const l = locations.find(x => x.id === id);
    if (!l) return false;

    const hasSubs = locations.some(loc => loc.parentId === id);
    if (hasSubs) {
      alert(`Cannot delete '${l.name}'. It still has sub-zones linked. Delete the sub-zones first.`);
      return false;
    }

    const hasGateIn = gateInLogs.some(log => log.mainLocationId === id || log.subLocationId === id);
    const hasGateOut = gateOutLogs.some(log => log.mainLocationId === id || log.subLocationId === id);
    const hasTransfers = transferLogs.some(log =>
      log.fromMainLocationId === id || log.fromSubLocationId === id ||
      log.toMainLocationId === id || log.toSubLocationId === id
    );

    if (hasGateIn || hasGateOut || hasTransfers) {
      alert(`Cannot delete '${l.name}'. It has active movement history. This location must be preserved to maintain data integrity.`);
      return false;
    }

    setLocations(prev => prev.filter(item => item.id !== id));
    locationService.delete(id).then(() => {
      logAudit(AuditAction.Delete, AuditEntity.Location, id, `Deleted location: ${l.name}`);
    }).catch(err => {
      console.error('Failed to delete location:', err);
      setLocations(prev => [...prev, l]);
    });
    return true;
  }, [locations, gateInLogs, gateOutLogs, transferLogs, logAudit]);

  // ── Perfume CRUD ─────────────────────────────────────────────
  const addPerfume = useCallback((p: Perfume) => {
    setPerfumes(prev => [...prev, p]);
    perfumeService.create(p).then(() => {
      logAudit(AuditAction.Create, AuditEntity.Perfume, p.id, `Added perfume ${p.name}`);
    }).catch(err => {
      console.error('Failed to create perfume:', err);
      setPerfumes(prev => prev.filter(x => x.id !== p.id));
    });
  }, [logAudit]);

  const updatePerfume = useCallback((id: string, p: Perfume) => {
    const previous = perfumes.find(x => x.id === id);
    setPerfumes(prev => prev.map(item => item.id === id ? p : item));
    perfumeService.update(id, p).then(() => {
      logAudit(AuditAction.Update, AuditEntity.Perfume, id, `Updated perfume ${p.name}`);
    }).catch(err => {
      console.error('Failed to update perfume:', err);
      if (previous) setPerfumes(prev => prev.map(item => item.id === id ? previous : item));
    });
  }, [perfumes, logAudit]);

  const deletePerfume = useCallback((id: string) => {
    const p = perfumes.find(x => x.id === id);
    if (!p) return false;

    const hasInbound = gateInLogs.some(l => l.perfumeId === id);
    const hasOutbound = gateOutLogs.some(l => l.perfumeId === id);
    const hasTransfers = transferLogs.some(l => l.perfumeId === id);

    if (hasInbound || hasOutbound || hasTransfers) {
      alert(`Cannot delete perfume '${p.name}'. It has existing transaction records. This action is blocked to preserve data integrity.`);
      return false;
    }

    setPerfumes(prev => prev.filter(item => item.id !== id));
    perfumeService.delete(id).then(() => {
      logAudit(AuditAction.Delete, AuditEntity.Perfume, id, `Deleted perfume: ${p.name}`);
    }).catch(err => {
      console.error('Failed to delete perfume:', err);
      setPerfumes(prev => [...prev, p]);
    });
    return true;
  }, [perfumes, gateInLogs, gateOutLogs, transferLogs, logAudit]);

  // ── Olfactive Note CRUD ──────────────────────────────────────
  const addOlfactiveNote = useCallback((name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    setOlfactiveNotes(prev => prev.includes(cleanName) ? prev : [...prev, cleanName].sort());
    olfactiveNoteService.create(cleanName).then(() => {
      logAudit(AuditAction.Create, AuditEntity.OlfactiveNote, 'system', `Registered new scent note: ${cleanName}`);
    }).catch(err => {
      console.error('Failed to create olfactive note:', err);
      setOlfactiveNotes(prev => prev.filter(n => n !== cleanName));
    });
  }, [logAudit]);

  const updateOlfactiveNote = useCallback((oldName: string, newName: string) => {
    const cleanNewName = newName.trim();
    if (!cleanNewName || oldName === cleanNewName) return;

    // Optimistic local update
    setOlfactiveNotes(prev => prev.map(n => n === oldName ? cleanNewName : n).sort());
    setPerfumes(prev => prev.map(p => {
      if ((p.olfactiveNotes || []).includes(oldName)) {
        return { ...p, olfactiveNotes: p.olfactiveNotes.map(n => n === oldName ? cleanNewName : n) };
      }
      return p;
    }));

    olfactiveNoteService.update(oldName, cleanNewName).then(() => {
      logAudit(AuditAction.Update, AuditEntity.OlfactiveNote, 'system', `Updated scent note: ${oldName} -> ${cleanNewName}`);
    }).catch(err => {
      console.error('Failed to update olfactive note:', err);
      // Rollback
      setOlfactiveNotes(prev => prev.map(n => n === cleanNewName ? oldName : n).sort());
      refreshData();
    });
  }, [logAudit, refreshData]);

  const deleteOlfactiveNote = useCallback((name: string) => {
    setOlfactiveNotes(prev => prev.filter(n => n !== name));
    setPerfumes(prev => prev.map(p => ({
      ...p,
      olfactiveNotes: (p.olfactiveNotes || []).filter(n => n !== name)
    })));

    olfactiveNoteService.delete(name).then(() => {
      logAudit(AuditAction.Delete, AuditEntity.OlfactiveNote, 'system', `Deleted scent note: ${name}`);
    }).catch(err => {
      console.error('Failed to delete olfactive note:', err);
      refreshData();
    });
  }, [logAudit, refreshData]);

  // ── Gate In CRUD ─────────────────────────────────────────────
  const addGateInLog = useCallback((l: GateInLog) => {
    setGateInLogs(prev => [...prev, l]);
    transactionService.createGateIn(l).then(() => {
      logAudit(AuditAction.Create, AuditEntity.GateIn, l.id, `Logged Gate In for ${l.netWeight}kg`);
    }).catch(err => {
      console.error('Failed to create gate in log:', err);
      setGateInLogs(prev => prev.filter(x => x.id !== l.id));
    });
  }, [logAudit]);

  const updateGateInLog = useCallback((id: string, l: GateInLog) => {
    const previous = gateInLogs.find(x => x.id === id);
    setGateInLogs(prev => prev.map(item => item.id === id ? l : item));
    transactionService.updateGateIn(id, l).then(() => {
      logAudit(AuditAction.Update, AuditEntity.GateIn, id, `Updated Gate In log`);
    }).catch(err => {
      console.error('Failed to update gate in log:', err);
      if (previous) setGateInLogs(prev => prev.map(item => item.id === id ? previous : item));
    });
  }, [gateInLogs, logAudit]);

  const deleteGateInLog = useCallback((id: string) => {
    const previous = gateInLogs.find(x => x.id === id);
    setGateInLogs(prev => prev.filter(item => item.id !== id));
    transactionService.deleteGateIn(id).then(() => {
      logAudit(AuditAction.Delete, AuditEntity.GateIn, id, `Deleted Gate In log`);
    }).catch(err => {
      console.error('Failed to delete gate in log:', err);
      if (previous) setGateInLogs(prev => [...prev, previous]);
    });
  }, [gateInLogs, logAudit]);

  // ── Gate Out CRUD ────────────────────────────────────────────
  const addGateOutLog = useCallback((l: GateOutLog) => {
    setGateOutLogs(prev => [...prev, l]);
    transactionService.createGateOut(l).then(() => {
      logAudit(AuditAction.Create, AuditEntity.GateOut, l.id, `Logged Gate Out for ${l.netWeight}kg`);
    }).catch(err => {
      console.error('Failed to create gate out log:', err);
      setGateOutLogs(prev => prev.filter(x => x.id !== l.id));
    });
  }, [logAudit]);

  const updateGateOutLog = useCallback((id: string, l: GateOutLog) => {
    const previous = gateOutLogs.find(x => x.id === id);
    setGateOutLogs(prev => prev.map(item => item.id === id ? l : item));
    transactionService.updateGateOut(id, l).then(() => {
      logAudit(AuditAction.Update, AuditEntity.GateOut, id, `Updated Gate Out log`);
    }).catch(err => {
      console.error('Failed to update gate out log:', err);
      if (previous) setGateOutLogs(prev => prev.map(item => item.id === id ? previous : item));
    });
  }, [gateOutLogs, logAudit]);

  const deleteGateOutLog = useCallback((id: string) => {
    const previous = gateOutLogs.find(x => x.id === id);
    setGateOutLogs(prev => prev.filter(item => item.id !== id));
    transactionService.deleteGateOut(id).then(() => {
      logAudit(AuditAction.Delete, AuditEntity.GateOut, id, `Deleted Gate Out log`);
    }).catch(err => {
      console.error('Failed to delete gate out log:', err);
      if (previous) setGateOutLogs(prev => [...prev, previous]);
    });
  }, [gateOutLogs, logAudit]);

  // ── Stock Transfer CRUD ──────────────────────────────────────
  const addTransferLog = useCallback((l: StockTransferLog) => {
    setTransferLogs(prev => [...prev, l]);
    transactionService.createTransfer(l).then(() => {
      logAudit(AuditAction.Create, AuditEntity.Transfer, l.id, `Logged Stock Transfer for ${l.netWeight}kg`);
    }).catch(err => {
      console.error('Failed to create transfer log:', err);
      setTransferLogs(prev => prev.filter(x => x.id !== l.id));
    });
  }, [logAudit]);

  const updateTransferLog = useCallback((id: string, l: StockTransferLog) => {
    const previous = transferLogs.find(x => x.id === id);
    setTransferLogs(prev => prev.map(item => item.id === id ? l : item));
    transactionService.updateTransfer(id, l).then(() => {
      logAudit(AuditAction.Update, AuditEntity.Transfer, id, `Updated Stock Transfer log`);
    }).catch(err => {
      console.error('Failed to update transfer log:', err);
      if (previous) setTransferLogs(prev => prev.map(item => item.id === id ? previous : item));
    });
  }, [transferLogs, logAudit]);

  const deleteTransferLog = useCallback((id: string) => {
    const previous = transferLogs.find(x => x.id === id);
    setTransferLogs(prev => prev.filter(item => item.id !== id));
    transactionService.deleteTransfer(id).then(() => {
      logAudit(AuditAction.Delete, AuditEntity.Transfer, id, `Deleted Stock Transfer log`);
    }).catch(err => {
      console.error('Failed to delete transfer log:', err);
      if (previous) setTransferLogs(prev => [...prev, previous]);
    });
  }, [transferLogs, logAudit]);

  // ── User management (profiles in Supabase; accounts via Auth sign-up) ──
  const updateUser = useCallback(async (id: string, u: User) => {
    const previous = users.find(x => x.id === id);
    setUsers(prev => prev.map(item => item.id === id ? u : item));
    if (currentUser?.id === id) setCurrentUser(u);
    try {
      await profileService.update(id, u);
      logAudit(AuditAction.Update, AuditEntity.User, id, `Updated user profile: ${u.name}`, previous);
      if (currentUser?.id === id) await refreshProfile();
    } catch (err) {
      console.error('Failed to update user profile:', err);
      if (previous) {
        setUsers(prev => prev.map(item => item.id === id ? previous : item));
        if (currentUser?.id === id) setCurrentUser(previous);
      }
      throw err;
    }
  }, [users, currentUser, logAudit, refreshProfile]);

  const deleteUser = useCallback((_id: string) => {
    window.alert(
      'To remove a login account entirely, delete the user under Supabase → Authentication → Users. ' +
      'You can revoke access immediately by changing their role or permissions here.'
    );
  }, []);

  // ── Undo ─────────────────────────────────────────────────────
  const undoAction = useCallback(() => {
    if (!undoStack) return;
    const { entity, previousState } = undoStack;

    switch (entity) {
      case AuditEntity.GateIn: setGateInLogs(previousState); break;
      case AuditEntity.GateOut: setGateOutLogs(previousState); break;
      case AuditEntity.Transfer: setTransferLogs(previousState); break;
      case AuditEntity.Perfume: setPerfumes(previousState); break;
      case AuditEntity.Supplier: setSuppliers(previousState); break;
      case AuditEntity.Customer: setCustomers(previousState); break;
      case AuditEntity.Location: setLocations(previousState); break;
      case AuditEntity.PackingType: setPackingTypes(previousState); break;
      case AuditEntity.User: setUsers(previousState); break;
    }

    logAudit(AuditAction.Undo, entity, 'system', `Reverted last ${entity} change`, null);
    setUndoStack(null);
    // Re-fetch from DB to ensure consistency
    refreshData();
  }, [undoStack, logAudit, refreshData]);

  // ── Database Export/Import ───────────────────────────────────
  const triggerDownload = async (fileBlob: Blob, fileName: string) => {
    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'ScentVault Backup File',
            accept: { 'application/json': ['.json'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(fileBlob);
        await writable.close();
        return;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('File System Access API failed, falling back...', err);
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const link = document.createElement('a');
      link.href = reader.result as string;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 1000);
    };
    reader.readAsDataURL(fileBlob);
  };

  const exportDatabase = async () => {
    try {
      const data = {
        suppliers, customers, packingTypes, locations, perfumes, olfactiveNotes,
        gateInLogs, gateOutLogs, transferLogs, users, currentUser,
        exportDate: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const fileName = `scentvault_backup_${new Date().toISOString().split('T')[0]}.json`;
      await triggerDownload(blob, fileName);
    } catch (error) {
      console.error('Database Export failed:', error);
      alert('Failed to export database. Please check the console for details.');
    }
  };

  const importDatabase = useCallback((jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.customers) setCustomers(data.customers);
      if (data.packingTypes) setPackingTypes(data.packingTypes);
      if (data.locations) setLocations(data.locations);
      if (data.perfumes) setPerfumes(data.perfumes);
      if (data.olfactiveNotes) setOlfactiveNotes(data.olfactiveNotes);
      if (data.gateInLogs) setGateInLogs(data.gateInLogs);
      if (data.gateOutLogs) setGateOutLogs(data.gateOutLogs);
      if (data.transferLogs) setTransferLogs(data.transferLogs);
      if (data.users) setUsers(data.users);
      if (data.currentUser) setCurrentUser(data.currentUser);
      // Note: For a full DB import, the user should use Supabase's import tools
      // This just restores the local state for viewing
    } catch (e) {
      alert("Error importing database. Invalid file format.");
    }
  }, []);

  const resetDatabase = useCallback(() => {
    // This only resets local state - actual DB reset should be done via Supabase dashboard
    setSuppliers([]);
    setCustomers([]);
    setPackingTypes([]);
    setLocations([]);
    setPerfumes([]);
    setOlfactiveNotes([]);
    setGateInLogs([]);
    setGateOutLogs([]);
    setTransferLogs([]);
    setUsers([]);
    setAuditLogs([]);
    setUndoStack(null);
    alert('Local state cleared. To reset the database, use the Supabase dashboard.');
  }, []);

  // ── Computed: Location Helpers ───────────────────────────────
  const getMainLocations = useCallback(
    () =>
      locations.filter((l) => {
        const t = String(l?.type ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
        return t === 'main location';
      }),
    [locations],
  );
  const getSubLocations = useCallback((mainId: string) => locations.filter(l => l.type === 'Sub Location' && l.parentId === mainId), [locations]);

  const hasPermission = useCallback((permission: 'view_prices' | 'manage_users' | 'manage_master_data') => {
    if (!currentUser) return false;
    if (currentUser.role === UserRole.Admin) return true;
    if (permission === 'view_prices') return !!currentUser.permissions?.canViewPrices;
    return false;
  }, [currentUser]);

  // ── Computed: Stock Calculations ─────────────────────────────
  const getPerfumeStockBreakdown = useCallback((perfumeId: string): StockPosition[] => {
    return computeStockPositions(
      perfumeId,
      { gateIn: gateInLogs, gateOut: gateOutLogs, transfer: transferLogs },
      perfumes,
    );
  }, [gateInLogs, gateOutLogs, transferLogs, perfumes]);

  const getPerfumeMovementHistory = useCallback((perfumeId: string): MovementHistoryItem[] => {
    const history: MovementHistoryItem[] = [];
    gateInLogs.filter(l => l.perfumeId === perfumeId).forEach(l => history.push({ ...l, type: 'IN' }));
    gateOutLogs.filter(l => l.perfumeId === perfumeId).forEach(l => history.push({ ...l, type: 'OUT' }));
    transferLogs.filter(l => l.perfumeId === perfumeId).forEach(l => history.push({ ...l, type: 'TRANSFER' }));
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [gateInLogs, gateOutLogs, transferLogs]);

  const getBatchStock = useCallback((perfumeId: string, mainLocId: string, subLocId?: string, excludeLogId?: string) => {
    const stockMap: Record<string, number> = {};
    const arrivalMap: Record<string, string> = {};
    const normalizeBatch = (s: string) => (s || '').trim();

    const isTargetLoc = (mId: string, sId?: string) => {
      if (mId !== mainLocId) return false;
      if (subLocId && sId !== subLocId) return false;
      return true;
    };

    const getCompositeKey = (batch: string, ptId: string) => `${batch}|${ptId}`;

    gateInLogs.forEach(l => {
      if (l.perfumeId === perfumeId && isTargetLoc(l.mainLocationId, l.subLocationId)) {
        const b = normalizeBatch(l.importReference);
        if (b) {
          const k = getCompositeKey(b, l.packingTypeId);
          stockMap[k] = (stockMap[k] || 0) + Number(l.netWeight);
          if (!arrivalMap[k] || new Date(l.date) < new Date(arrivalMap[k])) {
            arrivalMap[k] = l.date;
          }
        }
      }
    });

    gateOutLogs.forEach(l => {
      if (l.id === excludeLogId) return;
      if (l.perfumeId === perfumeId && isTargetLoc(l.mainLocationId, l.subLocationId)) {
        const b = normalizeBatch(l.batchNumber);
        if (b) {
          const k = getCompositeKey(b, l.packingTypeId);
          stockMap[k] = (stockMap[k] || 0) - Number(l.netWeight);
        }
      }
    });

    transferLogs.forEach(l => {
      if (l.id === excludeLogId) return;
      if (l.perfumeId === perfumeId) {
        const b = normalizeBatch(l.batchNumber);
        if (b) {
          const fromLoc = isTargetLoc(l.fromMainLocationId, l.fromSubLocationId);
          const toLoc = isTargetLoc(l.toMainLocationId, l.toSubLocationId);
          const k = getCompositeKey(b, l.packingTypeId);

          if (fromLoc) stockMap[k] = (stockMap[k] || 0) - Number(l.netWeight);
          if (toLoc) {
            stockMap[k] = (stockMap[k] || 0) + Number(l.netWeight);
            if (!arrivalMap[k] || new Date(l.date) < new Date(arrivalMap[k])) {
              arrivalMap[k] = l.date;
            }
          }
        }
      }
    });

    return Object.entries(stockMap)
      .map(([key, weight]) => {
        const [batch, packingTypeId] = key.split('|');
        return { batch, packingTypeId, weight, arrivalDate: arrivalMap[key] || '9999-12-31' };
      })
      .filter(item => item.weight > 0.001)
      .sort((a, b) => {
        const dateA = a.arrivalDate === '9999-12-31' ? Infinity : new Date(a.arrivalDate).getTime();
        const dateB = b.arrivalDate === '9999-12-31' ? Infinity : new Date(b.arrivalDate).getTime();
        return dateA - dateB;
      });
  }, [gateInLogs, gateOutLogs, transferLogs]);

  // ── Context Provider ─────────────────────────────────────────
  return (
    <InventoryContext.Provider value={{
      suppliers, customers, packingTypes, locations, perfumes, olfactiveNotes,
      gateInLogs, gateOutLogs, transferLogs, users, currentUser,
      isLoading, error,
      addPerfume, updatePerfume, deletePerfume,
      addLocation, updateLocation, deleteLocation,
      addCustomer, updateCustomer,
      addPackingType, updatePackingType, deletePackingType,
      addOlfactiveNote, updateOlfactiveNote, deleteOlfactiveNote,
      addGateInLog, updateGateInLog, deleteGateInLog,
      addGateOutLog, updateGateOutLog, deleteGateOutLog,
      addTransferLog, updateTransferLog, deleteTransferLog,
      updateUser, deleteUser, setCurrentUser,
      exportDatabase, importDatabase, resetDatabase,
      getMainLocations, getSubLocations, hasPermission,
      getBatchStock,
      getPerfumeStockBreakdown,
      getPerfumeMovementHistory,
      auditLogs,
      undoAction,
      canUndo: !!undoStack,
      addSupplier, updateSupplier, deleteSupplier,
      refreshData,
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