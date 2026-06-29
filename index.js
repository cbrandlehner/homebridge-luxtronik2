'use strict';

const {Luxtronik2Platform} = require('./lib/platform.js');
const {registerLegacyAccessory} = require('./lib/legacy-accessory.js');
const {PLUGIN_NAME, PLATFORM_NAME} = require('./lib/constants.js');

/**
 * Homebridge plugin entry point.
 *
 * Registers the v2 platform plugin and keeps the legacy accessory type so
 * existing 1.x config.json entries continue to work without manual edits.
 *
 * @param {object} api - Homebridge API.
 */
module.exports = api => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, Luxtronik2Platform);
  registerLegacyAccessory(api);
};