const en = require('../locales/en');
const fil = require('../locales/fil');

const LOCALES = { en, fil };

function t(key, locale, vars = {}) {
  const resolved = LOCALES[locale] ? locale : 'en';
  const [code, field] = key.split('.');

  const value = LOCALES[resolved]?.[code]?.[field] ?? en?.[code]?.[field];

  if (value === undefined || value === null) return key;

  return String(value).replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] !== undefined ? vars[k] : `{{${k}}}`
  );
}

function detectLocale(req) {
  const header = req.headers?.['accept-language'];
  if (!header) return 'en';
  const tag = header.split(',')[0].trim().toLowerCase();
  if (tag.startsWith('fil') || tag.startsWith('tl')) return 'fil';
  if (tag.startsWith('en')) return 'en';
  return 'en';
}

module.exports = { t, detectLocale };
