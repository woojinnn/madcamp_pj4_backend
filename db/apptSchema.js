const mongoose = require("mongoose")
const Schema = mongoose.Schema
mongoose.Promise = global.Promise

let apptSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
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
    destination: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: {
            type: [Number],
        }
    },
    invited: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],
    accepted: {
        type: [{
            member: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            departure: {
                type: {
                    type: String,
                    default: 'Point'
                },
                coordinates: {
                    type: [Number],
                }
            }
        }],
        default: []
    },
    rejected: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }]
})

const appt = mongoose.model('Appt', apptSchema)
module.exports = appt