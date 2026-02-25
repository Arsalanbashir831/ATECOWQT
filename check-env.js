require('dotenv').config();



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

    } else {

        allGood = false;
    }
});

optionalVars.forEach(varName => {
    if (process.env[varName]) {

    } else {

    }
});



if (!allGood) {

}
