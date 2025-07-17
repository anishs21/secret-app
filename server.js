const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const bodyParser = require('body-parser');

dotenv.config();
const app = express();

// Multer upload tem storage in 'uploads/' directory
const upload = multer({ dest: 'uploads/' });

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,        
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, 
  region: 'ap-south-1'
});


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'photo-video-app-secret',
  resave: false,
  saveUninitialized: false // 
}));

// Hardcoded user
const users = {
  admin: 'password123'
};

// Middleware for login protection
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/');
  }
  next();
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// GET login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// POST login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log("Login attempt:", username, password);

  if (users[username] && users[username] === password) {
    console.log("Login success");
    req.session.user = username;
    res.redirect('/dashboard');
  } else {
    console.log(" Login failed");
    res.send('Invalid credentials. <a href="/">Try again</a>');
  }
});

// GET dashboard (upload page)
app.get('/dashboard', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// POST file upload
app.post('/upload', requireLogin, upload.single('media'), (req, res) => {
  const fileContent = fs.readFileSync(req.file.path);
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: `${Date.now()}_${req.file.originalname}`,
    Body: fileContent
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error("S3 Upload Error:", err);
      return res.status(500).send("Failed to upload to S3.");
    }

    // Delete local uploaded file after upload
    fs.unlinkSync(req.file.path);

    res.send('Thanks for uploading your file!');
  });
});

// Logout (optional)
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Start server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
