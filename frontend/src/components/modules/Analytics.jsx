import React, { useState, useEffect } from 'react';
import { gradeAPI } from '../../services/api';
import './Module.css';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedView, setSelectedView] = useState('overview'); // overview, timeline, byType, byClass

  const getStatusConfig = (status) => {
    if (status === 'at_risk') return { label: 'At Risk', color: '#dc2626', bg: '#fef2f2' };
    if (status === 'watch') return { label: 'Watch', color: '#d97706', bg: '#fffbeb' };
    if (status === 'good') return { label: 'Good', color: '#059669', bg: '#ecfdf5' };
    return { label: 'No Data', color: '#6b7280', bg: '#f3f4f6' };
  };

  useEffect(() => {
    fetchAnalytics();
    fetchGrades();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await gradeAPI.getAnalytics();
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    try {
      const response = await gradeAPI.getMyGrades();
      setGrades(response.data);
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return '#10b981'; // Green
    if (percentage >= 80) return '#3b82f6'; // Blue
    if (percentage >= 70) return '#f59e0b'; // Orange
    if (percentage >= 60) return '#ef4444'; // Red
    return '#6b7280'; // Gray
  };

  const getGradeLetter = (percentage) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const renderChart = () => {
    if (!analytics || !analytics.timeline || analytics.timeline.length === 0) {
      return (
        <div className="no-data-chart">
          <p>No grade data available yet</p>
          <small>Add grades to see your performance graph</small>
        </div>
      );
    }

    const timeline = analytics.timeline;
    const maxPercentage = 100;
    const chartHeight = 300;

    return (
      <div className="chart-container">
        <div className="chart-header">
          <h3>Performance Over Time</h3>
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: '#3b82f6' }}></span>
              Grade Percentage
            </span>
          </div>
        </div>
        <div className="line-chart">
          <div className="chart-y-axis">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>
          <div className="chart-area">
            {/* Grid lines */}
            <div className="chart-grid">
              {[0, 25, 50, 75, 100].map((val) => (
                <div key={val} className="grid-line" style={{ bottom: `${val}%` }}></div>
              ))}
            </div>

            {/* Data points and line */}
            <svg width="100%" height={chartHeight} style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* Line connecting points */}
              <polyline
                points={timeline.map((point, idx) => {
                  const x = (idx / (timeline.length - 1)) * 100;
                  const y = chartHeight - (point.percentage / maxPercentage) * chartHeight;
                  return `${x}%,${y}`;
                }).join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
              />

              {/* Data points */}
              {timeline.map((point, idx) => {
                const x = (idx / (timeline.length - 1)) * 100;
                const y = chartHeight - (point.percentage / maxPercentage) * chartHeight;
                return (
                  <g key={idx}>
                    <circle
                      cx={`${x}%`}
                      cy={y}
                      r="6"
                      fill={getGradeColor(point.percentage)}
                      stroke="white"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            </svg>

            {/* X-axis labels */}
            <div className="chart-x-axis">
              {timeline.map((point, idx) => {
                if (timeline.length > 10 && idx % Math.ceil(timeline.length / 10) !== 0) return null;
                const date = new Date(point.date);
                return (
                  <span key={idx} style={{ left: `${(idx / (timeline.length - 1)) * 100}%` }}>
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Data points list */}
        <div className="chart-data-points">
          <h4>Recent Grades</h4>
          <div className="data-points-list">
            {timeline.slice(-5).reverse().map((point, idx) => {
              const date = new Date(point.date);
              return (
                <div key={idx} className="data-point-item">
                  <div className="data-point-info">
                    <div 
                      className="data-point-indicator"
                      style={{ backgroundColor: getGradeColor(point.percentage) }}
                    ></div>
                    <div>
                      <div className="data-point-title">{point.title}</div>
                      <div className="data-point-meta">
                        {point.className} • {date.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="data-point-score">
                    <span className="score-percentage" style={{ color: getGradeColor(point.percentage) }}>
                      {point.percentage.toFixed(1)}%
                    </span>
                    <span className="score-letter">{getGradeLetter(point.percentage)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderByTypeView = () => {
    if (!analytics || !analytics.byType || Object.keys(analytics.byType).length === 0) {
      return <div className="no-data">No grade data by type available</div>;
    }

    return (
      <div className="by-type-view">
        <h3>Performance by Assessment Type</h3>
        <div className="type-cards">
          {Object.entries(analytics.byType).map(([type, data]) => (
            <div key={type} className="type-card">
              <div className="type-header">
                <h4>{type.charAt(0).toUpperCase() + type.slice(1)}</h4>
                <span className="type-count">{data.grades.length} entries</span>
              </div>
              <div className="type-average">
                <div className="average-circle" style={{ borderColor: getGradeColor(data.average) }}>
                  <span className="average-percentage">{data.average.toFixed(1)}%</span>
                  <span className="average-letter">{getGradeLetter(data.average)}</span>
                </div>
              </div>
              <div className="type-progress">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${data.average}%`,
                    backgroundColor: getGradeColor(data.average)
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderByClassView = () => {
    const classItems = analytics?.classMetrics || [];

    if (!analytics || classItems.length === 0) {
      return <div className="no-data">No grade data by class available</div>;
    }

    const sortedClasses = [...classItems].sort((a, b) => {
      if (a.status === 'at_risk' && b.status !== 'at_risk') return -1;
      if (a.status !== 'at_risk' && b.status === 'at_risk') return 1;
      return b.average - a.average;
    });

    return (
      <div className="by-class-view">
        <h3>Performance Monitoring by Class</h3>
        <div className="class-list">
          {sortedClasses.map((data) => {
            const status = getStatusConfig(data.status);
            return (
            <div key={data.classId || data.className} className="class-card">
              <div className="class-info">
                <h4>{data.className}</h4>
                <p>{data.section}</p>
                <span className="class-count">{data.grades.length} grades recorded</span>
                <div style={{ marginTop: '8px' }}>
                  <span
                    style={{
                      background: status.bg,
                      color: status.color,
                      borderRadius: '999px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    {status.label}
                  </span>
                </div>
              </div>
              <div className="class-average">
                <div 
                  className="average-bar"
                  style={{ 
                    width: `${data.average}%`,
                    backgroundColor: getGradeColor(data.average)
                  }}
                >
                  <span className="bar-label">{data.average.toFixed(1)}%</span>
                </div>
                <span className="grade-letter">{getGradeLetter(data.average)}</span>
              </div>
              <div style={{ minWidth: '180px', textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Trend</div>
                <div style={{ fontWeight: 700, color: data.trend >= 0 ? '#059669' : '#dc2626' }}>
                  {data.trend >= 0 ? '+' : ''}{data.trend.toFixed(1)}%
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>Consistency (Std Dev)</div>
                <div style={{ fontWeight: 700, color: '#1f2937' }}>{data.consistency.toFixed(1)}</div>
              </div>
            </div>
          );})}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="module-container">
        <div className="module-header">
          <h1>📈 Analytics</h1>
        </div>
        <div className="module-content">
          <div className="loading-state">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <h1>📈 Analytics</h1>
        <p className="module-description">View your performance insights and statistics</p>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="module-content">
        {/* Statistics Cards */}
        {analytics && (
          <div className="analytics-stats">
            <div className="stat-card overall">
              <div className="stat-icon">🎯</div>
              <div className="stat-info">
                <div className="stat-label">Overall Average</div>
                <div className="stat-value" style={{ color: getGradeColor(analytics.averageScore) }}>
                  {analytics.averageScore.toFixed(1)}%
                </div>
                <div className="stat-meta">{getGradeLetter(analytics.averageScore)}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📝</div>
              <div className="stat-info">
                <div className="stat-label">Total Grades</div>
                <div className="stat-value">{analytics.totalEntries}</div>
                <div className="stat-meta">entries recorded</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📚</div>
              <div className="stat-info">
                <div className="stat-label">Classes</div>
                <div className="stat-value">{Object.keys(analytics.byClass || {}).length}</div>
                <div className="stat-meta">with grades</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🎓</div>
              <div className="stat-info">
                <div className="stat-label">Task Scores</div>
                <div className="stat-value">{analytics.taskScores?.length || 0}</div>
                <div className="stat-meta">from teachers</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🚨</div>
              <div className="stat-info">
                <div className="stat-label">At Risk Classes</div>
                <div className="stat-value" style={{ color: '#dc2626' }}>
                  {analytics.monitoring?.atRiskCount || 0}
                </div>
                <div className="stat-meta">need immediate attention</div>
              </div>
            </div>
          </div>
        )}

        {analytics?.insights && (
          <div style={{ marginBottom: '20px', background: '#1e5a3a', borderRadius: '12px', padding: '16px 18px' }}>
            <div style={{ fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>Quick Insights</div>
            <div style={{ fontSize: '14px', color: '#e8f5e9', lineHeight: 1.6 }}>
              Strongest Class: <strong style={{ color: '#ffffff' }}>{analytics.insights.strongestClass || 'N/A'}</strong>
              {' | '}
              Improving: <strong style={{ color: '#ffffff' }}>{(analytics.insights.improvingClasses || []).join(', ') || 'None yet'}</strong>
              {' | '}
              At Risk: <strong style={{ color: '#ffffff' }}>{(analytics.insights.atRiskClasses || []).join(', ') || 'None'}</strong>
            </div>
          </div>
        )}

        {/* View Selector */}
        <div className="view-selector">
          <button
            className={`view-btn ${selectedView === 'overview' ? 'active' : ''}`}
            onClick={() => setSelectedView('overview')}
          >
            📊 Timeline
          </button>
          <button
            className={`view-btn ${selectedView === 'byType' ? 'active' : ''}`}
            onClick={() => setSelectedView('byType')}
          >
            📋 By Type
          </button>
          <button
            className={`view-btn ${selectedView === 'byClass' ? 'active' : ''}`}
            onClick={() => setSelectedView('byClass')}
          >
            📚 By Class
          </button>
        </div>

        {/* Main View */}
        <div className="analytics-main-view">
          {selectedView === 'overview' && renderChart()}
          {selectedView === 'byType' && renderByTypeView()}
          {selectedView === 'byClass' && renderByClassView()}
        </div>
      </div>

      <style jsx>{`
        .analytics-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .stat-card.overall {
          border: 2px solid #3b82f6;
        }

        .stat-icon {
          font-size: 32px;
        }

        .stat-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
          margin-top: 4px;
        }

        .stat-meta {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 2px;
        }

        .view-selector {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .view-btn {
          padding: 10px 20px;
          border: 2px solid #e5e7eb;
          background: white;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: #1e5a3a;
        }

        .view-btn:hover {
          border-color: #1e5a3a;
          color: #1e5a3a;
        }

        .view-btn.active {
          background: #1e5a3a;
          border-color: #1e5a3a;
          color: white;
        }

        .analytics-main-view {
          background: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .chart-container {
          width: 100%;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .chart-header h3 {
          margin: 0;
          font-size: 20px;
          color: #1f2937;
        }

        .chart-legend {
          display: flex;
          gap: 15px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #6b7280;
        }

        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .line-chart {
          position: relative;
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
        }

        .chart-y-axis {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 10px 0;
          font-size: 12px;
          color: #6b7280;
          height: 300px;
        }

        .chart-area {
          flex: 1;
          height: 300px;
          position: relative;
          background: #f9fafb;
          border-radius: 8px;
          padding: 10px;
        }

        .chart-grid {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          bottom: 30px;
          pointer-events: none;
        }

        .grid-line {
          position: absolute;
          left: 0;
          right: 0;
          border-top: 1px dashed #d1d5db;
        }

        .chart-x-axis {
          position: absolute;
          bottom: 0;
          left: 10px;
          right: 10px;
          height: 30px;
          display: flex;
          justify-content: space-between;
        }

        .chart-x-axis span {
          font-size: 11px;
          color: #6b7280;
          position: absolute;
          transform: translateX(-50%);
        }

        .chart-data-points {
          margin-top: 30px;
        }

        .chart-data-points h4 {
          margin: 0 0 15px 0;
          font-size: 16px;
          color: #1f2937;
        }

        .data-points-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .data-point-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .data-point-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .data-point-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .data-point-title {
          font-weight: 600;
          color: #1f2937;
          font-size: 14px;
        }

        .data-point-meta {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
        }

        .data-point-score {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .score-percentage {
          font-size: 18px;
          font-weight: 700;
        }

        .score-letter {
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          background: #e5e7eb;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .type-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .type-card {
          background: #f9fafb;
          border-radius: 12px;
          padding: 20px;
        }

        .type-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .type-header h4 {
          margin: 0;
          font-size: 16px;
          color: #1f2937;
        }

        .type-count {
          font-size: 12px;
          color: #6b7280;
        }

        .type-average {
          display: flex;
          justify-content: center;
          margin: 20px 0;
        }

        .average-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 4px solid;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .average-percentage {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
        }

        .average-letter {
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
        }

        .type-progress {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 15px;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .class-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-top: 20px;
        }

        .class-card {
          background: #f9fafb;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .class-info h4 {
          margin: 0 0 5px 0;
          font-size: 18px;
          color: #1f2937;
        }

        .class-info p {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #6b7280;
        }

        .class-count {
          font-size: 12px;
          color: #9ca3af;
        }

        .class-average {
          display: flex;
          align-items: center;
          gap: 15px;
          min-width: 300px;
        }

        .average-bar {
          flex: 1;
          height: 30px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 10px;
          min-width: 60px;
        }

        .bar-label {
          font-size: 14px;
          font-weight: 600;
          color: white;
        }

        .grade-letter {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
          min-width: 30px;
          text-align: center;
        }

        .no-data, .no-data-chart {
          text-align: center;
          padding: 60px 20px;
          color: #111827;
        }

        .no-data-chart p {
          font-size: 18px;
          margin: 0 0 10px 0;
          font-weight: 700;
        }

        .no-data-chart small {
          font-size: 14px;
          font-weight: 600;
        }

        .loading-state, .error-message {
          padding: 40px;
          text-align: center;
          color: #111827;
          font-weight: 600;
        }

        .error-message {
          background: #fee;
          color: #c00;
          border-radius: 8px;
          margin: 20px;
        }

        @media (max-width: 768px) {
          .analytics-stats {
            grid-template-columns: 1fr;
          }

          .type-cards {
            grid-template-columns: 1fr;
          }

          .class-card {
            flex-direction: column;
            align-items: flex-start;
          }

          .class-average {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default Analytics;