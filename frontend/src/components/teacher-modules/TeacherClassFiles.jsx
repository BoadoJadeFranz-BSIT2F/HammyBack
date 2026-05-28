import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fileAPI, deadlineAPI } from '../../services/api';
import FileDetailModal from './FileDetailModal';
import { archiveMaterial, filterArchivedMaterials, isDeadlineArchived, onArchiveChange } from '../../services/archive';
import './TeacherModules.css';

const API_BASE = 'http://localhost:5000';

const TeacherClassFiles = () => {
  const { classData } = useOutletContext();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (classData?.id) fetchFiles();
  }, [classData?.id]);

  useEffect(() => {
    const unsubscribe = onArchiveChange(() => {
      if (classData?.id) fetchFiles();
    });
    return unsubscribe;
  }, [classData?.id]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError('');

      const [classFilesResponse, deadlinesResponse] = await Promise.all([
        fileAPI.getClassFiles(classData.id),
        deadlineAPI.getClassDeadlines(classData.id)
      ]);

      const classFiles = (classFilesResponse.data.files || []).map((file) => ({
        ...file,
        source_type: 'class_file',
        source_date: file.upload_date || file.created_at
      }));

      const deadlines = deadlinesResponse?.data?.deadlines || [];
      const detailedDeadlines = await Promise.all(
        deadlines.map((d) => deadlineAPI.getDeadline(d.id).catch(() => ({ data: { deadline: d } })))
      );

      const deadlineAttachments = detailedDeadlines.flatMap((res) => {
        const full = res?.data?.deadline;
        const deadlineFiles = full?.files || [];
        return deadlineFiles.map((f) => ({
          id: `deadline-file-${f.id}`,
          source_id: f.id,
          title: full.title,
          description: full.instructions || 'Attached in deadline',
          file_name: f.file_name,
          file_type: f.file_type,
          file_size: f.file_size,
          file_url: `${API_BASE}${f.file_path}`,
          file_path: f.file_path,
          created_at: f.uploaded_at || full.created_at,
          source_type: 'deadline_attachment',
          source_date: f.uploaded_at || full.created_at,
          deadline_title: full.title,
          deadline_id: full.id
        }));
      });

      const merged = [...deadlineAttachments, ...classFiles].sort(
        (a, b) => new Date(b.source_date || b.created_at || 0) - new Date(a.source_date || a.created_at || 0)
      );

      const afterArchive = filterArchivedMaterials(merged).filter(
        (f) => f.source_type !== 'deadline_attachment' || !isDeadlineArchived(f.deadline_id)
      );

      setFiles(afterArchive);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = (file) => {
    archiveMaterial({
      ...file,
      class_id: classData.id,
      class_name: classData.className || classData.class_name
    });

    if (file.source_type === 'deadline_attachment' && file.deadline_id) {
      archiveMaterial({
        source_type: 'deadline',
        source_id: file.deadline_id,
        title: file.deadline_title || file.title,
        class_id: classData.id,
        class_name: classData.className || classData.class_name
      });
      setFiles((prev) => prev.filter((f) => f.deadline_id !== file.deadline_id));
    } else {
      setFiles((prev) => prev.filter((f) => (f.source_id || f.id) !== (file.source_id || file.id) || f.source_type !== file.source_type));
    }

    setSuccess('Material archived successfully.');
    setTimeout(() => setSuccess(''), 2500);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!classData) return <div className="loading-state">Loading class...</div>;
  if (loading) return <div className="loading-state">Loading files...</div>;

  return (
    <div className="class-section-container">
      <div className="section-header">
        <div>
          <h2>Files & Materials for {classData.className || classData.class_name}</h2>
          <p className="section-subtitle">All class materials posted through class files and deadlines.</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {files.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <p>No files uploaded yet for this class</p>
          <p className="empty-hint">Create a deadline with attachments or upload class files.</p>
        </div>
      ) : (
        <div className="files-grid">
          {files.map((file) => (
            <div key={file.id} className="file-card-classroom">
              <div
                onClick={() => setSelectedFile(file)}
                className="file-card-link"
                style={{ cursor: 'pointer' }}
              >
                <div className="file-preview">
                  {file.file_type?.includes('image') ? (
                    <img src={file.file_url} alt={file.title} className="file-preview-image" />
                  ) : file.file_type?.includes('pdf') ? (
                    <div className="file-preview-icon pdf-preview">
                      <span className="preview-icon">📕</span>
                      <span className="preview-label">PDF</span>
                    </div>
                  ) : file.file_type?.includes('word') || file.file_type?.includes('document') ? (
                    <div className="file-preview-icon doc-preview">
                      <span className="preview-icon">📘</span>
                      <span className="preview-label">DOC</span>
                    </div>
                  ) : file.file_type?.includes('sheet') || file.file_type?.includes('excel') ? (
                    <div className="file-preview-icon sheet-preview">
                      <span className="preview-icon">📗</span>
                      <span className="preview-label">XLSX</span>
                    </div>
                  ) : file.file_type?.includes('presentation') || file.file_type?.includes('powerpoint') ? (
                    <div className="file-preview-icon ppt-preview">
                      <span className="preview-icon">📙</span>
                      <span className="preview-label">PPT</span>
                    </div>
                  ) : (
                    <div className="file-preview-icon default-preview">
                      <span className="preview-icon">📄</span>
                      <span className="preview-label">{file.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                    </div>
                  )}
                </div>
                <div className="file-card-info">
                  <h3 className="file-card-title">{file.title}</h3>
                  <p className="file-card-filename">{file.file_name}</p>
                  {file.source_type === 'deadline_attachment' && (
                    <p className="file-card-description" style={{ color: '#1d4ed8', fontWeight: 600 }}>
                      From deadline: {file.deadline_title}
                    </p>
                  )}
                  {file.description && <p className="file-card-description">{file.description}</p>}
                  <div className="file-card-meta">
                    <span className="file-meta-size">{formatFileSize(file.file_size)}</span>
                    <span className="file-meta-date">� Posted: {formatDate(file.created_at || file.upload_date)}</span>
                  </div>
                </div>
              </div>
              <div className="file-card-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchive(file);
                  }}
                  className="btn-delete-icon"
                  title="Archive material"
                >
                  🗂️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedFile && (
        <FileDetailModal file={selectedFile} onClose={() => setSelectedFile(null)} />
      )}
    </div>
  );
};

export default TeacherClassFiles;
