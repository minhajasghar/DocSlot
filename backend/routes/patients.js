const express = require('express');
const pool = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    let sql = 'SELECT * FROM patients WHERE 1=1';
    const params = [];

    if (req.query.search) {
      sql += ' AND (name LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${req.query.search}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows, message: 'Patients retrieved.' });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/phone/:phone', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, phone, age, gender FROM patients WHERE phone = ?', [req.params.phone]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Patient not found.' });
    }
    res.json({ success: true, data: rows[0], message: 'Patient found.' });
  } catch (error) {
    console.error('Lookup patient error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [patient] = await pool.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);

    if (patient.length === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Patient not found.' });
    }

    const [appointments] = await pool.query(
      `SELECT a.id, a.appointment_date, a.slot_time, a.token_number, a.status, a.reason, a.notes
       FROM appointments a
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC, a.slot_time DESC`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: { ...patient[0], appointments },
      message: 'Patient retrieved.',
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, email, age, gender, address } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Name and phone are required.',
      });
    }

    const [existing] = await pool.query('SELECT * FROM patients WHERE phone = ?', [phone]);
    if (existing.length > 0) {
      return res.json({
        success: true,
        data: existing[0],
        message: 'Patient already exists.',
      });
    }

    const [result] = await pool.query(
      'INSERT INTO patients (name, phone, email, age, gender, address) VALUES (?, ?, ?, ?, ?, ?)',
      [name, phone, email || null, age || null, gender || null, address || null]
    );

    const [patient] = await pool.query('SELECT * FROM patients WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      data: patient[0],
      message: 'Patient created successfully.',
    });
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Patient not found.' });
    }

    const { name, phone, email, age, gender, address } = req.body;

    await pool.query(
      'UPDATE patients SET name = ?, phone = ?, email = ?, age = ?, gender = ?, address = ? WHERE id = ?',
      [
        name || existing[0].name,
        phone || existing[0].phone,
        email !== undefined ? email : existing[0].email,
        age !== undefined ? age : existing[0].age,
        gender !== undefined ? gender : existing[0].gender,
        address !== undefined ? address : existing[0].address,
        req.params.id,
      ]
    );

    const [updated] = await pool.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);

    res.json({ success: true, data: updated[0], message: 'Patient updated.' });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/:id/appointments', authenticate, async (req, res) => {
  try {
    const [patient] = await pool.query('SELECT id FROM patients WHERE id = ?', [req.params.id]);
    if (patient.length === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Patient not found.' });
    }

    const [appointments] = await pool.query(
      `SELECT a.*, d.name AS doctor_name, d.specialization
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.patient_id = ? AND a.appointment_date <= DATE('now')
       ORDER BY a.appointment_date DESC, a.slot_time DESC`,
      [req.params.id]
    );

    res.json({ success: true, data: appointments, message: 'Past appointments retrieved.' });
  } catch (error) {
    console.error('Get patient appointments error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/:id/profile', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM patient_medical_profiles WHERE patient_id = ?', [req.params.id]);
    if (rows.length === 0) {
      const [result] = await pool.query('INSERT INTO patient_medical_profiles (patient_id) VALUES (?)', [req.params.id]);
      const [newProfile] = await pool.query('SELECT * FROM patient_medical_profiles WHERE id = ?', [result.insertId]);
      return res.json({ success: true, data: newProfile[0], message: 'Empty medical profile created.' });
    }
    res.json({ success: true, data: rows[0], message: 'Medical profile retrieved.' });
  } catch (error) {
    console.error('Get medical profile error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.put('/:id/profile', authenticate, async (req, res) => {
  try {
    const { blood_group, allergies, chronic_conditions, current_medications, emergency_contact_name, emergency_contact_phone, notes } = req.body;
    
    const [existing] = await pool.query('SELECT id FROM patient_medical_profiles WHERE patient_id = ?', [req.params.id]);
    if (existing.length === 0) {
      await pool.query('INSERT INTO patient_medical_profiles (patient_id) VALUES (?)', [req.params.id]);
    }

    await pool.query(
      `UPDATE patient_medical_profiles 
       SET blood_group = ?, allergies = ?, chronic_conditions = ?, current_medications = ?, 
           emergency_contact_name = ?, emergency_contact_phone = ?, notes = ?
       WHERE patient_id = ?`,
      [blood_group, allergies, chronic_conditions, current_medications, emergency_contact_name, emergency_contact_phone, notes, req.params.id]
    );

    res.json({ success: true, data: null, message: 'Medical profile updated.' });
  } catch (error) {
    console.error('Update medical profile error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.get('/:id/prescriptions', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, d.name AS doctor_name
       FROM prescriptions p
       JOIN doctors d ON p.doctor_id = d.id
       WHERE p.patient_id = ?
       ORDER BY p.created_at DESC`,
      [req.params.id]
    );
    
    // Parse medicines JSON
    const parsedRows = rows.map(r => ({
      ...r,
      medicines: r.medicines ? JSON.parse(r.medicines) : []
    }));

    res.json({ success: true, data: parsedRows, message: 'Prescriptions retrieved.' });
  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

router.post('/:id/prescriptions', authenticate, async (req, res) => {
  try {
    const { appointment_id, medicines, instructions, follow_up_date } = req.body;
    
    const medicinesJson = medicines ? JSON.stringify(medicines) : '[]';

    const [result] = await pool.query(
      `INSERT INTO prescriptions (appointment_id, patient_id, doctor_id, medicines, instructions, follow_up_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [appointment_id || null, req.params.id, req.doctor.id, medicinesJson, instructions, follow_up_date || null]
    );

    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Prescription created.' });
  } catch (error) {
    console.error('Create prescription error:', error);
    res.status(500).json({ success: false, data: null, message: 'Internal server error.' });
  }
});

module.exports = router;
