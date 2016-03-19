[![npm][npm-image]][npm-url]
[![downloads][downloads-image]][downloads-url]

[![node](https://img.shields.io/node/v/gh-badges.svg)](https://img.shields.io/npm/dm/homebridge-luxtronik2.svg?style=flat)
[npm-image]: https://img.shields.io/npm/v/homebridge-luxtronik2.svg?style=flat
[npm-url]: https://npmjs.org/package/homebridge-luxtronik2
[downloads-image]: https://img.shields.io/npm/dm/homebridge-luxtronik2.svg?style=flat
[downloads-url]: https://npmjs.org/package/homebridge-luxtronik2


# homebridge-luxtronik2

This plugin for Homebridge adds a temperature sensor information. The temperature is the outside temperature measured by a Luxtronik2 based heat pump controller (Siemens, Novelan, Wolf, Alpha Innotec).

## Install guide
First follow the instructions to install homebridge: https://github.com/nfarina/homebridge

If you have Node and NPM setup basically:
```bash
npm install -g homebridge
```

Once you have homebridge installed, install this plugin:

```bash
npm install -g homebridge-luxtronik2
```

Now you will have to setup your config.json for homebridge. An example
is included in this repo.

## Post install
When you have installed homebridge and homebridge-luxtronik2 and got them running
and setup on your iOS device a temperature sensor hould popup on your iOS device 
as accessory in Homekit.


