const mongoose = require('mongoose');
const { User, Message, Conversation } = require('../../src/models');

const id = () => new mongoose.Types.ObjectId();

describe('SET-3 Mongoose schemas (Appendix B field rules)', () => {
  test('username must be 3-20 letters, digits or underscore', () => {
    const base = { email: 'a@b.com', passwordHash: 'x', displayName: 'A' };
    expect(new User({ ...base, username: 'ab' }).validateSync()).toBeDefined();
    expect(new User({ ...base, username: 'bad name!' }).validateSync()).toBeDefined();
    expect(new User({ ...base, username: 'Omkar_01' }).validateSync()).toBeUndefined();
    expect(new User({ ...base, username: 'Omkar_01' }).username).toBe('omkar_01');
  });

  test('toJSON never exposes the password hash', () => {
    const u = new User({ username: 'abc', email: 'a@b.com', passwordHash: 'secret', displayName: 'A' });
    expect(JSON.stringify(u)).not.toMatch(/secret/);
  });

  test('message content is limited to 2000 characters', () => {
    const base = { conversationId: id(), senderId: id() };
    expect(new Message({ ...base, content: 'x'.repeat(2001) }).validateSync()).toBeDefined();
    expect(new Message({ ...base, content: 'x'.repeat(2000) }).validateSync()).toBeUndefined();
  });

  test('message status accepts only sent, delivered, read, deleted', () => {
    const m = new Message({ conversationId: id(), senderId: id(), content: 'hi', status: 'seen' });
    expect(m.validateSync()).toBeDefined();
  });

  test('deleted messages hide their content when serialised', () => {
    const m = new Message({ conversationId: id(), senderId: id(), content: 'secret', status: 'deleted' });
    expect(m.toJSON().content).toBeNull();
  });

  test('direct conversation key is the same for both users', () => {
    const a = id();
    const b = id();
    expect(Conversation.directKeyFor(a, b)).toBe(Conversation.directKeyFor(b, a));
  });
});
