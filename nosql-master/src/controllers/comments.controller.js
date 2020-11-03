const apiError = require('../models/apierror');
const Comment = require('../models/comments');
const Thread = require('../models/threads');
const User = require('../models/users');


const Neo4JConnector = require('../services/neo4j_connector')
const Neo4JService = require('../services/neo4j_service')

const idRegex = /^[0-9a-fA-F]{24}$/;

// analyzing
var Sentiment = require('sentiment');
var nlp = require('compromise');

module.exports = {
    //todo merge analyze
    analyze(req, res, next) {
        const requestedComment = req.params.commentId;

        if (requestedComment) {
            Comment.findOne({ _id: requestedComment })
                .then((comment) => {

                    if (comment == null)
                        return next(new apiError('comment not found.', 400))

                    calculateStatistics(comment).then((data) => {
                        return res.status(200).send({ content: data.sentiment.result, title: data.sentiment.title, analyzedNER: data.nlp.topics, people: data.nlp.people, dates: data.nlp.dates, values: data.nlp.values });
                    }).catch(ex => {
                        console.warn(ex);
                    });
                });
        } else {
            //+ Object.keys(new User()).toString()
            return next(new apiError('Please fill in all fields', 400))
        }
    },
    add(req, res, next) {

        //Can be a comment or thread
        const threadId = req.params.threadId;
        const userId = req.body.userid;
        const comment = new Comment(req.body);

        if (threadId && userId && comment.content) {

            if (threadId.match(idRegex) && userId.match(idRegex)) {

                User.findOne({ _id: userId })
                    .then((foundUser) => {
                        if (foundUser == null || foundUser == undefined)
                            return res.status(204).send();


                        Thread.findOne({ _id: threadId })
                            .then((foundThread) => {

                                if (foundThread == null || foundThread == undefined)
                                    return res.status(204).send();

                                comment.user = foundUser._id;
                                comment.save().then(() => {
                                    foundThread.comments.push(comment);
                                    foundThread.save()
                                        .then(() => {
                                            calculateStatistics(comment).then((stats) => {
                                                pushStatistics(comment, stats).then(result => {
                                                    return res.status(200).send({ id: comment._id });
                                                });
                                            })
                                        });
                                })
                            }).catch((ex) => res.status(400).send());

                    })
            }
            else {
                return res.status(204).send();
            }
        }
        else {
            //+ Object.keys(new User()).toString()
            return next(new apiError('Please fill in all fields', 400))
        }

    },
    addToComment(req, res, next) {

        //Can be a comment or thread
        const threadId = req.params.threadId;
        const commentId = req.params.commentId;
        const userId = req.body.userid;
        const comment = new Comment(req.body);

        if (threadId && commentId && userId && comment.content) {

            if (threadId.match(idRegex) && userId.match(idRegex) && commentId.match(idRegex)) {

                User.findOne({ _id: userId })
                    .then((foundUser) => {
                        if (foundUser == null || foundUser == undefined)
                            return res.status(204).send();

                        Comment.findOne({ _id: commentId })
                            .then((foundComment) => {

                                if (foundComment == null || foundUser == undefined)
                                    return res.status(204).send();

                                Thread.findOne({ _id: threadId })
                                    .then((foundThread) => {

                                        if (foundThread == null || foundThread == undefined)
                                            return res.status(204).send();

                                        comment.parentComment = foundComment._id;
                                        comment.user = userId;
                                        comment.save()
                                            .then(() => {
                                                foundThread.comments.push(comment);
                                                foundThread.save().then(() => {
                                                    return res.status(200).send({ id: comment._id });
                                                });
                                            });

                                    });
                            }).catch((err) => { return next(new apiError(err, 400)) })
                    })
            }
            else {
                return res.status(204).send();
            }
        }
        else {
            //+ Object.keys(new User()).toString()
            return next(new apiError('Please fill in all fields', 400))
        }

    },
    relatedComments(req, res,next){
        const requestedComment = req.params.commentId;
        if(requestedComment){
           
            Neo4JService.getRelatedComments(requestedComment)
                .then((result)=>{
                    if (result.records.length === 0){
                        return res.status(204).send();
                    }
                    foundComments = [];
                    
                    for (let i = 0; i < result.records.length; i++) {
                        let id = result.records[i]._fields[0].properties.comment_id_mongo;
                        let foundTopics = []

                        for (let j = 0; j < result.records[i]._fields[1].length; j++) {
                            foundTopics.push(result.records[i]._fields[1][j].properties.normalizedName)
                        }

                        let body = {
                            id: id,
                            topics: foundTopics,
                            frequency: result.records[i]._fields[2].low,
                            _link: `/api/threads/comments/${id}`
                        }
                        foundComments.push(body)
                    }                 

                    return res.status(200).send(foundComments);
                })

        }else{
            // So solly. No chow mein here. You delivel wlong place.
            return next(new apiError('Please fill in all the fields', 400))
        }
    },
    getById(req, res, next) {
        const requestedComment = req.params.commentId;

        if (requestedComment) {
            Comment.findOne({ _id: requestedComment })
                .then((comment) => {
                    if (comment != null) {
                        return res.status(200).send(comment);
                    }
                    else {
                        return res.status(204).send();
                    }
                });
        } else {
            //+ Object.keys(new User()).toString()
            return next(new apiError('Please fill in all fields', 400))
        }
    },

    suggestedContent(req, res, next) {
        const requestedComment = req.params.commentId;
        const requestedThread = req.params.threadId;

        if (requestedThread && requestedThread.match(/^[0-9a-fA-F]{24}$/) && requestedComment.match(/^[0-9a-fA-F]{24}$/)) {
            Thread.findOne({ _id: requestedThread })
                .populate('comments')
                .then((thread) => {
                    if (thread != null) {
                        Comment.findOne({ _id: requestedComment })
                            .then((comment) => {
                                if (comment != null) {

                                    doc = nlp(comment.content);
                                    const nlpResult = doc.topics().data();

                                    regexArray = [];
                                    nlpResult.forEach(function (v) {
                                        regexArray.push(new RegExp(v.normal, "i"));
                                    });

                                    Comment.find({ content: { $in: regexArray } })
                                        .then((result) => {
                                            if (result != null) {
                                                return res.status(200).send(result);
                                            }
                                            else {
                                                return res.status(204).send(result);
                                            }
                                        })
                                }
                                else {
                                    return res.status(204).send();
                                }
                            })
                    }
                    else {
                        return res.status(204).send();

                    }



                });
        } else {
            //+ Object.keys(new User()).toString()
            return next(new apiError('Please fill in all fields', 400))
        }
    },

    delete(req, res, next) {
        const threadId = req.params.threadId;
        const commentId = req.params.commentId;

        if (threadId && commentId) {
            if (threadId.match(idRegex) && commentId.match(idRegex)) {
                Comment.findOne({ _id: commentId }).then((result) => {

                    if (result === undefined || result === null)
                        return res.status(204).send();

                    Comment.deleteOne({ _id: result._id })
                        .then(() => {
                            return res.status(204).send();
                        })
                });
            }
            else {
                return res.status(204).send();
            }
        }
        else {
            //+ Object.keys(new User()).toString()
            return next(new apiError('Please pass all the parameters', 400))
        }


    },
    upvote(req, res, next) {
        handleVotes(req, res, next, 1);
    },
    downvote(req, res, next) {
        handleVotes(req, res, next, -1);
    }
}

