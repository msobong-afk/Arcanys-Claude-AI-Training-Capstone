const { detectLocale } = require('../../src/utils/i18n');

describe('detectLocale()', () => {
  it('returns "en" when Accept-Language header is absent', () => {
    expect(detectLocale({ headers: {} })).toBe('en');
  });

  it('returns "en" for "en", "en-US", "en-GB"', () => {
    expect(detectLocale({ headers: { 'accept-language': 'en' } })).toBe('en');
    expect(detectLocale({ headers: { 'accept-language': 'en-US' } })).toBe('en');
    expect(detectLocale({ headers: { 'accept-language': 'en-GB' } })).toBe('en');
  });

  it('returns "fil" for "fil", "fil-PH", "tl", "tl-PH"', () => {
    expect(detectLocale({ headers: { 'accept-language': 'fil' } })).toBe('fil');
    expect(detectLocale({ headers: { 'accept-language': 'fil-PH' } })).toBe('fil');
    expect(detectLocale({ headers: { 'accept-language': 'tl' } })).toBe('fil');
    expect(detectLocale({ headers: { 'accept-language': 'tl-PH' } })).toBe('fil');
  });

  it('returns "en" (fallback) for an unsupported locale such as "fr"', () => {
    expect(detectLocale({ headers: { 'accept-language': 'fr' } })).toBe('en');
  });

  it('is case-insensitive ("FIL-PH" → "fil")', () => {
    expect(detectLocale({ headers: { 'accept-language': 'FIL-PH' } })).toBe('fil');
    expect(detectLocale({ headers: { 'accept-language': 'TL-PH' } })).toBe('fil');
  });

  it('returns "en" when req has no headers property', () => {
    expect(detectLocale({})).toBe('en');
    expect(detectLocale({ headers: undefined })).toBe('en');
  });
});
