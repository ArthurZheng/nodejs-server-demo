'use strict';
// const moment = require('moment');
const db = require('../db');

module.exports = {
	handler: function(req, res) {
		getData(function(err, data){
			res.send(JSON.stringify(data, null, '  '));
		});
	},
	dump: function() {
			getData(function(err, data){
				console.log(JSON.stringify(data, null, '  '));
				db.end();
			});
	},
}

function getData(cb) {
	db.query(`
		SELECT

	project.proj_id AS project_id,

	approvals.id AS approval_id,

	CONCAT( client.organisation, " - ", project.title ) AS client_project,

	DATE(DATE_SUB( times.start_time, INTERVAL WEEKDAY( times.end_time) DAY)) as week_start,

	user.id AS consultant_id,

	CONCAT(user.first_name, " ", user.last_name) AS consultant,

	times.id AS timesheet_times_id,

	DATE(times.start_time) AS timesheet_time_date,

	TIMESTAMPDIFF(MINUTE, times.start_time, times.end_time) / 60 AS hours,

	task_assignments.billing_units as Unit_Type,

	task_assignments.bill_rate as rate,

	purchase_order.value - ROUND(TIMESTAMPDIFF(MINUTE, times.start_time, times.end_time) / 60 / 8, 1) * task_assignments.bill_rate  AS amount_remaining,

	purchase_order.value AS budget,

	purchase_order.po_number AS PO_Num,


	IF(approvals.updated_at <  times.user_updated_at, "Changed", "Saved") AS timesheet_time_entry_status,

	IF(times.user_updated_at > approvals.updated_at, "Changed", "Not Changed" )AS is_time_entry_changed_since,

	IF(approvals.id is NOT NULL, "YES", "NO") AS is_there_approval,

	IF(times.user_updated_at > approvals.updated_at, "Changed", IF( approvals.id is NOT NULL, approvals.status, "Saved") ) AS status

	FROM timesheet_times AS times

	LEFT JOIN timesheet_user AS user
		ON user.id = times.user_id

	LEFT JOIN timesheet_project AS project
		ON project.proj_id = times.proj_id

	LEFT JOIN timesheet_client AS client
		ON client.client_id = project.client_id

	LEFT JOIN timesheet_purchase_order AS purchase_order
		ON purchase_order.id = times.po_id

	LEFT JOIN timesheet_task_assignments AS task_assignments
		ON task_assignments.project_task_id = times.project_task_id
		AND task_assignments.user_id = times.user_id

	LEFT JOIN timesheet_approvals AS approvals
		ON approvals.user_id =  user.id
		AND approvals.proj_id =  project.proj_id
		AND  approvals.start_time <=  times.start_time
		AND  approvals.end_time >=  times.end_time


	WHERE times.invoice_item_id is NULL
		AND times.billable = TRUE

	ORDER BY times.id DESC;
`, function(err, rows) {
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

	cb(null, {projects: projects_array});

	})
}
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
