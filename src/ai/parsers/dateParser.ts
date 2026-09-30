import { addDays, toISODate, type ISODate } from '../../utils/dates';
import { findWord, normalize } from './normalize';

const WEEKDAYS: [string, number][] = [
  ['domingo', 0],
  ['segunda', 1],
  ['terca', 2],
  ['quarta', 3],
  ['quinta', 4],
  ['sexta', 5],
  ['sabado', 6],
];

export type DateMatch = {
  date: ISODate;
  /** false quando a frase não fala de data e o resultado é hoje. */
  found: boolean;
};

/** Resolve "hoje", "ontem", "anteontem", "sexta", "dia 10" e "10/09". */
export function parseDate(text: string, now: Date = new Date()): DateMatch {
  const t = normalize(text);

  if (findWord(t, 'anteontem') >= 0) {
    return { date: toISODate(addDays(now, -2)), found: true };
  }
  if (findWord(t, 'ontem') >= 0) {
    return { date: toISODate(addDays(now, -1)), found: true };
  }
  if (findWord(t, 'hoje') >= 0) {
    return { date: toISODate(now), found: true };
  }

  const slash = t.match(/(?:^|[^\d])(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]) - 1;
    let year = slash[3] ? Number(slash[3]) : now.getFullYear();
    if (year < 100) {
      year += 2000;
    }
    let date = new Date(year, month, day);
    if (!slash[3] && date > now) {
      date = new Date(year - 1, month, day);
    }
    if (isSameDay(date, day)) {
      return { date: toISODate(date), found: true };
    }
  }

  const dayOnly = t.match(/(?:^|[^a-z])dia\s+(\d{1,2})(?!\d)/);
  if (dayOnly) {
    const day = Number(dayOnly[1]);
    const monthOffset = day > now.getDate() ? -1 : 0;
    const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, day);
    if (isSameDay(date, day)) {
      return { date: toISODate(date), found: true };
    }
  }

  for (const [name, weekday] of WEEKDAYS) {
    if (findWord(t, name) >= 0) {
      const diff = (now.getDay() - weekday + 7) % 7;
      return { date: toISODate(addDays(now, -diff)), found: true };
    }
  }

  return { date: toISODate(now), found: false };
}

/** Descarta datas que o JavaScript "empurra", como 31/02 virando 03/03. */
function isSameDay(date: Date, day: number): boolean {
  return !Number.isNaN(date.getTime()) && date.getDate() === day;
}
