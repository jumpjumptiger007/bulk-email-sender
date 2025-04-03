const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Command line arguments: node send-emails.js <task-file-path>
const taskFilePath = process.argv[2];

if (!taskFilePath) {
  console.error('Error: Please provide a task file path');
  console.log('Usage: node send-emails.js tasks/your-task-file.json');
  process.exit(1);
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

// Main function
async function main() {
  try {
    // Check environment variables
    const requiredEnvVars = ['EMAIL_USER', 'EMAIL_PASSWORD', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_FROM', 'EMAIL_FROM_NAME'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      console.error(`Error: Missing the following environment variables: ${missingEnvVars.join(', ')}`);
      console.log('Please set all required environment variables and try again');
      process.exit(1);
    }
    
    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    
    // Read task data
    console.log(`Reading task file: ${taskFilePath}`);
    const taskData = JSON.parse(fs.readFileSync(taskFilePath, 'utf8'));
    const { taskName, subject, template, recipients } = taskData;
    
    if (!subject || !template || !recipients || !Array.isArray(recipients)) {
      throw new Error('Invalid task data format');
    }
    
    console.log(`Task name: ${taskName || 'Unnamed task'}`);
    console.log(`Recipients count: ${recipients.length}`);
    
    // Create sending results record
    const results = {
      taskName: taskName || path.basename(taskFilePath, '.json'),
      totalRecipients: recipients.length,
      successCount: 0,
      failureCount: 0,
      errors: [],
      startTime: new Date().toISOString(),
      endTime: null
    };
    
    // Send email to each recipient
    for (const recipient of recipients) {
      if (!recipient.email) {
        results.errors.push(`Recipient missing email field`);
        results.failureCount++;
        continue;
      }
      
      try {
        // Prepare email content
        const emailContent = replaceTemplateVariables(template, recipient);
        const emailSubject = replaceTemplateVariables(subject, recipient);
        
        console.log(`Sending email to: ${recipient.email}`);
        
        // Send email
        await transporter.sendMail({
          from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
          to: recipient.email,
          subject: emailSubject,
          html: emailContent,
        });
        
        console.log(`Sent successfully: ${recipient.email}`);
        results.successCount++;
        
        // Add a short delay to avoid sending too quickly
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Send failed: ${recipient.email}, Error: ${error.message}`);
        results.errors.push(`${recipient.email}: ${error.message}`);
        results.failureCount++;
      }
    }
    
    // Update completion time
    results.endTime = new Date().toISOString();
    
    // Save results to file
    const resultsFilePath = taskFilePath.replace('.json', '_results.json');
    fs.writeFileSync(resultsFilePath, JSON.stringify(results, null, 2));
    
    console.log(`Task completed. Success: ${results.successCount}, Failure: ${results.failureCount}`);
    console.log(`Results saved to: ${resultsFilePath}`);
  } catch (error) {
    console.error(`Failed to process task file: ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
