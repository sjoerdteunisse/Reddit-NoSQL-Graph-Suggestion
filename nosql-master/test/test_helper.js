const mongoose = require('mongoose');
const Neo4JService  =  require('../src/services/neo4j_service')

before(done=>{

    let uri;
    if(process.env.NODE_ENV === 'test'){
        console.log('before each connect to testdb')
        uri = "mongodb+srv://studdit:0TVVRmcG9PivtBrf@cluster0-grbyc.gcp.mongodb.net/test?retryWrites=true&w=majority";
    }
    else if (process.env.NODE_ENV === 'local'){
        console.log('before each connect to local')
        uri = 'mongodb://127.0.0.1/studdit_nosql_test';
    }

    mongoose.connect(uri, {useUnifiedTopology: true, useNewUrlParser: true});
    mongoose.connection
    .once('open', ()=>done())
    .on('error', err=>{
        console.warn('Warning', err)
    })
})

beforeEach(done=>{
    const {comments, threads, users} = mongoose.connection.collections;

  comments.remove().then(()=>{
        threads.remove().then(()=>{
            users.remove().then(()=>{
                Neo4JService.clearDatabase().then(()=>{
                    done();
                });
            });
        })
    });
})