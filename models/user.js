const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  memberId: {
    type: String
  },
  token: {
    type: String
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User;