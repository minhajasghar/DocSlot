const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const patientRoutes = require('./routes/patients');
const slotRoutes = require('./routes/slots');
const dashboardRoutes = require('./routes/dashboard');
const doctorRoutes = require('./routes/doctors');
const analyticsRoutes = require('./routes/analytics');
const billingRoutes = require('./routes/billing');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: null, message: 'Server is running.' });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    message: `Route ${req.originalUrl} not found.`,
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    data: null,
    message: 'Internal server error.',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
