const express = require('express');
const multer = require('multer');
const path = require('path');
const Database = require('better-sqlite3');
const cors = require('cors');
const fs = require('fs');
const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Initialize SQLite database
const db = new Database('photos.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    category TEXT,
    caption TEXT
  )
`);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.post('/api/upload', upload.single('photo'), (req, res) => {
  const { category, caption } = req.body;
  const filename = req.file.filename;
  const stmt = db.prepare('INSERT INTO photos (filename, category, caption) VALUES (?, ?, ?)');
  try {
    stmt.run(filename, category, caption);
    res.json({ message: 'Photo uploaded successfully', filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/photos', (req, res) => {
  try {
    const photos = db.prepare('SELECT * FROM photos').all();
    res.json(photos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/photos/:id', (req, res) => {
  const photoId = req.params.id;
  try {
    const photo = db.prepare('SELECT filename FROM photos WHERE id = ?').get(photoId);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    const filePath = path.join(__dirname, 'uploads', photo.filename);
    fs.unlink(filePath, (fsErr) => {
      // Ignore file not found error, continue to delete DB record
      const stmt = db.prepare('DELETE FROM photos WHERE id = ?');
      stmt.run(photoId);
      res.json({ message: 'Photo deleted successfully' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 