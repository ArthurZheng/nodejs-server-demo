'use strict';
const moment = require('moment');
const db = require('../db');

module.exports = function(req, res) {
	db.query(`
	SELECT
	timesheet_project.proj_id AS project_id,
	timesheet_approvals.id AS approval_id,
	CONCAT(timesheet_client.organisation, " - ", timesheet_project.title ) AS client_project,

	DATE(DATE_SUB(timesheet_times.start_time, INTERVAL WEEKDAY(timesheet_times.end_time) DAY)) as week_start,

	timesheet_user.id AS consultant_id,

	CONCAT(timesheet_user.first_name, " ", timesheet_user.last_name) AS consultant,

	timesheet_times.id AS timesheet_times_id,

	DATE(timesheet_times.start_time) AS timesheet_time_date,

	TIMESTAMPDIFF(MINUTE,timesheet_times.start_time, timesheet_times.end_time) / 60 AS hours,

	IF(timesheet_approvals.updated_at < timesheet_times.user_updated_at, "Changed", "Saved") AS timesheet_time_entry_status,

	IF(timesheet_times.user_updated_at > timesheet_approvals.updated_at, "Changed", "Not Changed" )AS is_time_entry_changed_since,

	IF(timesheet_approvals.id is NOT NULL, "YES", "NO") AS is_there_approval,

	IF(timesheet_times.user_updated_at > timesheet_approvals.updated_at, "Changed", IF(timesheet_approvals.id is NOT NULL, timesheet_approvals.status, "Saved") ) AS status

	FROM timesheet_times
	LEFT JOIN timesheet_user
		ON timesheet_times.user_id = timesheet_user.id

	LEFT JOIN timesheet_project
		ON timesheet_project.proj_id = timesheet_times.proj_id

	LEFT JOIN timesheet_client
		ON timesheet_client.client_id = timesheet_project.client_id

	LEFT JOIN timesheet_approvals
		ON timesheet_approvals.user_id = timesheet_user.id
		AND timesheet_approvals.proj_id = timesheet_project.proj_id
		AND timesheet_approvals.start_time <= timesheet_times.start_time
		AND timesheet_approvals.end_time >= timesheet_times.end_time


	WHERE timesheet_times.invoice_item_id is NULL
		AND timesheet_times.billable = TRUE

	ORDER BY timesheet_times.id DESC;`, function(err, rows) {
		if (err) {
			console.error(err)
			return
		}

		var projects = {};

		for (var i = 0; i < rows.length; i++) {
			let row = rows[i];
			if (!projects.hasOwnProperty(row.project_id)) {
				projects[row.project_id] = {
					name: row.client_project,
					consultantWeeks: {},
				}
			}

			let project = projects[row.project_id];
			let rowkey = row.consultant_id + ':' + row.week_start;

			if (!project.consultantWeeks.hasOwnProperty(rowkey)){
				project.consultantWeeks[rowkey] = {
					weekStart: row.week_start,
					consultant: {
						id: row.consultant_id,
						name: row.consultant,
					},
					hours: 0,
					rate: row.rate,
					units: ROUND(TIMESTAMPDIFF(MINUTE, times.start_time, times.end_time) / 60 / 8, 1),
					times: [],
				}
			}

			let cw = project.consultantWeeks[rowkey]
			cw.hours += row.hours
			cw.times.push({
				date: row.timesheet_time_date,
				hours: row.hours,
			})
		}

		let projects_array = [];
		for (let k in projects) {
				let project = projects[k];
				let consultant_weeks = [];
				for(let j in project.consultantWeeks){
					let consultant_week = project.consultantWeeks[j]
					consultant_weeks.push(consultant_week)
				}
				project.consultantWeeks = consultant_weeks;
				projects_array.push(project)
		}

		res.send(JSON.stringify({projects: projects_array}, null, '  '));

	})
};
	/*
	projects: [
		{
			name: "Jemena - CABS OneSAP Integration"
			consultantWeeks: [
				{
					weekStart: "2016-03-28"
					consultant: {
						name: "Sophy Basir"
						id: 1234
					}
					hours: 32,
					times: [
						{ date: "2016-03-29", hours: 8 },
						{ date: "2016-03-30", hours: 8 },
						{ date: "2016-03-31", hours: 8 },
						{ date: "2016-04-01", hours: 8 },
					]
				}
			]
		}
	]
	*/
