const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const {
    exportMetadata,
    exportAudioFiles,
    createZipArchive,
    mergeAudioFiles
} = require('./exportUtils');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'uploads');
        fs.ensureDirSync(dir);
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Store sections in memory (in a real app, this would be a database)
let sections = [];

// API Endpoints
app.post('/api/sections', (req, res) => {
    const section = req.body;
    sections.push(section);
    res.json({ success: true, section });
});

app.get('/api/sections', (req, res) => {
    res.json(sections);
});

// Audio file upload endpoint
app.post('/api/upload/audio', upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    res.json({ 
        success: true, 
        path: filePath,
        filename: req.file.filename
    });
});

// Export endpoints
app.post('/api/export', async (req, res) => {
    const {
        exportMetadataFlag,
        exportAudioFlag,
        createZipFlag,
        mergeAudioFlag,
        silenceDuration,
        sections
    } = req.body;

    const results = {};
    const outputDir = path.join(__dirname, 'exports');
    await fs.ensureDir(outputDir);

    try {
        if (exportMetadataFlag) {
            const metadataPath = path.join(outputDir, 'metadata.json');
            results.metadata = await exportMetadata(sections, metadataPath);
        }

        if (exportAudioFlag) {
            const audioDir = path.join(outputDir, 'audio_clips');
            results.audioFiles = await exportAudioFiles(sections, audioDir);
        }

        if (createZipFlag) {
            const zipPath = path.join(outputDir, 'audio_clips.zip');
            results.zipArchive = await createZipArchive(sections, zipPath);
        }

        if (mergeAudioFlag) {
            const wavPath = path.join(outputDir, 'Final_Audiobook.wav');
            results.mergedAudio = await mergeAudioFiles(sections, wavPath, silenceDuration);
        }

        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create necessary directories
fs.ensureDirSync(path.join(__dirname, 'uploads'));
fs.ensureDirSync(path.join(__dirname, 'exports'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 