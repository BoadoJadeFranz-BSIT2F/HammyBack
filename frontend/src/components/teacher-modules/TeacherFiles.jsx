import React, { useState, useEffect } from 'react';
import { fileAPI, classAPI } from '../../services/api';
import './TeacherModules.css';

const TeacherFiles = () => {
  const [files, setFiles] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedFile, setExpandedFile] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [filesResponse, classesResponse] = await Promise.all([
        fileAPI.getMyUploads(),
        classAPI.getMyClasses()
      ]);
      setFiles(filesResponse.data.files || []);
      setClasses(classesResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await fileAPI.deleteFile(fileId);
      setSuccess('File deleted successfully!');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete file');
    }
  };

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

  if (loading) {
    return (
      <div className="teacher-module-container">
        <div className="loading-state">Loading files...</div>
      </div>
    );
  }

  return (
    <div className="teacher-module-container">
      <div className="teacher-module-header">
        <div>
          <h2>📚 Files & Materials Feed</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
            📌 View all files shared with students. To upload new materials, use <strong>Create Post</strong> in the <strong>Deadlines</strong> section and choose <strong>Files and Materials</strong>.
          </p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="teacher-files-content">
        {files.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <p>No files uploaded yet</p>
            <p className="empty-hint">Click "Upload File" to add course materials</p>
          </div>
        ) : (
          <div className="file-feed-container">
            {files
              .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date))
              .map((file) => {
                const isExpanded = expandedFile === file.id;
                return (
                  <div 
                    key={file.id} 
                    className={`file-feed-card ${isExpanded ? 'expanded' : ''}`}
                  >
                    {/* Card Header - Always Visible, Clickable */}
                    <div 
                      className="feed-card-header"
                      onClick={() => setExpandedFile(isExpanded ? null : file.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="feed-card-main">
                        <div className="file-icon-feed">
                          {getFileIcon(file.file_type)}
                        </div>
                        <div className="feed-card-info">
                          <h3 className="feed-file-title">{file.title}</h3>
                          <div className="feed-file-meta">
                            <span className="feed-class-name">
                              📚 {file.classes?.class_name} - {file.classes?.section}
                            </span>
                            <span className="feed-separator">•</span>
                            <span 
                              className="feed-upload-date"
                              title={`Uploaded: ${formatDate(file.upload_date)}`}
                            >
                              {formatDate(file.upload_date)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="feed-expand-icon">
                        {isExpanded ? '▼' : '▶'}
                      </div>
                    </div>

                    {/* Expanded Content - Shows when clicked */}
                    {isExpanded && (
                      <div className="feed-card-expanded">
                        <div className="expanded-details">
                          <div className="detail-row">
                            <span className="detail-label">File Name:</span>
                            <span className="detail-value">{file.file_name}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">File Size:</span>
                            <span className="detail-value">{formatFileSize(file.file_size)}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">File Type:</span>
                            <span className="detail-value">{file.file_type}</span>
                          </div>
                          {file.description && (
                            <div className="detail-row full-width">
                              <span className="detail-label">Description:</span>
                              <p className="detail-description">{file.description}</p>
                            </div>
                          )}
                          <div className="detail-row">
                            <span className="detail-label">Student Access:</span>
                            <span className="detail-value access-count">
                              👥 {file.access_count || 0} students viewed
                            </span>
                          </div>
                        </div>
                        
                        <div className="expanded-actions">
                          <a 
                            href={file.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn-download-expanded"
                          >
                            📥 Download
                          </a>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(file.id);
                            }}
                            className="btn-delete-expanded"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherFiles;

