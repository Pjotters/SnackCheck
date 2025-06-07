// Load environment variables
require('dotenv').config();

// Disable WebSocket and other problematic features
process.env.WDS_SOCKET_PORT = '0';
process.env.FAST_REFRESH = 'false';
process.env.DISABLE_WEBSOCKET = 'true';

// Set port
process.env.PORT = process.env.PORT || '3003';

console.log('Starting app with config:');
console.log('- PORT:', process.env.PORT);
console.log('- REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL);
console.log('- WDS_SOCKET_PORT:', process.env.WDS_SOCKET_PORT);
console.log('- DISABLE_WEBSOCKET:', process.env.DISABLE_WEBSOCKET);

// Start the app
const { execSync } = require('child_process');

try {
  execSync('react-scripts start', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to start app:', error);
  process.exit(1);
}
