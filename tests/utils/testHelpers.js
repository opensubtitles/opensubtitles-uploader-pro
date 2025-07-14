/**
 * Test utilities for file matching tests
 */

/**
 * Create a mock file object with all required properties
 */
export const createMockFile = (name, path, options = {}) => {
  const fullPath = path ? `${path}/${name}` : name;
  
  return {
    name,
    fullPath,
    size: options.size || 1024,
    type: options.type || 'application/octet-stream',
    lastModified: options.lastModified || Date.now(),
    isVideo: options.isVideo || false,
    isSubtitle: options.isSubtitle || false,
    isMedia: options.isMedia || options.isVideo || options.isSubtitle || false,
    shouldRemove: options.shouldRemove || false,
    movieHash: options.movieHash || null,
    detectedLanguage: options.detectedLanguage || null,
    ...options
  };
};

/**
 * Create mock video file
 */
export const createMockVideoFile = (name, path, options = {}) => {
  return createMockFile(name, path, {
    ...options,
    isVideo: true,
    isMedia: true,
    type: 'video/mp4'
  });
};

/**
 * Create mock subtitle file
 */
export const createMockSubtitleFile = (name, path, options = {}) => {
  return createMockFile(name, path, {
    ...options,
    isSubtitle: true,
    isMedia: true,
    type: 'text/plain'
  });
};

/**
 * Create a complete file structure for testing
 */
export const createFileStructure = (structure) => {
  const files = [];
  
  const processStructure = (items, basePath = '') => {
    for (const [key, value] of Object.entries(items)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // This is a directory
        const dirPath = basePath ? `${basePath}/${key}` : key;
        processStructure(value, dirPath);
      } else if (Array.isArray(value)) {
        // This is a list of files
        const dirPath = basePath ? `${basePath}/${key}` : key;
        value.forEach(fileName => {
          const isVideo = fileName.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v|mpg|mpeg|3gp|ts|vob|ogv)$/i);
          const isSubtitle = fileName.match(/\.(srt|vtt|ass|ssa|sub|smi|mpl|tmp|txt)$/i);
          
          files.push(createMockFile(fileName, dirPath, {
            isVideo: !!isVideo,
            isSubtitle: !!isSubtitle,
            isMedia: !!(isVideo || isSubtitle)
          }));
        });
      } else if (value === null) {
        // This is a single file with null value (placeholder)
        const filePath = basePath || '';
        const isVideo = key.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v|mpg|mpeg|3gp|ts|vob|ogv)$/i);
        const isSubtitle = key.match(/\.(srt|vtt|ass|ssa|sub|smi|mpl|tmp|txt)$/i);
        
        files.push(createMockFile(key, filePath, {
          isVideo: !!isVideo,
          isSubtitle: !!isSubtitle,
          isMedia: !!(isVideo || isSubtitle)
        }));
      } else {
        // This is a single file
        const filePath = basePath || '';
        const isVideo = value.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v|mpg|mpeg|3gp|ts|vob|ogv)$/i);
        const isSubtitle = value.match(/\.(srt|vtt|ass|ssa|sub|smi|mpl|tmp|txt)$/i);
        
        files.push(createMockFile(value, filePath, {
          isVideo: !!isVideo,
          isSubtitle: !!isSubtitle,
          isMedia: !!(isVideo || isSubtitle)
        }));
      }
    }
  };
  
  processStructure(structure);
  return files;
};

/**
 * Sample subtitle content for testing content detection
 */
export const SAMPLE_SUBTITLE_CONTENT = {
  srt: `1
00:00:01,000 --> 00:00:05,000
Hello world!

2
00:00:06,000 --> 00:00:10,000
This is a test subtitle.`,

  vtt: `WEBVTT

00:00:01.000 --> 00:00:05.000
Hello world!

00:00:06.000 --> 00:00:10.000
This is a test subtitle.`,

  ass: `[Script Info]
Title: Test
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello world!`,

  txt: `This is just a regular text file.
It has multiple lines.
But no time codes.
So it should not be detected as a subtitle.`,

  txtSubtitle: `1
00:00:01,000 --> 00:00:05,000
Hello world!

2
00:00:06,000 --> 00:00:10,000
This is a subtitle in a .txt file.`
};

/**
 * Common test scenarios for file matching
 */
export const TEST_SCENARIOS = {
  simple: {
    'Movie.mp4': null,
    'Movie.srt': null
  },
  
  languageVariants: {
    'Movie.mp4': null,
    'Movie.en.srt': null,
    'Movie.fr.srt': null,
    'Movie.de.srt': null
  },
  
  subdirectories: {
    'Movie.mp4': null,
    'Subs': ['Movie.srt', 'Movie.en.srt', 'Movie.fr.srt']
  },
  
  nestedStructure: {
    'Movie Title (2023)': {
      'Movie.Title.2023.mp4': null,
      'Subtitles': ['English.srt', 'French.srt', 'German.srt']
    }
  },
  
  complexYTS: {
    'The Matrix (1999) [1080p] [BluRay] [YTS.MX]': {
      'The.Matrix.1999.1080p.BluRay.YTS.MX.mp4': null,
      'Subs': [
        'English.srt',
        'French.srt', 
        'German.srt',
        'Spanish.srt',
        'Chinese (Simplified).chi.srt',
        'Chinese (Traditional).chi.srt'
      ]
    }
  },
  
  multipleMovies: {
    'Season 1': {
      'S01E01.mp4': null,
      'S01E01.srt': null,
      'S01E02.mp4': null,
      'S01E02.srt': null
    }
  },
  
  textFiles: {
    'Movie.mp4': null,
    'Movie.txt': null,
    'README.txt': null,
    'Movie.subtitle.txt': null
  }
};

/**
 * Assert that a pair matches expected structure
 */
export const assertPairMatch = (pair, expectedVideoName, expectedSubtitleNames) => {
  if (!pair) {
    throw new Error('Pair is null or undefined');
  }
  
  if (!pair.video) {
    throw new Error('Pair has no video file');
  }
  
  if (pair.video.name !== expectedVideoName) {
    throw new Error(`Expected video name "${expectedVideoName}", got "${pair.video.name}"`);
  }
  
  if (!Array.isArray(pair.subtitles)) {
    throw new Error('Pair subtitles is not an array');
  }
  
  if (pair.subtitles.length !== expectedSubtitleNames.length) {
    throw new Error(`Expected ${expectedSubtitleNames.length} subtitles, got ${pair.subtitles.length}`);
  }
  
  const actualSubtitleNames = pair.subtitles.map(s => s.name).sort();
  const expectedSorted = [...expectedSubtitleNames].sort();
  
  for (let i = 0; i < expectedSorted.length; i++) {
    if (actualSubtitleNames[i] !== expectedSorted[i]) {
      throw new Error(`Expected subtitle "${expectedSorted[i]}", got "${actualSubtitleNames[i]}"`);
    }
  }
};

/**
 * Run a test scenario and return results
 */
export const runTestScenario = (scenario, pairFunction) => {
  const files = createFileStructure(scenario);
  const pairs = pairFunction(files);
  
  return {
    files,
    pairs,
    videoCount: files.filter(f => f.isVideo).length,
    subtitleCount: files.filter(f => f.isSubtitle).length,
    pairCount: pairs.length
  };
};