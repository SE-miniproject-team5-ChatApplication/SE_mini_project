const { canAdvance, computeStatus } = require('../../src/services/receiptService');

const r = (...ids) => ids.map((userId) => ({ userId }));

describe('REQ-RCP-1 status moves only forward: sent -> delivered -> read', () => {
  test('TC-RCP-01 forward moves are allowed, backward moves are not', () => {
    expect(canAdvance('sent', 'delivered')).toBe(true);
    expect(canAdvance('delivered', 'read')).toBe(true);
    expect(canAdvance('sent', 'read')).toBe(true);
    expect(canAdvance('read', 'delivered')).toBe(false);
    expect(canAdvance('delivered', 'sent')).toBe(false);
    expect(canAdvance('deleted', 'read')).toBe(false);
    expect(canAdvance('sent', 'seen')).toBe(false);
  });

  test('TC-RCP-01 "delivered" after "read" is ignored', () => {
    expect(computeStatus({ current: 'read', recipientIds: ['b'], deliveredTo: r('b') })).toBe('read');
  });

  test('direct chat: delivered then read', () => {
    expect(computeStatus({ current: 'sent', recipientIds: ['b'] })).toBe('sent');
    expect(computeStatus({ current: 'sent', recipientIds: ['b'], deliveredTo: r('b') })).toBe('delivered');
    expect(computeStatus({ current: 'delivered', recipientIds: ['b'], readBy: r('b') })).toBe('read');
  });

  test('TC-RCP-02 group: read only when every recipient has read it', () => {
    const recipientIds = ['b', 'c'];
    expect(computeStatus({ current: 'sent', recipientIds, readBy: r('b') })).toBe('sent');
    expect(computeStatus({ current: 'sent', recipientIds, deliveredTo: r('c'), readBy: r('b') })).toBe('delivered');
    expect(computeStatus({ current: 'delivered', recipientIds, readBy: r('b', 'c') })).toBe('read');
  });
});
