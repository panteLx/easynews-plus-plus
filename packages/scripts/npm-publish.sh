#!/bin/bash

# Check if the script is being run from the root of the project
if [ ! -f package.json ] || [ ! -d packages ]; then
    echo "Error: This script must be run from the root of the project."
    exit 1
fi

# Ensure we have a clean build
echo "Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "Error: Build failed. Aborting."
    exit 1
fi

# Check if user is logged in to npm
echo "Checking npm authentication..."
npm whoami &> /dev/null

if [ $? -ne 0 ]; then
    echo "Error: You are not logged in to npm. Please run 'npm login' first."
    exit 1
fi

# Read the current version from package.json
VERSION=$(node -e "console.log(require('./package.json').version)")
echo "Current version is $VERSION"

# Publish only the main package
echo "Publishing easynews-plus-plus@$VERSION to npm..."
npm publish --access public

if [ $? -eq 0 ]; then
    echo "Package successfully published to npm!"
else
    echo "Error: Failed to publish package."
    exit 1
fi 