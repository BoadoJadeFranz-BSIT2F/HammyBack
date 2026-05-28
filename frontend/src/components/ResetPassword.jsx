import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './ForgotPassword.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setMessage({ type: 'error', text: 'Invalid reset link' });
        setVerifying(false);
        return;
      }

      try {
        await axios.get(`http://localhost:5000/api/password/verify-reset-token/${token}`);
        setTokenValid(true);
      } catch (error) {
        setMessage({ 
          type: 'error', 
          text: error.response?.data?.message || 'This reset link is invalid or has expired' 
        });
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!password || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/password/reset-password', {
        token,
        newPassword: password
      });

      setMessage({ 
        type: 'success', 
        text: response.data.message || 'Password reset successfully!' 
      });
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to reset password. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="auth-container">
        <div className="brand-header">
          <img src="/images/header-banner.png" alt="HamLearning" className="auth-logo" />
          <p className="tagline">Learn smarter, together</p>
        </div>
        <div className="auth-card">
          <div className="welcome-section" style={{ textAlign: 'center' }}>
            <p>Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="auth-container">
        <div className="brand-header">
          <img src="/images/header-banner.png" alt="HamLearning" className="auth-logo" />
          <p className="tagline">Learn smarter, together</p>
        </div>
        <div className="auth-card">
          <div className="welcome-section">
            <h2>Invalid Reset Link</h2>
          </div>
          {message.text && (
            <div className={`${message.type}-message`}>
              {message.text}
            </div>
          )}
          <div className="back-to-login">
            <button 
              onClick={() => navigate('/')}
              className="btn-submit"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="brand-header">
        <img src="/images/header-banner.png" alt="HamLearning" className="auth-logo" />
        <p className="tagline">Learn smarter, together</p>
      </div>

      <div className="auth-card">
        <div className="welcome-section">
          <h2>Set New Password</h2>
          <p>Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {message.text && (
            <div className={`${message.type}-message`}>
              {message.text}
            </div>
          )}

          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password (min 6 characters)"
              disabled={loading}
              autoFocus
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

          <button 
            type="submit" 
            className="btn-submit" 
            disabled={loading}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>

          <div className="back-to-login">
            <button 
              type="button" 
              onClick={() => navigate('/')}
              className="link-button"
            >
              ← Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
