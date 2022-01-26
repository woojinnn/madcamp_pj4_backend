const JWT = require("jsonwebtoken")
const passportJWT = require("passport-jwt")
const DBDriver = require("../db/DBDriver")
const map = require('../utils/google_map')
const schedule = require('node-schedule');

// Auth
const secret = process.env.SECRET || "test"

const extractJWT = passportJWT.ExtractJwt;
const JWTStrategy = passportJWT.Strategy;

const jwtConfigOptions = {
    jwtFromRequest: extractJWT.fromHeader('jwt'),
    secretOrKey: secret
};

// fireabse
// pushAlarm
const admin = require("firebase-admin")
let serviceAccount = require("../firebase-admin.json")
admin.initializeApp(
    {
        credential: admin.credential.cert(serviceAccount),
    }
)


/**
 * Helper functions 
 */
// Gets ID from token of corresponding user
function getIdFromToken(token) {
    let decode = JWT.verify(token, secret);
    let id = decode.id;
    if (id === undefined) throw new Error("NO ID");
    return id;
}

module.exports = function (passport) {
    const express = require("express")
    const router = express.Router()

    router.get('/get-coordinate', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const address = req.query.address

            const latlng = await map.getLatLong(address)
            if (latlng === undefined || latlng === null) {
                res.status(200)
                return res.json({ error: "cannot find coordinates" })
            }

            const lat = latlng.lat
            const lng = latlng.lng
            res.status(200)

            return res.json({
                latitude: lat,
                longitutde: lng
            })
        }
        catch (error) {
            res.status(500)
            console.log(error.message)
            res.json({ error: error.message })
        }
    })

    router.post('/set-alarm', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const departure = req.body.departure
            const destination = req.body.destination
            const deviceToken = req.body.deviceToken
            const time = req.body.time + ":00.000+09:00"    // YYYY-MM-DDTHH:MM:SS.SSS+09:00 format
            console.log(time)

            if (departure === undefined || destination === undefined
                || deviceToken === undefined || time === undefined) {
                res.status(400)
                res.json({ result: false })
            }
            const date = new Date(time)
            const deptLatLng = await map.getLatLong(departure)
            const deptLat = deptLatLng.lat
            const deptLng = deptLatLng.lng

            const destLatLng = await map.getLatLong(destination)
            const destLat = destLatLng.lat
            const destLng = destLatLng.lng

            const route = await map.getRoute(deptLat, deptLng, destLat, destLng)
            const seconds = route.rows[0].elements[0].duration.value
            const departureTime = new Date(date - seconds * 1000)

            console.log(date)
            console.log(departureTime)

            let message = {
                notification: {
                    title: '테스트 발송💛',
                    body: '망고플레이트 앱 확인해보세요!💚',
                },
                token: deviceToken,
            }

            // const job = schedule.scheduleJob(departureTime, () => {
            //     admin
            //         .messaging()
            //         .send(message)
            //         .then(function (response) {
            //             console.log('Successfully sent message: : ', response)
            //         })
            //         .catch(function (err) {
            //             console.log('Error Sending message!!! : ', err)
            //         })
            // })
            // return res.status(200).json({result: true, time: departureTime.toString()})
            return res.status(200)
        }
        catch (error) {
            res.status(500)
            console.log(error.message)
            res.json({ error: error.message })
        }
    })

    return router
}