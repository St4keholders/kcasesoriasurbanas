const fs = require('fs');
const html = fs.readFileSync('DEMO_SISTEMA_VISUAL_PANEL.html', 'utf8');
const lines = html.split('\n');
const start = lines.findIndex(l => l.includes('<div class="kpi-grid">'));
console.log(lines.slice(start, start + 50).join('\n'));
