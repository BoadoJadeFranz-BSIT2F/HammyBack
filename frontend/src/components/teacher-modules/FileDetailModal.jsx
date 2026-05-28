import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fileAPI, deadlineAPI } from '../../services/api';
import './FileDetailModal.css';

const FileDetailModal = ({ file, onClose, onDelete, actionLabel = 'Delete' }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('FileDetailModal opened with file:', file);
    if (file && !file.disableComments) {
      loadComments();
    } else {
      setLoading(false);
      setComments([]);
      setError('');
    }
  }, [file]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = file.source_type === 'deadline_attachment'
        ? await deadlineAPI.getDeadlineComments(file.deadline_id)
        : await fileAPI.getFileComments(file.id);
      setComments(response.data.comments || []);
      console.log('Comments loaded:', response.data.comments);
    } catch (error) {
      console.error('Error loading comments:', error);
      // Don't block the modal if comments fail - just show a message
      if (error.response?.status === 500) {
        setError('Comments feature not available. Run database migration to enable comments.');
      } else {
        setError('Failed to load comments. You can still view the file.');
      }
      setComments([]); // Set empty array so modal still works
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setPosting(true);
      setError('');
      const response = file.source_type === 'deadline_attachment'
        ? await deadlineAPI.addDeadlineComment(file.deadline_id, newComment)
        : await fileAPI.addComment(file.id, newComment);
      setComments([...comments, response.data.comment]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Failed to add comment');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      if (file.source_type === 'deadline_attachment') {
        await deadlineAPI.deleteDeadlineComment(commentId);
      } else {
        await fileAPI.deleteComment(commentId);
      }
      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError('Failed to delete comment');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
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
    if (fileType?.includes('pdf')) return '📕';
    if (fileType?.includes('word') || fileType?.includes('document')) return '📘';
    if (fileType?.includes('sheet') || fileType?.includes('excel')) return '📗';
    if (fileType?.includes('presentation') || fileType?.includes('powerpoint')) return '📙';
    if (fileType?.includes('image')) return '🖼️';
    if (fileType?.includes('video')) return '🎥';
    if (fileType?.includes('audio')) return '🎵';
    if (fileType?.includes('zip') || fileType?.includes('rar')) return '🗜️';
    return '📄';
  };

  const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (!file) return null;

  const isImage = file.file_type?.includes('image');
  const isPDF = file.file_type?.includes('pdf');

  return (
    <div className="file-detail-overlay" onClick={onClose}>
      <div className="file-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="file-detail-header">
          <h2>File Details</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <div className="file-detail-content">
          {/* File Preview Section */}
          <div className="file-detail-preview-section">
            <div className="file-preview-large">
              {isImage ? (
                <img src={file.file_url} alt={file.title} className="preview-image-large" />
              ) : (
                <div className="preview-icon-large">
                  <span className="file-icon-lg">{getFileIcon(file.file_type)}</span>
                  <span className="file-type-label">{file.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="file-info-section">
              <h3 className="file-title-large">{file.title}</h3>
              
              {file.description && (
                <div className="file-description-box">
                  <p className="file-description-text">{file.description}</p>
                </div>
              )}

              <div className="file-metadata">
                <div className="metadata-item">
                  <span className="metadata-label">File Name:</span>
                  <span className="metadata-value">{file.file_name}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Type:</span>
                  <span className="metadata-value">{file.file_type?.split('/')[1]?.toUpperCase() || 'Unknown'}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Size:</span>
                  <span className="metadata-value">{formatFileSize(file.file_size)}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Uploaded:</span>
                  <span className="metadata-value">{formatDate(file.created_at || file.upload_date)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="file-actions-large">
                <a 
                  href={file.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-view-large"
                >
                  <span>👁️</span> Open File
                </a>
                <a 
                  href={file.file_url} 
                  download={file.file_name}
                  className="btn btn-download-large"
                >
                  <span>⬇️</span> Download
                </a>
                {user?.role === 'teacher' && onDelete && (
                  <button 
                    onClick={() => {
                      onDelete();
                      onClose();
                    }}
                    className="btn btn-delete-large"
                  >
                    <span>🗂️</span> {actionLabel}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Comments Section */}
          {!file.disableComments && (
          <div className="comments-section">
            <h3 className="comments-title">Class Comments ({comments.length})</h3>

            {error && (
              <div className="comment-error">{error}</div>
            )}

            {/* Add Comment Form */}
            <form className="add-comment-form" onSubmit={handleAddComment}>
              <div className="comment-input-container">
                <div className="commenter-avatar">
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt={user.name} />
                  ) : (
                    <div className="avatar-placeholder">{getUserInitials(user?.name)}</div>
                  )}
                </div>
                <div className="comment-input-wrapper">
                  <textarea
                    className="comment-input"
                    placeholder="Add a class comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows="2"
                    disabled={posting}
                  />
                  {newComment.trim() && (
                    <div className="comment-actions">
                      <button 
                        type="button" 
                        className="btn-cancel-comment"
                        onClick={() => setNewComment('')}
                        disabled={posting}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="btn-post-comment"
                        disabled={posting}
                      >
                        {posting ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </form>

            {/* Comments List */}
            <div className="comments-list">
              {loading ? (
                <div className="comments-loading">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="no-comments">
                  <span className="no-comments-icon">💬</span>
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar">
                      {comment.user.profilePicture ? (
                        <img src={comment.user.profilePicture} alt={comment.user.name} />
                      ) : (
                        <div className="avatar-placeholder">{getUserInitials(comment.user.name)}</div>
                      )}
                    </div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <span className="comment-author">{comment.user.name}</span>
                        <span className="comment-role-badge">{comment.user.role}</span>
                        <span className="comment-time">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="comment-text">{comment.text}</p>
                      {(comment.user.id === user?.id || user?.role === 'teacher') && (
                        <button 
                          className="btn-delete-comment"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileDetailModal;
