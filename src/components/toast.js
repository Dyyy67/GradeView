/* GradeView Toast Alert System */

export const showToast = (message, type = 'info') => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Choose icons based on status
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  // Auto remove toast after 4s
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in forwards';
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 4000);
};

// Add slideOut keyframes to document dynamic styling if missing
const style = document.createElement('style');
style.textContent = `
@keyframes slideOut {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}
`;
document.head.appendChild(style);
