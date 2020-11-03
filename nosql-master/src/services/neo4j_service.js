const Neo4JConnector = require('../services/neo4j_connector')
const apiError = require('../models/apierror')

module.exports = {
    // THREADS
    getThread(thread){
        let session = Neo4JConnector.getSession('r');
        let query = `MATCH (t:Thread) WHERE t.thread_id_mongo= "${thread._id.toString()}" RETURN DISTINCT t`;

        return session
            .run(query)
            .then(result => {
                session.close()
                return result
            })
            .catch(ex => {
                session.close()
                console.warn(ex)
            })
    },

    addThread(thread){
        let session = Neo4JConnector.getSession('w');
        let query = `CREATE (t:Thread {thread_id_mongo: "${thread._id.toString()}", thread_title: "${thread.title}"})`

        return session
            .run(query)
            .then(() => {
                session.close()
                return
            })
            .catch(ex => {
                session.close()
                console.warn(ex)
            })
    },

    getRelatedThreads(thread){
        let session = Neo4JConnector.getSession('r');
        let query = `
            MATCH (t1:Thread {thread_id_mongo: "${thread}" })-[cv:contains]->(st:Topic)<-[:contains]-(t2:Thread)
            RETURN t2, collect(st), count(cv) as frequency ORDER BY frequency DESC`
            
        return session
            .run(query)
            .then((res) => {
                session.close()
                return res
            })
            .catch(ex => {
                session.close()
                console.warn(ex)
            })
    },

    // TOPICS

    getTopic(topic){
        let session = Neo4JConnector.getSession('r');
        let query = `MATCH (t:Topic) WHERE t.normalizedName= "${topic}" RETURN DISTINCT t`;

        return session
            .run(query)
            .then(result => {
                session.close()
                return result
            })
            .catch(ex => {
                session.close()
                console.warn(ex)
            })
    },
    
    addTopic(topic){

        let session = Neo4JConnector.getSession('w');
        let query = `CREATE (t:Topic {normalizedName: "${topic}" })`

        return session
            .run(query)
            .then(() => {
                session.close()
                return
            })
            .catch(ex => {
                session.close()
                console.warn(ex)
            })
    },
    
      //COMMENTS
      getComment(comment){
        let session = Neo4JConnector.getSession('r');
        let query = `MATCH (c:Comment) WHERE c.comment_id_mongo= "${comment._id.toString()}" RETURN DISTINCT c`;

        return session
            .run(query)
            .then(result => {
                session.close()
                return result
            })
            .catch(ex => {
                session.close()
                console.warn(ex)
            })
    },
    
    

    addComment(comment){
        let session = Neo4JConnector.getSession('w');
        let query = `CREATE (c:Comment {comment_id_mongo: "${comment._id.toString()}"})`

        return session
            .run(query)
            .then(() => {
                session.close();
                return;
            })
            .catch(ex => {
                session.close();
                console.warn(ex);
            })
    },

    getRelatedComments(comment){
        let session = Neo4JConnector.getSession('r');
        let query = `
            MATCH (c1:Comment {comment_id_mongo: "${comment}" })-[cv:contains]->(st:Topic)<-[:contains]-(c2:Comment)
            RETURN c2, collect(st), count(cv) as frequency ORDER BY frequency DESC`
            
        return session
            .run(query)
            .then((res) => {
                session.close()
                return res
            })
            .catch(ex => {
                session.close()
                console.warn(ex)
            })
    },

    // FRIENDS || USERS
    
    getFriend(username){
        let session = Neo4JConnector.getSession('r');
        let query = `MATCH (f:Friends) WHERE f.personName = "${username}" RETURN f`;
        return session
            .run(query)
            .then(result => {
                session.close()
                return result
            })
            .catch(ex => {
                session.close()
                console.warn(ex);
            })
    },

    addFriend(username){
        
        let session = Neo4JConnector.getSession('w');
        let query = `CREATE(f:Friends {personName: "${username}"})`

        return session
            .run(query)
            .then(() => {
                session.close();
                return;
            })
            .catch(ex => {
                session.close();
                console.warn(ex);
            })
    },

    deleteFriend(username){
        let session = Neo4JConnector.getSession();
        let query = `MATCH (p:Friends {personName: "${username}" }) DETACH DELETE p`

        return session
            .run(query)
            .then(() => {
                session.close()
            })
            .catch(ex => {
                session.close()
                console.warn(ex)
            });
    },

    // RELATIONS

    // params are expected to be usernames
    addFriendship(first, second){
        
        let session = Neo4JConnector.getSession()
        let query = `
            MATCH (p1:Friends) WHERE p1.personName = "${first}"
            MATCH (p2:Friends) WHERE p2.personName = "${second}"
            CREATE(p1)-[r:isFriendsWith{since: "${ Date.now() }"}]->(p2)
            RETURN p1, r, p2`

        return session
             .run(query)
             .then(res => {
                 console.log(res);
                 
                 session.close()
                 return res
             })
            .catch(ex => {
                session.close()
                console.warn(ex)
            })
    },

    getAllFriends(username, depth){
        let session = Neo4JConnector.getSession('r');
        let query = `MATCH (p:Friends {personName: "${username}" })-[:isFriendsWith*1..${depth}]-(x:Friends) RETURN DISTINCT x`

        return session
            .run(query)
            .then(res => {
                session.close()
                return res
            })
            .catch(ex => {
                session.close()
                console.warn(ex)
            })
    },

    getFriendship(first, second){
        let session = Neo4JConnector.getSession('r');
        let query = `MATCH (p:Friends {personName: "${first}" })-[:isFriendsWith]-(x:Friends {personName:"${second}"}) RETURN DISTINCT p.personName, x.personName`;

        return session
            .run(query)
            .then(res =>{
                session.close()
                return res
            })
            .catch(ex => {
                session.close()
                console.warn(ex);
            })
    },

    removeFriendship(first, second){
        let session = Neo4JConnector.getSession();
        let query = `MATCH (p:Friends {personName: "${first}" })-[r:isFriendsWith]-(x:Friends {personName:"${second}"}) DELETE r `
        return session
            .run(query)
            .then(() => {
                session.close()
            })
            .catch(ex => {
                session.close()
                console.warn(ex)
            })
    },

    createCommentRelation(comment, topic){
        let session = Neo4JConnector.getSession();
        return this.getComment(comment)
            .then(foundComment => {
                let commentId = foundComment.records[0]._fields[0].properties.comment_id_mongo;
                let query = `
                    MATCH (to:Topic) WHERE to.normalizedName="${topic}"
                    MATCH (ct:Comment) WHERE ct.comment_id_mongo = "${commentId}"
                    CREATE (ct)-[r:contains]->(to)
                    RETURN ct, r, to`
                return session
                    .run(query)
                    .then(result => {
                        session.close()
                        return result
                    })
                    .catch(ex => {
                        session.close()
                        console.warn(ex)
                    })
            })
            .catch(ex => {
                session.close()
                console.warn(ex)
            })
    },

    // set the relation between a thread and a topic, topic is the normalizedName of the topic.
    addThreadRelation(thread, topic){
        console.log("--7");

        let session = Neo4JConnector.getSession();
        return this.getThread(thread)
            .then(foundThread => {
                let threadId = foundThread.records[0]._fields[0].properties.thread_id_mongo;
                let query = `
                    MATCH (to:Topic) WHERE to.normalizedName="${topic}"
                    MATCH (th:Thread) WHERE th.thread_id_mongo= "${threadId}"
                    CREATE (th)-[r:contains]->(to)
                    RETURN th, r, to`
                return session
                    .run(query)
                    .then(result => {
                        session.close()
                        return result
                    })
                    .catch(ex => {
                        session.close()
                        console.warn(ex)
                    })
            })
            .catch(ex => {
                session.close()
                console.warn(ex)
            })
    },

    //For test databases.
    clearDatabase(){
        console.log("Clearing test database.");

        let session = Neo4JConnector.getSession("w");
        let query = `
           MATCH(N) DETACH DELETE N`
        return session
            .run(query)
            .then(result => {
                session.close()
                return result
            })
            .catch(ex => {
                session.close()
                console.warn(ex)
            })
    }
}