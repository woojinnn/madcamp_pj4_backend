const mongoose = require("mongoose")
const Schema = mongoose.Schema
mongoose.Promise = global.Promise

let userSchema = new Schema({
    userEmail: {
        type: String,
        unique: true
    },
    userName: {
        type: String,
        unique: true
    },
    password: String,

    ownedWTMs: [{
        type: Schema.Types.ObjectId,
        ref: 'wtm',
        default: []
    }],
    participantWTMs: [{
        type: Schema.Types.ObjectId,
        ref: 'wtm',
        default: []
    }],
    invitedWTMs: [{
        type: Schema.Types.ObjectId,
        ref: 'wtm',
        default: []
    }],
    
    messages: {
        type: [{
            message: String,
            wtmIdentifier: Number
        }],
        default: []
    }
})

const user = mongoose.model('User', userSchema)
module.exports = user