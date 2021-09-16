/**
 *  Routes.js establishes the following:
 *    1. Sets up all middleware which requests will travel up to the final api destination
 *    2. Initializes the api destinations
 * 
 *  Note: express-session code has been commented out, we may want to use user sessions in the future
 */

 const authentication = require('../routes/auth');
 const error = require('../middleware/error');
 
 module.exports = function (app) {
   app.use('/api/authenticate', authentication);
 
   // Error handling middleware
   app.use(error);
 }