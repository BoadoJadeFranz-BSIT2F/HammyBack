import React, { useState, useEffect, useRef } from 'react';
import { IoMoonOutline, IoSunnyOutline, IoEyeOutline, IoVolumeHigh, IoKeypadOutline } from 'react-icons/io5';
import { useTheme } from '../context/ThemeContext';
import './AccessibilityPanel.css';

const AccessibilityPanel = () => {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [magnifierEnabled, setMagnifierEnabled] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [magnifierScale, setMagnifierScale] = useState(2);
  const lastSpokenRef = useRef(null);
  const lastSpokenTimeRef = useRef(0);
  const [magnifierText, setMagnifierText] = useState('');
  const [textToSpeechEnabled, setTextToSpeechEnabled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [capsLock, setCapsLock] = useState(false);
  const [shift, setShift] = useState(false);
  const [keyboardEnabled, setKeyboardEnabled] = useState(() => sessionStorage.getItem('accessibility_keyboard_enabled') === 'true');
  const SHIFT_SYMBOLS = {
    '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
    '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
    '-': '_', '=': '+', '[': '{', ']': '}', '\\': '|',
    ';': ':', "'": '"', ',': '<', '.': '>', '/': '?', '`': '~'
  };
  const CHARACTER_KEYS = ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'];
  const ttsLastTextRef = useRef('');
  const ttsLastTimeRef = useRef(0);
  const ttsTimerRef = useRef(null);

  useEffect(() => {
    // Add event listeners to all input and textarea elements. Do NOT auto-show keyboard; track focus only.
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea');
    
    const handleInputFocus = (e) => {
      setFocusedInput(e.target);
      // do not auto-show keyboard; visibility follows keyboardEnabled
      if (keyboardEnabled) setShowKeyboard(true);
    };

    const handleInputBlur = () => {
      setTimeout(() => {
        setFocusedInput(null);
      }, 30);
    };

    inputs.forEach(input => {
      input.addEventListener('focus', handleInputFocus);
      input.addEventListener('blur', handleInputBlur);
    });

    // Also listen for new inputs that are added dynamically
    const observer = new MutationObserver(() => {
      const newInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea');
      newInputs.forEach(input => {
        input.addEventListener('focus', handleInputFocus);
        input.addEventListener('blur', handleInputBlur);
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      inputs.forEach(input => {
        input.removeEventListener('focus', handleInputFocus);
        input.removeEventListener('blur', handleInputBlur);
      });
      observer.disconnect();
    };
  }, [keyboardEnabled]);

  // Magnifier mouse tracking
  useEffect(() => {
    if (!magnifierEnabled) return;

    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) {
        setMagnifierText('');
        return;
      }
      // prefer input value for form elements
      let text = '';
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) {
        text = el.value || el.innerText || el.textContent || '';
      } else {
        text = el.innerText || el.textContent || '';
      }
      text = (text || '').trim();
      if (text.length > 200) text = text.slice(0, 200) + '...';
      setMagnifierText(text);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [magnifierEnabled]);

  const handleMagnify = () => {
    setMagnifierEnabled(!magnifierEnabled);
  };

  const decreaseMagnifier = () => setMagnifierScale(s => Math.max(1.2, +(s - 0.2).toFixed(2)));
  const increaseMagnifier = () => setMagnifierScale(s => Math.min(4, +(s + 0.2).toFixed(2)));

  const handleTextToSpeech = () => {
    // Toggle cursor-following TTS
    setTextToSpeechEnabled(enabled => {
      if (enabled) {
        if ('speechSynthesis' in window) speechSynthesis.cancel();
      }
      return !enabled;
    });
  };

  // TTS: speak element under cursor when enabled, throttled
  useEffect(() => {
    if (!textToSpeechEnabled) return;

    const speakText = (rawText, force = false) => {
      if (!('speechSynthesis' in window)) return;
      const text = (rawText || '').replace(/\s+/g, ' ').trim();
      if (!text) return;
      const now = Date.now();
      if (!force && text === ttsLastTextRef.current && now - ttsLastTimeRef.current < 800) {
        return;
      }
      ttsLastTextRef.current = text;
      ttsLastTimeRef.current = now;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    };

    const handleMove = (e) => {
      const now = Date.now();
      if (now - lastSpokenTimeRef.current < 700) return; // throttle
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;
      if (el === lastSpokenRef.current) return;
      lastSpokenRef.current = el;
      lastSpokenTimeRef.current = now;
      let text = el.innerText || el.textContent || '';
      text = text.trim();
      if (text.length > 3 && 'speechSynthesis' in window) {
        speakText(text);
      }
    };

    const handleInputChange = (e) => {
      const target = e.target;
      if (!target || !(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const value = target.value != null ? target.value : (target.innerText || target.textContent || '');
      const label = getFieldLabel(target);
      const fieldFunction = getFieldFunction(target);
      const announce = label ? `${label}. ${fieldFunction} Current value: ${value}` : `${fieldFunction} Current value: ${value}`;
      clearTimeout(ttsTimerRef.current);
      ttsTimerRef.current = setTimeout(() => speakText(announce), 250);
    };

    const handleFocusRead = (e) => {
      const target = e.target;
      if (!target || !(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const value = target.value != null ? target.value : (target.innerText || target.textContent || '');
      const label = getFieldLabel(target);
      const fieldFunction = getFieldFunction(target);
      const announce = label ? `${label}. ${fieldFunction} ${value ? `Current value: ${value}` : 'Empty field.'}` : `${fieldFunction} ${value || 'Empty field.'}`;
      speakText(announce, true);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('input', handleInputChange, true);
    document.addEventListener('change', handleInputChange, true);
    document.addEventListener('focusin', handleFocusRead, true);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('input', handleInputChange, true);
      document.removeEventListener('change', handleInputChange, true);
      document.removeEventListener('focusin', handleFocusRead, true);
      clearTimeout(ttsTimerRef.current);
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      lastSpokenRef.current = null;
    };
  }, [textToSpeechEnabled]);

  const handleKeyboard = () => {
    const next = !keyboardEnabled;
    setKeyboardEnabled(next);
    sessionStorage.setItem('accessibility_keyboard_enabled', next ? 'true' : 'false');
    setShowKeyboard(next);
  };

  const getFocusableElements = () => {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    return Array.from(document.querySelectorAll(selector)).filter(el => !el.closest('.onscreen-keyboard'));
  };

  const focusRelativeElement = (direction = 1) => {
    const focusables = getFocusableElements();
    const currentIndex = focusables.indexOf(document.activeElement);
    const nextIndex = currentIndex === -1 ? (direction > 0 ? 0 : focusables.length - 1) : currentIndex + direction;
    const target = focusables[nextIndex];
    if (target && typeof target.focus === 'function') target.focus();
  };

  const getFieldLabel = (target) => {
    if (!target) return '';
    return (
      target.getAttribute('aria-label') ||
      target.getAttribute('placeholder') ||
      target.name ||
      target.id ||
      target.closest('label')?.innerText ||
      target.getAttribute('type') ||
      ''
    ).trim();
  };

  const getFieldFunction = (target) => {
    if (!target) return '';
    const type = (target.getAttribute('type') || '').toLowerCase();
    const label = getFieldLabel(target).toLowerCase();

    if (type === 'email' || label.includes('email')) return 'Used for entering an email address.';
    if (type === 'password' || label.includes('password')) return 'Used for entering a password.';
    if (type === 'search' || label.includes('search')) return 'Used for searching content.';
    if (type === 'tel' || label.includes('phone') || label.includes('telephone')) return 'Used for entering a phone number.';
    if (type === 'url' || label.includes('website') || label.includes('url')) return 'Used for entering a web address.';
    if (type === 'number' || label.includes('quantity') || label.includes('amount') || label.includes('number')) return 'Used for entering numbers only.';
    if (type === 'date' || label.includes('date')) return 'Used for selecting a date.';
    if (type === 'time' || label.includes('time')) return 'Used for selecting a time.';
    if (type === 'file' || label.includes('upload') || label.includes('file')) return 'Used for uploading a file.';
    if (target.tagName === 'TEXTAREA' || label.includes('message') || label.includes('comment') || label.includes('description') || label.includes('bio')) return 'Used for entering longer text.';
    return 'Used for typing text.';
  };

  const insertText = (text) => {
    const element = focusedInput || document.activeElement;
    if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
      const startPos = element.selectionStart;
      const endPos = element.selectionEnd;

      // handle backspace
      if (text === '\b') {
        if (startPos > 0) {
          element.value =
            element.value.substring(0, startPos - 1) +
            element.value.substring(endPos);
          element.selectionStart = element.selectionEnd = startPos - 1;
        }
      } else {
        // apply caps/shift like a physical keyboard
        let out = text;
        if (text.length === 1 && /[a-zA-Z]/.test(text)) {
          const shouldUppercase = shift ? !capsLock : capsLock;
          out = shouldUppercase ? text.toUpperCase() : text.toLowerCase();
        } else if (shift && SHIFT_SYMBOLS[text]) {
          out = SHIFT_SYMBOLS[text];
        }

        element.value =
          element.value.substring(0, startPos) +
          out +
          element.value.substring(endPos);
        element.selectionStart = element.selectionEnd = startPos + out.length;
      }

      // shift is momentary: release after one printable key
      if (shift && text !== 'Shift') setShift(false);

      element.focus();
      // Trigger input event for form validation
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const handleSpecialKey = (key) => {
    const el = focusedInput || document.activeElement;
    if (!el || !(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    switch (key) {
      case 'Enter':
        if (el.tagName === 'TEXTAREA') {
          insertText('\n');
        } else if (el.form && typeof el.form.requestSubmit === 'function') {
          el.form.requestSubmit();
        } else if (el.form) {
          const submitButton = el.form.querySelector('button[type="submit"], input[type="submit"]');
          if (submitButton) submitButton.click();
        }
        break;
      case 'Tab':
        focusRelativeElement(shift ? -1 : 1);
        break;
      case 'Delete':
        if (start != null) {
          if (start === end && start < el.value.length) {
            el.value = el.value.substring(0, start) + el.value.substring(end + 1);
            el.selectionStart = el.selectionEnd = start;
          } else {
            el.value = el.value.substring(0, start) + el.value.substring(end);
            el.selectionStart = el.selectionEnd = start;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        break;
      case 'ArrowLeft':
        if (start != null) el.selectionStart = el.selectionEnd = Math.max(0, start - 1);
        break;
      case 'ArrowRight':
        if (end != null) el.selectionStart = el.selectionEnd = Math.min(el.value.length, end + 1);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        break;
      case 'Home':
        el.selectionStart = el.selectionEnd = 0;
        break;
      case 'End':
        el.selectionStart = el.selectionEnd = el.value.length;
        break;
      default:
        break;
    }
    el.focus();
  };

  // Key repeat management
  const repeatRef = useRef({});

  const simulateKeyEvents = (key, type = 'char') => {
    const el = focusedInput || document.activeElement;
    if (!el) return;
    const eventInit = {
      key: key,
      code: key,
      bubbles: true,
      cancelable: true,
      composed: true,
      shiftKey: shift,
      ctrlKey: false,
      altKey: false,
    };

    try {
      el.dispatchEvent(new KeyboardEvent('keydown', eventInit));
    } catch (e) {}

    if (type === 'char') {
      insertText(key);
    } else if (type === 'special') {
      handleSpecialKey(key);
    }

    try {
      el.dispatchEvent(new KeyboardEvent('keyup', eventInit));
    } catch (e) {}
  };

  const startKeyPress = (id, key, type = 'char', options = {}) => {
    // perform immediately
    if (type === 'modifier') {
      if (key === 'Shift') setShift(true);
      return;
    }
    simulateKeyEvents(key, type);

    // start repeat after initial delay
    const timeout = setTimeout(() => {
      const interval = setInterval(() => simulateKeyEvents(key, type), 80);
      repeatRef.current[id] = { timeout: null, interval };
    }, 400);
    repeatRef.current[id] = { timeout, interval: null };
  };

  const stopKeyPress = (id, key, type = 'char') => {
    const entry = repeatRef.current[id];
    if (entry) {
      if (entry.timeout) clearTimeout(entry.timeout);
      if (entry.interval) clearInterval(entry.interval);
      delete repeatRef.current[id];
    }
    if (type === 'modifier') {
      if (key === 'Shift') setShift(false);
    }
  };

  return (
    <div className="accessibility-panel">
      <button
        className="accessibility-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Accessibility Panel"
      >
        Accessibility
      </button>

      {isExpanded && (
        <div className="accessibility-menu">
          <div className="accessibility-title">Accessibility</div>

          {/* Theme Toggle */}
          <button
            className="accessibility-btn"
            onClick={toggleDarkMode}
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {isDarkMode ? (
              <>
                <IoSunnyOutline /> Light
              </>
            ) : (
              <>
                <IoMoonOutline /> Dark
              </>
            )}
          </button>

          {/* Screen Magnifier */}
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <button
              className={`accessibility-btn ${magnifierEnabled ? 'active' : ''}`}
              onClick={handleMagnify}
              title="Magnifier - Hover over text to magnify"
            >
              <IoEyeOutline /> {magnifierEnabled ? 'Magnifier ON' : 'Magnifier OFF'}
            </button>
            {magnifierEnabled && (
              <div style={{display: 'flex', gap: 6}}>
                <button className="accessibility-btn-small" onClick={decreaseMagnifier} title="Decrease magnifier">−</button>
                <div style={{alignSelf: 'center', fontSize: 13, color: '#6b7280'}}>x{magnifierScale}</div>
                <button className="accessibility-btn-small" onClick={increaseMagnifier} title="Increase magnifier">+</button>
              </div>
            )}
          </div>

          {/* Text to Speech */}
          <button
            className={`accessibility-btn ${textToSpeechEnabled ? 'active' : ''}`}
            onClick={handleTextToSpeech}
            title="Text to Speech (Experimental)"
          >
            <IoVolumeHigh /> {textToSpeechEnabled ? 'Stop' : 'Speak'}
          </button>

          {/* Onscreen Keyboard */}
          <button
            className={`accessibility-btn ${showKeyboard ? 'active' : ''}`}
            onClick={handleKeyboard}
            title="Onscreen Keyboard - Click on a text field to auto-show"
          >
            <IoKeypadOutline /> {showKeyboard ? 'Hide Keyboard' : 'Show Keyboard'}
          </button>

          {showKeyboard && (
            <div className="onscreen-keyboard" onMouseDown={(e) => e.preventDefault()}>
              <div className="keyboard-row">
                {['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='].map(key => (
                  <button
                    key={key}
                    className="key"
                    onMouseDown={(e) => { e.preventDefault(); startKeyPress(`k_${key}`, key, 'char'); }}
                    onMouseUp={(e) => { e.preventDefault(); stopKeyPress(`k_${key}`, key, 'char'); }}
                    onMouseLeave={(e) => { stopKeyPress(`k_${key}`, key, 'char'); }}
                    onClick={(e) => e.preventDefault()}
                  >
                    {key}
                  </button>
                ))}
                <button 
                  className="key backspace" 
                  onMouseDown={(e) => { e.preventDefault(); startKeyPress('backspace','\b','char'); }}
                  onMouseUp={(e) => { e.preventDefault(); stopKeyPress('backspace','\b','char'); }}
                  onMouseLeave={(e) => { stopKeyPress('backspace','\b','char'); }}
                  onClick={(e) => e.preventDefault()}
                >
                  ⌫
                </button>
              </div>

              <div className="keyboard-row">
                <button className="key tab" onMouseDown={(e) => { e.preventDefault(); startKeyPress('tab','Tab','special'); }} onMouseUp={(e)=>{e.preventDefault(); stopKeyPress('tab','Tab','special');}} onMouseLeave={(e)=>stopKeyPress('tab','Tab','special')}>Tab</button>
                {['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'].map(key => (
                  <button
                    key={key}
                    className="key"
                    onMouseDown={(e) => { e.preventDefault(); startKeyPress(`k_${key}`, key, 'char'); }}
                    onMouseUp={(e) => { e.preventDefault(); stopKeyPress(`k_${key}`, key, 'char'); }}
                    onMouseLeave={(e) => { stopKeyPress(`k_${key}`, key, 'char'); }}
                    onClick={(e) => e.preventDefault()}
                  >
                    {key}
                  </button>
                ))}
              </div>

              <div className="keyboard-row">
                <button
                  className={`key caps ${capsLock ? 'active' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); setCapsLock(!capsLock); }}
                  onMouseUp={(e) => e.preventDefault()}
                  onClick={(e) => e.preventDefault()}
                >
                  Caps
                </button>
                {['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"].map(key => (
                  <button
                    key={key}
                    className="key"
                    onMouseDown={(e) => { e.preventDefault(); startKeyPress(`k_${key}`, key, 'char'); }}
                    onMouseUp={(e) => { e.preventDefault(); stopKeyPress(`k_${key}`, key, 'char'); }}
                    onMouseLeave={(e) => { stopKeyPress(`k_${key}`, key, 'char'); }}
                    onClick={(e) => e.preventDefault()}
                  >
                    {key}
                  </button>
                ))}
                <button className="key enter" onMouseDown={(e) => { e.preventDefault(); startKeyPress('enter','Enter','special'); }} onMouseUp={(e)=>{e.preventDefault(); stopKeyPress('enter','Enter','special');}} onMouseLeave={(e)=>stopKeyPress('enter','Enter','special')}>Enter</button>
              </div>

              <div className="keyboard-row">
                <button
                  className={`key shift ${shift ? 'active' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); startKeyPress('shift','Shift','modifier'); }}
                  onMouseUp={(e) => { e.preventDefault(); stopKeyPress('shift','Shift','modifier'); }}
                  onMouseLeave={(e) => { stopKeyPress('shift','Shift','modifier'); }}
                  onClick={(e) => e.preventDefault()}
                >
                  Shift
                </button>
                {['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'].map(key => (
                  <button
                    key={key}
                    className="key"
                    onMouseDown={(e) => { e.preventDefault(); startKeyPress(`k_${key}`, key, 'char'); }}
                    onMouseUp={(e) => { e.preventDefault(); stopKeyPress(`k_${key}`, key, 'char'); }}
                    onMouseLeave={(e) => { stopKeyPress(`k_${key}`, key, 'char'); }}
                    onClick={(e) => e.preventDefault()}
                  >
                    {key}
                  </button>
                ))}
                <button 
                  className="key space" 
                  onMouseDown={(e) => { e.preventDefault(); startKeyPress('space',' ','char'); }}
                  onMouseUp={(e) => { e.preventDefault(); stopKeyPress('space',' ','char'); }}
                  onMouseLeave={(e) => { stopKeyPress('space',' ','char'); }}
                  onClick={(e) => e.preventDefault()}
                >
                  Space
                </button>
              </div>
            </div>
          )}

          {showKeyboard && !focusedInput && (
            <div className="keyboard-empty">
              <p>Click on a text field to start typing</p>
            </div>
          )}
        </div>
      )}
      {/* Magnifier Circle */}
      {magnifierEnabled && (
        <div
          className="magnifier-circle"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
            opacity: 0.98,
          }}
        >
          <div
            className="magnifier-content"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${1})`,
            }}
          >
            <div className="magnified-text" style={{transform: `scale(${magnifierScale})`, transformOrigin: 'center', pointerEvents: 'none'}}>
              {magnifierText || <span style={{color: '#9ca3af', fontSize: 12}}>No text</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessibilityPanel;
