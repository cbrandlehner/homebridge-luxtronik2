'use strict';

/**
 * No-op shim for deprecated v1.x accessory config entries.
 *
 * Prevents Homebridge startup errors while legacy entries are still present
 * in the in-memory config until the next restart after auto-migration.
 */
class LegacyLuxtronikAccessory {
  /**
   * @param {object} log
   * @param {object} _config
   * @param {object} _api
   */
  constructor(log, _config, _api) {
    log.warn(
      'Legacy accessory config "homebridge-luxtronik2.temperature" is deprecated. '
      + 'It was removed from config.json automatically; restart Homebridge to finish migration. '
      + 'Use a platform entry with a sensors array for v2.x.',
    );
  }

  /**
   * @returns {Array}
   */
  getServices() {
    return [];
  }
}

module.exports = {
  LegacyLuxtronikAccessory,
};