const chai = require('chai');
const expect = chai.expect;
const requester = require('../test_requester');

const User = require('../../src/models/users');
const Neo4JService = require('../../src/services/neo4j_service')

//todo: remove and check cascading and neo4j emptys users
//todo: write unit tests for delete

describe("User controller should",()=>{

    beforeEach((done)=>{
        const user = {username: 'AUserName', password: "password"};
        const ul = new User(user);
        ul.save().then(()=>done());
    })

    it('Post to /api/users creates a new user', (done) => {
        const user = {username: 'ASecondUser', password: "password"};
        
        User.count().then(count => {
            requester.post('/api/users').send({username: user.username, password: user.password}).then((res)=>{
                expect(res).to.have.status(200)
                expect(res.body).to.have.property('id')

                User.findOne({username: user.username }).then((foundUser)=>{
                    expect(foundUser).to.have.property('username', user.username);
                    expect(foundUser).to.have.property('password', user.password);

                    User.count().then(newCount => {
                        const c = count+1;
                        expect(c).to.equal(newCount);
                        done();
                    });
                });
            });
        })
    });

    it('Post to /api/users with a username that already exists should throw an exception', (done) => {
        const user = {username: 'ASecondUser', password: "password"};
        
        requester.post('/api/users').send({username: user.username, password: user.password}).then((res)=>{
            expect(res).to.have.status(200)
            expect(res.body).to.have.property('id')

            requester.post('/api/users').send({username: user.username, password: user.password}).then((res)=>{
                expect(res).to.have.status(400);
                done();
            });
        });
    });

    it('Post to /api/users throws when username contains spaces', (done) => {
        const user = {username: 'A Second User', password: "password"};
        
        requester.post('/api/users').send({username: user.username, password: user.password})
        .then((res)=>{
            expect(res).to.have.status(400);
            done();
        });
    });

    it('Post to /api/users throws when username is a whitespace', (done) => {
        const user = {username: ' ', password: "password"};

        //whitespace should trigger a 400 as the validator throws
        requester.post('/api/users').send({username: user.username, password: user.password}).then((res)=>{
            done();            
        }).catch((res)=>{            
            expect(res).to.have.status(400)
            done();
        });
    });

    it('Post to /api/users throws when username parameter is missing', (done) => {
        const user = { password: "password" };

        //whitespace should trigger a 400 as the validator throws
        requester.post('/api/users').send({password: user.password}).then((res)=>{
            expect(res).to.have.status(400)
            done();            
        });
    });

    it('Post to /api/users throws when password parameter is missing', (done) => {
        const user = { username: "ASecondUser" };

        //whitespace should trigger a 400 as the validator throws
        requester.post('/api/users').send({username: user.username}).then((res)=>{
            expect(res).to.have.status(400)
            done();            
        });
    });

    it('Put to /api/users updates a existing user, but only modifies the password', (done) => {
        const user = {username: 'AUserName', password: "password", newPassword: "securePw"};

        User.count().then(count => {
            User.findOne({username: user.username}).then((query)=>{
                requester.put('/api/users/' + user.username)
                .send({username: "SomeOtherUsername", password: user.newPassword, currentPassword: user.password})
                .then((res)=>{
                    //check http result
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('id');

                    //check that username isn't changed
                    expect(query).to.have.property('username', user.username);

                    //check count
                    User.count().then(newCount => {
                        const c = count;
                        expect(c).to.equal(newCount);
                        done();
                    });
                });
            });
        });
    });

    it('Put to /api/users updates a existing user, with wrong currentPassword', (done) => {
        const user = {username: 'AUserName', password: "password", newPassword: "securePw"};
        const wrongPassword = "imWrong";

        requester.put('/api/users/' + user.username)
        .send({username: user.username, password: user.newPassword, currentPassword: wrongPassword})
        .then((res)=>{     
            expect(res).to.have.status(401);
            done();
        })
    });

    it('Delete to /api/users put an existing user inactive and delete it from neo4j', done => {
        const user = {username: 'userthatisaloser', password: "blepblap"};
        
        requester.post('/api/users/').send(user)
            .then(res => {
                return Neo4JService.getFriend(user.username)
                    .then(res => { return res.records.length })
            })
            .then(count => {
                User.findOne({username: user.username})
                    .then(loser => {
                        requester.delete(`/api/users/${user.username}`)
                            .send({ password: user.password})
                            .then(result => {
                                expect(result).to.have.status(204)
                                User.findOne({username: user.username})
                                    .then(loserAgain => {
                                        expect(loserAgain.active).to.not.equal(loser.active)
                                        expect(loserAgain.active).to.equal(false);
                                        Neo4JService.getFriend(user.username)
                                            .then(res => {
                                                expect(res.records.length).to.equal(count-1);
                                                done();
                                            })
                                    })
                            })
                    })
            });
    });
});

    