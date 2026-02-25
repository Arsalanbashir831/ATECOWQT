require('dotenv').config();

console.log('🔍 Checking environment variables...\n');

const requiredVars = [
    'DB',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
];

const optionalVars = [
    'FRONTEND_URL',
    'NODE_ENV'
];

let allGood = true;

requiredVars.forEach(varName => {
    if (process.env[varName]) {
        console.log(`✅ ${varName}: ${process.env[varName].substring(0, 20)}...`);
    } else {
        console.log(`❌ ${varName}: NOT SET`);
        allGood = false;
    }
});

optionalVars.forEach(varName => {
    if (process.env[varName]) {
        console.log(`✅ ${varName}: ${process.env[varName]}`);
    } else {
        console.log(`⚠️  ${varName}: NOT SET (using default)`);
    }
});

console.log('\n' + (allGood ? '🎉 All required variables are set!' : '❌ Some required variables are missing. Please check your .env file.'));

if (!allGood) {
    console.log('\n📝 Please create a .env file with the following variables:');
    console.log('DB=mongodb://localhost:27017/your_database_name');
    console.log('CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name');
    console.log('CLOUDINARY_API_KEY=your_cloudinary_api_key');
    console.log('CLOUDINARY_API_SECRET=your_cloudinary_api_secret');
    console.log('FRONTEND_URL=http://localhost:4200 (optional)');
    console.log('NODE_ENV=development (optional)');
}
