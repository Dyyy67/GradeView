import { authService } from './auth';
import { isSupabaseConfigured } from './supabase';

export const router = {
  routes: {},
  currentRoute: null,

  init(routes) {
    this.routes = routes;
    
    // Listen to hash changes
    window.addEventListener('hashchange', () => this.handleRouting());
    
    // First load
    this.handleRouting();
  },

  async handleRouting() {
    const outlet = document.getElementById('router-outlet');
    if (!outlet) return;

    let hash = window.location.hash || '#login';
    
    // Parse route params, e.g. #teacher/students?classId=123
    let path = hash;
    let queryParams = {};
    
    if (hash.includes('?')) {
      const parts = hash.split('?');
      path = parts[0];
      const searchParams = new URLSearchParams(parts[1]);
      for (const [key, val] of searchParams.entries()) {
        queryParams[key] = val;
      }
    }

    // Direct to configuration screen if Supabase is not configured yet
    if (!isSupabaseConfigured() && path !== '#setup') {
      window.location.hash = '#setup';
      return;
    }

    // Check Authentication
    let userProfile = null;
    try {
      userProfile = await authService.getCurrentProfile();
    } catch (e) {
      console.error('Session validation error:', e);
    }

    // Auth Guards
    if (path !== '#login' && path !== '#setup') {
      if (!userProfile) {
        window.location.hash = '#login';
        return;
      }

      // Role Check
      if (path.startsWith('#teacher') && userProfile.role !== 'teacher') {
        window.location.hash = '#parent/dashboard';
        return;
      }
      if (path.startsWith('#parent') && userProfile.role !== 'parent') {
        window.location.hash = '#teacher/dashboard';
        return;
      }
    } else if (path === '#login' && userProfile) {
      // Redirect to correct dashboard if already logged in
      if (userProfile.role === 'teacher') {
        window.location.hash = '#teacher/dashboard';
      } else {
        window.location.hash = '#parent/dashboard';
      }
      return;
    }

    // Render Page
    const pageInitFunction = this.routes[path];
    if (pageInitFunction) {
      outlet.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
      try {
        await pageInitFunction(outlet, queryParams, userProfile);
        this.updateHeader(userProfile);
      } catch (error) {
        console.error('Error rendering page:', error);
        outlet.innerHTML = `
          <div class="glass-card" style="text-align: center; max-width: 500px; margin: 4rem auto;">
            <h3 style="color: var(--danger);">Failed to load page</h3>
            <p>${error.message || 'An unexpected error occurred.'}</p>
            <button class="btn btn-primary" onclick="window.location.reload()">Reload Application</button>
          </div>
        `;
      }
    } else {
      // Fallback
      window.location.hash = userProfile 
        ? (userProfile.role === 'teacher' ? '#teacher/dashboard' : '#parent/dashboard') 
        : '#login';
    }
  },

  updateHeader(profile) {
    const header = document.getElementById('main-header');
    if (!header) return;

    if (!profile) {
      header.innerHTML = `
        <div class="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          GradeView
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted);">Secure Portal</div>
      `;
      return;
    }

    const isTeacher = profile.role === 'teacher';
    
    header.innerHTML = `
      <div class="logo" style="cursor: pointer;" onclick="window.location.hash = '${isTeacher ? '#teacher/dashboard' : '#parent/dashboard'}'">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        GradeView
      </div>
      <nav>
        <ul class="nav-links">
          ${isTeacher ? `
            <li><a href="#teacher/dashboard" class="nav-link ${window.location.hash.startsWith('#teacher/dashboard') ? 'active' : ''}">Classes</a></li>
          ` : `
            <li><a href="#parent/dashboard" class="nav-link ${window.location.hash.startsWith('#parent/dashboard') ? 'active' : ''}">Child's Grades</a></li>
            <li><a href="#parent/link" class="nav-link ${window.location.hash.startsWith('#parent/link') ? 'active' : ''}">Link Student</a></li>
          `}
          <li style="border-left: 1px solid var(--border-color); padding-left: 1rem; display: flex; align-items: center; gap: 0.75rem;">
            <div style="text-align: right; display: none; md: block;">
              <div style="font-size: 0.85rem; font-weight: 600;">${profile.full_name || 'User'}</div>
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: capitalize;">${profile.role}</div>
            </div>
            <button id="logout-btn" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Logout</button>
          </li>
        </ul>
      </nav>
    `;

    document.getElementById('logout-btn').addEventListener('click', async () => {
      try {
        await authService.signOut();
        window.location.hash = '#login';
      } catch (err) {
        alert('Logout failed: ' + err.message);
      }
    });
  }
};
