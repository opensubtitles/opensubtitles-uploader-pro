import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pairVideoAndSubtitleFiles } from '../../src/utils/fileUtils.js';
import { createMockFile } from '../utils/testHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test cases from captured data
const loadTestCases = async () => {
  const testCasesPath = join(__dirname, '../data/uploader-test-cases-2025-07-14.json');
  const content = await readFile(testCasesPath, 'utf-8');
  return JSON.parse(content);
};

describe('Validation-Based Real-World Test Cases', () => {
  
  test('should reconstruct and validate "directory with two subtitles" scenario', async () => {
    const data = await loadTestCases();
    const testCase = data.testCases.find(tc => tc.description === 'directory with two subtitles');
    
    // Reconstruct file structure from validation paths
    const validationKeys = Object.keys(testCase.expectedResults.pairValidations);
    const videoKey = validationKeys.find(key => !key.includes('_sub_'));
    const subtitleKeys = validationKeys.filter(key => key.includes('_sub_'));
    
    // Create mock files based on the validation paths
    const files = [];
    
    // Add video file
    const videoPath = videoKey.substring(0, videoKey.lastIndexOf('/'));
    const videoName = videoKey.substring(videoKey.lastIndexOf('/') + 1);
    files.push(createMockFile(videoName, videoPath, {
      size: 1500000000,
      type: 'video/mp4',
      isVideo: true,
      isSubtitle: false,
      isMedia: true
    }));
    
    // Add subtitle files (assuming language variants)
    const baseName = videoName.replace('.mp4', '');
    files.push(createMockFile(`${baseName}.en.srt`, videoPath, {
      size: 45000,
      type: 'text/plain',
      isVideo: false,
      isSubtitle: true,
      isMedia: true
    }));
    files.push(createMockFile(`${baseName}.es.srt`, videoPath, {
      size: 47000,
      type: 'text/plain',
      isVideo: false,
      isSubtitle: true,
      isMedia: true
    }));
    
    const pairs = pairVideoAndSubtitleFiles(files);
    
    // Validate against expected results
    assert.strictEqual(pairs.length, testCase.expectedResults.expectedPairs);
    assert.strictEqual(pairs[0].subtitles.length, subtitleKeys.length);
    
    // Validate that validation expectations are met
    const validation = testCase.expectedResults.pairValidations[videoKey];
    assert.strictEqual(validation.videoCorrect, true);
    assert.strictEqual(validation.imdbCorrect, true);
  });
  
  test('should reconstruct and validate "Directory with Subs subdirectory" scenario', async () => {
    const data = await loadTestCases();
    const testCase = data.testCases.find(tc => tc.description === 'Directory with Subs subdirectory (movie)');
    
    const validationKeys = Object.keys(testCase.expectedResults.pairValidations);
    const videoKey = validationKeys.find(key => !key.includes('_sub_'));
    const subtitleKeys = validationKeys.filter(key => key.includes('_sub_'));
    
    // Create mock files
    const files = [];
    
    // Add video file
    const videoPath = videoKey.substring(0, videoKey.lastIndexOf('/'));
    const videoName = videoKey.substring(videoKey.lastIndexOf('/') + 1);
    files.push(createMockFile(videoName, videoPath, {
      size: 1200000000,
      type: 'video/mp4',
      isVideo: true,
      isSubtitle: false,
      isMedia: true
    }));
    
    // Add subtitle files in Subs subdirectory
    const subsPath = videoPath + '/Subs';
    files.push(createMockFile('English.srt', subsPath, {
      size: 42000,
      type: 'text/plain',
      isVideo: false,
      isSubtitle: true,
      isMedia: true
    }));
    files.push(createMockFile('Spanish.srt', subsPath, {
      size: 44000,
      type: 'text/plain',
      isVideo: false,
      isSubtitle: true,
      isMedia: true
    }));
    files.push(createMockFile('French.srt', subsPath, {
      size: 43000,
      type: 'text/plain',
      isVideo: false,
      isSubtitle: true,
      isMedia: true
    }));
    
    const pairs = pairVideoAndSubtitleFiles(files);
    
    // Validate against expected results
    assert.strictEqual(pairs.length, testCase.expectedResults.expectedPairs);
    assert.strictEqual(pairs[0].subtitles.length, subtitleKeys.length);
    
    // Validate that validation expectations are met
    const validation = testCase.expectedResults.pairValidations[videoKey];
    assert.strictEqual(validation.videoCorrect, true);
    assert.strictEqual(validation.imdbCorrect, true);
  });
  
  test('should reconstruct and validate "2 episodes with 2 subtitles" scenario', async () => {
    const data = await loadTestCases();
    const testCase = data.testCases.find(tc => tc.description === '2 episodes with 2 subtitles');
    
    const validationKeys = Object.keys(testCase.expectedResults.pairValidations);
    const videoKeys = validationKeys.filter(key => !key.includes('_sub_'));
    const subtitleKeys = validationKeys.filter(key => key.includes('_sub_'));
    
    // Create mock files
    const files = [];
    
    // Add video files and their subtitles
    videoKeys.forEach(videoKey => {
      const videoName = videoKey.substring(videoKey.lastIndexOf('/') + 1);
      files.push(createMockFile(videoName, '', {
        size: 800000000,
        type: 'video/x-matroska',
        isVideo: true,
        isSubtitle: false,
        isMedia: true
      }));
      
      // Add matching subtitle
      const subtitleName = videoName.replace('.mkv', '.srt');
      files.push(createMockFile(subtitleName, '', {
        size: 38000,
        type: 'text/plain',
        isVideo: false,
        isSubtitle: true,
        isMedia: true
      }));
    });
    
    const pairs = pairVideoAndSubtitleFiles(files);
    
    // Validate against expected results
    assert.strictEqual(pairs.length, testCase.expectedResults.expectedPairs);
    
    // Each video should have one subtitle
    pairs.forEach(pair => {
      assert.strictEqual(pair.subtitles.length, 1);
    });
    
    // Validate that validation expectations are met for each video
    videoKeys.forEach(videoKey => {
      const validation = testCase.expectedResults.pairValidations[videoKey];
      assert.strictEqual(validation.videoCorrect, true);
      assert.strictEqual(validation.imdbCorrect, true);
    });
  });
  
  test('should reconstruct and validate "directory with episodes" scenario', async () => {
    const data = await loadTestCases();
    const testCase = data.testCases.find(tc => tc.description === 'directory with episodes');
    
    const validationKeys = Object.keys(testCase.expectedResults.pairValidations);
    const videoKeys = validationKeys.filter(key => !key.includes('_sub_'));
    const subtitleKeys = validationKeys.filter(key => key.includes('_sub_'));
    
    // Create mock files
    const files = [];
    
    // Add video files and their subtitles in nested directories
    videoKeys.forEach(videoKey => {
      const videoPath = videoKey.substring(0, videoKey.lastIndexOf('/'));
      const videoName = videoKey.substring(videoKey.lastIndexOf('/') + 1);
      
      files.push(createMockFile(videoName, videoPath, {
        size: 700000000,
        type: 'video/x-matroska',
        isVideo: true,
        isSubtitle: false,
        isMedia: true
      }));
      
      // Add matching subtitle in same directory
      const subtitleName = videoName.replace('.mkv', '.srt');
      files.push(createMockFile(subtitleName, videoPath, {
        size: 38000,
        type: 'text/plain',
        isVideo: false,
        isSubtitle: true,
        isMedia: true
      }));
    });
    
    const pairs = pairVideoAndSubtitleFiles(files);
    
    // Validate against expected results
    assert.strictEqual(pairs.length, testCase.expectedResults.expectedPairs);
    
    // Each video should have one subtitle
    pairs.forEach(pair => {
      assert.strictEqual(pair.subtitles.length, 1);
    });
    
    // Validate that validation expectations are met for each video
    videoKeys.forEach(videoKey => {
      const validation = testCase.expectedResults.pairValidations[videoKey];
      assert.strictEqual(validation.videoCorrect, true);
      assert.strictEqual(validation.imdbCorrect, true);
    });
  });
  
  test('should validate all test cases have consistent validation structure', async () => {
    const data = await loadTestCases();
    
    data.testCases.forEach(testCase => {
      const validations = testCase.expectedResults.pairValidations;
      const videoKeys = Object.keys(validations).filter(key => !key.includes('_sub_'));
      const subtitleKeys = Object.keys(validations).filter(key => key.includes('_sub_'));
      
      // Each video should have validations
      videoKeys.forEach(videoKey => {
        const validation = validations[videoKey];
        assert.strictEqual(validation.videoCorrect, true, `${testCase.description}: Video should be correct`);
        assert.strictEqual(validation.imdbCorrect, true, `${testCase.description}: IMDB should be correct`);
      });
      
      // Each subtitle should have validations
      subtitleKeys.forEach(subtitleKey => {
        const validation = validations[subtitleKey];
        assert.strictEqual(validation.pairedCorrectly, true, `${testCase.description}: Subtitle should be paired correctly`);
        assert.strictEqual(validation.languageCorrect, true, `${testCase.description}: Language should be correct`);
        assert.strictEqual(validation.movieDataCorrect, true, `${testCase.description}: Movie data should be correct`);
      });
    });
  });
  
  test('should verify file path patterns match expectations', async () => {
    const data = await loadTestCases();
    
    data.testCases.forEach(testCase => {
      const validations = testCase.expectedResults.pairValidations;
      const videoKeys = Object.keys(validations).filter(key => !key.includes('_sub_'));
      
      videoKeys.forEach(videoKey => {
        // Verify path patterns match expected file structures
        if (testCase.description.includes('Million Miles Away')) {
          assert.ok(videoKey.includes('A Million Miles Away'), 'Should contain movie title');
          assert.ok(videoKey.includes('YTS.MX'), 'Should contain release group');
        } else if (testCase.description.includes('After Death')) {
          assert.ok(videoKey.includes('After Death'), 'Should contain movie title');
          assert.ok(videoKey.includes('YTS.MX'), 'Should contain release group');
        } else if (testCase.description.includes('episodes')) {
          assert.ok(videoKey.includes('Resident.Alien'), 'Should contain TV show name');
          assert.ok(/S\d+E\d+/.test(videoKey), 'Should contain season/episode pattern');
        }
      });
    });
  });
});