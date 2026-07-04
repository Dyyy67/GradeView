import { isSupabaseConfigured, getSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig } from '../supabase';
import { showToast } from '../components/toast';

export default async function renderSetup(container) {
  const config = getSupabaseConfig();
  const isConfigured = isSupabaseConfigured();

  container.innerHTML = `
    <div class="auth-grid">
      <div class="glass-card">
        <h2 style="text-align: center; margin-bottom: 0.5rem;">Database Connection</h2>
        <p style="text-align: center; font-size: 0.9rem; margin-bottom: 2rem;">
          Connect your secure GradeView application to your free Supabase instance.
        </p>

        <form id="setup-form">
          <div class="form-group">
            <label class="form-label" for="supabase-url">Supabase Project URL</label>
            <input 
              type="url" 
              id="supabase-url" 
              class="form-control" 
              placeholder="https://your-project-id.supabase.co" 
              value="${config.url || ''}" 
              required
            >
          </div>

          <div class="form-group">
            <label class="form-label" for="supabase-key">Supabase API Anon Key</label>
            <input 
              type="password" 
              id="supabase-key" 
              class="form-control" 
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
              value="${config.key || ''}" 
              required
            >
          </div>

          <div style="display: flex; gap: 1rem; margin-top: 2rem;">
            <button type="submit" class="btn btn-primary" style="flex: 1;">
              Save & Connect
            </button>
            ${isConfigured ? `
              <button type="button" id="clear-config-btn" class="btn btn-secondary">
                Disconnect
              </button>
            ` : ''}
          </div>
        </form>

        <div style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem; font-size: 0.85rem; color: var(--text-secondary);">
          <h4 style="color: var(--text-primary); margin-bottom: 0.5rem;">How to get these keys?</h4>
          <ol style="padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.25rem;">
            <li>Sign up for a free account at <a href="https://supabase.com" target="_blank" style="color: var(--primary);">supabase.com</a></li>
            <li>Create a new project named <strong>GradeView</strong>.</li>
            <li>Go to <strong>Project Settings -> API</strong> in your Supabase dashboard.</li>
            <li>Copy the <strong>Project URL</strong> and <strong>anon public API key</strong> and paste them here.</li>
            <li>Initialize the tables by running the SQL schema script inside the Supabase SQL Editor.</li>
          </ol>
        </div>
      </div>
    </div>
  `;

  const form = document.getElementById('setup-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = document.getElementById('supabase-url').value.trim();
    const key = document.getElementById('supabase-key').value.trim();

    if (!url || !key) {
      showToast('Please fill in both fields.', 'error');
      return;
    }

    try {
      saveSupabaseConfig(url, key);
      showToast('Database configuration updated! Restarting app...', 'success');
      setTimeout(() => {
        window.location.hash = '#login';
        window.location.reload();
      }, 1500);
    } catch (err) {
      showToast('Failed to save config: ' + err.message, 'error');
    }
  });

  const clearBtn = document.getElementById('clear-config-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearSupabaseConfig();
      showToast('Configuration cleared.', 'warning');
      setTimeout(() => {
        window.location.hash = '#setup';
        window.location.reload();
      }, 1000);
    });
  }
}
