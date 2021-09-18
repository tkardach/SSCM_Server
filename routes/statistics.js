const express = require('express');
const router = express.Router();
const sheets = require('../modules/google/sheets');
const {cache} = require('../middleware/cache')

router.get('/signins', [cache(3600)], async (req, res) => {
  const signins = await sheets.getAllSignins(true);

  res.status(200).send(signins);
});

module.exports = router;