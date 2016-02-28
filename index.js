var Service, Characteristic;
var superagent = require('superagent');
var jsonapify = require('superagent-jsonapify');
jsonapify(superagent)

module.exports = function(homebridge){
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-ninjablock-temperature", "NinjaBlock-Temperature", HttpAccessory);
}

function HttpAccessory(log, config) {
	this.log = log;

	this.temperature_url = config["temperature_url"];
	this.service = config["service"];
	this.name = config["name"];
}

HttpAccessory.prototype = {
  getTemperature: function(callback) {
    console.log("Sensor Triggered");
    superagent.get(this.temperature_url).then(function(response){
		const body = response.body;
		// console.log("body", body);
		const sensordata = body.data.last_data.DA;
		console.log("sensordata ", sensordata);
		callback(null,sensordata);
	});
  },

  identify: function(callback) {
		this.log("Currently there is no way to help identify the device!");
		callback();
	},

	getServices: function() {
		var informationService = new Service.AccessoryInformation();
		    informationService
      			.setCharacteristic(Characteristic.Manufacturer, "NinjaBlocks")
			.setCharacteristic(Characteristic.Model, "NinjaBlock")
			.setCharacteristic(Characteristic.SerialNumber, "n/a")
		if (this.service == "Temperature Sensor") {
      			temperatureService = new Service.TemperatureSensor("Room Temperature");
			temperatureService
			        .getCharacteristic(Characteristic.CurrentTemperature)
			        .on('get', this.getTemperature.bind(this));


	return [informationService, temperatureService];
		}
	}
};
