var express = require('express');
const User = require('../models/userModel')
const Report = require('../models/reportModel')
const Card = require('../models/cardModel')
const Certificate = require('../models/certificateModel')
const Operator = require('../models/operatorModel')
const session = require('express-session')

var router = express.Router();

router.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

router.get('/', function (req, res, next) {
  req.session.destroy();
  res.render("authentication")
});
router.get('/supervisor', async (req, res) => {
  if (req.session.user==='supervisor') {
   
  const cardData = await Card.find().exec()
  const reportData = await Report.find().exec()
  const certificateData = await Certificate.find().exec()
  const operatorData = await Operator.find().exec()

  console.log("---------------- card DATA---------------------")
  console.log(cardData);
  console.log("---------------- card DATA END--------------------")

  


  res.render('Supervisor', { "cardData": cardData, "reportData": reportData, "certificateData": certificateData, "operatorData": operatorData })
   
}else{
  res.redirect('/')
}
})


router.get('/inspector', async (req, res) => {
if (req.session.user==='inspector') {
  const reportData = await Report.find().exec()
  res.render('inspector', { "reportData": reportData });
}else{
  res.redirect('/')
}
})
router.post('/auth', async function (req, res) {
  console.log(req.body);

  if (req.body.user_role === 'supervisor') {
    // Check if credentials match the hardcoded values
    if (req.body.id === "user123" && req.body.password === "supervisor1@3") {
      console.log('Hardcoded Supervisor User Found');
      req.session.user = "supervisor";
      console.log("Session:", req.session.user);
      return res.redirect('/supervisor');
    }

    
  }

  if (req.body.user_role === 'inspector') {
    console.log("Inspector Login Attempt");
    if (req.body.id === "user456" && req.body.password === "inspector1@3") {
      console.log('Hardcoded Inspector User Found');
      req.session.user = "inspector";
      return res.redirect('/inspector');
    }
  }

  // If user_role is not valid
  console.log('Invalid User Role');
  return res.redirect('/');
});


module.exports = router;
