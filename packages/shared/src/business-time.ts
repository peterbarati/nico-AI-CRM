export type ActivityPeriodPreset = "today" | "day" | "week" | "month" | "previous_month" | "custom";

export interface BusinessDateRange {
  fromDate: string;
  toDate: string;
  fromUtc: string;
  toUtcExclusive: string;
  timezone: string;
}

export function isValidBusinessTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function getBusinessDate(now: Date, timezone: string): string {
  assertTimezone(timezone);
  const parts = getZonedParts(now, timezone);
  return formatDate(parts.year, parts.month, parts.day);
}

export function getBusinessDateRange(
  preset: ActivityPeriodPreset,
  now: Date,
  timezone: string,
  customFrom?: string,
  customTo?: string
): BusinessDateRange {
  assertTimezone(timezone);
  const today = parseBusinessDate(getBusinessDate(now, timezone));
  let from = today;
  let to = today;

  if (preset === "week") {
    const weekday = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay();
    from = addDays(today, -(weekday === 0 ? 6 : weekday - 1));
  } else if (preset === "month") {
    from = { year: today.year, month: today.month, day: 1 };
  } else if (preset === "previous_month") {
    const previousMonthLastDay = addDays({ year: today.year, month: today.month, day: 1 }, -1);
    from = { year: previousMonthLastDay.year, month: previousMonthLastDay.month, day: 1 };
    to = previousMonthLastDay;
  } else if (preset === "custom") {
    if (!customFrom || !customTo) {
      throw new Error("Custom activity period requires from and to dates.");
    }
    from = parseBusinessDate(customFrom);
    to = parseBusinessDate(customTo);
    if (compareDates(from, to) > 0) {
      throw new Error("Activity period start must not be after its end.");
    }
    if (daysBetween(from, to) > 366) {
      throw new Error("Activity period cannot exceed 366 days.");
    }
  }

  const nextDay = addDays(to, 1);
  return {
    fromDate: formatDate(from.year, from.month, from.day),
    toDate: formatDate(to.year, to.month, to.day),
    fromUtc: zonedMidnightToUtc(from, timezone).toISOString(),
    toUtcExclusive: zonedMidnightToUtc(nextDay, timezone).toISOString(),
    timezone
  };
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

interface ZonedParts extends DateParts {
  hour: number;
  minute: number;
  second: number;
}

function zonedMidnightToUtc(date: DateParts, timezone: string): Date {
  const localAsUtc = Date.UTC(date.year, date.month - 1, date.day);
  let candidate = new Date(localAsUtc);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = getZonedParts(candidate, timezone);
    const representedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    const adjustment = localAsUtc - representedAsUtc;
    if (adjustment === 0) {
      return candidate;
    }
    candidate = new Date(candidate.getTime() + adjustment);
  }

  return candidate;
}

function getZonedParts(date: Date, timezone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second
  };
}

function parseBusinessDate(value: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error("Business dates must use YYYY-MM-DD format.");
  }
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const roundTrip = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (
    roundTrip.getUTCFullYear() !== parts.year ||
    roundTrip.getUTCMonth() + 1 !== parts.month ||
    roundTrip.getUTCDate() !== parts.day
  ) {
    throw new Error("Business date is invalid.");
  }
  return parts;
}

function addDays(date: DateParts, amount: number): DateParts {
  const result = new Date(Date.UTC(date.year, date.month - 1, date.day + amount));
  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate()
  };
}

function compareDates(left: DateParts, right: DateParts): number {
  return (
    Date.UTC(left.year, left.month - 1, left.day) - Date.UTC(right.year, right.month - 1, right.day)
  );
}

function daysBetween(left: DateParts, right: DateParts): number {
  return Math.floor(compareDates(right, left) / 86_400_000);
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function assertTimezone(timezone: string) {
  if (!isValidBusinessTimezone(timezone)) {
    throw new Error(`Invalid business timezone: ${timezone}`);
  }
}
