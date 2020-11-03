const apiError = require('../models/apierror');
const Thread = require('../models/threads');

// friendships
const User = require('../models/users');
const Neo4JConnector = require('../services/neo4j_connector')
const Neo4JService = require('../services/neo4j_service')

const idRegex = /^[0-9a-fA-F]{24}$/;

// analyzing
var Sentiment = require('sentiment');
var nlp = require('compromise');

module.exports = {
    //maybe move to other export and endpoint
    analyze(req, res, next) {
        const requestedThread = req.params.id;

        if (!requestedThread.match(idRegex))
            return res.status(204).send();

        if (requestedThread) {
            Thread.findOne({ _id: requestedThread })
                .populate('comments')
                .then((thread) => {

                    if (thread == null || thread == undefined)
                        return res.status(204).send();

                    calculateStatistics(thread).then(data => {
                        return res.status(200).send({ content: data.sentiment.result, title: data.sentiment.title, analyzedNER: data.nlp.topics, people: data.nlp.people, dates: data.nlp.dates, values: data.nlp.values });
                    }).catch(ex => {
                        console.warn(ex);
                    })
                })
        } else {
            //+ Object.keys(new User()).toString()
            return next(new apiError('Please fill in all fields', 400))
        }
    },
    relatedThreads(req, res, next){

        const requestedThread = req.params.id;
        if(requestedThread){
           
            Neo4JService.getRelatedThreads(requestedThread)
                .then((result)=>{
                    if (result.records.length === 0){
                        return res.status(204).send();
                    }
                    console.dir(result.records[0]._fields[1])
                    
                    foundThreads = [];
                    
                    for (let i = 0; i < result.records.length; i++) {
                        let id = result.records[i]._fields[0].properties.thread_id_mongo;
                        let foundTopics = []

                        for (let j = 0; j < result.records[i]._fields[1].length; j++) {
                            foundTopics.push(result.records[i]._fields[1][j].properties.normalizedName)
                        }

                        let body = {
                            id: id,
                            title: result.records[i]._fields[0].properties.thread_title,
                            topics: foundTopics,
                            frequency: result.records[i]._fields[2].low,
                            _link: `/api/threads/${id}`
                        }
                        foundThreads.push(body)
                    }                 

                    return res.status(200).send(foundThreads);
                })

        }else{
            // So solly. No chow mein here. You delivel wlong place.
            return next(new apiError('Please fill in all the fields', 400))
        }

    },
    suggestedContent(req, res, next)
    {
        const requestedThread = req.params.id;

        if (!requestedThread.match(idRegex))
            return res.status(204).send();

        if (requestedThread) {
            Thread.findOne({ _id: requestedThread })
                .populate('comments')
                .then((thread) => {

                    if (thread == null || thread == undefined)
                        return res.status(204).send();

                    doc = nlp(thread.content);
                    const nlpResult = doc.topics().data();

                    regexArray = [];
                    nlpResult.forEach(function (v) {
                        regexArray.push(new RegExp(v.normal, "i"));
                    });

                    Thread.find({ content: { $in: regexArray } })
                        .then((result) => {
                            if (result != null) {
                                return res.status(200).send(result);
                            }
                            else {
                                return res.status(204).send(result);
                            }
                        })

                });
        } else {
            //+ Object.keys(new User()).toString()
            return next(new apiError('Please fill in all fields', 400))
        }
    },
    add(req, res, next) {
        if (req.body.username && req.body.title && req.body.content) {
            const thread = new Thread(req.body);

            //!!Do we need to check if username exists?!!

            thread.save()
                .then(() => {
                    Thread.findOne({ _id: thread._id })
                        .then((thread) => {
                            calculateStatistics(thread).then(data => {
                                pushStatistics(thread, data).then(() => {
                                    return res.status(200).send({ id: thread._id })
                                }).catch((ex) => res.status(400).send());
                            });
                        });
                })
                .catch(ex => { console.warn(ex) });
        } else {
            return next(new apiError('Please fill in all fields', 400))
        }
    },

    delete(req, res, next) {
        //Delete all sub elemetns, votes, comments, subcomments etc.
        const threadId = req.params.id;

        Promise.resolve(threadId)
            .then((threadId) => {
                if (threadId.match(idRegex)) {
                    Thread.findOne({ _id: threadId })
                        .then((foundThread) => {
                            if (foundThread == null || foundThread == undefined) {
                                res.status(204).send();
                            }
                            else {
                                foundThread.remove({ _id: threadId })
                                    .then(() => res.status(200).send(foundThread));
                            }
                        })
                        .catch((err) => console.log(err));
                } else {
                    res.status(204).send();
                }

            })
            .catch((err) => console.log(err));

    },

    update(req, res, next) {
        //Update element
        const requestedThread = req.params.id;

        if (req.body.username && req.body.content && requestedThread) {
            //!!Do we need to check if username exists?!!
            Thread.findOne({ _id: requestedThread })
                .then((thread) => {
                    thread.content = req.body.content;

                    thread.save().then(() => {
                        return res.status(200).send({ id: requestedThread })
                    })
                });
        } else {
            return next(new apiError('Please fill in all fields' + Object.keys(Thread).toString(), 400))
        }
    },

    getAll(req, res, next) {
        const sort = req.query.sort;

        if (sort === "commentcountDESC") {
            Thread.aggregate(
                [
                    {
                        $addFields: { comment_count: { $size: { "$ifNull": ["$comments", []] } } }
                    },
                    {
                        $sort: { "comment_count": -1 }
                    },
                    {
                        $project: { "comments": 0, "comment_count": 0 }
                    }
                ]
            )
                .then((threads) => {
                    // sort threads json on amount of comments in a thread in descending order
                    return res.status(200).send(threads)
                })
                .catch((err) => {
                    console.warn(err);
                })
        }
        else {
            Thread.find({}, { comments: 0 })
                .then((threads) => {
                    if (sort === "upvoteDESC") {
                        // sort threads json on upvotes in descending order
                        Promise.resolve(threads.sort((a, b) => a.upvotes - b.upvotes).reverse())
                            .then((sortedThreads) => {
                                return res.status(200).send(sortedThreads);
                            });

                    }
                    else if (sort === "votediffDESC") {
                        // sort threads json on difference between upvotes and downvotes difference in descending order
                        Promise.resolve(threads.sort((a, b) => (a.upvotes - a.downvotes) - (b.upvotes - b.downvotes)).reverse())
                            .then((sortedThreads) => {
                                return res.status(200).send(sortedThreads);
                            });
                    }
                    else {
                        return res.status(200).send(threads);
                    }

                })
                .catch((err) => {
                    console.warn(err);
                })
        }



    },

    getByid(req, res, next) {
        const requestedThread = req.params.id;

        if (requestedThread) {
            Thread.findOne({ _id: requestedThread })
                .populate('comments')
                .then((thread) => {

                    return res.status(200).send(thread)
                })
        } else {
            return next(new apiError('Please fill in all fields', 400))
        }

    },

    getByUser(req, res, next) {

        // TODO: change to userid? 
        const user = req.params.username;
        const depth = req.params.depth;

        if (isNaN(depth)) {
            return next(new apiError('depth is not a number', 400))
        }

        if (depth < 0) {
            return next(new apiError('depth has to be a positive number', 400))
        }

        if (user && depth) {
            User.findOne({ username: user }, { _id: 1 }).then(result => {
                if (result) {
                    Neo4JService.getAllFriends(user, depth)
                        .then(result => {
                            obj = [user]
                            result.records.forEach(record => {
                                record._fields.forEach(key => {
                                    obj.push(key.properties.personName);
                                })
                            })
                            return obj
                        })
                        .then(result => {
                            Thread.find({ username: { $in: result } }, { comments: 0 })
                                .then(result => {
                                    res.status(200).send(result)
                                })
                        })
                } else {
                    return next(new apiError('Please fill in all fields.', 400))
                }
            })
        }
    },

    upvote(req, res, next) {
        handleVotes(req, res, next, 1);
    },

    downvote(req, res, next) {
        handleVotes(req, res, next, -1);
    }
};

