const mongoose = require('mongoose');
const Card = require('../models/cardModel');
const AasiaSteelCard = require('../models/aasiaSteelCardModel');
const Certificate = require('../models/certificateModel');
const Operator = require('../models/operatorModel');

const MONGO_URI = 'mongodb://localhost:27017/ateco';
const OFFSET = 999; // Shifting sequence 1 to 1000 (1 + 999)

async function updateSequences() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const updateField = (val) => {
            if (typeof val === 'number') {
                return val + OFFSET;
            }
            if (typeof val === 'string') {
                // Find the trailing number and add the offset
                return val.replace(/\d+$/, (match) => {
                    return parseInt(match) + OFFSET;
                });
            }
            return val;
        };

        // 1. Update Cards (count, card_no)
        console.log('Updating Cards...');
        const cards = await Card.find({});
        for (let doc of cards) {
            let changed = false;
            if (doc.count !== undefined) { doc.count = updateField(doc.count); changed = true; }
            if (doc.card_no) { doc.card_no = updateField(doc.card_no); changed = true; }
            if (changed) await doc.save();
        }
        console.log(`Updated ${cards.length} Cards.`);

        // 2. Update Aasia Steel Cards (count, card_no)
        console.log('Updating AasiaSteelCards...');
        const aasiaCards = await AasiaSteelCard.find({});
        for (let doc of aasiaCards) {
            let changed = false;
            if (doc.count !== undefined) { doc.count = updateField(doc.count); changed = true; }
            if (doc.card_no) { doc.card_no = updateField(doc.card_no); changed = true; }
            if (changed) await doc.save();
        }
        console.log(`Updated ${aasiaCards.length} AasiaSteelCards.`);

        // 3. Update Certificates (count, certificateNo)
        console.log('Updating Certificates...');
        const certs = await Certificate.find({});
        for (let doc of certs) {
            let changed = false;
            if (doc.count !== undefined) { doc.count = updateField(doc.count); changed = true; }
            if (doc.certificateNo) { doc.certificateNo = updateField(doc.certificateNo); changed = true; }
            if (changed) await doc.save();
        }
        console.log(`Updated ${certs.length} Certificates.`);

        // 4. Update Operators (count, operatorNo)
        // NOTE: We MUST NOT update certificateNo here
        console.log('Updating Operators...');
        const operators = await Operator.find({});
        for (let doc of operators) {
            let changed = false;
            if (doc.count !== undefined) { doc.count = updateField(doc.count); changed = true; }
            if (doc.operatorNo) { doc.operatorNo = updateField(doc.operatorNo); changed = true; }
            if (changed) await doc.save();
        }
        console.log(`Updated ${operators.length} Operators.`);

        console.log('Sequence update completed successfully.');
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error updating sequences:', err);
        process.exit(1);
    }
}

updateSequences();
