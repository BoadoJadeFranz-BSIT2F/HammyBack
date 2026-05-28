import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskAPI, fileAPI, submissionAPI } from '../../services/api';
import StudentDeadlineView from './StudentDeadlineView';
import './Module.css';

const ATTACHMENT_MARKER = '__TASK_ATTACHMENT__:';

const parseTaskDescription = (rawDescription) => {
  if (!rawDescription) {
    return { description: '', attachmentUrl: '', attachmentName: '' };
  }

  const markerIndex = rawDescription.indexOf(ATTACHMENT_MARKER);
  if (markerIndex === -1) {
    return { description: rawDescription, attachmentUrl: '', attachmentName: '' };
  }

  const description = rawDescription.slice(0, markerIndex).trim();
  const payloadRaw = rawDescription.slice(markerIndex + ATTACHMENT_MARKER.length).trim();
  try {
    const parsed = JSON.parse(payloadRaw);
    return {
      description,
      attachmentUrl: parsed.url || '',
      attachmentName: parsed.name || ''
    };
  } catch {
    return { description, attachmentUrl: '', attachmentName: '' };
  }
};

const getFileTypeLabel = (mimeType = '') => {
  const type = String(mimeType).toLowerCase();
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('word') || type.includes('document')) return 'Document';
  if (type.includes('presentation') || type.includes('powerpoint')) return 'Presentation';
  if (type.includes('spreadsheet') || type.includes('excel')) return 'Spreadsheet';
  if (type.includes('image')) return 'Image';
  if (type.includes('zip')) return 'Archive';
  if (type.includes('text')) return 'Text File';
  return 'File';
};

