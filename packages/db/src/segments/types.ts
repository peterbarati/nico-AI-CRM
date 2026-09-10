export interface Segment {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  system: boolean;
}

export interface CustomerSegmentMembership extends Segment {
  reason: string | null;
  score: number | null;
  assignedAt: string;
  expiresAt: string | null;
}

export interface SegmentRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: number;
  system: number;
  reason?: string | null;
  score?: number | null;
  assigned_at?: string;
  expires_at?: string | null;
}
