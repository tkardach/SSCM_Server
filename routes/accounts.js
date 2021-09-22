const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const express = require('express');
const router = express.Router();
const sheets = require('../modules/google/sheets');


// GET from the database
router.get('/', [admin], async (req, res) => {
  const accounts = await sheets.getAllAccountsDict(false);

  res.status(200).send(accounts);
});

router.get('/my-account', [auth], async (req, res) => {
  
  const accounts = await sheets.getAllAccountsDict(true);

  const userAccount = accounts[req.user.member_id];

  if (!userAccount)
    return res.status(404).send("Could not find account with given ID");

  const dues = await sheets.getAllOverdueDict();

  userAccount.dues = {};

  const userDues = dues[req.user.member_id];
  if (userDues)
    userAccount.dues = userDues;

  res.status(200).send(userAccount);
});

module.exports = router;