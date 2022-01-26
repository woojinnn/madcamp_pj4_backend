const DBDriver = require("../db/DBDriver")
const JWT = require("jsonwebtoken")
const passportJWT = require("passport-jwt")

// Auth
const secret = process.env.SECRET || "test"

const extractJWT = passportJWT.ExtractJwt;
const JWTStrategy = passportJWT.Strategy;

const jwtConfigOptions = {
    jwtFromRequest: extractJWT.fromHeader('jwt'),
    secretOrKey: secret
};

module.exports = function (passport) {
    const express = require("express")
    const router = express.Router()

    /**
     * USER CREATION AND INITIAL VALIDATION
     */

    // Check if a username has been used
    router.get('/userNameExists', async function (req, res) {
        try {
            if (req.query.username === '') {
                res.status(200)
                res.json({ result: 'empty query' })
            } else if (await DBDriver.userNameExists(req.query.username)) {
                // userName exists
                res.status(200)
                res.json({ result: true })
            } else {
                // userName doesn't exist
                res.status(200)
                res.json({ result: false })
            }
        } catch (error) {
            res.status(500)
            res.send(error)
        }
    })

    // Check if a username has been used
    router.get('/userEmailExists', async function (req, res) {
        try {
            if (req.query.userEmail === '') {
                res.status(200)
                res.json({ result: 'empty query' })
            } else if (await DBDriver.userEmailExists(req.query.userEmail)) {
                // userName exists
                res.status(200)
                res.json({ result: true })
            } else {
                // userName doesn't exist
                res.status(200)
                res.json({ result: false })
            }
        } catch (error) {
            res.status(500)
            res.send(error)
        }
    })

    // Sign-up
    router.post('/sign-up', async function (req, res) {
        try {
            let user = await DBDriver.createUser(
                req.body.userEmail,
                req.body.userName,
                req.body.password,
            )
            let payload = { id: user._id }
            let token = JWT.sign(payload, jwtConfigOptions.secretOrKey)
            res.status(200)
            res.json({ message: "ok", token: token })
        } catch (error) {
            console.log(error)
            res.status(500)
            res.send(error)
        }
    })

    // reset Password
    router.post('/reset-password', passport.authenticate('jwt', { session: false }), async function (req, res) {
        const token = req.header('jwt')
        const newPassword = req.body.newPassword
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

        try {
            const returnVal = await DBDriver.resetPassword(userId, newPassword)
            res.status(200)
            res.json({result: returnVal})
        }
        catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })


    // Sign-in
    router.post('/sign-in', async function (req, res) {
        try {
            const userEmail = req.body.userEmail
            const password = req.body.password
            let id = await DBDriver.authenticate(userEmail, password)
            if (id) {
                const payload = { id: id }
                const token = JWT.sign(payload, jwtConfigOptions.secretOrKey)
                const user = await DBDriver.getUserFromId(id)
                let dept
                if (user.departure === null || user.departure === undefined) {
                    dept = ""
                } else dept = user.departure
                res.status(200)
                res.json({
                    message: "ok",
                    token: token,
                    name: user.userName,
                    departure: dept
                })
            } else {
                res.status(200)
                res.send('no user found')
            }
        } catch (error) {
            res.status(500)
            res.json({ error: error.message })
        }
    })

    return router
}