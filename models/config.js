const mongoose = require("mongoose");

const LoginSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true    
  },
  email: {
    type: String,
    required: true
  },
  mobile: {
    type: Number,
    required: true
  },
  password: {
    type: String,
    required: true
  }
});

const LoginModel = mongoose.model("Login", LoginSchema);
module.exports=LoginModel;