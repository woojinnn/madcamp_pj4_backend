const mongoose = require("mongoose")
const Schema = mongoose.Schema
mongoose.Promise = global.Promise

let userSchema = new Schema({
    // Auth
    userEmail: {
        type: String,
        unique: true
    },
    userName: {
        type: String,
        unique: true
    },
    password: {
        type: String,
        unique: true
    },

    // Appt
    departure: {
        type: String
    },
    ownedAppts: [{
        type: Schema.Types.ObjectId,
        ref: 'appt',
        default: []
    }],
    participantAppts: [{
        type: Schema.Types.ObjectId,
        ref: 'appt',
        default: []
    }],
    invitedAppts: [{
        type: Schema.Types.ObjectId,
        ref: 'appt',
        default: []
    }],


    // WTM
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