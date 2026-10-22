const YEAR = 365.25;
const MONTH = YEAR / 12;

export function ageParts(days: number): { years: number; months: number; days: number } {
  const total = Math.max(0, days);
  const years = Math.floor(total / YEAR);
  const months = Math.floor((total - years * YEAR) / MONTH);
  const rest = Math.floor(total - years * YEAR - months * MONTH);
  return { years, months, days: rest };
}
