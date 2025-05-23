[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

[![node-current](https://img.shields.io/node/v/homebridge-luxtronik2)](https://github.com/cbrandlehner/homebridge-luxtronik2)
[![npm](https://img.shields.io/npm/dt/homebridge-luxtronik2.svg)](https://www.npmjs.com/package/homebridge-luxtronik2)
[![npm](https://img.shields.io/npm/l/homebridge-luxtronik2.svg)](https://github.com/cbrandlehner/homebridge-luxtronik2/blob/master/LICENSE)

![Node CI](https://github.com/cbrandlehner/homebridge-luxtronik2/workflows/Node%20CI/badge.svg)
![CodeQL](https://github.com/cbrandlehner/homebridge-luxtronik2/workflows/CodeQL/badge.svg)


# homebridge-luxtronik2

This plugin for [HomeBridge](https://github.com/nfarina/homebridge) adds a temperature sensor. The temperature is one of the sensors connected to a Luxtronik2 based heat pump controller (Siemens, Novelan, Wolf, Alpha Innotec).

The code uses an API exposed by these Luxtronik2 devices on Port 8888.

Newer versions of Luxtronik devices have a different API and are not supported. For these devices there is [this plugin](https://github.com/Bouni/luxtronik).


## Install guide
Install and configure [Homebridge](https://github.com/nfarina/homebridge) and [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x#readme).

Open the configuration UI and navigate to the Plugins section. Search for "Luxtronik2" and click "Install".

Next, configure the plugin.

To activate the plugin, restart Homebridge.


## USAGE
A temperature sensor should appear on your iOS device as accessory in the "HOME" app.
