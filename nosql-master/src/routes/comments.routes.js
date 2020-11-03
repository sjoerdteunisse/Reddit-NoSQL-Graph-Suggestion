const router = require('express').Router();
const commentController = require('../controllers/comments.controller');

router.post('/threads/:threadId/comments/', commentController.add);
router.post('/threads/:threadId/comments/:commentId', commentController.addToComment);

//extras
router.get('/threads/comments/:commentId', commentController.getById);
router.get('/threads/comments/:commentId/analyze', commentController.analyze);
router.get('/threads/comments/:commentId/related', commentController.relatedComments);
router.get('/threads/:threadId/comments/:commentId/suggestcontent', commentController.suggestedContent);

router.delete('/threads/:threadId/comments/:commentId',  commentController.delete);
router.post('/threads/:threadId/comments/:commentId/upvote', commentController.upvote);
router.post('/threads/:threadId/comments/:commentId/downvote', commentController.downvote);

module.exports = router;