const JWT = require("jsonwebtoken")
const passportJWT = require("passport-jwt")
const nodemailer = require("nodemailer")
const DBDriver = require("../db/DBDriver")

// Auth
const secret = process.env.SECRET || "test"

const extractJWT = passportJWT.ExtractJwt;
const JWTStrategy = passportJWT.Strategy;

const jwtConfigOptions = {
    jwtFromRequest: extractJWT.fromBodyField("jwt"),
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
     * WTM CREATION AND MODIFICATION
     */
    // Create a new wtm and save it to the database
    router.post("/create", passport.authenticate('jwt', { session: false }), async (req, res) => {
        const wtmName = req.body.wtmName
        const token = req.body.jwt
        let dateRange = req.body.dateRange
        let startTime = req.body.startTime
        let endTime = req.body.endTime
        let invitedUsers = req.body.invitedUsers
        if (wtmName === undefined || token === undefined || startTime === undefined || endTime === undefined) {
            res.status(401);
            res.json({ error: "insufficient arguments sent" });
        }

        let ownerUser
        try {
            let decode = JWT.verify(token, secret)
            let id = decode.id
            if (id === undefined) throw new Error("NO ID")
            ownerUser = (await DBDriver.getUserFromId(id)).userName
            if (ownerUser === undefined || ownerUser === null) throw new Error("BAD ID")
        } catch (error) {
            res.status(402)
            res.json({ error: "improperly formatted token" })
        }

        let dateArray = []
        try {
            if (dateRange === undefined || !Array.isArray(dateRange)) {
                res.status(403)
                res.json({ error: "improper date format4" })
            }
            else {
                dateRange.forEach(element => {
                    if (Date.parse(element) < Date.now - 86400000) {
                        res.status(404)
                        res.json({ error: "improper date format2" })
                    }
                    dateArray.push(Date.parse(element))
                });
            }
        } catch (error) {
            res.status(405)
            res.json({ error: "improper date format1" })
        }

        try {
            let result = await DBDriver.createWTM(
                wtmName, ownerUser, dateArray, startTime, endTime, invitedUsers
            )
            ownerName = await DBDriver.getUserFromId(result.owner)
            res.status(201)
            res.json({
                wtmName: result.name,
                wtmOwner: ownerName.userName,
                wtmId: result.identifier,
            })
        } catch (error) {
            console.log(error)
            res.status(500)
            res.json({ error: "error on wtm creation" })
        }
    })




    /**
     * CREATED WTM INTERACTIONS
     */
    // Gets users for an wtm
    router.post('/users', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const wtmId = req.body.wtmId
            if (wtmId === undefined) {
                res.status(400)
                res.send("ERROR: WTM ID REQUIRED")
            }
            const users = await DBDriver.getUsers(wtmId)
            res.status(200)
            if (users === null) {
                res.json({ error: "NOT FOUND" })
            }
            else {
                users.error = null
                res.json(users)
            }
        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })

    // Accept the user's responses for an wtm
    router.post('/respond', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.body.jwt
            let times = req.body.times
            const wtmId = req.body.wtmId
            if (wtmId === undefined || token === undefined || times === undefined) {
                res.status(401)
                res.json({ error: "insufficient arguments sent" })
            }

            const userId = getIdFromToken(token)
            try {
                if (times === undefined || !Array.isArray(times)) {
                    res.status(403)
                    res.json({ error: "improper date format4" })
                } else {
                    const result = await DBDriver.addResponses(wtmId, userId, times)

                    res.status(200)
                    res.json({ wtm: result.responses, error: "false" })
                }
            } catch (error) {
                res.status(405)
                res.json({ error: error.message })
                console.log(error)
            }
        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
            console.log(error)
        }
    })

    // Retrieve the information associated with a given wtmID
    router.post('/info', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.body.jwt
            const wtmId = req.body.wtmId
            if (wtmId === undefined) {
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

            let wtm = await DBDriver.retrieveWTM(wtmId, userId)
            if (wtm === null) {
                res.status(200)
                res.json({ error: "no such wtm" })
            }
            else {
                wtm.isOwner = (wtm.owner._id === userId)
                wtm.error = "none"
                res.status(200)
                res.json(wtm)
            }
        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })

    // Invites a user to the specified wtm
    router.post('/invite', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const wtmId = req.body.wtmId
            const token = req.body.jwt
            if (wtmId === undefined) {
                res.status(400)
                res.json({ error: "ERROR: WTM ID REQUIRED" })
            }
            let userId
            try {
                userId = getIdFromToken(token)
            } catch (error) {
                res.status(400)
                res.json({ error: "improperly formatted token" })
            }

            let invited = req.body.invitedUserNames
            if (invited === undefined) {
                res.status(400)
                res.json({ error: "no users invited" })
            }
            let promiseArray = []
            invited.forEach((element) => {
                let invitePromise = DBDriver.inviteUser(wtmId, userId, element)
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
        } catch (error) {
            console.log(error)
            res.status(500);
            res.json({ error: error.message });
        }
    })


    // Invite someone without an account (non-user)
    // to join the app by sending them an email
    // Uses nodeMailer API
    /*
    router.post('/inviteNonUser', passport.authenticate('jwt', { session: false }), async (req, res) => {
        let token = req.body.jwt;

        try {
            let decode = JWT.verify(token, secret);
            let id = decode.id;
            if (id === undefined) throw new Error("NO ID");
        } catch (error) {
            res.status(400);
            res.json({ error: "improperly formatted token" });
        }
        let email = req.body.email;

        // Generate test SMTP service account from ethereal.email
        // Only needed if you don't have a real mail account for testing
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'when2meetmobile@gmail.com',
                pass: 'cis350g7'
            }
        });

        var mailOptions = {
            from: 'when2meetmobile@gmail.com',
            to: email,
            subject: 'You have been invited to when2meet mobile!',
            text: 'Your friend has invited you to an event on when2meet mobile, download now!'
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                res.status(200);
                res.send('false');
            } else {
                console.log('Email sent: ' + info.response);
                res.status(200);
                res.send('true');
            }
        });
    })
    */


    // Removes a guest from the wtm
    router.post('/removeGuest', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.body.jwt
            const wtmID = req.body.wtmId

            let userID
            try {
                userID = getIdFromToken(token)
            } catch (error) {
                res.status(400)
                res.json({ error: "improperly formatted token" })
            }

            const removePromise = DBDriver.removeGuest(wtmID, userID)
            const removeResult = await removePromise
            if (removeResult === null) {
                res.json({ error: "Guest not successfully removed" })
            }
            if (removeResult === "already left") {
                res.json({ error: "Guest already left" })
            }
            else {
                res.json({ error: "none" })
            }
        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })


    // Accept an invite to an wtm
    router.post('/accept', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.body.jwt
            const wtmID = req.body.wtmId

            let userID
            try {
                userID = getIdFromToken(token)
            } catch (error) {
                res.status(400)
                res.json({ error: "improperly formatted token" })
            }

            const acceptInvitePromise = DBDriver.addGuest(wtmID, userID)
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

    // Reject an invite to an wtm
    router.post('/reject', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const wtmId = req.body.wtmId
            const token = req.body.jwt

            let userId
            try {
                userId = getIdFromToken(token)
            } catch (error) {
                res.status(400)
                res.json({ error: "improperly formatted token" })
            }

            const declineInvitePromise = DBDriver.declineInvite(wtmId, userId)
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

    // Allows an owner to delete an wtm
    router.post('/delete', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.body.jwt
            const wtmID = req.body.wtmId

            const userID = getIdFromToken(token)
            await DBDriver.deleteWTM(wtmID, userID)
            res.status(200)
            res.json({ result: 'success' })
        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })

    // Reminds users to respond to wtm invite
    router.post('/remind-users', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            const token = req.body.jwt
            const wtmId = req.body.wtmId

            const userId = getIdFromToken(token)
            const result = await DBDriver.remindUsers(userId, wtmId)
            if (result == "Success") {
                res.send("Success")
            }
            else {
                res.send("Failure")
            }
        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })


    return router

}