// Script to check all API endpoint response formats

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

console.log('Checking API endpoint response formats...\n');

const issues = [];

files.forEach(file => {
  const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Check for res.json( responses
    if (line.includes('res.json(')) {
      // Check if it's returning raw data (not wrapped in { data: ... })
      const match = line.match(/res\.json\(([^)]+)\)/);
      if (match) {
        const response = match[1].trim();
        
        // Skip if it's already { data: ... } or { message: ... } or error responses
        if (!response.startsWith('{') || 
            (!response.includes('data:') && !response.includes('message:') && !response.includes('error:'))) {
          issues.push({
            file: file,
            line: index + 1,
            code: line.trim(),
            response: response
          });
        }
      }
    }
  });
});

console.log(`Found ${issues.length} potential issues:\n`);

issues.forEach(issue => {
  console.log(`📄 ${issue.file}:${issue.line}`);
  console.log(`   ${issue.code}`);
  console.log(`   Response: ${issue.response}\n`);
});

if (issues.length === 0) {
  console.log('✅ All endpoints appear to have consistent response formats!');
} else {
  console.log(`⚠️  ${issues.length} endpoints may need to be wrapped in { data: ... }`);
}
