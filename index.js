// LOAD PACKAGES
const express = require("express")
const bodyParser = require("body-parser")
const helmet = require("helmet")
const http = require('http')
// const JWT = require("jsonwebtoken")
// const passportJWT = require("passport-jwt")
// const nodemailer = require("nodemailer")
const socketio = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketio(server)

// CONFIGURE: PORT, SECRET
const port = process.env.PORT || 80

// CONFIGURE: BODYPARSER
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// CONFIGURE: PASSPORT
const passport = require("./utils/passport")
app.use(passport.initialize())
app.use(helmet())

// CONFIGURE: ROUTER
const authRouter = require("./routes/auth_api")(passport)
const wtmRouter = require("./routes/wtm_api")(passport)
const userRouter = require("./routes/user_api")(passport)
const apptRouter = require("./routes/appt_api")(passport)
const mapRouter = require("./routes/map_api")(passport)

app.use("/auth", authRouter)
app.use("/wtm", wtmRouter)
app.use("/user", userRouter)
app.use("/appt", apptRouter)
app.use("/map", mapRouter)


// RUN SERVER
server.listen(port, function () {
    console.log("Express server has started on port " + port)
});