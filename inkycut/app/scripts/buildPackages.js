#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_PACKAGES_DIR = path.join(__dirname, '..', 'src', 'packages');
const APP_PACKAGES_DIR = path.join(__dirname, '..', 'packages');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  
  if (stat.isDirectory()) {
    ensureDir(dest);
    const items = fs.readdirSync(src);
    items.forEach(item => {
      copyRecursive(path.join(src, item), path.join(dest, item));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function fixImportsInFile(filePath, packageName) {
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  
  // Fix all relative imports that reference @inkycut packages
  // Matches: '../@inkycut/editor', '../../@inkycut/render', '../packages/editor', etc.
  const inkyPackageRegex = /from\s+['"][^'"]*@inkycut\/(editor|render)[^'"]*['"]/g;
  newContent = newContent.replace(inkyPackageRegex, (match, packageName) => {
    return `from '@inkycut/${packageName}'`;
  });
  
  // Fix relative imports that go to packages directory
  newContent = newContent.replace(/from\s+['"][^'"]*packages\/(editor|render)[^'"]*['"]/g, (match, packageName) => {
    return `from '@inkycut/${packageName}'`;
  });
  
  // Fix any remaining relative imports that might reference inkycut packages
  const relativeImportRegex = /from\s+['"]\.\.\/[^'"]*['"]/g;
  newContent = newContent.replace(relativeImportRegex, (match) => {
    if (match.includes('editor')) {
      return "from '@inkycut/editor'";
    }
    if (match.includes('render')) {
      return "from '@inkycut/render'";
    }
    return match;
  });
  
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Fixed imports in: ${filePath}`);
  }
}

function fixImportsInDirectory(dirPath, packageName) {
  if (!fs.existsSync(dirPath)) return;
  
  const items = fs.readdirSync(dirPath);
  items.forEach(item => {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      fixImportsInDirectory(itemPath, packageName);
    } else if (item.match(/\.(ts|tsx|js|jsx)$/)) {
      fixImportsInFile(itemPath, packageName);
    }
  });
}

function buildPackage(packageName) {
  const srcPackageDir = path.join(SRC_PACKAGES_DIR, packageName);
  const appPackageDir = path.join(APP_PACKAGES_DIR, packageName);
  const appPackageSrcDir = path.join(appPackageDir, 'src');
  
  if (!fs.existsSync(srcPackageDir)) {
    console.log(`Warning: Source package not found: ${srcPackageDir}`);
    return;
  }
  
  console.log(`Building package: ${packageName}`);
  
  // Ensure destination directories exist
  ensureDir(appPackageDir);
  ensureDir(appPackageSrcDir);
  
  // Clean existing src directory contents if it exists
  if (fs.existsSync(appPackageSrcDir)) {
    const items = fs.readdirSync(appPackageSrcDir);
    items.forEach(item => {
      const itemPath = path.join(appPackageSrcDir, item);
      fs.rmSync(itemPath, { recursive: true, force: true });
    });
  }
  
  // Copy all files from src/packages/packageName/* to app/packages/packageName/src/
  const items = fs.readdirSync(srcPackageDir);
  items.forEach(item => {
    const srcPath = path.join(srcPackageDir, item);
    const destPath = path.join(appPackageSrcDir, item);
    copyRecursive(srcPath, destPath);
  });
  
  // Fix imports in the copied files
  fixImportsInDirectory(appPackageSrcDir, packageName);
  
  console.log(`✓ Built package: ${packageName}`);
}

function main() {
  console.log('Building packages...');
  
  // Ensure packages directory exists
  ensureDir(APP_PACKAGES_DIR);
  
  // Get all package directories from src/packages
  if (!fs.existsSync(SRC_PACKAGES_DIR)) {
    console.log('No src/packages directory found');
    return;
  }
  
  const packages = fs.readdirSync(SRC_PACKAGES_DIR).filter(item => {
    return fs.statSync(path.join(SRC_PACKAGES_DIR, item)).isDirectory();
  });
  
  if (packages.length === 0) {
    console.log('No packages found in src/packages');
    return;
  }
  
  // Build each package
  packages.forEach(buildPackage);
  
  console.log(`\n✓ Successfully built ${packages.length} package(s): ${packages.join(', ')}`);
}

main();

export { buildPackage, fixImportsInFile, fixImportsInDirectory };