const fs = require('fs');
const path = require('path');

const OLD_IP = '192.168.77.33';
const NEW_IP = '192.168.1.188';
const SRC_DIR = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if(file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(SRC_DIR);
files.push(path.join(__dirname, 'App.js')); // ADD APP.JS explicitly
let count = 0;

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(OLD_IP)) {
      content = content.replace(new RegExp(OLD_IP, 'g'), NEW_IP);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Updated IP in:', file);
      count++;
    }
  }
});

console.log('Total files updated:', count);
