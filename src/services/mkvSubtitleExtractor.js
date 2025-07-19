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
   * Extract subtitle tracks from MKV file
   * @param {File} file - MKV file to extract subtitles from
   * @returns {Promise<Array>} Array of extracted subtitle objects
   */
  async extractSubtitles(file) {
    if (!file.name.toLowerCase().endsWith('.mkv')) {
      throw new Error('Only MKV files are supported for subtitle extraction');
    }

    await this.initialize();

    try {
      console.log(`🎯 Starting subtitle extraction from: ${file.name}`);
      
      // Write input file to FFmpeg virtual filesystem
      const inputFileName = 'input.mkv';
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(file));

      // First, probe the file to get subtitle stream information
      const probeOutput = await this._probeSubtitleStreams(inputFileName);
      const subtitleStreams = this._parseSubtitleStreams(probeOutput);

      if (subtitleStreams.length === 0) {
        console.log('📝 No subtitle streams found in MKV file');
        return [];
      }

      console.log(`📝 Found ${subtitleStreams.length} subtitle stream(s)`);

      // Extract each subtitle stream
      const extractedSubtitles = [];
      for (let i = 0; i < subtitleStreams.length; i++) {
        const stream = subtitleStreams[i];
        try {
          const subtitle = await this._extractSubtitleStream(inputFileName, stream, i, file.name);
          if (subtitle) {
            extractedSubtitles.push(subtitle);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to extract subtitle stream ${i}:`, error);
        }
      }

      // Cleanup
      await this.ffmpeg.deleteFile(inputFileName);

      console.log(`✅ Successfully extracted ${extractedSubtitles.length} subtitle file(s)`);
      return extractedSubtitles;

    } catch (error) {
      console.error('❌ Subtitle extraction failed:', error);
      throw new Error(`Subtitle extraction failed: ${error.message}`);
    }
  }

  /**
   * Probe subtitle streams in the video file
   */
  async _probeSubtitleStreams(inputFileName) {
    try {
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-f', 'null', '-'
      ]);
    } catch (error) {
      // FFmpeg probe command exits with error, but still provides output
      // The stderr contains the stream information we need
    }

    // Get the probe output from FFmpeg logs
    return ''; // FFmpeg logs are handled internally, we'll parse differently
  }

  /**
   * Parse subtitle stream information from FFmpeg output
   */
  _parseSubtitleStreams(probeOutput) {
    // Since we can't easily capture FFmpeg output in WebAssembly,
    // we'll try to extract the first few subtitle streams that might exist
    // FFmpeg will fail gracefully if the stream doesn't exist
    return [
      { index: 0, language: 'und', codec: 'subrip' },
      { index: 1, language: 'und', codec: 'subrip' },
      { index: 2, language: 'und', codec: 'subrip' },
      { index: 3, language: 'und', codec: 'subrip' },
      { index: 4, language: 'und', codec: 'subrip' }
    ];
  }

  /**
   * Extract a specific subtitle stream
   */
  async _extractSubtitleStream(inputFileName, stream, streamIndex, originalFileName) {
    const outputFileName = `subtitle_${streamIndex}.srt`;
    
    try {
      // Extract subtitle using FFmpeg
      // Map subtitle stream and convert to SRT format
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-map', `0:s:${streamIndex}`,
        '-c:s', 'srt',
        outputFileName
      ]);

      // Check if file was created
      try {
        const subtitleData = await this.ffmpeg.readFile(outputFileName);
        
        // Clean up output file
        await this.ffmpeg.deleteFile(outputFileName);

        // Create a subtitle file object with proper naming based on original file
        const subtitleBlob = new Blob([subtitleData], { type: 'text/plain' });
        const baseFileName = this._getBaseFileName(originalFileName || inputFileName);
        const subtitleFileName = streamIndex === 0 
          ? `${baseFileName}.srt` 
          : `${baseFileName}_track${streamIndex + 1}.srt`;
        
        const subtitleFile = new File([subtitleBlob], subtitleFileName, {
          type: 'text/plain'
        });

        return {
          file: subtitleFile,
          language: stream.language || 'unknown',
          streamIndex: streamIndex,
          codec: stream.codec,
          size: subtitleData.length,
          extracted: true
        };

      } catch (readError) {
        // Subtitle stream might not exist or might be in unsupported format
        console.log(`📝 No subtitle found at stream index ${streamIndex}`);
        return null;
      }

    } catch (extractError) {
      console.warn(`⚠️ Failed to extract subtitle stream ${streamIndex}:`, extractError);
      throw extractError;
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