function handleVotes(req, res, next, voteValue) {
    const commentId = req.params.commentId;
    const userid = req.body.userid;

    if (commentId && userid) {
        Comment.findOne({ _id: commentId })
            .then((foundComment) => {
                let p = new Promise((resolve, reject) => {
                    let found = false;

                    for (let i = 0; i < foundComment.votes.length; i++) {
                        if (foundComment.votes[i].user.toString() === userid) {
                            found = true;
                        }
                    }

                    found ? resolve() : reject();
                });

                p.then(() => {
                    // User has voted on this comment.
                    Comment.updateOne(
                        { _id: commentId, 'votes.user': userid },
                        { $set: { 'votes.$.value': voteValue } }
                    ).then(() => {
                        return res.status(200).send({ id: foundComment._id })
                    })
                })
                    .catch((ex) => {
                        if (ex !== undefined && ex !== null) {
                            return next(new apiError(ex, 500))
                        }

                        // User hasn't voted on this comment.
                        foundComment.votes.push({ value: voteValue, user: userid });
                        foundComment.save()
                            .then(() => {
                                return res.status(200).send({ id: foundComment._id })
                            })
                    })
            }).catch(err => { return next(new apiError(err, 400)) })
    }
    else {
        return next(new apiError('Please fill in all fields', 400))
    }
}



// Return statistics
function calculateStatistics(comment) {
    return new Promise((resolve, reject) => {
        doc = nlp(comment.content);
        let nlpTopics = doc.topics().map((m)=> m.out('normal'));
        
        var uniqueItems = Array.from(new Set(nlpTopics))
        nlpTopics = uniqueItems;


        let nlpPeople = doc.people().data();
        let nlpDates = doc.dates().data();
        let nlpValues = doc.values().data();

        let sentiment = new Sentiment();
        let result = sentiment.analyze(`${comment.content}`);

        let returnObject = {
            sentiment: {
                result: result
            },
            nlp: {
                topics: nlpTopics,
                people: nlpPeople,
                dates: nlpDates,
                values: nlpValues
            }
        }
        resolve(returnObject)
    })
}


function pushStatistics(t, stats) {
    const comment = t;
    console.log("--1");
    console.log(comment._id);
    return new Promise((resolve, reject) => {
        Neo4JService.addComment(comment)
            .then(() => {
                console.log("--4");
                console.log(stats.nlp.topics.length);
                for (let i = 0; i < stats.nlp.topics.length; i++) {
                    let currentTopic = stats.nlp.topics[i];
                    Neo4JService.getTopic(currentTopic)
                        .then(result => {
                            console.log("--6a");
                            if (result.records.length === 0) {
                                Neo4JService.addTopic(currentTopic).then(() => {
                                    Neo4JService.createCommentRelation(comment, currentTopic)
                                        .then()
                                        .catch(reject())
                                })
                            }
                            else {
                                console.log("-- YEAAAAAAH");
                                console.log(result.records[0]._fields[0].properties.normalizedName);

                                const normalizedName = result.records[0]._fields[0].properties.normalizedName;

                                if (normalizedName == null)
                                    reject();
                                Neo4JService.createCommentRelation(comment, normalizedName)
                                    .then(console.log(`added a relationship between given comment and ${normalizedName}`))
                                    .catch(ex => console.warn(ex))
                            }
                        })
                        .catch(ex => console.warn(ex))
                }
                console.log('done with loop');

            })
            .then(() => resolve())
            .catch(ex => console.warn(ex))
    })
}
