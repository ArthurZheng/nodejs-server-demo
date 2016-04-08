'use strict';

const express = require('express');
const uninvoiced_times = require('./routes/uninvoiced_times');

var app = express();

app.get('/uninvoiced_times.json', uninvoiced_times.handler);

app.listen(3001);
