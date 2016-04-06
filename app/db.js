const mysql = require('mysql');

const connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '1234',
	database: 'live',
	dateStrings: true,
})

connection.connect();

module.exports = connection;
