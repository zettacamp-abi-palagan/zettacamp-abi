// *************** IMPORT CORE ***************
const mongoose = require('mongoose');

// *************** IMPORT MODULE ***************
const config = require('./config');

const mongo_uri = config.MONGO_URI

/**
 * Establishes a connection to the MongoDB database.
 * The function will terminate the application process if the MONGO_URI is not defined
 * or if the connection to MongoDB fails.
 * @returns {Promise<void>} A promise that resolves if the connection is successful.
 * However, the primary outcomes are either a successful connection
 * log or process termination on error.
 */
async function ConnectDB() {
    if (!mongo_uri) {
        console.error('MongoDB connection error: MONGO_URI is not defined in environment variables.');
        process.exit(1);
    }

    try {
        await mongoose.connect(mongo_uri);
        await mongoose.set('debug', true);
        console.log('Successfully connected to MongoDB.');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
}

// *************** EXPORT MODULE ***************
module.exports = ConnectDB;