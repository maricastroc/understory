const YEAR = 365.25;
const MONTH = YEAR / 12;

export function ageParts(days: number): { years: number; months: number; days: number } {
  const total = Math.max(0, days);
  const years = Math.floor(total / YEAR);
  const months = Math.floor((total - years * YEAR) / MONTH);
  const rest = Math.floor(total - years * YEAR - months * MONTH);
  return { years, months, days: rest };
}

export function shortAge(days: number): string {
  const p = ageParts(days);
  if (p.years > 0) return p.months > 0 ? `${p.years}y ${p.months}m` : `${p.years}y`;
  if (p.months > 0) return `${p.months}m`;
  return `${p.days}d`;
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

export function longAge(days: number): string {
  const p = ageParts(days);
  if (p.years > 0) {
    return p.months > 0
      ? `${plural(p.years, "year")} ${plural(p.months, "month")}`
      : plural(p.years, "year");
  }
  if (p.months > 0) return plural(p.months, "month");
  return p.days === 0 ? "less than a day" : plural(p.days, "day");
}
