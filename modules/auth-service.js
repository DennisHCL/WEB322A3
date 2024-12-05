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
            console.log("Starting MongoDB initialization check");
            
            // If already initialized, resolve immediately
            if (isInitialized && User) {
                console.log("MongoDB: Already initialized");
                resolve();
                return;
            }

            console.log("MongoDB: New initialization required");
            const dbURI = process.env.MONGODB;
            
            db = await mongoose.createConnection(dbURI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 15000,
                family: 4
            }).asPromise();

            // Define model
            User = db.model("users", userSchema);
            isInitialized = true;
            console.log("MongoDB: Initialization complete - User model created");
            resolve();

        } catch (err) {
            console.error("MongoDB Initialization Error:", err);
            isInitialized = false;
            User = null;
            reject(err);
        }
    });
}

async function registerUser(userData) {
    console.log("Starting user registration process");
    
    try {
        // Force initialization check
        if (!isInitialized || !User) {
            console.log("Database not initialized, attempting initialization");
            await initialize();
        }

        // Validate passwords
        if (userData.password !== userData.password2) {
            console.log("Password mismatch detected");
            throw new Error("Passwords do not match");
        }

        console.log("Hashing password...");
        const hash = await bcrypt.hash(userData.password, 10);
        
        console.log("Creating new user document");
        const newUser = new User({
            userName: userData.userName,
            password: hash,
            email: userData.email,
            loginHistory: []
        });

        console.log("Attempting to save user");
        await newUser.save();
        console.log("User saved successfully");
        
        return Promise.resolve();
    } catch (err) {
        console.error("Registration error details:", err);
        
        if (err.code === 11000) {
            return Promise.reject("User Name already taken");
        }
        
        if (!isInitialized || !User) {
            return Promise.reject("Database not initialized. Please try again.");
        }
        
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