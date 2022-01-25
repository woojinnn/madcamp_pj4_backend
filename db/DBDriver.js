/*
DBDriver is the class that contains all methods which access and
update information in the database.
*/
const user = require("./userSchema")
const wtm = require("./wtmSchema")
const appt = require("./apptSchema")

const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const { exists } = require("./userSchema")

mongoose.Promise = global.Promise;
const MONGO_URI = "mongodb://localhost/week4_0"

// Program is DB dependent.
// Should exit if connection fails
const connect_db = () => {
    if (process.env.NODE_ENV !== 'production') {
        mongoose.set('debug', true)
    }

    const mongodb_uri = 'mongodb://localhost/week4_0'
    mongoose.connect(mongodb_uri)
        .then(() => console.log("Succeed to connect MongoDB"))
        .catch(err => {
            console.log('Failed to connect MongoDB', err)
            process.exit(1)
        })
}
const db = mongoose.connection
db.on('error', (error) => {
    console.error('Error while connecting MongoDB', error)
})
db.on('disconnected', () => {
    console.error('Disconnected from MongoDB. Reconnect')
    connect_db()
})
connect_db()


class DBDriver {
    // ** USER ACCOUNT INTERACTIONS **
    /**
     * Checks if username is already taken
     * @param {String} targetName - desired username
     * @return {Promise<Boolean>}
     */
    static async userNameExists(targetName) {
        try {
            let me = await user.findOne({ userName: targetName })
            return me !== null  // false if query is unique
        }
        catch (error) {
            console.log(error)
            throw new Error("Error on username search")
        }
    }

    /**
         * Checks if userEmail is already taken
         * @param {String} targetEmail - desired userEmail
         * @return {Promise<Boolean>}
         */
    static async userEmailExists(targetEmail) {
        try {
            let me = await user.findOne({ userEmail: targetEmail })
            return me !== null
        }
        catch (error) {
            console.log(error)
            throw new Error("Error on username search")
        }
    }

    /**
     * Validates ID
     * @param {MongoID} jwtId 
     * @return {Promise<Boolean>}
     */
    static async validateId(jwtId) {
        try {
            return ((await user.findById(jwtId)) !== null)
        }
        catch (error) {
            console.log(error)
            throw new Error("Error on jwt auth")
        }
    }

    /**
     * get User Object from Id
     * @param {MongoID} Id
     * @return {UserModel}
     */
    static async getUserFromId(Id) {
        try {
            return ((await user.findById(Id)))
        } catch (error) {
            console.log(error)
            throw new Error("Error on user retrieval")
        }
    }

    /**
     * Authenticates user
     * @param {String} userEmail 
     * @param {String} password 
     * @return {MongoID}
     */
    static async authenticate(userEmail, password) {
        try {
            let targetUser = await user.findOne({ userEmail: userEmail })
            if (targetUser === null) return null
            let works = await bcrypt.compare(password, targetUser.password)
            if (!works) return false
            else return targetUser._id
        } catch (error) {
            console.log(error)
            throw new Error("Error on userEmail search")
        }
    }

    /**
     * Creates a new user for sign-up
     * @param {String} userEmail 
     * @param {String} userName 
     * @param {String} password 
     * @return {UserModels} 
     */
    static async createUser(userEmail, userName, password) {
        try {
            const salt = await bcrypt.genSalt()
            const hashPromise = bcrypt.hash(password, salt)

            let newUser = new user()
            newUser.userEmail = userEmail
            newUser.userName = userName
            newUser.password = await hashPromise

            return newUser.save()
        } catch (error) {
            console.log(error)
            throw new Error("Error on user creation")
        }
    }

    /**
     * Resets password for user with a new user-given one
     * @param {MongoID} userID 
     * @param {String} newPassword
     * @return {Boolean} 
     */
    static async resetPassword(userID, newPassword) {
        try {
            const saltPromise = bcrypt.genSalt()
            const result = await user.findByIdAndUpdate(
                userID,
                { password: await bcrypt.hash(newPassword, await saltPromise) }
            )
            return result !== null
        }
        catch (error) {
            console.log(error)
            throw new Error("Error on password change")
        }
    }


    // ** WTM BASED INTERACTIONS **
    /**
     * CREATE WTM
     * @param {String} wtmName - Desired name of wtm
     * @param {String} wtmCreatorUserName - user name of wtm creator
     * @param {[Date]} dateRange - the set of dates targeted
     * @param {Number} startTime - start time
     * @param {Number} endTime - end time
     * @param {[String]} [invitedUserNames] - optional: usernames of users to be invited
     * @return {Promise<WTM>} returns the object created by saving the input values
     */
    static async createWTM(wtmName, creatorUserName, dateRange, startTime, endTime, invitedUserNames) {
        try {
            const targetOwner = await user.findOne({ userName: creatorUserName })
            if (targetOwner === null) return null
            let targetIdentifier = Math.round(Math.random() * 1000)
            while (await wtm.findOne({ identifier: targetIdentifier }) !== null) {
                targetIdentifier = Math.round(Math.random() * 1000)
            }

            let newWTM = new wtm()
            newWTM.name = wtmName
            newWTM.owner = targetOwner._id
            newWTM.identifier = targetIdentifier
            newWTM.dateRange = dateRange
            newWTM.startTime = startTime
            newWTM.endTime = endTime
            if (invitedUserNames !== undefined && Array.isArray(invitedUserNames)) {
                for (let i = 0; i < invitedUserNames.length; i++) {
                    let targetUser = await user.findOne({ userName: invitedUserNames[i] })
                    if (targetUser === null) continue
                    newWTM.invited.push(targetUser._id)
                }
            }
            const saveResponse = await newWTM.save()
            targetOwner.ownedWTMs.push(saveResponse._id)
            const savedOwnerPromise = await targetOwner.save()
            if (invitedUserNames !== undefined) {
                for (let i = 0; i < invitedUserNames.length; i++) {
                    const targetUser = await user.findOne({ userName: invitedUserNames[i] })
                    if (targetUser === null) continue

                    targetUser.invitedWTMs.push(saveResponse._id)

                    let newMessage = {}
                    const msg = "You have been invited to " + wtmName + ". Click to accept/decline"
                    newMessage.message = msg
                    newMessage.wtmIdentifier = targetIdentifier

                    targetUser.messages.push(newMessage)
                    const targetUserPromise = await targetUser.save()
                    if (targetUserPromise === null) {
                        throw new Error("Could not save user message in wtm creation")
                    }
                }
            }
            return saveResponse
        } catch (error) {
            console.log(error)
            throw new Error("Error on wtm creation")
        }
    }

