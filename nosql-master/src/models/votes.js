const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VotesSchema = new Schema({
  value: Number,
  
  user: {
     type: Schema.Types.ObjectId,
     ref: 'users',
    }
});

module.exports = VotesSchema;