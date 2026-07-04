/* GradeView DOCX Parser Engine */

export const docxParser = {
  /**
   * Parse a file object (from input[type=file]) and extract student grades
   * @param {File} file 
   * @returns {Promise<{students: Array, subjects: Array}>}
   */
  async parseGradeSheet(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const arrayBuffer = e.target.result;
        
        try {
          if (typeof window.mammoth === 'undefined') {
            throw new Error('Mammoth.js is not loaded. Please verify your internet connection or package setup.');
          }
          
          const result = await window.mammoth.convertToHtml({ arrayBuffer });
          const html = result.value;
          
          if (!html || !html.includes('<table')) {
            throw new Error('No tables found in this Word document. Make sure your grade slip is formatted as a table.');
          }
          
          const parsedData = this.extractDataFromHtml(html);
          resolve(parsedData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read the file.'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Process HTML string from mammoth to extract students and subject grades
   * @param {string} html 
   */
  extractDataFromHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const body = doc.body;
    const elements = Array.from(body.children);
    
    let allExtractedStudents = [];
    let currentStudentName = null;
    let detectedSubjects = new Set();
    
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      
      // 1. Detect student name in paragraphs preceding the table
      if (el.tagName === 'P') {
        const text = el.textContent.trim();
        const nameMatch = text.match(/(?:Name|Student|Pangalan)\s*:\s*([^\n\r]+)/i);
        if (nameMatch && nameMatch[1]) {
          let name = nameMatch[1].split(/Sex/i)[0].replace(/[:|]/g, '').trim();
          if (name.length > 2) {
            currentStudentName = this.sanitizeText(name);
          }
        }
      }
      
      // 2. Process table
      if (el.tagName === 'TABLE') {
        const rows = Array.from(el.querySelectorAll('tr'));
        if (rows.length < 2) continue;
        
        // DUAL-LAYER CHECK: Scan table cells for Name metadata (e.g. if the name is placed in a cell)
        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('td, th'));
          cells.forEach(cell => {
            const cellText = cell.textContent.trim();
            const cellMatch = cellText.match(/(?:Name|Student|Pangalan)\s*:\s*([^\n\r]+)/i);
            if (cellMatch && cellMatch[1]) {
              let name = cellMatch[1].split(/Sex/i)[0].replace(/[:|]/g, '').trim();
              if (name.length > 2) {
                currentStudentName = this.sanitizeText(name);
              }
            }
          });
        });

        // If we still didn't find any name, skip the table
        if (!currentStudentName) continue;
        
        const grades = {};
        
        for (let j = 0; j < rows.length; j++) {
          const cells = Array.from(rows[j].querySelectorAll('td'));
          if (cells.length < 5) continue; // Need subject + Q1-Q4 columns (at least 5 cells)
          
          const subjectName = this.sanitizeText(cells[0].textContent);
          
          // Skip headers, empty strings, metadata rows, and average rows
          if (!subjectName || 
              subjectName.length < 2 ||
              subjectName.toLowerCase().includes('name') ||
              subjectName.toLowerCase().includes('learning') ||
              subjectName.toLowerCase().includes('quarter') ||
              subjectName.toLowerCase().includes('teacher') ||
              subjectName.toLowerCase().includes('grade') ||
              subjectName.toLowerCase().includes('average') || 
              subjectName.toLowerCase().includes('general') ||
              subjectName.toLowerCase().includes('descriptors') ||
              subjectName.toLowerCase().includes('grading') ||
              subjectName.toLowerCase().includes('remarks') ||
              subjectName.toLowerCase().includes('satisfactory') ||
              subjectName.toLowerCase().includes('outstanding') ||
              subjectName.toLowerCase().includes('expectations')) {
            continue;
          }
          
          detectedSubjects.add(subjectName);
          grades[subjectName] = {};
          
          // Assume columns 1, 2, 3, 4 represent Q1, Q2, Q3, Q4 grades respectively
          const q1Val = parseFloat(cells[1].textContent.trim());
          if (!isNaN(q1Val)) grades[subjectName]['1'] = Math.round(q1Val);
          
          const q2Val = parseFloat(cells[2].textContent.trim());
          if (!isNaN(q2Val)) grades[subjectName]['2'] = Math.round(q2Val);
          
          const q3Val = parseFloat(cells[3].textContent.trim());
          if (!isNaN(q3Val)) grades[subjectName]['3'] = Math.round(q3Val);
          
          const q4Val = parseFloat(cells[4].textContent.trim());
          if (!isNaN(q4Val)) grades[subjectName]['4'] = Math.round(q4Val);
        }
        
        // Only add if we successfully parsed some grades
        if (Object.keys(grades).length > 0) {
          allExtractedStudents.push({
            name: currentStudentName,
            quarters: grades
          });
        }
        
        // Reset name for next table
        currentStudentName = null;
      }
    }
    
    return {
      students: allExtractedStudents,
      subjects: Array.from(detectedSubjects)
    };
  },

  sanitizeText(text) {
    if (!text) return '';
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
};
