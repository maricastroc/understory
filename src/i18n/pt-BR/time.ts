import type { Messages } from "../messages";

export const time: Messages["time"] = {
  unit: { y: "a", m: "m", w: "sem", d: "d" },
  years: (n) => (n === 1 ? "1 ano" : `${n} anos`),
  months: (n) => (n === 1 ? "1 mês" : `${n} meses`),
  days: (n) => (n === 1 ? "1 dia" : `${n} dias`),
  both: (years, months) => `${years} e ${months}`,
  lessThanADay: "menos de um dia",
  monthNames: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
  date: (day, month, year) => `${day} ${month} ${year}`,
  dayMonth: (day, month) => `${day} ${month}`,
  plainDate: (day, month, year) => `${day} ${month} ${year}`,
};
