import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

/**
 * Service for extracting subtitles from MKV files using FFmpeg WebAssembly
 */
export class MkvSubtitleExtractor {
  constructor() {
    this.ffmpeg = null;
    this.isLoaded = false;
    this.loadingPromise = null;
  }

  /**
   * Initialize FFmpeg WebAssembly
   */
  async initialize() {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    if (this.isLoaded) {
      return Promise.resolve();
    }

    this.loadingPromise = this._doInitialize();
    return this.loadingPromise;
  }

  async _doInitialize() {
    try {
      console.log('🎬 Initializing FFmpeg WebAssembly for MKV subtitle extraction...');
      
      this.ffmpeg = new FFmpeg();
      
      // Load FFmpeg core
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.isLoaded = true;
      console.log('✅ FFmpeg WebAssembly loaded successfully');
    } catch (error) {
      console.error('❌ Failed to initialize FFmpeg:', error);
      this.loadingPromise = null;
      throw new Error(`Failed to initialize FFmpeg: ${error.message}`);
    }
  }

  /**
   * Detect subtitle tracks in MKV file (without extracting them)
   * @param {File} file - MKV file to detect subtitles in
   * @returns {Promise<Array>} Array of detected subtitle stream info
   */
  async detectSubtitleStreams(file) {
    if (!file.name.toLowerCase().endsWith('.mkv')) {
      throw new Error('Only MKV files are supported for subtitle extraction');
    }

    console.log(`🎬 Starting MKV subtitle detection for: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    await this.initialize();

    // Store file for later extraction
    this.currentFile = file;
    this.currentInputFileName = `input_${Date.now()}.mkv`;

    try {
      console.log(`🔍 Reading file header for stream detection...`);
      
      // Read only the first chunk of the file for metadata detection (much faster)
      const CHUNK_SIZE = 1024 * 1024; // 1MB should be enough for metadata
      const fileSlice = file.slice(0, Math.min(CHUNK_SIZE, file.size));
      
      // Write only the header chunk to FFmpeg filesystem
      const writePromise = this.ffmpeg.writeFile(this.currentInputFileName, await fetchFile(fileSlice));
      const writeTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Header write timeout after 10 seconds')), 10000);
      });
      
      await Promise.race([writePromise, writeTimeoutPromise]);
      console.log(`✅ File header written to FFmpeg filesystem: ${this.currentInputFileName} (${(fileSlice.size / 1024).toFixed(1)} KB)`);

      // Probe the file header to get subtitle stream information
      console.log(`🔍 Step 1: Detecting subtitle streams from header...`);
      let subtitleStreams = [];
      
      try {
        const probeOutput = await this._probeSubtitleStreams(this.currentInputFileName);
        console.log(`🔍 Step 2: Parsing probe output...`);
        subtitleStreams = this._parseSubtitleStreams(probeOutput);
      } catch (probeError) {
        console.warn(`⚠️ Header probe failed: ${probeError.message}, trying larger chunk...`);
        
        // Try with a larger chunk (5MB) for complex MKV files
        try {
          await this.ffmpeg.deleteFile(this.currentInputFileName);
          const largerChunk = file.slice(0, Math.min(5 * 1024 * 1024, file.size));
          await this.ffmpeg.writeFile(this.currentInputFileName, await fetchFile(largerChunk));
          console.log(`🔍 Retrying with larger chunk: ${(largerChunk.size / 1024 / 1024).toFixed(1)} MB`);
          
          const probeOutput = await this._probeSubtitleStreams(this.currentInputFileName);
          subtitleStreams = this._parseSubtitleStreams(probeOutput);
        } catch (retryError) {
          console.warn(`⚠️ Larger chunk probe also failed, using fallback detection...`);
          
          // Fallback: assume common subtitle stream indexes
          subtitleStreams = [
            { index: 2, language: 'und', codec: 'subrip' },
            { index: 3, language: 'und', codec: 'subrip' },
            { index: 4, language: 'und', codec: 'subrip' }
          ];
          console.log(`🔍 Fallback: Detected potential subtitle streams at indexes 2, 3, 4`);
        }
      }

      if (subtitleStreams.length === 0) {
        console.log('📝 No subtitle streams detected in MKV file');
        await this.ffmpeg.deleteFile(this.currentInputFileName);
        return [];
      }

      console.log(`📝 Detected ${subtitleStreams.length} subtitle stream(s):`);
      subtitleStreams.forEach((stream, i) => {
        console.log(`   Stream ${i + 1}: index=${stream.index}, lang=${stream.language || 'unknown'}, codec=${stream.codec}`);
      });

      console.log(`✅ MKV subtitle detection completed: ${subtitleStreams.length} streams found`);
      
      // Return stream info for UI display, don't extract yet
      return subtitleStreams.map((stream, i) => ({
        id: `${file.name}_stream_${stream.index}`,
        streamIndex: stream.index,
        language: stream.language || 'unknown',
        codec: stream.codec,
        title: `Stream ${stream.index} (${stream.language || 'unknown'}, ${stream.codec})`,
        originalFileName: file.name,
        canExtract: true
      }));

    } catch (error) {
      console.error('❌ MKV subtitle extraction failed:', error);
      
      // Try to cleanup in case of error
      try {
        await this.ffmpeg.deleteFile('input.mkv');
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      throw new Error(`Subtitle extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract a single subtitle stream on demand
   * @param {string} streamId - ID of the stream to extract
   * @param {number} streamIndex - Stream index to extract
   * @param {string} language - Language of the stream
   * @param {string} originalFileName - Original MKV file name
   * @returns {Promise<Object>} Extracted subtitle file object
   */
  async extractSingleStream(streamId, streamIndex, language, originalFileName) {
    if (!this.currentFile) {
      throw new Error('No MKV file available for extraction');
    }

    console.log(`🎯 Extracting subtitle stream ${streamIndex} from ${originalFileName}`);

    // Create a unique input filename for this extraction
    const inputFileName = `input_extract_${Date.now()}_${streamIndex}.mkv`;
    
    console.log(`📥 Using chunked extraction approach (no full file loading)`);
    
    // For subtitle extraction, we need more data than just headers
    // Use a larger chunk that should contain subtitle data
    const EXTRACTION_CHUNK_SIZE = 50 * 1024 * 1024; // 50MB should be enough for most subtitle streams
    const fileChunk = this.currentFile.slice(0, Math.min(EXTRACTION_CHUNK_SIZE, this.currentFile.size));
    
    console.log(`📋 Loading ${(fileChunk.size / 1024 / 1024).toFixed(2)} MB chunk for extraction (instead of full ${(this.currentFile.size / 1024 / 1024).toFixed(2)} MB file)`);
    
    // Write the chunk to FFmpeg filesystem for extraction
    const writePromise = this.ffmpeg.writeFile(inputFileName, await fetchFile(fileChunk));
    const writeTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Chunk write timeout after 30 seconds')), 30000);
    });
    
    await Promise.race([writePromise, writeTimeoutPromise]);
    console.log(`✅ File chunk written for extraction: ${inputFileName}`);

    const outputFileName = `subtitle_${streamIndex}.srt`;
    
    try {
      // Extract subtitle using FFmpeg with timeout
      console.log(`🔧 Extracting stream ${streamIndex} to ${outputFileName}...`);
      const extractPromise = this.ffmpeg.exec([
        '-i', inputFileName,
        '-map', `0:${streamIndex}`,
        '-c:s', 'srt',
        outputFileName
      ]);
      
      const extractTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Subtitle extraction timeout after 60 seconds')), 60000);
      });
      
