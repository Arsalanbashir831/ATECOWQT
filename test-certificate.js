require('dotenv').config();
const qrcode = require('qrcode');
const cloudinary = require('cloudinary').v2;
const Certificate = require('./models/certificateModel');
const mongoose = require('mongoose');

async function testCertificateInsertion() {


    try {
        // 1. Test MongoDB connection


        // 2. Test Cloudinary connection

        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        
        const pingResult = await cloudinary.api.ping();


        // 3. Test QR code generation

        const testUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/certificate/view/test_certificate`;
        const qrDataUri = await qrcode.toDataURL(testUrl, {
            margin: 1,
            width: 200,
        });


        // 4. Test Cloudinary upload

        const qrUpload = await cloudinary.uploader.upload(qrDataUri, {
            folder: 'certificates/test',
            public_id: 'cert-test-qr',
            overwrite: true,
        });


        // 5. Test certificate creation

        const testCertificate = await Certificate.create({
            count: 999,
            certificateNo: 'test_certificate',
            welderId: 'w-999',
            clientName: 'Test Client',
            welderName: 'Test Welder',
            profilePic: 'https://example.com/test.jpg',
            qrLink: qrUpload.secure_url,
            identification_wps: 'TEST-WPS-001',
            iqamaNo: 'TEST-IQAMA-001',
            qualifcationStandard: 'AWS D1.1',
            baseMetalSpecs: 'A36',
            wtaRef: 'TEST-REF-001',
            jointType: 'Butt Joint',
            date_of_test: '2024-01-01',
            weldType: 'GMAW',
            year: '2024',
            supervisorName: 'Test Supervisor',
            welderInspector: 'Test Inspector'
        });


        // 6. Clean up test data

        await Certificate.findOneAndDelete({ certificateNo: 'test_certificate' });
        await cloudinary.api.delete_resources(['certificates/test/cert-test-qr'], { resource_type: 'image' });
        await cloudinary.api.delete_folder('certificates/test');




    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Error details:', error);
        
        if (error.name === 'ValidationError') {


        }
    } finally {
        await mongoose.disconnect();

    }
}

testCertificateInsertion();
