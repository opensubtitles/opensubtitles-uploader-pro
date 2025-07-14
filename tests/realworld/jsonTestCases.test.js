import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('JSON Test Cases Integration', () => {
  
  test('should load and validate test case JSON structure', async () => {
    const testCasesPath = join(__dirname, '../data/uploader-test-cases-2025-07-14.json');
    
    try {
      const content = await readFile(testCasesPath, 'utf-8');
      const data = JSON.parse(content);
      
      // Validate JSON structure
      assert.ok(data.version, 'Should have version field');
      assert.ok(data.exported, 'Should have exported timestamp');
      assert.ok(Array.isArray(data.testCases), 'Should have testCases array');
      
      // Validate each test case
      data.testCases.forEach((testCase, index) => {
        assert.ok(testCase.id, `Test case ${index} should have ID`);
        assert.ok(testCase.description, `Test case ${index} should have description`);
        assert.ok(testCase.timestamp, `Test case ${index} should have timestamp`);
        assert.ok(testCase.expectedResults, `Test case ${index} should have expectedResults`);
        assert.ok(typeof testCase.expectedResults.expectedPairs === 'number', `Test case ${index} should have expectedPairs number`);
      });
      
    } catch (error) {
      assert.fail(`Failed to load or parse test cases: ${error.message}`);
    }
  });
  
  test('should validate test case descriptions and expectations', async () => {
    const testCasesPath = join(__dirname, '../data/uploader-test-cases-2025-07-14.json');
    const content = await readFile(testCasesPath, 'utf-8');
    const data = JSON.parse(content);
    
    const expectedTestCases = [
      { description: 'directory with two subtitles', expectedPairs: 1 },
      { description: 'Directory with Subs subdirectory (movie)', expectedPairs: 1 },
      { description: '2 episodes with 2 subtitles', expectedPairs: 2 },
      { description: 'directory with episodes', expectedPairs: 2 }
    ];
    
    // Verify all expected test cases are present
    expectedTestCases.forEach(expected => {
      const testCase = data.testCases.find(tc => tc.description === expected.description);
      assert.ok(testCase, `Should find test case: ${expected.description}`);
      assert.strictEqual(testCase.expectedResults.expectedPairs, expected.expectedPairs, 
        `${expected.description} should expect ${expected.expectedPairs} pairs`);
    });
  });
  
  test('should validate test case validation data', async () => {
    const testCasesPath = join(__dirname, '../data/uploader-test-cases-2025-07-14.json');
    const content = await readFile(testCasesPath, 'utf-8');
    const data = JSON.parse(content);
    
    data.testCases.forEach(testCase => {
      const validations = testCase.expectedResults.pairValidations;
      assert.ok(validations, `Test case "${testCase.description}" should have pairValidations`);
      
      // Check that validations exist for expected pairs
      const validationKeys = Object.keys(validations);
      const videoValidations = validationKeys.filter(key => !key.includes('_sub_'));
      const subtitleValidations = validationKeys.filter(key => key.includes('_sub_'));
      
      assert.ok(videoValidations.length > 0, `Test case "${testCase.description}" should have video validations`);
      
      // For each video validation, check that it has the expected structure
      videoValidations.forEach(videoKey => {
        const validation = validations[videoKey];
        assert.ok(typeof validation.videoCorrect === 'boolean', `${videoKey} should have videoCorrect boolean`);
        assert.ok(typeof validation.imdbCorrect === 'boolean', `${videoKey} should have imdbCorrect boolean`);
      });
      
      // For each subtitle validation, check that it has the expected structure
      subtitleValidations.forEach(subtitleKey => {
        const validation = validations[subtitleKey];
        assert.ok(typeof validation.pairedCorrectly === 'boolean', `${subtitleKey} should have pairedCorrectly boolean`);
        assert.ok(typeof validation.languageCorrect === 'boolean', `${subtitleKey} should have languageCorrect boolean`);
        assert.ok(typeof validation.movieDataCorrect === 'boolean', `${subtitleKey} should have movieDataCorrect boolean`);
      });
    });
  });
  
  test('should validate file path patterns', async () => {
    const testCasesPath = join(__dirname, '../data/uploader-test-cases-2025-07-14.json');
    const content = await readFile(testCasesPath, 'utf-8');
    const data = JSON.parse(content);
    
    data.testCases.forEach(testCase => {
      const validations = testCase.expectedResults.pairValidations;
      const videoKeys = Object.keys(validations).filter(key => !key.includes('_sub_'));
      
      videoKeys.forEach(videoKey => {
        // Video keys should be valid file paths
        assert.ok(videoKey.length > 0, 'Video key should not be empty');
        assert.ok(videoKey.includes('.'), 'Video key should contain file extension');
        
        // Check for common video extensions
        const hasVideoExtension = ['.mp4', '.mkv', '.avi', '.mov', '.webm'].some(ext => 
          videoKey.toLowerCase().endsWith(ext)
        );
        assert.ok(hasVideoExtension, `${videoKey} should have video extension`);
      });
    });
  });
  
  test('should identify TV series vs movies from paths', async () => {
    const testCasesPath = join(__dirname, '../data/uploader-test-cases-2025-07-14.json');
    const content = await readFile(testCasesPath, 'utf-8');
    const data = JSON.parse(content);
    
    data.testCases.forEach(testCase => {
      const validations = testCase.expectedResults.pairValidations;
      const videoKeys = Object.keys(validations).filter(key => !key.includes('_sub_'));
      
      videoKeys.forEach(videoKey => {
        // Check if this looks like a TV series (contains season/episode pattern)
        const isTVSeries = /S\d+E\d+/i.test(videoKey);
        
        if (isTVSeries) {
          // TV series expectations
          assert.ok(videoKey.includes('Resident.Alien'), `TV series should be Resident Alien: ${videoKey}`);
        } else {
          // Movie expectations
          const isMovie = videoKey.includes('Million.Miles.Away') || videoKey.includes('After.Death');
          assert.ok(isMovie, `Should be a known movie: ${videoKey}`);
        }
      });
    });
  });
  
  test('should verify test case metadata', async () => {
    const testCasesPath = join(__dirname, '../data/uploader-test-cases-2025-07-14.json');
    const content = await readFile(testCasesPath, 'utf-8');
    const data = JSON.parse(content);
    
    // Check export metadata
    assert.strictEqual(data.version, '1.0');
    assert.ok(data.exported.includes('2025-07-14'), 'Should be exported on correct date');
    
    // Check test case metadata
    data.testCases.forEach(testCase => {
      assert.ok(testCase.id > 0, 'Should have valid ID');
      assert.ok(testCase.timestamp.includes('2025-07-14'), 'Should have correct timestamp');
      assert.strictEqual(testCase.status, 'saved', 'Should be saved status');
    });
  });
});