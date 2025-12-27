
export enum ProjectStatus {
  PLANNING = '規劃中',
  IN_PROGRESS = '進行中',
  COMPLETED = '已完工',
  ON_HOLD = '暫停'
}

export enum ProjectType {
  CONSTRUCTION = 'construction',
  MAINTENANCE = 'maintenance',
  MODULAR_HOUSE = 'modular_house'
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  WORKER = 'worker'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  notes?: string;
}

export interface SitePhoto {
  id: string;
  url: string;
  timestamp: number;
  description: string;
  aiAnalysis?: string;
}

export enum MaterialStatus {
  PENDING = '待採購',
  ORDERED = '已訂購',
  DELIVERED = '已進場'
}

export interface Material {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  status: MaterialStatus;
  notes?: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface DailyReport {
  id: string;
  date: string;
  weather: 'sunny' | 'cloudy' | 'rainy';
  content: string;
  reporter: string;
  timestamp: number;
  photos?: string[];
  worker?: string;
  assistant?: string;
}

export interface ConstructionItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  location: string;
  worker: string;
  assistant: string;
  date: string;
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

export interface TeamConfig {
  master: string;
  assistant: string;
  carNumber: string;
}

export interface DaySchedule {
  date: string;
  teams: Record<number, { tasks: string[] }>;
}

export interface WeeklySchedule {
  weekStartDate: string;
  teamConfigs?: Record<number, TeamConfig>;
  days: Record<string, DaySchedule>;
}

export type GlobalTeamConfigs = Record<number, TeamConfig>;

export interface DailyDispatchTask {
  name: string;
  description: string;
}

export interface DailyDispatch {
  date: string;
  teams: Record<number, {
    master: string;
    assistants: string[];
    carNumber: string;
    tasks: DailyDispatchTask[];
  }>;
}

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
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
  materialFillingDate?: string;
  materialRequisitioner?: string;
  materialDeliveryDate?: string;
  materialDeliveryLocation?: '廠內' | '現場';
  materialReceiver?: string;
  reports: DailyReport[];
  attachments: Attachment[];
  constructionItems: ConstructionItem[];
  constructionSignatures: ConstructionSignature[];
  completionReports: CompletionReport[];
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: number;
}

// HR 相關介面
export type EmployeeCategory = '做件' | '現場' | '廠內';

export interface Employee {
  id: string;
  name: string;
  category: EmployeeCategory;
}

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  employeeId: string;
  status: string; // 排休, 請假, 病假, 臨時請假, 廠內, 下午回廠 或 自定義
  remark?: string;
}

export interface OvertimeRecord {
  date: string; // YYYY-MM-DD
  employeeId: string;
  hours: number;
  remark?: string;
}

export interface MonthSummaryRemark {
  month: string; // YYYY-MM
  employeeId: string;
  remark: string;
}
