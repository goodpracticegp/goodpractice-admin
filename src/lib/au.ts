export const SYDNEY_TZ = "Australia/Sydney";
export const NOTIFICATION_RECIPIENT = "support@goodpracticegp.com.au";

export const CATEGORIES = [
  "Consumables",
  "PPE",
  "Medications",
  "Vaccines",
  "Wound Care",
  "Diagnostic Equipment",
  "Office Supplies",
  "Cleaning and Hygiene",
] as const;

export const STATUSES = [
  "In Stock",
  "Low Stock",
  "Reorder Required",
  "Out of Stock",
  "Discontinued",
] as const;

export const MOVEMENT_TYPES = [
  "Purchase Received",
  "Stock Adjustment",
  "Usage",
  "Initial Stock",
] as const;

/** Today's date in Sydney as YYYY-MM-DD. */
export function todaySydney(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SYDNEY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts;
}

/** DD/MM/YYYY from a YYYY-MM-DD date string. */
export function formatDate(value?: string | null): string {
  if (!value) return "";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

/** DD/MM/YYYY HH:mm in Sydney time from a timestamptz. */
export function formatDateTime(value?: string | null): string {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(dt).replace(",", "");
}

export function formatAud(value?: number | string | null): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (Number.isNaN(n)) return "$0.00";
  return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  const today = new Date(`${todaySydney()}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function nextItemCode(existing: string[]): string {
  let max = 0;
  for (const code of existing) {
    const match = /^MS-(\d{1,6})$/.exec(code.trim());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `MS-${String(max + 1).padStart(4, "0")}`;
}
