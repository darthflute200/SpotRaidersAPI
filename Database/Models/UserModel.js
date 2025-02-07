const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const userSchema = new mongoose.Schema({
    email: {
      type: String,
      required: true,
      unique: true,
    },
    namesurname: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    hotelid:{
      type: String,
    },
    usertickets:{
      type: [String],
    },
    userrole : {
        type: Number,
        required: true
    }
    ,
    createdAt: {
      type: Date,
      default: Date.now,
    }
  });
  userSchema.pre('save', async function (next) {
    const user = this;
    
    if (!user.isModified('password')) return next();
    
    try {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
      next();
    } catch (err) {
      next(err);
    }
  });
  
  const User = mongoose.model('User', userSchema);
  module.exports = User