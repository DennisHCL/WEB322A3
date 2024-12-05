const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;
require('dotenv').config();

let connection = null;
let User = null;

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

async function getConnection() {
    if (connection && User) {
        return connection;
    }

    connection = await mongoose.createConnection(process.env.MONGODB, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
    });

    User = connection.model('users', userSchema);
    return connection;
}

module.exports = {
    initialize: async function() {
        try {
            await getConnection();
            return Promise.resolve();
        } catch (err) {
            console.error('Initialization error:', err);
            return Promise.reject(err);
        }
    },

    registerUser: async function(userData) {
        try {
            await getConnection();

            if (!userData.password || !userData.password2) {
                throw new Error("Password fields cannot be empty");
            }

            if (userData.password !== userData.password2) {
                throw new Error("Passwords do not match");
            }

            const hash = await bcrypt.hash(userData.password, 10);
            const newUser = new User({
                userName: userData.userName,
                password: hash,
                email: userData.email,
                loginHistory: []
            });

            await newUser.save();
            return Promise.resolve();
        } catch (err) {
            if (err.code === 11000) {
                return Promise.reject("User Name already taken");
            }
            return Promise.reject(err.message || "Error creating user");
        }
    },

    checkUser: async function(userData) {
        try {
            await getConnection();
            const user = await User.findOne({ userName: userData.userName });
            
            if (!user) {
                throw new Error(`Unable to find user: ${userData.userName}`);
            }

            const match = await bcrypt.compare(userData.password, user.password);
            if (!match) {
                throw new Error(`Incorrect Password for user: ${userData.userName}`);
            }

            if (user.loginHistory.length === 8) {
                user.loginHistory.pop();
            }

            user.loginHistory.unshift({
                dateTime: new Date(),
                userAgent: userData.userAgent
            });

            await User.updateOne(
                { userName: user.userName },
                { $set: { loginHistory: user.loginHistory }}
            );

            return Promise.resolve(user);
        } catch (err) {
            return Promise.reject(err.message);
        }
    }
};