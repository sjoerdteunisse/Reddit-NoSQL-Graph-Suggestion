const router = require('express').Router();
const threadsController = require('../controllers/threads.controller');

router.get('/threads/', threadsController.getAll);
router.get('/threads/:id', threadsController.getByid);

router.get('/threads/user/:username/:depth', threadsController.getByUser);

//extras
router.get('/threads/:id/analyze',  threadsController.analyze);
router.get('/threads/:id/suggestions',  threadsController.suggestedContent);
router.get('/threads/:id/related',  threadsController.relatedThreads);

router.post('/threads/', threadsController.add);
router.put('/threads/:id',  threadsController.update);
router.delete('/threads/:id',  threadsController.delete);

router.post('/threads/:id/upvote', threadsController.upvote);
router.post('/threads/:id/downvote', threadsController.downvote);

module.exports = router;