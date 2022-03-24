const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('./shared/extensions');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

// Initialize api routes
require('./startup/routes')(app);

// Initialize Database
require('./startup/db')();

module.exports = app;