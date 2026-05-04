const mongoose = require('mongoose');
const Card = require('./models/cardModel');
const Certificate = require('./models/certificateModel');
const Operator = require('./models/operatorModel');

async function peek() {
    try {
        await mongoose.connect('mongodb://localhost:27017/ateco');
        console.log('Connected to DB');

        const card = await Card.findOne({ card_no: /c-/ });
        const cert = await Certificate.findOne({ certificateNo: /certificate_/ });
        const oper = await Operator.findOne({ operatorNo: /operator_/ });

        console.log('Card Peek:', card ? { count: card.count, card_no: card.card_no } : 'None');
        console.log('Cert Peek:', cert ? { count: cert.count, certificateNo: cert.certificateNo } : 'None');
        console.log('Oper Peek:', oper ? { count: oper.count, operatorNo: oper.operatorNo } : 'None');

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

peek();
