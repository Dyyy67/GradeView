import { supabase } from '../supabase';
import { showToast } from '../components/toast';

export default async function renderTeacherClasses(container, queryParams, profile) {
  if (!supabase) return;

  container.innerHTML = `
    <div style="max-width: 600px; margin: 2rem auto;">
      <div style="margin-bottom: 2rem;">
        <a href="#teacher/dashboard" style="color: var(--text-secondary); text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 500;">
          ← Back to Dashboard
        </a>
      </div>

      <div class="glass-card">
        <h2 style="margin-bottom: 0.5rem;">Create Class Section</h2>
        <p style="margin-bottom: 2rem;">Set up a new grade level, section, and school year for grade reports.</p>

        <form id="create-class-form">
          <div class="form-group">
            <label class="form-label" for="class-grade">Grade Level</label>
            <select id="class-grade" class="form-control" required>
              <option value="" disabled selected>Select Grade Level</option>
              ${Array.from({ length: 12 }, (_, i) => i + 1).map(g => `<option value="${g}">Grade ${g}</option>`).join('')}
              <option value="Kindergarten">Kindergarten</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="class-section">Section Name</label>
            <input type="text" id="class-section" class="form-control" placeholder="e.g. Einstein, Rizal, Diamond" required>
          </div>

          <div class="form-group">
            <label class="form-label" for="class-year">School Year</label>
            <select id="class-year" class="form-control" required>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027" selected>2026-2027</option>
              <option value="2027-2028">2027-2028</option>
            </select>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1.5rem;" id="submit-class-btn">
            Create Class Section
          </button>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('create-class-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const gradeLevel = document.getElementById('class-grade').value;
    const section = document.getElementById('class-section').value.trim();
    const schoolYear = document.getElementById('class-year').value;
    const submitBtn = document.getElementById('submit-class-btn');

    if (!gradeLevel || !section || !schoolYear) {
      showToast('All fields are required.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    try {
      const { data, error } = await supabase
        .from('classes')
        .insert({
          teacher_id: profile.id,
          grade_level: gradeLevel,
          section: section,
          school_year: schoolYear
        })
        .select();

      if (error) throw error;

      showToast('Class created successfully!', 'success');
      setTimeout(() => {
        window.location.hash = '#teacher/dashboard';
      }, 1000);
    } catch (err) {
      showToast('Error creating class: ' + err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Class Section';
    }
  });
}