function handleVotes(req, res, next, voteValue) {
    //Can be a comment or thread
    const threadId = req.params.id;
    //Id or username?
    const userid = req.body.userid;

    //!!look if user exists??!!
    if (threadId && userid) {
        Thread.findOne({ _id: threadId })
            .then((foundThread) => {
                if (foundThread) {
                    // Check if the user has voted on this thread.
                    let p = new Promise((resolve, reject) => {
                        let found = false;
                        // Loop through the array for votes, search for a vote that has been cast by given userid
                        for (let i = 0; i < foundThread.votes.length; i++) {
                            if (foundThread.votes[i].user.toString() === userid) {
                                found = true;
                            }
                        }
                        found ? resolve() : reject();
                    })

                    p.then(() => {
                        // User has voted on this thread.
                        Thread.updateOne(
                            { _id: threadId, 'votes.user': userid },
                            { $set: { 'votes.$.value': voteValue } }
                        ).then(() => {
                            return res.status(200).send({ id: foundThread._id })
                        })
                    })
                        .catch((ex) => {
                            if (ex !== undefined && ex !== null) {
                                return next(new apiError(ex, 500))
                            }
                            // User hasn't voted on this thread.
                            foundThread.votes.push({ value: voteValue, user: userid });
                            foundThread.save()
                                .then(() => {
                                    return res.status(200).send({ id: foundThread._id })
                                });
                        })
                }
                else {
                    return next(new apiError("Thread cannot be found", 204));
                }

            }).catch((err) => { return next(new apiError(err, 400)) })
    }
    else {
        return next(new apiError('Please fill in all fields', 400))
    }
}



// Return statistics
function calculateStatistics(thread) {
    return new Promise((resolve, reject) => {
        doc = nlp(thread.content);
        let nlpTopics = doc.topics().map((m) => m.out('normal'));

        var uniqueItems = Array.from(new Set(nlpTopics))
        nlpTopics = uniqueItems;

        let nlpPeople = doc.people().data();
        let nlpDates = doc.dates().data();
        let nlpValues = doc.values().data();

        let sentiment = new Sentiment();

        let result = sentiment.analyze(`${thread.title}. ${thread.content}`);

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
    const thread = t;
    return new Promise((resolve, reject) => {
        Neo4JService.addThread(thread)
            .then(() => {
                console.log(stats.nlp.topics.length);
                for (let i = 0; i < stats.nlp.topics.length; i++) {
                    let currentTopic = stats.nlp.topics[i];
                    Neo4JService.getTopic(currentTopic)
                        .then(result => {
                            if (result.records.length === 0) {
                                Neo4JService.addTopic(currentTopic).then(() => {
                                    Neo4JService.addThreadRelation(thread, currentTopic)
                                        .then()
                                        .catch(reject())
                                })
                            }
                            else {
                                const normalizedName = result.records[0]._fields[0].properties.normalizedName;

                                if (normalizedName == null)
                                    reject();
                                Neo4JService.addThreadRelation(thread, normalizedName)
                                    .then()
                                    .catch(ex => console.warn(ex))
                            }
                        })
                        .catch(ex => console.warn(ex))
                }
            })
            .then(() => resolve())
            .catch(ex => console.warn(ex))
    })
}
