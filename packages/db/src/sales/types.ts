import type { UserReference } from "../types";

export interface SalesHandoffTask {
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
  sourceInteractionId: string;
  sourceReason: string | null;
  sourceResult: string | null;
  sourceNotes: string | null;
  sourceNextAction: string | null;
  createdAt: string;
}

export interface SalesHandoffTaskRow {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_city: string | null;
  assigned_user_id: string;
  assigned_user_name: string;
  assigned_user_email: string;
  assigned_user_role: string;
  created_by_user_id: string | null;
  created_by_user_name: string | null;
  created_by_user_email: string | null;
  created_by_user_role: string | null;
  task_type: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_at: string | null;
  source_interaction_id: string;
  source_reason: string | null;
  source_result: string | null;
  source_notes: string | null;
  source_next_action: string | null;
  created_at: string;
}
