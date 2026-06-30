const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, specialization, clinic_name, bio, consultation_fee, profile_pic FROM doctors WHERE is_active = TRUE'
    );
    res.json({ success: true, data: rows, message: 'Doctors retrieved.' });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, specialization, clinic_name, bio, consultation_fee, profile_pic, created_at FROM doctors WHERE id = ? AND is_active = TRUE',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Doctor not found.' });
    }
    res.json({ success: true, data: rows[0], message: 'Doctor retrieved.' });
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, specialization, clinic_name, bio, consultation_fee } = req.body;
    const doctorId = req.doctor.id;

    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (specialization !== undefined) { fields.push('specialization = ?'); values.push(specialization); }
    if (clinic_name !== undefined) { fields.push('clinic_name = ?'); values.push(clinic_name); }
    if (bio !== undefined) { fields.push('bio = ?'); values.push(bio); }
    if (consultation_fee !== undefined) { fields.push('consultation_fee = ?'); values.push(consultation_fee); }

    if (fields.length > 0) {
      values.push(doctorId);
      await pool.query(
        `UPDATE doctors SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    const [updated] = await pool.query(
      'SELECT id, name, email, phone, specialization, clinic_name, bio, consultation_fee, profile_pic FROM doctors WHERE id = ?',
      [doctorId]
    );

    res.json({ success: true, data: updated[0], message: 'Profile updated.' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.put('/password', authenticate, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    const doctorId = req.doctor.id;

    if (!old_password || !new_password) {
      return res.status(400).json({ success: false, data: null, message: 'old_password and new_password are required.' });
    }

    const [rows] = await pool.query('SELECT password_hash FROM doctors WHERE id = ?', [doctorId]);
    const isMatch = await bcrypt.compare(old_password, rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, data: null, message: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE doctors SET password_hash = ? WHERE id = ?', [hashedPassword, doctorId]);

    res.json({ success: true, data: null, message: 'Password updated.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/:id/slots', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM time_slots WHERE doctor_id = ? ORDER BY CASE day_of_week WHEN 'Mon' THEN 1 WHEN 'Tue' THEN 2 WHEN 'Wed' THEN 3 WHEN 'Thu' THEN 4 WHEN 'Fri' THEN 5 WHEN 'Sat' THEN 6 END, start_time",
      [req.params.id]
    );
    res.json({ success: true, data: rows, message: 'Doctor slots retrieved.' });
  } catch (error) {
    console.error('Get doctor slots error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

module.exports = router;
