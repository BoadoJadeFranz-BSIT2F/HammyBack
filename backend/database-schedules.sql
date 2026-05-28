-- Create schedules table for student timetables
CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  day VARCHAR(10) NOT NULL, -- Mon, Tue, Wed, Thu, Fri
  time VARCHAR(10) NOT NULL, -- 9:00, 10:00, etc.
  class_name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#ccefe1',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);

-- Sample data (optional)
-- INSERT INTO schedules (user_id, day, time, class_name, color) VALUES
-- ('user-uuid-here', 'Mon', '9:00', 'Calculus', '#ccefe1'),
-- ('user-uuid-here', 'Wed', '9:00', 'Calculus', '#ccefe1');
