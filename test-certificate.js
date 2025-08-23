require('dotenv').config();
const qrcode = require('qrcode');
const cloudinary = require('cloudinary').v2;
const Certificate = require('./models/certificateModel');
const mongoose = require('mongoose');

async function testCertificateInsertion() {
    console.log('🧪 Testing Certificate Insertion Process...\n');

    try {
        // 1. Test MongoDB connection
        console.log('1. Testing MongoDB connection...');
        await mongoose.connect(process.env.DB);
        console.log('✅ MongoDB connected successfully\n');

        // 2. Test Cloudinary connection
        console.log('2. Testing Cloudinary connection...');
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        
        const pingResult = await cloudinary.api.ping();
        console.log('✅ Cloudinary connected successfully:', pingResult.message, '\n');

        // 3. Test QR code generation
        console.log('3. Testing QR code generation...');
        const testUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/certificate/view/test_certificate`;
        const qrDataUri = await qrcode.toDataURL(testUrl, {
            margin: 1,
            width: 200,
        });
        console.log('✅ QR code generated successfully\n');

        // 4. Test Cloudinary upload
        console.log('4. Testing Cloudinary upload...');
        const qrUpload = await cloudinary.uploader.upload(qrDataUri, {
            folder: 'certificates/test',
            public_id: 'cert-test-qr',
            overwrite: true,
        });
        console.log('✅ QR code uploaded to Cloudinary:', qrUpload.secure_url, '\n');

        // 5. Test certificate creation
        console.log('5. Testing certificate creation...');
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
        console.log('✅ Certificate created successfully:', testCertificate._id, '\n');

        // 6. Clean up test data
        console.log('6. Cleaning up test data...');
        await Certificate.findOneAndDelete({ certificateNo: 'test_certificate' });
        await cloudinary.api.delete_resources(['certificates/test/cert-test-qr'], { resource_type: 'image' });
        await cloudinary.api.delete_folder('certificates/test');
        console.log('✅ Test data cleaned up\n');

        console.log('🎉 All tests passed! Your certificate insertion should work properly.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Error details:', error);
        
        if (error.name === 'ValidationError') {
            console.log('\n📝 Validation Error Details:');
            Object.keys(error.errors).forEach(key => {
                console.log(`- ${key}: ${error.errors[key].message}`);
            });
        }
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 MongoDB disconnected');
    }
}

testCertificateInsertion();
