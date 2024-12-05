const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;
require('dotenv').config();

let connection = null;

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

class MongoConnection {
    constructor() {
        if (!connection) {
            connection = this.connect();
        }
        return connection;
    }

    async connect() {
        if (connection) return connection;

        try {
            const conn = await mongoose.createConnection(process.env.MONGODB, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                bufferCommands: false,
                serverSelectionTimeoutMS: 5000
            }).asPromise();

            conn.model('users', userSchema);
            console.log('MongoDB Connected');
            return conn;
        } catch (err) {
            console.error('MongoDB Connection Error:', err);
            throw err;
        }
    }
}

const dbConnection = new MongoConnection();

module.exports = {
    initialize: async function() {
        try {
            const conn = await dbConnection;
            return Promise.resolve();
        } catch (err) {
            return Promise.reject(err);
        }
    },

    registerUser: async function(userData) {
        try {
            const conn = await dbConnection;
            const User = conn.model('users');

            if (userData.password !== userData.password2) {
                return Promise.reject("Passwords do not match");
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
            return Promise.reject(`There was an error creating the user: ${err.message}`);
        }
    },

    checkUser: async function(userData) {
        try {
            const conn = await dbConnection;
            const User = conn.model('users');

            const user = await User.findOne({ userName: userData.userName });
            
            if (!user) {
                throw new Error(`Unable to find user: ${userData.userName}`);
            }

            const valid = await bcrypt.compare(userData.password, user.password);
            
            if (!valid) {
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