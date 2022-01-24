const JWT = require("jsonwebtoken")
const passportJWT = require("passport-jwt")
const DBDriver = require("../db/DBDriver")

// Auth
const secret = process.env.SECRET || "test"

const extractJWT = passportJWT.ExtractJwt;
const JWTStrategy = passportJWT.Strategy;

const jwtConfigOptions = {
    jwtFromRequest: extractJWT.fromHeader('jwt'),
    secretOrKey: secret
};

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

    // Gets messages in user's inbox and sends back as string
    router.get('/get-msgs', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.header('jwt')

            let userID
            try {
                const decode = JWT.verify(token, secret)
                const id = decode.id
                if (id === undefined) throw new Error("NO ID")
                userID = id
            } catch (error) {
                res.status(400)
                res.json({ error: "improperly formatted token" })
            }

            const getMessagesPromise = DBDriver.getUserMessages(userID)
            const messagesResult = await getMessagesPromise
            if (messagesResult === null) {
                res.json({ error: "Did not successfully retrieve user's messages" })
            }
            else if (messagesResult === false) {
                res.json({ result: "false" })
            }
            else {
                res.json(messagesResult)
            }
        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })


    // Clears messages in user's inbox
    router.post('/clear-msgs', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.header('jwt')

            let userID
            try {
                const decode = JWT.verify(token, secret)
                const id = decode.id
                if (id === undefined) throw new Error("NO ID")
                userID = id
            } catch (error) {
                res.status(400)
                res.json({ error: "improperly formatted token" })
            }
            const clearMessagesPromise = DBDriver.clearUserMessages(userID)
            const messagesResult = await clearMessagesPromise
            if (messagesResult === null) {
                res.json({ error: "Did not successfully clear user's messages" })
            }
            else if (messagesResult === false) {
                res.json({ result: "false" })
            }
            else {
                console.log("inside successful json object")
                res.json(messagesResult)
            }
        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })

    // Update user departure
    router.post('/departure', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.header('jwt')
            const departure = req.body.departure;

            let userID
            try {
                const decode = JWT.verify(token, secret)
                const id = decode.id
                if (id === undefined) throw new Error("NO ID")
                userID = id
            } catch (error) {
                res.status(400)
                res.json({ error: "improperly formatted token" })
            }


            const updateDeparturePromise = DBDriver.updateDeparture(userID, departure)
            const updateDepartureResult = await updateDeparturePromise

            if (updateDepartureResult === null) {
                res.json({ error: "Did not successfully update departure" })
            }
            else {
                res.json({result: updateDepartureResult})
            }
        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })


    // Get user departure
    router.get('/departure', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.header('jwt')

            let userID
            try {
                const decode = JWT.verify(token, secret)
                const id = decode.id
                if (id === undefined) throw new Error("NO ID")
                userID = id
            } catch (error) {
                res.status(400)
                res.json({ error: "improperly formatted token" })
            }


            const getDeparturePromise = DBDriver.getUserDeparture(userID)
            const getDepartureResult = await getDeparturePromise

            if (getDepartureResult === null) {
                res.json({ error: "Did not successfully update departure" })
            }
            else {
                res.json({coordinates: getDepartureResult})
            }
        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })


    // Gets a user's admin wtms
    router.get('/owner-wtms', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.header('jwt')

            const userId = getIdFromToken(token)
            const resObj = await DBDriver.getOwnerWTMs(userId)
            res.status(200)
            res.json({ wtms: resObj })
        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })

    // Get guest events
    router.get('/guest-wtms', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.header('jwt')

            const userId = getIdFromToken(token)
            const resObj = await DBDriver.getGuestWTMs(userId)

            res.status(200)
            res.json(resObj)
        } catch (error) {
            res.status(500)
            console.log(error.message)
            res.json({ error: error.message })
        }
    })


    // Gets a user's admin appts
    router.get('/owner-appts', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.header('jwt')

            const userId = getIdFromToken(token)
            const resObj = await DBDriver.getOwnerAppts(userId)
            res.status(200)
            res.json({ appts: resObj })
        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })

    // Get guest appts
    router.get('/guest-appts', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.header('jwt')

            const userId = getIdFromToken(token)
            const resObj = await DBDriver.getGuestAppts(userId)

            res.status(200)
            res.json(resObj)
        } catch (error) {
            res.status(500)
            console.log(error.message)
            res.json({ error: error.message })
        }
    })

    return router
}