import { DateTime } from 'luxon';

export interface CompanyFormatSettings {
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: 'TWELVE_HOUR' | 'TWENTY_FOUR_HOUR';
  timezone: string;
}

export const DEFAULT_FORMAT_SETTINGS: CompanyFormatSettings = {
  dateFormat: 'DD/MM/YYYY',
  timeFormat: 'TWELVE_HOUR',
  timezone: 'Asia/Kolkata',
};

const DATE_FORMAT_MAP: Record<string, string> = {
  'DD/MM/YYYY': 'dd/MM/yyyy',
  'MM/DD/YYYY': 'MM/dd/yyyy',
  'YYYY-MM-DD': 'yyyy-MM-dd',
};

const TIME_FORMAT_MAP: Record<string, string> = {
  TWELVE_HOUR: 'h:mm a',
  TWENTY_FOUR_HOUR: 'HH:mm',
};

const TIME_WITH_SECONDS_MAP: Record<string, string> = {
  TWELVE_HOUR: 'h:mm:ss a',
  TWENTY_FOUR_HOUR: 'HH:mm:ss',
};

export interface CompanyFormatter {
  date(iso: string): string;
  time(iso: string): string;
  timeWithSeconds(iso: string): string;
  dateTime(iso: string): string;
  shiftTime(hhmm: string): string;
  relativeDate(iso: string): string;
  parseToZoned(iso: string): DateTime;
}

export function createCompanyFormatter(settings: CompanyFormatSettings): CompanyFormatter {
  const dateFmt = DATE_FORMAT_MAP[settings.dateFormat] ?? 'dd/MM/yyyy';
  const timeFmt = TIME_FORMAT_MAP[settings.timeFormat] ?? 'h:mm a';
  const timeSecFmt = TIME_WITH_SECONDS_MAP[settings.timeFormat] ?? 'h:mm:ss a';
  const tz = settings.timezone || 'Asia/Kolkata';

  function parseToZoned(iso: string): DateTime {
    if (!iso) return DateTime.invalid('empty input');
    const dt = DateTime.fromISO(iso, { zone: 'utc' }).setZone(tz);
    if (dt.isValid) return dt;
    const dateOnly = DateTime.fromISO(iso, { zone: tz });
    return dateOnly;
  }

  function date(iso: string): string {
    const dt = parseToZoned(iso);
    return dt.isValid ? dt.toFormat(dateFmt) : '\u2014';
  }

  function time(iso: string): string {
    const dt = parseToZoned(iso);
    return dt.isValid ? dt.toFormat(timeFmt) : '\u2014';
  }

  function timeWithSeconds(iso: string): string {
    const dt = parseToZoned(iso);
    return dt.isValid ? dt.toFormat(timeSecFmt) : '\u2014';
  }

  function dateTime(iso: string): string {
    const dt = parseToZoned(iso);
    return dt.isValid ? dt.toFormat(`${dateFmt} ${timeFmt}`) : '\u2014';
  }

  function shiftTime(hhmm: string): string {
    if (!hhmm) return '\u2014';
    const dt = DateTime.fromFormat(hhmm, 'HH:mm');
    return dt.isValid ? dt.toFormat(timeFmt) : hhmm;
  }

  function relativeDate(iso: string): string {
    const dt = parseToZoned(iso);
    if (!dt.isValid) return '\u2014';
    const now = DateTime.now().setZone(tz);
    const diff = dt.startOf('day').diff(now.startOf('day'), 'days').days;
    if (Math.abs(diff) < 0.5) return 'Today';
    if (diff > -1.5 && diff < -0.5) return 'Yesterday';
    if (diff > 0.5 && diff < 1.5) return 'Tomorrow';
    return dt.toFormat(dateFmt);
  }

  return { date, time, timeWithSeconds, dateTime, shiftTime, relativeDate, parseToZoned };
}
