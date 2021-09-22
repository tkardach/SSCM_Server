const {securityLogger} = require('../debug/logging');
const jwt = require('jsonwebtoken');
const config = require('config');

async function admin(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    securityLogger.log({
      level: 'warn',
      message: 'status 403 : Access Denied',
      meta: [req.body]
    });
    
    return res.status(403).send("Access Denied");
  }
  
  try {
    const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
    req.user = decoded;

    if (!(req.user.user_id && req.user.is_admin && req.user.member_id))
      return res.status(403).send("Access Denied");
  } catch (err) {
    securityLogger.log({
      level: 'warn',
      message: 'status 401 : Invalid Token',
      meta: [token]
    });
    return res.status(401).send("Invalid Token");
  }

  return next();
}

module.exports = admin; 