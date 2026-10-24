const { validateContent } = require('../../src/services/messageService');

describe('REQ-MSG-4 message length rules', () => {
  test('TC-MSG-02 empty and whitespace-only messages are rejected', () => {
    expect(() => validateContent('')).toThrow(/empty/);
    expect(() => validateContent('   \n ')).toThrow(/empty/);
    expect(() => validateContent(undefined)).toThrow(/empty/);
  });

  test('TC-MSG-02 2001 characters rejected, 2000 accepted', () => {
    expect(() => validateContent('x'.repeat(2001))).toThrow(/too long/);
    expect(() => validateContent('x'.repeat(2000))).not.toThrow();
  });
});
