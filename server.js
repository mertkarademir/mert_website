const express = require('express');
const multer = require('multer');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
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
const db = new sqlite3.Database('photos.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT,
      category TEXT,
      caption TEXT
    )`);
  }
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.post('/api/upload', upload.single('photo'), (req, res) => {
  const { category, caption } = req.body;
  const filename = req.file.filename;
  db.run('INSERT INTO photos (filename, category, caption) VALUES (?, ?, ?)', [filename, category, caption], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Photo uploaded successfully', filename });
  });
});

app.get('/api/photos', (req, res) => {
  db.all('SELECT * FROM photos', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.delete('/api/photos/:id', (req, res) => {
  const photoId = req.params.id;
  db.get('SELECT filename FROM photos WHERE id = ?', [photoId], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    const filePath = path.join(__dirname, 'uploads', row.filename);
    fs.unlink(filePath, (fsErr) => {
      // Ignore file not found error, continue to delete DB record
      db.run('DELETE FROM photos WHERE id = ?', [photoId], (dbErr) => {
        if (dbErr) {
          return res.status(500).json({ error: dbErr.message });
        }
        res.json({ message: 'Photo deleted successfully' });
      });
    });
  });
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 