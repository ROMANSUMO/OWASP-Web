const { createClient } = require('@supabase/supabase-js');

// Validate required environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL is not defined in environment variables');
  process.exit(1);
}

if (!supabaseAnonKey) {
  console.error('❌ SUPABASE_ANON_KEY is not defined in environment variables');
  process.exit(1);
}

// Create Supabase client with anon key (for client operations)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // Backend doesn't need to persist sessions
    detectSessionInUrl: false
  }
});

// Create admin client with service role key (for admin operations)
let supabaseAdmin = null;
if (supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} else {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not defined - admin operations will not be available');
}

// Helper function to verify JWT token
const verifySupabaseToken = async (token) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('Token verification error:', error.message);
      return { success: false, error: error.message };
    }
    
    if (!user) {
      return { success: false, error: 'Invalid token' };
    }
    
    return { success: true, user };
  } catch (error) {
    console.error('Token verification exception:', error);
    return { success: false, error: 'Token verification failed' };
  }
};

// Helper function to get user profile from profiles table
const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Get user profile error:', error.message);
      return { success: false, error: error.message };
    }
    
    return { success: true, profile: data };
  } catch (error) {
    console.error('Get user profile exception:', error);
    return { success: false, error: 'Failed to get user profile' };
  }
};

// Helper function to create or update user profile
const upsertUserProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Upsert user profile error:', error.message);
      return { success: false, error: error.message };
    }
    
    return { success: true, profile: data };
  } catch (error) {
    console.error('Upsert user profile exception:', error);
    return { success: false, error: 'Failed to update user profile' };
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  verifySupabaseToken,
  getUserProfile,
  upsertUserProfile
};