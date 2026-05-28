const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
	throw new Error('SUPABASE_URL is not set in environment');
}

// Export two clients: `supabase` for regular/anon usage, and `supabaseAdmin` for server-side operations if service role key is provided.
const supabase = createClient(supabaseUrl, supabaseAnonKey || '');

let supabaseAdmin = supabase;
if (supabaseServiceRole) {
	supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);
}

module.exports = { supabase, supabaseAdmin };
