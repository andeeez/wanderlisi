const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const multer = require('multer');
const { DOMParser } = require('xmldom');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(session({
  secret: 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60 * 60 * 1000 }
}));

const ROOT = __dirname;
const TRACKS_DIR = path.join(ROOT, 'data', 'tracks');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, TRACKS_DIR);
  },
  filename: function (req, file, cb) {
    // Keep the original filename
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Only allow GPX files
    if (file.mimetype === 'application/gpx+xml' || 
        file.originalname.toLowerCase().endsWith('.gpx')) {
      cb(null, true);
    } else {
      cb(new Error('Only GPX files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

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

// Function to extract track name from GPX file
async function extractTrackNameFromGPX(filePath) {
  try {
    const gpxContent = await fsp.readFile(filePath, 'utf8');
    const parser = new DOMParser();
    const doc = parser.parseFromString(gpxContent, 'text/xml');
    
    // Try to find name element
    const nameElement = doc.getElementsByTagName('name')[0];
    if (nameElement && nameElement.firstChild) {
      let trackName = nameElement.firstChild.nodeValue.trim();
      
      // Clean the track name (same logic as in process.py)
      trackName = trackName.replace('\u2013', '-'); // Replace en-dash with hyphen
      trackName = trackName.replace(/[^\w\s,_\-()]/g, ''); // Keep only alphanumeric, space, comma, underscore, hyphen, parentheses
      trackName = trackName.trim();
      
      return trackName || null;
    }
    return null;
  } catch (error) {
    console.error('Error extracting track name from GPX:', error);
    return null;
  }
}

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
  if (username === 'admin' && password === (process.env.ADMIN_PASSWORD || 'password')) {
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

// Public save endpoint for inline editing from main app
app.post('/save-notes', async (req, res) => {
  console.log('Save notes request received:', req.body);
  
  const { trackName, content } = req.body || {};
  
  if (!trackName || content === undefined) {
    console.log('Missing trackName or content:', { trackName, content: content === undefined ? 'undefined' : 'provided' });
    return res.status(400).json({ ok: false, message: 'Track name and content are required' });
  }

  try {
    const notesPath = path.join(TRACKS_DIR, trackName, 'notes.md');
    console.log('Attempting to save to:', notesPath);
    
    // Check if track directory exists
    const trackDir = path.dirname(notesPath);
    if (!fs.existsSync(trackDir)) {
      console.log('Track directory does not exist:', trackDir);
      return res.status(404).json({ ok: false, message: 'Track not found' });
    }

    await fsp.writeFile(notesPath, content, 'utf8');
    console.log('Notes saved successfully to:', notesPath);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error saving notes:', err);
    res.status(500).json({ ok: false, message: 'Failed to save notes: ' + err.message });
  }
});

// GPX upload endpoint
app.post('/upload-gpx', upload.single('gpxFile'), async (req, res) => {
  if (!(req.session && req.session.authenticated)) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }

  if (!req.file) {
    return res.status(400).json({ ok: false, message: 'No file uploaded' });
  }

  try {
    const tempFilePath = req.file.path;
    
    // Extract track name from GPX metadata
    const trackNameFromGPX = await extractTrackNameFromGPX(tempFilePath);
    const trackName = trackNameFromGPX || path.basename(req.file.originalname, '.gpx');
    
    console.log(`Processing GPX upload: Original filename="${req.file.originalname}", Extracted name="${trackNameFromGPX}", Using="${trackName}"`);
    
    const trackDir = path.join(TRACKS_DIR, trackName);
    
    // Create track directory if it doesn't exist
    if (!fs.existsSync(trackDir)) {
      await fsp.mkdir(trackDir, { recursive: true });
    }
    
    // Move and rename GPX file to track directory with extracted name
    const newGpxFilename = `${trackName}.gpx`;
    const newPath = path.join(trackDir, newGpxFilename);
    await fsp.rename(tempFilePath, newPath);
    
    // Create default notes.md file
    const notesPath = path.join(trackDir, 'notes.md');
    if (!fs.existsSync(notesPath)) {
      const defaultNotes = `# Scho gmacht?
 - 👧 : nei
 - 👨 : nei

# Notize
`;
      await fsp.writeFile(notesPath, defaultNotes, 'utf8');
    }
    
    // Create default metadata.json file
    const metadataPath = path.join(trackDir, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      const defaultMetadata = {
        folder: "",
        notes: ""
      };
      await fsp.writeFile(metadataPath, JSON.stringify(defaultMetadata, null, 2), 'utf8');
    }
    
    // Update the index.json to include the new track
    await updateTracksIndex();
    
    res.json({ 
      ok: true, 
      message: `GPX track "${trackName}" uploaded successfully`,
      trackName: trackName,
      originalFilename: req.file.originalname,
      extractedName: trackNameFromGPX
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ ok: false, message: 'Failed to upload file: ' + err.message });
  }
});

// Function to update tracks index.json
async function updateTracksIndex() {
  try {
    const files = await fsp.readdir(TRACKS_DIR, { withFileTypes: true });
    const trackDirs = files
      .filter(file => file.isDirectory())
      .map(file => file.name)
      .filter(name => !name.startsWith('.'));
    
    const indexPath = path.join(TRACKS_DIR, 'index.json');
    await fsp.writeFile(indexPath, JSON.stringify(trackDirs, null, 2), 'utf8');
    console.log('Updated tracks index.json with', trackDirs.length, 'tracks');
  } catch (err) {
    console.error('Failed to update tracks index:', err);
  }
}

// Delete track endpoint
app.delete('/delete-track', async (req, res) => {
  if (!(req.session && req.session.authenticated)) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }

  const { trackName } = req.body;
  if (!trackName) {
    return res.status(400).json({ ok: false, message: 'Track name is required' });
  }

  try {
    const trackDir = path.join(TRACKS_DIR, trackName);
    
    // Check if directory exists
    if (!fs.existsSync(trackDir)) {
      return res.status(404).json({ ok: false, message: 'Track not found' });
    }

    // Recursively delete the track directory
    await fsp.rm(trackDir, { recursive: true, force: true });
    
    // Update the index.json to remove the deleted track
    await updateTracksIndex();
    
    console.log(`Track "${trackName}" deleted successfully`);
    res.json({ 
      ok: true, 
      message: `Track "${trackName}" deleted successfully`
    });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ ok: false, message: 'Failed to delete track: ' + err.message });
  }
});

// Rename track endpoint
app.post('/rename-track', async (req, res) => {
  if (!(req.session && req.session.authenticated)) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }

  const { oldName, newName } = req.body;
  if (!oldName || !newName) {
    return res.status(400).json({ ok: false, message: 'Both old and new track names are required' });
  }

  if (oldName === newName) {
    return res.status(400).json({ ok: false, message: 'New name must be different from old name' });
  }

  try {
    const oldTrackDir = path.join(TRACKS_DIR, oldName);
    const newTrackDir = path.join(TRACKS_DIR, newName);
    
    // Check if old directory exists
    if (!fs.existsSync(oldTrackDir)) {
      return res.status(404).json({ ok: false, message: 'Track not found' });
    }

    // Check if new directory already exists
    if (fs.existsSync(newTrackDir)) {
      return res.status(409).json({ ok: false, message: 'A track with the new name already exists' });
    }

    // Clean the new name (same logic as upload)
    let cleanNewName = newName.replace('\u2013', '-');
    cleanNewName = cleanNewName.replace(/[^\w\s,_\-()]/g, '');
    cleanNewName = cleanNewName.trim();

    const finalTrackDir = path.join(TRACKS_DIR, cleanNewName);

    // Rename the directory
    await fsp.rename(oldTrackDir, finalTrackDir);
    
    // Rename the GPX file inside the directory
    const oldGpxPath = path.join(finalTrackDir, `${oldName}.gpx`);
    const newGpxPath = path.join(finalTrackDir, `${cleanNewName}.gpx`);
    
    if (fs.existsSync(oldGpxPath)) {
      await fsp.rename(oldGpxPath, newGpxPath);
    }

    // Update the name in the GPX file metadata
    if (fs.existsSync(newGpxPath)) {
      try {
        const gpxContent = await fsp.readFile(newGpxPath, 'utf8');
        const parser = new DOMParser();
        const doc = parser.parseFromString(gpxContent, 'text/xml');
        
        const nameElement = doc.getElementsByTagName('name')[0];
        if (nameElement && nameElement.firstChild) {
          nameElement.firstChild.nodeValue = cleanNewName;
          
          // Convert back to string and save
          const serializer = new (require('xmldom').XMLSerializer)();
          const updatedGpxContent = serializer.serializeToString(doc);
          await fsp.writeFile(newGpxPath, updatedGpxContent, 'utf8');
        }
      } catch (gpxUpdateError) {
        console.warn('Failed to update GPX metadata:', gpxUpdateError);
        // Don't fail the rename operation if GPX update fails
      }
    }
    
    // Update the index.json
    await updateTracksIndex();
    
    console.log(`Track renamed from "${oldName}" to "${cleanNewName}"`);
    res.json({ 
      ok: true, 
      message: `Track renamed from "${oldName}" to "${cleanNewName}"`,
      newName: cleanNewName
    });
  } catch (err) {
    console.error('Rename error:', err);
    res.status(500).json({ ok: false, message: 'Failed to rename track: ' + err.message });
  }
});

// Serve static assets
app.use(express.static(path.join(ROOT, 'public')));
app.use(express.static(ROOT)); // For main app files like index.html

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
