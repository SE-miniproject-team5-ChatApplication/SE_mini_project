// Creates a creator with `count` contacts and a group containing all of them.
const { Contact } = require('../../src/models');
const { createUser } = require('./factory');
const { createGroup } = require('../../src/services/groupService');

async function createGroupWith(count = 2, name = 'Team 5') {
  const admin = await createUser();
  const members = [];
  for (let i = 0; i < count; i += 1) members.push(await createUser());
  await Contact.create(members.map((m) => ({ userId: admin.id, contactUserId: m.id })));
  const group = await createGroup(admin.id, { name, memberIds: members.map((m) => m.id) });
  return { admin, members, group, groupId: group.id };
}

module.exports = { createGroupWith };
