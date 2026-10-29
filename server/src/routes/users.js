// REST endpoints of the User component (SAD 4.3.2).
const express = require('express');
const multer = require('multer');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { Errors } = require('../utils/errors');
const { selfView } = require('../services/authService');
const userService = require('../services/userService');

const router = express.Router();
router.use(requireAuth);

// Avatar is kept in memory only until it is checked and written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: userService.MAX_AVATAR_SIZE, files: 1, fields: 0 },
});

function singleAvatar(req, res, next) {
  upload.single('avatar')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(Errors.fileTooLarge('Avatar can be at most 2 MB'));
    return next(Errors.validation('Upload exactly one image in the "avatar" field', 'avatar'));
  });
}

// GET /api/users/me -> the logged-in user's own profile
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json(selfView(req.user));
  })
);

// PUT /api/users/me {displayName?, statusMessage?} -> updated own profile (REQ-PRO-1)
router.put(
  '/me',
  asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(req.user, req.body);
    res.json(selfView(user));
  })
);

// POST /api/users/me/avatar  multipart: avatar (JPG/PNG <= 2 MB) -> 200 {avatarUrl} (REQ-PRO-2)
router.post(
  '/me/avatar',
  singleAvatar,
  asyncHandler(async (req, res) => {
    const user = await userService.setAvatar(req.user, req.file);
    res.json({ avatarUrl: user.toPublic().avatarUrl });
  })
);

// GET /api/users/search?q=pra -> [{id, username, displayName, ...}]
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    res.json(await userService.searchUsers(req.query.q, req.userId));
  })
);

// GET /api/users/:id/avatar -> the image file
router.get(
  '/:id/avatar',
  asyncHandler(async (req, res) => {
    const { fullPath, mimeType } = await userService.getAvatarFile(req.params.id);
    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'private, max-age=300');
    res.sendFile(fullPath);
  })
);

module.exports = { basePath: '/api/users', router };
