const { sanitizeText, sanitizeValue } = require('../../src/middleware/sanitize');

describe('NFR-SAFE-2 output safety', () => {
  test('TC-SEC-01 script text is kept as text (escaping happens when rendering)', () => {
    expect(sanitizeText('<script>alert(1)</script>')).toBe('<script>alert(1)</script>');
  });

  test('control characters are removed, new lines and tabs kept', () => {
    expect(sanitizeText('a\u0000b\u0007c\nd\te')).toBe('abc\nd\te');
  });

  test('passwords are never modified', () => {
    expect(sanitizeValue({ password: 'p\u0000w', name: 'n\u0000m' })).toEqual({ password: 'p\u0000w', name: 'nm' });
  });
});
