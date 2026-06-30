const express = require('express');
const pool = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticate, async (req, res) => {
  try {
    const doctorId = req.doctor.id;

    const [todayStats] = await pool.query(
      `SELECT
         COUNT(*) AS today_total,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS today_pending,
         SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS today_confirmed,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS today_completed,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS today_cancelled,
         SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) AS today_no_show
       FROM appointments
       WHERE appointment_date = DATE('now') AND doctor_id = ?`,
      [doctorId]
    );

    const [monthStats] = await pool.query(
      `SELECT COUNT(*) AS this_month_total
       FROM appointments
       WHERE doctor_id = ?
         AND strftime('%m', appointment_date) = strftime('%m', 'now')
         AND strftime('%Y', appointment_date) = strftime('%Y', 'now')`,
      [doctorId]
    );

    const [patientCount] = await pool.query(
      'SELECT COUNT(DISTINCT patient_id) AS total_patients FROM appointments WHERE doctor_id = ?',
      [doctorId]
    );

    res.json({
      success: true,
      data: {
        ...todayStats[0],
        this_month_total: monthStats[0].this_month_total,
        total_patients: patientCount[0].total_patients,
      },
      message: 'Dashboard stats retrieved.',
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT appointment_date, COUNT(*) AS appointment_count
       FROM appointments
       WHERE doctor_id = ?
         AND appointment_date BETWEEN DATE('now') AND DATE('now', '+6 days')
         AND status NOT IN ('cancelled', 'no_show')
       GROUP BY appointment_date
       ORDER BY appointment_date`,
      [req.doctor.id]
    );

    const result = [];
    for (let i = 0; i < 7; i++) {
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + i);
      const dateStr = dateObj.toISOString().split('T')[0];
      const found = rows.find((r) => {
        const rDate = r.appointment_date instanceof Date
          ? r.appointment_date.toISOString().split('T')[0]
          : new Date(r.appointment_date).toISOString().split('T')[0];
        return rDate === dateStr;
      });
      result.push({
        date: dateStr,
        day: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
        appointment_count: found ? found.appointment_count : 0,
      });
    }

    res.json({ success: true, data: result, message: 'Upcoming appointments retrieved.' });
  } catch (error) {
    console.error('Dashboard upcoming error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

module.exports = router;
