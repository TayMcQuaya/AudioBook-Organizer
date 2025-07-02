# Audio System - AudioBook Organizer

## Overview
The audio system handles:
1. Audio file upload and validation
2. Format conversion (MP3 → WAV)
3. Chapter and section audio management
4. Audio merging for export
5. File storage and cleanup

## Audio Upload Pipeline

### Upload Flow
```
1. File Selection
   frontend/js/modules/sections.js:handleAudioUpload()
   ↓
2. Upload Request
   POST /api/upload
   backend/routes/upload_routes.py:upload_audio()
   ↓
3. Audio Processing
   backend/services/audio_service.py:save_audio_file()
   ↓
4. Format Conversion
   backend/utils/audio_utils.py:convert_to_wav()
   ↓
5. Section Assignment
   frontend: Update section.audioPath
```

## Backend Audio Components

### Audio Service (`backend/services/audio_service.py`)
- **Lines**: 72
- **Key Functions**:
  - `save_audio_file()` - Handle file upload
  - `validate_audio_file()` - Check format/size
  - `generate_unique_filename()` - Prevent conflicts

### Audio Utilities (`backend/utils/audio_utils.py`)
- **Lines**: 88
- **Key Functions**:
  - `convert_to_wav()` - MP3/M4A to WAV conversion
  - `get_audio_duration()` - Duration calculation
  - `validate_audio_format()` - Format checking

### Upload Routes (`backend/routes/upload_routes.py`)
- **Lines**: 292
- **Endpoints**:
  - `POST /api/upload` - Audio file upload
  - File validation and storage
  - Credit consumption (2 credits)

## Audio Processing

### Supported Formats
| Format | Extension | Conversion | Notes |
|--------|-----------|------------|-------|
| MP3 | .mp3 | → WAV | Most common |
| WAV | .wav | None | Native format |
| M4A | .m4a | → WAV | Apple format |
| OGG | .ogg | → WAV | Open format |

### File Validation
```python
# backend/services/audio_service.py
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg']
UPLOAD_FOLDER = 'uploads/'

# Validation checks:
- File extension
- MIME type verification
- File size limits
- Audio codec support
```

### Format Conversion
```python
# Using pydub for conversion
from pydub import AudioSegment

def convert_to_wav(input_path, output_path):
    audio = AudioSegment.from_file(input_path)
    audio.export(output_path, format="wav")
```

## Frontend Audio Management

### Section Audio (`frontend/js/modules/sections.js`)
- **Lines**: 887
- **Audio Features**:
  - `attachAudioToSection()` - Link audio to text
  - `updateAudioDisplay()` - UI updates
  - `calculateTotalDuration()` - Chapter duration
  - `reorderSections()` - Maintain audio links

### Audio UI Components
```javascript
// Section with audio
{
  id: 'section-uuid',
  text: 'Section content...',
  audioPath: '/uploads/audio_123.wav',
  duration: 120.5,  // seconds
  chapterId: 'chapter-uuid'
}
```

### Chapter Audio Management
```javascript
// Chapter audio aggregation
function getChapterAudioFiles(chapterId) {
  return sections
    .filter(s => s.chapterId === chapterId)
    .filter(s => s.audioPath)
    .map(s => ({
      path: s.audioPath,
      duration: s.duration,
      order: s.order
    }));
}
```

## Export System

### Export Service (`backend/services/export_service.py`)
- **Lines**: 178
- **Key Functions**:
  - `create_audiobook_export()` - Main export
  - `merge_audio_files()` - Combine sections
  - `add_silence_between_sections()` - Gaps
  - `create_metadata_json()` - Export info

### Audio Merging Process
```python
def merge_audio_files(audio_files, silence_duration=1.0):
    combined = AudioSegment.empty()
    silence = AudioSegment.silent(duration=silence_duration * 1000)
    
    for audio_file in audio_files:
        audio = AudioSegment.from_file(audio_file)
        combined += audio + silence
    
    return combined
```

### Export Options
```javascript
// Export configuration
{
  format: 'mp3',           // or 'wav'
  includeAudio: true,      // or false for data only
  chapters: ['ch1', 'ch2'], // Selected chapters
  silenceDuration: 1.0,    // Seconds between sections
  metadata: {
    title: 'Book Title',
    author: 'Author Name',
    narrator: 'Narrator'
  }
}
```

## File Storage

### Directory Structure
```
uploads/
├── audio_20240101_123456_abc.wav
├── audio_20240101_123457_def.mp3
└── temp/
    └── processing files...

exports/
├── export_abc123/
│   ├── audiobook.mp3
│   ├── metadata.json
│   └── chapters/
│       ├── chapter_1.mp3
│       └── chapter_2.mp3
└── export_def456/
    └── audiobook.zip
```

### File Naming Convention
```python
# Unique filename generation
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
random_str = secrets.token_urlsafe(6)
filename = f"audio_{timestamp}_{random_str}{ext}"
```

### Cleanup System
```python
# backend/utils/file_cleanup.py
def cleanup_old_files():
    # Remove exports older than 24 hours
    # Remove orphaned uploads
    # Clear temp processing files
```

## Audio Player Integration

### Frontend Audio Controls
```javascript
// Basic audio player
const audio = new Audio(audioPath);
audio.controls = true;
audio.preload = 'metadata';

// Duration display
audio.addEventListener('loadedmetadata', () => {
  const duration = audio.duration;
  displayDuration(duration);
});
```

### Playback Features
- Play/pause per section
- Duration display
- Visual waveform (planned)
- Playback speed control (planned)

## Performance Optimization

### Upload Optimization
- Chunked uploads for large files
- Progress tracking
- Resume capability (planned)
- Parallel processing

### Processing Optimization
```python
# Stream processing for large files
def process_audio_stream(input_file):
    chunk_size = 1024 * 1024  # 1MB chunks
    with open(input_file, 'rb') as f:
        while chunk := f.read(chunk_size):
            process_chunk(chunk)
```

### Storage Optimization
- Compress WAV files
- Remove silent sections
- Optimize bit rates
- CDN integration (planned)

## Error Handling

### Common Audio Errors
| Error | Cause | Solution |
|-------|-------|----------|
| `UnsupportedFormat` | Invalid codec | Check supported formats |
| `FileTooLarge` | >100MB | Compress or split file |
| `ConversionFailed` | Corrupt file | Re-upload or convert locally |
| `StorageError` | Disk full | Check storage space |

### Error Recovery
```javascript
// Frontend error handling
async function uploadAudioWithRetry(file, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadAudio(file);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

## API Integration

### Upload Endpoint
```javascript
// Frontend upload
const formData = new FormData();
formData.append('file', audioFile);
formData.append('sectionId', sectionId);

const response = await fetch('/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Response Format
```json
{
  "success": true,
  "file_path": "/uploads/audio_20240101_123456_abc.wav",
  "duration": 120.5,
  "format": "wav",
  "size": 10485760
}
```

## Credits & Limits

### Credit Costs
- Audio upload: 2 credits
- Audio export: 5 credits (included in export)

### File Limits
- Max file size: 100MB
- Max duration: 60 minutes
- Supported formats: MP3, WAV, M4A, OGG

## Future Enhancements

### Planned Features
1. Audio editing (trim, split)
2. Noise reduction
3. Volume normalization
4. Multi-track support
5. Real-time streaming
6. Voice synthesis integration