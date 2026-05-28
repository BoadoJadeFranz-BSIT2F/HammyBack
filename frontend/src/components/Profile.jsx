import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import LogoutConfirmModal from './LogoutConfirmModal';
import './Profile.css';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isGoogleUser = user?.authProvider === 'google' && !user?.hasPassword;

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validation
    if (!isGoogleUser && !currentPassword) {
      setMessage({ type: 'error', text: 'Please enter your current password' });
      return;
    }

    if (!newPassword) {
      setMessage({ type: 'error', text: 'Please enter a new password' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/password/change-password',
        {
          currentPassword: isGoogleUser ? undefined : currentPassword,
          newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMessage({ type: 'success', text: response.data.message });
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Update user state if Google user just set their first password
      if (isGoogleUser) {
        // Optionally refresh user data here
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to change password' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Profile Settings</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      <div className="profile-content">
        {/* User Info Card */}
        <div className="profile-card">
          <h2>Account Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Name</label>
              <p>{user?.name || 'N/A'}</p>
            </div>
            <div className="info-item">
              <label>Email</label>
              <p>{user?.email || 'N/A'}</p>
            </div>
            <div className="info-item">
              <label>Role</label>
              <p className="role-badge">{user?.role || 'N/A'}</p>
            </div>
            <div className="info-item">
              <label>Login Method</label>
              <p>{user?.authProvider === 'google' ? '🔐 Google Sign-In' : '📧 Email & Password'}</p>
            </div>
            {user?.role === 'student' && (
              <>
                <div className="info-item">
                  <label>Major</label>
                  <p>{user?.major || 'N/A'}</p>
                </div>
                <div className="info-item">
                  <label>Academic Year</label>
                  <p>{user?.academicYear || 'N/A'}</p>
                </div>
              </>
            )}
          </div>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>

        {/* Password Change Card */}
        <div className="profile-card">
          <h2>
            {isGoogleUser ? 'Set Password' : 'Change Password'}
          </h2>
          {isGoogleUser && (
            <div className="info-banner">
              <span>ℹ️</span>
              <p>You signed up with Google. Set a password to enable email login as well.</p>
            </div>
          )}
          
          <form onSubmit={handlePasswordChange} className="password-form">
            {message.text && (
              <div className={`${message.type}-message`}>
                {message.text}
              </div>
            )}

            {!isGoogleUser && (
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  disabled={loading}
                />
              </div>
            )}

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Updating...' : isGoogleUser ? 'Set Password' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
      <LogoutConfirmModal 
        isOpen={showLogoutModal}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
};

export default Profile;
