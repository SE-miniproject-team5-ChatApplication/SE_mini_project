const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/factory');
const { createGroupWith } = require('../helpers/group');
const { Contact, Message } = require('../../src/models');
const groupService = require('../../src/services/groupService');

describeDb('REQ-GRP-6 system messages for membership changes', () => {
  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-GRP-04 add, remove and leave each post a system message', async () => {
    const { admin, members, groupId } = await createGroupWith(2);
    const newbie = await createUser({ displayName: 'Newbie' });
    await Contact.create({ userId: admin.id, contactUserId: newbie.id });

    await groupService.addMember(admin.id, groupId, newbie.id);
    await groupService.removeMember(admin.id, groupId, newbie.id);
    await groupService.leaveGroup(members[1].id, groupId);

    const system = await Message.find({ conversationId: groupId, type: 'system' }).sort({ sentAt: 1, _id: 1 });
    const texts = system.map((m) => m.content);
    expect(texts[0]).toMatch(/added Newbie$/);
    expect(texts[1]).toMatch(/removed Newbie$/);
    expect(texts[2]).toMatch(/left the group$/);
    expect(system.every((m) => m.senderId === null)).toBe(true);
  });
});
