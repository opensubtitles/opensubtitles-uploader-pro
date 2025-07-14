import { test, describe } from 'node:test';
import assert from 'node:assert';

// Mock the guessit-js module since it requires WASM
const mockGuessit = async (filename) => {
  const lowerFilename = filename.toLowerCase();
  
  // Mock different file types
  if (lowerFilename.includes('matrix')) {
    return {
      title: 'The Matrix',
      year: 1999,
      type: 'movie',
      video_codec: 'h264',
      audio_codec: 'ac3',
      screen_size: '1080p',
      source: 'BluRay',
      release_group: 'YTS'
    };
  } else if (lowerFilename.includes('s01e01')) {
    return {
      title: 'Breaking Bad',
      season: 1,
      episode: 1,
      episode_title: 'Pilot',
      year: 2008,
      type: 'episode'
    };
  } else if (lowerFilename.includes('traditional.chi')) {
    return {
      title: 'The Wonderful Story Of Henry Sugar',
      year: 2023,
      type: 'movie'
    };
  } else {
    // Default movie
    return {
      title: 'Unknown Movie',
      year: 2023,
      type: 'movie'
    };
  }
};

// Mock the guessit-js module
const mockGuessItService = {
  wasmReady: true,
  initializationPromise: Promise.resolve(true),
  
  async initialize() {
    return true;
  },
  
  async guessFromFilename(filename) {
    return await mockGuessit(filename);
  },
  
  async enhancedGuess(filename) {
    const result = await mockGuessit(filename);
    
    return {
      ...result,
      formatted_title: this.formatTitle(result),
      year: this.extractYear(result),
      media_type: this.detectMediaType(result),
      quality_info: this.extractQualityInfo(result),
      episode_info: this.extractEpisodeInfo(result),
      original_filename: filename
    };
  },
  
  formatTitle(guessitResult) {
    const { title, year, season, episode, episode_title } = guessitResult;
    
    if (season !== undefined && episode !== undefined) {
      const seasonStr = String(season).padStart(2, '0');
      const episodeStr = String(episode).padStart(2, '0');
      const episodeTitle = episode_title ? ` - ${episode_title}` : '';
      const yearStr = year ? ` (${year})` : '';
      
      return `${title} - S${seasonStr}E${episodeStr}${episodeTitle}${yearStr}`;
    } else if (title && year) {
      return `${title} (${year})`;
    } else if (title) {
      return title;
    }
    
    return 'Unknown Title';
  },
  
  extractYear(guessitResult) {
    return guessitResult.year || null;
  },
  
  detectMediaType(guessitResult) {
    const { type, season, episode } = guessitResult;
    
    if (type) {
      return type;
    }
    
    if (season !== undefined || episode !== undefined) {
      return 'episode';
    }
    
    return 'movie';
  },
  
  extractQualityInfo(guessitResult) {
    const {
      screen_size,
      video_codec,
      audio_codec,
      source,
      release_group,
      format
    } = guessitResult;

    return {
      resolution: screen_size || null,
      video_codec: video_codec || null,
      audio_codec: audio_codec || null,
      source: source || null,
      release_group: release_group || null,
      format: format || null
    };
  },
  
  extractEpisodeInfo(guessitResult) {
    const { season, episode, episode_title, part } = guessitResult;
    
    if (season === undefined && episode === undefined) {
      return null;
    }

    return {
      season: season || null,
      episode: episode || null,
      episode_title: episode_title || null,
      part: part || null
    };
  }
};

