const fs = require('fs');
const path = require('path');

const dir = 'i:\\Farming\\Farming\\admin';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

let updated = 0;

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('rbac.js')) {
    content = content.replace('</head>', '    <script src="js/rbac.js"></script>\n</head>');
    fs.writeFileSync(filePath, content);
    updated++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Finished. Updated ${updated} HTML files.`);