    /**
     * Gets user for an wtm
     * @param {MongoID} wtmIdentifier 
     * @return {{accepted: String[], invited: String[], rejected: String[]}}
     */
    static async getWTMUsers(wtmIdentifier) {
        try {
            let targetWTMPopulated = await
                wtm.findOne({ identifier: wtmIdentifier }).
                    populate('accepted', 'userName').
                    populate('invited', 'userName').
                    populate('rejected', 'userName').
                    exec()
            if (targetWTMPopulated === null) return null

            let users = {}
            users.invited = []
            users.accepted = []
            users.rejected = []

            targetWTMPopulated.accepted.forEach((element) => {
                if (element.userName !== null)
                    users.accepted.push(element.userName)
            })

            targetWTMPopulated.invited.forEach((element) => {
                if (element.userName !== null)
                    users.invited.push(element.userName)
            })
            if (users.invited.length > 0 && !!(!users.invited[users.invited.length - 1])) {
                users.invited.splice(users.invited.length - 1, 1)
            }

            targetWTMPopulated.rejected.forEach((element) => {
                if (element.userName !== null)
                    users.rejected.push(element.userName)
            })

            return users
        } catch (error) {
            throw new Error("Error on user population")
        }
    }

    /**
     * Save user responses to the specified wtm
     * @param {MongoID} wtmIdentifier 
     * @param {userId} userID 
     * @return {wtm}
     */
    static async addWTMResponses(wtmIdentifier, userID, responsesArr) {
        try {
            const wtmPromise = wtm.findOne({ identifier: wtmIdentifier })
            const targetWTM = await wtmPromise
            if (targetWTM === null) return null
            else {
                console.log(userID)
                const responderIndex = targetWTM.responses.findIndex((element) => {
                    return element.responder == userID
                })
                if (responderIndex > -1) {
                    targetWTM.responses.splice(responderIndex, 1)   // delete
                }
                const currResponse = { times: responsesArr, responder: userID }
                targetWTM.responses.push(currResponse)
                const saveWTM = await targetWTM.save()

                console.log("addResponses: num responses: " + targetWTM.responses.length)
                console.log("addResponses: num accepted " + targetWTM.accepted.length)

                // Notify owner if everyone has responded to the wtm and all accepted guests have filled out the survey
                if (targetWTM.invited.length === 0 && (targetWTM.responses.length === targetWTM.accepted.length + 1)) {
                    console.log("addResponses: updating owner notif that all have responded.")
                    const ownerPromise = user.findById(targetWTM.owner)
                    const wtmOwner = await ownerPromise
                    if (wtmOwner == null) {
                        console.log("addResponses: owner null")
                    }

                    let newMessage = {}
                    newMessage.message = "All guests have responded to your wtm: " + targetWTM.name
                    newMessage.wtmIdentifier = wtmIdentifier
                    wtmOwner.messages.push(newMessage)
                    const ownerSavePromise = wtmOwner.save()
                    await ownerSavePromise
                }

                return saveWTM
            }
        } catch (error) {
            console.log(error)
        }
    }

    /**
     * Gets wtm from Id and personal reponse
     * @param {MongoID} wtmIdentifier 
     * @param {userID} userID
     *
     * @return {Object}
     */
    static async retrieveWTM(wtmIdentifier, userID) {
        try {
            const targetWTMPopulated = await wtm.
                findOne({ identifier: wtmIdentifier }).
                populate('owner', 'userName').
                populate({ path: 'responses.responder', select: 'userName' }).
                exec()
            if (targetWTMPopulated === null) return null

            let wtmInformation = {}
            wtmInformation.owner = targetWTMPopulated.owner
            wtmInformation.wtmName = targetWTMPopulated.name
            wtmInformation.dateRange = targetWTMPopulated.dateRange
            for (let i = 0; i < wtmInformation.dateRange.length; i++) {
                wtmInformation.dateRange[i] = Date.parse(wtmInformation.dateRange[i])
            }
            wtmInformation.startTime = targetWTMPopulated.startTime
            wtmInformation.endTime = targetWTMPopulated.endTime
            let newResponses = []
            for (let j = 0; j < targetWTMPopulated.responses.length; j++) {
                let newRes = {}
                const element = targetWTMPopulated.responses[j]
                newRes.responder = element.responder
                newRes.times = []
                for (let i = 0; i < element.times.length; i++) {
                    newRes.times.push({
                        day: Date.parse(element.times[i].day),
                        timeRange: element.times[i].timeRange
                    })
                }
                newResponses.push(newRes)
            }
            wtmInformation.responses = newResponses
            wtmInformation.invited = targetWTMPopulated.invited
            const targetIndex = await targetWTMPopulated.responses.findIndex((element) => {
                return element.responder._id == userID
            })
            if (targetIndex === -1) {
                wtmInformation.personalResponses = {
                    times: [{
                        day: "",
                        timeRange: ""
                    }], responder: ""
                }
            }
            else {
                const personalResponse = targetWTMPopulated.responses[targetIndex]
                let newResponses = {}
                newResponses.responder = personalResponse.responder
                newResponses.times = []
                for (let i = 0; i < personalResponse.times.length; i++) {
                    let newRes = {}
                    newRes.day = Date.parse(personalResponse.times[i].day)
                    newRes.timeRange = personalResponse.times[i].timeRange
                    newResponses.times.push(newRes)
                }
                wtmInformation.personalResponses = newResponses
            }

            return wtmInformation
        } catch (error) {
            console.log(error)
            throw new Error("Error on user population")
        }
    }

