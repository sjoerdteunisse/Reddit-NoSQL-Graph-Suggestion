const chai = require('chai');
const expect = chai.expect;
const requester = require('../test_requester');

const User = require('../../src/models/users');
const Comment = require('../../src/models/comments');
const Thread = require('../../src/models/threads');

const mongoose = require('mongoose');

//todo: remove and check cascading and neo4j emptys users

describe("Comment controller should", () => {

    let savedUser,
        savedThread,
        savedComment,
        newComment,
        vote;

    beforeEach((done) => {
        savedUser = new User({ username: 'TestUser', password: 'password' });
        savedComment = new Comment({ user: savedUser._id, content: 'test comment, Donald Trump is great' });
        savedThread = new Thread({ username: savedUser.username, content: 'test', title: 'test', comments: [savedComment._id] });

        newComment = { userid: savedUser._id, content: 'new test comment, Donald Trump is indeed really great', username: savedUser.username };
        vote = { userid: savedUser._id };

        savedUser.save().then(() => {
            savedThread.save().then(() => {
                savedComment.save().then(() => {
                    done();
                });
            });
        });
    });

    //add endpoint

    it('a user cannot add a comment to a non existing thread', done => {

        Comment.countDocuments()
            .then((commentCountBeforePost) => {
                requester.post('/api/threads/nonexistingthread/comments')
                    .send(newComment)
                    .then((res) => {
                        expect(res).to.have.status(204);

                        Comment.countDocuments()
                            .then((commentCountAfterPost) => {
                                expect(commentCountAfterPost).to.equal(commentCountBeforePost);
                                done();
                            });
                    })
            }).catch((err) => console.warn(err));
    });

    it('should throw an error when posting an empty comment to ', done => {

        newComment.content = '';

        requester.post('/api/threads/nonexistingthread/comments')
            .send(newComment)
            .then((res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property("errorName").to.equal("Please fill in all fields");
                done();
            })

    });

    it('should return a status 204 when adding a comment to /api/threads/invalidthreadid/comments', done => {

        requester.post('/api/threads/nonexistingthread/comments')
            .send(newComment)
            .then((res) => {
                expect(res).to.have.status(204);
                done();
            });
    });

    it('a user can add a comment to a thread', done => {

        Comment.countDocuments()
            .then((commentCountBeforePost) => {
                Comment.find()
                    .then((allCommentsBeforePost) => {
                        requester.post(`/api/threads/${savedThread._id.toString()}/comments`)
                            .send(newComment)
                            .then((res) => {
                                expect(res).to.have.status(200);

                                Comment.countDocuments()
                                    .then((commentCountAfterPost) => {
                                        expect(commentCountAfterPost).to.equal(commentCountBeforePost + 1);

                                        Comment.findOne({ _id: { $nin: allCommentsBeforePost } })
                                            .then((newCommentAfterPost) => {

                                                expect(newCommentAfterPost.content).to.equal(newComment.content);
                                                expect(newCommentAfterPost.user.toString()).to.equal(newComment.userid.toString());

                                                done();
                                            });
                                    });
                            })
                    })
            }).catch((err) => console.warn(err));
    });

    //addToComment endpoint

    it('a user can comment to a comment', done => {
        Comment.countDocuments()
            .then((commentCountBeforePost) => {
                requester.post(`/api/threads/${savedThread._id.toString()}/comments/${savedComment._id.toString()}`)
                    .send(newComment)
                    .then((res) => {
                        expect(res).to.have.status(200);

                        Comment.countDocuments()
                            .then((commentCountAfterPost) => {
                                expect(commentCountAfterPost).to.equal(commentCountBeforePost + 1);
                                done();
                            });
                    })
            }).catch((err) => console.warn(err));
    });

    it('should return a status 204 when trying to add to a non existing comment', done => {
        requester.post(`/api/threads/${savedThread._id.toString()}/comments/I DONT EXIST`)
            .send(newComment)
            .then((res) => {
                expect(res).to.have.status(204);
                done();
            });
    });

    it('should throw an error when posting an empty comment', done => {

        requester.post(`/api/threads/${savedThread._id.toString()}/comments/I DONT EXIST`)
            .send()
            .then((res) => {
                expect(res).to.have.status(400);
                done();
            });

    });

    it('should return a status 204 when trying to add a comment to a comment on a non existing thread', done => {

        requester.post(`/api/threads/I DONT EXIST/comments/${savedComment._id.toString()}`)
            .send(newComment)
            .then((res) => {
                expect(res).to.have.status(204);
                done();
            });

    });

    it('should return status 204 when trying to add a comment as a non existing user', done => {

        newComment.userid = savedComment._id;

        requester.post(`/api/threads/${savedThread._id.toString()}/comments/${savedComment._id.toString()}`)
            .send(newComment)
            .then((res) => {
                expect(res).to.have.status(204);
                done();
            });

    });

    //getById endpoint

    it('a comment can be retrieved by its id', done => {
        requester.get(`/api/threads/comments/${savedComment._id.toString()}`)
            .send()
            .then((res) => {
                expect(res).to.have.status(200);
                expect(res.body.content).to.equal(savedComment.content);
                done();
            });

    });

    it('should return status 204 when the comment is non existent', done => {

        requester.get(`/api/threads/comments/${savedThread._id.toString()}`)
            .send()
            .then((res) => {
                expect(res).to.have.status(204);
                done();
            });

    });

    //suggestedcontent endpoint

    it('a user can request suggested comments for a specific comment', done => {
        requester.post(`/api/threads/${savedThread._id.toString()}/comments`)
            .send(newComment)
            .then(() => {
                requester.get(`/api/threads/${savedThread._id.toString()}/comments/${savedComment._id}/suggestcontent`)
                    .send()
                    .then((res) => {
                        expect(res).to.have.status(200);
                        done();
                    });
            })
    });

    it('should return status 204 when suggesting content for non existing thread', done => {

        requester.get(`/api/threads/${savedComment._id.toString()}/comments/${savedComment._id.toString()}/suggestcontent`)
            .send()
            .then((res) => {
                expect(res).to.have.status(204);
                done();
            });

    });

    it('should return status 204 when suggesting content for non existing comment', done => {

        requester.get(`/api/threads/${savedThread._id.toString()}/comments/${savedThread._id.toString()}/suggestcontent`)
            .send()
            .then((res) => {
                expect(res).to.have.status(204);
                done();
            });

    });

    //delete endpoint

    it('a user can delete a comment from a thread', done => {

        Comment.countDocuments()
            .then((commentAmountBeforeDelete) => {
                requester.delete(`/api/threads/${savedThread._id.toString()}/comments/${savedComment._id.toString()}`)
                    .send()
                    .then((res) => {

                        expect(res).to.have.status(204);

                        Comment.countDocuments()
                            .then((commentAmountAfterDelete) => {
                                expect(commentAmountAfterDelete).to.equal(commentAmountBeforeDelete - 1);

                                Comment.find({ _id: savedComment._id })
                                    .then((foundComment) => {
                                        expect(foundComment.length).to.equal(0);
                                        done()
                                    });
                            });
                    });
            });

    });

    it('should return status 204 when trying to remove a non existing comment', done => {

        requester.delete(`/api/threads/${savedThread._id.toString()}/comments/I DONT EXIT/`)
            .send()
            .then((res) => {
                expect(res).to.have.status(204);
                done();
            });

    });

    it('should return status 204 when trying to remove a comment from a non existing thread', done => {

        requester.delete(`/api/threads/I DONT EXIST/comments/${savedComment._id.toString()}`)
            .send()
            .then((res) => {
                expect(res).to.have.status(204);
                done();
            });

    });

    //upvote endpoint

    it('a user can upvote a comment', done => {

        Comment.findOne({ _id: savedComment._id })
            .then((foundComment) => {
                const upvoteAmountBeforeUpvote = foundComment.upvotes;

                requester.post(`/api/threads/${savedThread._id.toString()}/comments/${savedComment._id.toString()}/upvote`)
                    .send(vote)
                    .then((res) => {

                        expect(res).to.have.status(200);

                        Comment.findOne({ _id: res.body.id })
                            .then((foundCommentAfterUpvote) => {

                                expect(foundCommentAfterUpvote.upvotes).to.equal(upvoteAmountBeforeUpvote + 1);

                                done();
                            })

                    })
            })
    });

    it('a user can not upvote a more than once', done => {

        Comment.findOne({ _id: savedComment._id })
            .then((foundComment) => {
                const upvoteAmountBeforeUpvote = foundComment.upvotes;

                requester.post(`/api/threads/${savedThread._id.toString()}/comments/${savedComment._id.toString()}/upvote`)
                    .send(vote)
                    .then((res) => {

                        expect(res).to.have.status(200);

                        Comment.findOne({ _id: res.body.id })
                            .then((foundCommentAfterUpvoteOne) => {

                                expect(foundCommentAfterUpvoteOne.upvotes).to.equal(upvoteAmountBeforeUpvote + 1);

                                requester.post(`/api/threads/${savedThread._id.toString()}/comments/${savedComment._id.toString()}/upvote`)
                                    .send(vote)
                                    .then((res) => {

                                        expect(res).to.have.status(200);

                                        Comment.findOne({ _id: res.body.id })
                                            .then((foundCommentAfterUpvoteTwo) => {

                                                expect(foundCommentAfterUpvoteTwo.upvotes).to.equal(upvoteAmountBeforeUpvote + 1);

                                                done();
                                            })

                                    })
                            });
                    });
            });

    });

    //downvote endpoint

    it('a user can downvote a comment', done => {

        Comment.findOne({ _id: savedComment._id })
            .then((foundComment) => {
                const downvoteAmountBeforeDownvote = foundComment.downvotes;

                requester.post(`/api/threads/${savedThread._id.toString()}/comments/${savedComment._id.toString()}/downvote`)
                    .send(vote)
                    .then((res) => {

                        expect(res).to.have.status(200);

                        Comment.findOne({ _id: res.body.id })
                            .then((foundCommentAfterDownvote) => {

                                expect(foundCommentAfterDownvote.downvotes).to.equal(downvoteAmountBeforeDownvote + 1);

                                done();
                            })

                    })
            })

    });

    it('a user can not downvote a comment more than once', done => {

        Comment.findOne({ _id: savedComment._id })
            .then((foundComment) => {
                const downvoteAmountBeforeDownvote = foundComment.downvotes;

                requester.post(`/api/threads/${savedThread._id.toString()}/comments/${savedComment._id.toString()}/downvote`)
                    .send(vote)
                    .then((res) => {

                        expect(res).to.have.status(200);

                        Comment.findOne({ _id: res.body.id })
                            .then((foundCommentAfterDownvoteOne) => {

                                expect(foundCommentAfterDownvoteOne.downvotes).to.equal(downvoteAmountBeforeDownvote + 1);

                                requester.post(`/api/threads/${savedThread._id.toString()}/comments/${savedComment._id.toString()}/downvote`)
                                    .send(vote)
                                    .then((res) => {

                                        expect(res).to.have.status(200);

                                        Comment.findOne({ _id: res.body.id })
                                            .then((foundCommentAfterDownvoteTwo) => {

                                                expect(foundCommentAfterDownvoteTwo.downvotes).to.equal(downvoteAmountBeforeDownvote + 1);

                                                done();
                                            })

                                    })
                            });
                    });
            });
    });
});

