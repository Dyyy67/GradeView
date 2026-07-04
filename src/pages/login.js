import { authService } from '../auth';
import { showToast } from '../components/toast';

export default async function renderLogin(container) {
  let activeRole = 'parent'; // default tab
  let isSignUpMode = false;

  const renderForm = () => {
    container.innerHTML = `
      <div class="auth-grid">
        <!-- Logo Header -->
        <div style="text-align: center; margin-bottom: 2rem;">
          <h1 style="background: linear-gradient(135deg, #4361ee, #f72585); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0.25rem;">GradeView</h1>
          <p style="font-size: 0.95rem;">Secure Student Grade Portal</p>
        </div>

        <div class="glass-card">
          <!-- Role Selector Tabs -->
          <div class="tabs" style="width: 100%; margin-bottom: 1.5rem;">
            <button class="tab-btn ${activeRole === 'parent' ? 'active' : ''}" id="tab-parent" style="flex: 1;">Parent Portal</button>
            <button class="tab-btn ${activeRole === 'teacher' ? 'active' : ''}" id="tab-teacher" style="flex: 1;">Teacher Portal</button>
          </div>

          <h3 id="form-title" style="margin-bottom: 1.5rem; text-align: center;">
            ${isSignUpMode ? `Register ${activeRole === 'teacher' ? 'Teacher' : 'Parent'} Account` : `Sign In`}
          </h3>

          <form id="auth-form">
            ${isSignUpMode ? `
              <div class="form-group">
                <label class="form-label" for="auth-name">Full Name</label>
                <input type="text" id="auth-name" class="form-control" placeholder="Enter your full name" required>
              </div>
            ` : ''}

            <div class="form-group">
              <label class="form-label" for="auth-email">Email Address</label>
              <input type="email" id="auth-email" class="form-control" placeholder="name@school.com" required>
            </div>

            <div class="form-group">
              <label class="form-label" for="auth-password">Password</label>
              <input type="password" id="auth-password" class="form-control" placeholder="••••••••" required>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;" id="submit-btn">
              ${isSignUpMode ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <!-- Toggle Sign In / Sign Up -->
          <div style="margin-top: 1.5rem; text-align: center; font-size: 0.9rem;">
            <span style="color: var(--text-secondary);">
              ${isSignUpMode ? 'Already have an account?' : "Don't have an account?"}
            </span>
            <a href="#" id="toggle-mode-link" style="color: var(--primary); text-decoration: none; font-weight: 600; margin-left: 0.25rem;">
              ${isSignUpMode ? 'Sign In' : 'Sign Up'}
            </a>
          </div>
        </div>

        <div style="text-align: center; margin-top: 2rem;">
          <a href="#setup" style="color: var(--text-muted); font-size: 0.8rem; text-decoration: none;">Database Settings</a>
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById('tab-parent').addEventListener('click', () => {
      activeRole = 'parent';
      renderForm();
    });

    document.getElementById('tab-teacher').addEventListener('click', () => {
      activeRole = 'teacher';
      renderForm();
    });

    document.getElementById('toggle-mode-link').addEventListener('click', (e) => {
      e.preventDefault();
      isSignUpMode = !isSignUpMode;
      renderForm();
    });

    const form = document.getElementById('auth-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      const submitBtn = document.getElementById('submit-btn');

      submitBtn.disabled = true;
      submitBtn.textContent = isSignUpMode ? 'Registering...' : 'Signing in...';

      try {
        if (isSignUpMode) {
          const fullName = document.getElementById('auth-name').value.trim();
          await authService.signUp(email, password, fullName, activeRole);
          showToast('Registration successful! Please sign in.', 'success');
          isSignUpMode = false;
          renderForm();
        } else {
          await authService.signIn(email, password);
          showToast('Welcome back!', 'success');
          
          // Wait a moment for database trigger profiles sync
          setTimeout(() => {
            window.location.hash = activeRole === 'teacher' ? '#teacher/dashboard' : '#parent/dashboard';
          }, 800);
        }
      } catch (err) {
        showToast(err.message || 'Authentication failed', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
      }
    });
  };

  renderForm();
}
