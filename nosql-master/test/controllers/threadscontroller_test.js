const chai = require('chai');
const expect = chai.expect;
const requester = require('../test_requester');

const User = require('../../src/models/users');
const Thread = require('../../src/models/threads');
const Vote = require('../../src/models/votes');
const Comment = require('../../src/models/comments');

const mongoose = require('mongoose');

//todo: remove and check cascading and neo4j emptys users

describe("Thread controller should", () => {

    const user = { username: 'AUserName', password: "password" };
    const threadExample = { content: 'test', title: 'test' };


    let userOne, 
            userTwo, 
            userThree, 
            userFour, 
            userFive, 
            upvoteUserOne, 
            upvoteUserTwo, 
            upvoteUserThree, 
            downvoteUserFour, 
            downvoteUserFive, 
            userOneComment, 
            userTwoComment, 
            userThreeComment, 
            threadWithThreeUpvotesTwoDownvotesAndOneComment, 
            threadWithTwoUpvotesZeroDownvotesAndZeroComments, 
            threadWithNoVotesAndThreeComments;



    beforeEach((done) => {
        const threadUser = new User(user);
        const cleanThread = new Thread({ content: threadExample.content, title: threadExample.title, username: user.username });

        //data for thread sorting test
        userOne = new User({ username: 'TestUserOne', password: 'geheim1' });
        userTwo = new User({ username: 'TestUserTwo', password: 'geheim1' });
        userThree = new User({ username: 'TestUserThree', password: 'geheim1' });
        userFour = new User({ username: 'TestUserFour', password: 'geheim1' });
        userFive = new User({ username: 'TestUserFive', password: 'geheim1' });

        upvoteUserOne = { value: 1, user: userOne._id.toString() };
        upvoteUserTwo = { value: 1, user: userTwo._id.toString() };
        upvoteUserThree = { value: 1, user: userThree._id.toString() };

        downvoteUserFour = { value: -1, user: userFour._id.toString() };
        downvoteUserFive = { value: -1, user: userFive._id.toString() };

        userOneComment = new Comment({ user: userOne._id.toString(), content: "This shit wack 1", username: "TestUserOne" });
        userTwoComment = new Comment({ user: userTwo._id.toString(), content: "This shit wack 2", username: "TestUserTwo" });
        userThreeComment = new Comment({ user: userThree._id.toString(), content: "This shit wack 3", username: "TestUserThree" });

        threadWithThreeUpvotesTwoDownvotesAndOneComment = new Thread({ title: 'Test Thread One', content: 'Test Thread One Content', username: userOne.username, votes: [upvoteUserOne, upvoteUserTwo, upvoteUserThree, downvoteUserFour, downvoteUserFive], comments: [userOneComment._id.toString()] });
        threadWithTwoUpvotesZeroDownvotesAndZeroComments = new Thread({ title: 'Test Thread Two', content: 'Test Thread Two Content', username: userTwo.username, votes: [upvoteUserOne, upvoteUserTwo], comments: [] });
        threadWithNoVotesAndThreeComments = new Thread({ title: 'Test Thread Three', content: 'Test Thread Three Content', username: userThree.username, votes: [], comments: [userOneComment._id.toString(), userTwoComment._id.toString(), userThreeComment._id.toString()] });

        Promise.all([userOne.save(), userTwo.save(), userThree.save(), userFour.save(), userFive.save(), userOneComment.save(), userTwoComment.save(), userThreeComment.save()])
            .then(() => {
                threadWithThreeUpvotesTwoDownvotesAndOneComment.save()
                    .then(() => {
                        threadWithTwoUpvotesZeroDownvotesAndZeroComments.save()
                            .then(() => {
                                threadWithNoVotesAndThreeComments.save()
                                    .then(() => {

                                        threadUser.save().then(() => {
                                            cleanThread.save().then(() => {
                                                done();
                                            })
                                        })

                                    })
                            })
                    })
            })
            .catch((err) => console.warn(err));
    })

    it('Post to /api/Threads creates a new thread', (done) => {

        requester.post('/api/threads').send({ username: user.username, content: threadExample.content, title: threadExample.title }).then((res) => {
            expect(res).to.have.status(200);

            Thread.findOne({ _id: res.body.id })
                .then((foundResult) => {
                    expect(foundResult).to.have.property('title', threadExample.title);
                    expect(foundResult).to.have.property('content', threadExample.content);
                    done();            
                });
        })

    });

    it('Post to /api/Threads throws when user does not exist', (done) => {

        requester.post('/api/threads').send({ username: "", content: threadExample.content, title: threadExample.title }).then((res) => {
            expect(res).to.have.status(400);
            done();
        });

    });

    it('Post to /api/Threads throws when content is missing', (done) => {

        requester.post('/api/threads').send({ username: user.username, title: threadExample.title }).then((res) => {
            expect(res).to.have.status(400);
            done();
        });

    });

    it('Post to /api/Threads throws when title is missing', (done) => {

        requester.post('/api/threads').send({ username: user.username, content: threadExample.content }).then((res) => {
            expect(res).to.have.status(400);
            done();
        });

    });


    it('put to /api/Threads should update the content', (done) => {
        const user = { username: 'AUserName', password: "password", newPassword: "securePw" };
        const newContent = "new content";

        Thread.findOne({ content: threadExample.content, title: threadExample.title, username: user.username })
            .then((query) => {
                requester.put('/api/threads/' + query._id)
                    .send({ username: user.username, content: newContent })
                    .then((res) => {
                        expect(res).to.have.status(200);
                        expect(res.body).to.have.property('id');

                        Thread.findOne({ _id: res.body.id }).then((udatedThread) => {
                            console.log(udatedThread)
                            expect(udatedThread.content).to.equal(newContent);
                            expect(udatedThread.title).to.equal(threadExample.title);
                            done();
                        });
                    });
            })
    });


    it('put to /api/Threads should not be able to change the title', (done) => {
        const user = { username: 'AUserName', password: "password", newPassword: "securePw" };
        const newContent = "new content";

        Thread.findOne({ content: threadExample.content, username: user.username })
            .then((query) => {
                console.log('before');
                console.log(query);
                requester.put('/api/threads/' + query._id)
                    .send({ username: user.username, content: newContent, title: "Test" })
                    .then((res) => {
                        expect(res).to.have.status(200);
                        expect(res.body).to.have.property('id');

                        Thread.findOne({ _id: res.body.id }).then((udatedThread) => {
                            expect(udatedThread.content).to.equal(newContent);
                            expect(udatedThread.title).to.equal(threadExample.title);
                            done();
                        });
                    });
            })
    });

    it('post to /api/threads/:threadId/upvote should add an upvote to the thread', done => {
        User.findOne({ username: user.username }).then(foundUser => {
            Thread.findOne({ content: threadExample.content }).then(result => {
                let threadId = result._id.toString();
                requester.post(`/api/threads/${threadId}/upvote`)
                    .send({ userid: foundUser._id })
                    .then(() => {
                        Thread.findOne({ _id: result._id })
                            .then(thread => {
                                expect(thread.votes[0].value).to.equal(1);
                                expect(thread.votes[0].user.toString()).to.equal(foundUser._id.toString());
                                done();
                            })
                    })
            })
        })
    });

    it('post to /api/threads/:threadId/upvote should throw an error when not adding userid in body', done => {
        Thread.findOne({ content: threadExample.content }).then(result => {
            let threadId = result._id.toString();
            requester.post(`/api/threads/${threadId}/upvote`)
                .then(res => {
                    expect(res).to.have.status(400);
                    done();
                })
        })
    });

    it('post to /api/threads/:threadId/downvote should add an downvote to the thread', done => {
        User.findOne({ username: user.username }).then(foundUser => {
            Thread.findOne({ content: threadExample.content }).then(result => {
                let threadId = result._id.toString();
                requester.post(`/api/threads/${threadId}/downvote`)
                    .send({ userid: foundUser._id })
                    .then(() => {
                        Thread.findOne({ _id: result._id })
                            .then(thread => {
                                expect(thread.votes[0].value).to.equal(-1);
                                expect(thread.votes[0].user.toString()).to.equal(foundUser._id.toString());
                                done();
                            })
                    })
            })
        })
    });

    it('post to /api/threads/:threadId/downvote should throw an error when not adding userid in body', done => {
        Thread.findOne({ content: threadExample.content }).then(result => {
            let threadId = result._id.toString();
            requester.post(`/api/threads/${threadId}/downvote`)
                .then(res => {
                    expect(res).to.have.status(400);
                    done();
                })
        })
    });

    it('get from /api/threads?sort=incorrectSortParameter should return a result where sorting is the order of added threads descending (default)', done => {

        requester.get(`/api/threads?sort=incorrectSortParameter`)
            .then(res => {
                const responseBody = res.body;
                expect(res).to.have.status(200);
                expect(responseBody[0].title).to.equal('Test Thread One');
                expect(responseBody[1].title).to.equal('Test Thread Two');
                expect(responseBody[2].title).to.equal('Test Thread Three');
                done();
            })
            .catch((err) => {
                console.log(err);
            })

    });

    it('get from /api/threads?sort=commentcountDESC should return a result where the sorting is based on the amount of comments in a thread in descending order', done => {
        Thread.remove({ title: 'test' })
            .then(() => {
                requester.get(`/api/threads?sort=commentcountDESC`)
                    .then(res => {
                        const responseBody = res.body;
                        expect(res).to.have.status(200);
                        //threadWithNoVotesAndThreeComments
                        expect(responseBody[0].title).to.equal('Test Thread Three');

                        //threadWithThreeUpvotesTwoDownvotesAndOneComment
                        expect(responseBody[1].title).to.equal('Test Thread One');

                        //threadWithTwoUpvotesZeroDownvotesAndZeroComments
                        expect(responseBody[2].title).to.equal('Test Thread Two');
                        done();
                    })
            })
            .catch((err) => console.log(err));

    });

    it('get from /api/threads?sort=upvoteDESC should return a result where the sorting is based on amount of upvotes in descending order', done => {
        Thread.remove({ title: 'test' })
            .then(() => {
                requester.get(`/api/threads?sort=upvoteDESC`)
                    .then(res => {

                        const responseBody = res.body;
                        expect(res).to.have.status(200);

                        //threadWithThreeUpvotesTwoDownvotesAndOneComment
                        expect(responseBody[0].title).to.equal('Test Thread One');

                        //threadWithTwoUpvotesZeroDownvotesAndZeroComments
                        expect(responseBody[1].title).to.equal('Test Thread Two');

                        //threadWithNoVotesAndThreeComments
                        expect(responseBody[2].title).to.equal('Test Thread Three');

                        done();
                    })
            })
            .catch((err) => console.log(err));
    })

    it('get from /api/threads?sort=votediffDESC should return a result where the sorting is based on de difference between upvote and downvote in descending order', done => {
        Thread.remove({ title: 'test' })
            .then(() => {
                requester.get(`/api/threads?sort=votediffDESC`)
                    .then(res => {

                        const responseBody = res.body;

                        expect(res).to.have.status(200);

                        //threadWithTwoUpvotesZeroDownvotesAndZeroComments
                        expect(responseBody[0].title).to.equal('Test Thread Two');

                        //threadWithThreeUpvotesTwoDownvotesAndOneComment
                        expect(responseBody[1].title).to.equal('Test Thread One');

                        //threadWithNoVotesAndThreeComments
                        expect(responseBody[2].title).to.equal('Test Thread Three');

                        done();
                    })
            })
            .catch((err) => console.log(err));
    })

    it('delete request to /api/threads/invalidid should return status 204', done => {

        Thread.countDocuments()
            .then((threadAmountBeforeRemove) => {
                requester.delete(`/api/threads/invalidid`)
                    .then((res) => {
                        expect(res).to.have.status(204);
                    })
                    .then(() => Thread.countDocuments())
                    .then((threadAmountAfterRemove) => {
                        expect(threadAmountAfterRemove).to.equal(threadAmountBeforeRemove);
                        done();
                    })
            })
            .catch((err) => console.log(err));
    });

    it('delete request to /api/threads/existingid should remove all comments on the thread and return status 200', done => {

        Thread.countDocuments()
            .then((threadAmountBeforeRemove) => {
                Comment.countDocuments()
                    .then((commentAmountBeforeRemove) => {
                        Promise.resolve(threadWithNoVotesAndThreeComments.comments.length)
                            .then((amountOfCommentsOnThread) => {
                                requester.delete(`/api/threads/${threadWithNoVotesAndThreeComments._id.toString()}`)
                                    .then((res) => {

                                        expect(res).to.have.status(200);

                                        Thread.countDocuments()
                                            .then((threadAmountAfterRemove) => {
                                                expect(threadAmountAfterRemove).to.equal(threadAmountBeforeRemove - 1);

                                                Comment.countDocuments()
                                                    .then((commentAmountAfterRemove) => {
                                                        expect(commentAmountAfterRemove).to.equal(commentAmountBeforeRemove - amountOfCommentsOnThread);

                                                        done();
                                                    });
                                            });
                                    });
                            });
                    });
            })
            .catch((err) => console.warn(err));
    });

    it('delete request with already deleted resource id to /api/threads/5dd589dc1fbf4c51b448b65b should return status 204', done => {

        Thread.countDocuments()
            .then((threadAmountBeforeRemove) => {
                requester.delete(`/api/threads/5dd589dc1fbf4c51b448b65b`)
                    .then((res) => {
                        expect(res).to.have.status(204);
                    })
                    .then(() => Thread.countDocuments())
                    .then((threadAmountAfterRemove) => {
                        expect(threadAmountAfterRemove).to.equal(threadAmountBeforeRemove);
                        done();
                    })
            })
            .catch((err) => console.log(err));
    });

    it('GET to /api/threads/user/:username/:depth should return threads posted by user and friends', done => {

        const ul = {username: 'Bob', password: "password"};
        const ul1 = {username: 'Curt', password: "password"};
        const ul2 = {username: 'Daniel', password: "password"};

        requester.post('/api/users/')
            .send(ul)
            .then(()=>{ 
                requester.post('/api/users/')
                .send(ul1)
                .then(() => {
                    requester.post('/api/users/')
                    .send(ul2)
                    .then(() => {
                        requester.post('/api/friendship/')
                        .send({
                            userOne: ul.username,
                            userTwo: ul1.username
                        })
                        .then(() => {
                            requester.post('/api/threads').send({
                                title: "hi",
                                content: "hello",
                                username: ul.username
                            })
                            .then(() => {
                                requester.post('/api/threads').send({
                                    title: "hi again",
                                    content: "hello!",
                                    username: ul.username
                                }).then(() => {
                                    requester.post('/api/threads').send({
                                        title: "hi there",
                                        content: "i am new",
                                        username: ul1.username
                                    }).then(() => {
                                        requester.post('/api/threads').send({
                                            title: "oh, hi",
                                            content: "I didn't see you over there",
                                            username: ul2.username
                                        })
                                        .then(() => {
                                            requester.get(`/api/threads/user/${ul.username}/1`)
                                            .then(res => {
                                                expect(res).to.have.status(200)
                                                expect(res.body.length).to.equal(3)
                                                expect(res.body[0].username).to.equal(ul.username);
                                                expect(res.body[1].username).to.equal(ul.username);
                                                expect(res.body[2].username).to.equal(ul1.username);
                                                done();
                                            })
                                        })
                                    })
                                })
                            })   
                        })
                    })
                })
            })
    }),

    it('GET to /api/threads/user/:username/:depth should throw an error when depth is not a number', done => {
        requester.get(`/api/threads/user/Bob/nxjas`)
        .then(res => {
            expect (res).to.have.status(400)
            expect (res.body).to.have.property("errorName").to.equal("depth is not a number");
            done();
        })
    }),

    it('GET to /api/threads/user/:username/:depth should throw an error when depth is a negative number', done => {
        requester.get(`/api/threads/user/Bob/-2`)
        .then(res => {
            expect (res).to.have.status(400)
            expect (res.body).to.have.property("errorName").to.equal("depth has to be a positive number");
            done();
        })
    }),

    it('GET to /api/threads/user/:username/:depth should throw an error when username is not found', done => {
        requester.get(`/api/threads/user/nonexistentboy00/1`)
        .then(res => {
            expect (res).to.have.status(400)
            expect (res.body).to.have.property("errorName").to.equal("Please fill in all fields.");
            done();
        })
    })
})