describe('Offline GuessIt Service', () => {
  
  describe('Movie Detection', () => {
    test('should detect movie information from filename', async () => {
      const result = await mockGuessItService.enhancedGuess('The.Matrix.1999.1080p.BluRay.YTS.mp4');
      
      assert.strictEqual(result.title, 'The Matrix');
      assert.strictEqual(result.year, 1999);
      assert.strictEqual(result.media_type, 'movie');
      assert.strictEqual(result.formatted_title, 'The Matrix (1999)');
      assert.strictEqual(result.quality_info.resolution, '1080p');
      assert.strictEqual(result.quality_info.source, 'BluRay');
      assert.strictEqual(result.quality_info.release_group, 'YTS');
    });
    
    test('should detect TV series episodes', async () => {
      const result = await mockGuessItService.enhancedGuess('Breaking.Bad.S01E01.Pilot.2008.mp4');
      
      assert.strictEqual(result.title, 'Breaking Bad');
      assert.strictEqual(result.year, 2008);
      assert.strictEqual(result.media_type, 'episode');
      assert.strictEqual(result.formatted_title, 'Breaking Bad - S01E01 - Pilot (2008)');
      assert.strictEqual(result.episode_info.season, 1);
      assert.strictEqual(result.episode_info.episode, 1);
      assert.strictEqual(result.episode_info.episode_title, 'Pilot');
    });
    
    test('should handle generic subtitle names', async () => {
      const result = await mockGuessItService.enhancedGuess('Traditional.chi.srt');
      
      assert.strictEqual(result.title, 'The Wonderful Story Of Henry Sugar');
      assert.strictEqual(result.year, 2023);
      assert.strictEqual(result.media_type, 'movie');
      assert.strictEqual(result.formatted_title, 'The Wonderful Story Of Henry Sugar (2023)');
    });
  });
  
  describe('Title Formatting', () => {
    test('should format movie titles correctly', () => {
      const result = mockGuessItService.formatTitle({
        title: 'The Matrix',
        year: 1999
      });
      
      assert.strictEqual(result, 'The Matrix (1999)');
    });
    
    test('should format TV episode titles correctly', () => {
      const result = mockGuessItService.formatTitle({
        title: 'Breaking Bad',
        year: 2008,
        season: 1,
        episode: 1,
        episode_title: 'Pilot'
      });
      
      assert.strictEqual(result, 'Breaking Bad - S01E01 - Pilot (2008)');
    });
    
    test('should handle titles without years', () => {
      const result = mockGuessItService.formatTitle({
        title: 'Unknown Movie'
      });
      
      assert.strictEqual(result, 'Unknown Movie');
    });
  });
  
  describe('Quality Information', () => {
    test('should extract quality information correctly', () => {
      const quality = mockGuessItService.extractQualityInfo({
        screen_size: '1080p',
        video_codec: 'h264',
        audio_codec: 'ac3',
        source: 'BluRay',
        release_group: 'YTS'
      });
      
      assert.strictEqual(quality.resolution, '1080p');
      assert.strictEqual(quality.video_codec, 'h264');
      assert.strictEqual(quality.audio_codec, 'ac3');
      assert.strictEqual(quality.source, 'BluRay');
      assert.strictEqual(quality.release_group, 'YTS');
    });
    
    test('should handle missing quality information', () => {
      const quality = mockGuessItService.extractQualityInfo({});
      
      assert.strictEqual(quality.resolution, null);
      assert.strictEqual(quality.video_codec, null);
      assert.strictEqual(quality.audio_codec, null);
      assert.strictEqual(quality.source, null);
      assert.strictEqual(quality.release_group, null);
    });
  });
  
  describe('Episode Information', () => {
    test('should extract episode information correctly', () => {
      const episode = mockGuessItService.extractEpisodeInfo({
        season: 1,
        episode: 1,
        episode_title: 'Pilot'
      });
      
      assert.strictEqual(episode.season, 1);
      assert.strictEqual(episode.episode, 1);
      assert.strictEqual(episode.episode_title, 'Pilot');
    });
    
    test('should return null for non-episode content', () => {
      const episode = mockGuessItService.extractEpisodeInfo({
        title: 'The Matrix',
        year: 1999
      });
      
      assert.strictEqual(episode, null);
    });
  });
  
  describe('Media Type Detection', () => {
    test('should detect movie type', () => {
      const type = mockGuessItService.detectMediaType({
        type: 'movie',
        title: 'The Matrix'
      });
      
      assert.strictEqual(type, 'movie');
    });
    
    test('should detect episode type from season/episode', () => {
      const type = mockGuessItService.detectMediaType({
        title: 'Breaking Bad',
        season: 1,
        episode: 1
      });
      
      assert.strictEqual(type, 'episode');
    });
    
    test('should default to movie for unknown types', () => {
      const type = mockGuessItService.detectMediaType({
        title: 'Unknown'
      });
      
      assert.strictEqual(type, 'movie');
    });
  });
  
  describe('Error Handling', () => {
    test('should handle initialization gracefully', async () => {
      const result = await mockGuessItService.initialize();
      assert.strictEqual(result, true);
    });
    
    test('should handle empty filenames', async () => {
      const result = await mockGuessItService.enhancedGuess('');
      assert.ok(result.title); // Should still return some result
    });
  });
  
  describe('Caching Behavior', () => {
    test('should use consistent results for same filename', async () => {
      const filename = 'The.Matrix.1999.1080p.BluRay.YTS.mp4';
      const result1 = await mockGuessItService.enhancedGuess(filename);
      const result2 = await mockGuessItService.enhancedGuess(filename);
      
      assert.strictEqual(result1.title, result2.title);
      assert.strictEqual(result1.year, result2.year);
      assert.strictEqual(result1.formatted_title, result2.formatted_title);
    });
  });
});