const apiError = require('../models/apierror');
const User = require('../models/users');
const Neo4JConnector = require('../services/neo4j_connector')
const Neo4JService  =  require('../services/neo4j_service')
// TODO: refactor to work with neo4j-driver package

module.exports = {

    add(req, res, next) {
        const userOne = req.body.userOne;
        const userTwo = req.body.userTwo;

        if(userOne && userTwo){
            
            // Check if user exists (MongoDB)
            User.findOne({username: userOne})
                .then(result => {
                    if (result == null){
                        throw new apiError(`${userOne} is not found`, 400)
                    } else if (result.active === false){
                        throw new apiError(`${userOne} is not found`, 400)
                    }
                    return result
                })
                .then(personOne => {
                    return User.findOne({username: userTwo})
                        .then(result => {
                            if (result == null) {
                                throw new apiError(`${userTwo} is not found`, 400)
                            }else if (result.active === false){
                                throw  new apiError(`${userTwo} is not found`, 400)
                            }
                            return result
                        })
                        .then(personTwo => {
                           return Neo4JService.getFriendship(personOne.username, personTwo.username)
                            .then(res => {
                                // Friendship already exists, return 204 to caller
                                if (res.records.length > 0) {
                                    throw new apiError('Users are already friends', 400)
                                }else{
                                    return
                                }
                            })
                        })
                })
                .then(() => {
                    Neo4JService.addFriendship(userOne, userTwo)
                        .then(() => { 
                            return res.status(200).send({result: "Added friendship" }) 
                        })
                })
                .catch(ex => {
                    return next(ex)
                })
            }
            else{
                return next(new apiError('Missing either persone one or person two.', 400))
            }
    },
    getFriends(req, res,next){
        const depth = req.params.depth;
        const userOne = req.params.username;

        if(isNaN(depth)) {
            return next(new apiError('depth should be an Integer.', 400))
        }
        
        if(userOne && depth){
            User.findOne({username: userOne}).then(res => {
                if (res){
                  return res  
                }
                else{
                    throw new apiError('username is not found in database', 400)
               }
            })
            .then(foundUser => {
                Neo4JService.getAllFriends(foundUser.username, depth)
                    .then(result => {
                        if (result.records.length === 0){
                            return res.status(204).send()  
                        }
                        obj = [];
                        result.records.forEach(record=>{
                            record._fields.forEach(key =>{
                                let intern = { name: key.properties.personName, mongoId: key.properties.person_id_mongo};
                                obj.push(intern);
                            });
                        });
                        return res.status(200).send({obj});
                    })
            })
            .catch(ex => {
                return next(ex)
            })
        }
        else{
            return next(new apiError('Missing either persone one or person two.', 400))
        }
    },
    remove(req, res, next) {
        const userOne = req.body.userOne;
        const userTwo = req.body.userTwo;

        if(userOne && userTwo){
            User.findOne({username: userOne})
                .then(result =>{
                    if (result == null){
                        throw new apiError(`${userOne} does not exist`, 400)
                    }
                })
                .then(() => {
                    User.findOne({username: userTwo})
                        .then(result => {
                            if (result == null){
                                throw new apiError(`${userTwo} does not exist`, 400)
                            }
                        })
                })
                .then(() => {
                    Neo4JService.removeFriendship(userOne, userTwo)
                        .then(() => {
                            return res.status(204).send()
                        })
                })
                .catch(ex => {
                    next(ex)
                })
        }
        else{
            return next(new apiError('Missing either persone one or person two.', 400))
        }
    }
}