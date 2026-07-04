import { supabase } from './supabase';

export const authService = {
  async getSession() {
    if (!supabase) return null;
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  async getCurrentProfile() {
    if (!supabase) return null;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return null;

    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (dbError) throw dbError;
    return profile;
  },

  async signIn(email, password) {
    if (!supabase) throw new Error('Supabase client is not configured.');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async signUp(email, password, fullName, role) {
    if (!supabase) throw new Error('Supabase client is not configured.');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Parents: Link to a student using a unique code
  async linkStudentByCode(parentProfileId, accessCode) {
    if (!supabase) throw new Error('Supabase is not configured.');
    
    const { data, error } = await supabase.rpc('link_student_with_code', {
      access_code_input: accessCode.trim().toUpperCase()
    });

    if (error) {
      throw new Error(error.message || 'Invalid Student Access Code. Please check and try again.');
    }

    return data;
  },

  // Get all linked students for a parent
  async getLinkedStudents() {
    if (!supabase) {
      console.log('getLinkedStudents: Supabase client is not configured.');
      return [];
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('getLinkedStudents: Current user:', user, 'User Error:', userError);
    if (!user) return [];

    const { data, error } = await supabase
      .from('parent_students')
      .select(`
        id,
        parent_id,
        student_id,
        student:students (
          id,
          full_name,
          class:classes (
            id,
            grade_level,
            section,
            school_year
          )
        )
      `);

    console.log('getLinkedStudents: parent_students raw data:', data);
    console.log('getLinkedStudents: parent_students error:', error);

    if (error) throw error;
    if (!data) return [];
    
    const mapped = data
      .map(item => {
        console.log('getLinkedStudents: mapping item:', item);
        return item.student;
      })
      .filter(student => student !== null && student !== undefined);
      
    console.log('getLinkedStudents: filtered mapped students:', mapped);
    return mapped;
  }
};
