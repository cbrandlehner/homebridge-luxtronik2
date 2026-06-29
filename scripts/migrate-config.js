#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {migrateHomebridgeConfig} = require('../lib/migrate-config.js');

const configPath = process.argv[2];

if (!configPath) {
  console.error('Usage: node scripts/migrate-config.js <path-to-config.json>');
  process.exit(1);
}

const absolutePath = path.resolve(configPath);

if (!fs.existsSync(absolutePath)) {
  console.error(`Config file not found: ${absolutePath}`);
  process.exit(1);
}

const raw = fs.readFileSync(absolutePath, 'utf8');
const config = JSON.parse(raw);
const {config: migratedConfig, migrated, changed} = migrateHomebridgeConfig(config);

if (!changed) {
  console.log('No legacy homebridge-luxtronik2 accessories found. Nothing to migrate.');
  process.exit(0);
}

fs.writeFileSync(absolutePath, `${JSON.stringify(migratedConfig, null, 2)}\n`);
console.log(`Migrated ${migrated} legacy accessory entr${migrated === 1 ? 'y' : 'ies'} to platform config in ${absolutePath}`);