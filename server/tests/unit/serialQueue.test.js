const { createSerialQueue } = require('../../src/utils/serialQueue');

describe('REQ-MSG-5 per-sender ordering queue', () => {
  test('TC-MSG-03 tasks finish in the order they were queued even if later ones are faster', async () => {
    const queue = createSerialQueue();
    const done = [];
    const delays = [30, 5, 20, 1, 10];
    await Promise.all(
      delays.map((ms, i) => queue(() => new Promise((r) => setTimeout(() => r(done.push(i)), ms))))
    );
    expect(done).toEqual([0, 1, 2, 3, 4]);
  });

  test('a failing task does not stop the queue', async () => {
    const queue = createSerialQueue();
    await expect(queue(() => Promise.reject(new Error('x')))).rejects.toThrow('x');
    await expect(queue(() => Promise.resolve('ok'))).resolves.toBe('ok');
  });
});
