const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Votes = require('./votes') 

const CommentSchema = new Schema({
    
    //username: {type: String, required: [true, 'username is required.']},
    //because we want to delete users and keep there referenced items.
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        default: null
    },


    content: {type: String,  required: [true, 'content is required.'] },
    votes: [Votes],

    parentComment: {
        type: Schema.Types.ObjectId,
        ref: 'comments',
        default: null
    }
}, {
    toJSON: { virtuals: true },
    id: false
});

CommentSchema.virtual('upvotes').get(function(){
    return this.votes.filter(getUpvotes).length;
})

CommentSchema.virtual('downvotes').get(function(){
    return this.votes.filter(getDownvotes).length;
})

function getUpvotes(vote){
    return vote.value === 1;
}

function getDownvotes(vote){
    return vote.value === -1;
}

const Comments = mongoose.model('comments', CommentSchema);


module.exports = Comments;