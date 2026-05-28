import React from 'react';
import { NavLink } from 'react-router-dom';
import './SubMenu.css';

const SubMenu = () => {
  const menuItems = [
    'Dashboard',
    'Schedules',
    'Deadlines',
    'Analytics',
    'Grades',
    'Tasks',
    'Pomodoro',
    'Wellness'
  ];

  return (
    <div className="submenu">
      {menuItems.map((item, index) => (
        <React.Fragment key={index}>
          <NavLink
            to={index === 0 ? '/dashboard' : `/dashboard/${item.toLowerCase()}`}
            end={index === 0}
            className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`}
          >
            {item}
          </NavLink>
          {index < menuItems.length - 1 && <span className="submenu-separator">|</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

export default SubMenu;
