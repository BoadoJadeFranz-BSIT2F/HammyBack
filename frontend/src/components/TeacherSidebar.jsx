import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { classAPI } from '../services/api';
import { isMaterialArchived, onArchiveChange } from '../services/archive';
import { useAuth } from '../context/AuthContext';
import {
  IoHomeOutline,
  IoCalendarOutline,
  IoArchiveOutline,
  IoSettingsOutline,
  IoLogOutOutline,
  IoAddOutline
} from 'react-icons/io5';
import './TeacherSidebar.css';

const TeacherSidebar = ({ onClassCreated }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const menuItems = [
    { name: 'Dashboard', path: '/teacher-dashboard', icon: <IoHomeOutline /> },
    { name: 'Schedule',  path: '/teacher-dashboard/schedule', icon: <IoCalendarOutline /> },
    { name: 'Archive',   path: '/teacher-dashboard/archive',  icon: <IoArchiveOutline /> },
  ];

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await classAPI.getMyClasses();
      const list = (res.data.classes || []).filter(
        (c) => !isMaterialArchived({ source_type: 'class', source_id: c.id })
      );
      setClasses(list);
    } catch (err) {
      console.error('Error fetching teacher classes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [onClassCreated]);

  useEffect(() => {
    const unsubscribe = onArchiveChange(fetchClasses);
    return unsubscribe;
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="teacher-sidebar">
      <nav className="teacher-sidebar-nav">
        {menuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            end={index === 0}
            className={({ isActive }) => `teacher-side-item ${isActive ? 'active' : ''}`}
          >
            <span className="teacher-side-icon">{item.icon}</span>
            <span className="teacher-side-text">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="teacher-classes-section">
        <div className="teacher-classes-header">
          <h4 className="teacher-classes-title">My Classes</h4>
          <button
            className="teacher-quick-add"
            title="Create new class"
            onClick={() => navigate('/teacher-dashboard')}
          >
            <IoAddOutline />
          </button>
        </div>

        {loading ? (
          <div className="teacher-loading-text">Loading…</div>
        ) : classes.length === 0 ? (
          <div className="teacher-empty-classes">
            <p>No classes yet</p>
          </div>
        ) : (
          <div className="teacher-classes-list">
            {classes.slice(0, 5).map((cls) => (
              <div
                key={cls.id}
                className="teacher-class-item"
                onClick={() => navigate(`/teacher-dashboard/class/${cls.id}/files`)}
              >
                <div className="teacher-class-icon">📚</div>
                <div className="teacher-class-info">
                  <div className="teacher-class-name">{cls.className}</div>
                  <div className="teacher-class-section">{cls.section}</div>
                </div>
              </div>
            ))}
            {classes.length > 5 && (
              <div className="teacher-view-all">View all ({classes.length})</div>
            )}
          </div>
        )}
      </div>

      <div className="teacher-sidebar-footer">
        <NavLink to="/teacher-dashboard/profile" className="teacher-footer-item">
          <IoSettingsOutline className="teacher-footer-icon" />
          <span>Settings</span>
        </NavLink>
        <button onClick={handleLogout} className="teacher-footer-item teacher-logout-btn">
          <IoLogOutOutline className="teacher-footer-icon" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default TeacherSidebar;
