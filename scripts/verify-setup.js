#!/usr/bin/env node

/**
 * Environment verification script for the mobile app
 * Ensures pnpm is being used and all prerequisites are met
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying mobile app environment...\n');

// Check if pnpm is being used
try {
  const userAgent = process.env.npm_config_user_agent || '';
  if (!userAgent.includes('pnpm')) {
    console.error('❌ ERROR: This project requires pnpm. Please install and use pnpm instead of npm/yarn.');
    console.log('   Install pnpm: npm install -g pnpm');
    process.exit(1);
  }
  console.log('✅ Using pnpm - correct package manager!');
} catch (error) {
  console.error('❌ ERROR: Could not verify package manager');
  process.exit(1);
}

// Check if pnpm-lock.yaml exists
if (!fs.existsSync(path.join(__dirname, '..', 'pnpm-lock.yaml'))) {
  console.error('❌ ERROR: pnpm-lock.yaml not found. Please run "pnpm install" first.');
  process.exit(1);
}
console.log('✅ pnpm-lock.yaml found');

// Check Node version
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  const versionMatch = nodeVersion.match(/^v(\d+)/);
  if (versionMatch) {
    const majorVersion = parseInt(versionMatch[1]);
    if (majorVersion < 18) {
      console.error(`❌ ERROR: Node.js version ${nodeVersion} is too old. Please use Node.js 18 or higher.`);
      process.exit(1);
    }
    console.log(`✅ Node.js version: ${nodeVersion}`);
  }
} catch (error) {
  console.error('❌ ERROR: Could not check Node.js version');
  process.exit(1);
}

// Check pnpm version
try {
  const pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ pnpm version: ${pnpmVersion}`);
} catch (error) {
  console.error('❌ ERROR: Could not check pnpm version');
  process.exit(1);
}

console.log('\n🎉 Environment verification passed! You\'re all set to develop.');