const Tasks = () => {
  const navigate = useNavigate();
  const [teacherTasks, setTeacherTasks] = useState([]);
  const [personalTasks, setPersonalTasks] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState(null);
  const [selectedPersonalTask, setSelectedPersonalTask] = useState(null);
  const [uploadingPersonalAttachment, setUploadingPersonalAttachment] = useState(false);
  const [activeTab, setActiveTab] = useState('teacher'); // 'teacher', 'personal', or 'files'
  
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    attachmentUrl: '',
    attachmentName: ''
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError('');

      const [teacherResult, personalResult, filesResult] = await Promise.allSettled([
        submissionAPI.getAllSubmissions(),
        taskAPI.getPersonalTasks(),
        fileAPI.getMyFiles()
      ]);

      if (teacherResult.status === 'fulfilled') {
        const normalized = (teacherResult.value.data.submissions || []).map((item) => ({
          ...item,
          deadline: item.deadline || item.deadlines
        }));
        setTeacherTasks(normalized);
      } else {
        console.error('Error fetching teacher deadlines:', teacherResult.reason);
        setTeacherTasks([]);
      }

      if (personalResult.status === 'fulfilled') {
        setPersonalTasks(personalResult.value.data || []);
      } else {
        console.error('Error fetching personal tasks:', personalResult.reason);
        setPersonalTasks([]);
      }

      if (filesResult.status === 'fulfilled') {
        setFiles(filesResult.value.data.files || []);
      } else {
        console.error('Error fetching course materials:', filesResult.reason);
        setFiles([]);
      }

      if (teacherResult.status === 'rejected' && personalResult.status === 'rejected' && filesResult.status === 'rejected') {
        setError('Failed to load assignments, tasks, and materials');
      } else if (teacherResult.status === 'rejected' && personalResult.status === 'rejected') {
        setError('Failed to load assignments and personal tasks');
      } else if (teacherResult.status === 'rejected') {
        setError('Failed to load teacher assignments');
      } else if (personalResult.status === 'rejected') {
        setError('Failed to load personal tasks');
      } else if (filesResult.status === 'rejected') {
        setError('Course materials are temporarily unavailable');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Failed to load tasks');
      setTeacherTasks([]);
      setPersonalTasks([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPersonalTask = async () => {
    if (!newTaskData.title.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      setError('');
      const dueDate = newTaskData.dueDate && newTaskData.dueTime 
        ? new Date(`${newTaskData.dueDate}T${newTaskData.dueTime}`).toISOString()
        : null;

      await taskAPI.createPersonalTask({
        title: newTaskData.title,
        description: newTaskData.description,
        dueDate,
        attachmentUrl: newTaskData.attachmentUrl,
        attachmentName: newTaskData.attachmentName
      });

      await fetchTasks();
      setShowAddTask(false);
      setNewTaskData({ title: '', description: '', dueDate: '', dueTime: '', attachmentUrl: '', attachmentName: '' });
    } catch (error) {
      console.error('Error creating task:', error);
      setError('Failed to create task');
    }
  };

  const handleUploadPersonalTaskAttachment = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setUploadingPersonalAttachment(true);
      setError('');
      const payload = new FormData();
      payload.append('file', file);
      const response = await taskAPI.uploadPersonalAttachment(payload);
      setNewTaskData((prev) => ({
        ...prev,
        attachmentUrl: response.data.fileUrl,
        attachmentName: response.data.fileName
      }));
    } catch (error) {
      console.error('Error uploading personal task attachment:', error);
      setError('Failed to upload personal task file');
    } finally {
      setUploadingPersonalAttachment(false);
      event.target.value = '';
    }
  };

  const handleTogglePersonalTask = async (taskId, isCompleted) => {
    try {
      await taskAPI.updatePersonalTask(taskId, { isCompleted: !isCompleted });
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      setError('Failed to update task');
    }
  };

  const handleDeletePersonalTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await taskAPI.deletePersonalTask(taskId);
      await fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('Failed to delete task');
    }
  };

  const handleOpenDeadline = (submission) => {
    const deadline = submission.deadline || submission.deadlines;
    if (!deadline) {
      return;
    }

    setSelectedDeadline({
      ...deadline,
      submission_id: submission.id,
      submission_status: submission.status
    });
  };

  const handleCloseDeadline = () => {
    setSelectedDeadline(null);
    fetchTasks();
  };

  const handleOpenPersonalTask = (task) => {
    setSelectedPersonalTask(task);
  };

  const handleClosePersonalTask = () => {
    setSelectedPersonalTask(null);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      full: date.toLocaleDateString('en-US', { 
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true 
      })
    };
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getDaysUntil = (dueDate) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `${days} day${days !== 1 ? 's' : ''} left`;
  };

  // Statistics
  const teacherTaskStats = {
    total: teacherTasks.length,
    submitted: teacherTasks.filter((task) => task.status === 'turned_in').length,
    graded: teacherTasks.filter((task) => task.status === 'graded').length,
    pending: teacherTasks.filter((task) => task.status === 'assigned').length
  };

  const personalTaskStats = {
    total: personalTasks.length,
    completed: personalTasks.filter(t => t.is_completed).length,
    pending: personalTasks.filter(t => !t.is_completed).length
  };

  if (loading) {
    return (
      <div className="module-container">
        <div className="module-header">
          <h1>✓ Tasks</h1>
        </div>
        <div className="module-content">
          <div className="loading-state">Loading tasks...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <h1>✓ Tasks</h1>
        <p className="module-description">Manage teacher assignments and personal tasks</p>
      </div>

      {error && (
        <div className="error-message" style={{ margin: '20px', padding: '15px', background: '#fee', color: '#c00', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      <div className="module-content">
        {/* Tab Selector */}
        <div className="task-tabs">
          <button
            className={`task-tab ${activeTab === 'teacher' ? 'active' : ''}`}
            onClick={() => setActiveTab('teacher')}
          >
            📚 Teacher Tasks ({teacherTaskStats.total})
          </button>
          <button
            className={`task-tab ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            📝 Personal Tasks ({personalTaskStats.total})
          </button>
          <button
            className={`task-tab ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            📁 Files & Materials ({files.length})
          </button>
        </div>

        {/* Teacher Tasks View */}
        {activeTab === 'teacher' && (
          <>
            {/* Stats */}
            <div className="task-stats-grid">
              <div className="task-stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-info">
                  <div className="stat-value">{teacherTaskStats.total}</div>
                  <div className="stat-label">Total Tasks</div>
                </div>
              </div>
              <div className="task-stat-card pending">
                <div className="stat-icon">⏳</div>
                <div className="stat-info">
                  <div className="stat-value">{teacherTaskStats.pending}</div>
                  <div className="stat-label">Pending Submission</div>
                </div>
              </div>
              <div className="task-stat-card submitted">
                <div className="stat-icon">📤</div>
                <div className="stat-info">
                  <div className="stat-value">{teacherTaskStats.submitted}</div>
                  <div className="stat-label">Submitted</div>
                </div>
              </div>
              <div className="task-stat-card graded">
                <div className="stat-icon">✓</div>
                <div className="stat-info">
                  <div className="stat-value">{teacherTaskStats.graded}</div>
                  <div className="stat-label">Graded</div>
                </div>
              </div>
            </div>

            {/* Teacher Tasks List */}
            {teacherTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <h3>No teacher tasks yet</h3>
                <p>Your teachers haven't assigned any tasks. Check back later!</p>
              </div>
            ) : (
              <div className="teacher-tasks-list">
                {teacherTasks.map(task => {
                  const deadline = task.deadline || task.deadlines;
                  const dueDateTime = formatDateTime(deadline?.due_date);
                  const overdue = isOverdue(deadline?.due_date) && task.status === 'assigned';
                  const hasSubmission = task.status === 'turned_in' || task.status === 'graded';
                  const isGraded = task.status === 'graded';
                  
                  return (
                    <div 
                      key={task.id} 
                      className={`teacher-task-card ${overdue && !hasSubmission ? 'overdue' : ''} ${hasSubmission ? 'submitted' : ''}`}
                      onClick={() => handleOpenDeadline(task)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="task-card-header">
                        <div>
                          <h3 className="task-card-title">{deadline?.title}</h3>
                          <p className="task-card-class">
                            📚 {deadline?.classes?.class_name} ({deadline?.classes?.section})
                          </p>
                        </div>
                        {deadline?.points && (
                          <div className="task-max-score">
                            Max: {deadline.points} pts
                          </div>
                        )}
                      </div>

                      {deadline?.instructions && (
                        <p className="task-card-description">{deadline.instructions}</p>
                      )}

                      {dueDateTime && (
                        <div className="task-card-due">
                          <span className="due-icon">📅</span>
                          <span className="due-text">
                            {dueDateTime.date} at {dueDateTime.time}
                          </span>
                          <span className={`due-countdown ${overdue ? 'overdue' : ''}`}>
                            {getDaysUntil(deadline?.due_date)}
                          </span>
                        </div>
                      )}

                      {/* Submission Status */}
                      {hasSubmission ? (
                        <div className="submission-status">
                          <div className="status-badge submitted-badge">
                            {isGraded ? '📝 Graded' : '✓ Submitted'} {task.submitted_at && `on ${new Date(task.submitted_at).toLocaleDateString()}`}
                          </div>
                          {isGraded && (
                            <div className="grade-display">
                              <span className="grade-score">Score: {task.grade}/{deadline?.points}</span>
                              <span className="grade-percentage">
                                ({deadline?.points ? ((task.grade / deadline.points) * 100).toFixed(1) : '0.0'}%)
                              </span>
                            </div>
                          )}
                          {task.feedback && (
                            <div className="feedback-box">
                              <strong>Teacher Feedback:</strong>
                              <p>{task.feedback}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="submission-status">
                          <div className="status-badge pending-badge">
                            ⏳ Not submitted yet
                          </div>
                        </div>
                      )}

                      <div className="task-card-actions">
                        <button 
                          className="task-action-btn primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenDeadline(task);
                          }}
                        >
                          {hasSubmission ? '📝 Open Assignment' : '📤 Open Assignment'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Personal Tasks View */}
        {activeTab === 'personal' && (
          <>
            <div className="personal-tasks-header">
              <div className="task-stats-inline">
                <span className="inline-stat">
                  Total: <strong>{personalTaskStats.total}</strong>
                </span>
                <span className="inline-stat">
                  Pending: <strong>{personalTaskStats.pending}</strong>
                </span>
                <span className="inline-stat">
                  Completed: <strong>{personalTaskStats.completed}</strong>
                </span>
              </div>
              <button 
                className="btn-add-task" 
                onClick={() => setShowAddTask(!showAddTask)}
              >
                {showAddTask ? '✕ Cancel' : '+ Add Task'}
              </button>
            </div>

            {showAddTask && (
              <div className="add-task-form">
                <input
                  type="text"
                  value={newTaskData.title}
                  onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                  placeholder="Task title..."
                  className="task-input"
                />
                <textarea
                  value={newTaskData.description}
                  onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                  placeholder="Description (optional)..."
                  className="task-textarea"
                  rows="2"
                />
                <div className="task-file-upload-row">
                  <label className="task-file-upload-label">Attach File (optional)</label>
                  <input
                    type="file"
                    onChange={handleUploadPersonalTaskAttachment}
                    disabled={uploadingPersonalAttachment}
                    className="task-input"
                  />
                  {uploadingPersonalAttachment && <small>Uploading attachment...</small>}
                  {!!newTaskData.attachmentUrl && (
                    <small style={{ color: '#059669' }}>Attached: {newTaskData.attachmentName || 'File uploaded'}</small>
                  )}
                </div>
                <div className="task-datetime-inputs">
                  <input
                    type="date"
                    value={newTaskData.dueDate}
                    onChange={(e) => setNewTaskData({ ...newTaskData, dueDate: e.target.value })}
                    className="task-input"
                  />
                  <input
                    type="time"
                    value={newTaskData.dueTime}
                    onChange={(e) => setNewTaskData({ ...newTaskData, dueTime: e.target.value })}
                    className="task-input"
                  />
                </div>
                <button onClick={handleAddPersonalTask} className="btn-save-task">
                  Add Task
                </button>
              </div>
            )}

            {personalTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>No personal tasks yet</h3>
                <p>Click "Add Task" to create your first personal task!</p>
              </div>
            ) : (
              <div className="personal-tasks-list">
                {personalTasks.map(task => {
                  const parsedTask = parseTaskDescription(task.description);
                  const dueDateTime = formatDateTime(task.due_date);
                  const overdue = !task.is_completed && isOverdue(task.due_date);
                  
                  return (
                    <div 
                      key={task.id} 
                      className={`personal-task-item ${task.is_completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`}
                    >
                      <div 
                        className="task-checkbox"
                        onClick={() => handleTogglePersonalTask(task.id, task.is_completed)}
                      >
                        {task.is_completed ? '✓' : '○'}
                      </div>
                      <div className="task-details" onClick={() => handleOpenPersonalTask(task)} style={{ cursor: 'pointer' }}>
                        <div className="task-title">{task.title}</div>
                        {parsedTask.description && (
                          <div className="task-description">{parsedTask.description}</div>
                        )}
                        {parsedTask.attachmentUrl && (
                          <div className="task-description" style={{ color: '#2563eb', fontWeight: 600 }}>
                            📎 {parsedTask.attachmentName || 'Attachment added'}
                          </div>
                        )}
                        <div className="task-meta">
                          {dueDateTime ? (
                            <>
                              📅 {dueDateTime.date} at {dueDateTime.time}
                              {!task.is_completed && (
                                <span className={`deadline-badge ${overdue ? 'overdue' : ''}`}>
                                  {getDaysUntil(task.due_date)}
                                </span>
                              )}
                            </>
                          ) : (
                            <span>No deadline set</span>
                          )}
                        </div>
                      </div>
                      <button 
                        className="btn-delete-task"
                        onClick={() => handleDeletePersonalTask(task.id)}
                        title="Delete task"
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Files & Materials View */}
        {activeTab === 'files' && (
          <>
            <div className="files-header">
              <h3>📁 Course Materials from Your Classes</h3>
              <p className="files-description">
                Files and materials shared by your teachers
              </p>
            </div>

            {files.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📁</div>
                <h3>No files available yet</h3>
                <p>Your teachers haven't uploaded any course materials yet.</p>
              </div>
            ) : (
              <div className="files-grid">
                {files.map(file => {
                  const formatFileSize = (bytes) => {
                    if (!bytes) return 'Unknown';
                    const mb = bytes / (1024 * 1024);
                    if (mb < 1) {
                      return `${(bytes / 1024).toFixed(1)} KB`;
                    }
                    return `${mb.toFixed(1)} MB`;
                  };

                  const getFileIcon = (fileType) => {
                    if (fileType.includes('pdf')) return '📄';
                    if (fileType.includes('word') || fileType.includes('document')) return '📝';
                    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📊';
                    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📈';
                    if (fileType.includes('image')) return '🖼️';
                    if (fileType.includes('zip')) return '🗜️';
                    return '📎';
                  };

                  const formatDate = (dateString) => {
                    const date = new Date(dateString);
                    return date.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  };

                  const handleDownload = async (fileId, fileUrl) => {
                    try {
                      await fileAPI.trackAccess(fileId);
                      window.open(fileUrl, '_blank');
                    } catch (error) {
                      console.error('Error tracking file access:', error);
                      window.open(fileUrl, '_blank');
                    }
                  };

                  return (
                    <div
                      key={file.id}
                      className="file-card"
                      onClick={() => navigate(`/dashboard/class/${file.class_id}`, { state: { activeTab: 'files' } })}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="file-icon-large">
                        {getFileIcon(file.file_type)}
                      </div>
                      <div className="file-info">
                        <h4 className="file-title">{file.title}</h4>
                        <p className="file-name">{file.file_name}</p>
                        {file.description && (
                          <p className="file-description">{file.description}</p>
                        )}
                        <div className="file-meta">
                          <span className="file-class" style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: '999px', padding: '2px 8px' }}>
                            🏷️ {file.post_type || 'Files & Materials'}
                          </span>
                          <span className="file-class" style={{ background: '#f3f4f6', color: '#374151', borderRadius: '999px', padding: '2px 8px' }}>
                            📄 {getFileTypeLabel(file.file_type)}
                          </span>
                          <span className="file-class">
                            {file.classes?.class_name} - {file.classes?.section}
                          </span>
                          <span className="file-teacher">
                            👤 {file.users?.full_name || file.users?.name || 'Teacher'}
                          </span>
                          <span className="file-size">
                            {formatFileSize(file.file_size)}
                          </span>
                          <span className="file-date">
                            📅 {formatDate(file.upload_date)}
                          </span>
                        </div>
                      </div>
                      <button 
                        className="btn-download-file"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDownload(file.id, file.file_url);
                        }}
                      >
                        📥 Download
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {selectedDeadline && (
        <StudentDeadlineView
          deadline={selectedDeadline}
          onClose={handleCloseDeadline}
          onSubmitted={handleCloseDeadline}
        />
      )}

      {selectedPersonalTask && (() => {
        const parsedTask = parseTaskDescription(selectedPersonalTask.description);
        const dueDateTime = formatDateTime(selectedPersonalTask.due_date);
        return (
          <div className="modal-overlay" onClick={handleClosePersonalTask}>
            <div className="modal-content" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <h2>Personal Task Details</h2>
                <button className="close-btn" onClick={handleClosePersonalTask}>×</button>
              </div>
              <div style={{ padding: '20px' }}>
                <h3 style={{ marginTop: 0 }}>{selectedPersonalTask.title}</h3>
                <p><strong>Status:</strong> {selectedPersonalTask.is_completed ? 'Completed' : 'Pending'}</p>
                <p><strong>Posted:</strong> {formatDateTime(selectedPersonalTask.created_at)?.full || 'N/A'}</p>
                <p><strong>Due:</strong> {dueDateTime?.full || 'No deadline'}</p>
                {parsedTask.description && (
                  <>
                    <p><strong>Description:</strong></p>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{parsedTask.description}</p>
                  </>
                )}
                {parsedTask.attachmentUrl && (
                  <p>
                    <strong>Attachment:</strong>{' '}
                    <a href={parsedTask.attachmentUrl} target="_blank" rel="noopener noreferrer">
                      {parsedTask.attachmentName || 'Open attached file'}
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <style jsx>{`
        .task-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
        }

        .task-tab {
          padding: 12px 24px;
          border: none;
          background: none;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }

        .task-tab:hover {
          color: #3b82f6;
        }

        .task-tab.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .task-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }

        .task-stat-card {
          background: #1e5a3a;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border-left: 4px solid #60a5fa;
        }

        .task-stat-card.pending {
          border-left-color: #fb923c;
        }

        .task-stat-card.submitted {
          border-left-color: #c084fc;
        }

        .task-stat-card.graded {
          border-left-color: #4ade80;
        }

        .stat-icon {
          font-size: 32px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
        }

        .stat-label {
          font-size: 12px;
          color: #e8f5e9;
          text-transform: uppercase;
          font-weight: 600;
        }

        .teacher-tasks-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .teacher-task-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border-left: 4px solid #3b82f6;
          transition: all 0.3s;
        }

        .teacher-task-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          transform: translateY(-2px);
        }

        .teacher-task-card.overdue {
          border-left-color: #ef4444;
          background: #fef2f2;
        }

        .teacher-task-card.submitted {
          border-left-color: #10b981;
        }

        .task-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .task-card-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 5px 0;
        }

        .task-card-class {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
        }

        .task-max-score {
          background: #f3f4f6;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .task-card-description {
          font-size: 14px;
          color: #4b5563;
          margin: 0 0 12px 0;
          line-height: 1.5;
        }

        .task-card-due {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .due-icon {
          font-size: 16px;
        }

        .due-countdown {
          background: #fef3c7;
          color: #92400e;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .due-countdown.overdue {
          background: #fee2e2;
          color: #991b1b;
        }

        .submission-status {
          margin: 15px 0;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .submitted-badge {
          background: #d1fae5;
          color: #065f46;
        }

        .pending-badge {
          background: #fef3c7;
          color: #92400e;
        }

        .grade-display {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #10b981;
          margin-bottom: 10px;
        }

        .feedback-box {
          background: #f9fafb;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
        }

        .feedback-box strong {
          display: block;
          margin-bottom: 5px;
          color: #374151;
        }

        .feedback-box p {
          margin: 0;
          color: #6b7280;
        }

        .task-card-actions {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
        }

        .task-action-btn {
          width: 100%;
          padding: 10px;
          border: 2px solid #3b82f6;
          background: white;
          color: #3b82f6;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .task-action-btn.primary:hover {
          background: #3b82f6;
          color: white;
        }

        .personal-tasks-header {
          display: flex;
          justify-content: space-between;
          alignItems: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .task-stats-inline {
          display: flex;
          gap: 20px;
        }

        .inline-stat {
          font-size: 14px;
          color: #6b7280;
        }

        .inline-stat strong {
          color: #1f2937;
        }

        .btn-add-task {
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-add-task:hover {
          background: #2563eb;
        }

        .add-task-form {
          background: white;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .task-input, .task-textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 10px;
          font-family: inherit;
        }

        .task-input:focus, .task-textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .task-datetime-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }

        .btn-save-task {
          width: 100%;
          padding: 12px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-save-task:hover {
          background: #059669;
        }

        .personal-tasks-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .personal-task-item {
          background: white;
          padding: 15px;
          border-radius: 8px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          transition: all 0.2s;
        }

        .personal-task-item:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }

        .personal-task-item.completed {
          opacity: 0.6;
          background: #f9fafb;
        }

        .personal-task-item.overdue {
          border-left: 3px solid #ef4444;
        }

        .task-checkbox {
          width: 24px;
          height: 24px;
          border: 2px solid #d1d5db;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          color: #10b981;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .task-checkbox:hover {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .task-details {
          flex: 1;
        }

        .task-title {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 5px;
        }

        .task-description {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 5px;
        }

        .task-meta {
          font-size: 12px;
          color: #9ca3af;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .deadline-badge {
          background: #fef3c7;
          color: #92400e;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
        }

        .deadline-badge.overdue {
          background: #fee2e2;
          color: #991b1b;
        }

        .btn-delete-task {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          opacity: 0.5;
          transition: opacity 0.2s;
          padding: 0;
        }

        .btn-delete-task:hover {
          opacity: 1;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #111827;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        .empty-state h3 {
          font-size: 20px;
          color: #111827;
          margin: 0 0 10px 0;
          font-weight: 700;
        }

        .empty-state p {
          margin: 0;
          font-weight: 600;
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
          border-radius: 16px;
          width: 90%;
          max-width: 600px;
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

        .modal-body {
          padding: 24px;
        }

        .task-details-section {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .task-details-section p {
          margin: 8px 0;
        }

        .submission-form {
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .form-group small {
          display: block;
          margin-top: 5px;
          font-size: 12px;
          color: #6b7280;
        }

        .submission-textarea, .submission-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
        }

        .submission-textarea:focus, .submission-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .file-preview {
          background: #f3f4f6;
          padding: 10px;
          border-radius: 6px;
          font-size: 14px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
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
          color: #111827;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .task-stats-grid {
            grid-template-columns: 1fr;
          }

          .teacher-tasks-list {
            grid-template-columns: 1fr;
          }

          .personal-tasks-header {
            flex-direction: column;
            align-items: stretch;
          }

          .task-stats-inline {
            flex-direction: column;
            gap: 8px;
          }

          .btn-add-task {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default Tasks;