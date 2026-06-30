const express = require('express');
const pool = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/today', authenticate, async (req, res) => {
  try {
    const sql = `
      SELECT a.id as appointment_id, a.token_number as token, a.slot_time as time, 
             a.payment_status, a.payment_method, a.status,
             p.name as patient_name,
             (SELECT consultation_fee FROM doctors WHERE id = ?) as fee
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.doctor_id = ? AND a.appointment_date = DATE('now')
      ORDER BY a.slot_time ASC
    `;
    const [rows] = await pool.query(sql, [req.doctor.id, req.doctor.id]);

    let total_completed_today = 0;
    let total_collected_today = 0;
    let pending_collection = 0;
    let waived_count = 0;

    let payments = rows.map(r => {
      if (r.status === 'completed') total_completed_today++;
      if (r.payment_status === 'paid') total_collected_today += r.fee;
      if (r.payment_status === 'unpaid' && r.status === 'completed') pending_collection += r.fee;
      if (r.payment_status === 'waived') waived_count++;

      return {
        appointment_id: r.appointment_id,
        patient_name: r.patient_name,
        token: r.token,
        time: r.time,
        fee: r.fee,
        payment_status: r.payment_status,
        payment_method: r.payment_method,
        status: r.status
      };
    });

    res.json({
      success: true,
      data: { total_completed_today, total_collected_today, pending_collection, waived_count, payments },
      message: 'Today billing data retrieved.'
    });
  } catch (error) {
    console.error('Get today billing error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/summary', authenticate, async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ success: false, data: null, message: 'month and year are required.' });
    }

    const sql = `
      SELECT appointment_date as date,
             SUM(CASE WHEN payment_status = 'paid' THEN 
               (SELECT consultation_fee FROM doctors WHERE id = appointments.doctor_id) 
             ELSE 0 END) as collected,
             SUM(CASE WHEN payment_status = 'unpaid' AND status = 'completed' THEN 
               (SELECT consultation_fee FROM doctors WHERE id = appointments.doctor_id) 
             ELSE 0 END) as pending
      FROM appointments
      WHERE doctor_id = ? AND strftime('%Y-%m', appointment_date) = ?
      GROUP BY appointment_date
      ORDER BY appointment_date ASC
    `;
    const [rows] = await pool.query(sql, [req.doctor.id, `${year}-${month.padStart(2, '0')}`]);

    res.json({ success: true, data: rows, message: 'Billing summary retrieved.' });
  } catch (error) {
    console.error('Get billing summary error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

module.exports = router;