    /**
     * Deletes specified wtm from database and notifies guests of the wtms that wtm
     * was deleted.
     * 
     * @param {MongoID} wtmIdentifier 
     * @param {userId} userID 
     */
    static async deleteWTM(wtmIdentifier, userID) {
        try {
            const wtmPromise = wtm.findOneAndRemove({ identifier: wtmIdentifier, owner: userID })
            const targetWTM = await wtmPromise

            const ownerId = targetWTM.owner
            const ownerObj = await user.findById(ownerId)
            const result = await user.findByIdAndUpdate(ownerId, { $pull: { ownedWTMs: { _id: targetWTM._id } } })
            const acceptedList = targetWTM.accepted;

            for (let i = 0; i < acceptedList.length; i++) {
                const usersId = acceptedList[i]
                const userPromise = user.findById(usersId)
                const targetUser = await userPromise

                let newMessage = {}
                const msg = "The wtm " + targetWTM.name + " has been deleted."
                newMessage.message = msg
                newMessage.wtmIdentifier = wtmIdentifier
                targetUser.messages.push(newMessage)
                const userSavePromise = targetUser.save()
                await userSavePromise
                await user.findByIdAndUpdate(usersId, { $pull: { participantWTMs: { _id: targetWTM._id } } })
            }

            const invitedList = targetWTM.invited
            for (let i = 0; i < invitedList.length; i++) {
                const usersId = invitedList[i]
                const userPromise = user.findById(usersId)
                const targetUser = await userPromise

                let newMessage = {}
                const msg = "The wtm " + targetWTM.name + " has been deleted."
                newMessage.message = msg
                newMessage.wtmIdentifier = wtmIdentifier
                targetUser.messages.push(newMessage)
                const userSavePromise = targetUser.save()
                await userSavePromise
                await user.findByIdAndUpdate(usersId, { $pull: { invitedWTMs: { _id: targetWTM._id } } })
            }


            wtm.remove({ _id: targetWTM._id })
        }
        catch (error) {
            console.log(error)
            throw new Error("Error on wtm deletion")
        }
    }

    /**
     * Invites a user to an wtm
     * @param {MongoID} wtmIdentifier 
     * @param {userId} userID
     * @param {username} targetUsername
     * @return {boolean} valid invite
     */
    static async inviteWTMUser(wtmIdentifier, userID, targetUserName) {
        try {
            const wtmPromise = wtm.findOne({ identifier: wtmIdentifier })
            const userPromise = user.findOne({ userName: targetUserName })
            const targetWTM = await wtmPromise
            let targetUser = await userPromise
            if (targetWTM === null) {
                console.log("No such WTM")
                return null
            }
            else if (targetWTM.owner._id != userID) {
                console.log("Only owner can invite")
                return null
            }
            else if (targetUser === null) {
                console.log("No such user")
                return null
            }
            else if (targetUser._id == userID) {
                console.log("Owner is trying to invite him/herself")
                return null
            }
            else {
                const invitedIndex = targetWTM.invited.indexOf(targetUser._id)
                if (invitedIndex !== -1) {
                    console.log("inviteUser: target user already invited")
                    return false
                }

                const acceptedIndex = targetWTM.accepted.indexOf(targetUser._id)

                if (acceptedIndex !== -1) {
                    console.log("inviteUser: target user already accepted")
                    return false
                }
                const rejectedIndex = targetWTM.rejected.indexOf(targetUser._id)

                if (rejectedIndex !== -1) {
                    console.log("inviteUser: target user rejected invitation...reinviting.")
                    targetWTM.rejected.splice(rejectedIndex, 1)
                }
                targetWTM.invited.push(targetUser._id)
                targetUser.invitedWTMs.push(targetWTM._id)

                let newMessage = {}
                const msg = "You have been invited to " + targetWTM.name + ". Click to accept/decline"
                newMessage.message = msg
                newMessage.wtmIdentifier = wtmIdentifier
                targetUser.messages.push(newMessage)

                const targetPromise = targetWTM.save()
                const userSavePromise = targetUser.save()
                const targetPromiseResult = await targetPromise
                const userSavePromiseResult = await userSavePromise

                return true
            }
        } catch (error) {
        }
    }


    /**
     * Removes a user from an wtm, where the user has already accepted the invite.
     * @param {MongoID} wtmIdentifier 
     * @param {userId} userID
     * @return {boolean} function successfull
     */
    static async removeWTMGuest(wtmIdentifier, userID) {
        try {
            const wtmPromise = wtm.findOne({ identifier: wtmIdentifier })
            const userPromise = user.findById(userID)
            const targetWTM = await wtmPromise
            if (targetWTM === null) {
                console.log("No such WTM")
                return null
            }
            else if (userID === targetWTM.owner._id) {
                console.log("Owner is trying to leave his/her own wtm")
                return null
            }
            else {
                const targetUser = await userPromise
                if (targetUser === null) return null
                else {
                    // Find the index of the the user within the accepted users of the wtm. 
                    const wtmAcceptedIndex = targetWTM.accepted.indexOf(targetUser._id)
                    if (wtmAcceptedIndex === -1) return "already left"
                    // Remove user from the accepted users of the wtm. 
                    targetWTM.accepted.splice(wtmAcceptedIndex, 1)

                    // Find the index of the wtm within the accepted wtms of the user. 
                    const userAcceptedIndex = targetUser.participantWTMs.indexOf(targetWTM._id)
                    if (userAcceptedIndex === -1) return null
                    // Remove wtm from the accepted wtms of the user. 
                    targetUser.participantWTMs.splice(userAcceptedIndex, 1)

                    // Update notif for owner that someone has left his/her wtm.
                    const ownerPromise = user.findById(targetWTM.owner)
                    const wtmOwner = await ownerPromise
                    if (wtmOwner == null) {
                        console.log("removeWTMGuest: null owner")
                    }
                    let newMessage = {}
                    newMessage.message = targetUser.userName + " has left your wtm " + targetWTM.name
                    newMessage.wtmIdentifier = wtmIdentifier
                    wtmOwner.messages.push(newMessage)

                    const ownerSavePromise = wtmOwner.save()
                    const wtmPromise = targetWTM.save()
                    const userPromise = targetUser.save()
                    await ownerSavePromise
                    await wtmPromise
                    await userPromise

                    return true
                }
            }
        } catch (error) {
            console.log(error)
            throw new Error("Error on guest removal inside DBDriver")
        }
    }

