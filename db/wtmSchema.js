/* WTM: When To Meet */

const mongoose = require("mongoose")
const Schema = mongoose.Schema
mongoose.Promise = global.Promise

const wtmSchema = Schema({
    name: {
        type: String,
        required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    identifier: {
        type: Number,
        unique: true
    },
    dateRange: [Date],
    startTime: String,
    endTime: String,
    invited: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],
    accepted: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],
    rejected: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],
    responses: {
        type: [{
            times: [{
                day: Date,
                timeRange: [String]
            }],
            responder: {
                type: Schema.Types.ObjectId,
                ref: 'User',
            }
        }],
        default: []
    }
})

let meetEvent = mongoose.model('wtm', wtmSchema)
module.exports = meetEvent