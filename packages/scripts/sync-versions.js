#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const rootPackage = require('../../package.json');

const rootVersion = rootPackage.version;
console.log(`Syncing version ${rootVersion} to all packages...`);

// Get all packages
const packagesDir = path.join(__dirname, '..');
const packages = fs.readdirSync(packagesDir).filter((pkg) => {
  const pkgPath = path.join(packagesDir, pkg);
  return (
    fs.statSync(pkgPath).isDirectory() &&
    fs.existsSync(path.join(pkgPath, 'package.json'))
  );
});

// Update the version in each package
packages.forEach((pkg) => {
  const packageJsonPath = path.join(packagesDir, pkg, 'package.json');
  const packageJson = require(packageJsonPath);
  const oldVersion = packageJson.version;

  packageJson.version = rootVersion;

  // Write the updated package.json
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n'
  );

  console.log(`Updated ${pkg} from ${oldVersion} to ${rootVersion}`);
});

console.log('Version sync complete!');