    /**
     * Adds guest to an wtm
     * @param {MongoID} wtmIdentifier 
     * @param {userId} userID
     * @return {boolean} function successful
     */
    static async addWTMGuest(wtmIdentifier, userID) {
        try {
            const wtmPromise = wtm.findOne({ identifier: wtmIdentifier })
            const targetWTM = await wtmPromise
            if (userID === targetWTM.owner._id) {
                console.log("userID is owner")
                return null
            }
            if (targetWTM === null) {
                console.log("no such WTM")
                return null
            }
            else {
                const userPromise = user.findById(userID)
                const targetUser = await userPromise
                if (targetUser === null) {
                    console.log("No such user")
                    return null
                }
                else {
                    // Find the index of the user within the rejected users of the wtm.
                    const wtmRejectedIndex = targetWTM.rejected.indexOf(targetUser._id)
                    // Return if user is already in the rejected guest list
                    if (wtmRejectedIndex != -1) {
                        console.log("addWTMGuest: guest already rejected the wtm")
                        return null
                    }

                    // Find the index of the the user within the accepted users of the wtm. 
                    const wtmAcceptedIndex = targetWTM.accepted.indexOf(targetUser._id)
                    // Return if user is already in the accepted guest list
                    if (wtmAcceptedIndex != -1) {
                        console.log("addWTMGuest: guest has already accepted invitation")
                        return null
                    }

                    console.log(userID)
                    console.log(targetUser._id)
                    console.log(targetUser.userName)
                    console.log(targetWTM.invited)
                    const wtmInvitedIndex = targetWTM.invited.indexOf(targetUser._id)
                    console.log("addWTMGuest: wtm invited index = " + wtmInvitedIndex)
                    if (wtmInvitedIndex === -1) {
                        console.log("User has not invited. Invite before you add")
                        return null
                    }
                    // Remove user from the invitee list 
                    targetWTM.invited.splice(wtmInvitedIndex, 1)
                    // Add invited user to the accepted users of the wtm. 
                    targetWTM.accepted.push(targetUser._id)

                    // If invited list is empty and everyone has responded, then notify the owner that everyone has responded
                    if (targetWTM.invited.length == 0 && (targetWTM.responses.length == targetWTM.accepted.length + 1)) {
                        const ownerPromise = user.findById(targetWTM.owner)
                        const wtmOwner = await ownerPromise
                        if (wtmOwner == null) {
                            console.log("addWTMGuest: owner null")
                        }

                        let newMessage = {}
                        newMessage.message = "All guests have responded to your wtm: " + targetWTM.name
                        newMessage.wtmIdentifier = wtmIdentifier
                        wtmOwner.messages.push(newMessage)
                        const ownerSavePromise = wtmOwner.save()
                        await ownerSavePromise
                    }

                    // Update the user's fields: invitedWTMs, participantWTMs 
                    const userInvitedIndex = targetUser.invitedWTMs.indexOf(targetWTM._id)
                    if (userInvitedIndex === -1) {
                        console.log("addWTMGuest: targetUser was not invited to the wtm.")
                        return null
                    }
                    targetUser.invitedWTMs.splice(userInvitedIndex, 1)
                    const userAcceptedIndex = targetUser.participantWTMs.indexOf(targetWTM._id)
                    if (userAcceptedIndex === -1) {
                        targetUser.participantWTMs.push(targetWTM._id)
                    }
                    const ownerPromise = user.findById(targetWTM.owner)
                    const wtmOwner = await ownerPromise
                    if (wtmOwner == null) {
                        console.log("addWTMGuest: owner null")
                    }

                    let newMessage = {}
                    newMessage.message = targetUser.userName + " has joined your wtm " + targetWTM.name
                    newMessage.wtmIdentifier = wtmIdentifier
                    wtmOwner.messages.push(newMessage)
                    const ownerSavePromise = wtmOwner.save()

                    const wtmPromise = targetWTM.save()
                    const userPromise = targetUser.save()
                    await ownerSavePromise
                    await wtmPromise
                    await userPromise

                    return true
                }
            }
        } catch (error) {
            console.log(error);
            throw new Error("Error on wtm invite acceptance inside DBDriver");
        }
    }

    // ** User Activities **
    static async getAllUsers() {
        try {
            const userPromise = user.find()
            const userArray = await userPromise
            let info = []
            userArray.forEach((element) => {
                info.push({ userName: element.userName, userEmail: element.userEmail })
            })
            console.log(info)
            return info
            // const targetUser = await userPromise
            // if (targetUser === null) {
            //     console.log("No such user")
            //     return null
            // }
            // else {
            //     if (targetUser.messages === undefined) {
            //         return null
            //     }

            //     let userMessages = {}
            //     userMessages.messages = targetUser.messages

            //     // Clear the messages of the user
            //     targetUser.messages = []
            //     const userSavePromise = targetUser.save()
            //     const saveResult = await userSavePromise
            //     if (saveResult !== null) {
            //         return userMessages
            //     }
            //     else {
            //         return null
            //     }
            // }
        } catch (error) {
            console.log(error)
            throw new Error("Error on getUserMessages inside DBDriver")
        }
    }

    /**
     * Gets user message from inbox
     * @param {userId} userID
     * @return {userMessages} specified user's messages
     */
    static async getUserMessages(userID) {
        try {
            const userPromise = user.findById(userID)
            const targetUser = await userPromise
            if (targetUser === null) {
                console.log("No such user")
                return null
            }
            else {
                if (targetUser.messages === undefined) {
                    return null
                }

                let userMessages = {}
                userMessages.messages = targetUser.messages

                // Clear the messages of the user
                targetUser.messages = []
                const userSavePromise = targetUser.save()
                const saveResult = await userSavePromise
                if (saveResult !== null) {
                    return userMessages
                }
                else {
                    return null
                }
            }
        } catch (error) {
            console.log(error)
            throw new Error("Error on getUserMessages inside DBDriver")
        }
    }

    static async getUserDeparture(username) {
        try {
            const userPromise = user.findOne({ userName: username })
            const targetUser = await userPromise
            if (targetUser === null) {
                console.log("No such user")
                return null
            }
            else {
                if (targetUser.departure === undefined) {
                    return null
                }

                return targetUser.departure.coordinates
            }
        } catch (error) {
            console.log(error)
            throw new Error("Error on getUserMessages inside DBDriver")
        }
    }

    /**
     * Clears a user's messages
     * @param {userId} userID
     * @return {boolean} whether user messages are empty
     */
    static async clearUserMessages(userID) {
        try {
            const userPromise = user.findById(userID)
            const targetUser = await userPromise
            if (targetUser === null) return null
            else {
                if (targetUser.messages === undefined) {
                    return null
                }
                targetUser.messages = []
                const userSavePromise = targetUser.save()
                const saveResult = await userSavePromise
                if (saveResult !== null)
                    return true
                else
                    return false
            }
        } catch (error) {
            console.log(error)
            throw new Error("Error on getUserMessages inside DBDriver")
        }
    }

