import { supabase } from '../supabase';
import { docxParser } from '../docx-parser';
import { showToast } from '../components/toast';

export default async function renderTeacherUpload(container, queryParams, profile) {
  if (!supabase) return;

  const classId = queryParams.classId;
  if (!classId) {
    window.location.hash = '#teacher/dashboard';
    return;
  }

  // Fetch Class details
  const { data: currentClass, error: classErr } = await supabase
    .from('classes')
    .select('*')
    .eq('id', classId)
    .single();

  if (classErr || !currentClass) {
    showToast('Failed to fetch class info', 'error');
    window.location.hash = '#teacher/dashboard';
    return;
  }

  let parsedStudents = [];
  let parsedSubjects = [];
  let selectedQuarter = 1;

  container.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <a href="#teacher/dashboard" style="color: var(--text-secondary); text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 500;">
        ← Back to Dashboard
      </a>
    </div>

    <div style="margin-bottom: 2.5rem;">
      <span style="font-size: 0.85rem; text-transform: uppercase; font-weight: 700; color: var(--primary); letter-spacing: 0.05em;">
        SY ${currentClass.school_year} - Grade ${currentClass.grade_level} ${currentClass.section}
      </span>
      <h1 style="margin: 0.25rem 0 0.5rem 0;">Upload Grade Slips</h1>
      <p style="margin: 0;">Upload a Microsoft Word (.docx) document. GradeView will auto-detect student names and subject grades.</p>
    </div>

    <div class="glass-card" style="margin-bottom: 2rem;">
      <div style="display: flex; gap: 2rem; flex-wrap: wrap; margin-bottom: 2rem; align-items: center;">
        <div class="form-group" style="margin-bottom: 0; min-width: 200px;">
          <label class="form-label" for="upload-quarter">Select Grading Quarter</label>
          <select id="upload-quarter" class="form-control">
            <option value="1" selected>1st Quarter</option>
            <option value="2">2nd Quarter</option>
            <option value="3">3rd Quarter</option>
            <option value="4">4th Quarter</option>
          </select>
        </div>
      </div>

      <!-- Drag & Drop Zone -->
      <div id="drop-zone" class="dropzone">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        <h3>Drag & drop your Word Document (.docx) here</h3>
        <p style="font-size: 0.9rem; margin-top: 0.25rem;">or click to browse files from your computer</p>
        <input type="file" id="file-input" accept=".docx" style="display: none;">
      </div>
    </div>

    <!-- Preview Container (Initially Hidden) -->
    <div id="preview-card" class="glass-card" style="display: none;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h3>Detected Grades Preview</h3>
          <p style="font-size: 0.85rem; margin: 0;">Double check and edit values if needed. Missing students will be registered automatically.</p>
        </div>
        <button id="save-grades-btn" class="btn btn-primary">
          💾 Save & Update Grades
        </button>
      </div>

      <div class="table-wrapper">
        <table class="custom-table" id="preview-table">
          <!-- Dynamically populated -->
        </table>
      </div>
    </div>
  `;

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const previewCard = document.getElementById('preview-card');
  const previewTable = document.getElementById('preview-table');
  const quarterSelect = document.getElementById('upload-quarter');
  const saveBtn = document.getElementById('save-grades-btn');

  const captureCurrentEdits = () => {
    if (parsedStudents.length === 0) return;
    const nameInputs = document.querySelectorAll('.std-name-input');
    nameInputs.forEach(input => {
      const idx = parseInt(input.getAttribute('data-student-idx'));
      if (isNaN(idx)) return;
      const newName = input.value.trim();
      parsedStudents[idx].name = newName;
      
      const gradeInputs = document.querySelectorAll(`.std-grade-input[data-student-idx="${idx}"]`);
      gradeInputs.forEach(gi => {
        const subject = gi.getAttribute('data-subject');
        const val = Math.round(parseFloat(gi.value));
        if (!parsedStudents[idx].quarters[subject]) {
          parsedStudents[idx].quarters[subject] = {};
        }
        if (!isNaN(val)) {
          parsedStudents[idx].quarters[subject][selectedQuarter] = val;
        } else {
          delete parsedStudents[idx].quarters[subject][selectedQuarter];
        }
      });
    });
  };

  quarterSelect.addEventListener('change', (e) => {
    if (parsedStudents.length > 0) {
      captureCurrentEdits();
    }
    selectedQuarter = parseInt(e.target.value);
    if (parsedStudents.length > 0) {
      renderPreviewTable();
    }
  });

  // Open file dialog on dropzone click
  dropZone.addEventListener('click', () => fileInput.click());

  // Drag and Drop handlers
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  const handleFile = async (file) => {
    if (!file.name.endsWith('.docx')) {
      showToast('Only Microsoft Word (.docx) files are supported.', 'error');
      return;
    }

    dropZone.innerHTML = `<div class="loader"></div><p style="margin-top: 1rem;">Parsing document tables...</p>`;

    try {
      const data = await docxParser.parseGradeSheet(file);
      parsedStudents = data.students;
      parsedSubjects = data.subjects;

      if (parsedStudents.length === 0) {
        throw new Error('Could not find any student names or grade data columns in the document. Please verify the document format.');
      }

      showToast(`Detected ${parsedStudents.length} students & ${parsedSubjects.length} subjects!`, 'success');
      renderPreviewTable();
    } catch (error) {
      showToast('Error parsing file: ' + error.message, 'error');
      // Reset dropzone
      dropZone.innerHTML = `
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="margin-bottom: 1rem;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        <h3>Drag & drop your Word Document (.docx) here</h3>
        <p style="font-size: 0.9rem; margin-top: 0.25rem;">or click to browse files from your computer</p>
      `;
    }
  };

  const renderPreviewTable = () => {
    previewCard.style.display = 'block';
    
    // Header
    let tableHeader = `
      <thead>
        <tr>
          <th style="min-width: 220px;">Student Name</th>
          ${parsedSubjects.map(sub => `<th style="min-width: 120px; text-align: center;">${sub} (Q${selectedQuarter})</th>`).join('')}
        </tr>
      </thead>
    `;

    // Rows
    let tableBody = `
      <tbody>
        ${parsedStudents.map((std, sIdx) => `
          <tr>
            <td>
              <input type="text" class="form-control std-name-input" data-student-idx="${sIdx}" value="${std.name}" style="background:transparent; border:none; padding: 0.25rem; font-weight:600; min-width: 200px; color: var(--text-primary);">
            </td>
            ${parsedSubjects.map(sub => {
              const grade = (std.quarters[sub] && std.quarters[sub][selectedQuarter]) !== undefined 
                ? Math.round(parseFloat(std.quarters[sub][selectedQuarter])) 
                : '';
              return `
                <td>
                  <input type="number" class="form-control std-grade-input" data-student-idx="${sIdx}" data-subject="${sub}" value="${grade}" step="1" style="width: 80px; text-align: center; background:transparent; border:none; padding: 0.25rem; margin: 0 auto; display: block; color: var(--text-primary);">
                </td>
              `;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    `;

    previewTable.innerHTML = tableHeader + tableBody;

    // Restore dropzone text
    dropZone.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="margin-bottom: 1rem;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
      <h3>Word document loaded successfully</h3>
      <p style="font-size: 0.9rem; margin-top: 0.25rem; color: var(--success);">Click or drop another file to reload</p>
    `;
  };

  // Helper to generate unique 8 character code
  const generateAccessCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Save to Database Handler
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving Grades...';

    // Sync current inputs into the in-memory array
    captureCurrentEdits();

    try {
      console.log('Fetching database student list for class ID:', classId);
      // 1. Fetch existing students in class to map or register new ones
      const { data: dbStudents, error: dbStudentsErr } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId);

      if (dbStudentsErr) {
        console.error('Error fetching students list:', dbStudentsErr);
        throw dbStudentsErr;
      }

      const studentMap = {}; // name -> student object
      dbStudents.forEach(std => {
        studentMap[std.full_name.toLowerCase().trim()] = std;
      });

      // 2. Identify students that need to be created
      const newStudentsToCreate = [];
      const studentsToProcess = [];

      for (const item of parsedStudents) {
        const normalizedName = item.name.toLowerCase().trim();
        if (studentMap[normalizedName]) {
          studentsToProcess.push({
            name: item.name,
            id: studentMap[normalizedName].id,
            quarters: item.quarters
          });
        } else {
          // Prepare new student
          const code = generateAccessCode();
          newStudentsToCreate.push({
            class_id: classId,
            full_name: item.name,
            access_code: code
          });
        }
      }

      // 3. Bulk Insert new students (if any)
      if (newStudentsToCreate.length > 0) {
        console.log(`Bulk creating ${newStudentsToCreate.length} new students...`);
        const { data: insertedStudents, error: insertErr } = await supabase
          .from('students')
          .insert(newStudentsToCreate)
          .select();

        if (insertErr) {
          console.error('Failed to bulk register students:', insertErr);
          throw insertErr;
        }

        // Add newly created students to our processing list
        insertedStudents.forEach(std => {
          const originalItem = parsedStudents.find(p => p.name.toLowerCase().trim() === std.full_name.toLowerCase().trim());
          studentsToProcess.push({
            name: std.full_name,
            id: std.id,
            quarters: originalItem ? originalItem.quarters : {}
          });
        });
      }

      // 4. Build single bulk array of grades to upsert
      const gradesToUpsert = [];
      for (const student of studentsToProcess) {
        for (const [subject, qMap] of Object.entries(student.quarters)) {
          for (const [qtr, gradeValue] of Object.entries(qMap)) {
            const qtrNum = parseInt(qtr);
            if (isNaN(qtrNum) || isNaN(gradeValue)) continue;
            
            const roundedGrade = Math.round(gradeValue);
            gradesToUpsert.push({
              student_id: student.id,
              quarter: qtrNum,
              subject: subject,
              grade_value: roundedGrade,
              remarks: roundedGrade >= 75 ? 'Passed' : 'Needs Improvement'
            });
          }
        }
      }

      // 5. Bulk Upsert Grades (Single network request!)
      if (gradesToUpsert.length > 0) {
        console.log(`Bulk upserting ${gradesToUpsert.length} grade entries...`);
        const { error: gradeErr } = await supabase
          .from('grades')
          .upsert(gradesToUpsert, {
            onConflict: 'student_id,quarter,subject'
          });

        if (gradeErr) {
          console.error('Failed bulk upserting grades:', gradeErr);
          throw gradeErr;
        }
      }

      showToast(`Successfully saved grades for ${studentsToProcess.length} students!`, 'success');
      setTimeout(() => {
        window.location.hash = `#teacher/students?classId=${classId}`;
      }, 1500);

    } catch (err) {
      console.error('Complete upload failure log:', err);
      showToast('Failed to save grades: ' + (err.message || 'Check database connection keys'), 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save & Update Grades';
    }
  });
}
