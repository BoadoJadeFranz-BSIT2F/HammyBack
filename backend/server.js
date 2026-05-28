require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const authRoutes = require('./routes/auth');
const googleAuthRoutes = require('./routes/google-auth');
const classRoutes = require('./routes/classes');
const passwordResetRoutes = require('./routes/password-reset');
const scheduleRoutes = require('./routes/schedules');
const deadlineRoutes = require('./routes/deadlines-new'); // NEW: Google Classroom-style deadlines
const submissionRoutes = require('./routes/submissions'); // NEW: Student submissions
const gradeRoutes = require('./routes/grades');
const taskRoutes = require('./routes/tasks');
const fileRoutes = require('./routes/files-local'); // Using local file storage
const archiveRoutes = require('./routes/archive');
const wellnessRoutes = require('./routes/wellness');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve uploaded files statically with proper headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/password', passwordResetRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/deadlines', deadlineRoutes); // Google Classroom-style deadlines with file upload
app.use('/api/submissions', submissionRoutes); // Student submission system
app.use('/api/grades', gradeRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/wellness', wellnessRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'LMS Backend API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