    /**
     * Gets a user's owner wtms
     * @param {targetId} userID
     * @return {retArray} array of owner wtms IDs
     */
    static async updateDeparture(userID, departure) {
        try {
            const result = await user.findById(userID)
            result.departure.coordinates = departure
            const userSavePromise = result.save()
            await userSavePromise
            return true
        } catch (error) {
            console.log(error)
            throw new Error("Error on get owner wtms")
        }
    }


    /**
     * Gets a user's owner wtms
     * @param {targetId} userID
     * @return {retArray} array of owner wtms IDs
     */
    static async getOwnerWTMs(targetId) {
        try {
            let targetWTMs = await wtm.find({ owner: targetId })
            let retArray = []
            if (targetWTMs !== null) {
                targetWTMs.forEach((element) => {
                    let targetObj = {}
                    targetObj.wtmName = element.name
                    targetObj.identifier = element.identifier
                    retArray.push(targetObj)
                })
            }

            return retArray
        } catch (error) {
            console.log(error)
            throw new Error("Error on get owner wtms")
        }
    }

    /**
     * Gets a user's guest wtms
     * @param {targetId} userID
     * @return {Object}
     */
    static async getGuestWTMs(targetID) {
        try {
            const userPromise = user.findById(targetID).
                populate('invitedWTMs').
                populate('participantWTMs').
                exec()
            const targetUser = await userPromise
            if (targetUser === null || targetUser === undefined) throw new Error('invalid user')
            let retObj = {}
            let invitedArr = []
            let acceptedArr = []
            targetUser.invitedWTMs.forEach((element) => {
                let targetElement = {}
                targetElement.identifier = element.identifier
                targetElement.name = element.name
                invitedArr.push(targetElement)
            })

            targetUser.participantWTMs.forEach((element) => {
                let targetElement = {}
                targetElement.identifier = element.identifier
                targetElement.name = element.name
                acceptedArr.push(targetElement)
            })

            retObj.invited = invitedArr
            retObj.accepted = acceptedArr

            return retObj
        } catch (error) {
            console.log(error)
            throw new Error("Error on getUserMessages inside DBDriver")
        }
    }

    /**
     * Allows a user to decline an invite to an wtm
     * @param {wtmId} wtmIdentifier
     * @param {userId} userID
     * @return {boolean} whether function was fully run through
     */
    static async declineWTMInvite(wtmId, userId) {
        try {
            const wtmPromise = wtm.findOne({ identifier: wtmId })
            const userPromise = user.findById(userId)
            const targetWTM = await wtmPromise

            if (targetWTM.owner._id == userId) {
                console.log("Owner is trying to decline his/her own wtm")
                return null
            }
            else if (targetWTM === null) {
                return null
            }
            else {
                const targetUser = await userPromise
                if (targetUser === null) return null
                else {
                    // Find the index of the the user within the invited users of the wtm. 
                    const wtmInvitedIndex = targetWTM.invited.indexOf(targetUser._id)
                    if (wtmInvitedIndex === -1) {
                        console.log("declineWTMInvite: guest not invited")
                        return null
                    }
                    // Remove user from the invited users of the wtm. 
                    targetWTM.invited.splice(wtmInvitedIndex, 1)
                    // Find the index of the wtm within the invited wtms of the user. 
                    const userInvitedIndex = targetUser.invitedWTMs.indexOf(targetWTM._id)
                    if (userInvitedIndex === -1) {
                        console.log("declineWTMInvite: wtm was not in the invited wtms of the user")
                        return null
                    }
                    // Remove wtm from the invited wtms of the user. 
                    targetUser.invitedWTMs.splice(userInvitedIndex, 1)

                    // Add user to rejected users of wtm
                    targetWTM.rejected.push(targetUser)

                    // Update notif for owner that someone has declined his/her wtm. 
                    let ownerPromise = user.findById(targetWTM.owner)
                    let wtmOwner = await ownerPromise
                    if (wtmOwner == null) {
                        console.log("removeWTMGuest: owner null")
                    }

                    let newMessage = {}
                    newMessage.message = targetUser.userName + " has declined your wtm invite for " + targetWTM.name
                    newMessage.wtmIdentifier = wtmId
                    wtmOwner.messages.push(newMessage)

                    // If invited list is empty, then notify the owner that everyone has responded
                    if ((targetWTM.invited.length === 0) && (targetWTM.responses.length === targetWTM.accepted.length + 1)) {
                        let newMessageWTMDone = {}
                        newMessageWTMDone.message = "All guests have responded to your wtm: " + targetWTM.name
                        newMessageWTMDone.wtmIdentifier = wtmId
                        wtmOwner.messages.push(newMessageWTMDone)
                    }

                    let ownerSavePromise = wtmOwner.save()
                    let wtmPromise = targetWTM.save()
                    let userPromise = targetUser.save()
                    await ownerSavePromise
                    await wtmPromise
                    await userPromise

                    return true
                }
            }
        } catch (error) {
            console.log(error)
            throw new Error("Error on guest removal inside DBDriver")
        }
    }

