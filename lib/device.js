var stream = require('stream')
  , util = require('util')
  , os = require('os')
  , exec = require('child_process').exec
  , child;

/* common code */
var debug = false; // set true for more debugging info
// Give our device a stream interface
util.inherits(Device,stream);

// Export it
module.exports=Device;

/**
 * Creates a new Device Object
 *
 * @property {Boolean} readable Whether the device emits data
 * @property {Boolean} writable Whether the data can be actuated
 *
 * @property {Number} G - the channel of this device
 * @property {Number} V - the vendor ID of this device
 * @property {Number} D - the device ID of this device
 *
 * @property {Function} write Called when data is received from the Ninja Platform
 *
 * @fires data - Emit this when you wish to send data to the Ninja Platform
 */
function Device(app, opts) {

  var self = this;
  this._app = app;

  // This device will emit data
  this.readable = true;
  // This device cannot be actuated
  this.writeable = false;

  this.G = "0"; // G is a string a represents the channel
  this.V = 0; // 0 is Ninja Blocks' device list
  this.D = 9; // 9 is a temperature sensor
  this.name = 'temp';
  var io = require('socket.io-client');
  var temp;
  var real_poll_interval = opts.poll_interval * 10000;

  process.nextTick(function() {

    setInterval(function() {
		// ------------------------------------------
		// Luxtronik2
		// ------------------------------------------
		if (debug) {console.log('[ninja-luxtronik]', 'setInterval');
					app.log.info('[ninja-luxtronik]', 'Driver started');};
		var net = require('net');
		var fs = require('fs');
		var buffer = require('buffer');
		var binary = require('binary');
		/*
		INDEX : { "name": FRIENDLY_NAME, "type": TYPE[, "enum": ENUM_VALUES] }
		INDEX - numeric index in luxtronik response
		FRIENDLY_NAME - shows meaning of channel; used as MYSQL column name
		TYPE - how to translate the value
		"ignore" - do not use this value
		"fix1" - has one decimal place (must divide by 10)
		"ip" - IPv4 address
		"unixtime" - unix timestamp (seconds since 01.01.1970) as ISO string
		"timestamp" - leave as int32 but creates TIMESTAMP column in mysql
		"enum" - use ENUM_VALUES to translate (value is index)
		undefined - use value unchanged (as int32)
		if index is not found here, we use name = index; type = undefined
		data format was described here: http://sourceforge.net/projects/opendta/
		*/
		var tools = require(__dirname+'/tools.js');
		if (debug) { console.log('[ninja-luxtronik]','host and port from config: ' + opts.IP + ' ' + opts.Port);
					app.log.info('[ninja-luxtronik] host and port from config: ' + opts.IP + ' ' + opts.Port);};
		var luxsock = net.connect({host:opts.IP, port: opts.Port});
		/* handle error */
		if (debug) {console.log("Going to connect to Luxtronik");};
		luxsock.on("error", function (data)
		{
			if (debug) {console.log('adapter luxtronik2 ' + data.toString());};
			console.error(data.toString());
			//stop();
		});
		/* handle timeout */
		luxsock.on("timeout", function ()
		{
			if (debug) {console.log('adapter luxtronik2 connection timeout');};
			console.warn("client timeout event");
			//stop();
		});
		/* handle close */
		luxsock.on("close", function ()
		{
			if (debug) {console.log("client close event");};
			//stop();
		});
		/* handle end */
		luxsock.on('end', function ()
		{
			if (debug) {console.log("client end event");};
			//stop();
		});
		/* receive data */
		luxsock.on('data', function(data)
		{
			if (debug) {console.log('reading data');};
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
				if (debug) {console.log('luxtronik2: command not confirmed');};
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
				if (debug) {console.log('data: ', temp);
					    app.log.info('[ninja-luxtronik] Temperature is ',temp);};
			}
			luxsock.end();
		});
		// connected => get values
		luxsock.on('connect', function()
		{
			luxsock.setNoDelay(true);
			luxsock.setEncoding('binary');
			var buf = new Buffer(4);
			buf.writeUInt32BE(3004,0);
			luxsock.write(buf.toString('binary'), 'binary');
			buf.writeUInt32BE(0,0);
			luxsock.write(buf.toString('binary'), 'binary');
		});
		self.emit('data',temp);
	}, real_poll_interval);
  });
};

function translate(c)	{
	var tools = require(__dirname+'/tools.js');
	var channellist = require(__dirname+'/channellist.json');
	if (debug) {console.log('translating data');};
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
						/* do nothing here, used for mysql table creation */
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
			// set ccu state
			setState(channellist[i].name, value);
			}
		}
		return result;
	}	// function translate(c)	

// ------------------------------------------
// tools
// ------------------------------------------
function setState(id, val)
{
//socket.emit("setState", [id,val]);
}
function setObject(id, obj)
{
metaObjects[id] = obj;
if (obj.Value)
{
metaIndex.Address[obj.Name] = obj.Value;
}
//socket.emit("setObject", id, obj);
}
	
	
/**
 * Called whenever there is data from the Ninja Platform
 * This is required if Device.writable = true
 *
 * @param  {String} data The data received
 */
Device.prototype.write = function(data) {

  // I'm being actuated with data!
  self._app.log.error('[ninja-luxtronik2] Was actuated but should not have been');
};
