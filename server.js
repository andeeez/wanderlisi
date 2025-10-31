const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60 * 60 * 1000 }
}));

const ROOT = __dirname;
const TRACKS_DIR = path.join(ROOT, 'data', 'tracks');

// Function to recursively find all notes.md files in tracks directory
async function findNotesFiles(dir) {
  const files = await fsp.readdir(dir, { withFileTypes: true });
  const notePaths = [];

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      const subDirNotes = await findNotesFiles(fullPath);
      notePaths.push(...subDirNotes);
    } else if (file.name === 'notes.md') {
      const relativePath = path.relative(ROOT, fullPath);
      const dirName = path.dirname(relativePath).split(path.sep).pop() || 'root';
      notePaths.push({
        id: relativePath.replace(/[\\/]/g, '-'),
        path: fullPath,
        label: relativePath,
        directory: dirName
      });
    }
  }
  return notePaths;
}

// Initialize empty NOTE_PATHS - will be populated when needed
let NOTE_PATHS = [];

async function ensureNote(notePath) {
  const dir = path.dirname(notePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(notePath)) {
    await fsp.writeFile(notePath, '# Notes\n\n', 'utf8');
  }
}

// Simple login - hardcoded credentials for local usage
app.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === 'admin' && password === 'password') {
    req.session.authenticated = true;
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, message: 'Invalid credentials' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

// Serve admin only when authenticated
app.get('/admin', (req, res) => {
  if (req.session && req.session.authenticated) {
    res.sendFile(path.join(ROOT, 'public', 'admin.html'));
  } else {
    res.redirect('/login.html');
  }
});

// List available note files
app.get('/note-files', async (req, res) => {
  if (!(req.session && req.session.authenticated)) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
  try {
    // Refresh the note paths each time to catch new directories
    NOTE_PATHS = await findNotesFiles(TRACKS_DIR);
    res.json({ files: NOTE_PATHS });
  } catch (err) {
    console.error('Error scanning for note files:', err);
    res.status(500).json({ error: 'Failed to list note files' });
  }
});

app.get('/file-content', async (req, res) => {
  if (!(req.session && req.session.authenticated)) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
  
  const fileId = req.query.id || 'tracks';
  const noteFile = NOTE_PATHS.find(f => f.id === fileId);
  if (!noteFile) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    await ensureNote(noteFile.path);
    const content = await fsp.readFile(noteFile.path, 'utf8');
    res.json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ content: '', error: 'Failed to read file' });
  }
});

app.post('/save', async (req, res) => {
  if (!(req.session && req.session.authenticated)) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
  
  const { content, fileId = 'tracks' } = req.body || {};
  const noteFile = NOTE_PATHS.find(f => f.id === fileId);
  if (!noteFile) {
    return res.status(404).json({ ok: false, message: 'File not found' });
  }

  try {
    await ensureNote(noteFile.path);
    await fsp.writeFile(noteFile.path, content || '', 'utf8');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Failed to save' });
  }
});

// Serve static assets
app.use(express.static(path.join(ROOT, 'public')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
