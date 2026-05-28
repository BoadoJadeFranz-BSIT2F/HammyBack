// Vercel serverless entry that mounts the existing Express app
const path = require('path');
// Ensure backend modules can resolve relative paths correctly
const app = require(path.join(__dirname, '..', '..', 'backend', 'app.js'));

module.exports = (req, res) => {
  // Express app is a request handler: call it directly
  app(req, res);
};
