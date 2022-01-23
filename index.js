// LOAD PACKAGES
const express = require("express")
const bodyParser = require("body-parser")
const helmet = require("helmet")
// const JWT = require("jsonwebtoken")
// const passportJWT = require("passport-jwt")
// const nodemailer = require("nodemailer")

const app = express()

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

app.use("/auth", authRouter)
app.use("/wtm", wtmRouter)
app.use("/user", userRouter)
app.use("/appt", apptRouter)

// RUN SERVER
const server = app.listen(port, function () {
    console.log("Express server has started on port " + port)
});



// // fireabse
// // pushAlarm
// const admin = require("firebase-admin")
// let serviceAccount = require("./firebase-admin.json")
// admin.initializeApp(
//     {
//         credential: admin.credential.cert(serviceAccount),
//     }
// )


// const pushAlarm = async function (req, res) {
//     //디바이스의 토큰 값
//     let deviceToken = `dJwXjQv8S62Il2g-hBUT67:APA91bGI521s_mxPO0ZVzUwh4nPYqOQ10B77Viw6jnpA-2pAo8fvauXPCI8D3ejPWrnlgIiDOM44diubrQIfJkEMs8rxBlJrIbfAoXCCzy6WVxXxupxt0lGDn8uld_M9j8twZE52SVbV`

//     let message = {
//         notification: {
//             title: '테스트 발송💛',
//             body: '망고플레이트 앱 확인해보세요!💚',
//         },
//         token: deviceToken,
//     }
//     admin
//         .messaging()
//         .send(message)
//         .then(function (response) {
//             console.log('Successfully sent message: : ', response)
//             return res.status(200).json({ success: true })
//         })
//         .catch(function (err) {
//             console.log('Error Sending message!!! : ', err)
//             return res.status(400).json({ success: false })
//         });
// }
// app.get("/push", async function (req, res) {
//     //디바이스의 토큰 값
//     let deviceToken = `dJwXjQv8S62Il2g-hBUT67:APA91bGI521s_mxPO0ZVzUwh4nPYqOQ10B77Viw6jnpA-2pAo8fvauXPCI8D3ejPWrnlgIiDOM44diubrQIfJkEMs8rxBlJrIbfAoXCCzy6WVxXxupxt0lGDn8uld_M9j8twZE52SVbV`

//     let message = {
//         notification: {
//             title: '테스트 발송💛',
//             body: '망고플레이트 앱 확인해보세요!💚',
//         },
//         token: deviceToken,
//     }
//     admin
//         .messaging()
//         .send(message)
//         .then(function (response) {
//             console.log('Successfully sent message: : ', response)
//             return res.status(200).json({ success: true })
//         })
//         .catch(function (err) {
//             console.log('Error Sending message!!! : ', err)
//             return res.status(400).json({ success: false })
//         });
// })


// const map = require('./utils/google_map')
// const returnVal = awit map.getRoute(172.1, 10.1, -63.4, 93.5)
// console.log(returnVal)