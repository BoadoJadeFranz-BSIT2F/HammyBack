import React, { useState } from 'react';
import axios from 'axios';
import './DeleteClassModal.css';

const DeleteClassModal = ({ classToDelete, onClose, onClassDeleted }) => {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // Step 1: Warning, Step 2: Confirmation

  const handleDelete = async () => {
    if (confirmText !== classToDelete.className) {
      setError('Class name does not match. Please type it exactly.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/classes/${classToDelete.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      onClassDeleted(classToDelete.id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete class');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
        {step === 1 ? (
          <>
            <div className="modal-header warning-header">
              <div className="warning-icon">⚠️</div>
              <h2>Delete Class?</h2>
              <button className="modal-close" onClick={onClose}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="warning-content">
                <p className="class-name-display">"{classToDelete.className}"</p>
                <div className="warning-list">
                  <p><strong>This action cannot be undone. This will permanently:</strong></p>
                  <ul>
                    <li>🗑️ Delete the class and all its data</li>
                    <li>👥 Remove all student enrollments</li>
                    <li>📅 Delete all class schedules from student calendars</li>
                    <li>📚 Remove all assignments and materials</li>
                    <li>📊 Delete all grades and progress data</li>
                  </ul>
                </div>
                <div className="danger-note">
                  <span className="danger-icon">🔥</span>
                  <span>All {classToDelete.section || 'students'} will lose access immediately</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                onClick={onClose} 
                className="btn-cancel"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => setStep(2)} 
                className="btn-continue-delete"
              >
                I Understand, Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-header danger-header">
              <div className="danger-icon-large">🚨</div>
              <h2>Final Confirmation</h2>
              <button className="modal-close" onClick={onClose}>&times;</button>
            </div>

            <div className="modal-body">
              {error && <div className="error-message">{error}</div>}
              
              <div className="confirmation-content">
                <p className="confirmation-instruction">
                  To confirm deletion, please type the class name exactly:
                </p>
                <p className="class-name-to-type">{classToDelete.className}</p>
                
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => {
                    setConfirmText(e.target.value);
                    setError('');
                  }}
                  placeholder="Type class name here"
                  className="confirmation-input"
                  autoFocus
                  disabled={loading}
                />

                <div className="match-indicator">
                  {confirmText && confirmText === classToDelete.className && (
                    <span className="match-success">✓ Match confirmed</span>
                  )}
                  {confirmText && confirmText !== classToDelete.className && (
                    <span className="match-error">✗ Does not match</span>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                className="btn-back"
                disabled={loading}
              >
                ← Back
              </button>
              <button 
                type="button" 
                onClick={handleDelete} 
                className="btn-delete-final"
                disabled={loading || confirmText !== classToDelete.className}
              >
                {loading ? 'Deleting...' : 'Delete Class Permanently'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteClassModal;
