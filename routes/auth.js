const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  console.log(req.body)
  res.send({
    token: 'test123'
  });
});

router.post('/create-account', (req, res) => {
  console.log(req.body)
  res.send({
    token: 'test123'
  });
});

module.exports = router;