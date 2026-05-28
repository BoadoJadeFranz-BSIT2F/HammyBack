import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { deadlineAPI } from '../../services/api';
import DeadlineDetailModal from './DeadlineDetailModal';
import { archiveMaterial, filterArchivedDeadlines } from '../../services/archive';
import './TeacherModules.css';

const TeacherClassDeadlines = () => {
  const { classData } = useOutletContext();
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedDeadline, setSelectedDeadline] = useState(null);
  
  const [newDeadline, setNewDeadline] = useState({
    title: '',
    instructions: '',
    type: 'assignment',
    deadline_date: '',
    deadline_time: '',
    points: '100',
    submissionType: 'file'
  });

  useEffect(() => {
    if (classData) {
      fetchDeadlines();
    }
  }, [classData]);

  const fetchDeadlines = async () => {
    try {
      setLoading(true);
      const response = await deadlineAPI.getClassDeadlines(classData.id);
      setDeadlines(filterArchivedDeadlines(response.data.deadlines || []));
    } catch (error) {
      console.error('Error fetching deadlines:', error);
      setError('Failed to load deadlines');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setSelectedFiles([]);
    setNewDeadline({ title: '', instructions: '', type: 'assignment', deadline_date: '', deadline_time: '', points: '100', submissionType: 'file' });
    setError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!newDeadline.title || !newDeadline.deadline_date || !newDeadline.deadline_time) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      setError('');
      
      // Combine date and time into ISO format
      const dueDateTime = new Date(`${newDeadline.deadline_date}T${newDeadline.deadline_time}`);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('classId', classData.id);
      formData.append('title', newDeadline.title);
      formData.append('instructions', newDeadline.instructions);
      formData.append('type', newDeadline.type);
      formData.append('dueDate', dueDateTime.toISOString());
      formData.append('points', newDeadline.points);
      formData.append('submissionType', newDeadline.submissionType);
      
      // Append files
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      await deadlineAPI.createWithFiles(formData);
      
      setSuccess('Deadline created successfully!');
      setShowCreateModal(false);
      setNewDeadline({ title: '', instructions: '', type: 'assignment', deadline_date: '', deadline_time: '', points: '100', submissionType: 'file' });
      setSelectedFiles([]);
      fetchDeadlines();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Create error:', error);
      setError(error.response?.data?.message || 'Failed to create deadline');
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async (deadline) => {
    // Archive the deadline entity itself
    archiveMaterial({
      source_type: 'deadline',
      source_id: deadline.id,
      title: deadline.title,
      description: deadline.instructions || '',
      class_id: classData.id,
      class_name: classData.className || classData.class_name
    });

    // Also archive every attached file so Files & Materials hides them too
    try {
      const res = await deadlineAPI.getDeadline(deadline.id);
      const files = res.data?.deadline?.files || [];
      const API_BASE = 'http://localhost:5000';
      files.forEach((f) =>
        archiveMaterial({
          source_type: 'deadline_attachment',
          source_id: f.id,
          title: deadline.title,
          file_name: f.file_name,
          file_type: f.file_type,
          file_size: f.file_size,
          file_url: `${API_BASE}${f.file_path}`,
          file_path: f.file_path,
          deadline_id: deadline.id,
          deadline_title: deadline.title,
          class_id: classData.id,
          class_name: classData.className || classData.class_name
        })
      );
    } catch (_) {}

    setDeadlines((prev) => prev.filter((d) => d.id !== deadline.id));
    setSuccess('Deadline moved to Archive. Confirm permanent deletion in Archive.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const formatDate = (dueDateString) => {
    const date = new Date(dueDateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (dueDateString) => {
    const deadline = new Date(dueDateString);
    return deadline < new Date();
  };

  if (loading) {
    return <div className="loading-state">Loading deadlines...</div>;
  }

  return (
    <div className="class-section-container">
      <div className="section-header">
        <h2>Deadlines for {classData.className || classData.class_name}</h2>
        <button 
          className="create-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <span>+</span> Create Deadline
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {deadlines.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <p>No deadlines set for this class</p>
          <p className="empty-hint">Click "Create Deadline" to add assignments or due dates</p>
        </div>
      ) : (
        <div className="deadlines-list">
          {deadlines.map((deadline) => {
            const overdue = isOverdue(deadline.due_date);
            return (
              <div 
                key={deadline.id} 
                className={`deadline-card ${overdue ? 'overdue' : ''}`}
              >
                <div
                  className="deadline-header"
                  onClick={() => setSelectedDeadline(deadline)}
                  style={{ cursor: 'pointer' }}
                >
                  <h3 className="deadline-title">{deadline.title}</h3>
                  <span 
                    className={`deadline-status ${overdue ? 'status-overdue' : 'status-upcoming'}`}
                    title={`Due: ${formatDate(deadline.due_date)}`}
                  >
                    {overdue ? '⚠️ Overdue' : '📌 Upcoming'}
                  </span>
                </div>
                {deadline.instructions && (
                  <p className="deadline-description">{deadline.instructions}</p>
                )}
                <div className="deadline-meta">
                  <span 
                    className="deadline-date"
                    title={`Deadline: ${formatDate(deadline.due_date)}`}
                  >
                    📅 {formatDate(deadline.due_date)}
                  </span>
                  {deadline.type && (
                    <span className="deadline-type">
                      {deadline.type.charAt(0).toUpperCase() + deadline.type.slice(1)}
                    </span>
                  )}
                  {deadline.points && (
                    <span className="deadline-points">
                      🎯 {deadline.points} points
                    </span>
                  )}
                  {deadline.files_count > 0 && (
                    <span className="deadline-files">
                      📎 {deadline.files_count} file{deadline.files_count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="deadline-actions">
                  <button
                    onClick={() => handleArchive(deadline)}
                    className="btn-delete-deadline"
                    title="Archive deadline"
                  >
                    🗂️ Archive
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => !creating && handleCloseModal()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Deadline for {classData.className || classData.class_name}</h3>
              <button 
                className="modal-close"
                onClick={handleCloseModal}
                disabled={creating}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={newDeadline.title}
                  onChange={(e) => setNewDeadline({ ...newDeadline, title: e.target.value })}
                  placeholder="e.g., Assignment 1 - Research Paper"
                  required
                  disabled={creating}
                />
              </div>

              <div className="form-group">
                <label>Instructions for Students</label>
                <textarea
                  value={newDeadline.instructions}
                  onChange={(e) => setNewDeadline({ ...newDeadline, instructions: e.target.value })}
                  placeholder="Provide detailed instructions about what students need to do..."
                  rows="4"
                  disabled={creating}
                />
              </div>

              <div className="form-group">
                <label>Attach Materials (Optional)</label>
                <input 
                  type="file" 
                  multiple 
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.png,.zip,.xls,.xlsx"
                  onChange={handleFileSelect}
                  disabled={creating}
                  style={{ 
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    width: '100%',
                    cursor: 'pointer'
                  }}
                />
                <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
                  Upload files to help students complete the assignment (Max 50MB per file)
                </small>
                {selectedFiles.length > 0 && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '10px', 
                    background: '#f9fafb', 
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: '#374151', 
                      marginBottom: '8px' 
                    }}>
                      Selected Files ({selectedFiles.length}):
                    </div>
                    {selectedFiles.map((file, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          background: 'white',
                          borderRadius: '4px',
                          marginBottom: '4px',
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                          <span style={{ fontSize: '16px' }}>📎</span>
                          <span style={{ fontSize: '13px', color: '#111827' }}>{file.name}</span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          disabled={creating}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '18px',
                            padding: '0 4px',
                            fontWeight: 'bold'
                          }}
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Points (Total Score) *</label>
                <input
                  type="number"
                  value={newDeadline.points}
                  onChange={(e) => setNewDeadline({ ...newDeadline, points: e.target.value })}
                  placeholder="100"
                  min="0"
                  required
                  disabled={creating}
                />
              </div>

              <div className="form-group">
                <label>Type *</label>
                <select
                  value={newDeadline.type}
                  onChange={(e) => setNewDeadline({ ...newDeadline, type: e.target.value })}
                  required
                  disabled={creating}
                >
                  <option value="assignment">Assignment</option>
                  <option value="project">Project</option>
                  <option value="exam">Exam</option>
                  <option value="quiz">Quiz</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Due Date *</label>
                  <input
                    type="date"
                    value={newDeadline.deadline_date}
                    onChange={(e) => setNewDeadline({ ...newDeadline, deadline_date: e.target.value })}
                    required
                    disabled={creating}
                  />
                </div>

                <div className="form-group">
                  <label>Due Time *</label>
                  <input
                    type="time"
                    value={newDeadline.deadline_time}
                    onChange={(e) => setNewDeadline({ ...newDeadline, deadline_time: e.target.value })}
                    required
                    disabled={creating}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Deadline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDeadline && (
        <DeadlineDetailModal
          deadline={{
            ...selectedDeadline,
            classes: {
              class_name: classData.className || classData.class_name,
              class_code: classData.classCode || classData.class_code,
              section: classData.section
            }
          }}
          onClose={() => setSelectedDeadline(null)}
          onRefresh={fetchDeadlines}
        />
      )}
    </div>
  );
};

export default TeacherClassDeadlines;
