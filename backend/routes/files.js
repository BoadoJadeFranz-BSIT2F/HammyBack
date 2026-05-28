const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const supabase = require('../config/supabase');
const multer = require('multer');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// ==================== GOOGLE CLASSROOM-STYLE UPLOAD ====================
// Simple approach: Backend checks permissions, no storage RLS complications

router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const { classId, title, description } = req.body;
    const file = req.file;

    // Validate input
    if (!file) return res.status(400).json({ message: 'No file provided' });
    if (!classId || !title) return res.status(400).json({ message: 'Class ID and title required' });

    const classIdNum = parseInt(classId, 10);
    if (isNaN(classIdNum)) return res.status(400).json({ message: 'Invalid class ID' });

    // Check if teacher owns the class
    const { data: classData } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classIdNum)
      .single();
    
    if (!classData) return res.status(404).json({ message: 'Class not found' });
    if (classData.teacher_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Upload to storage (simple path structure)
    const fileName = `class-${classIdNum}/${Date.now()}-${file.originalname}`;
    
    const { error: uploadError } = await supabase.storage
      .from('class-files')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ message: 'Upload failed', error: uploadError.message });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('class-files')
      .getPublicUrl(fileName);

    // Save to database
    const { data: fileRecord, error: dbError } = await supabase
      .from('class_files')
      .insert({
        class_id: classIdNum,
        teacher_id: req.user.id,
        file_name: file.originalname,
        file_url: publicUrl,
        file_type: file.mimetype,
        file_size: file.size,
        title: title,
        description: description || null
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded file
      await supabase.storage.from('class-files').remove([fileName]);
      return res.status(500).json({ message: 'Database error', error: dbError.message });
    }

    res.status(201).json({ message: 'File uploaded successfully', file: fileRecord });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get files for a class
router.get('/class/:classId', verifyToken, async (req, res) => {
  try {
    const classIdNum = parseInt(req.params.classId, 10);

    // Check access (teacher OR enrolled student)
    const { data: classData } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classIdNum)
      .single();

    if (!classData) return res.status(404).json({ message: 'Class not found' });

    const isTeacher = classData.teacher_id === req.user.id;
    
    if (!isTeacher) {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('class_id', classIdNum)
        .eq('user_id', req.user.id)
        .single();

      if (!enrollment) return res.status(403).json({ message: 'Access denied' });
    }

    // Fetch files
    const { data: files, error } = await supabase
      .from('class_files')
      .select('*')
      .eq('class_id', classIdNum)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch error:', error);
      return res.status(500).json({ message: 'Failed to fetch files', error: error.message });
    }

    res.json({ files });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a file (teacher only)
router.delete('/:fileId', verifyToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId, 10);

    // Get file details
    const { data: fileData, error: fetchError } = await supabase
      .from('class_files')
      .select('*, classes!inner(teacher_id)')
      .eq('id', fileId)
      .single();

    if (fetchError || !fileData) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if user is the teacher
    if (fileData.classes.teacher_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Extract storage path from URL
    const url = new URL(fileData.file_url);
    const pathParts = url.pathname.split('/storage/v1/object/public/class-files/');
    const storagePath = pathParts[1];

    // Delete from storage
    if (storagePath) {
      await supabase.storage.from('class-files').remove([storagePath]);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('class_files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      return res.status(500).json({ message: 'Delete failed', error: deleteError.message });
    }

    res.json({ message: 'File deleted successfully' });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
