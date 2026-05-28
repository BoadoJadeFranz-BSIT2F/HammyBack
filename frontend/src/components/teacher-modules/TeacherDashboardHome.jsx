import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { classAPI, deadlineAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { archiveMaterial, isMaterialArchived } from '../../services/archive';
import { IoSchoolOutline, IoBookOutline, IoTimeOutline, IoPeopleOutline, IoArrowForward, IoCopyOutline } from 'react-icons/io5';
import { PiGrains } from 'react-icons/pi';
import { GiFruitBowl, GiPlantSeed } from 'react-icons/gi';
import CreateClassModal from '../CreateClassModal';
import './TeacherDashboardHome.css';

const TeacherDashboardHome = () => {
  const navigate = useNavigate();
  const outletCtx = useOutletContext() || {};
  const { user } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalDeadlines, setTotalDeadlines] = useState(0);
  const [copiedCode, setCopiedCode] = useState('');

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await classAPI.getMyClasses();
      const list = (res.data.classes || []).filter(
        (c) => !isMaterialArchived({ source_type: 'class', source_id: c.id })
      );
      setClasses(list);

      // Count all deadlines across classes
      const deadlineCounts = await Promise.all(
        list.map((c) =>
          deadlineAPI.getClassDeadlines(c.id)
            .then((r) => (r.data.deadlines || []).length)
            .catch(() => 0)
        )
      );
      setTotalDeadlines(deadlineCounts.reduce((a, b) => a + b, 0));
    } catch (err) {
      console.error('Error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalStudents = classes.reduce((acc, c) => acc + (c.student_count || 0), 0);

  const statsCards = [
    { icon: <IoSchoolOutline />, value: classes.length, label: 'Active Classes', color: '#1e5a3a', bg: '#d4f1d9', onClick: null },
    { icon: <IoPeopleOutline />, value: totalStudents, label: 'Total Students', color: '#3b82f6', bg: '#dbeafe', onClick: null },
    { icon: <IoTimeOutline />, value: totalDeadlines, label: 'Total Deadlines', color: '#f59e0b', bg: '#fef3c7', onClick: null },
    { icon: <IoBookOutline />, value: '—', label: 'Materials', color: '#8b5cf6', bg: '#ede9fe', onClick: null },
  ];

  const handleClassCreated = (newClass) => {
    setClasses((prev) => [newClass, ...prev]);
    if (outletCtx.onClassCreated) outletCtx.onClassCreated();
  };

  const handleArchiveClass = (e, cls) => {
    e.stopPropagation();
    archiveMaterial({
      source_type: 'class',
      source_id: cls.id,
      title: cls.className,
      class_id: cls.id,
      class_name: cls.className,
      description: `Section: ${cls.section || 'N/A'}`
    });
    setClasses((prev) => prev.filter((c) => c.id !== cls.id));
  };

  const handleCopyCode = (e, classCode) => {
    e.stopPropagation();
    navigator.clipboard.writeText(classCode).then(() => {
      setCopiedCode(classCode);
      setTimeout(() => setCopiedCode(''), 2000);
    });
  };

  const getCardColor = (index) => {
    const colors = [
      { from: '#1e5a3a', to: '#2d7a4f' },
      { from: '#1d4ed8', to: '#3b82f6' },
      { from: '#7c3aed', to: '#8b5cf6' },
      { from: '#b45309', to: '#d97706' },
      { from: '#be123c', to: '#e11d48' },
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="teacher-home">
      {/* Decorative background icons */}
      <div className="teacher-bg-icon teacher-icon-1"><PiGrains /></div>
      <div className="teacher-bg-icon teacher-icon-2"><GiFruitBowl /></div>
      <div className="teacher-bg-icon teacher-icon-3"><GiPlantSeed /></div>
      <div className="teacher-bg-icon teacher-icon-4"><PiGrains /></div>
      <div className="teacher-bg-icon teacher-icon-5"><GiFruitBowl /></div>
      <div className="teacher-bg-icon teacher-icon-6"><GiPlantSeed /></div>

      {/* ===== Welcome Banner ===== */}
      <div className="teacher-welcome-banner">
        <div className="teacher-welcome-content">
          <h2 className="teacher-welcome-title">
            {greeting}, {user?.name?.split(' ')[0] || 'Teacher'}.
          </h2>
          <p className="teacher-welcome-message">
            {classes.length === 0
              ? 'Create your first class to get started!'
              : `You manage ${classes.length} class${classes.length !== 1 ? 'es' : ''} with ${totalStudents} student${totalStudents !== 1 ? 's' : ''}.`}
          </p>
        </div>
        <div className="teacher-profile-box">
          {!imageError && user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user?.name}
              className="teacher-profile-picture"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="teacher-profile-fallback">
              {user?.name?.charAt(0).toUpperCase() || '👤'}
            </div>
          )}
        </div>
      </div>

      {/* ===== Stats Row ===== */}
      <div className="teacher-stats-row">
        {statsCards.map((s, i) => (
          <div
            key={i}
            className="teacher-stat-card-new"
            style={{ cursor: s.onClick ? 'pointer' : 'default' }}
            onClick={s.onClick || undefined}
          >
            <div className="teacher-stat-icon-new" style={{ backgroundColor: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <div className="teacher-stat-content">
              <div className="teacher-stat-value">{s.value}</div>
              <div className="teacher-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== Classes Section ===== */}
      <div className="teacher-classes-main">
        <div className="teacher-classes-top">
          <h2 className="teacher-classes-heading">My Classes</h2>
          <button className="teacher-create-btn" onClick={() => setShowCreateModal(true)}>
            + Create Class
          </button>
        </div>

        {classes.length > 0 && (
          <div className="teacher-info-banner">
            <span>👥</span>
            <span>Share class codes with your students so they can join your classes</span>
          </div>
        )}

        {loading ? (
          <div className="teacher-loading-state">Loading classes…</div>
        ) : classes.length === 0 ? (
          <div className="teacher-empty-state">
            <div style={{ fontSize: 64, marginBottom: 16 }}>📚</div>
            <p>No classes yet. Create your first class!</p>
            <button className="teacher-create-btn" onClick={() => setShowCreateModal(true)}>
              + Create Class
            </button>
          </div>
        ) : (
          <div className="teacher-classes-grid">
            {classes.map((cls, index) => {
              const col = getCardColor(index);
              return (
                <div
                  key={cls.id}
                  className="teacher-class-card-new"
                  onClick={() => navigate(`/teacher-dashboard/class/${cls.id}/files`)}
                >
                  {/* Coloured header strip */}
                  <div
                    className="teacher-card-strip"
                    style={{ background: `linear-gradient(135deg, ${col.from} 0%, ${col.to} 100%)` }}
                  >
                    <h3 className="teacher-card-name">{cls.className}</h3>
                    <div className="teacher-card-code-row">
                      <span className="teacher-card-code">{cls.classCode}</span>
                      <button
                        className="teacher-copy-btn"
                        onClick={(e) => handleCopyCode(e, cls.classCode)}
                        title="Copy class code"
                      >
                        {copiedCode === cls.classCode ? '✓' : <IoCopyOutline />}
                      </button>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="teacher-card-body">
                    {cls.section && (
                      <div className="teacher-card-meta-row">
                        <span className="teacher-card-meta-label">Section</span>
                        <span className="teacher-card-meta-value">{cls.section}</span>
                      </div>
                    )}
                    {cls.subject && (
                      <div className="teacher-card-meta-row">
                        <span className="teacher-card-meta-label">Subject</span>
                        <span className="teacher-card-meta-value">{cls.subject}</span>
                      </div>
                    )}
                    {cls.room && (
                      <div className="teacher-card-meta-row">
                        <span className="teacher-card-meta-label">Room</span>
                        <span className="teacher-card-meta-value">{cls.room}</span>
                      </div>
                    )}
                    <div className="teacher-card-meta-row">
                      <span className="teacher-card-meta-label">Students</span>
                      <span className="teacher-card-meta-value">{cls.student_count || 0}</span>
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="teacher-card-footer">
                    <button
                      className="teacher-card-open-btn"
                      onClick={(e) => { e.stopPropagation(); navigate(`/teacher-dashboard/class/${cls.id}/files`); }}
                    >
                      Open <IoArrowForward style={{ fontSize: 14 }} />
                    </button>
                    <button
                      className="teacher-card-delete-btn"
                      onClick={(e) => handleArchiveClass(e, cls)}
                      title="Archive class"
                    >
                      🗂️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateClassModal
          onClose={() => setShowCreateModal(false)}
          onClassCreated={handleClassCreated}
        />
      )}

    </div>
  );
};

export default TeacherDashboardHome;
