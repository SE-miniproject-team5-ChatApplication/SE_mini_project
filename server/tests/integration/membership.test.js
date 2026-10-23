const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/factory');
const { Conversation, Member } = require('../../src/models');
const { assertMember, memberUserIds } = require('../../src/services/membershipService');

describeDb('NFR-SEC-4 server-side authorisation per conversation', () => {
  let a;
  let b;
  let outsider;
  let conv;
  beforeAll(connectTestDb);
  beforeEach(async () => {
    a = await createUser();
    b = await createUser();
    outsider = await createUser();
    conv = await Conversation.create({ type: 'direct', createdBy: a.id, directKey: Conversation.directKeyFor(a.id, b.id) });
    await Member.create([{ conversationId: conv._id, userId: a.id }, { conversationId: conv._id, userId: b.id }]);
  });
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('members pass', async () => {
    await expect(assertMember(a.id, String(conv._id))).resolves.toBeTruthy();
    expect((await memberUserIds(conv._id)).sort()).toEqual([a.id, b.id].sort());
  });

  test('TC-GRP-05 non-members get 403, unknown conversation 404, bad id 400', async () => {
    await expect(assertMember(outsider.id, String(conv._id))).rejects.toMatchObject({ status: 403 });
    await expect(assertMember(a.id, '0123456789abcdef01234567')).rejects.toMatchObject({ status: 404 });
    await expect(assertMember(a.id, 'not-an-id')).rejects.toMatchObject({ status: 400 });
  });
});
