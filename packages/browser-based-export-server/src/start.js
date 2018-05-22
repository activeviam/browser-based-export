'use strict';

const config = require('./config');
const {withServer} = require('./server');

withServer({config});
