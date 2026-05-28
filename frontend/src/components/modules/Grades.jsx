import React, { useState, useEffect } from 'react';
import { gradeAPI } from '../../services/api';
import './Module.css';

const Grades = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [customSubject, setCustomSubject] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const commonSubjects = [
    'Math', 'Science', 'English', 'History', 
    'Filipino', 'MAPEH', 'Computer', 'Values Education'
  ];

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      const response = await gradeAPI.getMyGrades();
      setGrades(response.data);
    } catch (error) {
      console.error('Error fetching grades:', error);
      setError('Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectClick = (subjectName) => {
    setSubject(subjectName);
    setShowCustomInput(false);
    setError('');
  };

  const handleCustomSubject = () => {
    setShowCustomInput(true);
    setSubject('');
    setError('');
  };

  const handleScoreInput = (value) => {
    if (score.length < 5) { // Limit to 5 digits
      setScore(score + value);
    }
  };

  const handleClear = () => {
    setScore('');
    setError('');
  };

  const handleBackspace = () => {
    setScore(score.slice(0, -1));
  };

  const handleAddGrade = async () => {
    setError('');

    const selectedSubject = (showCustomInput ? customSubject : subject).trim();
    const parsedScore = parseFloat(score);
    const parsedMaxScore = parseFloat(maxScore);

    if (!selectedSubject) {
      setError('Please select or enter a subject');
      return;
    }

    if (!Number.isFinite(parsedScore) || parsedScore <= 0) {
      setError('Please enter a score');
      return;
    }

    if (!Number.isFinite(parsedMaxScore) || parsedMaxScore <= 0) {
      setError('Please enter a max score');
      return;
    }

    if (parsedScore > parsedMaxScore) {
      setError('Score cannot be greater than max score');
      return;
    }

    try {
      await gradeAPI.createGrade({
        classId: null, // Using subject-based tracking instead of class
        title: selectedSubject,
        score: parsedScore,
        maxScore: parsedMaxScore,
        type: 'other',
        dateTaken: new Date().toISOString(),
        notes: `${selectedSubject} grade entry`
      });

      await fetchGrades();
      setScore('');
      setSubject('');
      setCustomSubject('');
      setShowCustomInput(false);
      setMaxScore('100');
    } catch (error) {
      console.error('Error adding grade:', error);
      setError(error.response?.data?.message || 'Failed to add grade');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this grade entry?')) {
      return;
    }

    try {
      await gradeAPI.deleteGrade(id);
      await fetchGrades();
    } catch (error) {
      console.error('Error deleting grade:', error);
      setError('Failed to delete grade');
    }
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return '#10b981';
    if (percentage >= 80) return '#3b82f6';
    if (percentage >= 70) return '#f59e0b';
    if (percentage >= 60) return '#ef4444';
    return '#6b7280';
  };

  const getGradeLetter = (percentage) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const calculatePercentage = (score, maxScore) => {
    return (score / maxScore) * 100;
  };

  // Calculate statistics
  const stats = {
    totalGrades: grades.length,
    averagePercentage: grades.length > 0 
      ? grades.reduce((sum, g) => sum + calculatePercentage(g.score, g.max_score), 0) / grades.length 
      : 0
  };

  // Group grades by subject
  const gradesBySubject = grades.reduce((acc, grade) => {
    const subjectName = grade.title || 'Other';
    if (!acc[subjectName]) {
      acc[subjectName] = [];
    }
    acc[subjectName].push(grade);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="module-container">
        <div className="module-header">
          <h1>🧮 Grade Calculator</h1>
        </div>
        <div className="module-content">
          <div className="loading-state">Loading grades...</div>
        </div>
      </div>
    );
  }

  const currentPercentage = score && maxScore ? (parseFloat(score) / parseFloat(maxScore)) * 100 : 0;

  return (
    <div className="module-container">
      <div className="module-header">
        <h1>🧮 Grade Calculator</h1>
        <p className="module-description">Quick grade entry by subject</p>
      </div>

      <div className="module-content">
        <div className="calculator-layout">
          {/* Calculator Section */}
          <div className="calculator-section">
            {/* Display */}
            <div className="calculator-display">
              <div className="display-subject">
                {showCustomInput ? customSubject || 'Custom Subject' : subject || 'Select Subject'}
              </div>
              <div className="display-score">
                {score || '0'} / {maxScore}
              </div>
              {score && maxScore && (
                <div className="display-percentage" style={{ color: getGradeColor(currentPercentage) }}>
                  {currentPercentage.toFixed(1)}% - {getGradeLetter(currentPercentage)}
                </div>
              )}
            </div>

            {error && (
              <div className="calculator-error">
                {error}
              </div>
            )}

            {/* Subject Buttons */}
            <div className="subject-buttons">
              {commonSubjects.map((subj) => (
                <button
                  key={subj}
                  className={`subject-btn ${subject === subj ? 'active' : ''}`}
                  onClick={() => handleSubjectClick(subj)}
                >
                  {subj}
                </button>
              ))}
              <button
                className={`subject-btn custom ${showCustomInput ? 'active' : ''}`}
                onClick={handleCustomSubject}
              >
                + Custom
              </button>
            </div>

            {showCustomInput && (
              <div className="custom-subject-input">
                <input
                  type="text"
                  placeholder="Enter subject name..."
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {/* Max Score Input */}
            <div className="max-score-input">
              <label>Max Score:</label>
              <input
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                min="1"
                max="999"
              />
            </div>

            {/* Number Pad */}
            <div className="number-pad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  className="num-btn"
                  onClick={() => handleScoreInput(num.toString())}
                >
                  {num}
                </button>
              ))}
              <button className="num-btn clear" onClick={handleClear}>
                C
              </button>
              <button
                className="num-btn"
                onClick={() => handleScoreInput('0')}
              >
                0
              </button>
              <button className="num-btn back" onClick={handleBackspace}>
                ⌫
              </button>
            </div>

            {/* Add Button */}
            <button className="add-grade-btn" onClick={handleAddGrade}>
              ✓ Add Grade
            </button>
          </div>

          {/* Statistics & History Section */}
          <div className="history-section">
            {/* Average Display */}
            <div className="average-display">
              <div className="average-label">Overall Average</div>
              <div className="average-value" style={{ color: getGradeColor(stats.averagePercentage) }}>
                {stats.averagePercentage.toFixed(1)}%
              </div>
              <div className="average-grade">{getGradeLetter(stats.averagePercentage)}</div>
              <div className="average-count">{stats.totalGrades} entries</div>
            </div>

            {/* Recent Grades */}
            <div className="recent-grades">
              <h3>Recent Grades</h3>
              {grades.length === 0 ? (
                <div className="empty-grades">
                  <p>No grades yet</p>
                  <p className="empty-hint">Use the calculator to add your first grade!</p>
                </div>
              ) : (
                <div className="grades-list">
                  {Object.keys(gradesBySubject).map((subjectName) => {
                    const subjectGrades = gradesBySubject[subjectName];
                    const subjectAvg = subjectGrades.reduce((sum, g) => 
                      sum + calculatePercentage(g.score, g.max_score), 0
                    ) / subjectGrades.length;

                    return (
                      <div key={subjectName} className="subject-group">
                        <div className="subject-header">
                          <span className="subject-name">{subjectName}</span>
                          <span className="subject-avg" style={{ color: getGradeColor(subjectAvg) }}>
                            {subjectAvg.toFixed(1)}%
                          </span>
                        </div>
                        {subjectGrades.slice().reverse().map((grade) => {
                          const percentage = calculatePercentage(grade.score, grade.max_score);
                          return (
                            <div key={grade.id} className="grade-item">
                              <div className="grade-score-info">
                                <span className="grade-score">
                                  {grade.score}/{grade.max_score}
                                </span>
                                <span className="grade-percentage" style={{ color: getGradeColor(percentage) }}>
                                  {percentage.toFixed(1)}% ({getGradeLetter(percentage)})
                                </span>
                              </div>
                              <button
                                className="delete-btn-small"
                                onClick={() => handleDelete(grade.id)}
                                title="Delete"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .calculator-layout {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 20px;
          min-height: 600px;
        }

        .calculator-section {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
        }

        .calculator-display {
          background: #1e5a3a;
          border-radius: 12px;
          padding: 20px;
          color: white;
          margin-bottom: 20px;
          min-height: 120px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .display-subject {
          font-size: 14px;
          opacity: 0.95;
          margin-bottom: 8px;
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .display-score {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .display-percentage {
          font-size: 18px;
          font-weight: 700;
          color: white !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .calculator-error {
          background: #fee;
          color: #c00;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 15px;
          font-size: 13px;
        }

        .subject-buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 15px;
        }

        .subject-btn {
          padding: 12px;
          border: 2px solid #e5e7eb;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          transition: all 0.2s;
        }

        .subject-btn:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .subject-btn.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .subject-btn.custom {
          grid-column: span 3;
          background: #f9fafb;
        }

        .custom-subject-input {
          margin-bottom: 15px;
        }

        .custom-subject-input input {
          width: 100%;
          padding: 12px;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          font-size: 14px;
        }

        .custom-subject-input input:focus {
          outline: none;
          border-color: #2563eb;
        }

        .max-score-input {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .max-score-input label {
          font-weight: 600;
          color: #1f2937;
          font-size: 14px;
        }

        .max-score-input input {
          flex: 1;
          padding: 8px 12px;
          border: 2px solid #d1d5db;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          text-align: center;
        }

        .max-score-input input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .number-pad {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 15px;
        }

        .num-btn {
          padding: 20px;
          border: 2px solid #e5e7eb;
          background: white;
          border-radius: 12px;
          font-size: 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: #1f2937;
        }

        .num-btn:hover {
          background: #f9fafb;
          border-color: #3b82f6;
        }

        .num-btn:active {
          transform: scale(0.95);
        }

        .num-btn.clear {
          background: #fef3c7;
          color: #92400e;
          border-color: #fcd34d;
        }

        .num-btn.clear:hover {
          background: #fde68a;
        }

        .num-btn.back {
          background: #fee2e2;
          color: #991b1b;
          border-color: #fca5a5;
        }

        .num-btn.back:hover {
          background: #fecaca;
        }

        .add-grade-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-grade-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16,185,129,0.3);
        }

        .add-grade-btn:active {
          transform: translateY(0);
        }

        .history-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .average-display {
          background: #1e5a3a;
          color: white;
          padding: 30px;
          border-radius: 16px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .average-label {
          font-size: 14px;
          opacity: 0.95;
          margin-bottom: 8px;
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .average-value {
          font-size: 48px;
          font-weight: 700;
          margin: 10px 0;
          color: white !important;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .average-grade {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 8px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .average-count {
          font-size: 12px;
          opacity: 0.9;
          font-weight: 500;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .recent-grades {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          flex: 1;
          overflow-y: auto;
          max-height: 500px;
        }

        .recent-grades h3 {
          margin: 0 0 20px 0;
          color: #1f2937;
          font-size: 18px;
        }

        .empty-grades {
          text-align: center;
          padding: 40px 20px;
          color: #111827;
        }

        .empty-hint {
          font-size: 12px;
          margin-top: 8px;
          font-weight: 600;
        }

        .grades-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .subject-group {
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 15px;
          background: #f9fafb;
        }

        .subject-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e5e7eb;
        }

        .subject-name {
          font-weight: 700;
          color: #1f2937;
          font-size: 16px;
        }

        .subject-avg {
          font-weight: 700;
          font-size: 16px;
        }

        .grade-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: white;
          border-radius: 8px;
          margin-bottom: 8px;
          transition: all 0.2s;
        }

        .grade-item:hover {
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }

        .grade-score-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .grade-score {
          font-size: 14px;
          color: #6b7280;
          font-weight: 600;
        }

        .grade-percentage {
          font-size: 16px;
          font-weight: 700;
        }

        .delete-btn-small {
          background: none;
          border: none;
          color: #ef4444;
          font-size: 18px;
          cursor: pointer;
          opacity: 0.5;
          padding: 4px 8px;
          transition: opacity 0.2s;
        }

        .delete-btn-small:hover {
          opacity: 1;
        }

        .loading-state {
          padding: 40px;
          text-align: center;
          color: #111827;
          font-weight: 600;
        }

        @media (max-width: 968px) {
          .calculator-layout {
            grid-template-columns: 1fr;
          }

          .recent-grades {
            max-height: 400px;
          }
        }

        @media (max-width: 480px) {
          .calculator-section {
            padding: 16px;
          }

          .display-score {
            font-size: 24px;
          }

          .num-btn {
            padding: 16px;
            font-size: 18px;
          }

          .subject-buttons {
            grid-template-columns: repeat(2, 1fr);
          }

          .subject-btn.custom {
            grid-column: span 2;
          }
        }
      `}</style>
    </div>
  );
};

export default Grades;