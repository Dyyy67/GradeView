import { supabase } from '../supabase';
import { showToast } from '../components/toast';

export default async function renderTeacherDashboard(container, queryParams, profile) {
  if (!supabase) return;

  // Fetch teacher's classes
  const { data: classes, error } = await supabase
    .from('classes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Failed to load classes: ' + error.message, 'error');
  }

  let classesHtml = '';
  
  if (!classes || classes.length === 0) {
    classesHtml = `
      <div style="text-align: center; padding: 3rem 1rem; border: 1px dashed var(--border-color); border-radius: var(--border-radius-lg);">
        <p>No classes created yet. Get started by adding your first class section.</p>
        <a href="#teacher/classes" class="btn btn-primary" style="margin-top: 1rem;">Add Class Section</a>
      </div>
    `;
  } else {
    classesHtml = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
        ${classes.map(cls => `
          <div class="glass-card" style="display: flex; flex-direction: column; justify-content: space-between; min-height: 200px;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <span style="font-size: 0.8rem; text-transform: uppercase; font-weight: 700; color: var(--primary); letter-spacing: 0.05em;">
                  SY ${cls.school_year}
                </span>
                <span class="btn-danger" style="display:none;">Delete</span>
              </div>
              <h2 style="margin-bottom: 0.25rem;">Grade ${cls.grade_level}</h2>
              <p style="font-size: 1.1rem; color: var(--text-primary); font-weight: 500; margin-bottom: 1.5rem;">
                Section ${cls.section}
              </p>
            </div>
            
            <div style="display: flex; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
              <a href="#teacher/students?classId=${cls.id}" class="btn btn-secondary" style="flex: 1; font-size: 0.85rem; padding: 0.6rem 1rem;">
                Students & Codes
              </a>
              <a href="#teacher/upload?classId=${cls.id}" class="btn btn-primary" style="flex: 1; font-size: 0.85rem; padding: 0.6rem 1rem;">
                Upload Grades
              </a>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; flex-wrap: wrap; gap: 1rem;">
      <div>
        <h1 style="margin-bottom: 0.25rem;">Teacher Dashboard</h1>
        <p style="margin: 0;">Manage your class sections, student codes, and upload grades.</p>
      </div>
      <div style="display: flex; gap: 1rem;">
        <a href="#teacher/classes" class="btn btn-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 0.25rem;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Class Section
        </a>
      </div>
    </div>

    ${classesHtml}
  `;
}
