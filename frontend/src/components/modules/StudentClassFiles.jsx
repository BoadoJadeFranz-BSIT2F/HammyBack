import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fileAPI, deadlineAPI } from '../../services/api';
import FileDetailModal from '../teacher-modules/FileDetailModal';
import { filterArchivedMaterials, onArchiveChange } from '../../services/archive';

const API_BASE = 'http://localhost:5000';

function StudentClassFiles() {
  const { classId } = useParams();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, [classId]);

  useEffect(() => {
    const unsubscribe = onArchiveChange(() => fetchFiles());
    return unsubscribe;
  }, [classId]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError('');
      const [classFilesResponse, deadlinesResponse] = await Promise.all([
        fileAPI.getClassFiles(classId),
        deadlineAPI.getClassDeadlines(classId)
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
          deadline_title: full.title,
          deadline_id: full.id,
          disableComments: false
        }));
      });

      const merged = [...deadlineAttachments, ...classFiles].sort(
        (a, b) => new Date(b.source_date || b.created_at || 0) - new Date(a.source_date || a.created_at || 0)
      );

      setFiles(filterArchivedMaterials(merged));
    } catch (error) {
      console.error('Error fetching files:', error);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return '📄';
    if (fileType.includes('pdf')) return '📕';
    if (fileType.includes('word') || fileType.includes('document')) return '📘';
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📗';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📙';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('zip') || fileType.includes('compressed')) return '📦';
    return '📄';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

  if (loading) {
    return (
      <div className="files-container">
        <div className="loading-state">Loading files...</div>
      </div>
    );
  }

  return (
    <div className="files-container">
      <div className="files-header">
        <h2>📚 Class Materials</h2>
        <p className="files-subtitle">Download course materials and resources</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {files.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <p>No files available yet</p>
          <p className="empty-hint">Your teacher will post materials through deadlines and class files</p>
        </div>
      ) : (
        <div className="files-grid">
          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => {
                console.log('Student clicked file:', file);
                setSelectedFile(file);
              }}
              className="file-card-classroom"
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
                {file.description && (
                  <p className="file-card-description">{file.description}</p>
                )}
                <div className="file-card-meta">
                  <span className="file-meta-size">{formatFileSize(file.file_size)}</span>
                  <span className="file-meta-date">� Posted: {formatDate(file.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Detail Modal */}
      {selectedFile && (
        <FileDetailModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
}

export default StudentClassFiles;
