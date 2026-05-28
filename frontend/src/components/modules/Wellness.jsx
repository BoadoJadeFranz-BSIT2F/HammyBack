import React, { useState, useEffect } from 'react';
import { wellnessAPI } from '../../services/api';
import './Module.css';

const Wellness = () => {
  const [journalEntry, setJournalEntry] = useState('');
  const [mood, setMood] = useState('');
  const [entries, setEntries] = useState([]);
  const [activeTab, setActiveTab] = useState('journal'); // 'journal', 'tips', 'history'
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const moods = [
    { emoji: '😊', label: 'Great', color: '#10b981' },
    { emoji: '🙂', label: 'Good', color: '#3b82f6' },
    { emoji: '😐', label: 'Okay', color: '#f59e0b' },
    { emoji: '😟', label: 'Stressed', color: '#ef4444' },
    { emoji: '😢', label: 'Overwhelmed', color: '#8b5cf6' }
  ];

  const stressTips = [
    {
      icon: '🧘',
      title: 'Take Deep Breaths',
      description: 'When you feel overwhelmed, pause and take 5 deep breaths. Breathe in for 4 counts, hold for 4, exhale for 4. Your mind and body will thank you.',
      category: 'stress'
    },
    {
      icon: '🚶',
      title: 'Take Short Breaks',
      description: 'Step away from your desk every hour. A 5-minute walk or stretch can reset your mind and improve your focus when you return.',
      category: 'stress'
    },
    {
      icon: '💬',
      title: 'Talk to Someone',
      description: 'You don\'t have to face challenges alone. Reach out to a friend, family member, or counselor. Sharing your feelings can lighten the load.',
      category: 'stress'
    },
    {
      icon: '🎵',
      title: 'Listen to Calming Music',
      description: 'Create a peaceful study playlist. Music can reduce stress hormones and help you feel more relaxed while working.',
      category: 'stress'
    },
    {
      icon: '😴',
      title: 'Prioritize Sleep',
      description: 'Your brain needs rest to function well. Aim for 7-9 hours of sleep. It\'s not wasted time—it\'s an investment in your performance.',
      category: 'stress'
    },
    {
      icon: '🌅',
      title: 'Start with Small Wins',
      description: 'Feeling overwhelmed? Choose one tiny task and complete it. That sense of accomplishment can motivate you to tackle bigger challenges.',
      category: 'stress'
    }
  ];

  const timeTips = [
    {
      icon: '📝',
      title: 'Brain Dump Everything',
      description: 'Write down every single task, big or small. Getting it out of your head and onto paper helps you see the full picture and reduces mental clutter.',
      category: 'time'
    },
    {
      icon: '🎯',
      title: 'Pick Your Top 3',
      description: 'With heavy workload, you can\'t do everything at once. Choose 3 most important tasks for today. Completing these will give you real progress.',
      category: 'time'
    },
    {
      icon: '⏰',
      title: 'Use Time Blocking',
      description: 'Assign specific time slots to tasks. For example: 9-11am for studying, 11-12pm for assignments. This prevents one task from eating up your entire day.',
      category: 'time'
    },
    {
      icon: '🍅',
      title: 'Try the Pomodoro Technique',
      description: 'Work in focused 25-minute chunks with 5-minute breaks. This makes big tasks feel manageable and helps you stay fresh.',
      category: 'time'
    },
    {
      icon: '❌',
      title: 'Learn to Say No',
      description: 'It\'s okay to decline extra commitments when you\'re overwhelmed. Protecting your time isn\'t selfish—it\'s necessary for your wellbeing.',
      category: 'time'
    },
    {
      icon: '🔄',
      title: 'Batch Similar Tasks',
      description: 'Group similar activities together (all readings, all practice problems). Switching between different types of work drains energy.',
      category: 'time'
    },
    {
      icon: '📅',
      title: 'Plan Your Week Ahead',
      description: 'Spend 15 minutes each Sunday planning your week. Knowing what\'s coming helps you feel prepared rather than reactive.',
      category: 'time'
    },
    {
      icon: '💪',
      title: 'Accept "Good Enough"',
      description: 'Perfectionism steals time. Sometimes 80% effort on more tasks beats 100% on just one. Do your best, then move forward.',
      category: 'time'
    }
  ];

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const response = await wellnessAPI.getEntries();
        setEntries(response.data.entries || []);
      } catch (error) {
        console.error('Failed to load wellness entries:', error);
        setEntries([]);
      }
    };

    loadEntries();
  }, []);

  const saveEntry = async () => {
    if (!journalEntry.trim()) return;

    try {
      const response = await wellnessAPI.createEntry({
        mood,
        content: journalEntry
      });

      const newEntry = response.data.entry;
      setEntries((prev) => [newEntry, ...prev]);
    } catch (error) {
      console.error('Failed to save wellness entry:', error);
      return;
    }

    // Clear form and show success
    setJournalEntry('');
    setMood('');
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const deleteEntry = async (id) => {
    if (!window.confirm('Delete this journal entry?')) return;
    try {
      await wellnessAPI.deleteEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error('Failed to delete wellness entry:', error);
    }
  };

  const getMoodData = (moodLabel) => {
    return moods.find(m => m.label === moodLabel);
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <h1>💚 Wellness Space</h1>
        <p className="module-description">Your safe space for reflection and self-care</p>
      </div>

      <div className="module-content">
        <div className="wellness-container">
          {/* Welcome Message */}
          <div className="wellness-welcome">
            <h2>Hey there 👋</h2>
            <p>
              Remember: Your academic journey isn't just about grades and deadlines. 
              Your mental health matters just as much as your achievements. 
              Take a moment to check in with yourself—you deserve it.
            </p>
          </div>

          {/* Tabs */}
          <div className="wellness-tabs">
            <button 
              className={`wellness-tab ${activeTab === 'journal' ? 'active' : ''}`}
              onClick={() => setActiveTab('journal')}
            >
              📔 Journal
            </button>
            <button 
              className={`wellness-tab ${activeTab === 'tips' ? 'active' : ''}`}
              onClick={() => setActiveTab('tips')}
            >
              💡 Tips & Advice
            </button>
            <button 
              className={`wellness-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              📖 My Entries ({entries.length})
            </button>
          </div>

          {/* Journal Tab */}
          {activeTab === 'journal' && (
            <div className="wellness-section">
              {showSuccessMessage && (
                <div className="success-banner">
                  ✨ Journal entry saved! Thank you for taking time to reflect.
                </div>
              )}

              <div className="journal-section">
                <h3>How are you feeling today?</h3>
                <p className="section-hint">Choose your current mood—there's no right or wrong answer.</p>
                
                <div className="mood-selector">
                  {moods.map((m) => (
                    <button
                      key={m.label}
                      className={`mood-button ${mood === m.label ? 'selected' : ''}`}
                      onClick={() => setMood(m.label)}
                      style={{ borderColor: mood === m.label ? m.color : '#e5e7eb' }}
                    >
                      <span className="mood-emoji">{m.emoji}</span>
                      <span className="mood-label">{m.label}</span>
                    </button>
                  ))}
                </div>

                <h3 style={{ marginTop: '32px' }}>What's on your mind?</h3>
                <p className="section-hint">
                  Write freely about your day, your challenges, your wins—whatever feels right. 
                  This is your private space.
                </p>

                <textarea
                  className="journal-textarea"
                  value={journalEntry}
                  onChange={(e) => setJournalEntry(e.target.value)}
                  placeholder="Dear journal...&#10;&#10;Today was..."
                  rows="10"
                />

                <button 
                  className="save-journal-btn"
                  onClick={saveEntry}
                  disabled={!journalEntry.trim()}
                >
                  💚 Save Entry
                </button>
              </div>
            </div>
          )}

          {/* Tips Tab */}
          {activeTab === 'tips' && (
            <div className="wellness-section">
              <div className="tips-intro">
                <p>
                  Feeling stressed or overwhelmed? You're not alone. Here are some gentle strategies 
                  that might help you navigate tough times. Pick one that resonates with you today.
                </p>
              </div>

              <h3 className="tips-heading">🌸 Managing Stress</h3>
              <div className="tips-grid">
                {stressTips.map((tip, index) => (
                  <div key={index} className="tip-card stress-tip">
                    <div className="tip-icon">{tip.icon}</div>
                    <h4>{tip.title}</h4>
                    <p>{tip.description}</p>
                  </div>
                ))}
              </div>

              <h3 className="tips-heading" style={{ marginTop: '40px' }}>⚡ Managing Heavy Workloads</h3>
              <div className="tips-grid">
                {timeTips.map((tip, index) => (
                  <div key={index} className="tip-card time-tip">
                    <div className="tip-icon">{tip.icon}</div>
                    <h4>{tip.title}</h4>
                    <p>{tip.description}</p>
                  </div>
                ))}
              </div>

              <div className="encouragement-box">
                <p>
                  💙 <strong>Remember:</strong> Progress isn't always linear. Some days will feel harder than others, 
                  and that's completely normal. Be patient with yourself. You're doing better than you think.
                </p>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="wellness-section">
              {entries.length === 0 ? (
                <div className="empty-history">
                  <div className="empty-icon">📖</div>
                  <h3>Your journal is waiting</h3>
                  <p>Start your first entry in the Journal tab. Looking back at your journey can be powerful.</p>
                  <button 
                    className="start-journal-btn"
                    onClick={() => setActiveTab('journal')}
                  >
                    Write First Entry
                  </button>
                </div>
              ) : (
                <div className="journal-history">
                  <div className="history-intro">
                    <p>
                      These are snapshots of your journey. Notice how far you've come, 
                      even through the challenging days. 💫
                    </p>
                  </div>

                  <div className="entries-list">
                    {entries.map((entry) => {
                      const moodData = getMoodData(entry.mood);
                      return (
                        <div key={entry.id} className="history-entry">
                          <div className="entry-header">
                            <div className="entry-date-mood">
                              <span className="entry-date">{entry.timestamp}</span>
                              {moodData && (
                                <span className="entry-mood" style={{ color: moodData.color }}>
                                  {moodData.emoji} {moodData.label}
                                </span>
                              )}
                            </div>
                            <button 
                              className="delete-entry-btn"
                              onClick={() => deleteEntry(entry.id)}
                              title="Delete entry"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="entry-content">
                            {entry.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .wellness-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
        }

        .wellness-welcome {
          background: #1e5a3a;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
          border: 2px solid #14532d;
        }

        .wellness-welcome h2 {
          margin: 0 0 12px 0;
          color: #ffffff;
          font-size: 28px;
        }

        .wellness-welcome p {
          margin: 0;
          color: #e8f5e9;
          line-height: 1.7;
          font-size: 16px;
        }

        .wellness-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 30px;
          border-bottom: 2px solid #e5e7eb;
        }

        .wellness-tab {
          padding: 12px 24px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          color: #6b7280;
          transition: all 0.2s;
        }

        .wellness-tab:hover {
          color: #3b82f6;
        }

        .wellness-tab.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .wellness-section {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .success-banner {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          color: #065f46;
          padding: 16px 20px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-weight: 600;
          text-align: center;
          border: 2px solid #6ee7b7;
        }

        .journal-section {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }

        .journal-section h3 {
          margin: 0 0 8px 0;
          color: #1f2937;
          font-size: 20px;
        }

        .section-hint {
          margin: 0 0 20px 0;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.6;
        }

        .mood-selector {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .mood-button {
          flex: 1;
          min-width: 120px;
          padding: 16px;
          background: white;
          border: 3px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .mood-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .mood-button.selected {
          background: #f0f9ff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .mood-emoji {
          font-size: 36px;
        }

        .mood-label {
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }

        .journal-textarea {
          width: 100%;
          padding: 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 15px;
          font-family: inherit;
          line-height: 1.7;
          resize: vertical;
          transition: all 0.2s;
        }

        .journal-textarea:focus {
          outline: none;
          border-color: #93c5fd;
          box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.2);
        }

        .save-journal-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 20px;
        }

        .save-journal-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
        }

        .save-journal-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tips-intro {
          background: #fef3c7;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 30px;
          border: 2px solid #fde68a;
        }

        .tips-intro p {
          margin: 0;
          color: #78350f;
          line-height: 1.6;
        }

        .tips-heading {
          margin: 0 0 20px 0;
          color: #1f2937;
          font-size: 22px;
        }

        .tips-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .tip-card {
          background: white;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          border-left: 4px solid;
          transition: all 0.2s;
        }

        .tip-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }

        .stress-tip {
          border-left-color: #f87171;
        }

        .time-tip {
          border-left-color: #60a5fa;
        }

        .tip-icon {
          font-size: 36px;
          margin-bottom: 12px;
        }

        .tip-card h4 {
          margin: 0 0 12px 0;
          color: #1f2937;
          font-size: 18px;
        }

        .tip-card p {
          margin: 0;
          color: #4b5563;
          line-height: 1.6;
          font-size: 14px;
        }

        .encouragement-box {
          background: linear-gradient(135deg, #fae8ff 0%, #e9d5ff 100%);
          padding: 24px;
          border-radius: 12px;
          border: 2px solid #d8b4fe;
        }

        .encouragement-box p {
          margin: 0;
          color: #581c87;
          line-height: 1.7;
          font-size: 15px;
        }

        .empty-history {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        .empty-history h3 {
          margin: 0 0 12px 0;
          color: #1f2937;
          font-size: 24px;
        }

        .empty-history p {
          margin: 0 0 24px 0;
          color: #6b7280;
          line-height: 1.6;
        }

        .start-journal-btn {
          padding: 14px 32px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .start-journal-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .journal-history {
          animation: fadeIn 0.3s ease;
        }

        .history-intro {
          background: #f0fdf4;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 30px;
          border: 2px solid #bbf7d0;
        }

        .history-intro p {
          margin: 0;
          color: #14532d;
          line-height: 1.6;
        }

        .entries-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .history-entry {
          background: white;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          border: 2px solid #f3f4f6;
          transition: all 0.2s;
        }

        .history-entry:hover {
          border-color: #e5e7eb;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .entry-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f3f4f6;
        }

        .entry-date-mood {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .entry-date {
          font-size: 13px;
          color: #6b7280;
          font-weight: 600;
        }

        .entry-mood {
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .delete-entry-btn {
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          transition: color 0.2s;
        }

        .delete-entry-btn:hover {
          color: #ef4444;
        }

        .entry-content {
          color: #374151;
          line-height: 1.7;
          white-space: pre-wrap;
          font-size: 15px;
        }



        @media (max-width: 768px) {
          .wellness-welcome {
            padding: 24px;
          }

          .wellness-tabs {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .wellness-tab {
            white-space: nowrap;
            padding: 10px 16px;
            font-size: 14px;
          }

          .journal-section {
            padding: 20px;
          }

          .mood-selector {
            gap: 8px;
          }

          .mood-button {
            min-width: 80px;
            padding: 12px;
          }

          .mood-emoji {
            font-size: 28px;
          }

          .mood-label {
            font-size: 12px;
          }

          .tips-grid {
            grid-template-columns: 1fr;
          }

          .history-entry {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default Wellness;