'use strict';

const net = require('node:net');
const {Buffer} = require('node:buffer');
const tools = require('./tools.js');
const channellist = require('./channellist.json');

const COMMAND_CONFIRM = 3004;
const HEADER_SIZE = 12;
const DEFAULT_TIMEOUT_MS = 5000;

const clients = new Map();

/**
 * Decode raw Luxtronik2 channel values using channellist metadata.
 *
 * @param {ArrayLike<number>} rawValues - Raw int32 values from the controller.
 * @returns {Array} Translated values with ignored channels omitted.
 */
function translate(rawValues) {
  const result = [];

  for (let i = 0; i < rawValues.length; i++) {
    if (!tools.isset(channellist[i]))
      continue;

    let value = rawValues[i];
    if (tools.isset(channellist[i].type)) {
      switch (channellist[i].type) {
        case 'fix1': {
          value /= 10;
          break;
        }

        case 'ip': {
          value = tools.int2ip(value);
          break;
        }

        case 'ignore': {
          continue;
        }

        case 'enum': {
          if (tools.isset(channellist[i].enum[value]))
            value = channellist[i].enum[value];

          break;
        }

        default: {
          break;
        }
      }
    }

    result.push(value);
  }

  return result;
}

/**
 * Parse a Luxtronik2 TCP response buffer into translated channel values.
 *
 * @param {Buffer} buffer - Response payload from the controller.
 * @returns {Array} Translated values.
 */
function parseResponse(buffer) {
  if (buffer.length < HEADER_SIZE)
    throw new Error('Response buffer is too short');

  const confirm = buffer.readUInt32BE(0);
  if (confirm !== COMMAND_CONFIRM)
    throw new Error('Luxtronik2 did not confirm command to send data');

  const count = buffer.readUInt32BE(8);
  const expectedLength = (count * 4) + HEADER_SIZE;
  if (buffer.length !== expectedLength)
    throw new Error(`Unexpected response length: expected ${expectedLength}, got ${buffer.length}`);

  const calculated = new Int32Array(count);
  let pos = HEADER_SIZE;
  for (let i = 0; i < count; i++) {
    calculated[i] = buffer.readInt32BE(pos);
    pos += 4;
  }

  return translate(calculated);
}

class Luxtronik2Client {
  /**
   * @param {string} ip - Controller IP address.
   * @param {number} port - Controller TCP port.
   * @param {object} log - Homebridge logger.
   * @param {object} [options]
   * @param {number} [options.timeoutMs=5000] - Socket timeout in milliseconds.
   */
  constructor(ip, port, log, options = {}) {
    this.ip = ip;
    this.port = port;
    this.log = log;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.queue = [];
    this.processing = false;
  }

  /**
   * Return a shared client instance for the given controller endpoint.
   *
   * @param {string} ip - Controller IP address.
   * @param {number} port - Controller TCP port.
   * @param {object} log - Homebridge logger.
   * @returns {Luxtronik2Client}
   */
  static getClient(ip, port, log) {
    const key = `${ip}:${port}`;
    if (!clients.has(key))
      clients.set(key, new Luxtronik2Client(ip, port, log));

    const client = clients.get(key);
    client.log = log;
    return client;
  }

  /**
   * Read a temperature channel from the controller.
   *
   * @param {number} channel - Compacted channel index from plugin config.
   * @param {(error: Error|null, temperature?: number) => void} callback
   */
  getTemperature(channel, callback) {
    this.queue.push({channel, callback});
    this._processQueue();
  }

  _processQueue() {
    if (this.processing || this.queue.length === 0)
      return;

    this.processing = true;
    const {channel, callback} = this.queue.shift();

    this._fetch(channel, (error, temperature) => {
      callback(error, temperature);
      this.processing = false;
      this._processQueue();
    });
  }

  _fetch(channel, callback) {
    let finished = false;
    const finish = (error, temperature) => {
      if (finished)
        return;

      finished = true;
      callback(error, temperature);
    };

    this.log.debug('Connecting to Luxtronik2 at %s:%s', this.ip, this.port);
    const socket = net.connect({host: this.ip, port: this.port});
    socket.setTimeout(this.timeoutMs);

    socket.on('connect', () => {
      this.log.debug('Connected to Luxtronik2, requesting data');
      socket.setNoDelay(true);

      const request = Buffer.alloc(8);
      request.writeUInt32BE(COMMAND_CONFIRM, 0);
      request.writeUInt32BE(0, 4);
      socket.write(request);
    });

    socket.on('data', data => {
      try {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
        this.log.debug('Received %s bytes from Luxtronik2', buffer.length);

        const items = parseResponse(buffer);
        this.log.debug('Plugin is reading channel %s', channel);

        if (channel < 0 || channel >= items.length)
          throw new Error(`Channel ${channel} is out of range (0-${items.length - 1})`);

        const temperature = items[channel];
        if (temperature === undefined || Number.isNaN(temperature))
          throw new Error(`Channel ${channel} returned an invalid temperature`);

        this.log.debug('Current temperature is: %s', temperature);
        finish(null, temperature);
      } catch (error) {
        this.log.warn('%s', error.message);
        finish(error);
      } finally {
        socket.end();
      }
    });

    socket.on('timeout', () => {
      this.log.warn('Connection timeout. Check network settings.');
      socket.destroy();
      finish(new Error('Connection timeout'));
    });

    socket.on('error', error => {
      this.log.error('Luxtronik2 connection error: %s', error.message);
      socket.destroy();
      finish(error);
    });
  }
}

module.exports = {
  Luxtronik2Client,
  parseResponse,
  translate,
};
