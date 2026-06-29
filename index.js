'use strict';

const {Luxtronik2Platform} = require('./lib/platform.js');
const {PLUGIN_NAME, PLATFORM_NAME} = require('./lib/constants.js');

/**
 * Homebridge plugin entry point.
 *
 * @param {object} api - Homebridge API.
 */
module.exports = api => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, Luxtronik2Platform);
};