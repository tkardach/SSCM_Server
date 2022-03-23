const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const crypto = require('crypto')
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const sheets = require('../modules/google/sheets');
const { logError } = require('../debug/logging')


const forgot_pw_body = `
<p>
You are receiving this because you (or someone else) have requested to reset your Saratoga Swim Club account password.
Please click on the following link to reset your password
</p>
<a href="{0}">{0}</a>
<p>
This link will expire in 1 hour. If you did not request this, please ignore this email and your password will remain unchanged.
</p>
`

const reset_success_body = `
<p>
This is a confirmation that your password has been successfully reset! 

If you did not reset your password, please contact the board of directors.
</p>
`
      

router.get('/jwt', [auth], (req, res) => {
  return res.status(200).json({
    user_id: req.user.user_id,
    is_admin: req.user.is_admin,
    member_id: req.user.member_id
  });
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!(email && password))
      return res.status(400).send("Email and password are required");

    let user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        { 
          user_id: user._id, 
          member_id: user.memberId,
          is_admin: user.isAdmin
        },
        config.get('jwtPrivateKey'),
        { expiresIn: "2h" }
      );

      res.cookie('token', token, { httpOnly: true });

      return res.status(200).json({
        user_id: user._id,
        is_admin: user.isAdmin,
        member_id: user.memberId
      });
    }

    return res.status(400).send("Invalid credentials");
  } catch (err) {
    console.log(err);
  }
});

router.post('/create-account', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!(email && password))
      return res.status(400).send("Email and password are required");

    const oldUser = await User.findOne({ email });

    if (oldUser) 
      return res.status(409).send("User already exists. Please login");

    const allMembers = await sheets.getAllMembers(false);

    // Check if member making reservation exists
    const members = allMembers.filter(member => 
      member.primaryEmail.toLowerCase() === email.toLowerCase() ||
      member.secondaryEmail.toLowerCase() === email.toLowerCase());

    if (members.length > 1) 
      return res.status(400).send("More than one member has this email, contact the board of directors");
    
    if (members.length === 0)
      return res.status(404).send("No member with this email was found");

    const member = members[0];

    encryptedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: email.toLowerCase(),
      password: encryptedPassword,
      memberId: member.id
    });

    const token = jwt.sign(
      { 
        user_id: user._id, 
        member_id: user.memberId,
        is_admin: user.isAdmin
      },
      config.get('jwtPrivateKey'),
      {
        expiresIn: "2h"
      }
    );
    
    res.cookie('token', token, { httpOnly: true });

    delete user.email;
    delete user.password;

    return res.status(200).json({
      user_id: user._id,
      is_admin: user.isAdmin,
      member_id: user.memberId
    });
  }
  catch (err) {
    console.log(err);
  }
});

router.get('/logout', [auth], (req, res) => {
  res.cookie('token', 'none',  {
    expires: new Date(Date.now() + 5  * 1000),
    httpOnly: true
  });

  res.status(200).send("User logged out successfully");
});


router.post('/forgot', async (req, res) => {
  try {
    if (!req.body.email) 
      return res.status(400).send('Email is required to reset password');

    var token = crypto.randomBytes(20).toString('hex');

    const user = await User.findOneAndUpdate({ email: req.body.email }, {
      resetPasswordToken: token,
      resetPasswordExpires: Date.now() + 3600000
    },{
      new: true
    });

    if (!user) 
      return res.status(404).send('No account with that email address exists.');

    const url = 'https://' + req.headers.host + '/reset-password/' + token;

    var smtpTransport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.get('gmailAccount'),
        pass: config.get('gmailPass')
      }
    });

    var mailOptions = {
      to: req.body.email,
      from: config.get('gmailAccount'),
      subject: 'Saratoga Swim Club Password Reset',
      html: forgot_pw_body.format(url)
    };

    await smtpTransport.sendMail(mailOptions);
  
    return res.status(200).json('Email sent');
  } catch (err) {
    return res.status(500).send(`Error occured while sending email verification: ${err}`);
  }
});

router.get('/reset/:token', async (req, res) => {
  const user = await User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } });
  if (!user) 
    return res.status(404).send("Link to password reset not found, please try again.")
  res.render('reset', {
    user: req.user
  });
});

router.post('/reset/:token', async (req, res, next) => {
  try {
    const user = await User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) 
      return res.status(404).send("Request for password reset not found, please try again.");
  
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
  
    await user.save(function(err) {
      if (err) 
        return res.status(500).send('Error while attempting to reset password')
    });
    
    var smtpTransport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.get('gmailAccount'),
        pass: config.get('gmailPass')
      }
    });

    var mailOptions = {
      to: user.email,
      from: config.get('gmailAccount'),
      subject: 'Swim Club Password Reset Success',
      text: reset_success_body
    };
    smtpTransport.sendMail(mailOptions);
  
    return res.status(200).json('Password Reset');
  } catch (err) {
    return res.status(500).send('Error occured during password reset ')
  }
});


module.exports = router;