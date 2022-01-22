const helmet = require("helmet")
const passport = require("passport")
const JWT = require("jsonwebtoken")
const passportJWT = require("passport-jwt")
const DBDriver = require("../db/DBDriver")

let extractJWT = passportJWT.ExtractJwt
let JWTStrategy = passportJWT.Strategy

const secret = process.env.SECRET || "test"

let jwtConfigOptions = {
    // jwtFromRequest: extractJWT.fromBodyField("jwt"),
    jwtFromRequest: extractJWT.fromHeader('jwt'),
    secretOrKey: secret
}

passport.use(new JWTStrategy(jwtConfigOptions, function (payload, next) {
    DBDriver.validateId(payload.id).then((res) => {
        next(null, res)
    }).catch((err) => {
        next(err, false, { authentication: "FAILED" })
    })
}))

module.exports = passport