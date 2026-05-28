const supabase = require('./config/supabase');
const fs = require('fs');
const path = require('path');

async function migrateFileComments() {
  try {
    console.log('Starting file_comments table migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'database-file-comments.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL - note: Supabase JS client doesn't directly support raw SQL
    // You need to execute this in the Supabase SQL editor instead
    console.log('\n=== SQL to execute in Supabase SQL Editor ===\n');
    console.log(sql);
    console.log('\n=== End of SQL ===\n');
    
    console.log('Please copy the SQL above and execute it in your Supabase SQL Editor:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Click on "SQL Editor" in the sidebar');
    console.log('3. Paste the SQL above and run it');
    console.log('\nAlternatively, you can disable RLS on file_comments table after creation if you encounter permission issues.');
    
  } catch (error) {
    console.error('Error reading migration file:', error);
  }
}

migrateFileComments();
