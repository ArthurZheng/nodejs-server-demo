const mysql = require('mysql');

const connection = mysql.createConnection({
	host: '192.168.99.100',
	user: 'dius_timesheet',
	password: 'dius_timesheet',
	database: 'dius_timesheet',
	dateStrings: true,
})

connection.connect();

module.exports = connection;
