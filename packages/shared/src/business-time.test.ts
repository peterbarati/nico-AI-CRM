import { describe, expect, it } from "vitest";
import { getBusinessDate, getBusinessDateRange, isValidBusinessTimezone } from "./business-time";

describe("business timezone utilities", () => {
  it("resolves a business date across the UTC midnight boundary", () => {
    const instant = new Date("2026-09-10T22:30:00.000Z");

    expect(getBusinessDate(instant, "Europe/Bratislava")).toBe("2026-09-11");
    expect(getBusinessDate(instant, "America/New_York")).toBe("2026-09-10");
  });

  it("creates DST-aware UTC boundaries for a Bratislava business day", () => {
    const summer = getBusinessDateRange(
      "today",
      new Date("2026-09-11T12:00:00.000Z"),
      "Europe/Bratislava"
    );
    const winter = getBusinessDateRange(
      "today",
      new Date("2026-12-11T12:00:00.000Z"),
      "Europe/Bratislava"
    );

    expect(summer).toMatchObject({
      fromUtc: "2026-09-10T22:00:00.000Z",
      toUtcExclusive: "2026-09-11T22:00:00.000Z"
    });
    expect(winter).toMatchObject({
      fromUtc: "2026-12-10T23:00:00.000Z",
      toUtcExclusive: "2026-12-11T23:00:00.000Z"
    });
  });

  it("builds current week, month, and validated custom ranges", () => {
    const now = new Date("2026-09-11T12:00:00.000Z");

    expect(getBusinessDateRange("week", now, "Europe/Bratislava").fromDate).toBe("2026-09-07");
    expect(getBusinessDateRange("month", now, "Europe/Bratislava").fromDate).toBe("2026-09-01");
    expect(getBusinessDateRange("day", now, "Europe/Bratislava").fromDate).toBe("2026-09-11");
    expect(getBusinessDateRange("previous_month", now, "Europe/Bratislava")).toMatchObject({
      fromDate: "2026-08-01",
      toDate: "2026-08-31"
    });
    expect(
      getBusinessDateRange("custom", now, "Europe/Bratislava", "2026-09-02", "2026-09-04")
    ).toMatchObject({ fromDate: "2026-09-02", toDate: "2026-09-04" });
    expect(() =>
      getBusinessDateRange("custom", now, "Europe/Bratislava", "2026-09-05", "2026-09-04")
    ).toThrow("must not be after");
  });

  it("validates IANA timezone names", () => {
    expect(isValidBusinessTimezone("Europe/Bratislava")).toBe(true);
    expect(isValidBusinessTimezone("Not/A_Timezone")).toBe(false);
  });
});
