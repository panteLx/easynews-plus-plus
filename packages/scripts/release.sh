#!/bin/bash

# Check if the script is being run from the root of the project
if [ ! -f package.json ]; then
    echo "Error: This script must be run from the root of the project."
    exit 1
fi

# Read the current version from package.json
VERSION=$(jq -r '.version' package.json)

# Function to increment the version
increment_version() {
    local version=$1
    local part=$2

    IFS='.' read -r -a parts <<<"$version"
    if [ "$part" == "major" ]; then
        parts[0]=$((parts[0] + 1))
        parts[1]=0
        parts[2]=0
    elif [ "$part" == "minor" ]; then
        parts[1]=$((parts[1] + 1))
        parts[2]=0
    elif [ "$part" == "patch" ]; then
        parts[2]=$((parts[2] + 1))
    fi
    echo "${parts[0]}.${parts[1]}.${parts[2]}"
}

# Determine the release type
if [ "$1" == "major" ]; then
    RELEASE_TYPE="major"
else
    # Get the latest tag
    LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")

    # Check for different types of commits since the latest tag
    if git log "$LATEST_TAG"..HEAD --pretty=format:%s | grep -E "^(feat|perf)(\(.+\))?:" > /dev/null; then
        RELEASE_TYPE="minor"
    elif git log "$LATEST_TAG"..HEAD --pretty=format:%s | grep -E "^(fix|docs|style|test|chore|refactor)(\(.+\))?:" > /dev/null; then
        RELEASE_TYPE="patch"
    else
        echo "No conventional commit types found since the latest release. No new release will be created."
        exit 0
    fi
fi

# Increment the version based on the release type
if [ "$RELEASE_TYPE" == "major" ]; then
    echo "Performing major release..."
    NEW_VERSION=$(increment_version $VERSION major)
elif [ "$RELEASE_TYPE" == "minor" ]; then
    echo "Performing minor release..."
    NEW_VERSION=$(increment_version $VERSION minor)
elif [ "$RELEASE_TYPE" == "patch" ]; then
    echo "Performing patch release..."
    NEW_VERSION=$(increment_version $VERSION patch)
else
    echo "Invalid release type. Please enter either 'major', 'minor', or 'patch'."
    exit 1
fi

# Confirm release creation
read -p "This will create a new $RELEASE_TYPE release with version $NEW_VERSION. Do you want to proceed? (y/n) " CONFIRM
if [[ "$CONFIRM" != "y" ]]; then
    echo "Release process canceled."
    exit 1
fi

# Update version in package.json
jq --arg new_version "$NEW_VERSION" '.version = $new_version' package.json > package_tmp.json && mv package_tmp.json package.json
git add package.json

# Sync version to all workspace packages
echo "Syncing version $NEW_VERSION to all workspace packages..."
node packages/scripts/sync-versions.js
git add packages/*/package.json

# Check if conventional-changelog is installed, if not install it
if ! command -v conventional-changelog &>/dev/null; then
    echo "conventional-changelog not found, installing..."
    npm install -g conventional-changelog-cli
fi

# Create CHANGELOG.md if it doesn't exist
if [ ! -f CHANGELOG.md ]; then
    touch CHANGELOG.md
fi

# Generate changelog
echo "Generating changelog..."
conventional-changelog -c ./packages/scripts/conventional-changelog-config.js -i CHANGELOG.md -s -r 2 --commit-path .
git add CHANGELOG.md

# Commit the changes with the new version
git commit -m "release: $NEW_VERSION"

# Create a Git tag with the new version
git tag "v$NEW_VERSION"

# Push the commit and the tag to the repository
git push
git push --tags

# Check if GitHub CLI is installed
if ! command -v gh &>/dev/null; then
    echo "GitHub CLI (gh) is not installed. Please install it and authenticate using 'gh auth login'."
    exit 1
fi

# Extract the changelog content for the latest release
echo "Extracting changelog content for version $NEW_VERSION..."
# Extract content between the version heading and the next version heading
CHANGELOG=$(sed -n "/## <small>$NEW_VERSION/,/## <small>/p" CHANGELOG.md | sed '1p;/## <small>/d')

if [ -z "$CHANGELOG" ]; then
    echo "Error: Could not extract changelog for version $NEW_VERSION."
    echo "Trying alternative format..."
    # Try alternative format (for backwards compatibility)
    CHANGELOG=$(sed -n "/^# $NEW_VERSION/,/^# /p" CHANGELOG.md | sed '1p;/^# /d')
    
    if [ -z "$CHANGELOG" ]; then
        echo "Error: Could not extract changelog in any known format for version $NEW_VERSION."
        exit 1
    fi
fi

# Create the release on GitHub
echo "Creating GitHub release..."
gh release create "v$NEW_VERSION" --title "v$NEW_VERSION" --notes "$CHANGELOG"

if [ $? -eq 0 ]; then
    echo "GitHub release created successfully."
else
    echo "Error: Failed to create GitHub release."
    exit 1
fi

echo "Release process complete. New version: $NEW_VERSION"