    /**
     * Reminds an invited guest of an wtm to respond
     * @param {userId} userID
     * @param {wtmId} wtmIdentifier
     * @return {String} indicates result of method call
     */
    static async remindWTMUsers(userId, wtmId) {
        try {
            // Retrieve wtm and user
            const wtmPromise = wtm
                .findOne({ identifier: wtmId, owner: userId })
                .populate('owner', 'userName')
                .exec()
            const targetWTM = await wtmPromise

            // Error check for to make sure owner is making the request (only one allowed to) 
            // TODO: CORRECT FOR LIST
            if (targetWTM === null) {
                console.log("WTM cannot be found")
                return "WTM cannot be found"
            }


            const wtmName = targetWTM.name
            let newMessage = {}
            newMessage.message = targetWTM.owner.userName + " has sent you a reminder to update/finalize your availability poll for the wtm: " + wtmName
            newMessage.wtmIdentifier = wtmId

            // Remind all users who are invited to the wtm
            for (let i = 0; i < targetWTM.invited.length; i++) {
                const innerUserPromise = user.findById(targetWTM.invited[i])
                const innerUser = await innerUserPromise
                if (innerUserPromise === null) {
                    console.log("remindWTMUsers: innerUserPromise invited null")
                    return "User could not be found"
                }
                innerUser.messages.push(newMessage)
                const updateMsgPromise = innerUser.save()
                const updateResult = await updateMsgPromise
                if (updateResult === null) {
                    const errorMsg = "Could not update " + targetWTM.invited[i].userName + "'s messages."
                    console.log("remindWTMUsers: " + errorMsg)
                    return errorMsg
                }
            }

            // Remind all users who have accepted the wtm
            for (let i = 0; i < targetWTM.accepted.length; i++) {
                let innerUserPromise = user.findById(targetWTM.invited[i])
                let innerUser = await innerUserPromise
                if (innerUserPromise === null) {
                    console.log("remindWTMUsers: innerUserPromise accepted null")
                    return "User could not be found"
                }
                innerUser.messages.push(newMessage)
                let updateMsgPromise = innerUser.save()
                let updateResult = await updateMsgPromise
                if (updateResult === null) {
                    let errorMsg = "Could not update " + targetWTM.accepted[i].userName + "'s messages."
                    console.log("remindWTMUsers: " + errorMsg)
                    return errorMsg
                }
            }

            return "Success"
        } catch (error) {
            console.log(error)
            throw new Error("Error on remindWTMUsers inside DBDriver")
        }
    }


    // ** Appointment **
    /**
     * Create new Appointment
     * @param {String} apptName - name of appointment
     * @param {Date} apptTime - Date and Time of appointment
     * @param {Point} apptDest - destination of appointment
     * @return {Promise<Boolean>}
     */
    static async createAppt(apptName, apptStartTime, apptEndTime, apptDest, creatorID) {
        try {
            const creator = await user.findById(creatorID)

            let targetIdentifier = Math.round(Math.random() * 1000)
            while (await appt.findOne({ identifier: targetIdentifier }) !== null) {
                targetIdentifier = Math.round(Math.random() * 1000)
            }

            let newAppt = new appt()
            newAppt.name = apptName
            newAppt.startTime = apptStartTime
            newAppt.endTime = apptEndTime
            newAppt.destination = {
                type: 'Point',
                coordinates: apptDest
            }
            newAppt.identifier = targetIdentifier
            newAppt.owner = creatorID

            const saveAppt = await newAppt.save()
            creator.ownedAppts.push(newAppt._id)
            const savedOwnerPromise = await creator.save()

            return saveAppt
        }
        catch (error) {
            console.log(error)
            throw new Error("Error on Appointment Creation")
        }
    }

    /**
     * Gets user for an appt
     * @param {MongoID} apptIdentifier 
     */
    static async getApptUsers(apptIdentifier) {
        try {
            const targetApptPopulated = await
                appt.findOne({ identifier: apptIdentifier }).
                    populate({ path: 'accepted.member', model: 'User', select: 'userName' }).
                    populate({ path: 'invited', model: 'User', select: 'userName' }).
                    populate({ path: 'rejected', model: 'User', select: 'userName' }).
                    exec()

            if (targetApptPopulated === null) return null

            let users = {}
            users.invited = []
            users.accepted = []
            users.rejected = []

            targetApptPopulated.accepted.forEach((element) => {
                if (element.member.userName !== null)
                    users.accepted.push(element.member.userName)
            })

            targetApptPopulated.invited.forEach((element) => {
                if (element.userName !== null)
                    users.invited.push(element.userName)
            })
            if (users.invited.length > 0 && !!(!users.invited[users.invited.length - 1])) {
                users.invited.splice(users.invited.length - 1, 1)
            }

            targetApptPopulated.rejected.forEach((element) => {
                if (element.userName !== null)
                    users.rejected.push(element.userName)
            })

            return users
        }
        catch (error) {
            console.log(error)
            throw new Error("Error on user population")
        }
    }

    /**
     * Gets appt from Identifier
     * @param {MongoID} apptIdentifier 
     *
     * @return {Object}
     */
    static async retrieveAppt(apptIdentifier) {
        try {
            const targetApptPopulated = await appt.
                findOne({ identifier: apptIdentifier }).
                populate('owner', 'userName').
                populate({ path: 'accepted.member', model: 'User', select: 'userName' }).
                populate({ path: 'invited', model: 'User', select: 'userName' }).
                populate({ path: 'rejected', model: 'User', select: 'userName' }).
                exec()
            if (targetApptPopulated === null) return null

            let apptInformation = {}
            apptInformation.name = targetApptPopulated.name
            apptInformation.owner = targetApptPopulated.owner.userName
            apptInformation.startTime = targetApptPopulated.startTime
            apptInformation.endTime = targetApptPopulated.endTime
            apptInformation.identifier = targetApptPopulated.identifier
            apptInformation.destination = targetApptPopulated.destination.coordinates
            apptInformation.members = await this.getApptUsers(apptIdentifier)

            return apptInformation
        } catch (error) {
            console.log(error)
            throw new Error("Error on user population")
        }
    }


    /**
     * Deletes specified appt from database and notifies guests of the appts that appt
     * was deleted.
     * 
     * @param {MongoID} apptIdentifier 
     * @param {userId} userID 
     */
    static async deleteAppt(apptIdentifier, userID) {
        try {
            const apptPromise = appt.findOneAndRemove({ identifier: apptIdentifier, owner: userID })
            const targetAppt = await apptPromise

            const ownerId = targetAppt.owner
            const ownerObj = await user.findById(ownerId)
            const result = await user.findByIdAndUpdate(ownerId, { $pull: { ownedAppts: { _id: targetAppt._id } } })

            const acceptedList = targetAppt.accepted
            console.log(acceptedList.length)
            console.log(acceptedList)
            for (let i = 0; i < acceptedList.length; i++) {
                const usersId = acceptedList[i]
                const userPromise = user.findById(usersId)
                const targetUser = await userPromise

                let newMessage = {}
                const msg = "The appt " + targetAppt.name + " has been deleted."
                newMessage.message = msg
                newMessage.apptIdentifier = apptIdentifier
                targetUser.messages.push(newMessage)
                const userSavePromise = targetUser.save()
                await userSavePromise
                await user.findByIdAndUpdate(usersId, { $pull: { participantAppts: { _id: targetAppt._id } } })
            }

            const invitedList = targetAppt.invited
            for (let i = 0; i < invitedList.length; i++) {
                const usersId = invitedList[i]
                const userPromise = user.findById(usersId)
                const targetUser = await userPromise

                let newMessage = {}
                const msg = "The appt " + targetAppt.name + " has been deleted."
                newMessage.message = msg
                newMessage.apptIdentifier = apptIdentifier
                targetUser.messages.push(newMessage)
                const userSavePromise = targetUser.save()
                await userSavePromise
                await user.findByIdAndUpdate(usersId, { $pull: { invitedAppts: { _id: targetAppt._id } } })
            }

            appt.remove({ _id: targetAppt._id })
        }
        catch (error) {
            console.log(error)
            throw new Error("Error on wtm deletion")
        }
    }

