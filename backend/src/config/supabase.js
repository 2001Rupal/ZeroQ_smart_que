const { createClient } = require('@supabase/supabase-js');
const config = require('./environment');

let supabaseAdmin = null;

function initSupabase() {
  const { url, serviceRoleKey } = config.supabase;

  if (url && serviceRoleKey && !url.includes('your-project')) {
    try {
      supabaseAdmin = createClient(url, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      console.log('⚡ Supabase Admin Client initialized successfully with URL:', url);
    } catch (err) {
      console.error('❌ Failed to initialize Supabase client:', err.message);
    }
  } else {
    console.log('ℹ️ Supabase credentials not set in .env. Running in local fallback mode until credentials are provided.');
  }

  return supabaseAdmin;
}

function getSupabase() {
  if (!supabaseAdmin) {
    return initSupabase();
  }
  return supabaseAdmin;
}

module.exports = {
  initSupabase,
  getSupabase
};
