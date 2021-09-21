const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const auth = require('../middleware/auth');
const sheets = require('../modules/google/sheets');
const { logError } = require('../debug/logging')

router.get('/jwt', [auth], (req, res) => {
  return res.status(200).json({
    user_id: req.user,
    member_id: req.memberId
  });
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!(email && password))
      return res.status(400).send("Email and password are required");

    let user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      // memberId added after initial release, add if it doesn't exist
      if (!user.memberId) {
        const allMembers = await sheets.getAllMembers(false);
  
        // Check if member making reservation exists
        const members = allMembers.filter(member => 
          member.primaryEmail.toLowerCase() === user.email.toLowerCase() ||
          member.secondaryEmail.toLowerCase() === user.email.toLowerCase());
    
        if (members.length > 1) {
          const err = {
            message: "Multiple members with email exist",
            email: user.email
          }
  
          logError(err, "Multiple members with same email found")
        } else if (members.length === 0) {
          const err = {
            message: "User not found in member database",
            email: user.email
          }
  
          logError(err, "User not found in member database")
        } else {
          user = await User.findByIdAndUpdate(user._id, {
            memberId: members[0].id
          }, {new: true});
        }
      }

      const token = jwt.sign(
        { 
          user_id: user._id, 
          member_id: user.memberId 
        },
        config.get('jwtPrivateKey'),
        { expiresIn: "2h" }
      );

      res.cookie('token', token, { httpOnly: true });

      return res.status(200).json({
        isAdmin: user.isAdmin,
        memberId: user.memberId
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
        member_id: user.memberId 
      },
      config.get('jwtPrivateKey'),
      {
        expiresIn: "2h"
      }
    );
    
    res.cookie('token', token, { httpOnly: true });

    delete user.email;
    delete user.password;

    return res.status(201).json({
      isAdmin: user.isAdmin,
      memberId: user.memberId
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

module.exports = router;