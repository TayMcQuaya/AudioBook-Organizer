const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const ffmpeg = require('fluent-ffmpeg');

// Export metadata to JSON
const exportMetadata = async (sections, outputPath) => {
    try {
        const metadata = sections.map((section, index) => ({
            label: section.label,
            text: section.text,
            audioPath: section.audioPath,
            status: section.status,
            duration: section.duration || null,
            order: index + 1
        }));

        await fs.writeJson(outputPath, metadata, { spaces: 2 });
        return { success: true, path: outputPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Copy audio files to a new folder with ordered naming
const exportAudioFiles = async (sections, outputDir) => {
    try {
        await fs.ensureDir(outputDir);
        
        const copyPromises = sections.map(async (section, index) => {
            const originalPath = section.audioPath;
            const extension = path.extname(originalPath);
            const newFileName = `${String(index + 1).padStart(3, '0')}_${section.label.replace(/[^a-zA-Z0-9]/g, '-')}${extension}`;
            const newPath = path.join(outputDir, newFileName);
            
            await fs.copy(originalPath, newPath);
            return newPath;
        });

        await Promise.all(copyPromises);
        return { success: true, path: outputDir };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Create ZIP archive of audio files
const createZipArchive = async (sections, outputPath) => {
    try {
        const tempDir = path.join(path.dirname(outputPath), 'temp_audio_files');
        await exportAudioFiles(sections, tempDir);

        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.pipe(output);
        archive.directory(tempDir, false);
        await archive.finalize();

        await fs.remove(tempDir);
        return { success: true, path: outputPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Merge audio files into single WAV with optional silence
const mergeAudioFiles = async (sections, outputPath, silenceSeconds = 0) => {
    try {
        const tempDir = path.join(path.dirname(outputPath), 'temp_merge_files');
        const { success, path: audioDir } = await exportAudioFiles(sections, tempDir);
        
        if (!success) throw new Error('Failed to prepare audio files');

        return new Promise((resolve, reject) => {
            const command = ffmpeg();
            
            // Add each audio file to the command
            fs.readdirSync(tempDir)
                .sort()
                .forEach(file => {
                    command.input(path.join(tempDir, file));
                    if (silenceSeconds > 0) {
                        command.input('anullsrc')
                            .inputOptions([
                                `-f lavfi`,
                                `-t ${silenceSeconds}`
                            ]);
                    }
                });

            command
                .on('end', async () => {
                    await fs.remove(tempDir);
                    resolve({ success: true, path: outputPath });
                })
                .on('error', async (err) => {
                    await fs.remove(tempDir);
                    reject({ success: false, error: err.message });
                })
                .mergeToFile(outputPath);
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
};

module.exports = {
    exportMetadata,
    exportAudioFiles,
    createZipArchive,
    mergeAudioFiles
}; 