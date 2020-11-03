const router = require('express').Router();
const userController = require('../controllers/users.controller');

router.post('/users/', userController.register);
router.put('/users/:username',  userController.update);
router.delete('/users/:username',  userController.delete);

module.exports = router;