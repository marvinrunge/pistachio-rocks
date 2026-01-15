const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.start = require('./start');
exports.submit = require('./submit');
exports.scores = require('./scores');
