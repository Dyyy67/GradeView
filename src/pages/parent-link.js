import { authService } from '../auth';
import { showToast } from '../components/toast';

export default async function renderParentLink(container, queryParams, profile) {
  container.innerHTML = `
    <div style="max-width: 500px; margin: 4rem auto;">
      <div class="glass-card">
        <h2 style="text-align: center; margin-bottom: 0.5rem;">Link Student Account</h2>
        <p style="text-align: center; font-size: 0.9rem; margin-bottom: 2rem;">
          Enter the unique 8-character access code provided by your child's teacher to link accounts.
        </p>

        <form id="link-student-form">
          <div class="form-group">
            <label class="form-label" for="access-code">Unique Parent Code</label>
            <input 
              type="text" 
              id="access-code" 
              class="form-control" 
              placeholder="e.g. AB42CD88" 
              style="text-align: center; font-size: 1.25rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;"
              maxlength="8"
              required
            >
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1.5rem;" id="link-btn">
            Link Child
          </button>
        </form>

        <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color); font-size: 0.85rem; color: var(--text-secondary); text-align: center;">
          Need a code? Please ask your child's class teacher for their unique GradeView access code.
        </div>
      </div>
    </div>
  `;

  const form = document.getElementById('link-student-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('access-code').value.trim().toUpperCase();
    const linkBtn = document.getElementById('link-btn');

    if (code.length !== 8) {
      showToast('The code must be exactly 8 characters long.', 'error');
      return;
    }

    linkBtn.disabled = true;
    linkBtn.textContent = 'Linking...';

    try {
      const student = await authService.linkStudentByCode(profile.id, code);
      showToast(`Successfully linked to ${student.full_name}!`, 'success');
      setTimeout(() => {
        window.location.hash = '#parent/dashboard';
      }, 1500);
    } catch (err) {
      showToast(err.message || 'Link failed', 'error');
      linkBtn.disabled = false;
      linkBtn.textContent = 'Link Child';
    }
  });
}
