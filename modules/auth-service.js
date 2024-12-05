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

let db;
let User;
let isInitialized = false;

function initialize() {
    return new Promise(async (resolve, reject) => {
        try {
            // If already initialized, resolve immediately
            if (isInitialized) {
                console.log("MongoDB: Already initialized");
                resolve();
                return;
            }

            const dbURI = process.env.MONGODB;
            console.log("MongoDB: Attempting connection");

            // Create MongoDB connection
            db = await mongoose.createConnection(dbURI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 15000,
                family: 4
            }).asPromise();

            // Define models after successful connection
            User = db.model("users", userSchema);
            isInitialized = true;
            console.log("MongoDB: Connection successful");
            resolve();

        } catch (err) {
            console.error("MongoDB Initialization Error:", err);
            reject(err);
        }
    });
}

async function registerUser(userData) {
    try {
        // Ensure database is initialized
        if (!isInitialized) {
            await initialize();
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
        console.error("Registration Error:", err);
        return Promise.reject(`There was an error creating the user: ${err.message}`);
    }
}

// Modify checkUser to ensure initialization
async function checkUser(userData) {
    try {
        // Ensure database is initialized
        if (!isInitialized) {
            await initialize();
        }

        const user = await User.findOne({ userName: userData.userName }).exec();
        if (!user) {
            throw new Error(`Unable to find user: ${userData.userName}`);
        }

        const passwordMatch = await bcrypt.compare(userData.password, user.password);
        if (!passwordMatch) {
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
            { $set: { loginHistory: user.loginHistory } }
        );

        return Promise.resolve(user);
    } catch (err) {
        return Promise.reject(err.message);
    }
}

module.exports = {
    initialize,
    registerUser,
    checkUser
};