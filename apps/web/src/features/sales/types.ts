import type { UserReference } from "../customers/types";

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
