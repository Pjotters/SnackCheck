#!/bin/bash

# Fail on any error
set -e

# Increase Node.js memory limit
export NODE_OPTIONS=--max_old_space_size=4096

# Install dependencies
echo "Installing dependencies..."
yarn install --frozen-lockfile

# Build the application
echo "Building application..."
GENERATE_SOURCEMAP=false CI=false react-scripts build

echo "Build completed successfully!"
