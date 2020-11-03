const router = require('express').Router();
const friendshipController = require('../controllers/friendships.controller');

 router.post('/friendship/', friendshipController.add);
 router.delete('/friendship/', friendshipController.remove);

 router.get('/friendship/:username/:depth', friendshipController.getFriends);


module.exports = router;