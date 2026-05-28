import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './TeacherSubMenu.css';

const TeacherSubMenu = () => {
  const location = useLocation();
  
  // Hide navigation when inside a class detail view
  const isInClassDetail = location.pathname.includes('/teacher-dashboard/class/');
  
  if (isInClassDetail) {
    return null;
  }

  const menuItems = [
    { name: 'Dashboard', path: '/teacher-dashboard', icon: '🏠' },
    { name: 'Schedule', path: '/teacher-dashboard/schedule', icon: '📅' },
    { name: 'Archive', path: '/teacher-dashboard/archive', icon: '🗂️' },
    { name: 'Profile', path: '/teacher-dashboard/profile', icon: '👤' }
  ];

  return (
    <div className="teacher-submenu-main">
      {menuItems.map((item, index) => (
        <React.Fragment key={index}>
          <NavLink
            to={item.path}
            end={index === 0}
            className={({ isActive }) => `teacher-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.name}</span>
          </NavLink>
          {index < menuItems.length - 1 && <span className="nav-separator">|</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

export default TeacherSubMenu;
