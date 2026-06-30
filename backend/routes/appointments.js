const express = require('express');
const pool = require('../db');
const authenticate = require('../middleware/auth');
const { sendWhatsApp } = require('../utils/whatsapp');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    let sql = `
      SELECT a.id, a.appointment_date, a.slot_time, a.token_number, a.status, a.reason, a.notes,
             p.id AS patient_id, p.name AS patient_name, p.phone AS patient_phone
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.doctor_id = ?
    `;
    const params = [req.doctor.id];

    if (req.query.date) {
      sql += ' AND a.appointment_date = ?';
      params.push(req.query.date);
    }

    if (req.query.status) {
      sql += ' AND a.status = ?';
      params.push(req.query.status);
    }

    if (req.query.search) {
      sql += ' AND (p.name LIKE ? OR p.phone LIKE ?)';
      const term = `%${req.query.search}%`;
      params.push(term, term);
    }

    sql += ' ORDER BY a.appointment_date DESC, a.slot_time ASC';

    const [rows] = await pool.query(sql, params);

    res.json({ success: true, data: rows, message: 'Appointments retrieved.' });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/today', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.appointment_date, a.slot_time, a.token_number, a.status, a.reason,
              p.id AS patient_id, p.name AS patient_name, p.phone AS patient_phone, p.age AS patient_age
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.appointment_date = DATE('now') AND a.doctor_id = ?
       ORDER BY a.slot_time ASC`,
      [req.doctor.id]
    );

    res.json({ success: true, data: rows, message: 'Today\'s appointments retrieved.' });
  } catch (error) {
    console.error('Get today appointments error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, p.name AS patient_name, p.phone AS patient_phone, p.email AS patient_email,
              p.age AS patient_age, p.gender AS patient_gender, p.address AS patient_address,
              d.name AS doctor_name, d.specialization AS doctor_specialization
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Appointment not found.' });
    }

    res.json({ success: true, data: rows[0], message: 'Appointment retrieved.' });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { doctor_id, patient_id, appointment_date, slot_time, reason } = req.body;

    if (!doctor_id || !patient_id || !appointment_date || !slot_time) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'doctor_id, patient_id, appointment_date, and slot_time are required.',
      });
    }

    const [blocked] = await pool.query(
      'SELECT id FROM blocked_dates WHERE doctor_id = ? AND blocked_date = ?',
      [doctor_id, appointment_date]
    );
    if (blocked.length > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'This date is blocked. Please choose another date.',
      });
    }

    const [existing] = await pool.query(
      `SELECT id FROM appointments
       WHERE doctor_id = ? AND appointment_date = ? AND slot_time = ? AND status NOT IN ('cancelled', 'no_show')`,
      [doctor_id, appointment_date, slot_time]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        message: 'This time slot is already booked.',
      });
    }

    const [maxToken] = await pool.query(
      'SELECT COALESCE(MAX(token_number), 0) AS max_token FROM appointments WHERE doctor_id = ? AND appointment_date = ?',
      [doctor_id, appointment_date]
    );
    const tokenNumber = maxToken[0].max_token + 1;

    const [result] = await pool.query(
      `INSERT INTO appointments (doctor_id, patient_id, appointment_date, slot_time, token_number, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [doctor_id, patient_id, appointment_date, slot_time, tokenNumber, reason || null]
    );

    const [appointment] = await pool.query(
      `SELECT a.*, p.name AS patient_name, p.phone AS patient_phone
       FROM appointments a JOIN patients p ON a.patient_id = p.id
       WHERE a.id = ?`,
      [result.insertId]
    );

    // WHATSAPP TRIGGER - Confirmation
    const appt = appointment[0];
    const [doctorInfo] = await pool.query('SELECT name, clinic_name FROM doctors WHERE id = ?', [doctor_id]);
    const [settings] = await pool.query('SELECT whatsapp_notifications FROM clinic_settings WHERE doctor_id = ?', [doctor_id]);
    
    if (settings.length > 0 && settings[0].whatsapp_notifications && appt.patient_phone) {
      const clinic = doctorInfo[0].clinic_name || doctorInfo[0].name;
      const msg = `Hello ${appt.patient_name}, your appointment at ${clinic} is confirmed for ${appt.appointment_date} at ${appt.slot_time}. Your token number is ${appt.token_number}.`;
      sendWhatsApp(appt.patient_phone, msg);
    }

    res.status(201).json({
      success: true,
      data: appointment[0],
      message: 'Appointment created successfully.',
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'in_consultation', 'completed', 'cancelled', 'no_show'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const [existing] = await pool.query('SELECT id, doctor_id FROM appointments WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Appointment not found.' });
    }

    if (existing[0].doctor_id !== req.doctor.id) {
      return res.status(403).json({ success: false, data: null, message: 'Access denied.' });
    }

    await pool.query('UPDATE appointments SET status = ? WHERE id = ?', [status, req.params.id]);

    // WHATSAPP TRIGGER - Cancellation
    if (status === 'cancelled') {
      const [apptDetails] = await pool.query(
        `SELECT a.appointment_date, p.name, p.phone, d.name AS doc_name, d.clinic_name, s.booking_url, s.cancellation_notifications
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN doctors d ON a.doctor_id = d.id
         LEFT JOIN clinic_settings s ON d.id = s.doctor_id
         WHERE a.id = ?`,
        [req.params.id]
      );
      if (apptDetails.length > 0) {
        const det = apptDetails[0];
        if (det.cancellation_notifications !== 0 && det.phone) {
          const clinic = det.clinic_name || det.doc_name;
          const msg = `Hello ${det.name}, your appointment at ${clinic} on ${det.appointment_date} has been cancelled. Please visit ${det.booking_url || 'our clinic'} to rebook.`;
          sendWhatsApp(det.phone, msg);
        }
      }
    }

    res.json({ success: true, data: { id: parseInt(req.params.id), status }, message: 'Status updated.' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.put('/:id/notes', authenticate, async (req, res) => {
  try {
    const { notes } = req.body;

    if (notes === undefined || notes === null) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Notes field is required.',
      });
    }

    const [existing] = await pool.query('SELECT id, doctor_id FROM appointments WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Appointment not found.' });
    }

    if (existing[0].doctor_id !== req.doctor.id) {
      return res.status(403).json({ success: false, data: null, message: 'Access denied.' });
    }

    await pool.query('UPDATE appointments SET notes = ? WHERE id = ?', [notes, req.params.id]);

    res.json({ success: true, data: { id: parseInt(req.params.id), notes }, message: 'Notes saved.' });
  } catch (error) {
    console.error('Update notes error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.put('/:id/reschedule', authenticate, async (req, res) => {
  try {
    const { appointment_date, slot_time } = req.body;

    if (!appointment_date || !slot_time) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'appointment_date and slot_time are required.',
      });
    }

    const [existing] = await pool.query('SELECT doctor_id FROM appointments WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Appointment not found.' });
    }

    if (existing[0].doctor_id !== req.doctor.id) {
      return res.status(403).json({ success: false, data: null, message: 'Access denied.' });
    }

    const doctorId = existing[0].doctor_id;

    const [blocked] = await pool.query(
      'SELECT id FROM blocked_dates WHERE doctor_id = ? AND blocked_date = ?',
      [doctorId, appointment_date]
    );
    if (blocked.length > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'This date is blocked. Please choose another date.',
      });
    }

    const [conflict] = await pool.query(
      `SELECT id FROM appointments
       WHERE doctor_id = ? AND appointment_date = ? AND slot_time = ? AND status NOT IN ('cancelled', 'no_show') AND id != ?`,
      [doctorId, appointment_date, slot_time, req.params.id]
    );
    if (conflict.length > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        message: 'This time slot is already booked.',
      });
    }

    const [maxToken] = await pool.query(
      'SELECT COALESCE(MAX(token_number), 0) AS max_token FROM appointments WHERE doctor_id = ? AND appointment_date = ?',
      [doctorId, appointment_date]
    );
    const tokenNumber = maxToken[0].max_token + 1;

    await pool.query(
      'UPDATE appointments SET appointment_date = ?, slot_time = ?, token_number = ? WHERE id = ?',
      [appointment_date, slot_time, tokenNumber, req.params.id]
    );

    res.json({
      success: true,
      data: { id: parseInt(req.params.id), appointment_date, slot_time, token_number: tokenNumber },
      message: 'Appointment rescheduled.',
    });
  } catch (error) {
    console.error('Reschedule error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id, doctor_id FROM appointments WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Appointment not found.' });
    }

    if (existing[0].doctor_id !== req.doctor.id) {
      return res.status(403).json({ success: false, data: null, message: 'Access denied.' });
    }

    await pool.query('UPDATE appointments SET status = ? WHERE id = ?', ['cancelled', req.params.id]);

    res.json({ success: true, data: null, message: 'Appointment cancelled.' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.post('/:id/remind', authenticate, async (req, res) => {
  try {
    const [apptDetails] = await pool.query(
      `SELECT a.appointment_date, a.slot_time, a.token_number, p.name, p.phone, d.name AS doc_name, d.clinic_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.id = ? AND a.doctor_id = ?`,
      [req.params.id, req.doctor.id]
    );

    if (apptDetails.length === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Appointment not found.' });
    }

    const det = apptDetails[0];
    if (!det.phone) {
      return res.status(400).json({ success: false, data: null, message: 'Patient has no phone number.' });
    }

    const clinic = det.clinic_name || det.doc_name;
    const msg = `Reminder: Hello ${det.name}, you have an appointment at ${clinic} on ${det.appointment_date} at ${det.slot_time}. Your token number is ${det.token_number}.`;
    
    await sendWhatsApp(det.phone, msg);

    res.json({ success: true, data: null, message: 'Reminder sent.' });
  } catch (error) {
    console.error('Send reminder error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.put('/:id/payment', authenticate, async (req, res) => {
  try {
    const { payment_status, payment_method } = req.body;
    
    if (!payment_status) {
      return res.status(400).json({ success: false, data: null, message: 'payment_status is required.' });
    }

    const [existing] = await pool.query('SELECT id, doctor_id FROM appointments WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Appointment not found.' });
    }

    if (existing[0].doctor_id !== req.doctor.id) {
      return res.status(403).json({ success: false, data: null, message: 'Access denied.' });
    }

    const paymentTime = new Date().toISOString();
    await pool.query(
      'UPDATE appointments SET payment_status = ?, payment_method = ?, payment_time = ? WHERE id = ?',
      [payment_status, payment_method || null, paymentTime, req.params.id]
    );

    res.json({ success: true, data: { id: parseInt(req.params.id), payment_status, payment_method, payment_time: paymentTime }, message: 'Payment updated.' });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

module.exports = router;
