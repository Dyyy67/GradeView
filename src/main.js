import { router } from './router';
import { screenshotGuard } from './screenshot-guard';
import renderSetup from './pages/setup';
import renderLogin from './pages/login';
import renderTeacherDashboard from './pages/teacher-dashboard';
import renderTeacherClasses from './pages/teacher-classes';
import renderTeacherStudents from './pages/teacher-students';
import renderTeacherUpload from './pages/teacher-upload';
import renderParentDashboard from './pages/parent-dashboard';
import renderParentLink from './pages/parent-link';

// 1. Initialize Screenshot & Privacy Protection Guard
screenshotGuard.init();

// 2. Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || '/';
    navigator.serviceWorker.register(`${base}sw.js`)
      .then(reg => console.log('Service Worker registered successfully!', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}

// 3. Define and Initialize App Routes
const routes = {
  '#setup': renderSetup,
  '#login': renderLogin,
  '#teacher/dashboard': renderTeacherDashboard,
  '#teacher/classes': renderTeacherClasses,
  '#teacher/students': renderTeacherStudents,
  '#teacher/upload': renderTeacherUpload,
  '#parent/dashboard': renderParentDashboard,
  '#parent/link': renderParentLink
};

// Start routing engine
document.addEventListener('DOMContentLoaded', () => {
  router.init(routes);
});
