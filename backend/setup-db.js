const supabase = require('./config/supabase');

async function setupDatabase() {
  console.log('Setting up database tables...');

  // Create users table
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'student',
        major TEXT,
        academic_year TEXT,
        target_gpa TEXT,
        department TEXT,
        subjects TEXT,
        auth_provider TEXT DEFAULT 'email',
        profile_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
  });

  if (error) {
    console.error('Error creating table:', error);
    console.log('\nPlease run this SQL in your Supabase SQL Editor:');
    console.log(`
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'student',
  major TEXT,
  academic_year TEXT,
  target_gpa TEXT,
  department TEXT,
  subjects TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
    `);
  } else {
    console.log('✅ Users table created successfully!');
  }
}

setupDatabase();
