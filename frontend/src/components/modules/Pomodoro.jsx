import React, { useState, useEffect, useRef } from 'react';
import './Module.css';

const Pomodoro = () => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(1500); // 25 minutes default
  const [timeLeft, setTimeLeft] = useState(1500);
  const [isRunning, setIsRunning] = useState(false);
  const [carrots, setCarrots] = useState([]);
  const intervalRef = useRef(null);
  const lastIntervalRef = useRef(Math.floor(1500 / 10)); // Track 10-second intervals

  // Calculate progress percentage
  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;

  // Convert time left to display format
  const displayHours = Math.floor(timeLeft / 3600);
  const displayMinutes = Math.floor((timeLeft % 3600) / 60);
  const displaySeconds = timeLeft % 60;

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          
          // Check if 10 seconds have passed
          const currentInterval = Math.floor(newTime / 10);
          const lastInterval = lastIntervalRef.current;
          
          if (currentInterval < lastInterval && newTime > 0) {
            // Add a carrot every 10 seconds!
            const carrotId = Date.now();
            setCarrots(prevCarrots => [...prevCarrots, carrotId]);
            
            // Remove carrot after animation (2 seconds)
            setTimeout(() => {
              setCarrots(prevCarrots => prevCarrots.filter(id => id !== carrotId));
            }, 2000);
            
            lastIntervalRef.current = currentInterval;
          }
          
          if (newTime <= 0) {
            setIsRunning(false);
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const handleStart = () => {
    if (timeLeft === totalSeconds) {
      // Starting fresh, set up 10-second interval tracking
      lastIntervalRef.current = Math.floor(totalSeconds / 10);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(totalSeconds);
    setCarrots([]);
    lastIntervalRef.current = Math.floor(totalSeconds / 10);
  };

  const handleSetTime = () => {
    const newTotal = (hours * 3600) + (minutes * 60) + seconds;
    if (newTotal > 0) {
      setTotalSeconds(newTotal);
      setTimeLeft(newTotal);
      setIsRunning(false);
      setCarrots([]);
      lastIntervalRef.current = Math.floor(newTotal / 10);
    }
  };

  // Calculate circle properties
  const radius = 160;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="module-container">
      <div className="module-header">
        <h1>🍅 Pomodoro Timer</h1>
        <p className="module-description">Focus timer with a hungry hamster</p>
      </div>
      <div className="module-content">
        <div className="pomodoro-container">
          {/* Time Input Section */}
          <div className="time-input-section">
            <h3>Set Timer</h3>
            <div className="time-inputs">
              <div className="time-input-group">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                  disabled={isRunning}
                />
                <label>Hours</label>
              </div>
              <span className="time-separator">:</span>
              <div className="time-input-group">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  disabled={isRunning}
                />
                <label>Minutes</label>
              </div>
              <span className="time-separator">:</span>
              <div className="time-input-group">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  disabled={isRunning}
                />
                <label>Seconds</label>
              </div>
            </div>
            <button 
              className="set-time-btn" 
              onClick={handleSetTime}
              disabled={isRunning}
            >
              Set Time
            </button>
          </div>

          {/* Circular Timer */}
          <div className="circular-timer">
            <svg className="timer-svg" viewBox="0 0 400 400">
              {/* Background circle */}
              <circle
                cx="200"
                cy="200"
                r={radius}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="20"
              />
              {/* Progress circle */}
              <circle
                cx="200"
                cy="200"
                r={radius}
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="20"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 200 200)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
              {/* Gradient definition */}
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>

            {/* Hamster and Timer Display */}
            <div className="timer-center">
              {/* Carrots Animation */}
              {carrots.map((carrotId, index) => (
                <div key={carrotId} className="carrot-float" style={{ animationDelay: `${index * 0.1}s` }}>
                  🥕
                </div>
              ))}

              {/* Hamster */}
              <div className="hamster">
                🐹
              </div>

              {/* Time Display */}
              <div className="time-display">
                <span className="time-number">
                  {String(displayHours).padStart(2, '0')}
                </span>
                <span className="time-colon">:</span>
                <span className="time-number">
                  {String(displayMinutes).padStart(2, '0')}
                </span>
                <span className="time-colon">:</span>
                <span className="time-number">
                  {String(displaySeconds).padStart(2, '0')}
                </span>
              </div>

              {/* Time progress indicator */}
              {totalSeconds > 0 && (
                <div className="minutes-completed">
                  {Math.floor((totalSeconds - timeLeft) / 10)} carrots earned
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="timer-controls">
            {!isRunning ? (
              <button className="control-btn start-btn" onClick={handleStart} disabled={timeLeft === 0}>
                ▶ Start
              </button>
            ) : (
              <button className="control-btn pause-btn" onClick={handlePause}>
                ⏸ Pause
              </button>
            )}
            <button className="control-btn reset-btn" onClick={handleReset}>
              ↻ Reset
            </button>
          </div>

          {/* Info */}
          <div className="timer-info">
            <p>🥕 The hamster eats a carrot every 10 seconds you focus!</p>
            <p className="timer-tip">Set your study time and watch your hamster get fed as you progress.</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .pomodoro-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }

        .time-input-section {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 30px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .time-input-section h3 {
          margin: 0 0 20px 0;
          color: #1f2937;
          text-align: center;
        }

        .time-inputs {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .time-input-group {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .time-input-group input {
          width: 70px;
          height: 60px;
          font-size: 24px;
          font-weight: 700;
          text-align: center;
          border: 3px solid #e5e7eb;
          border-radius: 12px;
          color: #1f2937;
          transition: all 0.2s;
        }

        .time-input-group input:focus {
          outline: none;
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
        }

        .time-input-group input:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .time-input-group label {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 600;
          margin-top: 6px;
        }

        .time-separator {
          font-size: 32px;
          font-weight: 700;
          color: #9ca3af;
          margin: 0 4px;
          padding-bottom: 20px;
        }

        .set-time-btn {
          width: 100%;
          padding: 12px;
          background: #14532d;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
        }

        .set-time-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(20, 83, 45, 0.4);
        }

        .set-time-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .circular-timer {
          position: relative;
          width: 400px;
          height: 400px;
          margin: 0 auto 30px;
        }

        .timer-svg {
          width: 100%;
          height: 100%;
        }

        .timer-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .hamster {
          font-size: 80px;
          margin-bottom: 10px;
          animation: bounce 2s infinite;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .carrot-float {
          position: absolute;
          font-size: 32px;
          animation: eatCarrot 2s ease-out forwards;
          pointer-events: none;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
        }

        @keyframes eatCarrot {
          0% {
            opacity: 0;
            transform: translate(-50%, -50px) scale(0.5) rotate(-45deg);
          }
          30% {
            opacity: 1;
            transform: translate(-50%, -10px) scale(1.2) rotate(0deg);
          }
          60% {
            opacity: 1;
            transform: translate(-50%, 0px) scale(1) rotate(5deg);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, 10px) scale(0.3) rotate(45deg);
          }
        }

        .time-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          margin-top: 10px;
        }

        .time-number {
          font-size: 36px;
          font-weight: 700;
          color: #1e5a3a;
        }

        .time-colon {
          font-size: 36px;
          font-weight: 700;
          color: #2d7a4f;
        }

        .minutes-completed {
          margin-top: 8px;
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;
        }

        .timer-controls {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-bottom: 30px;
        }

        .control-btn {
          padding: 16px 40px;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          min-width: 140px;
        }

        .start-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .start-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .start-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pause-btn {
          background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
          color: white;
        }

        .pause-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
        }

        .reset-btn {
          background: white;
          color: #6b7280;
          border: 3px solid #e5e7eb;
        }

        .reset-btn:hover {
          border-color: #9ca3af;
          color: #374151;
        }

        .timer-info {
          text-align: center;
          padding: 8px;
          background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
          border-radius: 12px;
          border: 2px solid #fcd34d;
        }

        .timer-info p {
          margin: 8px 0;
          color: #92400e;
          font-weight: 600;
        }

        .timer-tip {
          font-size: 14px;
          font-weight: 500 !important;
        }

        @media (max-width: 768px) {
          .circular-timer {
            width: 320px;
            height: 320px;
          }

          .hamster {
            font-size: 60px;
          }

          .time-number {
            font-size: 28px;
          }

          .time-colon {
            font-size: 28px;
          }

          .time-input-group input {
            width: 60px;
            height: 50px;
            font-size: 20px;
          }

          .control-btn {
            padding: 12px 24px;
            font-size: 16px;
            min-width: 100px;
          }
        }

        @media (max-width: 480px) {
          .time-inputs {
            gap: 4px;
          }

          .time-input-group input {
            width: 50px;
            height: 45px;
            font-size: 18px;
          }

          .time-separator {
            font-size: 24px;
          }

          .circular-timer {
            width: 280px;
            height: 280px;
          }

          .timer-controls {
            flex-direction: column;
          }

          .control-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default Pomodoro;