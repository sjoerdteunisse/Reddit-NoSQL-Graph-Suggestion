const apiError = require('../models/apierror');
const User = require('../models/users');
const Neo4JConnector = require('../services/neo4j_connector');
const Neo4JService = require('../services/neo4j_service');

module.exports = {
    register(req, res, next) {
        if (req.body.username && req.body.password) {
            const user = new User(req.body);

            if(user.username.indexOf(' ') >= 0){
                return next(new apiError('Username cannot contain spaces', 400));
            }

            if(req.body.password.length < 6) {
                return next(new apiError('Password length to short', '422'));
            }
            
            user.save()
                .then(()=> {
                    User.findOne({username: user.username })
                        .then((user)=>{
                            Neo4JService.addFriend(user.username)
                                .then(() => { 
                                    return res.status(200).send({id: user._id})
                                })
                        }); 
                }).catch((err)=>{
                    return next(new apiError(err.errmsg, 400))
                });
        } else{
            //+ Object.keys(new User()).toString()
            return next(new apiError('Please fill in all fields', 400))
        }
    },
    update(req, res, next) {
        const newPassword = req.body.password;
        const currentPassword = req.body.currentPassword;

        //Only update password
        if (newPassword && currentPassword) {
            const requestedUser = req.params.username;

            User.findOne({username: requestedUser})
                .then((user)=>{
                    
                    if(user == null || user == undefined)
                        return res.status(204).send();

                    if(user.password !== currentPassword) {
                        return next(new apiError('Password inccorect', 401))
                    }

                    user.password = newPassword;
                    user.save()
                        .then(()=>{
                            return res.status(200).send({id: user._id})
                        });
                });
        } else{
            //+ Object.keys(new User()).toString()
            return next(new apiError('Please fill in all fields', 400))
        }
    },
    delete(req, res, next) {
        const password = req.body.password;
        const username = req.params.username;

        User.findOne({username: username}).then((found)=>{
            if(found === null)
                return res.status(204).send();

            if(found.password !== password  || found.username !== username) {
                return next(new apiError('Invalid credentials', 401))
            }
           
            Neo4JService.deleteFriend(found.username)
                .then(() => {
                    User.updateOne({_id: found._id}, {active: false})
                    .then(()=> {
                        return res.status(204).send()
                    });
                }).catch(ex => {
                    console.warn(ex)
                });
        });
    }
}