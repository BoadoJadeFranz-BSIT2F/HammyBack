const express = require('express');
const supabase = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const SHARED_TYPES = new Set(['class', 'deadline', 'deadline_attachment', 'class_file']);

const resolveUserRole = async (req) => {
  if (req.user?.role) return req.user.role;

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', req.userId)
    .single();

  return data?.role || 'student';
};

const getUserClassIds = async (userId, role) => {
  if (role === 'teacher') {
    const { data } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', userId);
    return (data || []).map((c) => c.id);
  }

  const { data } = await supabase
    .from('enrollments')
    .select('class_id')
    .eq('user_id', userId);
  return (data || []).map((e) => e.class_id);
};

const getClassContextForSource = async (sourceType, sourceId) => {
  const numericId = Number(sourceId);
  if (!Number.isFinite(numericId)) {
    return { class_id: null, deadline_id: null };
  }

  if (sourceType === 'class') {
    return { class_id: numericId, deadline_id: null };
  }

  if (sourceType === 'deadline') {
    const { data: deadline } = await supabase
      .from('deadlines')
      .select('id, class_id')
      .eq('id', numericId)
      .single();
    return {
      class_id: deadline?.class_id || null,
      deadline_id: deadline?.id || null
    };
  }

  if (sourceType === 'deadline_attachment') {
    const { data: file } = await supabase
      .from('deadline_files')
      .select('id, deadline_id')
      .eq('id', numericId)
      .single();

    if (!file?.deadline_id) return { class_id: null, deadline_id: null };

    const { data: deadline } = await supabase
      .from('deadlines')
      .select('id, class_id')
      .eq('id', file.deadline_id)
      .single();

    return {
      class_id: deadline?.class_id || null,
      deadline_id: deadline?.id || file.deadline_id
    };
  }

  if (sourceType === 'class_file') {
    const { data: classFile } = await supabase
      .from('class_files')
      .select('id, class_id')
      .eq('id', numericId)
      .single();
    return {
      class_id: classFile?.class_id || null,
      deadline_id: null
    };
  }

  return { class_id: null, deadline_id: null };
};

// Get archive items visible to current user
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const role = await resolveUserRole(req);
    const classIds = await getUserClassIds(userId, role);

    const { data: ownedPersonal, error: personalError } = await supabase
      .from('archive_items')
      .select('*')
      .eq('scope', 'personal')
      .eq('owner_id', userId);

    if (personalError) throw personalError;

    const classQuery = supabase
      .from('archive_items')
      .select('*')
      .eq('scope', 'class');

    const { data: classScoped, error: classError } = classIds.length
      ? await classQuery.in('class_id', classIds)
      : { data: [], error: null };

    if (classError) throw classError;

    const visible = [...(ownedPersonal || []), ...(classScoped || [])]
      .sort((a, b) => new Date(b.archived_at) - new Date(a.archived_at));

    res.json({ items: visible });
  } catch (error) {
    console.error('Get archive error:', error);
    res.status(500).json({ message: 'Failed to fetch archive items' });
  }
});

// Archive an item
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const payload = req.body || {};

    const sourceType = payload.source_type || 'class_file';
    const sourceId = payload.source_id || payload.id;
    if (!sourceId) {
      return res.status(400).json({ message: 'source_id is required' });
    }

    const shared = SHARED_TYPES.has(sourceType);

    const inferredContext = await getClassContextForSource(sourceType, sourceId);

    let classId = payload.class_id || inferredContext.class_id || null;
    let deadlineId = payload.deadline_id || inferredContext.deadline_id || null;

    if (shared && classId) {
      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .eq('id', classId)
        .eq('teacher_id', userId)
        .single();

      if (!classData) {
        return res.status(403).json({ message: 'Not allowed to archive content for this class' });
      }
    }

    const archiveKey = payload.archive_key || `${sourceType}:${sourceId}`;

    const record = {
      archive_key: archiveKey,
      scope: shared ? 'class' : 'personal',
      owner_id: userId,
      source_type: sourceType,
      source_id: String(sourceId),
      class_id: classId,
      class_name: payload.class_name || payload.className || null,
      deadline_id: deadlineId,
      deadline_title: payload.deadline_title || null,
      title: payload.title || 'Untitled',
      description: payload.description || '',
      file_name: payload.file_name || '',
      file_type: payload.file_type || '',
      file_size: payload.file_size || 0,
      file_url: payload.file_url || '',
      file_path: payload.file_path || '',
      archived_at: new Date().toISOString()
    };

    const { data: upserted, error: upsertError } = await supabase
      .from('archive_items')
      .upsert(record, { onConflict: 'archive_key' })
      .select()
      .single();

    if (upsertError) throw upsertError;

    res.status(201).json({ item: upserted });
  } catch (error) {
    console.error('Archive item error:', error);
    res.status(500).json({ message: 'Failed to archive item' });
  }
});

// Unarchive by archive key
router.delete('/:archiveKey', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { archiveKey } = req.params;

    const { data: target, error: targetError } = await supabase
      .from('archive_items')
      .select('archive_key, owner_id')
      .eq('archive_key', archiveKey)
      .single();

    if (targetError || !target) {
      return res.status(404).json({ message: 'Archive item not found' });
    }

    if (target.owner_id !== userId) {
      return res.status(403).json({ message: 'Not allowed to modify this archive item' });
    }

    const { error: deleteError } = await supabase
      .from('archive_items')
      .delete()
      .eq('archive_key', archiveKey)
      .eq('owner_id', userId);

    if (deleteError) throw deleteError;

    res.json({ message: 'Unarchived successfully' });
  } catch (error) {
    console.error('Unarchive error:', error);
    res.status(500).json({ message: 'Failed to unarchive item' });
  }
});

module.exports = router;
