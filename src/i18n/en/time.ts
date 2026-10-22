export const time = {
  unit: { y: "y", m: "m", w: "w", d: "d" },
  years: (n: number) => (n === 1 ? "1 year" : `${n} years`),
  months: (n: number) => (n === 1 ? "1 month" : `${n} months`),
  days: (n: number) => (n === 1 ? "1 day" : `${n} days`),
  both: (years: string, months: string) => `${years} ${months}`,
  lessThanADay: "less than a day",
  monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  date: (day: number, month: string, year: number) =>
    `${String(day).padStart(2, "0")} ${month} ${year}`,
  dayMonth: (day: number, month: string) => `${day} ${month}`,
};
