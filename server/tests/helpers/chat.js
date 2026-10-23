// Creates two users who are contacts and share a direct conversation.
const { Contact } = require('../../src/models');
const { createUser } = require('./factory');
const { getOrCreateDirect } = require('../../src/services/conversationService');

async function createDirectChat() {
  const a = await createUser();
  const b = await createUser();
  await Contact.create([
    { userId: a.id, contactUserId: b.id },
    { userId: b.id, contactUserId: a.id },
  ]);
  const conversation = await getOrCreateDirect(a.id, b.id);
  return { a, b, conversationId: conversation.id };
}

module.exports = { createDirectChat };
