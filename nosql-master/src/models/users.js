const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: {
        type: String, required: [true, 'username is required.'],
        unique: [true, 'username already exists.'],
        validate: {
            validator: (username) => {
                return username.trim().length > 0;
            },
            message: 'A username must not be empty'
        }
    },
    password: {type: String,  required: [true, 'password is required.'] },
    active: { type: Boolean, default: true }
});

const Users = mongoose.model('users', UserSchema);

module.exports = Users;