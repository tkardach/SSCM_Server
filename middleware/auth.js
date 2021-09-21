const {securityLogger} = require('../debug/logging');
const jwt = require('jsonwebtoken');
const config = require('config');

const auth = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    securityLogger.log({
      level: 'warn',
      message: 'status 403 : Not Authorized',
      meta: [req.body]
    });
    
    return res.status(403).send("Not authorized");
  }
  
  try {
    const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
    req.user = decoded;
  } catch (err) {
    securityLogger.log({
      level: 'warn',
      message: 'status 401 : Invalid Token',
      meta: [token]
    });
    return res.status(401).send("Invalid Token");
  }

  return next();
};

module.exports = auth;