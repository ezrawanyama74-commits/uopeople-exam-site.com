const http = require('http');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) env[key.trim()] = val.trim();
  });
}
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || 'UOPPASSWORD2';
const PORT = env.PORT || 3000;

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

const questionsFile = path.join(__dirname, 'data', 'questions.json');
const membersFile = path.join(__dirname, 'data', 'members.json');

function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf-8') || '[]');
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

const server = http.createServer((req, res) => {
  const url = req.url;
  const method = req.method;

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (url === '/api/questions' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(readJSON(questionsFile)));
  }
  
  if (url === '/api/members' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(readJSON(membersFile)));
  }

  if (url === '/api/admin/action' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const data = JSON.parse(body || '{}');
      
      // Strict password checking node
      if (data.password !== ADMIN_PASSWORD) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
      }

      // Handle simple password checking requests
      if (data.action === 'verify') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      }

      if (data.action === 'add-question') {
        const list = readJSON(questionsFile);
        list.push({
          id: Date.now(), title: data.title, question: data.question,
          instructions: data.instructions, a: data.a, b: data.b,
          c: data.c, d: data.d, correct: data.correct, limit: parseInt(data.limit) || 1
        });
        writeJSON(questionsFile, list);
      } 
      else if (data.action === 'delete-question') {
        let list = readJSON(questionsFile);
        list = list.filter(q => q.id !== Number(data.id));
        writeJSON(questionsFile, list);
      }
      else if (data.action === 'add-member') {
        const list = readJSON(membersFile);
        list.push({
          id: Date.now(), name: data.name, position: data.position,
          story: data.story, year: data.year, course: data.course,
          picture: data.picture || '/public/default-profile.png'
        });
        writeJSON(membersFile, list);
      }
      else if (data.action === 'delete-member') {
        let list = readJSON(membersFile);
        list = list.filter(m => m.id !== Number(data.id));
        writeJSON(membersFile, list);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    return;
  }

  if (url === '/' || url === '/index.html') return serveFile(res, path.join(__dirname, 'views', 'index.html'), 'text/html');
  if (url === '/admin' || url === '/admin.html') return serveFile(res, path.join(__dirname, 'views', 'admin.html'), 'text/html');
  if (url.startsWith('/public/')) {
    const fileLoc = path.join(__dirname, url);
    if (fs.existsSync(fileLoc)) return serveFile(res, fileLoc, 'text/css');
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`Server running locally offline at http://localhost:${PORT}`);
});
