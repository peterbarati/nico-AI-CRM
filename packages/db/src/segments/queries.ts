import type { DatabaseContext } from "../types";
import type { CustomerSegmentMembership, Segment, SegmentRow } from "./types";

export async function listSegments(context: DatabaseContext): Promise<Segment[]> {
  const result = await context.db
    .prepare(
      `
      SELECT id, code, name, description, active, system
      FROM customer_segments
      ORDER BY system DESC, code ASC
    `
    )
    .all<SegmentRow>();

  return result.results.map(mapSegment);
}

export async function getCustomerSegments(
  context: DatabaseContext,
  customerId: string
): Promise<CustomerSegmentMembership[]> {
  const result = await context.db
    .prepare(
      `
      SELECT s.id, s.code, s.name, s.description, s.active, s.system,
        m.reason, m.score, m.assigned_at, m.expires_at
      FROM customer_segment_memberships m
      JOIN customer_segments s ON s.id = m.segment_id
      WHERE m.customer_id = ?
      ORDER BY m.score DESC, s.code ASC
    `
    )
    .bind(customerId)
    .all<SegmentRow>();

  return result.results.map((row) => ({
    ...mapSegment(row),
    reason: row.reason ?? null,
    score: row.score ?? null,
    assignedAt: row.assigned_at ?? "",
    expiresAt: row.expires_at ?? null
  }));
}

function mapSegment(row: SegmentRow): Segment {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    active: Boolean(row.active),
    system: Boolean(row.system)
  };
}
