import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { deadlineAPI, fileAPI } from '../services/api';
import { getArchivedMaterials, onArchiveChange, syncArchiveFromServer, unarchiveMaterial } from '../services/archive';
import axios from 'axios';

const ArchiveDashboard = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeType, setActiveType] = useState('all');

  const isTeacher = user?.role === 'teacher';

  const typeInfo = (type) => {
    if (type === 'class') return { label: 'Class', icon: '🏫' };
    if (type === 'deadline') return { label: 'Deadline', icon: '📅' };
    if (type === 'deadline_attachment') return { label: 'Deadline Attachment', icon: '📎' };
    if (type === 'class_file') return { label: 'Class Material', icon: '📁' };
    if (type === 'personal_task') return { label: 'Personal Task', icon: '✅' };
    return { label: 'Other', icon: '🗃️' };
  };

  const normalizeStudentItems = (allItems) => {
    // Students can only check personal archive content, not teacher-managed class content.
    return allItems.filter((i) => !['class', 'deadline', 'deadline_attachment', 'class_file'].includes(i.source_type));
  };

  const loadItems = () => {
    const all = getArchivedMaterials();
    setItems(isTeacher ? all : normalizeStudentItems(all));
  };

  useEffect(() => {
    syncArchiveFromServer().finally(loadItems);
    const unsubscribe = onArchiveChange(loadItems);
    return unsubscribe;
  }, [user?.role]);

  const handleUnarchive = (archiveKey) => {
    unarchiveMaterial(archiveKey);
    loadItems();
  };

  const handleDeletePermanent = async (item) => {
    if (!window.confirm('Permanently delete this archived material? This cannot be undone.')) return;

    try {
      setLoading(true);
      if (user?.role === 'teacher') {
        if (item.source_type === 'class') {
          const token = localStorage.getItem('token');
          await axios.delete(`http://localhost:5000/api/classes/${item.source_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else if (item.source_type === 'deadline') {
          await deadlineAPI.deleteDeadline(item.source_id);
        } else if (item.source_type === 'deadline_attachment') {
          await deadlineAPI.deleteAttachment(item.source_id);
        } else {
          await fileAPI.deleteFile(item.source_id);
        }
      }

      unarchiveMaterial(item.archive_key);
      loadItems();
      setMessage('Archived material deleted permanently.');
      setTimeout(() => setMessage(''), 2500);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to delete archived material.');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => activeType === 'all' || item.source_type === activeType);

  const classItems = filteredItems.filter((i) => i.source_type === 'class');
  const deadlineItems = filteredItems.filter((i) => i.source_type === 'deadline');
  const attachmentItems = filteredItems.filter((i) => i.source_type === 'deadline_attachment');
  const materialItems = filteredItems.filter((i) => i.source_type === 'class_file');
  const personalItems = filteredItems.filter((i) => !['class', 'deadline', 'deadline_attachment', 'class_file'].includes(i.source_type));

  const renderItemCard = (item) => {
    const info = typeInfo(item.source_type);
    return (
      <div key={item.archive_key} className="file-card-classroom" style={{ border: '1px solid #e5e7eb' }}>
        <div className="file-card-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span>{info.icon}</span>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{info.label}</span>
          </div>
          <h3 className="file-card-title">{item.title || 'Untitled'}</h3>
          {item.file_name ? <p className="file-card-filename">{item.file_name}</p> : null}
          {item.class_name ? (
            <p className="file-card-description" style={{ color: '#6b7280' }}>
              Class: {item.class_name}
            </p>
          ) : null}
          <p className="file-card-description" style={{ fontSize: 12 }}>
            Archived: {new Date(item.archived_at).toLocaleString()}
          </p>
        </div>
        <div className="file-card-actions" style={{ display: 'flex', gap: 8 }}>
          {isTeacher && (
            <button className="btn-delete-icon" title="Restore" onClick={() => handleUnarchive(item.archive_key)} disabled={loading}>
              ↩️
            </button>
          )}
          {isTeacher && (
            <button className="btn-delete-icon" title="Delete permanently" onClick={() => handleDeletePermanent(item)} disabled={loading}>
              🗑️
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSection = (title, list) => {
    if (list.length === 0) return null;
    return (
      <section style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#111827' }}>{title} ({list.length})</h3>
        <div className="files-grid">{list.map(renderItemCard)}</div>
      </section>
    );
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <h1>🗂️ Archive</h1>
        <p className="module-description">
          {isTeacher
            ? 'Manage archived classes, deadlines, and materials in one place'
            : 'Your personal archive storage'}
        </p>
      </div>

      {message && <div className="success-message" style={{ marginBottom: 12 }}>{message}</div>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {['all', 'class', 'deadline', 'deadline_attachment', 'class_file', 'personal_task'].map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            style={{
              border: activeType === type ? '1px solid #1e5a3a' : '1px solid #d1d5db',
              background: activeType === type ? '#ecfdf3' : 'white',
              color: activeType === type ? '#14532d' : '#374151',
              borderRadius: 20,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {type === 'all' ? 'All' : typeInfo(type).label}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🗃️</div>
          <p>{isTeacher ? 'No archived content yet' : 'No personal archived content yet'}</p>
        </div>
      ) : (
        <>
          {renderSection('Archived Classes', classItems)}
          {renderSection('Archived Deadlines', deadlineItems)}
          {renderSection('Archived Deadline Attachments', attachmentItems)}
          {renderSection('Archived Class Materials', materialItems)}
          {renderSection('Archived Personal Items', personalItems)}
        </>
      )}
    </div>
  );
};

export default ArchiveDashboard;
