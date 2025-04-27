const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000;

// Initialize SQLite database
const db = new sqlite3.Database('photos.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    db.run(`
      CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        category TEXT,
        caption TEXT,
        uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Upload endpoint
app.post('/api/upload', upload.single('photo'), (req, res) => {
  const { category, caption } = req.body;
  const filename = req.file.filename;
  
  db.run(
    'INSERT INTO photos (filename, category, caption) VALUES (?, ?, ?)',
    [filename, category, caption],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ 
        success: true, 
        photo: {
          id: this.lastID,
          filename,
          category,
          caption
        }
      });
    }
  );
});

// Get all photos
app.get('/api/photos', (req, res) => {
  db.all('SELECT * FROM photos ORDER BY uploadDate DESC', [], (err, photos) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(photos);
  });
});

// Get photos by category
app.get('/api/photos/:category', (req, res) => {
  db.all(
    'SELECT * FROM photos WHERE category = ? ORDER BY uploadDate DESC',
    [req.params.category],
    (err, photos) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(photos);
    }
  );
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
