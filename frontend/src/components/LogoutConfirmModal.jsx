import React from 'react';
import './LogoutConfirmModal.css';

const LogoutConfirmModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="logout-modal-overlay" onClick={onCancel}>
      <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="logout-modal-header">
          <h2>Confirm Logout</h2>
        </div>
        
        <div className="logout-modal-body">
          <p>Are you sure you want to logout?</p>
          <p className="logout-modal-subtitle">You will need to log in again to access your account.</p>
        </div>

        <div className="logout-modal-footer">
          <button 
            className="logout-modal-btn cancel-btn" 
            onClick={onCancel}
          >
            No, Stay
          </button>
          <button 
            className="logout-modal-btn confirm-btn" 
            onClick={onConfirm}
          >
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;
