var mongoose = require('mongoose');
// var Schema = mongoose.Schema;
var Schema = mongoose.Schema;
//include Model
var Conversation = require('./Conversation.js');

var UserJoinConversationSchema = new Schema({
    user_id : Number,
    conversation_id : {
        type : Schema.Types.ObjectId,
        ref : 'Conversation'
    },
    name : String,
    created : {type: Date, default : Date.now}
},{collection : 'UserJoinConversation'});

var UserJoinConversation= mongoose.model('UserJoinConversation',UserJoinConversationSchema);


UserJoinConversation.prototype.find = function(cond, callback){
    UserJoinConversation.find(cond).exec(function (err, data) {
        if (err) {
            var resp = {
                result: "FAILED",
                message: "SERVER_ERR"
            }
            callback(resp);
        } else {
            var resp = {
                result: "OK",
                data: data
            }
            callback(resp);
        }
    });
}

UserJoinConversation.prototype.findOne = function(cond, callback){
    UserJoinConversation.findOne(cond).exec(function (err, data) {
        if (err) {
            var resp = {
                result: "FAILED",
                message: "SERVER_ERR"
            }
            callback(resp);
        } else {
            var resp = {
                result: "OK",
                data: data
            }
            callback(resp);
        }
    });
}


UserJoinConversation.prototype.insert = function (data, resp_func) {
    UserJoinConversation.create(data, function (err, data) {
        if (err) {
            var resp = {
                result: "FAILED",
                message: "SERVER_ERR"
            }
            resp_func(resp);
        } else {
            var resp = {
                result: "OK",
                data: data
            }
            resp_func(resp);
        }
    });
}






//make this available to our users in our Node applications
module.exports = UserJoinConversation;