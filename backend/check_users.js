const mongoose = require('mongoose');
const User = require('./routes/users'); // This is a router, not the model

// Define User model explicitly if needed, or just require the model
const UserSchema = new mongoose.Schema({
    uid: String,
    email: String,
    role: String
}, { strict: false });
const UserM = mongoose.model('UserTemp', UserSchema, 'users');

async function checkUsers() {
    try {
        await mongoose.connect('mongodb://localhost:27017/college-events');
        const users = await UserM.find({}).select('uid email role');
        console.log('USERS IN DB:');
        console.log(JSON.stringify(users, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkUsers();
