// Global variables
let csvData = null;
let taskData = {
    subject: '',
    template: '',
    recipients: []
};

// DOM elements
const subjectInput = document.getElementById('subject');
const templateInput = document.getElementById('template');
const csvFileInput = document.getElementById('csvFile');
const taskNameInput = document.getElementById('taskName');
const recipientsTable = document.getElementById('recipientsTable');
const previewBtn = document.getElementById('previewBtn');
const generateBtn = document.getElementById('generateBtn');
const previewSection = document.getElementById('previewSection');
const previewSubject = document.getElementById('previewSubject');
const previewBody = document.getElementById('previewBody');
const closePreviewBtn = document.getElementById('closePreviewBtn');
const jsonOutput = document.getElementById('jsonOutput');
const jsonDisplay = document.getElementById('jsonDisplay');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');

// Initialize event listeners
function initEventListeners() {
    csvFileInput.addEventListener('change', handleCSVUpload);
    previewBtn.addEventListener('click', showEmailPreview);
    closePreviewBtn.addEventListener('click', closePreview);
    generateBtn.addEventListener('click', generateJSON);
    downloadBtn.addEventListener('click', downloadJSON);
    copyBtn.addEventListener('click', copyJSON);
}

// Handle CSV file upload
function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Parse CSV using Papa Parse
    Papa.parse(file, {
        header: true,
        complete: function(results) {
            if (results.data && results.data.length > 0) {
                csvData = results.data;
                
                // Check for required email column
                const hasEmailColumn = results.meta.fields.includes('email');
                if (!hasEmailColumn) {
                    alert('CSV file must contain an "email" column');
                    csvFileInput.value = '';
                    csvData = null;
                    return;
                }
                
                // Display recipients table preview
                displayRecipientsTable(csvData, results.meta.fields);
                
                // Update task data
                taskData.recipients = csvData.filter(row => row.email && row.email.trim() !== '');
            }
        },
        error: function(error) {
            console.error('CSV parsing error:', error);
            alert('Unable to parse CSV file');
        }
    });
}

// Display recipients table preview
function displayRecipientsTable(data, fields) {
    // Only show first 5 rows as preview
    const previewData = data.slice(0, 5);
    
    let tableHTML = '<table><thead><tr>';
    
    // Add headers
    fields.forEach(field => {
        tableHTML += `<th>${field}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    // Add data rows
    previewData.forEach(row => {
        tableHTML += '<tr>';
        fields.forEach(field => {
            tableHTML += `<td>${row[field] || ''}</td>`;
        });
        tableHTML += '</tr>';
    });
    
    // If there are more rows, add a hint
    if (data.length > 5) {
        tableHTML += `<tr><td colspan="${fields.length}">... ${data.length - 5} more rows not shown</td></tr>`;
    }
    
    tableHTML += '</tbody></table>';
    recipientsTable.innerHTML = tableHTML;
}

// Replace template variables
function replaceTemplateVariables(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value || '');
    }
    return result;
}

// Show email preview
function showEmailPreview() {
    // Get current form data
    const subject = subjectInput.value.trim();
    const template = templateInput.value.trim();
    
    if (!subject || !template) {
        alert('Please fill in both email subject and content');
        return;
    }
    
    if (!csvData || csvData.length === 0) {
        alert('Please upload a CSV file with recipient data');
        return;
    }
    
    // Use the first recipient data for preview
    const firstRecipient = csvData[0];
    
    // Update preview content
    previewSubject.textContent = subject;
    previewBody.textContent = replaceTemplateVariables(template, firstRecipient);
    
    // Show preview section
    previewSection.style.display = 'block';
    
    // Scroll to preview section
    previewSection.scrollIntoView({ behavior: 'smooth' });
}

// Close preview
function closePreview() {
    previewSection.style.display = 'none';
}

// Generate JSON data
function generateJSON() {
    // Get current form data
    const subject = subjectInput.value.trim();
    const template = templateInput.value.trim();
    const taskName = taskNameInput.value.trim() || `email_task_${new Date().getTime()}`;
    
    if (!subject || !template) {
        alert('Please fill in both email subject and content');
        return;
    }
    
    if (!csvData || csvData.length === 0) {
        alert('Please upload a CSV file with recipient data');
        return;
    }
    
    // Build task data
    taskData = {
        taskName: taskName,
        subject: subject,
        template: template,
        recipients: csvData.filter(row => row.email && row.email.trim() !== ''),
        createdAt: new Date().toISOString()
    };
    
    // Display JSON
    jsonDisplay.textContent = JSON.stringify(taskData, null, 2);
    jsonOutput.style.display = 'block';
    
    // Scroll to JSON section
    jsonOutput.scrollIntoView({ behavior: 'smooth' });
}

// Download JSON file
function downloadJSON() {
    if (!taskData) {
        alert('Please generate task JSON first');
        return;
    }
    
    const taskName = taskData.taskName || `email_task_${new Date().getTime()}`;
    const filename = `${taskName}.json`;
    
    const blob = new Blob([JSON.stringify(taskData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

// Copy JSON to clipboard
function copyJSON() {
    if (!taskData) {
        alert('Please generate task JSON first');
        return;
    }
    
    const jsonStr = JSON.stringify(taskData, null, 2);
    
    navigator.clipboard.writeText(jsonStr)
        .then(() => {
            alert('JSON copied to clipboard');
        })
        .catch(err => {
            console.error('Copy failed:', err);
            alert('Unable to copy to clipboard');
        });
}

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', initEventListeners);
