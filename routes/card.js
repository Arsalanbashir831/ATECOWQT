var express = require('express');
var mongoose = require('mongoose');
var qrcode = require('qrcode');
const fs = require('fs');
const Card = require('../models/cardModel');
const path = require('path');
const { time } = require('console');
var router = express.Router();

router.get("/", async (req, res) => {
    res.render("insertCard");
})

router.post("/insert", async (req, res) => {

    try {
        let body = req.body;
        const last_one = await Card.findOne().sort({ _id: -1 }).exec();
        let no = 1;
        if (last_one) {
            console.log(last_one)
            no = last_one.count + 1;
        }
        body['count'] = no;
        body['welder_id'] = "w-" + no;
        body['card_no'] = "c-" + no;



        let folder_name = "./uploads/" + body['card_no'];
        console.log(folder_name)
        if (!fs.existsSync(folder_name)) {
            fs.mkdirSync(folder_name, (err) => {
                if (err) {
                    console.error('Error creating directory:', err);
                } else {
                    console.log('Directory created successfully');
                }
            });
        }


        if (req.files !== null) {
            const file = req.files.card;
            let fname = body['card_no'] + ".jpg"
            await file.mv("./uploads/" + body['card_no'] + "/" + fname, (err) => {
                if (err) {
                    console.error('Error moving File:', err);
                } else {
                    console.log('File moving successfully');
                    body['image'] = body['card_no'] + ".jpg"
                }
            })
        }

        await qrcode.toFile("./uploads/" + body['card_no'] + "/" + body['card_no'] + ".png", "https://atecowqt.onrender.com/card/view/" + body['card_no']);
        body['qr'] = body['card_no'] + ".png"
        const card = await Card.create(body);
        const record = card
        res.render("viewCard", { 'record': record })
        // res.send(card);
    }
    catch (err){
        res.send(err);
    }
})

router.get("/view/:card_no", async (req, res) => {
    let card_no = req.params.card_no;

    const record = await Card.findOne({ "card_no": card_no }).exec()
    console.log(record)
    if (record) {
        res.render("viewCard", { 'record': record })
    }
    else {
        res.status(404).json({ "Status": "FAILED" });
    }
})


router.get("/edit/:card_no", async (req, res) => {
    let card_no = req.params.card_no;
    const record = await Card.findOne({ "card_no": card_no }).exec();
    console.log(record)
    if (record) {
        res.render("editCard", { 'record': record })
    }
    else {
        res.status(404).json({ "Status": "FAILED" });
    }
})
router.get("/delete/:card_no", async (req, res) => {
    try {
        const card_no = req.params.card_no;
        // Find the document to delete
        const deletedRecord = await Card.findOneAndDelete({ card_no: card_no });

        if (deletedRecord) {
            if (fs.existsSync(`./uploads/${card_no}`)) {
                fs.rmdirSync(`./uploads/${card_no}`, { recursive: true, force: true });
            }
            res.redirect('/supervisor')
            // res.status(200).json({ message: "Record deleted successfully" });
        } else {
            res.status(404).json({ error: "Record not found" });
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


router.post("/update/:card_no", async (req, res) => {
    let card_no = req.params.card_no;
    console.log(req.files);

    let body = req.body;
    let folder_name = "./uploads/" + card_no;
    console.log(card_no)

    try {

        if (req.files !== null) {
            const file = req.files.card;
            if (fs.existsSync(folder_name)) {
                console.log("EXISTS");
                fs.rmdirSync(folder_name, { recursive: true, force: true });
            }

            fs.mkdirSync(folder_name, (err) => {
                if (err) {
                    console.error('Error creating directory:', err);
                } else {
                    console.log('Directory created successfully');
                }
            });

            let fname = body['card_no'] + ".jpg"
            await file.mv("./uploads/" + "/" + body['card_no'] + "/" + fname, (err) => {
                if (err) {
                    console.error('Error moving File:', err);
                } else {
                    console.log('File moving successfully');
                }
            })
        }

        await qrcode.toFile("./uploads/" + body['card_no'] + "/" + body['card_no'] + ".png", "https://atecowqt.onrender.com/card/view/" + body['card_no']);
        body['qr'] = body['card_no'] + ".png"
        body['image'] = body['card_no'] + ".jpg"

        body['card_no'] = card_no;

        const da = await Card.findOneAndDelete({ "card_no": card_no }).exec();
        body['count'] = da.count;
        body['welder_id'] = da.welder_id;
        console.log("-------------------DELETED-------------------------")
        console.log(da)

        const updatedRecord = await Card.create(body);


        res.redirect("/card/view/" + card_no);
    }
    catch (err) {
        console.log(err);
        res.status(404).send(err);
    }
})
module.exports = router;