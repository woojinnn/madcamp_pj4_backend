const JWT = require("jsonwebtoken")
const passportJWT = require("passport-jwt")
const nodemailer = require("nodemailer")
const DBDriver = require("../db/DBDriver")
const { retrieveAppt } = require("../db/DBDriver")

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

    /**
     * Appointment CREATION AND MODIFICATION
     */

    // Create a new appt and save it to the database
    router.post("/create", passport.authenticate('jwt', { session: false }), async (req, res) => {
        const token = req.header('jwt')
        const apptName = req.body.apptName
        let apptStartTime = req.body.apptStartTime
        let apptEndTime = req.body.apptEndTime
        let apptDest = req.body.apptDest

        let userID
        try {
            userID = getIdFromToken(token)
        } catch (error) {
            res.status(400)
            return res.json({ error: "improperly formatted token" })
        }

        if (apptName === undefined || apptStartTime === undefined || apptDest === undefined) {
            res.status(400)
            return res.json({ error: "insufficient arguments sent" })
        }

        try {
            if (Date.parse(apptStartTime) < Date.now - 86400000) {
                res.status(400)
                return res.json({ error: "improper start time format" })
            }
            apptStartTime = Date.parse(apptStartTime)
        }
        catch (error) {
            res.status(400)
            return res.json({ error: "improper start time format" })
        }

        if (apptEndTime !== undefined) {
            try {
                apptEndTime = Date.parse(apptEndTime)
                if (apptStartTime > apptEndTime) {
                    res.status(400)
                    return res.json({ error: "start time is later than end time" })
                }
            }
            catch (error) {
                res.status(400)
                return res.json({ error: "improper end time format" })
            }
        }

        try {
            if (apptDest === undefined) {
                res.status(400)
                return res.json({
                    error: "improper location format"
                })
            }
        }
        catch (error) {
            res.json(400)
            return res.json({ error: "improper location format" })
        }

        try {
            let result = await DBDriver.createAppt(
                apptName, apptStartTime, apptEndTime, apptDest, userID
            )
            res.status(201)
            return res.json({
                apptName: result.name,
                apptStartTime: result.apptStartTime,
                apptEndTime: result.apptEndTime,
                destination: result.destination,
                apptIdentifier: result.identifier
            })
        } catch (error) {
            console.log(error)
            res.status(500)
            return res.json({ error: "error on appt creation" })
        }
    })

    // get member's name related to appointment
    router.get('/members', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const apptId = req.query.apptId
            if (apptId === undefined) {
                res.status(400)
                res.send("ERROR: apptId required")
            }
            const members = await DBDriver.getApptUsers(apptId)
            res.status(200)
            if (members === null) {
                res.json({ error: "NOT FOUND" })
            }
            else {
                res.json(members)
            }
        }
        catch (error) {
            console.log(error)
            res.status(500)
            res.json({ error: error.message })
        }
    })

    // Retrieve the information associated with a given apptID
    router.get('/info', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.header('jwt')
            const apptId = req.query.apptId
            if (apptId === undefined) {
                res.status(400)
                res.json({ error: "ERROR: WTM ID REQUIRED" })
            }

            let userId
            try {
                const decode = JWT.verify(token, secret)
                const id = decode.id
                if (id === undefined) throw new Error("NO ID")
                userId = id
            } catch (error) {
                res.status(400)
                res.json({ error: "improperly formatted token" })
            }

            let appt = await DBDriver.retrieveAppt(apptId)
            if (appt === null) {
                res.status(200)
                res.json({ error: "no such appt" })
            }
            else {
                appt.error = "none"
                res.status(200)
                res.json(appt)
            }
        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })

    // Allows an owner to delete an appt
    router.delete('/delete', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.header('jwt')
            const apptID = req.query.apptId

            const userID = getIdFromToken(token)
            await DBDriver.deleteAppt(apptID, userID)
            res.status(200)
            res.json({ result: 'success' })
        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })

    // Invites a user to a specified appt
    router.post('/invite', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const apptId = req.body.apptId
            console.log(apptId)
            const token = req.header('jwt')
            if (apptId === undefined) {
                res.status(400)
                res.json({ error: "ERROR: apptId required" })
            }
            let userId
            try {
                userId = getIdFromToken(token)
            } catch (error) {
                res.status(400)
                return res.json({
                    error: "improperly formatted token"
                })
            }

            let invited = req.body.invitingUserNames
            if (invited === undefined) {
                res.status(400)
                return res.json({ error: "no users invited" })
            }
            let promiseArray = []
            invited.forEach((element) => {
                let invitePromise = DBDriver.inviteApptUser(apptId, userId, element)
                promiseArray.push(invitePromise)
            })
            for (let i = 0; i < promiseArray.length; i++) {
                promiseArray[i] = await promiseArray[i]
            }

            // Check error
            const baseErrorString = "errors with names: "
            let errorString = "errors with names: "
            for (let i = 0; i < promiseArray.length; i++) {
                if (promiseArray[i] === null || !promiseArray[i]) {
                    errorString += invited[i]
                }
            }

            res.status(200)
            if (baseErrorString === errorString) {
                res.json({ names: invited, error: "none" })
            }
            else {
                res.json({ names: invited, error: errorString })
            }
        }
        catch (error) {
            console.log(error)
            res.status(500)
            res.json({ error: error.message })
        }
    })

    // Accept an invite to an appt
    router.post('/accept', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.header('jwt')
            const apptID = req.body.apptId

            let userID
            try {
                userID = getIdFromToken(token)
            } catch (error) {
                res.status(400)
                res.json({ error: "improperly formatted token" })
            }

            const acceptInvitePromise = DBDriver.addApptGuest(apptID, userID)
            const acceptResult = await acceptInvitePromise
            if (acceptResult == null) {
                res.json({ error: "Guest did not successfully accept invitation" })
            }
            else {
                res.json({ error: "none" })
            }
        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })


    // Reject an invite to an appt
    router.post('/reject', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const apptId = req.body.apptId
            const token = req.header('jwt')

            let userId
            try {
                userId = getIdFromToken(token)
            } catch (error) {
                res.status(400)
                res.json({ error: "improperly formatted token" })
            }

            const declineInvitePromise = DBDriver.declineApptInvite(apptId, userId)
            const declineResult = await declineInvitePromise
            if (declineResult === null) {
                res.json({ error: "Guest did not successfully decline invitation" })
            }
            else {
                res.json({ error: "none" })
            }

        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })


    // edit an invite to an appt
    router.put('/edit', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.header('jwt')
            const apptIdentifier = req.query.apptId

            const apptName = req.body.apptName
            let apptStartTime = req.body.apptStartTime
            let apptEndTime = req.body.apptEndTime
            let apptDest = req.body.apptDest

            let userID
            try {
                userID = getIdFromToken(token)
            } catch (error) {
                res.status(400)
                return res.json({ error: "improperly formatted token" })
            }

            if (apptName === undefined || apptStartTime === undefined || apptDest === undefined) {
                res.status(400)
                return res.json({ error: "insufficient arguments sent" })
            }

            try {
                if (Date.parse(apptStartTime) < Date.now - 86400000) {
                    res.status(400)
                    return res.json({ error: "improper start time format" })
                }
                apptStartTime = Date.parse(apptStartTime)
            }
            catch (error) {
                res.status(400)
                return res.json({ error: "improper start time format" })
            }

            if (apptEndTime !== undefined) {
                try {
                    apptEndTime = Date.parse(apptEndTime)
                    if (apptStartTime > apptEndTime) {
                        res.status(400)
                        return res.json({ error: "start time is later than end time" })
                    }
                }
                catch (error) {
                    res.status(400)
                    return res.json({ error: "improper end time format" })
                }
            }

            try {
                if (apptDest === undefined) {
                    res.status(400)
                    return res.json({ result: false })
                }
            }
            catch (error) {
                res.status(400)
                return res.json({ result: false })
            }

            try {
                let result = await DBDriver.modifyAppt(
                    apptName, apptStartTime, apptEndTime, apptDest, userID, apptIdentifier
                )
                if (result === null) {
                    return res.status(400).json({ result: false })
                }
                res.status(201)
                return res.json({ result: true })
            } catch (error) {
                console.log(error)
                res.status(500)
                return res.json({ result: false })
            }

        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })

    return router

}