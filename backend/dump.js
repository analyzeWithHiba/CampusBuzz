const mongoose = require('mongoose');

async function checkDb() {
    try {
        await mongoose.connect('mongodb://localhost:27017/college-events');

        const Registration = mongoose.model('Registration', new mongoose.Schema({}, { strict: false }));
        const Result = mongoose.model('Result', new mongoose.Schema({}, { strict: false }));

        const pubRegs = await Registration.find({ status: 'Result Published' }).lean();
        console.log("PUBLISHED REGS: ");
        pubRegs.forEach(r => console.log(`RegID: ${r._id}, UserID: ${r.userid}, EventID: ${r.eventid}, StudentID: ${r.admissionNumber}`));

        const results = await Result.find({}).lean();
        console.log("\nRESULTS: ");
        results.forEach(res => console.log(`ResID: ${res._id}, UserID: ${res.userid}, EventID: ${res.eventid}, Position: ${res.position}`));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkDb();