    /**
     * Invites a user to an appt
     * @param {MongoID} ApptIdentifier 
     * @param {userId} userID
     * @param {username} targetUsername
     * @return {boolean} valid invite
     */
    static async inviteApptUser(apptIdentifier, userID, targetUserName) {
        try {
            const apptPromise = appt.findOne({ identifier: apptIdentifier })
            const userPromise = user.findOne({ userName: targetUserName })
            const targetAppt = await apptPromise
            let targetUser = await userPromise
            if (targetAppt === null) {
                console.log("No such Appt")
                return null
            }
            else if (targetAppt.owner._id != userID) {
                console.log("Only owner can invite")
                console.log(targetAppt.owner._id)
                console.log(userID)
                return null
            }
            else if (targetUser === null) {
                console.log("No such user")
                return null
            }
            else if (targetUser._id == userID) {
                console.log("Owner is trying to invite him/herself")
                return null
            }
            else {
                const invitedIndex = targetAppt.invited.indexOf(targetUser._id)
                if (invitedIndex !== -1) {
                    console.log("inviteUser: target user already invited")
                    return false
                }

                const acceptedIndex = targetAppt.accepted.indexOf(targetUser._id)

                if (acceptedIndex !== -1) {
                    console.log("inviteUser: target user already accepted")
                    return false
                }
                const rejectedIndex = targetAppt.rejected.indexOf(targetUser._id)

                if (rejectedIndex !== -1) {
                    console.log("inviteUser: target user rejected invitation...reinviting.")
                    targetAppt.rejected.splice(rejectedIndex, 1)
                }
                targetAppt.invited.push(targetUser._id)
                targetUser.invitedAppts.push(targetAppt._id)

                let newMessage = {}
                const msg = "You have been invited to " + targetAppt.name + ". Click to accept/decline"
                newMessage.message = msg
                newMessage.apptIdentifier = apptIdentifier
                targetUser.messages.push(newMessage)

                const targetPromise = targetAppt.save()
                const userSavePromise = targetUser.save()
                const targetPromiseResult = await targetPromise
                const userSavePromiseResult = await userSavePromise

                return true
            }
        } catch (error) {
        }
    }

    /**
     * Allows a user to decline an invite to an appt
     * @param {apptId} apptIdentifier
     * @param {userId} userID
     * @return {boolean} whether function was fully run through
     */
    static async declineApptInvite(apptId, userId) {
        try {
            const apptPromise = appt.findOne({ identifier: apptId })
            const userPromise = user.findById(userId)
            const targetAppt = await apptPromise

            if (targetAppt.owner._id == userId) {
                console.log("Owner is trying to decline his/her own appt")
                return null
            }
            else if (targetAppt === null) {
                return null
            }
            else {
                const targetUser = await userPromise
                if (targetUser === null) return null
                else {
                    // Find the index of the the user within the invited users of the appt. 
                    const apptInvitedIndex = targetAppt.invited.indexOf(targetUser._id)

                    if (apptInvitedIndex === -1) {
                        console.log("declineApptInvite: guest not invited")
                        return null
                    }
                    // Remove user from the invited users of the appt. 
                    targetAppt.invited.splice(apptInvitedIndex, 1)
                    // Find the index of the appt within the invited appts of the user. 
                    const userInvitedIndex = targetUser.invitedAppts.indexOf(targetAppt._id)
                    if (userInvitedIndex === -1) {
                        console.log("declineApptInvite: appt was not in the invited appts of the user")
                        return null
                    }
                    // Remove appt from the invited appts of the user. 
                    targetUser.invitedAppts.splice(userInvitedIndex, 1)

                    // Add user to rejected users of appt
                    targetAppt.rejected.push(targetUser)

                    // Update notif for owner that someone has declined his/her appt. 
                    let ownerPromise = user.findById(targetAppt.owner)
                    let apptOwner = await ownerPromise
                    if (apptOwner == null) {
                        console.log("removeApptGuest: owner null")
                    }

                    let newMessage = {}
                    newMessage.message = targetUser.userName + " has declined your appt invite for " + targetAppt.name
                    newMessage.apptIdentifier = apptId
                    apptOwner.messages.push(newMessage)

                    // If invited list is empty, then notify the owner that everyone has responded
                    if (targetAppt.invited.length === 0) {
                        let newMessageApptDone = {}
                        newMessageApptDone.message = "All guests have responded to your appt: " + targetAppt.name
                        newMessageApptDone.apptIdentifier = apptId
                        apptOwner.messages.push(newMessageApptDone)
                    }

                    let ownerSavePromise = apptOwner.save()
                    let apptPromise = targetAppt.save()
                    let userPromise = targetUser.save()
                    await ownerSavePromise
                    await apptPromise
                    await userPromise

                    return true
                }
            }
        } catch (error) {
            console.log(error)
            throw new Error("Error on guest removal inside DBDriver")
        }
    }

