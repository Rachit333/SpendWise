const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  goal: {
    type: Number,
    default: -1 
  } 
});

module.exports = mongoose.model('User', userSchema);
