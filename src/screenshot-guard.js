/* GradeView Screenshot & Privacy Guard */

let deferredInstallPrompt = null;

export const screenshotGuard = {
  init() {
    // Listen for PWA installation prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      this.updateAndroidInstallButton();
    });

    // Run PWA installation enforcement check
    this.checkInstallationWall();

    // 1. Disable Right Click
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // 2. Disable selection & copying
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    
    document.addEventListener('copy', (e) => {
      e.preventDefault();
    });
    
    document.addEventListener('cut', (e) => {
      e.preventDefault();
    });

    // 3. Disable print & key combinations (like Ctrl+P, PrintScreen, Ctrl+S)
    document.addEventListener('keydown', (e) => {
      // Ctrl + P
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
      }
      // Ctrl + S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }
      // Ctrl + Shift + I (Inspect element)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
      }
    });

    // 4. Blur app when visibility changes (App switcher or tab switch)
    document.addEventListener('visibilitychange', () => {
      const appContainer = document.getElementById('app');
      if (document.hidden) {
        if (appContainer) appContainer.classList.add('blurred');
      } else {
        if (appContainer) appContainer.classList.remove('blurred');
      }
    });

    // 5. Blur app when window loses focus
    window.addEventListener('blur', () => {
      const appContainer = document.getElementById('app');
      if (appContainer) appContainer.classList.add('blurred');
    });

    window.addEventListener('focus', () => {
      const appContainer = document.getElementById('app');
      if (appContainer) appContainer.classList.remove('blurred');
    });
  },

  checkInstallationWall() {
    // Automatically bypass the installation wall for localhost/development testing
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    
    // Check if the wall is already rendered
    let wall = document.getElementById('pwa-install-wall');
    
    if (!isStandalone && !isLocalhost) {
      if (!wall) {
        wall = document.createElement('div');
        wall.id = 'pwa-install-wall';
        wall.style.cssText = `
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background: #090d16;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          text-align: center;
          font-family: 'Outfit', sans-serif;
        `;
        document.body.appendChild(wall);
      }
      
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      let instructions = '';
      if (isIOS) {
        instructions = `
          <p style="margin-top: 1.5rem; font-size: 1.05rem;">To access the Portal on iOS:</p>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 1.25rem; border-radius: 12px; margin-top: 1rem; text-align: left; display: inline-block;">
            <ol style="margin-left: 1.2rem; display: flex; flex-direction: column; gap: 0.5rem; color: #94a3b8;">
              <li>Tap the <strong>Share</strong> button <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin: 0 4px;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg> at the bottom of Safari.</li>
              <li>Scroll down and select <strong>Add to Home Screen</strong>.</li>
              <li>Launch <strong>GradeView</strong> from your home screen.</li>
            </ol>
          </div>
        `;
      } else if (isMobile) {
        instructions = `
          <p style="margin-top: 1.5rem;">Click the install button below to add GradeView to your home screen.</p>
          <button id="pwa-install-btn" class="btn btn-primary" style="margin-top: 1.5rem; width: 100%; max-width: 280px; padding: 1rem;">
            Install Application
          </button>
        `;
      } else {
        // Desktop PC / Laptop
        instructions = `
          <p style="margin-top: 1.5rem; font-size: 1.05rem;">Please install GradeView on your computer to continue:</p>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 1.25rem; border-radius: 12px; margin-top: 1rem; text-align: left; display: inline-block; max-width: 420px; line-height: 1.6;">
            <ol style="margin-left: 1.2rem; display: flex; flex-direction: column; gap: 0.5rem; color: #94a3b8;">
              <li>Look at your browser's address bar at the top right.</li>
              <li>Click the <strong>Install</strong> icon (looks like a monitor screen with an arrow or a <strong style="font-size: 1.2em;">+</strong> icon).</li>
              <li>Or click the 3 dots menu -> select <strong>Save and share</strong> -> <strong>Install page as app</strong>.</li>
            </ol>
          </div>
          <button id="pwa-install-btn" class="btn btn-primary" style="margin-top: 1.5rem; width: 100%; max-width: 280px; padding: 1rem;">
            Install App
          </button>
        `;
      }
      
      wall.innerHTML = `
        <div class="glass-card" style="max-width: 500px; padding: 3rem 2rem;">
          <h1 style="background: linear-gradient(135deg, #4361ee, #f72585); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0.5rem;">App Installation Required</h1>
          <p style="color: #94a3b8; font-size: 0.95rem;">To protect student grades, prevent leaks, and secure portal access, this app must be installed on your Home Screen.</p>
          ${instructions}
        </div>
      `;
      
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) {
        installBtn.addEventListener('click', async () => {
          if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            const { outcome } = await deferredInstallPrompt.userChoice;
            if (outcome === 'accepted') {
              deferredInstallPrompt = null;
              wall.remove();
            }
          } else {
            showToast('Please use your browser menu or address bar install icon.', 'info');
          }
        });
      }
    } else {
      if (wall) wall.remove();
    }
  },

  updateAndroidInstallButton() {
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
    }
  },

  /**
   * Set up a translucent background watermark with the viewer's details
   * to deter physical camera photos.
   * @param {string} userDetails e.g. "Parent: Maria Clara (Code: AB12CD34)"
   */
  setWatermark(userDetails) {
    const watermarkEl = document.getElementById('screen-watermark');
    if (!watermarkEl) return;

    // Clear old watermarks
    watermarkEl.innerHTML = '';

    // Generate repeating text grid
    const text = userDetails || 'GradeView Portal - Confidential';
    for (let i = 0; i < 40; i++) {
      const span = document.createElement('span');
      span.textContent = text;
      watermarkEl.appendChild(span);
    }
  },

  clearWatermark() {
    const watermarkEl = document.getElementById('screen-watermark');
    if (watermarkEl) {
      watermarkEl.innerHTML = '';
    }
  }
};
