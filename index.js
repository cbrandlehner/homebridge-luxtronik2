'use strict';

const {Luxtronik2Platform} = require('./lib/platform.js');
const {LegacyLuxtronikAccessory} = require('./lib/legacy-accessory.js');
const {maybeAutoMigrateConfig} = require('./lib/auto-migrate-config.js');
const {PLUGIN_NAME, PLATFORM_NAME} = require('./lib/constants.js');

/**
 * @param {object} api - Homebridge API.
 */
module.exports = api => {
  const log = {
    info: (...args) => console.log(`[${PLUGIN_NAME}]`, ...args),
    warn: (...args) => console.warn(`[${PLUGIN_NAME}]`, ...args),
    error: (...args) => console.error(`[${PLUGIN_NAME}]`, ...args),
  };

  const migration = maybeAutoMigrateConfig(api.user.configPath(), log);
  if (migration.changed) {
    const entryWord = migration.migrated === 1 ? 'entry' : 'entries';
    log.info(
      `Migrated ${migration.migrated} legacy accessory ${entryWord} to platform config in ${migration.configPath}. Restart Homebridge to apply.`,
    );
  }

  api.registerAccessory(PLUGIN_NAME, 'temperature', LegacyLuxtronikAccessory);
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, Luxtronik2Platform);
};