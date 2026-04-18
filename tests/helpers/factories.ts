import { randomUUID } from 'crypto';
import {
  LocationType,
  SupplierType,
  GateOutUsage,
  type Supplier,
  type Customer,
  type PackingType,
  type Location,
  type Perfume,
  type GateInLog,
  type GateOutLog,
  type StockTransferLog,
} from '../../types';

export const TEST_PREFIX = 'TEST_';

let counter = 0;
const tag = () => {
  counter += 1;
  return `${Date.now().toString(36)}_${counter}`;
};

export function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: randomUUID(),
    name: `${TEST_PREFIX}Supplier ${tag()}`,
    type: SupplierType.Local,
    contactPerson: 'Jane Doe',
    phone: '+1 555 0100',
    email: 'supplier@test.local',
    ...overrides,
  };
}

export function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: randomUUID(),
    name: `${TEST_PREFIX}Customer ${tag()}`,
    address: '1 Test Street',
    phone: '+1 555 0200',
    email: 'customer@test.local',
    ...overrides,
  };
}

export function makePackingType(overrides: Partial<PackingType> = {}): PackingType {
  return {
    id: randomUUID(),
    name: `${TEST_PREFIX}Drum ${tag()}`,
    description: '25 kg industrial drum',
    qtyPerPacking: 25,
    ...overrides,
  };
}

export function makeMainLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: randomUUID(),
    name: `${TEST_PREFIX}Main ${tag()}`,
    type: LocationType.Main,
    parentId: undefined,
    ...overrides,
  };
}

export function makeSubLocation(
  parentId: string,
  overrides: Partial<Location> = {},
): Location {
  return {
    id: randomUUID(),
    name: `${TEST_PREFIX}Sub ${tag()}`,
    type: LocationType.Sub,
    parentId,
    ...overrides,
  };
}

export function makePerfume(
  supplierId: string,
  overrides: Partial<Perfume> = {},
): Perfume {
  return {
    id: randomUUID(),
    name: `${TEST_PREFIX}Perfume ${tag()}`,
    code: `TST-${tag()}`,
    supplierId,
    dosage: 10,
    priceUSD: 123.45,
    pricePKR: 34567,
    lowStockAlert: 5,
    olfactiveNotes: [],
    remarks: 'created by automated test',
    ...overrides,
  };
}

export function makeGateIn(
  perfumeId: string,
  mainLocationId: string,
  packingTypeId: string,
  overrides: Partial<GateInLog> = {},
): GateInLog {
  return {
    id: randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    perfumeId,
    importReference: `${TEST_PREFIX}BATCH_${tag()}`,
    packingTypeId,
    packingQty: 4,
    netWeight: 100,
    mainLocationId,
    subLocationId: undefined,
    supplierInvoice: `INV-${tag()}`,
    remarks: '',
    priceUSD: 99.99,
    pricePKR: 28000,
    ...overrides,
  };
}

export function makeGateOut(
  perfumeId: string,
  mainLocationId: string,
  packingTypeId: string,
  batchNumber: string,
  overrides: Partial<GateOutLog> = {},
): GateOutLog {
  return {
    id: randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    perfumeId,
    packingTypeId,
    packingQty: 1,
    netWeight: 25,
    mainLocationId,
    subLocationId: undefined,
    usage: GateOutUsage.Production,
    customerId: undefined,
    remarks: '',
    batchNumber,
    ...overrides,
  };
}

export function makeTransfer(
  perfumeId: string,
  fromMainId: string,
  toMainId: string,
  packingTypeId: string,
  batchNumber: string,
  overrides: Partial<StockTransferLog> = {},
): StockTransferLog {
  return {
    id: randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    perfumeId,
    packingTypeId,
    packingQty: 1,
    netWeight: 30,
    fromMainLocationId: fromMainId,
    fromSubLocationId: undefined,
    toMainLocationId: toMainId,
    toSubLocationId: undefined,
    remarks: '',
    batchNumber,
    ...overrides,
  };
}
