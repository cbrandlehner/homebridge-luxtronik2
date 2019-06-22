// 'use strict';
var Service;
var Characteristic;

/* common code */
const path = require('path');
const packageFile = require('./package.json');

var debug = false; // set true for more debugging info

function translate(c) {
  var tools = require(path.join(__dirname, '/lib/tools.js'));
  var channellist = require(path.join(__dirname, '/lib/channellist.json'));
	if (debug) console.log('Homebridge-Luxtronik2: translating data');
	// translate dword to data type
		var result = [];
		for (var i = 0; i < c.length; i++) {
			if (tools.isset(channellist[i])) {
				var value = c[i];
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
  this.IP = config.IP;
	this.Port = config.Port;
	this.name = config.name;
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
	var net = require('net');
  var temp = -99;
  // var buffer = require('buffer');
	// var binary = require('binary');
	// var tools = require(path.join(__dirname, '/lib/tools.js'));
	this.log.debug('host and port from config: ' + this.IP + ' ' + this.Port);

	var luxsock = net.connect({host: this.IP, port: this.Port});
		/* handle error */
		this.log.debug('Going to connect');
		luxsock.on('error', function (data) {
			console.error('Homebridge-Luxtronik2: error ' + data.toString());
			// stop();
		});
		/* handle timeout */
		luxsock.on('timeout', function () {
			if (debug) console.warn('Homebridge-Luxtronik2: connection timeout');
			// stop();
		});
		/* handle close */
		luxsock.on('close', function () {
			if (debug) console.info('Homebridge-Luxtronik2: client close event');
			// stop();
		});
		/* handle end */
		luxsock.on('end', function () {
			if (debug) console.info('Homebridge-Luxtronik2: client end event');
			// stop();
		});
		/* receive data */
		luxsock.on('data', function (data) {
			if (debug) console.info('Homebridge-Luxtronik2: reading data');
			// var buf = new Buffer(data.length);
      var buf = Buffer.alloc(data.length);
			buf.write(data, 'binary');
			/* luxtronik must confirm command */
			var confirm = buf.readUInt32BE(0);
			/* is 0 if data is unchanged since last request */
			// never used later in code ?? var change = buf.readUInt32BE(4);
			/* number of values */
			var count = buf.readUInt32BE(8);
			if (confirm !== 3004) {
				if (debug) console.error('Homebridge-luxtronik2: command not confirmed');
				// stop();
			} else if (data.length === (count * 4) + 12) {
				var pos = 12;
				var calculated = new Int32Array(count);
				for (var i = 0; i < count; i++) {
					calculated[i] = buf.readInt32BE(pos);
					pos += 4;
				}

        var items = translate(calculated);
				temp = items[5];
				if (debug) console.info('Homebridge-luxtronik2: Current temperature is: %s', temp);
				callback(null, temp);
			}

      luxsock.end();
		});
		// connected => get values
		luxsock.on('connect', function () {
      luxsock.setNoDelay(true);
			luxsock.setEncoding('binary');
			// var buf = new Buffer(4);
      var buf = Buffer.alloc(4);
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
    var informationService = new Service.AccessoryInformation();
    informationService
    .setCharacteristic(Characteristic.Manufacturer, 'homebridge-luxtronik2')
    .setCharacteristic(Characteristic.Model, 'Luxtronik2')
    .setCharacteristic(Characteristic.FirmwareRevision, this.firmwareRevision)
    .setCharacteristic(Characteristic.SerialNumber, this.firmwareRevision);
    /*
    var temperatureService = new Service.TemperatureSensor('Outside Temperature');
        temperatureService
          .getCharacteristic(Characteristic.CurrentTemperature)
          .setProps({minValue: parseFloat('-50'),
                     maxValue: parseFloat('100')})
          .on('get', this.getTemperature.bind(this));
*/

  this.temperatureService
    .getCharacteristic(Characteristic.CurrentTemperature)
    .setProps({minValue: parseFloat('-50'),
               maxValue: parseFloat('100')})
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

/**
 * Called when this plugin starts up
**/
