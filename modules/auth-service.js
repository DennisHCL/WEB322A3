const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;
require('dotenv').config();

const userSchema = new Schema({
    userName: {
        type: String,
        unique: true
    },
    password: String,
    email: String,
    loginHistory: [{
        dateTime: Date,
        userAgent: String
    }]
});

let User;

function initialize() {
    return new Promise((resolve, reject) => {
        try {
            let db = mongoose.createConnection(process.env.MONGODB, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                family: 4
            });
            
            db.on('error', (err) => {
                console.error('MongoDB connection error:', err);
                reject(err);
            });
            
            db.once('open', () => {
                console.log('MongoDB connected successfully');
                User = db.model("users", userSchema);
                resolve();
            });
        } catch (err) {
            console.error('MongoDB initialization error:', err);
            reject(err);
        }
    });
}

function registerUser(userData) {
    return new Promise((resolve, reject) => {
        if (userData.password !== userData.password2) {
            reject("Passwords do not match");
            return;
        }

        // Use an explicit promise chain for better error handling
        return bcrypt.hash(userData.password, 10)
            .then(hash => {
                // Create new user with hashed password
                let newUser = new User({
                    userName: userData.userName,
                    password: hash, // Use the hashed password
                    email: userData.email,
                    loginHistory: []
                });
                
                return newUser.save(); // Return the save promise
            })
            .then(() => {
                resolve();
            })
            .catch(err => {
                if (err.code === 11000) {
                    reject("User Name already taken");
                } else {
                    console.error("Registration error:", err); // Add detailed logging
                    reject("There was an error creating the user: " + err.message);
                }
            });
    });
}

function checkUser(userData) {
    return new Promise((resolve, reject) => {
        User.find({ userName: userData.userName })
            .exec()
            .then((users) => {
                if (users.length === 0) {
                    reject(`Unable to find user: ${userData.userName}`);
                    return;
                }

                bcrypt.compare(userData.password, users[0].password)
                    .then((result) => {
                        if (!result) {
                            reject(`Incorrect Password for user: ${userData.userName}`);
                            return;
                        }

                        if (users[0].loginHistory.length === 8) {
                            users[0].loginHistory.pop();
                        }

                        users[0].loginHistory.unshift({
                            dateTime: new Date().toString(),
                            userAgent: userData.userAgent
                        });

                        User.updateOne(
                            { userName: users[0].userName },
                            { $set: { loginHistory: users[0].loginHistory } }
                        )
                            .exec()
                            .then(() => {
                                resolve(users[0]);
                            })
                            .catch((err) => {
                                reject(`There was an error verifying the user: ${err}`);
                            });
                    })
                    .catch(err => {
                        reject(`There was an error verifying the password: ${err}`);
                    });
            })
            .catch(() => {
                reject(`Unable to find user: ${userData.userName}`);
            });
    });
}

module.exports = {
    initialize,
    registerUser,
    checkUser
};