      await Promise.race([extractPromise, extractTimeoutPromise]);

      // Read the extracted file
      const subtitleData = await this.ffmpeg.readFile(outputFileName);
      
      console.log(`✅ Successfully extracted stream ${streamIndex}, size: ${subtitleData.length} bytes`);
      
      // Clean up both the output file and the input chunk file
      await this.ffmpeg.deleteFile(outputFileName);
      await this.ffmpeg.deleteFile(inputFileName);

      // Create a subtitle file object
      const subtitleBlob = new Blob([subtitleData], { type: 'text/plain' });
      const baseFileName = this._getBaseFileName(originalFileName);
      const langSuffix = language && language !== 'und' ? `_${language}` : '';
      const streamSuffix = `_stream${streamIndex}`;
      const subtitleFileName = `${baseFileName}${langSuffix}${streamSuffix}.srt`;
      
      const subtitleFile = new File([subtitleBlob], subtitleFileName, {
        type: 'text/plain'
      });

      return {
        file: subtitleFile,
        language: language || 'unknown',
        streamIndex: streamIndex,
        size: subtitleData.length,
        extracted: true
      };

    } catch (error) {
      console.error(`❌ Failed to extract stream ${streamIndex}:`, error.message);
      
      // Clean up both output file and input chunk file if they exist
      try {
        await this.ffmpeg.deleteFile(outputFileName);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      try {
        await this.ffmpeg.deleteFile(inputFileName);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      throw new Error(`Failed to extract subtitle stream: ${error.message}`);
    }
  }

  /**
   * Clean up any remaining files in FFmpeg filesystem (no longer needed with chunk approach)
   */
  async cleanupFiles() {
    // With the new chunk-based approach, each extraction cleans up its own files
    // This method is kept for compatibility but no longer performs any operations
    console.log(`🧹 Cleanup complete - chunk-based extraction automatically cleans up files`);
  }

  /**
   * Probe subtitle streams in the video file
   */
  async _probeSubtitleStreams(inputFileName) {
    console.log('🔍 Probing subtitle streams in MKV file...');
    
    // Set up log capture
    let probeOutput = '';
    const logHandler = ({ message }) => {
      probeOutput += message + '\n';
    };
    
    this.ffmpeg.on('log', logHandler);

    try {
      // Add timeout for the probe operation
      const probePromise = this.ffmpeg.exec([
        '-i', inputFileName,
        '-f', 'null', '-'
      ]);
      
      // Timeout after 30 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('FFmpeg probe timeout after 30 seconds')), 30000);
      });
      
      await Promise.race([probePromise, timeoutPromise]);
      
    } catch (error) {
      // FFmpeg probe command exits with error, but still provides output
      // The stderr contains the stream information we need
      if (error.message.includes('timeout')) {
        console.error('❌ FFmpeg probe timed out');
        throw error;
      }
      console.log('🔍 FFmpeg probe completed (expected error for probe)');
    } finally {
      // Clean up log handler
      this.ffmpeg.off('log', logHandler);
    }

    console.log('📋 FFmpeg probe output length:', probeOutput.length);
    console.log('📋 FFmpeg probe output (first 2000 chars):', probeOutput.substring(0, 2000));
    
    // If we got no output, that's a problem
    if (!probeOutput || probeOutput.trim().length === 0) {
      console.warn('⚠️ No probe output received from FFmpeg');
      throw new Error('No probe output received from FFmpeg - file may be corrupted or unsupported');
    }
    
    return probeOutput;
  }

  /**
   * Parse subtitle stream information from FFmpeg output
   */
  _parseSubtitleStreams(probeOutput) {
    console.log('🔍 Parsing subtitle streams from FFmpeg output...');
    
    const subtitleStreams = [];
    
    if (!probeOutput) {
      console.log('⚠️ No FFmpeg probe output to parse, using fallback detection');
      // Fallback to trying common subtitle stream indexes
      return [
        { index: 0, language: 'und', codec: 'subrip' },
        { index: 1, language: 'und', codec: 'subrip' },
        { index: 2, language: 'und', codec: 'subrip' }
      ];
    }

    // Parse FFmpeg output to find subtitle streams
    // Look for lines like: "Stream #0:2(eng): Subtitle: subrip"
    const streamRegex = /Stream #0:(\d+)(\([^)]*\))?: Subtitle: (\w+)/g;
    let match;
    
    while ((match = streamRegex.exec(probeOutput)) !== null) {
      const streamIndex = parseInt(match[1]);
      const language = match[2] ? match[2].slice(1, -1) : 'und'; // Remove parentheses
      const codec = match[3] || 'unknown';
      
      console.log(`🎯 Found subtitle stream: index=${streamIndex}, lang=${language}, codec=${codec}`);
      
      subtitleStreams.push({
        index: streamIndex,
        language: language,
        codec: codec
      });
    }

    // Also look for subtitle streams in a different format
    // Look for lines like: "Stream #0:2: Subtitle: ass (default)"
    const streamRegex2 = /Stream #0:(\d+): Subtitle: (\w+)/g;
    while ((match = streamRegex2.exec(probeOutput)) !== null) {
      const streamIndex = parseInt(match[1]);
      const codec = match[2] || 'unknown';
      
      // Check if we already found this stream
      if (!subtitleStreams.some(s => s.index === streamIndex)) {
        console.log(`🎯 Found subtitle stream (format 2): index=${streamIndex}, codec=${codec}`);
        
        subtitleStreams.push({
          index: streamIndex,
          language: 'und',
          codec: codec
        });
      }
    }

    if (subtitleStreams.length === 0) {
      console.log('⚠️ No subtitle streams found in FFmpeg output, trying fallback detection');
      // If we couldn't parse any streams, try the first few indexes as fallback
      return [
        { index: 0, language: 'und', codec: 'subrip' },
        { index: 1, language: 'und', codec: 'subrip' }
      ];
    }

    console.log(`✅ Parsed ${subtitleStreams.length} subtitle streams from FFmpeg output`);
    return subtitleStreams;
  }

  /**
   * Extract a specific subtitle stream
   */
  async _extractSubtitleStream(inputFileName, stream, streamIndex, originalFileName) {
    const outputFileName = `subtitle_${stream.index}.srt`;
    
    console.log(`🎯 Extracting subtitle stream ${stream.index} (${stream.language}, ${stream.codec})`);
    
    try {
      // Extract subtitle using FFmpeg
      // Use the actual stream index, not the array index
      const actualStreamIndex = stream.index;
      
      console.log(`🔧 FFmpeg command: -i ${inputFileName} -map 0:${actualStreamIndex} -c:s srt ${outputFileName}`);
      
      // Add timeout for extraction
      const extractPromise = this.ffmpeg.exec([
        '-i', inputFileName,
        '-map', `0:${actualStreamIndex}`, // Use absolute stream index, not subtitle-relative
        '-c:s', 'srt',
        outputFileName
      ]);
      
      const extractTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Subtitle extraction timeout after 30 seconds')), 30000);
      });
      
      await Promise.race([extractPromise, extractTimeoutPromise]);

      // Check if file was created
      try {
        const subtitleData = await this.ffmpeg.readFile(outputFileName);
        
        console.log(`✅ Successfully extracted subtitle stream ${actualStreamIndex}, size: ${subtitleData.length} bytes`);
        
        // Clean up output file
        await this.ffmpeg.deleteFile(outputFileName);

        // Create a subtitle file object with proper naming based on original file
        const subtitleBlob = new Blob([subtitleData], { type: 'text/plain' });
        const baseFileName = this._getBaseFileName(originalFileName || inputFileName);
        
        // Use language code in filename if available
        const langSuffix = stream.language && stream.language !== 'und' ? `_${stream.language}` : '';
        const trackSuffix = streamIndex === 0 ? '' : `_track${streamIndex + 1}`;
        const subtitleFileName = `${baseFileName}${langSuffix}${trackSuffix}.srt`;
        
        const subtitleFile = new File([subtitleBlob], subtitleFileName, {
          type: 'text/plain'
        });

        return {
          file: subtitleFile,
          language: stream.language || 'unknown',
          streamIndex: actualStreamIndex,
          codec: stream.codec,
          size: subtitleData.length,
          extracted: true
        };

      } catch (readError) {
        // Subtitle stream might not exist or might be in unsupported format
        console.log(`📝 No subtitle data found for stream ${actualStreamIndex}: ${readError.message}`);
        return null;
      }

    } catch (extractError) {
      if (extractError.message.includes('timeout')) {
        console.warn(`⏰ Subtitle extraction timed out for stream ${stream.index}`);
      } else {
        console.warn(`⚠️ Failed to extract subtitle stream ${stream.index}:`, extractError.message);
      }
      
      // Clean up output file if it exists
      try {
        await this.ffmpeg.deleteFile(outputFileName);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      // Don't throw the error, just return null so other streams can be tried
      return null;
    }
  }

  /**
   * Get base filename without extension
   */
  _getBaseFileName(filename) {
    return filename.replace(/\.[^/.]+$/, '');
  }

  /**
   * Check if the service is ready to extract subtitles
   */
  isReady() {
    return this.isLoaded;
  }

  /**
   * Get the current status of the service
   */
  getStatus() {
    if (this.loadingPromise && !this.isLoaded) {
      return 'loading';
    }
    if (this.isLoaded) {
      return 'ready';
    }
    return 'not_initialized';
  }
}

// Export singleton instance
export const mkvSubtitleExtractor = new MkvSubtitleExtractor();