import { createClient } from '@supabase/supabase-js';

// Get configuration from Vite environment variables or localStorage fallback
let rawUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('gradeview_supabase_url') || '';
let rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('gradeview_supabase_anon_key') || '';

// Clean the URL (remove trailing slashes, spaces, and any '/rest/v1/' appended by accident)
let cleanUrl = rawUrl.trim();
if (cleanUrl.endsWith('/')) {
  cleanUrl = cleanUrl.slice(0, -1);
}
if (cleanUrl.endsWith('/rest/v1')) {
  cleanUrl = cleanUrl.replace('/rest/v1', '');
}
if (cleanUrl.endsWith('/rest/v1/')) {
  cleanUrl = cleanUrl.replace('/rest/v1/', '');
}

const supabaseUrl = cleanUrl;
const supabaseAnonKey = rawKey.trim();

export const isSupabaseConfigured = () => {
  return supabaseUrl && supabaseAnonKey;
};

export const getSupabaseConfig = () => {
  return { url: supabaseUrl, key: supabaseAnonKey };
};

export const saveSupabaseConfig = (url, key) => {
  // Clean before saving
  let savedUrl = url.trim();
  if (savedUrl.endsWith('/')) savedUrl = savedUrl.slice(0, -1);
  if (savedUrl.endsWith('/rest/v1')) savedUrl = savedUrl.replace('/rest/v1', '');
  if (savedUrl.endsWith('/rest/v1/')) savedUrl = savedUrl.replace('/rest/v1/', '');

  localStorage.setItem('gradeview_supabase_url', savedUrl);
  localStorage.setItem('gradeview_supabase_anon_key', key.trim());
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('gradeview_supabase_url');
  localStorage.removeItem('gradeview_supabase_anon_key');
};

export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
