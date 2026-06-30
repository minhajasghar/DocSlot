const express = require('express');
const pool = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clinic_settings WHERE doctor_id = ?', [req.doctor.id]);
    
    if (rows.length === 0) {
      // Create default settings if not exists
      const [result] = await pool.query(
        'INSERT INTO clinic_settings (doctor_id) VALUES (?)',
        [req.doctor.id]
      );
      const [newSettings] = await pool.query('SELECT * FROM clinic_settings WHERE id = ?', [result.insertId]);
      return res.json({ success: true, data: newSettings[0], message: 'Default clinic settings created.' });
    }

    res.json({ success: true, data: rows[0], message: 'Clinic settings retrieved.' });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.put('/', authenticate, async (req, res) => {
  try {
    const { whatsapp_notifications, cancellation_notifications, booking_url } = req.body;
    
    // Check if exists
    const [rows] = await pool.query('SELECT id FROM clinic_settings WHERE doctor_id = ?', [req.doctor.id]);
    
    if (rows.length === 0) {
      await pool.query(
        'INSERT INTO clinic_settings (doctor_id, whatsapp_notifications, cancellation_notifications, booking_url) VALUES (?, ?, ?, ?)',
        [req.doctor.id, whatsapp_notifications ? 1 : 0, cancellation_notifications ? 1 : 0, booking_url || null]
      );
    } else {
      await pool.query(
        'UPDATE clinic_settings SET whatsapp_notifications = ?, cancellation_notifications = ?, booking_url = ? WHERE doctor_id = ?',
        [whatsapp_notifications ? 1 : 0, cancellation_notifications ? 1 : 0, booking_url || null, req.doctor.id]
      );
    }

    res.json({ 
      success: true, 
      data: { whatsapp_notifications, cancellation_notifications, booking_url }, 
      message: 'Clinic settings updated.' 
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

module.exports = router;
