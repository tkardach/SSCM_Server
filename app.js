const express = require('express');
const app = express();
const config = require('config');
const cors = require('cors')

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

// Initialize api routes
require('./startup/routes')(app);

// Initialize Database
require('./startup/db')();

module.exports = app;