// 'use strict';
let Service;
let Characteristic;

import packageFile from './package.json';
const path = require('path');
// const packageFile = require('./package.json');

const debug = false; // set true for more debugging info

function translate(c) {
  const tools = require(path.join(__dirname, '/lib/tools.js'));
  const channellist = require(path.join(__dirname, '/lib/channellist.json'));
	if (debug) console.log('Homebridge-Luxtronik2: translating data');
	// translate dword to data type
		const result = [];
		for (let i = 0; i < c.length; i++) {
			if (tools.isset(channellist[i])) {
				let value = c[i];
				if (tools.isset(channellist[i].type)) {
					switch (channellist[i].type) {
					case 'fix1':
						value /= 10;
            break;
					case 'ip':
						value = tools.int2ip(value);
            break;
					case 'ignore':
            continue;
					case 'enum':
						if (tools.isset(channellist[i].enum[c[i]])) value = channellist[i].enum[c[i]];
            break;
            default:
            // nothing
            break;
					}
				}

			result.push(value); // push to array
			}
		}

		return result;
	}	// function translate(c)

function Luxtronik2(log, config) {
	this.log = log;

  if (config.IP === undefined) {
    this.log.error('ERROR: your configuration is missing the parameter "IP"');
    this.IP = '127.0.0.1';
  } else {
    this.IP = config.IP;
    this.log.debug('Config: IP is %s', config.IP);
  }

  if (config.Port === undefined) {
    this.log.error('ERROR: your configuration is missing the parameter "Port"');
    this.Port = 8888;
  } else {
    this.Port = config.Port;
    this.log.debug('Config: Port is %s', config.Port);
  }

  if (config.name === undefined) {
    this.log.error('ERROR: your configuration is missing the parameter "name"');
    this.name = 'Unnamed Luxtronik2';
  } else {
    this.name = config.name;
    this.log.debug('Config: name is %s', config.name);
  }

  if (config.Channel === undefined) {
    this.log.error('ERROR: your configuration is missing the parameter "Channel"');
    this.Channel = 5;
  } else {
    this.Channel = config.Channel;
    this.log.debug('Config: Channel is %s', config.Channel);
  }

  this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS;
  this.firmwareRevision = packageFile.version;
  this.log.info('Luxtronik2 IP is %s', this.IP);
  this.log.info('Luxtronik2 Port is %s', this.Port);
  this.log.info('Luxtronik2 name is %s', this.name);
  this.log.debug('Debug enabled');
  this.temperatureService = new Service.TemperatureSensor(this.name);
}

Luxtronik2.prototype = {

  getTemperature: function (callback) {
    this.log.debug('getTemperature was called');
    const net = require('net');
    let temperature = -99;
    const Channel = this.Channel;
    const that = this;

    this.log.debug('host and port from config: ' + this.IP + ' ' + this.Port);

    const luxsock = net.connect({host: this.IP, port: this.Port});

    this.log.debug('Going to connect');
		luxsock.on('error', function (data) {
			that.log.error('Homebridge-Luxtronik2: error ' + data.toString());
			// stop();
		});
		/* handle timeout */
		luxsock.on('timeout', function () {
			if (debug) that.log.info('Homebridge-Luxtronik2: connection timeout');
			// stop();
		});
		/* handle close */
		luxsock.on('close', function () {
			if (debug) that.log.debug('Homebridge-Luxtronik2: client close event');
			// stop();
		});
		/* handle end */
		luxsock.on('end', function () {
			if (debug) that.log.debug('Homebridge-Luxtronik2: client end event');
			// stop();
		});
		/* receive data */
		luxsock.on('data', function (data) {
			if (debug) that.log.debug('Homebridge-Luxtronik2: reading data');
			// var buf = new Buffer(data.length);
      const buf = Buffer.alloc(data.length);
			buf.write(data, 'binary');
			/* luxtronik must confirm command */
			const confirm = buf.readUInt32BE(0);
			/* is 0 if data is unchanged since last request */
			// never used later in code ?? var change = buf.readUInt32BE(4);
			/* number of values */
			const count = buf.readUInt32BE(8);
			if (confirm !== 3004) {
				if (debug) that.log.error('Homebridge-luxtronik2: command not confirmed');
				// stop();
			} else if (data.length === (count * 4) + 12) {
				let pos = 12;
				const calculated = new Int32Array(count);
				for (let i = 0; i < count; i++) {
					calculated[i] = buf.readInt32BE(pos);
					pos += 4;
				}

        that.log.debug('calculated %s', calculated);
        const items = translate(calculated);
        that.log.debug('items %s', items);
        that.log.debug('Channel %s', Channel);
				temperature = items[Channel];
				if (debug) console.info('Homebridge-luxtronik2: Current temperature is: %s', temperature);
				callback(null, temperature);
			}

      luxsock.end();
		});
		// connected => get values
		luxsock.on('connect', function () {
      luxsock.setNoDelay(true);
			luxsock.setEncoding('binary');
			// var buf = new Buffer(4);
      const buf = Buffer.alloc(4);
			buf.writeUInt32BE(3004, 0);
			luxsock.write(buf.toString('binary'), 'binary');
			buf.writeUInt32BE(0, 0);
			luxsock.write(buf.toString('binary'), 'binary');
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
    .setCharacteristic(Characteristic.SerialNumber, this.firmwareRevision);

  this.temperatureService
    .getCharacteristic(Characteristic.CurrentTemperature)
    .setProps({minValue: Number.parseFloat('-50'),
               maxValue: Number.parseFloat('100')})
    .on('get', this.getTemperature.bind(this));

//

    return [informationService, this.temperatureService];
	}
};

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-luxtronik2', 'temperature', Luxtronik2);
};
