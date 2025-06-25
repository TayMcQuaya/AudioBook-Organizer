# 📚 AudioBook Organizer

Transform your text files into professional audiobooks with intelligent chapter organization, text-to-speech conversion, and powerful audio management tools.

## 🌟 Features

- 📖 Create and manage chapters with drag-and-drop organization
- 🎧 Upload and manage audio files for each section
- 🎯 Highlight and organize text into sections
- 🎵 Chapter-level audio player with section tracking
- 📦 Export/Import functionality for backup and sharing
- 🎨 Color-coded sections for easy visualization
- 📱 Responsive design for various screen sizes

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- FFmpeg (for audio processing)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/audiobook-organizer.git
cd audiobook-organizer
```

2. Install dependencies:
```bash
npm install
```

3. Install FFmpeg (if not already installed):

**Windows:**
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

4. Create required directories:
```bash
mkdir uploads exports
```

### Running the Application

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

## 📖 Usage Guide

### Creating Chapters

1. Click the "New Chapter" button to create a chapter
2. Double-click the chapter name to rename it
3. Use the collapse/expand arrow to manage chapter visibility

### Managing Sections

1. Select text in the book content area
2. Click "Create Section" in the selection tools
3. The section will be added to the current chapter
4. Drag and drop sections to reorder or move between chapters

### Audio Management

1. Click the upload button in a section to add audio
2. Supported formats: MP3, WAV
3. Use the chapter-level audio player to play all sections continuously
4. Individual section audio controls are also available

### Export/Import

1. Click the "Export" button to save your work
2. Options include:
   - Export metadata
   - Export audio files
   - Export book content
   - Create ZIP archive
   - Merge audio files

### Keyboard Shortcuts

- `Ctrl/Cmd + Z`: Undo last action
- `Ctrl/Cmd + Y`: Redo last action
- `Ctrl/Cmd + S`: Save current state
- `Space`: Play/Pause current chapter (when focused)

## 🛠️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
UPLOAD_FOLDER=uploads
EXPORT_FOLDER=exports
MAX_UPLOAD_SIZE=100mb
```

### Audio Processing Options

Edit `config.js` to customize audio processing:

```javascript
module.exports = {
  audio: {
    format: 'wav',
    sampleRate: 44100,
    channels: 2
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and development process.

## 📝 Project Structure

```
audiobook-organizer/
├── public/           # Static files
│   ├── index.html    # Main application HTML
│   └── styles/       # CSS files
├── uploads/          # Audio file uploads
├── exports/          # Exported files
├── server.py         # Main server file
└── exportUtils.js    # Export utilities
```

## ⚙️ Technical Details

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Python (Flask)
- **Audio Processing**: FFmpeg
- **File Management**: Node.js fs-extra
- **Compression**: archiver

## 🐛 Known Issues

1. Large audio files may take longer to process
2. Section reordering may require audio player refresh
3. Some browsers may have limited audio format support

## 🔜 Upcoming Features

- [ ] Multi-user support
- [ ] Cloud storage integration
- [ ] Advanced audio editing
- [ ] Collaborative editing
- [ ] Mobile app version

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- FFmpeg for audio processing
- Flask for the backend framework
- Contributors and testers

## 📞 Support

For support, please:
1. Check the [Issues](https://github.com/yourusername/audiobook-organizer/issues) page
2. Create a new issue if needed
3. Join our [Discord community](https://discord.gg/yourinvitelink)

---

Made with ❤️ by [Your Name/Organization] 


START LOCALLY:

python -m venv venv
.\venv\Scripts\Activate.ps1
(if not installed yet)
pip install -r requirements.txt
npm install 

python -m venv venv
.\venv\Scripts\Activate.ps1
npm start

OR BEST OPTION TO START:
python app.py


for stripe to listen locally:
.\stripe.exe listen --forward-to localhost:3000/api/stripe/webhook

Test card: 4242 4242 4242 4242 
every other field can be random 

<!-- Deployment trigger: 2025-06-26 -->