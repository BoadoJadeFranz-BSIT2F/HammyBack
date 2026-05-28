const express = require('express');
const supabase = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Get all wellness journal entries for current user
router.get('/entries', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('wellness_entries')
      .select('*')
      .eq('user_id', req.userId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get wellness entries error:', error);
      return res.status(500).json({ message: 'Failed to fetch wellness entries' });
    }

    res.json({ entries: data || [] });
  } catch (error) {
    console.error('Get wellness entries exception:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a wellness journal entry
router.post('/entries', verifyToken, async (req, res) => {
  try {
    const { mood, content } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({ message: 'Journal content is required' });
    }

    const { data, error } = await supabase
      .from('wellness_entries')
      .insert([
        {
          user_id: req.userId,
          mood: mood || null,
          content: String(content).trim(),
          entry_date: new Date().toISOString().split('T')[0]
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Create wellness entry error:', error);
      return res.status(500).json({ message: 'Failed to save wellness entry' });
    }

    res.status(201).json({ entry: data });
  } catch (error) {
    console.error('Create wellness entry exception:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a wellness journal entry
router.delete('/entries/:id', verifyToken, async (req, res) => {
  try {
    const entryId = Number(req.params.id);
    if (!Number.isFinite(entryId)) {
      return res.status(400).json({ message: 'Invalid entry id' });
    }

    const { data: existing, error: findError } = await supabase
      .from('wellness_entries')
      .select('id, user_id')
      .eq('id', entryId)
      .single();

    if (findError || !existing) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    if (existing.user_id !== req.userId) {
      return res.status(403).json({ message: 'Not allowed to delete this entry' });
    }

    const { error } = await supabase
      .from('wellness_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', req.userId);

    if (error) {
      console.error('Delete wellness entry error:', error);
      return res.status(500).json({ message: 'Failed to delete entry' });
    }

    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Delete wellness entry exception:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
