var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
	username: {type: String, unique: true, required: true},
	author: {
      id: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User'
      },
   },
	password: String,
	notifications: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Notification'
		}
	],
	followers: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}
	],
	introduce: String,
	avatar: String,
	avatarId: String,
	firstName: String,
	lastName: String,
	email: {type: String, unique: true, required: true},
	resetPasswordToken: String,
	resetPasswordExpires: Date,
	isAdmin: {type: Boolean, default: false}
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);