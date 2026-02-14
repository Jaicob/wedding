/**
 * Simple i18n utility.
 * Loads translations from JSON files, provides a reactive t() function.
 */

import en from '../i18n/en.json';
import ko from '../i18n/ko.json';

const translations = { en, ko };
let currentLocale = localStorage.getItem('wedding_lang') || 'en';
document.documentElement.lang = currentLocale;
const listeners = [];

export function t(key) {
  const keys = key.split('.');
  let value = translations[currentLocale];
  for (const k of keys) {
    if (value == null) return key;
    value = value[k];
  }
  return value ?? key;
}

export function getLocale() {
  return currentLocale;
}

export function setLocale(locale) {
  if (!translations[locale]) return;
  currentLocale = locale;
  localStorage.setItem('wedding_lang', locale);
  document.documentElement.lang = locale;
  listeners.forEach(fn => fn(locale));
}

export function onLocaleChange(fn) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

export function getAvailableLocales() {
  return Object.keys(translations);
}
