const {securityLogger} = require('../debug/logging');
const jwt = require('jsonwebtoken');
const config = require('config');

const decodeToken = (req, res, next) => {
  const token =
    req.body.token || req.query.token || req.headers["x-access-token"];

  if (!token)
    return next();
  
  try {
    const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
    req.user = decoded;
  } catch (err) {
    
  }

  return next();
};

module.exports = decodeToken;