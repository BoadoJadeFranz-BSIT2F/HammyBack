const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const supabase = require('../config/supabase');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const router = express.Router();

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password'
  }
});

const ATTACHMENT_MARKER = '__TASK_ATTACHMENT__:';

const encodeTaskDescription = (description, attachmentUrl, attachmentName) => {
  const baseDescription = (description || '').trim();
  if (!attachmentUrl) {
    return baseDescription;
  }

  const attachmentPayload = JSON.stringify({
    url: attachmentUrl,
    name: attachmentName || ''
  });

  return [baseDescription, `${ATTACHMENT_MARKER}${attachmentPayload}`]
    .filter(Boolean)
    .join('\n\n');
};

const stripAttachmentMarker = (description) => {
  if (!description) return '';
  const markerIndex = description.indexOf(ATTACHMENT_MARKER);
  if (markerIndex === -1) return description;
  return description.slice(0, markerIndex).trim();
};

const personalUploadsDir = path.join(__dirname, '../../uploads/personal-tasks');
if (!fs.existsSync(personalUploadsDir)) {
  fs.mkdirSync(personalUploadsDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(personalUploadsDir, `user-${req.user.id}`);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const personalAttachmentUpload = multer({
  storage: uploadStorage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// ==================== STUDENT PERSONAL TASKS ====================

// Upload an attachment file for personal tasks
router.post('/personal/upload', verifyToken, personalAttachmentUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/personal-tasks/user-${req.user.id}/${req.file.filename}`;
    return res.status(201).json({
      message: 'Attachment uploaded successfully',
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype
    });
  } catch (error) {
    console.error('Personal attachment upload error:', error);
    return res.status(500).json({ message: 'Failed to upload attachment' });
  }
});

// Get all personal tasks for a student
router.get('/personal', verifyToken, async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('student_id', req.user.id)
      .eq('type', 'personal')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error fetching personal tasks' });
    }

    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a personal task
router.post('/personal', verifyToken, async (req, res) => {
  try {
    const { title, description, dueDate, attachmentUrl, attachmentName } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const encodedDescription = encodeTaskDescription(description, attachmentUrl, attachmentName);

    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert([
        {
          student_id: req.user.id,
          title,
          description: encodedDescription,
          type: 'personal',
          due_date: dueDate,
          is_completed: false
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error creating task' });
    }

    // Send email notification to user
    try {
      // Fetch user email from database
      const { data: user } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', req.user.id)
        .single();

      if (user && user.email) {
        const dueDateFormatted = dueDate ? new Date(dueDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : 'Not set';

        const plainDescription = stripAttachmentMarker(encodedDescription);

        const mailOptions = {
          from: process.env.EMAIL_USER || 'HamLearning LMS <noreply@hamlearning.com>',
          to: user.email,
          subject: `Task Created: ${title}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2d7a4f 0%, #1e5a3a 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
                .task-details { background: #f9fafb; padding: 20px; border-left: 4px solid #2d7a4f; margin: 20px 0; }
                .task-details h3 { margin: 0 0 10px 0; color: #2d7a4f; }
                .task-details p { margin: 8px 0; color: #555; }
                .label { font-weight: 600; color: #2d7a4f; }
                .button { display: inline-block; background: #2d7a4f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📋 HamLearning</h1>
                  <p>New Task Created</p>
                </div>
                <div class="content">
                  <p>Hi ${user.name || 'there'},</p>
                  <p>You have successfully created a new task in your HamLearning account.</p>
                  
                  <div class="task-details">
                    <h3>${title}</h3>
                    ${plainDescription ? `<p>${plainDescription.replace(/\n/g, '<br>')}</p>` : ''}
                    <p><span class="label">Due Date:</span> ${dueDateFormatted}</p>
                    ${attachmentName ? `<p><span class="label">Attachment:</span> ${attachmentName}</p>` : ''}
                  </div>

                  <p>You can view and manage all your tasks in your HamLearning dashboard under the Tasks section.</p>
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/tasks" class="button">View Task</a>
                  
                  <p style="margin-top: 30px; font-size: 14px; color: #999;">This is an automated email from HamLearning LMS. Please do not reply to this email.</p>
                </div>
                <div class="footer">
                  <p>© 2025 HamLearning LMS. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log('Task creation email sent to:', user.email);
      }
    } catch (emailError) {
      console.error('Error sending task email:', emailError);
      // Don't fail the task creation if email fails
    }

    res.status(201).json(newTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a personal task
router.put('/personal/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, isCompleted, attachmentUrl, attachmentName } = req.body;

    // Verify ownership
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('student_id', req.user.id)
      .eq('type', 'personal')
      .single();

    if (!task) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined || attachmentUrl !== undefined || attachmentName !== undefined) {
      const currentBaseDescription = description !== undefined ? description : stripAttachmentMarker(task.description);
      updateData.description = encodeTaskDescription(currentBaseDescription, attachmentUrl, attachmentName);
    }
    if (dueDate !== undefined) updateData.due_date = dueDate;
    if (isCompleted !== undefined) {
      updateData.is_completed = isCompleted;
      updateData.completed_at = isCompleted ? new Date().toISOString() : null;
    }

    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error updating task' });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a personal task
router.delete('/personal/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('student_id', req.user.id)
      .eq('type', 'personal')
      .single();

    if (!task) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error deleting task' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== TEACHER TASKS ====================

// Get all tasks for a class (teacher view)
router.get('/class/:classId/teacher', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;

    // Verify teacher owns the class
    const { data: classData } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .eq('instructor_id', req.user.id)
      .single();

    if (!classData) {
      return res.status(403).json({ message: 'Not authorized to view these tasks' });
    }

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('class_id', classId)
      .eq('type', 'teacher')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error fetching tasks' });
    }

    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a teacher task
router.post('/teacher', verifyToken, async (req, res) => {
  try {
    const { classId, title, description, dueDate, maxScore } = req.body;

    if (!classId || !title) {
      return res.status(400).json({ message: 'Class ID and title are required' });
    }

    // Verify teacher owns the class
    const { data: classData } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .eq('instructor_id', req.user.id)
      .single();

    if (!classData) {
      return res.status(403).json({ message: 'Not authorized to create tasks for this class' });
    }

    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert([
        {
          class_id: classId,
          teacher_id: req.user.id,
          title,
          description,
          type: 'teacher',
          due_date: dueDate,
          max_score: maxScore,
          is_completed: false
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error creating task' });
    }

    res.status(201).json(newTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a teacher task
router.put('/teacher/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, maxScore } = req.body;

    // Verify ownership
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('teacher_id', req.user.id)
      .eq('type', 'teacher')
      .single();

    if (!task) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.due_date = dueDate;
    if (maxScore !== undefined) updateData.max_score = maxScore;

    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error updating task' });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a teacher task
router.delete('/teacher/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('teacher_id', req.user.id)
      .eq('type', 'teacher')
      .single();

    if (!task) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error deleting task' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== STUDENT VIEW & SUBMISSIONS ====================

// Get all tasks for a student (from enrolled classes + personal)
router.get('/my-tasks', verifyToken, async (req, res) => {
  try {
    // Get enrolled classes
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('class_id')
      .eq('user_id', req.user.id);

    const classIds = enrollments?.map(e => e.class_id) || [];

    // Get teacher tasks from enrolled classes
    let teacherTasks = [];
    if (classIds.length > 0) {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          classes:class_id (
            class_name,
            section,
            class_code
          ),
          task_submissions!left (
            id,
            student_id,
            file_url,
            file_name,
            submission_text,
            score,
            feedback,
            submitted_at,
            graded_at
          )
        `)
        .eq('type', 'teacher')
        .in('class_id', classIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching teacher tasks:', error);
      } else {
        // Filter submissions to only show current student's submission
        teacherTasks = data.map(task => ({
          ...task,
          task_submissions: task.task_submissions?.filter(sub => sub.student_id === req.user.id) || []
        }));
      }
    }

    // Get personal tasks
    const { data: personalTasks, error: personalError } = await supabase
      .from('tasks')
      .select('*')
      .eq('student_id', req.user.id)
      .eq('type', 'personal')
      .order('created_at', { ascending: false });

    if (personalError) {
      console.error('Error fetching personal tasks:', personalError);
    }

    res.json({
      teacherTasks: teacherTasks || [],
      personalTasks: personalTasks || []
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit a task (file upload/text submission)
router.post('/submit/:taskId', verifyToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { fileUrl, fileName, submissionText } = req.body;

    // Verify task exists and student is enrolled in the class
    const { data: task } = await supabase
      .from('tasks')
      .select('*, classes:class_id(*)')
      .eq('id', taskId)
      .eq('type', 'teacher')
      .single();

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check enrollment
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('class_id', task.class_id)
      .single();

    if (!enrollment) {
      return res.status(403).json({ message: 'Not enrolled in this class' });
    }

    // Check if submission already exists
    const { data: existingSubmission } = await supabase
      .from('task_submissions')
      .select('*')
      .eq('task_id', taskId)
      .eq('student_id', req.user.id)
      .single();

    if (existingSubmission) {
      // Update existing submission
      const { data: updatedSubmission, error } = await supabase
        .from('task_submissions')
        .update({
          file_url: fileUrl,
          file_name: fileName,
          submission_text: submissionText,
          submitted_at: new Date().toISOString()
        })
        .eq('id', existingSubmission.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ message: 'Error updating submission' });
      }

      return res.json(updatedSubmission);
    } else {
      // Create new submission
      const { data: newSubmission, error } = await supabase
        .from('task_submissions')
        .insert([
          {
            task_id: taskId,
            student_id: req.user.id,
            file_url: fileUrl,
            file_name: fileName,
            submission_text: submissionText
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ message: 'Error creating submission' });
      }

      return res.status(201).json(newSubmission);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get submissions for a task (teacher view)
router.get('/:taskId/submissions', verifyToken, async (req, res) => {
  try {
    const { taskId } = req.params;

    // Verify teacher owns the task
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('teacher_id', req.user.id)
      .eq('type', 'teacher')
      .single();

    if (!task) {
      return res.status(403).json({ message: 'Not authorized to view these submissions' });
    }

    // Get all submissions for this task
    const { data: submissions, error } = await supabase
      .from('task_submissions')
      .select(`
        *,
        users:student_id (
          name,
          email
        )
      `)
      .eq('task_id', taskId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error fetching submissions' });
    }

    res.json(submissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Grade a submission (teacher only)
router.patch('/submission/:submissionId/grade', verifyToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { score, feedback } = req.body;

    // Get submission and verify teacher owns the task
    const { data: submission } = await supabase
      .from('task_submissions')
      .select(`
        *,
        tasks!inner(
          id,
          teacher_id,
          max_score
        )
      `)
      .eq('id', submissionId)
      .single();

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    if (submission.tasks.teacher_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to grade this submission' });
    }

    // Validate score
    if (score !== undefined && submission.tasks.max_score && parseFloat(score) > parseFloat(submission.tasks.max_score)) {
      return res.status(400).json({ message: 'Score cannot exceed max score' });
    }

    const { data: updatedSubmission, error } = await supabase
      .from('task_submissions')
      .update({
        score: score !== undefined ? parseFloat(score) : null,
        feedback,
        graded_at: score !== undefined ? new Date().toISOString() : null
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error grading submission' });
    }

    res.json(updatedSubmission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all tasks for a teacher across all their classes
router.get('/teacher-tasks', verifyToken, async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        classes:class_id (
          class_name,
          section,
          class_code
        )
      `)
      .eq('teacher_id', req.user.id)
      .eq('type', 'teacher')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Error fetching teacher tasks' });
    }

    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

