import type { UserReference } from "../types";

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

export interface TaskRow {
  id: string;
  customer_id: string | null;
  customer_location_id: string | null;
  assigned_user_id: string;
  assigned_user_name: string;
  assigned_user_email: string;
  assigned_user_role: string;
  created_by_user_id: string | null;
  created_by_user_name: string | null;
  created_by_user_email: string | null;
  created_by_user_role: string | null;
  source_interaction_id: string | null;
  source_visit_id: string | null;
  customer_name: string | null;
  title: string;
  description: string | null;
  task_type: string;
  priority: string;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
