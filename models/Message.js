var mongoose = require('mongoose');
// var Schema = mongoose.Schema;
var Schema = mongoose.Schema;

var Conversation = require('./Conversation.js');
var Sticker = require('./Sticker.js');

var MessagesSchema = new Schema({
    message : String,
    attachment_thumb_src : String,
    attachment_src : String,
    user_id : Number,
    user_name : String,
    avatar : String,
    conversation_id : {
        type : Schema.Types.ObjectId,
        ref : 'Conversation'},
    sticker_id : {
        type : Schema.Types.ObjectId,
        ref : 'Sticker'},
    is_active : {type : Boolean, default: true},
    is_delete : {type : Boolean, default: false},
    type : String,
    created : {type: Date, default : Date.now}
},{collection: 'Messages'});

var Messages = mongoose.model('Messages',MessagesSchema);

Messages.prototype.find = function(cond, callback){
    Messages.find(cond).exec(function (err, data) {
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

Messages.prototype.findOne = function(cond, callback){
    Messages.findOne(cond).sort({created : -1}).exec(function (err, data) {
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

Messages.prototype.getLastMessage = function(cond,user_id, callback){
    Messages.findOne(cond).sort({created : -1}).exec(function (err, data) {
        if (err) {
            var resp = {
                result: "FAILED",
                message: "SERVER_ERR"
            }
            callback(resp);
        } else {
            var resp = {
                result: "OK",
                data: data,
                user_id : user_id
            }
            callback(resp);
        }
    });
}



Messages.prototype.insert = function (data, resp_func) {
    var message = new Messages(data);
    message.save(function (err, data) {
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
module.exports = Messages;