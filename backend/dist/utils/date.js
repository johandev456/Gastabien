"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DR_OFFSET_HOURS = void 0;
exports.drWallClockToDate = drWallClockToDate;
exports.drMonthKey = drMonthKey;
exports.drDayKey = drDayKey;
exports.drDayOfMonth = drDayOfMonth;
exports.isValidYmd = isValidYmd;
/**
 * Dominican Republic date helpers.
 * The DR (America/Santo_Domingo) is UTC-4 all year (no DST), so a fixed offset is exact.
 * All dates are stored as UTC ISO strings; month/day bucketing is done in DR local time.
 */
exports.DR_OFFSET_HOURS = -4;
const DR_OFFSET_MS = exports.DR_OFFSET_HOURS * 3600 * 1000;
/** Builds a UTC Date from a DR wall-clock time (month is 1-12). */
function drWallClockToDate(year, month, day, hours = 12, minutes = 0, seconds = 0) {
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds) - DR_OFFSET_MS);
}
/** Returns a Date whose UTC fields equal the DR local wall-clock fields. */
function shiftToDr(date) {
    const t = new Date(date).getTime();
    if (isNaN(t))
        return null;
    return new Date(t + DR_OFFSET_MS);
}
/** YYYY-MM in DR local time. Falls back to the raw string prefix for unparsable values. */
function drMonthKey(date) {
    if (!date)
        return '';
    const shifted = shiftToDr(date);
    if (!shifted)
        return typeof date === 'string' ? date.substring(0, 7) : '';
    return shifted.toISOString().substring(0, 7);
}
/** YYYY-MM-DD in DR local time. */
function drDayKey(date) {
    if (!date)
        return '';
    const shifted = shiftToDr(date);
    if (!shifted)
        return typeof date === 'string' ? date.substring(0, 10) : '';
    return shifted.toISOString().substring(0, 10);
}
/** Day of month (1-31) in DR local time. */
function drDayOfMonth(date) {
    const shifted = shiftToDr(date);
    return shifted ? shifted.getUTCDate() : NaN;
}
/** Checks that y/m/d is a real calendar date (rejects 2026-02-31, month 13, etc). */
function isValidYmd(year, month, day) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day))
        return false;
    if (year < 1990 || year > 2100 || month < 1 || month > 12 || day < 1)
        return false;
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}