    /**
     * Adds guest to an appt
     * @param {MongoID} apptIdentifier 
     * @param {userId} userID
     * @return {boolean} function successful
     */
    static async addApptGuest(apptIdentifier, userID) {
        try {
            const apptPromise = appt.findOne({ identifier: apptIdentifier })
            const targetAppt = await apptPromise
            if (userID == targetAppt.owner._id) {
                console.log("userID is owner")
                return null
            }
            if (targetAppt === null) {
                console.log("no such Appt")
                return null
            }
            else {
                const userPromise = user.findById(userID)
                const targetUser = await userPromise
                if (targetUser === null) {
                    console.log("No such user")
                    return null
                }
                else {
                    // Find the index of the user within the rejected users of the appt.
                    const apptRejectedIndex = targetAppt.rejected.indexOf(targetUser._id)
                    // Return if user is already in the rejected guest list
                    if (apptRejectedIndex !== -1) {
                        console.log("addApptGuest: guest already rejected the appt")
                        return null
                    }

                    // Find the index of the the user within the accepted users of the appt. 
                    const apptAcceptedIndex = targetAppt.accepted.indexOf(targetUser._id)
                    // Return if user is already in the accepted guest list
                    if (apptAcceptedIndex !== -1) {
                        console.log("addApptGuest: guest has already accepted invitation")
                        return null
                    }

                    const apptInvitedIndex = targetAppt.invited.indexOf(targetUser._id)
                    if (apptInvitedIndex === -1) {
                        console.log("User has not invited. Invite before you add")
                        return null
                    }
                    // Remove user from the invitee list 
                    targetAppt.invited.splice(apptInvitedIndex, 1)
                    // Add invited user to the accepted users of the appt. 
                    targetAppt.accepted.push(targetUser._id)
                    // If invited list is empty and everyone has responded, then notify the owner that everyone has responded
                    if (targetAppt.invited.length === 0) {
                        const ownerPromise = user.findById(targetAppt.owner)
                        const apptOwner = await ownerPromise
                        if (apptOwner == null) {
                            console.log("addApptGuest: owner null")
                        }

                        let newMessage = {}
                        newMessage.message = "All guests have responded to your appt: " + targetAppt.name
                        newMessage.apptIdentifier = apptIdentifier
                        apptOwner.messages.push(newMessage)
                        const ownerSavePromise = apptOwner.save()
                        await ownerSavePromise
                    }

                    // Update the user's fields: invitedAppts, participantAppts 
                    const userInvitedIndex = targetUser.invitedAppts.indexOf(targetAppt._id)
                    if (userInvitedIndex === -1) {
                        console.log("addApptGuest: targetUser was not invited to the appt.")
                        return null
                    }
                    targetUser.invitedAppts.splice(userInvitedIndex, 1)
                    const userAcceptedIndex = targetUser.participantAppts.indexOf(targetAppt._id)
                    if (userAcceptedIndex === -1) {
                        targetUser.participantAppts.push(targetAppt._id)
                    }
                    const ownerPromise = user.findById(targetAppt.owner)
                    const apptOwner = await ownerPromise
                    if (apptOwner == null) {
                        console.log("addApptGuest: owner null")
                    }

                    let newMessage = {}
                    newMessage.message = targetUser.userName + " has joined your appt " + targetAppt.name
                    newMessage.apptIdentifier = apptIdentifier
                    apptOwner.messages.push(newMessage)
                    const ownerSavePromise = apptOwner.save()

                    const apptPromise = targetAppt.save()
                    const userPromise = targetUser.save()
                    await ownerSavePromise
                    await apptPromise
                    await userPromise

                    return true
                }
            }
        } catch (error) {
            console.log(error);
            throw new Error("Error on appt invite acceptance inside DBDriver");
        }
    }


    /**
     * Gets a user's owner appts
     * @param {targetId} userID
     * @return {retArray} array of owner appts IDs
     */
    static async getOwnerAppts(targetId) {
        try {
            let targetAppts = await appt.find({ owner: targetId })
            let retArray = []
            if (targetAppts !== null) {
                targetAppts.forEach((element) => {
                    let targetObj = {}
                    targetObj.apptName = element.name
                    targetObj.identifier = element.identifier
                    retArray.push(targetObj)
                })
            }

            return retArray
        } catch (error) {
            console.log(error)
            throw new Error("Error on get owner appts")
        }
    }

    /**
     * Gets a user's guest appts
     * @param {targetId} userID
     * @return {Object}
     */
    static async getGuestAppts(userId) {
        try {
            const userPromise = user.findById(userId).
                populate('invitedAppts').
                populate('participantAppts').
                exec()
            const targetUser = await userPromise
            if (targetUser === null || targetUser === undefined) throw new Error('invalid user')
            let retObj = {}
            let invitedArr = []
            let acceptedArr = []
            targetUser.invitedAppts.forEach((element) => {
                let targetElement = {}
                targetElement.identifier = element.identifier
                targetElement.name = element.name
                invitedArr.push(targetElement)
            })

            targetUser.participantAppts.forEach((element) => {
                let targetElement = {}
                targetElement.identifier = element.identifier
                targetElement.name = element.name
                acceptedArr.push(targetElement)
            })

            retObj.invited = invitedArr
            retObj.accepted = acceptedArr

            return retObj
        } catch (error) {
            console.log(error)
            throw new Error("Error on getUserMessages inside DBDriver")
        }
    }


    static async getApptsOfDate(userId, date) {
        try {
            const userPromise = user.findById(userId).
                populate('ownedAppts').
                populate('invitedAppts').
                populate('participantAppts').
                exec()
            const targetUser = await userPromise
            if (targetUser === null || targetUser === undefined) throw new Error('invalid user')
            let retObj = {}
            let ownerArr = []
            let invitedArr = []
            let acceptedArr = []

            const day = Date.parse(date)
            const nextDay = Date.parse(date) + 1000 * 3600 * 24

            targetUser.ownedAppts.forEach((element) => {
                if (element.startTime >= day && element.startTime < nextDay) {
                    let targetElement = {}
                    targetElement.identifier = element.identifier
                    targetElement.name = element.name
                    ownerArr.push(targetElement)
                }
            })


            targetUser.invitedAppts.forEach((element) => {
                if (element.startTime >= day && element.startTime < nextDay) {
                    let targetElement = {}
                    targetElement.identifier = element.identifier
                    targetElement.name = element.name
                    invitedArr.push(targetElement)
                }
            })

            targetUser.participantAppts.forEach((element) => {
                if (element.startTime >= day && element.startTime < nextDay) {

                    let targetElement = {}
                    targetElement.identifier = element.identifier
                    targetElement.name = element.name
                    acceptedArr.push(targetElement)
                }
            })

            retObj.owned = ownerArr
            retObj.invited = invitedArr
            retObj.accepted = acceptedArr

            return retObj
        } catch (error) {
            console.log(error)
            throw new Error("Error on getUserMessages inside DBDriver")
        }
    }

}

module.exports = DBDriver