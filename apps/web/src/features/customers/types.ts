export interface ApiPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UserReference {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface CustomerListSegment {
  id: string;
  code: string;
  name: string;
  reason: string | null;
  score: number | null;
}

export interface CustomerListInteractionSummary {
  id: string;
  interactionType: string;
  reason: string | null;
  result: string | null;
  createdAt: string;
}

export interface CustomerListItem {
  id: string;
  externalId: string | null;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string;
  b2bStatus: string;
  active: boolean;
  assignedSalesRep: UserReference | null;
  lastOrderDate: string | null;
  turnover90d: number;
  turnover365d: number;
  previousTurnover90d: number;
  salesTrend: "up" | "flat" | "down" | "new";
  daysSinceLastOrder: number | null;
  openTaskCount: number;
  segments: CustomerListSegment[];
  lastInteraction: CustomerListInteractionSummary | null;
  updatedAt: string;
}

export interface CustomerLocation {
  id: string;
  externalId: string | null;
  customerId: string;
  name: string;
  locationType: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  active: boolean;
}

export interface CustomerMetrics {
  customerId: string;
  lastOrderDate: string | null;
  firstOrderDate: string | null;
  turnover30d: number;
  turnover90d: number;
  turnover365d: number;
  previousTurnover90d: number;
  averageOrderValue: number | null;
  averageReorderDays: number | null;
  daysSinceLastOrder: number | null;
  orderCount30d: number;
  orderCount90d: number;
  orderCount365d: number;
  lifetimeOrderCount: number;
  lifetimeTurnover: number;
  updatedAt: string;
}

export interface CustomerSegmentMembership extends CustomerListSegment {
  description: string | null;
  active: boolean;
  system: boolean;
  assignedAt: string;
  expiresAt: string | null;
}

export interface OrderSummary {
  id: string;
  externalId: string | null;
  customerId: string;
  customerLocationId: string | null;
  orderNumber: string;
  orderDate: string;
  netAmount: number;
  grossAmount: number;
  currency: string;
  status: string;
  source: string;
}

export interface CustomerInteraction {
  id: string;
  customerId: string;
  customerLocationId: string | null;
  user: UserReference;
  interactionType: string;
  reason: string | null;
  result: string | null;
  notes: string | null;
  nextAction: string | null;
  followUpAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem {
  id: string;
  customerId: string | null;
  customerLocationId: string | null;
  assignedUser: UserReference;
  createdByUser: UserReference | null;
  sourceInteractionId: string | null;
  sourceVisitId: string | null;
  customerName: string | null;
  title: string;
  description: string | null;
  taskType: string;
  priority: string;
  status: string;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalesVisit {
  id: string;
  customerId: string;
  customerLocationId: string | null;
  salesRep: UserReference;
  plannedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  status: string;
  result: string | null;
  notes: string | null;
  orderValue: number | null;
  sourceTaskId: string | null;
  nextAction: string | null;
  followUpAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOverview {
  customer: CustomerListItem;
  locations: CustomerLocation[];
  metrics: CustomerMetrics | null;
  segments: CustomerSegmentMembership[];
  latestInteractions: CustomerInteraction[];
  latestOrders: OrderSummary[];
  openTasks: TaskItem[];
}

export interface SegmentOption {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  system: boolean;
}

export interface CustomerFilterOptions {
  salesReps: UserReference[];
  b2bStatuses: string[];
  segments: SegmentOption[];
}

export interface CustomerListFilters {
  active: "all" | "true" | "false";
  assignedSalesRepId: string;
  b2bStatus: string;
  direction: "asc" | "desc";
  page: number;
  pageSize: number;
  search: string;
  segmentCode: string;
  sort: string;
}

export interface PaginatedResponse<T> {
  ok: true;
  data: T[];
  pagination: ApiPagination;
}

export interface DataResponse<T> {
  ok: true;
  data: T;
}
