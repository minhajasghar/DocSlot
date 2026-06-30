const express = require('express');
const pool = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/overview', authenticate, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // SQLite uses strftime for date operations.
    // If month and year are provided, we format them for LIKE '%YYYY-MM-%' or exact strftime.
    // Let's assume month is 01-12 and year is YYYY.
    let dateFilter = '';
    let params = [req.doctor.id];
    
    if (month && year) {
      dateFilter = `AND strftime('%Y-%m', appointment_date) = ?`;
      params.push(`${year}-${month.padStart(2, '0')}`);
    }

    const sql = `
      SELECT 
        COUNT(id) as total_appointments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show,
        SUM(CASE WHEN payment_status = 'paid' THEN 
          (SELECT consultation_fee FROM doctors WHERE id = appointments.doctor_id) 
        ELSE 0 END) as total_revenue,
        COUNT(DISTINCT patient_id) as unique_patients
      FROM appointments 
      WHERE doctor_id = ? ${dateFilter}
    `;

    const [rows] = await pool.query(sql, params);
    const data = rows[0] || {};
    
    const total = data.total_appointments || 0;
    const completed = data.completed || 0;
    const noShow = data.no_show || 0;
    
    data.no_show_rate = total > 0 ? ((noShow / total) * 100).toFixed(1) : 0;
    data.completion_rate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;

    // To get new vs returning patients, it requires a more complex query, 
    // but for simplicity we can estimate or just return the unique patient count for now.
    // Let's implement new patients as those whose first appointment is in this month.
    let newPatientsQuery = `
      SELECT COUNT(*) as new_patients FROM (
        SELECT patient_id, MIN(appointment_date) as first_visit
        FROM appointments
        WHERE doctor_id = ?
        GROUP BY patient_id
      )
    `;
    let newParams = [req.doctor.id];
    if (month && year) {
      newPatientsQuery += ` WHERE strftime('%Y-%m', first_visit) = ?`;
      newParams.push(`${year}-${month.padStart(2, '0')}`);
    }
    
    const [newPatRows] = await pool.query(newPatientsQuery, newParams);
    data.new_patients = newPatRows[0].new_patients || 0;
    data.returning_patients = Math.max(0, data.unique_patients - data.new_patients);

    res.json({ success: true, data, message: 'Analytics overview retrieved.' });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/daily', authenticate, async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ success: false, data: null, message: 'month and year are required.' });
    }

    const sql = `
      SELECT appointment_date as date, COUNT(id) as count
      FROM appointments
      WHERE doctor_id = ? AND strftime('%Y-%m', appointment_date) = ?
      GROUP BY appointment_date
      ORDER BY appointment_date ASC
    `;
    const [rows] = await pool.query(sql, [req.doctor.id, `${year}-${month.padStart(2, '0')}`]);

    res.json({ success: true, data: rows, message: 'Daily analytics retrieved.' });
  } catch (error) {
    console.error('Daily analytics error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/by-day-of-week', authenticate, async (req, res) => {
  try {
    // strftime('%w', appointment_date) returns 0 (Sunday) to 6 (Saturday)
    const sql = `
      SELECT 
        strftime('%w', appointment_date) as day_index,
        COUNT(id) as count
      FROM appointments
      WHERE doctor_id = ?
      GROUP BY day_index
    `;
    const [rows] = await pool.query(sql, [req.doctor.id]);
    
    const daysMap = { '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat' };
    let result = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
    
    rows.forEach(r => {
      const dayName = daysMap[r.day_index];
      if (dayName) {
        result[dayName] = r.count;
      }
    });

    res.json({ success: true, data: result, message: 'Day of week analytics retrieved.' });
  } catch (error) {
    console.error('Day of week analytics error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/peak-hours', authenticate, async (req, res) => {
  try {
    const sql = `
      SELECT strftime('%H:%M', slot_time) as time, COUNT(id) as count
      FROM appointments
      WHERE doctor_id = ?
      GROUP BY time
      ORDER BY count DESC, time ASC
    `;
    const [rows] = await pool.query(sql, [req.doctor.id]);

    let result = {};
    rows.forEach(r => {
      result[r.time] = r.count;
    });

    res.json({ success: true, data: result, message: 'Peak hours retrieved.' });
  } catch (error) {
    console.error('Peak hours error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/top-patients', authenticate, async (req, res) => {
  try {
    const sql = `
      SELECT p.id, p.name, p.phone, COUNT(a.id) as visit_count
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.doctor_id = ? AND a.status = 'completed'
      GROUP BY p.id, p.name, p.phone
      ORDER BY visit_count DESC
      LIMIT 5
    `;
    const [rows] = await pool.query(sql, [req.doctor.id]);
    res.json({ success: true, data: rows, message: 'Top patients retrieved.' });
  } catch (error) {
    console.error('Top patients error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/monthly-summary', authenticate, async (req, res) => {
  try {
    const { year } = req.query;
    if (!year) {
      return res.status(400).json({ success: false, data: null, message: 'year is required.' });
    }

    const sql = `
      SELECT 
        strftime('%m', appointment_date) as month,
        COUNT(id) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN payment_status = 'paid' THEN 
          (SELECT consultation_fee FROM doctors WHERE id = appointments.doctor_id) 
        ELSE 0 END) as revenue
      FROM appointments
      WHERE doctor_id = ? AND strftime('%Y', appointment_date) = ?
      GROUP BY month
      ORDER BY month ASC
    `;
    const [rows] = await pool.query(sql, [req.doctor.id, year]);

    // Ensure all 12 months are present
    let result = [];
    for (let i = 1; i <= 12; i++) {
      const monthStr = i.toString().padStart(2, '0');
      const found = rows.find(r => r.month === monthStr);
      result.push({
        month: monthStr,
        total: found ? found.total : 0,
        completed: found ? found.completed : 0,
        revenue: found ? found.revenue : 0
      });
    }

    res.json({ success: true, data: result, message: 'Monthly summary retrieved.' });
  } catch (error) {
    console.error('Monthly summary error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

module.exports = router;
