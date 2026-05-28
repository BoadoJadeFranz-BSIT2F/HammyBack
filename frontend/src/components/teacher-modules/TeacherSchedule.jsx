import React, { useState, useEffect } from 'react';
import './TeacherModules.css';

const TeacherSchedule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleItems, setScheduleItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'event', // event, rest, deadline
    startDate: '',
    endDate: '',
    description: '',
    color: '#4CAF50'
  });

  // Generate calendar days for the current month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty slots for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days in month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      type: 'event',
      startDate: '',
      endDate: '',
      description: '',
      color: '#4CAF50'
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showModal) {
        handleCloseModal();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const handleEditItem = (item) => {
    setEditingItem(item);
    setFormData(item);
    setShowModal(true);
  };

  const handleDeleteItem = (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setScheduleItems(scheduleItems.filter(item => item.id !== id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate dates
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    if (end < start) {
      alert('End date cannot be before start date!');
      return;
    }
    
    if (editingItem) {
      setScheduleItems(scheduleItems.map(item => 
        item.id === editingItem.id ? { ...formData, id: item.id } : item
      ));
    } else {
      setScheduleItems([...scheduleItems, { ...formData, id: Date.now() }]);
    }
    
    setShowModal(false);
    setFormData({
      title: '',
      type: 'event',
      startDate: '',
      endDate: '',
      description: '',
      color: '#4CAF50'
    });
  };

  // Check if a date has any schedule items
  const getItemsForDate = (date) => {
    if (!date) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    
    return scheduleItems.filter(item => {
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      const current = new Date(dateStr);
      
      return current >= start && current <= end;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(date);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (e, date) => {
    e.preventDefault();
    
    if (!draggedItem || !date) return;
    
    const oldStart = new Date(draggedItem.startDate);
    const oldEnd = new Date(draggedItem.endDate);
    const duration = oldEnd - oldStart;
    
    const newStart = new Date(date);
    const newEnd = new Date(newStart.getTime() + duration);
    
    setScheduleItems(scheduleItems.map(item => 
      item.id === draggedItem.id 
        ? { 
            ...item, 
            startDate: newStart.toISOString().split('T')[0],
            endDate: newEnd.toISOString().split('T')[0]
          }
        : item
    ));
    
    setDraggedItem(null);
    setDragOverDate(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverDate(null);
  };

  // Quick edit duration
  const handleExtendDuration = (item, days) => {
    const newEnd = new Date(item.endDate);
    newEnd.setDate(newEnd.getDate() + days);
    
    setScheduleItems(scheduleItems.map(i => 
      i.id === item.id 
        ? { ...i, endDate: newEnd.toISOString().split('T')[0] }
        : i
    ));
  };

  const typeColors = {
    event: '#4CAF50',
    rest: '#FF9800',
    deadline: '#F44336'
  };

  const typeIcons = {
    event: '📅',
    rest: '🏖️',
    deadline: '⏰'
  };

  return (
    <div className="teacher-module-container">
      <div className="teacher-module-header">
        <h2>Schedule - Gantt View</h2>
        <button onClick={handleAddItem} className="upload-btn">
          <span>+</span>
          Add Schedule Item
        </button>
      </div>

      {/* Calendar Navigation */}
      <div className="gantt-calendar-nav">
        <button onClick={handlePrevMonth} className="nav-btn">◀</button>
        <h3>{monthName}</h3>
        <button onClick={handleNextMonth} className="nav-btn">▶</button>
      </div>

      {/* Legend */}
      <div className="gantt-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ background: typeColors.event }}></span>
          <span>Event</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: typeColors.rest }}></span>
          <span>Rest Day</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: typeColors.deadline }}></span>
          <span>Deadline</span>
        </div>
        <div className="legend-info">
          💡 Click items to edit • Drag items to move dates
        </div>
      </div>

      {/* Gantt Chart Calendar */}
      <div className="gantt-calendar">
        <div className="gantt-weekdays">
          <div className="gantt-weekday">Sun</div>
          <div className="gantt-weekday">Mon</div>
          <div className="gantt-weekday">Tue</div>
          <div className="gantt-weekday">Wed</div>
          <div className="gantt-weekday">Thu</div>
          <div className="gantt-weekday">Fri</div>
          <div className="gantt-weekday">Sat</div>
        </div>
        
        <div className="gantt-days">
          {days.map((day, index) => {
            const items = day ? getItemsForDate(day) : [];
            const isToday = day && day.toDateString() === new Date().toDateString();
            const isDragOver = day && dragOverDate && day.toDateString() === dragOverDate.toDateString();
            
            return (
              <div 
                key={index} 
                className={`gantt-day ${!day ? 'gantt-day-empty' : ''} ${isToday ? 'gantt-day-today' : ''} ${isDragOver ? 'gantt-day-drag-over' : ''}`}
                onDragOver={day ? (e) => handleDragOver(e, day) : undefined}
                onDragLeave={handleDragLeave}
                onDrop={day ? (e) => handleDrop(e, day) : undefined}
              >
                {day && (
                  <>
                    <div className="gantt-day-number">{day.getDate()}</div>
                    <div className="gantt-day-items">
                      {items.map(item => (
                        <div 
                          key={item.id}
                          className="gantt-item"
                          draggable
                          style={{ background: typeColors[item.type] }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditItem(item);
                          }}
                          onDragStart={(e) => handleDragStart(e, item)}
                          onDragEnd={handleDragEnd}
                          title={`${item.title} - Click to edit or drag to move`}
                        >
                          <span className="gantt-item-icon">{typeIcons[item.type]}</span>
                          <span className="gantt-item-title">{item.title}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule Items List */}
      <div className="schedule-list">
        <h3>All Schedule Items</h3>
        {scheduleItems.length === 0 ? (
          <div className="empty-state">
            <p>No schedule items yet. Click "Add Schedule Item" to get started.</p>
          </div>
        ) : (
          <div className="schedule-items">
            {scheduleItems.map(item => (
              <div key={item.id} className="schedule-item-card" style={{ borderLeft: `4px solid ${typeColors[item.type]}` }}>
                <div className="schedule-item-header">
                  <div className="schedule-item-title">
                    <span className="schedule-item-icon">{typeIcons[item.type]}</span>
                    <h4>{item.title}</h4>
                    <span className="schedule-item-type">{item.type}</span>
                  </div>
                  <div className="schedule-item-actions">
                    <button onClick={() => handleEditItem(item)} className="btn-edit">✏️ Edit</button>
                    <button onClick={() => handleDeleteItem(item.id)} className="btn-delete">🗑️ Delete</button>
                  </div>
                </div>
                <p className="schedule-item-dates">
                  📅 {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                  <span className="duration-label">
                    ({Math.ceil((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24)) + 1} days)
                  </span>
                </p>
                <div className="quick-edit-duration">
                  <span className="quick-edit-label">Quick adjust:</span>
                  <button 
                    onClick={() => handleExtendDuration(item, -1)} 
                    className="btn-duration"
                    disabled={new Date(item.startDate).toDateString() === new Date(item.endDate).toDateString()}
                    title="Shorten by 1 day"
                  >
                    -1 day
                  </button>
                  <button 
                    onClick={() => handleExtendDuration(item, 1)} 
                    className="btn-duration"
                    title="Extend by 1 day"
                  >
                    +1 day
                  </button>
                  <button 
                    onClick={() => handleExtendDuration(item, 7)} 
                    className="btn-duration"
                    title="Extend by 1 week"
                  >
                    +1 week
                  </button>
                </div>
                {item.description && <p className="schedule-item-description">{item.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingItem ? 'Edit' : 'Add'} Schedule Item</h3>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Enter title"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="event">📅 Event</option>
                  <option value="rest">🏖️ Rest Day</option>
                  <option value="deadline">⏰ Deadline</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add description (optional)"
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={handleCloseModal} className="btn-cancel">
                  Cancel (Esc)
                </button>
                <button type="submit" className="btn-submit">
                  {editingItem ? 'Update' : 'Add'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherSchedule;
