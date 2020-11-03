const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Votes = require('./votes') 

const ThreadSchema = new Schema({
    username: {type: String, required: [true, 'username is required.'] },
    
    title: {type: String,  required: [true, 'title is required.'] },
    content: {type: String,  required: [true, 'content is required.'] },
    
    votes: [Votes],
    comments: [{
        type: Schema.Types.ObjectId,
        ref: 'comments',
    }]
}, {
    toJSON: { virtuals: true },
    id: false
});

ThreadSchema.virtual('upvotes').get(function(){
    return this.votes.filter(getUpvotes).length;
})

ThreadSchema.virtual('downvotes').get(function(){
    return this.votes.filter(getDownvotes).length;
})

ThreadSchema.pre('remove', function(next) {
    const Comment = mongoose.model('comments');
    
    Comment.deleteMany({ _id: { $in: this.comments } })
        .then(() => next());
});

function getUpvotes(vote){
    return vote.value === 1;
}

function getDownvotes(vote){
    return vote.value === -1;
}

const Threads = mongoose.model('threads', ThreadSchema);


module.exports = Threads;