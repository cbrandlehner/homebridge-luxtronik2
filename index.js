// 'use strict';
let Service;
let Characteristic;

const path = require('node:path');
const packageFile = require('./package.json');

function translate(c) {
  const tools = require(path.join(__dirname, '/lib/tools.js'));
  const channellist = require(path.join(__dirname, '/lib/channellist.json'));
	// translate dword to data type
		const result = [];
		for (let i = 0; i < c.length; i++) {
			if (tools.isset(channellist[i])) {
				let value = c[i];
				if (tools.isset(channellist[i].type)) {
					switch (channellist[i].type) {
					case 'fix1': {
						value /= 10;
            break;}

            case 'ip': {
						value = tools.int2ip(value);
            break;}

            case 'ignore': {
            continue;}

            case 'enum': {
						if (tools.isset(channellist[i].enum[c[i]])) value = channellist[i].enum[c[i]];
            break;}

            default: {
            // nothing
            break;}
					}
				}

			result.push(value); // push to array
			}
		}

		return result;
	}	// function translate(c)

function Luxtronik2(log, config) {
	this.log = log;

  const process = require('node:process');
  const NODE_MAJOR_VERSION = process.versions.node.split('.')[0];
  if (NODE_MAJOR_VERSION <= 14) {
    this.log.warn('WARNING: NodeJS version 14 is end of life 2023-04-30.');
    this.log.warn('Visit nodejs.org for more details.');
  }

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

  this.CurrentTemperature = 0; // Initial value for early response
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
			// stop();
		});
		/* handle timeout */
		luxsock.on('timeout', function () {
			that.log.warn('Connection timeout. Check network settings.');
			// stop();
		});
		/* handle close */
		luxsock.on('close', function () {
		  that.log.debug('Connection to Luxtronik2 closed.');
			// stop();
		});
		/* handle end */
		luxsock.on('end', function () {
			that.log.debug('Connection to Luxtronik2 ended.');
			// stop();
		});
		/* receive data */
		luxsock.on('data', function (data) {
			that.log.debug('Connection to Luxtronik2 established. Requesting data by sending command.');
      const {Buffer} = require('node:buffer');
      const buf = Buffer.alloc(data.length);
			buf.write(data, 'binary');
			/* luxtronik must confirm command */
			const confirm = buf.readUInt32BE(0);
			/* is 0 if data is unchanged since last request */
			// never used later in code ?? var change = buf.readUInt32BE(4);
			/* number of values */
			// const count = buf.readUInt32BE(8); // moved that code down into the else clause section.
			if (confirm === 3004) {
        that.log.debug('Luxtronik2 confirmed command.');
        const count = buf.readUInt32BE(8);
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
        // stop();
      }

      luxsock.end();
		});
		// connected => get values
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

  getCurrentTemperature(callback) { // Wrapper for service call to early return
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
    .setProps({minValue: Number.parseFloat('-50'),
               maxValue: Number.parseFloat('100')})
    // .on('get', this.getTemperature.bind(this));
    .on('get', this.getCurrentTemperature.bind(this));

//

    return [informationService, this.temperatureService];
	},
};

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-luxtronik2', 'temperature', Luxtronik2);
};
