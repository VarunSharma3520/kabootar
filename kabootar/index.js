const express = require('express');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const port = 3000;

// Middleware to serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));


// Multer setup to store files in "uploads" folder
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// Serve index.html at "/"
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Receive link and password and returns file which is uploaded
app.post('/reci', (req, res) => {
    let link = req.body.link;
    const password = req.body.password;

    if (!link) {
        return res.status(400).send('Link are required.');
    }
    if (!password) {
        return res.status(400).send('password are required.');
    }

    let id = null; // Declare id outside the try block

    // Extract UUID from the link (in format ?id=uuid)
    try {
        const url = new URL(link);
        id = url.searchParams.get('id'); // Extract UUID from the link query parameter

        if (!id) {
            return res.status(400).send('Invalid link format.');
        }
    } catch (err) {
        return res.status(400).send('Invalid link format.');
    }

    // Define the path to the data file
    const dataFile = path.join(__dirname, 'data.json');

    // Check if the data file exists
    if (!fs.existsSync(dataFile)) {
        return res.status(404).send('Data file not found.');
    }

    const data = JSON.parse(fs.readFileSync(dataFile));

    // Find the record that matches both UUID and password
    const record = data.find(entry => entry.uuid === id && entry.password === password);
    // console.log("recred:",record);

    if (!record) {
        return res.status(403).send('Invalid link or password.');
    }

    const filePath = path.join(__dirname, 'uploads', record.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found.');
    }

    // Send file with the original name
    res.download(filePath, record.filename, err => {
        if (err) {
            // console.error('Download error:', err);
            res.status(500).send('Error downloading file.');
        }
    });
});





// saves file to server and returns ok
// Handle file upload and password submission
app.post('/send', upload.single('file'), (req, res) => {
    const file = req.file;
    const password = req.body.password;

    if (!file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    if (!password) {
        return res.status(400).json({ message: 'No password provided.' });
    }

    const fileId = uuidv4(); // Generate unique ID for the file
    const entry = {
        uuid: fileId,
        filename: file.filename,
        password: password // Ideally, hash the password before saving
    };

    const dataFile = path.join(__dirname, 'data.json');
    let data = [];

    // Check if data.json exists, and read the existing entries
    try {
        if (fs.existsSync(dataFile)) {
            const raw = fs.readFileSync(dataFile);
            // Parse the existing data
            try {
                data = JSON.parse(raw);
            } catch (err) {
                data = [];
            }
        }

        // Push new file metadata to the array
        data.push(entry);

        // Write updated data to file
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

        // Send response with the generated UUID
        res.json({ message: 'File uploaded and data saved.', uuid: fileId });

    } catch (error) {
        // console.error('Error writing to data file:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});



// Start the server
app.listen(port, () => {
    console.log(`App is running on http://localhost:${port}`);
});
