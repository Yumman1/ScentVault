
export enum SupplierType {
  Local = 'Local',
  International = 'International'
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  type: SupplierType;
  phone: string;
  email: string;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
}

export interface PackingType {
  id: string;
  name: string;
  description: string;
  qtyPerPacking: number; // The cyclical calculation factor
}

export enum LocationType {
  Main = 'Main Location',
  Sub = 'Sub Location'
}

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  parentId?: string; // If type is Sub, links to Main Location ID
}

export interface Perfume {
  id: string;
  name: string;
  code: string;
  supplierId: string;
  dosage: number;
  priceUSD: number;
  pricePKR: number;
  lowStockAlert: number;
  olfactiveNotes: string[];
  remarks: string;
}

export enum TransactionType {
  GateIn = 'Gate In',
  GateOut = 'Gate Out',
  Transfer = 'Stock Transfer'
}

export interface GateInLog {
  id: string;
  date: string;
  perfumeId: string;
  importReference: string;
  packingTypeId: string;
  packingQty: number;
  netWeight: number;
  mainLocationId: string;
  subLocationId?: string;
  supplierInvoice: string;
  remarks: string;
  priceUSD?: number;
  pricePKR?: number;
}

export enum GateOutUsage {
  Production = 'Production',
  Sale = 'Sale'
}

export interface GateOutLog {
  id: string;
  date: string;
  perfumeId: string;
  packingTypeId: string;
  packingQty: number;
  netWeight: number;
  mainLocationId: string;
  subLocationId?: string;
  usage: GateOutUsage;
  customerId?: string; // If usage is Sale
  remarks: string;
  batchNumber: string;
}

export interface StockTransferLog {
  id: string;
  date: string;
  perfumeId: string;
  packingTypeId: string;
  packingQty: number;
  netWeight: number;
  fromMainLocationId: string;
  fromSubLocationId?: string;
  toMainLocationId: string;
  toSubLocationId?: string;
  remarks: string;
  batchNumber: string;
}

// --- USER MANAGEMENT TYPES ---

export enum UserRole {
  Admin = 'Admin',
  Operator = 'Operator',
  Viewer = 'Viewer'
}

export interface UserPermissions {
  canViewPrices: boolean; // If false, hide all cost/value columns and dashboard cards
  allowedLocationIds: string[]; // If empty, can view all. If populated, restrict reports/dashboard to these locations.
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  permissions?: UserPermissions; // Primarily for Viewers
}
