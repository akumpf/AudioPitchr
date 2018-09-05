"use strict";

const Chromagram  = require('./src/chromagram.js');
const Chromachord = require('./src/chromachord.js');

module.exports = {
  Chromagram:   Chromagram,
  Chromachord:  Chromachord,
};
// --
global.audiopitchr = module.exports;
