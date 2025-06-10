#!/bin/bash

# Fail on any error
set -e

# Increase Node.js memory limit
export NODE_OPTIONS=--max_old_space_size=4096

# Print environment info
echo "Node version: $(node -v)"
echo "Yarn version: $(yarn -v)"

# Install dependencies globally if needed
echo "Installing react-scripts globally..."
yarn global add react-scripts@5.0.1

# Install project dependencies
echo "Installing project dependencies..."
yarn install --frozen-lockfile --network-timeout 300000

# Verify react-scripts is available
echo "Verifying react-scripts..."
npx react-scripts --version

# Build the application with more detailed output
echo "Building application..."
GENERATE_SOURCEMAP=false CI=false npx react-scripts build --max_old_space_size=4096

echo "Build completed successfully!"
