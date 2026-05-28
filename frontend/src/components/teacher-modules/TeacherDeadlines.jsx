import React, { useState, useEffect } from 'react';
import { deadlineAPI, classAPI } from '../../services/api';
import DeadlineDetailModal from './DeadlineDetailModal';
import './TeacherModules.css';

const TeacherDeadlines = () => {
  const [deadlines, setDeadlines] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedFiles, setSelectedFiles] = useState([]); // NEW: File upload state
  const [selectedDeadline, setSelectedDeadline] = useState(null); // NEW: For viewing deadline details
  const [formData, setFormData] = useState({
    classId: '',
    title: '',
    instructions: '', // Changed from description
    type: 'assignment',
    dueDate: '',
    dueTime: '',
    points: '100', // NEW: Points field
    submissionType: 'file' // NEW: Submission type
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch classes only - we'll load deadlines per class
      const classesRes = await classAPI.getMyClasses();
      setClasses(classesRes.data.classes || []);
      
      // Load deadlines for all classes
      const allClasses = classesRes.data.classes || [];
      const deadlinesPromises = allClasses.map(cls => 
        deadlineAPI.getClassDeadlines(cls.id).catch(err => ({ data: { deadlines: [] } }))
      );
      
      const deadlinesResults = await Promise.all(deadlinesPromises);
      const allDeadlines = deadlinesResults.flatMap(res => res.data.deadlines || []);
      
      // Add class info to each deadline
      const deadlinesWithClass = allDeadlines.map(deadline => {
        const classInfo = allClasses.find(cls => cls.id === deadline.class_id);
        return {
          ...deadline,
          classes: classInfo
        };
      });
      
      setDeadlines(deadlinesWithClass);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load deadlines');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (deadline = null) => {
    if (deadline) {
      const dueDate = new Date(deadline.due_date);
      setEditingDeadline(deadline);
      setFormData({
        classId: deadline.class_id,
        title: deadline.title,
        instructions: deadline.instructions || '',
        type: deadline.type,
        dueDate: dueDate.toISOString().split('T')[0],
        dueTime: dueDate.toTimeString().slice(0, 5),
        points: deadline.points || '100',
        submissionType: deadline.submission_type || 'file'
      });
    } else {
      setEditingDeadline(null);
      setFormData({
        classId: '',
        title: '',
        instructions: '',
        type: 'assignment',
        dueDate: '',
        dueTime: '',
        points: '100',
        submissionType: 'file'
      });
    }
    setSelectedFiles([]); // Reset files
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDeadline(null);
    setSelectedFiles([]); // Clear files
    setFormData({
      classId: '',
      title: '',
      instructions: '',
      type: 'assignment',
      dueDate: '',
      dueTime: '',
      points: '100',
      submissionType: 'file'
    });
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const isMaterialPost = formData.type === 'material';

    if (!formData.classId || !formData.title) {
      setError('Please fill in all required fields');
      return;
    }

    if (!isMaterialPost && (!formData.dueDate || !formData.dueTime)) {
      setError('Please provide a due date and time for the deadline');
      return;
    }

    if (isMaterialPost && !editingDeadline && selectedFiles.length === 0) {
      setError('Please choose at least one file for Files & Materials');
      return;
    }

    try {
      const dueDateTime = !isMaterialPost
        ? new Date(`${formData.dueDate}T${formData.dueTime}`)
        : null;
      
      if (editingDeadline) {
        // For editing, use JSON (no file upload in edit mode for now)
        const deadlineData = {
          classId: formData.classId,
          title: formData.title,
          instructions: formData.instructions,
          type: formData.type,
          dueDate: dueDateTime.toISOString(),
          points: parseInt(formData.points),
          submissionType: formData.submissionType
        };
        await deadlineAPI.updateDeadline(editingDeadline.id, deadlineData);
      } else {
        // For creating, use FormData for file upload
        const formDataToSend = new FormData();
        formDataToSend.append('postKind', isMaterialPost ? 'material' : 'deadline');
        formDataToSend.append('classId', formData.classId);
        formDataToSend.append('title', formData.title);
        formDataToSend.append('instructions', formData.instructions);
        if (!isMaterialPost) {
          formDataToSend.append('type', formData.type);
          formDataToSend.append('dueDate', dueDateTime.toISOString());
          formDataToSend.append('points', formData.points);
          formDataToSend.append('submissionType', formData.submissionType);
        }
        
        // Append files if any
        selectedFiles.forEach(file => {
          formDataToSend.append('files', file);
        });

        await deadlineAPI.createWithFiles(formDataToSend);
      }

      fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving deadline:', error);
      setError(error.response?.data?.message || 'Failed to save deadline');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this deadline? This action cannot be undone.')) {
      return;
    }

    try {
      await deadlineAPI.deleteDeadline(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting deadline:', error);
      setError('Failed to delete deadline');
    }
  };

  const handleToggleComplete = async (deadline) => {
    try {
      await deadlineAPI.markComplete(deadline.id, !deadline.is_completed);
      fetchData();
    } catch (error) {
      console.error('Error updating deadline status:', error);
      setError('Failed to update deadline status');
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      full: date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const getTypeColor = (type) => {
    const colors = {
      assignment: '#3b82f6',
      project: '#8b5cf6',
      exam: '#ef4444',
      quiz: '#f59e0b',
      other: '#6b7280'
    };
    return colors[type] || colors.other;
  };

  const getTypeIcon = (type) => {
    const icons = {
      assignment: '📝',
      project: '🎯',
      exam: '📚',
      quiz: '📊',
      other: '📌'
    };
    return icons[type] || icons.other;
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const isUpcoming = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;
    const days = diff / (1000 * 60 * 60 * 24);
    return days <= 7 && days > 0;
  };

  const getTimeUntil = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;

    if (diff < 0) {
      const overdueDays = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24));
      if (overdueDays === 0) {
        const overdueHours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
        return `${overdueHours} hour${overdueHours !== 1 ? 's' : ''} overdue`;
      }
      return `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} left`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} left`;
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} left`;
    }
  };

  const filterDeadlines = (deadlines) => {
    switch (filter) {
      case 'upcoming':
        return deadlines.filter(d => !d.is_completed && isUpcoming(d.due_date));
      case 'overdue':
        return deadlines.filter(d => !d.is_completed && isOverdue(d.due_date));
      case 'completed':
        return deadlines.filter(d => d.is_completed);
      default:
        return deadlines;
    }
  };

  const sortedDeadlines = filterDeadlines([...deadlines]).sort((a, b) => {
    if (a.is_completed !== b.is_completed) {
      return a.is_completed ? 1 : -1;
    }
    return new Date(a.due_date) - new Date(b.due_date);
  });

  const stats = {
    total: deadlines.length,
    upcoming: deadlines.filter(d => !d.is_completed && isUpcoming(d.due_date)).length,
    overdue: deadlines.filter(d => !d.is_completed && isOverdue(d.due_date)).length,
    completed: deadlines.filter(d => d.is_completed).length
  };

  if (loading) {
    return (
      <div className="teacher-module-container">
        <div className="module-header">
          <h1>⏰ Deadlines Management</h1>
        </div>
        <div className="loading-state">Loading deadlines...</div>
      </div>
    );
  }

  return (
    <div className="teacher-module-container">
      <div className="module-header">
        <div>
          <h1>⏰ Deadlines Management</h1>
          <p className="module-description">Create deadlines or post files and materials for your classes</p>
        </div>
        <button className="upload-btn" onClick={() => handleOpenModal()}>
          <span>+</span> Create Post
        </button>
      </div>

      {error && !showModal && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe', color: '#3b82f6' }}>📋</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Deadlines</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fed7aa', color: '#ea580c' }}>⏳</div>
          <div className="stat-content">
            <div className="stat-value">{stats.upcoming}</div>
            <div className="stat-label">Due This Week</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fecaca', color: '#dc2626' }}>⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.overdue}</div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5', color: '#059669' }}>✓</div>
          <div className="stat-content">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="filter-buttons">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({stats.total})
        </button>
        <button 
          className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
          onClick={() => setFilter('upcoming')}
        >
          Due This Week ({stats.upcoming})
        </button>
        <button 
          className={`filter-btn ${filter === 'overdue' ? 'active' : ''}`}
          onClick={() => setFilter('overdue')}
        >
          Overdue ({stats.overdue})
        </button>
        <button 
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed ({stats.completed})
        </button>
      </div>

      {/* Deadlines List */}
      <div className="content-section">
        {sortedDeadlines.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h3>No deadlines found</h3>
            <p>
              {filter === 'all' 
                ? "Create your first deadline to get started!"
                : `No ${filter} deadlines at the moment.`}
            </p>
            {filter === 'all' && (
              <button className="upload-btn" onClick={() => handleOpenModal()}>
                <span>+</span> Create Post
              </button>
            )}
          </div>
        ) : (
          <div className="deadlines-list">
            {sortedDeadlines.map((deadline) => {
              const { date, time } = formatDateTime(deadline.due_date);
              const { date: postedDate, time: postedTime } = deadline.created_at ? formatDateTime(deadline.created_at) : {};
              const overdue = !deadline.is_completed && isOverdue(deadline.due_date);
              const upcoming = !deadline.is_completed && isUpcoming(deadline.due_date);
              const timeUntil = !deadline.is_completed ? getTimeUntil(deadline.due_date) : null;

              return (
                <div 
                  key={deadline.id}
                  className={`deadline-card ${deadline.is_completed ? 'completed' : ''} ${overdue ? 'overdue' : ''} ${upcoming ? 'upcoming' : ''}`}
                  style={{ borderLeftColor: getTypeColor(deadline.type) }}
                >
                  <div className="deadline-main">
                    <div 
                      className="deadline-icon"
                      style={{ background: getTypeColor(deadline.type) }}
                    >
                      {getTypeIcon(deadline.type)}
                    </div>
                    
                    <div 
                      className="deadline-content"
                      onClick={() => setSelectedDeadline(deadline)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="deadline-header-row">
                        <h3 className="deadline-title">{deadline.title}</h3>
                        <span 
                          className="deadline-type-badge"
                          style={{ color: getTypeColor(deadline.type) }}
                        >
                          {deadline.type}
                        </span>
                      </div>
                      
                      {deadline.instructions && (
                        <p className="deadline-description">{deadline.instructions}</p>
                      )}

                      <div className="deadline-meta">
                        <span className="deadline-class">
                          📚 {deadline.classes?.class_name} ({deadline.classes?.section})
                        </span>
                        <span className="deadline-code">
                          🔖 {deadline.classes?.class_code}
                        </span>
                        {postedDate && (
                          <span className="deadline-code">
                            🕒 Posted: {postedDate} at {postedTime}
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
                    </div>

                    <div className="deadline-due">
                      <div className="due-date">{date}</div>
                      <div className="due-time">{time}</div>
                      {timeUntil && (
                        <div className={`time-countdown ${overdue ? 'overdue-text' : ''}`}>
                          {timeUntil}
                        </div>
                      )}
                      {deadline.is_completed && (
                        <div className="completed-badge">
                          ✓ Completed
                        </div>
                      )}
                    </div>

                    <div className="deadline-actions">
                      <button 
                        className="btn-icon"
                        onClick={() => handleOpenModal(deadline)}
                        title="Edit deadline"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-icon"
                        onClick={() => handleDelete(deadline.id)}
                        title="Delete deadline"
                      >
                        🗑️
                      </button>
                      <button 
                        className={`btn-complete ${deadline.is_completed ? 'completed' : ''}`}
                        onClick={() => handleToggleComplete(deadline)}
                        title={deadline.is_completed ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        {deadline.is_completed ? '↩️' : '✓'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Deadline Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingDeadline ? 'Edit Deadline' : 'Create New Post'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="error-message" style={{ marginBottom: '15px', padding: '10px', background: '#fee', color: '#c00', borderRadius: '5px' }}>
                  {error}
                </div>
              )}

              <div className="form-group">
                <label>Class *</label>
                <select
                  name="classId"
                  value={formData.classId}
                  onChange={handleChange}
                  required
                  disabled={editingDeadline !== null}
                >
                  <option value="">Select a class...</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name} ({cls.section}) - {cls.class_code}
                    </option>
                  ))}
                </select>
                {editingDeadline && (
                  <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
                    Class cannot be changed when editing
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Chapter 5 Assignment"
                  required
                />
              </div>

              <div className="form-group">
                <label>{formData.type === 'material' ? 'Description' : 'Instructions for Students'}</label>
                <textarea
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleChange}
                  placeholder={formData.type === 'material'
                    ? 'Describe the file or material you are posting...'
                    : 'Provide detailed instructions about what students need to do...'}
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label>Type *</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                >
                  {!editingDeadline && <option value="material">Files and Materials</option>}
                  <option value="assignment">Assignment</option>
                  <option value="project">Project</option>
                  <option value="exam">Exam</option>
                  <option value="quiz">Quiz</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {!editingDeadline && (
                <div className="form-group">
                  <label>{formData.type === 'material' ? 'Choose File *' : 'Attach Materials (Optional)'}</label>
                  <input 
                    type="file" 
                    multiple 
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.png,.zip,.xls,.xlsx"
                    onChange={handleFileSelect}
                    style={{ 
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  />
                  <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
                    {formData.type === 'material'
                      ? 'Posted files will appear in student Tasks > Files & Materials'
                      : 'Upload files to help students complete the assignment (Max 50MB per file)'}
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
              )}

              {formData.type !== 'material' && (
                <div className="form-group">
                  <label>Points (Total Score) *</label>
                  <input
                    type="number"
                    name="points"
                    value={formData.points}
                    onChange={handleChange}
                    placeholder="100"
                    min="0"
                    required
                  />
                </div>
              )}

              {formData.type !== 'material' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Due Date *</label>
                    <input
                      type="date"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Due Time *</label>
                    <input
                      type="time"
                      name="dueTime"
                      value={formData.dueTime}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingDeadline ? 'Update Deadline' : formData.type === 'material' ? 'Post Files and Materials' : 'Create Deadline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deadline Detail Modal */}
      {selectedDeadline && (
        <DeadlineDetailModal
          deadline={selectedDeadline}
          onClose={() => setSelectedDeadline(null)}
          onRefresh={fetchData}
        />
      )}

      <style jsx>{`
        .deadlines-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          padding: 20px;
        }

        .deadline-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          border-left: 4px solid #3b82f6;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
          position: relative;
        }

        .deadline-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          transform: translateY(-2px);
        }

        .deadline-card.completed {
          opacity: 0.7;
          background: #f9fafb;
        }

        .deadline-card.overdue {
          border-left-color: #ef4444;
          background: #fef2f2;
        }

        .deadline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .deadline-type-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .deadline-actions {
          display: flex;
          gap: 5px;
        }

        .icon-btn {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 5px;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .icon-btn:hover {
          opacity: 1;
        }

        .deadline-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 10px 0;
        }

        .deadline-description {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 15px 0;
          line-height: 1.5;
        }

        .deadline-datetime {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
        }

        .datetime-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #4b5563;
        }

        .datetime-icon {
          font-size: 16px;
        }

        .overdue-badge, .completed-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .overdue-badge {
          background: #fee2e2;
          color: #991b1b;
        }

        .completed-badge {
          background: #d1fae5;
          color: #065f46;
        }

        .deadline-footer {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
        }

        .complete-btn {
          width: 100%;
          padding: 10px;
          border: 2px solid #10b981;
          background: white;
          color: #10b981;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .complete-btn:hover {
          background: #10b981;
          color: white;
        }

        .complete-btn.is-completed {
          border-color: #6b7280;
          color: #6b7280;
        }

        .complete-btn.is-completed:hover {
          background: #6b7280;
          color: white;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          borderRadius: 16px;
          padding: 0;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          color: #1f2937;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 32px;
          cursor: pointer;
          color: #6b7280;
          line-height: 1;
          padding: 0;
          width: 32px;
          height: 32px;
        }

        .close-btn:hover {
          color: #1f2937;
        }

        form {
          padding: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .cancel-btn, .submit-btn {
          flex: 1;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-btn {
          background: white;
          border: 2px solid #d1d5db;
          color: #6b7280;
        }

        .cancel-btn:hover {
          border-color: #9ca3af;
          color: #374151;
        }

        .submit-btn {
          background: #3b82f6;
          border: 2px solid #3b82f6;
          color: white;
        }

        .submit-btn:hover {
          background: #2563eb;
          border-color: #2563eb;
        }

        .loading-state, .error-message {
          padding: 40px;
          text-align: center;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default TeacherDeadlines;
