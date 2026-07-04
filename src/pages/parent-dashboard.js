import { supabase } from '../supabase';
import { authService } from '../auth';
import { screenshotGuard } from '../screenshot-guard';
import { showToast } from '../components/toast';

export default async function renderParentDashboard(container, queryParams, profile) {
  if (!supabase) {
    container.innerHTML = `<div class="glass-card" style="max-width:500px;margin:4rem auto;text-align:center;"><p>Database not configured.</p></div>`;
    return;
  }

  // Show loading state
  container.innerHTML = `<div class="loader-container"><div class="loader"></div><p style="margin-top:1rem;color:var(--text-secondary);">Loading your child's grades...</p></div>`;

  let students = [];
  try {
    students = await authService.getLinkedStudents();
  } catch (err) {
    console.error('getLinkedStudents error:', err);
    container.innerHTML = `
      <div class="glass-card" style="max-width:500px;margin:4rem auto;text-align:center;">
        <h3 style="color:var(--danger);">Error Loading Data</h3>
        <p>${err.message}</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Try Again</button>
      </div>`;
    return;
  }

  if (!students || students.length === 0) {
    screenshotGuard.clearWatermark();
    container.innerHTML = `
      <div style="max-width:500px;margin:4rem auto;text-align:center;" class="glass-card">
        <h2 style="margin-bottom:1rem;">No Linked Students</h2>
        <p>You haven't linked any student yet. Enter the access code provided by the teacher.</p>
        <a href="#parent/link" class="btn btn-primary" style="margin-top:1.5rem;display:inline-flex;">
          Link Student Now
        </a>
      </div>`;
    return;
  }

  let activeStudentIndex = 0;
  let activeQuarter = 1;

  const renderGrades = async () => {
    const student = students[activeStudentIndex];
    if (!student) return;

    screenshotGuard.setWatermark(`Confidential | Student: ${student.full_name}`);

    // Fetch all grades for this student
    let grades = [];
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', student.id)
        .order('subject', { ascending: true });

      if (error) throw error;
      grades = data || [];
    } catch (err) {
      console.error('Error loading grades:', err);
      showToast('Error loading grades: ' + err.message, 'error');
    }

    const activeGrades = grades.filter(g => g.quarter === activeQuarter);
    const subjectList = [...new Set(grades.map(g => g.subject))].sort();

    // Compute general average for active quarter
    let averageText = 'N/A';
    if (activeGrades.length > 0) {
      const sum = activeGrades.reduce((acc, g) => acc + parseFloat(g.grade_value), 0);
      averageText = Math.round(sum / activeGrades.length).toString();
    }

    const getGrade = (subj, qtr) => {
      const found = grades.find(g => g.subject === subj && g.quarter === qtr);
      return found ? Math.round(parseFloat(found.grade_value)) : '-';
    };

    const quarterLabel = (q) => ['', '1st', '2nd', '3rd', '4th'][q] + ' Quarter';

    const classInfo = student.class || {};

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;">
        <div>
          <h1 style="margin-bottom:0.25rem;">Student Grade Portal</h1>
          <p style="margin:0;font-size:0.9rem;">Grades are view-only. Printing and screenshots are restricted.</p>
        </div>
        ${students.length > 1 ? `
          <div>
            <label class="form-label" style="margin-bottom:0.25rem;">Viewing:</label>
            <select id="student-selector" class="form-control">
              ${students.map((s, i) => `<option value="${i}" ${i === activeStudentIndex ? 'selected' : ''}>${s.full_name}</option>`).join('')}
            </select>
          </div>
        ` : ''}
      </div>

      <!-- Student Info Card -->
      <div class="glass-card" style="margin-bottom:2rem;background:linear-gradient(135deg,rgba(17,25,40,0.75),rgba(67,97,238,0.05));">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1.5rem;">
          <div>
            <span style="font-size:0.8rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.05em;">
              Grade ${classInfo.grade_level || '?'} - ${classInfo.section || '?'} &nbsp;|&nbsp; SY ${classInfo.school_year || '?'}
            </span>
            <h2 style="margin:0.25rem 0 0.25rem 0;font-size:2rem;">${student.full_name}</h2>
          </div>
          <div style="text-align:center;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);padding:1rem 2rem;border-radius:var(--border-radius-md);">
            <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);font-weight:700;">
              ${quarterLabel(activeQuarter)} Average
            </div>
            <div style="font-size:2.5rem;font-weight:800;color:${averageText !== 'N/A' && parseFloat(averageText) >= 75 ? 'var(--success)' : averageText !== 'N/A' ? 'var(--danger)' : 'var(--text-primary)'};">
              ${averageText}
            </div>
          </div>
        </div>
      </div>

      <!-- Quarter Tabs -->
      <div class="tabs" style="margin-bottom:2rem;">
        ${[1,2,3,4].map(q => `
          <button class="tab-btn qtr-tab ${activeQuarter === q ? 'active' : ''}" data-quarter="${q}">
            ${['','1st','2nd','3rd','4th'][q]} Qtr
          </button>
        `).join('')}
      </div>

      <!-- Grades Grid + History Table -->
      <div style="display:grid;grid-template-columns:1fr;gap:2rem;">

        <!-- Subject Cards -->
        <div class="glass-card">
          <h3 style="margin-bottom:1.5rem;">${quarterLabel(activeQuarter)} — Subject Grades</h3>
          ${activeGrades.length === 0 ? `
            <p style="text-align:center;padding:2rem;color:var(--text-secondary);">
              No grades uploaded yet for the ${quarterLabel(activeQuarter)}.
            </p>
          ` : `
            <div class="grades-grid">
              ${activeGrades.map(g => {
                let badgeClass = '';
                const roundedVal = Math.round(parseFloat(g.grade_value));
                if (roundedVal >= 90) badgeClass = 'excellent';
                else if (roundedVal < 75) badgeClass = 'needs-improvement';
                return `
                  <div class="grade-card">
                    <div>
                      <div style="font-weight:600;font-size:1rem;">${g.subject}</div>
                      <div style="font-size:0.78rem;font-weight:600;margin-top:0.2rem;color:${roundedVal >= 75 ? 'var(--success)' : 'var(--danger)'}">
                        ${roundedVal >= 75 ? '✓ Passed' : '✗ Failed'}
                      </div>
                    </div>
                    <div class="grade-badge ${badgeClass}">${roundedVal}</div>
                  </div>`;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Quarterly History Table -->
        ${subjectList.length > 0 ? `
          <div class="glass-card">
            <h3 style="margin-bottom:0.5rem;">Quarterly Overview</h3>
            <p style="font-size:0.85rem;margin-bottom:1.5rem;">All quarters side by side. Current quarter is highlighted.</p>
            <div class="table-wrapper">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th style="text-align:center;${activeQuarter===1?'color:var(--primary);':''}" >Q1</th>
                    <th style="text-align:center;${activeQuarter===2?'color:var(--primary);':''}" >Q2</th>
                    <th style="text-align:center;${activeQuarter===3?'color:var(--primary);':''}" >Q3</th>
                    <th style="text-align:center;${activeQuarter===4?'color:var(--primary);':''}" >Q4</th>
                  </tr>
                </thead>
                <tbody>
                  ${subjectList.map(subj => `
                    <tr>
                      <td style="font-weight:600;">${subj}</td>
                      ${[1,2,3,4].map(q => {
                        const val = getGrade(subj, q);
                        const isActive = activeQuarter === q;
                        const isNum = val !== '-';
                        const passed = isNum && parseFloat(val) >= 75;
                        return `<td style="text-align:center;font-weight:${isActive?'800':'400'};color:${isActive ? 'var(--primary)' : isNum ? (passed ? 'var(--success)' : 'var(--danger)') : 'var(--text-muted)'};">${val}</td>`;
                      }).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

      </div>
    `;

    // Re-attach event listeners
    const studentSelector = document.getElementById('student-selector');
    if (studentSelector) {
      studentSelector.addEventListener('change', (e) => {
        activeStudentIndex = parseInt(e.target.value);
        renderGrades();
      });
    }

    document.querySelectorAll('.qtr-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        activeQuarter = parseInt(e.target.getAttribute('data-quarter'));
        renderGrades();
      });
    });
  };

  await renderGrades();
}
