const chai = require('chai');
const expect = chai.expect;
const requester = require('../test_requester');
const Neo4JService  =  require('../../src/services/neo4j_service')

const User = require('../../src/models/users');
const mongoose = require('mongoose');

//todo: remove and check cascading and neo4j emptys users
//todo: write unit tests for delete

describe("Friendship controller should",()=>{

    const user = {username:  'C', password: "password"};
    const user1 = {username: 'B', password: "password"};
    const user2 = {username: 'D', password: "password"};

    beforeEach((done)=>{
        const ul = new User(user);
        const ul1 = new User(user1);
        const ul2 = new User(user2);

        requester.post('/api/users/').send(ul)
        .then(res => {}).then(()=>{
            requester.post('/api/users/').send(ul1)
            .then(res => {
                requester.post('/api/users/').send(ul2)
                .then(res => {
                    done();
                });
            })
        });
    });

    
    it('Post to /api/friendship creates a friendship between two persons', (done) => {
        requester.post('/api/friendship')
            .send({userOne: user.username, userTwo: user1.username}).then((res)=>{
                //Expect a 200
                expect(res).to.have.status(200);
                //Check friendship  
                Neo4JService.getFriendship(user.username, user1.username).then((queryRes)=>{
                    //Check friend1                
                    Neo4JService.getFriend(user.username).then((userOneRes)=>{
                        //Expect names to match
                        expect(userOneRes.records[0]._fields[0].properties).to.have.property('personName', user.username);
                        //Check friend2
                        Neo4JService.getFriend(user1.username).then((userTwoRes)=>{
                            //Expect names to match
                            expect(userTwoRes.records[0]._fields[0].properties).to.have.property('personName', user1.username);
                            //Expect a relation to exist.
                            expect(queryRes.records).to.have.property('length', 1);
                            done();
                        });
                    });
                  
                });
        });
    });

    it('Post to /api/friendship should throw when friendship already exists.', (done) => {
        requester.post('/api/friendship')
            .send({userOne: user.username, userTwo: user1.username}).then((res)=>{
                //Expect a 200
                expect(res).to.have.status(200);
                //Post again to check if the error throws that friendship already exists.
                requester.post('/api/friendship')
                    .send({userOne: user.username, userTwo: user1.username}).then((res)=>{
                        expect(res).to.have.status(400);
                        expect(res.body).to.have.property('errorName', 'Users are already friends');
                        //Check friendship  
                        Neo4JService.getFriendship(user.username, user1.username).then((queryRes)=>{
                            //Check friend1                
                            Neo4JService.getFriend(user.username).then((userOneRes)=>{
                                //Expect names to match
                                expect(userOneRes.records[0]._fields[0].properties).to.have.property('personName', user.username);
                                //Check friend2
                                Neo4JService.getFriend(user1.username).then((userTwoRes)=>{
                                    //Expect names to match
                                    expect(userTwoRes.records[0]._fields[0].properties).to.have.property('personName', user1.username);
                                    //Expect a relation to exist.
                                    expect(queryRes.records).to.have.property('length', 1);
                                    done();
                                });
                            });
                        });
                });
            });
        });

    it('Post to /api/friendship should throw when persone one name is missing', (done) => {
        requester.post('/api/friendship')
            .send({userTwo: user1.username}).then((res)=>{
                //Expect a 400
                expect(res).to.have.status(400);
                done();
        });
    });

    it('Post to /api/friendship should throw when persone two name is missing', (done) => {
        requester.post('/api/friendship')
            .send({userOne: user.username}).then((res)=>{
                //Expect a 400
                expect(res).to.have.status(400);
                done();
        });
    });


    it('Delete to /api/friendship removes a friendship between two persons', (done) => {
        requester.delete('/api/friendship')
            .send({userOne: user.username, userTwo: user1.username}).then((res)=>{
                //Expect a 204
                expect(res).to.have.status(204);
                //Check friendship  
                Neo4JService.getFriendship(user.username, user1.username).then((queryRes)=>{
                    //Check friend1                
                    Neo4JService.getFriend(user.username).then((userOneRes)=>{
                        //Expect names to match
                        expect(userOneRes.records[0]._fields[0].properties).to.have.property('personName', user.username);
                        //Check friend2
                        Neo4JService.getFriend(user1.username).then((userTwoRes)=>{
                            //Expect names to match
                            expect(userTwoRes.records[0]._fields[0].properties).to.have.property('personName', user1.username);
                            //Expect a relation to exist.
                            expect(queryRes.records).to.have.property('length', 0);
                            done();
                        });
                    });
                });
        });
    });

    it('Delete to /api/friendship should fail when a name is missing', (done) => {
        requester.delete('/api/friendship')
            .send({userOne: user.username}).then((res)=>{
                //Expect a 204
                expect(res).to.have.status(400);
                done();
        });
    });


    it('Get to /api/friendship/username/:detph gets friends related to friends', (done) => {
        //Create friendship from A > B
        requester.post('/api/friendship')
        .send({userOne: user.username, userTwo: user1.username}).then((res)=>{
            //Expect a 200
            expect(res).to.have.status(200);
            //Create friendhsip from B > D
            requester.post('/api/friendship')
            .send({userOne: user1.username, userTwo: user2.username}).then((res)=>{
                expect(res).to.have.status(200);
                
                //Check friendship on second person
                Neo4JService.getFriendship(user1.username, user2.username).then((queryRes)=>{
                    //Check friend1                
                    Neo4JService.getFriend(user.username).then((userOneRes)=>{
                        //Expect names to match
                        expect(userOneRes.records[0]._fields[0].properties).to.have.property('personName', user.username);
                        //Check friend2
                        Neo4JService.getFriend(user1.username).then((userTwoRes)=>{
                            //Expect names to match
                            expect(userTwoRes.records[0]._fields[0].properties).to.have.property('personName', user1.username);
                            //Expect a relation to exist.
                            expect(queryRes.records).to.have.property('length', 1);

                            //depth of 1 should return B
                            requester.get('/api/friendship/' + user.username + "/" + 1)
                            .send().then((res)=>{
                                expect(res).to.have.status(200);
                                expect(res.body.obj[0]).to.have.property('name', user1.username);
                                
                                //depth of 2 should also retun D
                                requester.get('/api/friendship/' + user.username + "/" + 2)
                                .send().then((res)=>{
                                    expect(res).to.have.status(200);
                                    //check if names match
                                    expect(res.body.obj[0]).to.have.property('name',  user2.username);
                                    expect(res.body.obj[1]).to.have.property('name', user1.username);
    
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });    
    });

    it('Get to /api/friendship/username/:detph throws when user is a whitespace', (done) => {
       
        requester.get('/api/friendship/' + " " + "/" + 2)
        .send().then((res)=>{
            expect(res).to.have.status(400);
            done();
        });
    });

    it('Get to /api/friendship/username/:detph throws when a user doesnt exist', (done) => {
       
        requester.get('/api/friendship/' + "NONEXISTING" + "/" + 2)
        .send().then((res)=>{
            expect(res).to.have.status(400);
            done();
        });
    });

    it('Get to /api/friendship/username/:detph throws when nan is put in depth parameter', (done) => {
       
        requester.get('/api/friendship/' + user.username + "/THIS SHOULD THROW AS NAN")
        .send().then((res)=>{
            expect(res).to.have.status(400);
            done();
        });
    });

    it('Get to /api/friendship/username/:detph throws when nan is put in depth parameter', (done) => {
       
        requester.get('/api/friendship/' + user.username + "/NAN")
        .send().then((res)=>{
            expect(res).to.have.status(400);
            done();
        });
    });
});

