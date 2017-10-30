'use strict';

const config = require('./config');
const {createServer} = require('./server');

createServer(config);
