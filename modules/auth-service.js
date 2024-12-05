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
let db;

function initialize() {
    return new Promise((resolve, reject) => {
        try {
            const dbURI = process.env.MONGODB;
            console.log('MongoDB URI status:', dbURI ? 'Present' : 'Missing');
            
            if (!dbURI) {
                throw new Error('MONGODB environment variable is not set');
            }

            const connectOptions = {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 15000,
                family: 4
            };

            console.log('Attempting MongoDB connection...');
            db = mongoose.createConnection(dbURI, connectOptions);
            
            db.on('connecting', () => {
                console.log('MongoDB: Connecting...');
            });

            db.on('error', (err) => {
                console.error('MongoDB Connection Error:', JSON.stringify(err));
                reject(err);
            });

            db.once('open', () => {
                console.log('MongoDB: Connected successfully');
                User = db.model("users", userSchema);
                console.log('MongoDB: User model created');
                resolve();
            });

            // Add a timeout
            setTimeout(() => {
                if (!db || !User) {
                    const error = new Error('MongoDB connection timeout');
                    console.error(error);
                    reject(error);
                }
            }, 10000);

        } catch (err) {
            console.error('MongoDB Initialization Error:', err);
            reject(err);
        }
    });
}

function registerUser(userData) {
    return new Promise((resolve, reject) => {
        // Add validation to ensure User model exists
        if (!User) {
            reject("Database not initialized. Please try again.");
            return;
        }

        if (userData.password !== userData.password2) {
            reject("Passwords do not match");
            return;
        }

        bcrypt.hash(userData.password, 10)
            .then(hash => {
                let newUser = new User({
                    userName: userData.userName,
                    password: hash,
                    email: userData.email,
                    loginHistory: []
                });

                return newUser.save();
            })
            .then(() => {
                resolve();
            })
            .catch(err => {
                if (err.code === 11000) {
                    reject("User Name already taken");
                } else {
                    console.error("Registration Error:", err);
                    reject(`There was an error creating the user: ${err.message}`);
                }
            });
    });
}

function checkUser(userData) {
    return new Promise((resolve, reject) => {
        // Add validation to ensure User model exists
        if (!User) {
            reject("Database not initialized. Please try again.");
            return;
        }

        User.findOne({ userName: userData.userName })
            .exec()
            .then(user => {
                if (!user) {
                    reject(`Unable to find user: ${userData.userName}`);
                    return;
                }

                bcrypt.compare(userData.password, user.password)
                    .then(result => {
                        if (!result) {
                            reject(`Incorrect Password for user: ${userData.userName}`);
                            return;
                        }

                        if (user.loginHistory.length === 8) {
                            user.loginHistory.pop();
                        }
                        
                        user.loginHistory.unshift({
                            dateTime: new Date(),
                            userAgent: userData.userAgent
                        });

                        User.updateOne(
                            { userName: user.userName },
                            { $set: { loginHistory: user.loginHistory } }
                        )
                            .exec()
                            .then(() => {
                                resolve(user);
                            })
                            .catch(err => {
                                reject(`There was an error verifying the user: ${err}`);
                            });
                    })
                    .catch(err => {
                        reject(`There was an error verifying the password: ${err}`);
                    });
            })
            .catch(err => {
                reject(`Unable to find user: ${userData.userName}`);
            });
    });
}

module.exports = {
    initialize,
    registerUser,
    checkUser
};