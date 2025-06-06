// 'use strict';
let Service;
let Characteristic;

const path = require('node:path');
const packageFile = require('./package.json');

function translate(c) {
  const tools = require(path.join(__dirname, '/lib/tools.js'));
  const channellist = require(path.join(__dirname, '/lib/channellist.json'));
  const result = [];

  for (let i = 0; i < c.length; i++) {
    if (tools.isset(channellist[i])) {
      let value = c[i];
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
            if (tools.isset(channellist[i].enum[c[i]])) value = channellist[i].enum[c[i]];
            break;
          }

          default: {
            break;
          }
        }
      }

      result.push(value);
    }
  }

  return result;
}

function Luxtronik2(log, config) {
  this.log = log;

  const process = require('node:process');
  const NODE_MAJOR_VERSION = process.versions.node.split('.')[0];
  this.log.debug('NodeJS version is %s', process.versions.node);
  if (NODE_MAJOR_VERSION <= 16) {
    this.log.warn('WARNING: NodeJS version 16 is end of life 2023-09-11.');
    this.log.warn('Visit nodejs.org for more details.');
  }

  if (config.IP === undefined) {
    this.log.error('ERROR: your configuration is missing the parameter "IP"');
    this.IP = '127.0.0.1';
  } else {
    this.IP = config.IP;
  }

  if (config.Port === undefined) {
    this.log.error('ERROR: your configuration is missing the parameter "Port"');
    this.Port = 8888;
  } else {
    this.Port = config.Port;
  }

  if (config.name === undefined) {
    this.log.error('ERROR: your configuration is missing the parameter "name"');
    this.name = 'Unnamed Luxtronik2';
  } else {
    this.name = config.name;
  }

  if (config.Channel === undefined) {
    this.log.error('ERROR: your configuration is missing the parameter "Channel"');
    this.Channel = 5;
  } else {
    this.Channel = config.Channel;
  }

  this.log.debug('Config: IP is %s', this.IP);
  this.log.debug('Config: Port is %s', this.Port);
  this.log.debug('Config: name is %s', this.name);
  this.log.debug('Config: Channel is %s', this.Channel);

  this.CurrentTemperature = 0;
  this.counter = 1;

  this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS;
  this.firmwareRevision = packageFile.version;
  this.log.info('Luxtronik2 IP is %s', this.IP);
  this.log.info('Luxtronik2 Port is %s', this.Port);
  this.log.info('Luxtronik2 Name is %s', this.name);
  this.log.debug('Homebridge debug enabled');
  this.temperatureService = new Service.TemperatureSensor(this.name);
}

Luxtronik2.prototype = {

  getTemperature: function (callback) {
    this.log.debug('getTemperature was called');
    const net = require('node:net');
    let temperature = -99; /* eslint unicorn/no-this-assignment: ["off"] */
    const Channel = this.Channel; /* eslint prefer-destructuring: ["off"] */
    const that = this;

    this.log.debug('host and port from config: ' + this.IP + ' ' + this.Port);

    const luxsock = net.connect({host: this.IP, port: this.Port});

    this.log.debug('Going to connect');
    luxsock.on('error', function (data) {
      that.log.error(data.toString());
    });
    luxsock.on('timeout', function () {
      that.log.warn('Connection timeout. Check network settings.');
    });
    luxsock.on('close', function () {
      that.log.debug('Connection to Luxtronik2 closed.');
    });
    luxsock.on('end', function () {
      that.log.debug('Connection to Luxtronik2 ended.');
    });
    luxsock.on('data', function (data) {
      that.log.debug('Connection to Luxtronik2 established. Requesting data by sending command.');
      const {Buffer} = require('node:buffer');
      const buf = Buffer.alloc(data.length);
      buf.write(data, 'binary');
      that.log.debug('Buffer length is %s', buf.length);
      const confirm = buf.readUInt32BE(0);
      that.log.debug('Confirm message is %s', confirm);
      const offset = 8;
      if (offset + 4 > buf.length) {
        that.log.warn('Buffer does not have enough bytes. Exiting function without being able to update data.');
        return;
      }

      if (confirm === 3004 && offset + 4 <= buf.length) {
        that.log.debug('Luxtronik2 confirmed command and the buffer byte count is good.');
        const count = buf.readUInt32BE(offset);
        if (data.length === (count * 4) + 12) {
          let pos = 12;
          const calculated = new Int32Array(count);
          for (let i = 0; i < count; i++) {
            calculated[i] = buf.readInt32BE(pos);
            pos += 4;
          }

          that.log.debug('Data received: %s', calculated);
          const items = translate(calculated);
          that.log.debug('Itemized datalist: %s', items);
          that.log.debug('Plugin is reading Channel %s', Channel);
          temperature = items[Channel];
          that.log.debug('Current temperature is: %s', temperature);
          callback(null, temperature);
        }
      } else {
        that.log.warn('Error: Luxtronik2 did not confirm command to send data.');
      }

      luxsock.end();
    });
    luxsock.on('connect', function () {
      luxsock.setNoDelay(true);
      luxsock.setEncoding('binary');
      const {Buffer} = require('node:buffer');
      const buf = Buffer.alloc(4);
      buf.writeUInt32BE(3004, 0);
      luxsock.write(buf.toString('binary'), 'binary');
      buf.writeUInt32BE(0, 0);
      luxsock.write(buf.toString('binary'), 'binary');
    });
  },

  getCurrentTemperature(callback) {
    const counter = ++this.counter;
    this.log.debug('getCurrentTemperature: early callback with cached CurrentTemperature: %s (%d).', this.CurrentTemperature, counter);
    callback(null, this.CurrentTemperature);
    this.getTemperature((error, HomeKitState) => {
      this.CurrentTemperature = HomeKitState;
      this.temperatureService.getCharacteristic(Characteristic.CurrentTemperature).updateValue(this.CurrentTemperature);
      this.log.debug('getCurrentTemperature: update CurrentTemperature: %s (%d).', this.CurrentTemperature, counter);
    });
  },

  identify: function (callback) {
    this.log.info('Currently there is no way to help identify the Luxtronik2 device!');
    callback();
  },

  getServices: function () {
    const informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, 'homebridge-luxtronik2')
      .setCharacteristic(Characteristic.Model, 'Luxtronik2')
      .setCharacteristic(Characteristic.FirmwareRevision, this.firmwareRevision)
      .setCharacteristic(Characteristic.SerialNumber, this.name);
    this.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: Number.parseFloat('-50'),
        maxValue: Number.parseFloat('100'),
      })
      .on('get', this.getCurrentTemperature.bind(this));

    return [informationService, this.temperatureService];
  },
};

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-luxtronik2', 'temperature', Luxtronik2);
};
