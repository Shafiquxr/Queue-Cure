
'use client';

/**
 * Utility for generating and managing the daily rotating clinic code.
 * Format: 6-char uppercase alphanumeric, excluding ambiguous characters.
 */

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Excludes 0, O, 1, I, L

export function generateDailyCode(length = 6): string {
  let code = '';
  const crypto = window.crypto || (window as any).msCrypto;
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[array[i] % CODE_CHARS.length];
  }
  return code;
}

export function getTodayDateString(timezone: string = 'Asia/Kolkata'): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  return formatter.format(new Date()); // Returns YYYY-MM-DD
}
