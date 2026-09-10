import type { UserReference } from "../types";

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

export interface InteractionRow {
  id: string;
  customer_id: string;
  customer_location_id: string | null;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  interaction_type: string;
  reason: string | null;
  result: string | null;
  notes: string | null;
  next_action: string | null;
  follow_up_at: string | null;
  created_at: string;
  updated_at: string;
}
