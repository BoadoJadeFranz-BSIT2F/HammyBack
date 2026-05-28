const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { supabase, supabaseAdmin } = require('../config/supabase');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
const tempDir = path.join(uploadsDir, 'temp');

// Vercel serverless deployments don't need local disk storage.
// Keep the filesystem setup for local development only.
if (!process.env.VERCEL) {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
}

// Use memory storage so we can stream directly to Supabase Storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Verify JWT
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

// ==================== LOCAL FILE STORAGE (NO SUPABASE STORAGE) ====================

router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const { classId, title, description } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ message: 'No file provided' });
    if (!classId || !title) return res.status(400).json({ message: 'Class ID and title required' });

    const classIdNum = parseInt(classId, 10);
    if (isNaN(classIdNum)) return res.status(400).json({ message: 'Invalid class ID' });

    // Check teacher owns class
    const { data: classData } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classIdNum)
      .single();
    
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    if (classData.teacher_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Upload to Supabase Storage
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
    const filePath = `class-${classIdNum}/${Date.now()}-${file.originalname}`;

    const uploadResult = await supabaseAdmin.storage.from(bucket).upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

    if (uploadResult.error) {
      console.error('Storage upload error:', uploadResult.error);
      return res.status(500).json({ message: 'Failed to upload file', error: uploadResult.error.message });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
    const fileUrl = urlData?.publicUrl || '';

    // Save to database
    const { data: fileRecord, error: dbError } = await supabase
      .from('class_files')
      .insert({
        class_id: classIdNum,
        teacher_id: req.user.id,
        file_name: file.originalname,
        file_url: fileUrl,
        file_type: file.mimetype,
        file_size: file.size,
        title: title,
        description: description || null
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', JSON.stringify(dbError, null, 2));
      // Try to delete uploaded file from storage
      await supabaseAdmin.storage.from(bucket).remove([filePath]);
      return res.status(500).json({ 
        message: 'Database error', 
        error: dbError.message 
      });
    }

    res.status(201).json({ message: 'File uploaded successfully', file: fileRecord });

  } catch (error) {
    console.error('Upload exception:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get files for a class
router.get('/class/:classId', verifyToken, async (req, res) => {
  try {
    const classIdNum = parseInt(req.params.classId, 10);

    // Check access
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

// Get all files from classes the student is enrolled in
router.get('/my-files', verifyToken, async (req, res) => {
  try {
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('class_id')
      .eq('user_id', req.user.id);

    if (enrollError) {
      console.error('Enrollment fetch error:', enrollError);
      return res.json({ files: [] });
    }

    if (!enrollments || enrollments.length === 0) {
      return res.json({ files: [] });
    }

    const classIds = enrollments.map((enrollment) => enrollment.class_id);

    const { data: files, error } = await supabase
      .from('class_files')
      .select(`
        *,
        classes:class_id (
          id,
          class_name,
          section,
          class_code
        ),
        users:teacher_id (
          id,
          name,
          email,
          profile_picture
        )
      `)
      .in('class_id', classIds)
      .order('upload_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Student file fetch error:', error);
      return res.json({ files: [] });
    }

    const activeFiles = (files || []).filter((file) => file.is_active !== false);

    res.json({ files: activeFiles });
  } catch (error) {
    console.error('Error fetching student files:', error);
    res.json({ files: [] });
  }
});

// Get all files uploaded by the teacher across their classes
router.get('/my-uploads', verifyToken, async (req, res) => {
  try {
    const { data: files, error } = await supabase
      .from('class_files')
      .select(`
        *,
        classes:class_id (
          id,
          class_name,
          section,
          class_code
        )
      `)
      .eq('teacher_id', req.user.id)
      .order('upload_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Teacher uploads fetch error:', error);
      return res.json({ files: [] });
    }

    const activeFiles = (files || []).filter((file) => file.is_active !== false);
    res.json({ files: activeFiles });
  } catch (error) {
    console.error('Error fetching teacher uploads:', error);
    res.json({ files: [] });
  }
});

// Delete a file
router.delete('/:fileId', verifyToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId, 10);

    // Get file details
    const { data: fileData, error: fetchError } = await supabase
      .from('class_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError || !fileData) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if user is the teacher
    const { data: classData } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', fileData.class_id)
      .single();

    if (!classData || classData.teacher_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

    // Try to extract storage path from file_url (assumes publicUrl points to /storage/v1/...) or store path in DB separately
    let storagePath = null;
    try {
      const url = new URL(fileData.file_url);
      const pathname = url.pathname || '';
      // Attempt to parse after /object/public/ or last slash
      const parts = pathname.split('/');
      storagePath = decodeURIComponent(parts.slice(-2).join('/'));
    } catch (e) {
      storagePath = null;
    }

    // Delete from storage if possible
    if (storagePath) {
      try {
        await supabaseAdmin.storage.from(bucket).remove([storagePath]);
        console.log('Deleted from storage:', storagePath);
      } catch (err) {
        console.warn('Failed to delete from storage:', err.message || err);
      }
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

// ==================== COMMENTS ENDPOINTS ====================

// Get comments for a file
router.get('/:fileId/comments', verifyToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId, 10);

    // Get comments with user information
    const { data: comments, error } = await supabase
      .from('file_comments')
      .select(`
        id,
        comment_text,
        created_at,
        updated_at,
        user_id,
        users!inner (
          id,
          name,
          email,
          role,
          profile_picture
        )
      `)
      .eq('file_id', fileId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return res.status(500).json({ message: 'Failed to load comments' });
    }

    // Transform data for frontend
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      text: comment.comment_text,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      user: {
        id: comment.users.id,
        name: comment.users.name,
        email: comment.users.email,
        role: comment.users.role,
        profilePicture: comment.users.profile_picture
      }
    }));

    res.json({ comments: formattedComments });

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a comment to a file
router.post('/:fileId/comments', verifyToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId, 10);
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    // Verify file exists and user has access
    const { data: fileData } = await supabase
      .from('class_files')
      .select('class_id')
      .eq('id', fileId)
      .single();

    if (!fileData) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if user is enrolled or is the teacher
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('class_id', fileData.class_id)
      .single();

    const { data: classData } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', fileData.class_id)
      .single();

    const isTeacher = classData && classData.teacher_id === req.user.id;
    const isEnrolled = enrollment !== null;

    if (!isTeacher && !isEnrolled) {
      return res.status(403).json({ message: 'Not authorized to comment on this file' });
    }

    // Insert comment
    const { data: newComment, error } = await supabase
      .from('file_comments')
      .insert({
        file_id: fileId,
        user_id: req.user.id,
        comment_text: comment.trim()
      })
      .select(`
        id,
        comment_text,
        created_at,
        updated_at,
        user_id,
        users!inner (
          id,
          name,
          email,
          role,
          profile_picture
        )
      `)
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      return res.status(500).json({ message: 'Failed to add comment' });
    }

    // Format response
    const formattedComment = {
      id: newComment.id,
      text: newComment.comment_text,
      createdAt: newComment.created_at,
      updatedAt: newComment.updated_at,
      user: {
        id: newComment.users.id,
        name: newComment.users.name,
        email: newComment.users.email,
        role: newComment.users.role,
        profilePicture: newComment.users.profile_picture
      }
    };

    res.status(201).json({ message: 'Comment added', comment: formattedComment });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a comment
router.delete('/comments/:commentId', verifyToken, async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId, 10);

    // Get comment to verify ownership
    const { data: comment } = await supabase
      .from('file_comments')
      .select('user_id, file_id')
      .eq('id', commentId)
      .single();

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user owns the comment or is the teacher
    const { data: fileData } = await supabase
      .from('class_files')
      .select('class_id')
      .eq('id', comment.file_id)
      .single();

    const { data: classData } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', fileData.class_id)
      .single();

    const isOwner = comment.user_id === req.user.id;
    const isTeacher = classData && classData.teacher_id === req.user.id;

    if (!isOwner && !isTeacher) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Delete comment
    const { error } = await supabase
      .from('file_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      return res.status(500).json({ message: 'Failed to delete comment' });
    }

    res.json({ message: 'Comment deleted successfully' });

  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
