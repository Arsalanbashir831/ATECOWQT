var express = require('express');
var mongoose = require('mongoose');
var qrcode = require('qrcode');
const fs = require('fs');
const Certificate = require('../models/certificateModel');
const path = require('path');
var router = express.Router();

router.get("/", async (req, res) => {
    res.render("insertCertificate")
})

router.post("/insert", async (req, res) => {

    try {
        const body = req.body;
        // body['serial_no'] = Report.find().count()+1;
        
        const last_one = await Certificate.findOne().sort({ _id: -1 }).exec();

        let no = 1;
        console.log(last_one == NaN);
        if (last_one && last_one != NaN) {
            console.log(last_one)
            no = last_one.count + 1;
            console.log("HELOOOOOOOOOOOOOOOOOOOOo")
        }
        console.log(no);
        body['count'] = no;
        body['certificateNo'] = "certificate_" + String(no);
        body['welderId'] = "w-" + no;
        console.log(body['certificateNo']);
        if (fs.existsSync("./uploads/certificates/" + body['certificateNo']) == false) {
            fs.mkdirSync("./uploads/certificates/" + body['certificateNo'], (err) => {
                console.log(err);
            })
        }


        // const iqama = req.files.iqama;
        const profile = req.files.profile;


        // await iqama.mv("./uploads/certificates/" + body['certificateNo'] + "/iqama.jpg", (err)=>{
        //     console.log(err);
        // })

        await profile.mv("./uploads/certificates/" + body['certificateNo'] + "/profile.jpg", (err) => {
            console.log(err);
        })

        await qrcode.toFile("./uploads/certificates/" + body['certificateNo'] + "/qrcode.png", "https://atecowqt.onrender.com/certificate/view/" + body['certificateNo']);

        const cerf = await Certificate.create(req.body);
        const record = cerf
        // res.send(cerf);
        res.redirect("/certificate/view/" + body['certificateNo']);
    }
    catch(err){
        res.send(err);
    }

})

router.get("/view/:certificateNo", async (req, res) => {
    const certificateNo = req.params.certificateNo;

    const record = await Certificate.findOne({ "certificateNo": certificateNo }).exec();

    if (record) {
        res.render("viewCertificate", { record });
        console.log(record.certificateNo);
    }
    else {
        res.status(404).send("No Record Found");
    }

})

router.post("/edit/:certificateNo", async (req, res) => {
    const record = await Certificate.findOne({ "certificateNo": req.params.certificateNo }).exec();

    if (record) {
        res.render("EditCertificate", { record });
        console.log(record.certificateNo);
    }
    else {
        res.status(404).send("No Record Found");
    }
})

router.get("/delete/:doc_id", async (req, res) => {
    try {
        const doc_id = req.params.doc_id;
        // Find the document to delete
        const deletedRecord = await Certificate.findOneAndDelete({ certificateNo: doc_id });

        if (deletedRecord) {
            if (fs.existsSync(`./uploads/certificates/${doc_id}`)) {
                fs.rmdirSync(`./uploads/certificates/${doc_id}`, { recursive: true, force: true });
            }
            res.redirect('/supervisor')
            // res.status(200).json({ message: "Record deleted successfully" });
        } else {
            res.status(404).json({ error: "Record not found" });
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send(error);
    }
});


router.post("/update/:certificateNo", async (req, res) => {
    try {
        let body = req.body;
        let certificateNo = req.params.certificateNo;


        if (req.files !== null) {
            if (req.files.profile !== null && req.files.profile !== undefined) {
                const profile = req.files.profile;
                await profile.mv("./uploads/certificates/" + certificateNo + "/profile.jpg")
            }

            // if (req.files.iqama !== undefined && req.files.iqama !== null){
            //     const iqama = req.files.iqama;
            //     await iqama.mv("./uploads/certificates/" + certificateNo + "/iqama.jpg")
            // }

        }

        await qrcode.toFile("./uploads/certificates/" + certificateNo + "/qrcode.png", "https://atecowqt.onrender.com/certificate/view/" + certificateNo);

        body['certificateNo'] = certificateNo;
        

        const da = await Certificate.findOneAndDelete({ "certificateNo": certificateNo })
        if (da['count'] === null) {
            body['count'] = certificateNo.split("_")[1];
        }
        else
            body['count'] = da['count']

        body['welderId'] = "w-" + certificateNo.split("_")[1];
        console.log(body['count']);

        const updated = await Certificate.create(req.body);
        
        res.redirect("/certificate/view/" + certificateNo);
    }
    catch (err) {
        console.error(err);
        res.send(err);
    }


})
module.exports = router;

