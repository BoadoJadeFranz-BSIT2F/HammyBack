const supabase = require('./config/supabase');

async function runMigration() {
  console.log('Running class schedules migration...');

  try {
    // Create class_schedules table
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS class_schedules (
          id BIGSERIAL PRIMARY KEY,
          class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
          day VARCHAR(10) NOT NULL,
          time VARCHAR(10) NOT NULL,
          duration_minutes INT DEFAULT 60,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(class_id, day, time)
        );
      `
    });

    if (createTableError && !createTableError.message?.includes('already exists')) {
      console.log('Note: class_schedules table may already exist or needs to be created manually in Supabase dashboard');
    } else {
      console.log('✓ class_schedules table created');
    }

    // Add columns to schedules table
    console.log('Adding columns to schedules table...');
    
    // These will be added via Supabase dashboard or direct SQL
    console.log('Please run these SQL commands in your Supabase SQL editor:');
    console.log(`
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS class_id BIGINT REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS is_class_schedule BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_class_schedules_class_id ON class_schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_class_id ON schedules(class_id);
    `);

    console.log('\nMigration setup complete!');
    console.log('Please execute the SQL commands in Supabase dashboard if needed.');
    
  } catch (error) {
    console.error('Migration error:', error);
  }
}

runMigration();
