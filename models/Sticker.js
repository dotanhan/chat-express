var mongoose = require('mongoose');
// var Schema = mongoose.Schema;
var Schema = mongoose.Schema;

var StickerSchema = new Schema({
    script : String,
    img_src : String,
    created : {type: Date, default : Date.now}
},{collection: 'Sticker'});

var Sticker = mongoose.model('Sticker',StickerSchema);





//make this available to our users in our Node applications
module.exports = Sticker;