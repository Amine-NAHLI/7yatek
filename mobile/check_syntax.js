const fs = require('fs');
const babel = require('@babel/core');

const code = fs.readFileSync('src/screens/agents/SafeJourneyScreen.js', 'utf8');

try {
  babel.parseSync(code, {
    presets: ['@babel/preset-react'],
    filename: 'SafeJourneyScreen.js',
  });
  console.log('No syntax errors found.');
} catch (e) {
  console.error(e.message);
}
