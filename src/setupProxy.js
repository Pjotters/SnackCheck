const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_BACKEND_URL,
      changeOrigin: true,
      ws: false,
      secure: false,
      pathRewrite: {
        '^/api': '' // Verwijder de /api prefix bij het doorsturen
      },
      logLevel: 'debug' // Voeg logging toe voor debugging
    })
  );
};
