import { client } from '@/lib/api/client';

// ---------- Types ----------

export interface Part {
  id: string;
  companyId: string;
  locationId?: string;
  partNumber: string;
  name: string;
  engineeringPartNo?: string;
  categoryId?: string;
  category?: { id: string; name: string };
  productModelId?: string;
  productModel?: { id: string; name: string };
  uomId?: string;
  uom?: { id: string; name: string; abbreviation: string };
  partType: string;
  revision?: string;
  drawingReference?: string;
  hsnCode?: string;
  weight?: number;
  dimensions?: string;
  isBatchTracked: boolean;
  isSerialTracked: boolean;
  isBomEnabled: boolean;
  isQcRequired: boolean;
  isInventoryItem: boolean;
  preferredVendorId?: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PartCategory {
  id: string;
  companyId: string;
  name: string;
  code?: string;
  isActive: boolean;
}

export interface ProductModel {
  id: string;
  companyId: string;
  name: string;
  code?: string;
  isActive: boolean;
}

export interface UnitOfMeasure {
  id: string;
  companyId: string;
  name: string;
  abbreviation: string;
  isActive: boolean;
}

export interface PartComponentType {
  id: string;
  companyId: string;
  name: string;
  isActive: boolean;
}

export interface Machine {
  id: string;
  companyId: string;
  locationId?: string;
  assetCode: string;
  assetName: string;
  machineCode?: string;
  serialNumber?: string;
  categoryId?: string;
  category?: { id: string; name: string };
  typeId?: string;
  type?: { id: string; name: string };
  zoneId?: string;
  zone?: { id: string; name: string };
  departmentId?: string;
  lineWorkCenter?: string;
  priority: string;
  capacity?: string;
  make?: string;
  model?: string;
  powerRating?: string;
  yearOfManufacture?: number;
  status: string;
  idleReason?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MachineCategory {
  id: string;
  companyId: string;
  name: string;
  isActive: boolean;
}

export interface MachineType {
  id: string;
  companyId: string;
  name: string;
  isActive: boolean;
}

export interface MachineZone {
  id: string;
  companyId: string;
  name: string;
  code?: string;
  locationId?: string;
  isActive: boolean;
}

// ---------- Part API ----------

export const partApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/masters/parts', { params }),
  get: (id: string) =>
    client.get(`/masters/parts/${id}`),
  create: (data: Record<string, unknown>) =>
    client.post('/masters/parts', data),
  update: (id: string, data: Record<string, unknown>) =>
    client.patch(`/masters/parts/${id}`, data),
  delete: (id: string) =>
    client.delete(`/masters/parts/${id}`),

  // Sub-resources
  listCategories: () =>
    client.get('/masters/parts/categories/list'),
  createCategory: (data: Record<string, unknown>) =>
    client.post('/masters/parts/categories', data),
  updateCategory: (id: string, data: Record<string, unknown>) =>
    client.patch(`/masters/parts/categories/${id}`, data),
  deleteCategory: (id: string) =>
    client.delete(`/masters/parts/categories/${id}`),

  listProductModels: () =>
    client.get('/masters/parts/product-models/list'),
  createProductModel: (data: Record<string, unknown>) =>
    client.post('/masters/parts/product-models', data),
  updateProductModel: (id: string, data: Record<string, unknown>) =>
    client.patch(`/masters/parts/product-models/${id}`, data),
  deleteProductModel: (id: string) =>
    client.delete(`/masters/parts/product-models/${id}`),

  listUoms: () =>
    client.get('/masters/parts/uoms/list'),
  createUom: (data: Record<string, unknown>) =>
    client.post('/masters/parts/uoms', data),
  updateUom: (id: string, data: Record<string, unknown>) =>
    client.patch(`/masters/parts/uoms/${id}`, data),
  deleteUom: (id: string) =>
    client.delete(`/masters/parts/uoms/${id}`),

  listComponentTypes: () =>
    client.get('/masters/parts/component-types/list'),
  createComponentType: (data: Record<string, unknown>) =>
    client.post('/masters/parts/component-types', data),
  updateComponentType: (id: string, data: Record<string, unknown>) =>
    client.patch(`/masters/parts/component-types/${id}`, data),
  deleteComponentType: (id: string) =>
    client.delete(`/masters/parts/component-types/${id}`),
};

// ---------- Machine API ----------

export const machineApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/masters/machines', { params }),
  get: (id: string) =>
    client.get(`/masters/machines/${id}`),
  create: (data: Record<string, unknown>) =>
    client.post('/masters/machines', data),
  update: (id: string, data: Record<string, unknown>) =>
    client.patch(`/masters/machines/${id}`, data),
  delete: (id: string) =>
    client.delete(`/masters/machines/${id}`),

  listCategories: () =>
    client.get('/masters/machines/categories/list'),
  createCategory: (data: Record<string, unknown>) =>
    client.post('/masters/machines/categories', data),
  updateCategory: (id: string, data: Record<string, unknown>) =>
    client.patch(`/masters/machines/categories/${id}`, data),
  deleteCategory: (id: string) =>
    client.delete(`/masters/machines/categories/${id}`),

  listTypes: () =>
    client.get('/masters/machines/types/list'),
  createType: (data: Record<string, unknown>) =>
    client.post('/masters/machines/types', data),
  updateType: (id: string, data: Record<string, unknown>) =>
    client.patch(`/masters/machines/types/${id}`, data),
  deleteType: (id: string) =>
    client.delete(`/masters/machines/types/${id}`),

  listZones: (params?: Record<string, unknown>) =>
    client.get('/masters/machines/zones/list', { params }),
  createZone: (data: Record<string, unknown>) =>
    client.post('/masters/machines/zones', data),
  updateZone: (id: string, data: Record<string, unknown>) =>
    client.patch(`/masters/machines/zones/${id}`, data),
  deleteZone: (id: string) =>
    client.delete(`/masters/machines/zones/${id}`),
};
