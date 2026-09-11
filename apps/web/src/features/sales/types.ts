import type {
  ApiPagination,
  CustomerOverview,
  SalesVisit,
  TaskItem,
  UserReference
} from "../customers/types";

export interface SalesTask {
  id: string;
  customerId: string;
  customerName: string;
  customerCity: string | null;
  assignedUser: UserReference;
  requestedBy: UserReference | null;
  taskType: string;
  title: string;
  context: string | null;
  priority: string;
  status: string;
  dueAt: string | null;
  sourceInteractionId: string | null;
  sourceReason: string | null;
  sourceResult: string | null;
  sourceNotes: string | null;
  sourceNextAction: string | null;
  visit: { id: string; status: string; plannedAt: string | null } | null;
  createdAt: string;
}

export interface SalesTaskDetail {
  task: SalesTask;
  customer: CustomerOverview;
  visit: SalesVisit | null;
}
export interface SalesTaskFilters {
  page: number;
  pageSize: number;
  assignedUserId: string;
  status: string;
  priority: string;
  due: string;
}
export interface SalesTaskPage {
  items: SalesTask[];
  pagination: ApiPagination;
}
export interface SalesVisitWriteResult {
  duplicate: boolean;
  visit: SalesVisit;
  sourceTask: TaskItem | null;
  followUpTask: TaskItem | null;
}
