// Contact endpoints (SAD 4.3.2). Every route here needs a logged-in user.
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const userService = require('../services/userService');

const router = express.Router();
router.use(requireAuth);

// GET /api/contacts
router.get('/', async (req, res, next) => {
  try {
    res.json(await userService.listContacts(req.user.id));
  } catch (err) {
    next(err);
  }
});

// POST /api/contacts  { contactUserId }
router.post('/', async (req, res, next) => {
  try {
    const contact = await userService.addContact(req.user.id, req.body && req.body.contactUserId);
    res.status(201).json({ contact });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/contacts/:id   (id = the contact's user id)
router.delete('/:id', async (req, res, next) => {
  try {
    await userService.removeContact(req.user.id, req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = { basePath: '/api/contacts', router };