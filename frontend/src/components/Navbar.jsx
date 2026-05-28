import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { IoSettingsOutline, IoChevronDown, IoPersonOutline, IoInformationCircleOutline, IoHelpCircleOutline, IoLogOutOutline, IoMoonOutline, IoSunnyOutline } from 'react-icons/io5';
import LogoutConfirmModal from './LogoutConfirmModal';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    setShowDropdown(false);
    logout();
    navigate('/login');
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleProfileClick = () => {
    setShowDropdown(false);
    if (user?.role === 'teacher') {
      navigate('/teacher-dashboard/profile');
    } else {
      navigate('/dashboard/profile');
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleAboutUs = () => {
    setShowDropdown(false);
    // Navigate to about us page or show modal
    alert('About Us: Hamster Academy - Focus. Growth. Momentum.\n\nA learning management system designed to help students and teachers achieve their educational goals with efficiency and clarity.');
  };

  const handleCustomerSupport = () => {
    setShowDropdown(false);
    // Navigate to support page or show contact info
    alert('Customer Support:\n\nEmail: support@hamsteracademy.com\nPhone: 1-800-HAMSTER\n\nWe\'re here to help you succeed!');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-brand">
          <img src="/images/header-banner.png" alt="HomLearning" className="brand-logo" />
        </div>
      </div>
      
      <div className="navbar-right">
        <div className="user-profile-wrapper" ref={dropdownRef}>
          <div className="user-profile" onClick={toggleDropdown}>
            <div className="profile-avatar">
              {!imageError && user?.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt={user?.name || "User"}
                  onError={handleImageError}
                />
              ) : (
                <div className="avatar-fallback">
                  {user?.name?.charAt(0).toUpperCase() || '👤'}
                </div>
              )}
            </div>
            <span className="user-name">{user?.name?.split(' ')[0] || 'User'}</span>
            <IoChevronDown className={`dropdown-icon ${showDropdown ? 'rotated' : ''}`} />
          </div>

          {showDropdown && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <div className="dropdown-user-info">
                  <div className="dropdown-avatar">
                    {!imageError && user?.profilePicture ? (
                      <img 
                        src={user.profilePicture} 
                        alt={user?.name || "User"}
                      />
                    ) : (
                      <div className="avatar-fallback">
                        {user?.name?.charAt(0).toUpperCase() || '👤'}
                      </div>
                    )}
                  </div>
                  <div className="dropdown-user-details">
                    <div className="dropdown-user-name">{user?.name || 'User'}</div>
                    <div className="dropdown-user-email">{user?.email || ''}</div>
                  </div>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <button className="dropdown-item" onClick={handleProfileClick}>
                <IoPersonOutline className="dropdown-item-icon" />
                <span>Profile</span>
              </button>

              <button className="dropdown-item" onClick={handleAboutUs}>
                <IoInformationCircleOutline className="dropdown-item-icon" />
                <span>About Us</span>
              </button>

              <button className="dropdown-item" onClick={handleCustomerSupport}>
                <IoHelpCircleOutline className="dropdown-item-icon" />
                <span>Customer Support</span>
              </button>

              <div className="dropdown-divider"></div>

              <button className="dropdown-item logout-item" onClick={handleLogout}>
                <IoLogOutOutline className="dropdown-item-icon" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

        <button 
          className="theme-toggle-btn" 
          onClick={toggleDarkMode}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <IoSunnyOutline /> : <IoMoonOutline />}
        </button>

        <button className="settings-btn" onClick={handleProfileClick}>
          <IoSettingsOutline />
        </button>
      </div>
      <LogoutConfirmModal 
        isOpen={showLogoutModal}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </nav>
  );
};

export default Navbar;
