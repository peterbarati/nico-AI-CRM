import { describe, expect, it } from "vitest";
import { canTransitionTask, isTaskOverdue } from "./tasks";

describe("task lifecycle rules", () => {
  it("allows only forward operational transitions", () => {
    expect(canTransitionTask("open", "in_progress")).toBe(true);
    expect(canTransitionTask("open", "completed")).toBe(true);
    expect(canTransitionTask("in_progress", "cancelled")).toBe(true);
    expect(canTransitionTask("completed", "open")).toBe(false);
    expect(canTransitionTask("cancelled", "in_progress")).toBe(false);
  });

  it("centralizes overdue handling for actionable tasks", () => {
    const now = "2026-09-14T08:00:00.000Z";
    expect(isTaskOverdue("open", "2026-09-14T07:59:59.000Z", now)).toBe(true);
    expect(isTaskOverdue("in_progress", "2026-09-14T08:00:00.000Z", now)).toBe(false);
    expect(isTaskOverdue("completed", "2026-09-13T08:00:00.000Z", now)).toBe(false);
    expect(isTaskOverdue("open", null, now)).toBe(false);
  });
});
