const mongoose = require("mongoose")
const Schema = mongoose.Schema
mongoose.Promise = global.Promise

let apptSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    time: {
        type: Date,
        required: true
    },
    destination: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    },
    members: {
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
                    default: [0, 0]
                }
            }
        }],
        default: []
    }
})

const appt = mongoose.model('Appt', apptSchema)
module.exports = appt