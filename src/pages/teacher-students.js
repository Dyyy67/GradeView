import { supabase } from '../supabase';
import { showToast } from '../components/toast';

export default async function renderTeacherStudents(container, queryParams, profile) {
  if (!supabase) return;

  const classId = queryParams.classId;
  if (!classId) {
    window.location.hash = '#teacher/dashboard';
    return;
  }

  // 1. Fetch Class details
  const { data: currentClass, error: classErr } = await supabase
    .from('classes')
    .select('*')
    .eq('id', classId)
    .single();

  if (classErr || !currentClass) {
    showToast('Failed to fetch class info: ' + (classErr ? classErr.message : 'Class not found'), 'error');
    window.location.hash = '#teacher/dashboard';
    return;
  }

  // Helper to generate unique 8 character code
  const generateAccessCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like O, 0, I, 1
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const loadStudentsList = async () => {
    // 2. Fetch students
    const { data: students, error: studentErr } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('full_name', { ascending: true });

    if (studentErr) {
      showToast('Error loading students: ' + studentErr.message, 'error');
      return;
    }

    const studentsTbody = document.getElementById('students-tbody');
    if (!studentsTbody) return;

    if (!students || students.length === 0) {
      studentsTbody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
            No students registered in this section yet. Add students below or upload a grade slip to register them automatically.
          </td>
        </tr>
      `;
      return;
    }

    studentsTbody.innerHTML = students.map((std, index) => `
      <tr>
        <td>${index + 1}</td>
        <td style="font-weight: 600;">${std.full_name}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <code style="background: rgba(0,0,0,0.3); padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-color); font-size: 1rem; color: var(--primary); letter-spacing: 0.05em; font-weight: 700;">
              ${std.access_code}
            </code>
            <button class="btn btn-secondary copy-code-btn" data-code="${std.access_code}" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">
              Copy Code
            </button>
          </div>
        </td>
        <td>
          <button class="btn btn-danger delete-student-btn" data-student-id="${std.id}" data-name="${std.full_name}" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">
            Delete
          </button>
        </td>
      </tr>
    `).join('');

    // Attach copy event listeners
    document.querySelectorAll('.copy-code-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const code = e.target.getAttribute('data-code');
        navigator.clipboard.writeText(code).then(() => {
          showToast('Code copied to clipboard: ' + code, 'success');
        }).catch(err => {
          showToast('Failed to copy: ' + err.message, 'error');
        });
      });
    });

    // Attach delete event listeners
    document.querySelectorAll('.delete-student-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const studentId = e.target.getAttribute('data-student-id');
        const studentName = e.target.getAttribute('data-name');
        
        if (confirm(`Are you sure you want to delete ${studentName}? This will permanently delete all of their grades as well.`)) {
          try {
            const { error } = await supabase
              .from('students')
              .delete()
              .eq('id', studentId);

            if (error) throw error;
            showToast(`Deleted ${studentName}`, 'success');
            await loadStudentsList();
          } catch (err) {
            showToast('Error deleting student: ' + err.message, 'error');
          }
        }
      });
    });
  };

  container.innerHTML = `
    <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
      <a href="#teacher/dashboard" style="color: var(--text-secondary); text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 500;">
        ← Back to Dashboard
      </a>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <button id="print-slips-btn" class="btn btn-secondary">
          🖨️ Print Access Slips
        </button>
        <button id="delete-all-students-btn" class="btn btn-danger">
          🗑️ Delete All Students
        </button>
      </div>
    </div>

    <div style="margin-bottom: 2.5rem;">
      <span style="font-size: 0.85rem; text-transform: uppercase; font-weight: 700; color: var(--primary); letter-spacing: 0.05em;">
        SY ${currentClass.school_year}
      </span>
      <h1 style="margin: 0.25rem 0 0.5rem 0;">Grade ${currentClass.grade_level} - ${currentClass.section}</h1>
      <p style="margin: 0;">Student Access Management Portal</p>
    </div>

    <div style="display: grid; grid-template-columns: 1fr; lg: grid-template-columns: 2fr 1fr; gap: 2rem; align-items: start;">
      
      <!-- Student List Table -->
      <div class="glass-card">
        <h3 style="margin-bottom: 1.5rem;">Student Directory</h3>
        <div class="table-wrapper">
          <table class="custom-table">
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th>Student Name</th>
                <th>Unique Parent Code</th>
                <th style="width: 100px;">Actions</th>
              </tr>
            </thead>
            <tbody id="students-tbody">
              <tr>
                <td colspan="4" style="text-align: center; padding: 2rem;"><div class="loader"></div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add Student Manually Form -->
      <div class="glass-card">
        <h3 style="margin-bottom: 0.5rem;">Register Student</h3>
        <p style="font-size: 0.85rem; margin-bottom: 1.5rem;">Add a single student manually. A unique code will be generated automatically.</p>
        
        <form id="add-student-form">
          <div class="form-group">
            <label class="form-label" for="student-name">Student Full Name</label>
            <input type="text" id="student-name" class="form-control" placeholder="Last Name, First Name M.I." required>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;" id="add-student-submit">
            Add Student
          </button>
        </form>
      </div>

    </div>
  `;

  // Load list
  await loadStudentsList();

  // Add Student handler
  const addForm = document.getElementById('add-student-form');
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('student-name').value.trim();
    const submitBtn = document.getElementById('add-student-submit');

    if (!fullName) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    try {
      const accessCode = generateAccessCode();
      const { error } = await supabase
        .from('students')
        .insert({
          class_id: classId,
          full_name: fullName,
          access_code: accessCode
        });

      if (error) throw error;

      showToast(`Student ${fullName} added!`, 'success');
      document.getElementById('student-name').value = '';
      await loadStudentsList();
    } catch (err) {
      showToast('Error registering student: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Student';
    }
  });

  // Print Slips Handler
  document.getElementById('print-slips-btn').addEventListener('click', async () => {
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('full_name', { ascending: true });

    if (error || !students || students.length === 0) {
      showToast('No students to print access slips for.', 'warning');
      return;
    }

    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
      <head>
        <title>GradeView Parent Code Slips - Grade ${currentClass.grade_level} ${currentClass.section}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          .slips-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .slip { border: 2px dashed #000; padding: 15px; border-radius: 8px; page-break-inside: avoid; }
          .title { font-weight: bold; font-size: 1.2em; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
          .details { margin-bottom: 10px; font-size: 0.9em; }
          .code-box { font-size: 1.4em; font-family: monospace; font-weight: bold; background: #eee; padding: 8px; border-radius: 4px; text-align: center; letter-spacing: 2px; }
        </style>
      </head>
      <body>
        <h2>GradeView Student Access Slips</h2>
        <p>Distribute these slips to parents so they can register and securely view their child's grades.</p>
        <div class="slips-grid">
          ${students.map(std => `
            <div class="slip">
              <div class="title">GradeView Parent Access</div>
              <div class="details">
                <strong>Student:</strong> ${std.full_name}<br>
                <strong>Grade & Section:</strong> Grade ${currentClass.grade_level} - ${currentClass.section}<br>
                <strong>School Year:</strong> ${currentClass.school_year}
              </div>
              <div style="font-size: 0.8em; margin-bottom: 5px;">Link Code in Parent Account:</div>
              <div class="code-box">${std.access_code}</div>
              <div style="font-size: 0.7em; margin-top: 10px; color: #555; text-align: center;">
                Go to GradeView -> Sign up as Parent -> Link Student -> Enter Code
              </div>
            </div>
          `).join('')}
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  });

  // Delete All Students Handler
  document.getElementById('delete-all-students-btn').addEventListener('click', async () => {
    if (confirm('⚠️ WARNING: Are you sure you want to delete ALL students in this class section? This will permanently delete all students, their access codes, and all uploaded grades. This action CANNOT be undone.')) {
      const confirmText = prompt('Type "DELETE" to confirm complete removal:');
      if (confirmText === 'DELETE') {
        try {
          const { error } = await supabase
            .from('students')
            .delete()
            .eq('class_id', classId);

          if (error) throw error;
          showToast('Successfully deleted all students.', 'success');
          await loadStudentsList();
        } catch (err) {
          showToast('Failed to delete students: ' + err.message, 'error');
        }
      } else {
        showToast('Confirmation mismatch. Deletion cancelled.', 'info');
      }
    }
  });
}
