/**
 * AgriSense formatting helpers
 */

/** Round a number to n decimal places */
export const round = (val, n = 2) =>
  typeof val === 'number' ? +val.toFixed(n) : val

/** Format a number with commas */
export const formatNumber = (val) =>
  val != null ? Number(val).toLocaleString() : '—'

/** Capitalise the first letter of each word */
export const titleCase = (str = '') =>
  str.replace(/\b\w/g, (c) => c.toUpperCase())

/** Format a percentage (0–1 → "87%") */
export const fmtPercent = (val) =>
  val != null ? `${Math.round(val * 100)}%` : '—'
