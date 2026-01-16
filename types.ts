export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  ENGINEERING = 'ENGINEERING',
  FACTORY = 'FACTORY',
  WORKER = 'WORKER'
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD'
}

export enum ProjectType {
  CONSTRUCTION = 'CONSTRUCTION',
  MODULAR_HOUSE = 'MODULAR_HOUSE',
  MAINTENANCE = 'MAINTENANCE'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  notes?: string;
  completed: boolean;
}

export interface Material {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  status: MaterialStatus;
  notes?: string;
}

export enum MaterialStatus {
  PENDING = 'PENDING',
  ORDERED = 'ORDERED',
  DELIVERED = 'DELIVERED'
}

export interface SitePhoto {
  id: string;
  url: string;
  timestamp: number;
  description?: string;
}

export interface DailyReport {
  id: string;
  date: string;
  weather: 'sunny' | 'cloudy' | 'rainy';
  content: string;
  reporter: string;
  timestamp: number;
  photos?: string[]; // IDs
  worker?: string;
  assistant?: string;
}

export interface ConstructionItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  location?: string;
  worker: string;
  assistant: string;
  date: string;
  isProduced?: boolean;
  productionDate?: string;
  supplierId?: string;
  isPoCreated?: boolean;
}

export interface ConstructionSignature {
  id: string;
  date: string;
  url: string;
  timestamp: number;
}

export interface CompletionItem {
  name: string;
  action: 'install' | 'dismantle' | 'none';
  quantity: string;
  unit: string;
  category: string;
  spec?: string;
  itemNote?: string;
  isPoCreated?: boolean;
  productionDate?: string;
  isProduced?: boolean;
  supplierId?: string;
}

export interface CompletionReport {
  id: string;
  date: string;
  worker: string;
  items: CompletionItem[];
  notes: string;
  signature: string;
  timestamp: number;
}

export interface FenceMaterialItem {
  id: string;
  name: string;
  spec: string;
  quantity: number;
  unit: string;
  supplierId?: string;
  isPoCreated?: boolean;
}

export interface FenceMaterialSheet {
  category: string;
  items: FenceMaterialItem[];
}

export interface Project {
  id: string;
  type: ProjectType;
  name: string;
  clientName: string;
  clientContact: string;
  clientPhone: string;
  address: string;
  status: ProjectStatus;
  progress: number;
  appointmentDate: string;
  reportDate: string;
  description: string;
  remarks: string;
  milestones: Milestone[];
  photos: SitePhoto[];
  materials: Material[];
  reports: DailyReport[];
  attachments: Attachment[];
  constructionItems: ConstructionItem[];
  constructionSignatures: ConstructionSignature[];
  completionReports: CompletionReport[];
  planningReports: CompletionReport[]; 
  fenceMaterialSheets?: Record<string, FenceMaterialSheet>;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
  materialFillingDate?: string;
  materialDeliveryDate?: string;
  materialRequisitioner?: string;
  materialDeliveryLocation?: string;
  materialReceiver?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: number;
}

export interface TeamConfig {
  master: string;
  assistant: string;
  carNumber: string;
}

export type GlobalTeamConfigs = Record<number, TeamConfig>;

export interface DailyDispatchTeam {
  master: string;
  assistants: string[];
  carNumber: string;
  tasks: { name: string; description: string }[];
}

export interface DailyDispatch {
  date: string;
  teams: Record<number, DailyDispatchTeam>;
}

export interface WeeklyScheduleDay {
  date: string;
  teams: Record<number, { tasks: string[] }>;
}

export interface WeeklySchedule {
  weekStartDate: string;
  teamConfigs: Record<number, TeamConfig>;
  days: Record<string, WeeklyScheduleDay>;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
}

export interface MaterialFormulaItem {
  id: string;
  name: string;
  formula: string;
  unit: string;
}

export interface MaterialFormulaConfig {
  id: string;
  keyword: string;
  category: string;
  items: MaterialFormulaItem[];
}

export interface RolePermission {
  displayName: string;
  allowedViews: string[];
}

export interface ImportConfig {
  projectKeywords: {
    maintenance: string;
    modular: string;
  };
}

export interface ConstructionItemOption {
  name: string;
  unit: string;
}

export interface CompletionCategoryOption {
  id: string;
  label: string;
  defaultUnit: string;
  items: string[];
}

export interface SystemRules {
  productionKeywords: string[];
  subcontractorKeywords: string[];
  modularProductionKeywords: string[];
  modularSubcontractorKeywords: string[];
  materialFormulas: MaterialFormulaConfig[];
  rolePermissions?: Record<UserRole, RolePermission>;
  importConfig?: ImportConfig;
  standardConstructionItems: ConstructionItemOption[];
  maintenanceConstructionItems: ConstructionItemOption[];
  completionCategories: CompletionCategoryOption[];
}

export type EmployeeCategory = '做件' | '現場' | '廠內' | '辦公室';

export interface Employee {
  id: string;
  name: string;
  nickname?: string;
  lineId?: string;
  category: EmployeeCategory;
}

export interface AttendanceRecord {
  date: string;
  employeeId: string;
  status: string;
}

export interface OvertimeRecord {
  date: string;
  employeeId: string;
  hours: number;
}

export interface MonthSummaryRemark {
  month: string;
  employeeId: string;
  remark: string;
}

export interface ProductEntry {
  name: string;
  spec: string;
  usage: string;
}

export interface Supplier {
  id: string;
  name: string;
  address: string;
  contact: string;
  companyPhone: string;
  mobilePhone: string;
  lineId?: string;
  productList: ProductEntry[];
}

export interface PurchaseOrderItem {
  materialId: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  notes: string;
  supplierId: string;
  projectName: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  date: string;
  projectId: string;
  projectIds: string[];
  projectName: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  status: 'draft' | 'ordered' | 'received';
  totalAmount: number;
  isOrdered?: boolean;
  requisitioner?: string;
  deliveryDate?: string;
  deliveryLocation?: string;
  receiver?: string;
  remarks?: string;
}

export interface StockAlertItem {
  id: string;
  name: string;
  spec: string;
  quantity: string;
  unit: string;
  note: string;
  timestamp: number;
}

export interface Tool {
  id: string;
  name: string;
  brand: string;
  model: string;
  status: 'available' | 'in_use' | 'maintenance';
  borrower: string;
  lastMaintenance: string;
  notes: string;
}

export interface Asset {
  id: string;
  name: string;
  spec: string;
  purchaseDate: string;
  location: string;
  nextInspection: string;
  owner: string;
  notes: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  currentMileage: number;
  nextMaintenanceMileage: number;
  insuranceExpiry: string;
  mainDriver: string;
  notes: string;
}