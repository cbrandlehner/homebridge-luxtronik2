'use strict';

const fs = require('node:fs');
const {migrateHomebridgeConfig} = require('./migrate-config.js');

/**
 * Migrate legacy accessory entries in config.json when present.
 *
 * @param {string} configPath - Absolute path to Homebridge config.json.
 * @param {{info: Function, warn: Function, error: Function}} log
 * @returns {{changed: boolean, migrated: number, configPath?: string}}
 */
function maybeAutoMigrateConfig(configPath, log) {
  if (!configPath || !fs.existsSync(configPath))
    return {changed: false, migrated: 0};

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    log.error(`Failed to read config.json for legacy migration: ${error.message}`);
    return {changed: false, migrated: 0};
  }

  const {config: migratedConfig, migrated, changed} = migrateHomebridgeConfig(config);
  if (!changed)
    return {changed: false, migrated: 0};

  try {
    fs.writeFileSync(configPath, `${JSON.stringify(migratedConfig, null, 2)}\n`);
  } catch (error) {
    log.error(`Failed to write migrated config.json: ${error.message}`);
    return {changed: false, migrated: 0};
  }

  return {changed: true, migrated, configPath};
}

module.exports = {
  maybeAutoMigrateConfig,
};