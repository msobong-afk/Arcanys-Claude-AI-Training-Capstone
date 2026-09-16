const { t } = require('../../src/utils/i18n');

describe('t()', () => {
  it('returns the English string for a known key with locale "en"', () => {
    expect(t('AUTH_MISSING_HEADER.error', 'en')).toBe('Authentication required');
    expect(t('AUTH_MISSING_HEADER.message', 'en')).toBe('No authorization header provided');
  });

  it('returns the Filipino string for a known key with locale "fil"', () => {
    expect(t('AUTH_MISSING_HEADER.error', 'fil')).toBe('Kinakailangan ang pagpapatunay');
    expect(t('AUTH_MISSING_HEADER.message', 'fil')).toBe('Walang authorization header na ibinigay');
  });

  it('falls back to English when locale is unsupported (e.g. "de")', () => {
    expect(t('AUTH_MISSING_HEADER.error', 'de')).toBe('Authentication required');
  });

  it('falls back to English when locale is omitted', () => {
    expect(t('AUTH_MISSING_HEADER.error')).toBe('Authentication required');
  });

  it('falls back to English when locale is null / undefined', () => {
    expect(t('AUTH_MISSING_HEADER.error', null)).toBe('Authentication required');
    expect(t('AUTH_MISSING_HEADER.error', undefined)).toBe('Authentication required');
  });

  it('interpolates variables into the string', () => {
    expect(t('AUTH_RATE_LIMITED.message', 'en', { maxRequests: 100 }))
      .toBe('Maximum 100 requests per minute');
    expect(t('AUTH_PERMISSION_DENIED.message', 'en', { role: 'customer', permission: 'users:read' }))
      .toBe("Your role (customer) does not have the 'users:read' permission");
  });

  it('returns the key itself when the key does not exist in any locale', () => {
    expect(t('NONEXISTENT_KEY.error', 'en')).toBe('NONEXISTENT_KEY.error');
    expect(t('NONEXISTENT_KEY.error', 'fil')).toBe('NONEXISTENT_KEY.error');
  });

  it('returns the key itself when a field does not exist on a known code', () => {
    expect(t('REGISTER_MISSING_FIELDS.error', 'en')).toBe('REGISTER_MISSING_FIELDS.error');
    expect(t('AUTH_MISSING_HEADER.nonexistentField', 'en')).toBe('AUTH_MISSING_HEADER.nonexistentField');
  });

  it('leaves unresolved placeholders intact when vars key is absent', () => {
    expect(t('AUTH_RATE_LIMITED.message', 'en', {})).toBe('Maximum {{maxRequests}} requests per minute');
  });
});
