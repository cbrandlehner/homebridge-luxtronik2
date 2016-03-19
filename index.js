'use strict';
var Service, Characteristic;
var stream = require('stream')
  , util = require('util')
  , os = require('os')
  , exec = require('child_process').exec
  , child;

/* common code */
var debug = true; // set true for more debugging info

function translate(c)	
	{
	var tools = require(__dirname+'/lib/tools.js');
	var channellist = require(__dirname+'/lib/channellist.json');
	if (debug) {console.log('Homebridge-Luxtronik2: translating data');};
	// translate dword to data type
		var result = [];
		for (var i=0;i< c.length; i++)
		{
			if (tools.isset(channellist[i]))
			{
				var value = c[i];
				if (tools.isset(channellist[i].type))
				{
					switch (channellist[i].type)
					{
					case 'fix1':
						value /= 10;
						break;
					case 'ip':
						value = tools.int2ip(value);
						break;
					case 'unixtime':
						value = new Date(value * 1000).toISOString();
						break;
					case 'timestamp':
						/* do nothing here, used for future feature. mysql table creation */
						break;
					case 'ignore':
						continue;
						break;
					case 'enum':
						if (tools.isset(channellist[i].enum[c[i]]))
						{
							value = channellist[i].enum[c[i]];
						}
						break;
					}
				}
				// push to array
			result.push(value);
			}
		}
		return result;
	}	// function translate(c)	

module.exports = function(homebridge){
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-luxtronik2", "Luxtronik2", Luxtronik2);
}

/**
 * Called when this plugin starts up
**/
function Luxtronik2(log, config) {
	this.log = log;
	this.IP = config["IP"];
	this.Port = config["Port"];
	this.service = config["service"];
	this.name = config["name"];
}

Luxtronik2.prototype = {

  getTemperature: function(callback) {
    console.log("Luxtronik2 Sensor Triggered");
	if (debug) {console.log('Homebridge-Luxtronik2: getTemperature');};
	var net = require('net');
	var buffer = require('buffer');
	var binary = require('binary');
	var temp;
	var tools = require(__dirname+'/lib/tools.js');
	if (debug) { console.log('Homebridge-Luxtronik2: host and port from config: ' + this.IP + ' ' + this.Port);};
	
	var luxsock = net.connect({host:this.IP, port: this.Port});
		/* handle error */
		if (debug) {console.log("Homebridge-Luxtronik2: Going to connect");};
		luxsock.on("error", function (data)
		{
			if (debug) {console.log('Homebridge-Luxtronik2: ' + data.toString());};
			console.error(data.toString());
			//stop();
		});
		/* handle timeout */
		luxsock.on("timeout", function ()
		{
			if (debug) {console.log('Homebridge-Luxtronik2: connection timeout');};
			console.warn("client timeout event");
			//stop();
		});
		/* handle close */
		luxsock.on("close", function ()
		{
			if (debug) {console.log("Homebridge-Luxtronik2: client close event");};
			//stop();
		});
		/* handle end */
		luxsock.on('end', function ()
		{
			if (debug) {console.log("Homebridge-Luxtronik2: client end event");};
			//stop();
		});
		/* receive data */
		luxsock.on('data', function(data)
		{
			if (debug) {console.log('Homebridge-Luxtronik2: reading data');};
			var buf = new Buffer(data.length);
			buf.write(data, 'binary');
			/* luxtronik must confirm command */
			var confirm = buf.readUInt32BE(0);
			/* is 0 if data is unchanged since last request */
			var change = buf.readUInt32BE(4);
			/* number of values */
			var count = buf.readUInt32BE(8);
			if (confirm != 3004)
			{
				if (debug) {console.log('Homebridge-luxtronik2: command not confirmed');};
				stop();
			}
			else if (data.length==count*4+12)
			{
				var pos = 12;
				var calculated = new Int32Array(count);
				for (var i=0;i<count;i++)
				{
					calculated[i] = buf.readInt32BE(pos);
					pos+=4;
				}
				var items = translate(calculated);
				temp = items[5];
				// deferred.resolve(luxsock);
				if (debug) {console.log('Homebridge-Luxtronik2: temperature data: ', temp);};
				callback(null,temp);
			}
			luxsock.end();
		});
		// connected => get values
		luxsock.on('connect', function()
		{
			if (debug) {console.log('Homebridge-Luxtronik2: connected!');};
			luxsock.setNoDelay(true);
			luxsock.setEncoding('binary');
			var buf = new Buffer(4);
			buf.writeUInt32BE(3004,0);
			luxsock.write(buf.toString('binary'), 'binary');
			buf.writeUInt32BE(0,0);
			luxsock.write(buf.toString('binary'), 'binary');
		});
  },

  identify: function(callback) {
		this.log("Currently there is no way to help identify the Luxtronik2 device!");
		callback();
	},

	getServices: function() {
		var informationService = new Service.AccessoryInformation();
		    informationService
      			.setCharacteristic(Characteristic.Manufacturer, "AI")
				.setCharacteristic(Characteristic.Model, "Luxtronik2")
				.setCharacteristic(Characteristic.SerialNumber, "n/a")
		if (this.service == "outside_temp") {
      			var temperatureService = new Service.TemperatureSensor("Outside Temperature");
				temperatureService
			        .getCharacteristic(Characteristic.CurrentTemperature)
			        .on('get', this.getTemperature.bind(this));


		return [informationService, temperatureService];
		}
	}
};

