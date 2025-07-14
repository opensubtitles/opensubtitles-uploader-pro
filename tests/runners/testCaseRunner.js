import { test, describe } from 'node:test';
import assert from 'node:assert';
import { pairVideoAndSubtitleFiles } from '../../src/utils/fileUtils.js';
import { createMockFile } from '../utils/testHelpers.js';

/**
 * Test runner for captured test cases from the UI
 */
export const runCapturedTestCases = (testCases) => {
  describe('Captured Test Cases', () => {
    testCases.forEach((testCase) => {
      test(testCase.description, () => {
        // Recreate mock files from captured data
        const mockFiles = testCase.originalFiles.map(fileData => 
          createMockFile(fileData.name, extractPath(fileData.fullPath), {
            size: fileData.size,
            type: fileData.type,
            isVideo: fileData.isVideo,
            isSubtitle: fileData.isSubtitle,
            isMedia: fileData.isMedia,
            movieHash: fileData.movieHash,
            detectedLanguage: fileData.detectedLanguage,
            guessItData: fileData.guessItData,
            movieData: fileData.movieData,
            featuresData: fileData.featuresData
          })
        );

        // Run the pairing function
        const actualPairs = pairVideoAndSubtitleFiles(mockFiles);

        // Validate results against expected outcomes
        validateTestCase(testCase, actualPairs);
      });
    });
  });
};

/**
 * Validate a test case result against expected outcomes
 */
const validateTestCase = (testCase, actualPairs) => {
  const expected = testCase.expectedResults;
  
  // Check number of pairs
  if (expected.expectedPairs !== undefined) {
    assert.strictEqual(
      actualPairs.length, 
      expected.expectedPairs,
      `Expected ${expected.expectedPairs} pairs, got ${actualPairs.length}`
    );
  }

  // Check individual pair validations
  actualPairs.forEach((pair, index) => {
    const expectedPair = testCase.pairedFiles[index];
    if (!expectedPair) return;

    // Video validation
    const videoValidation = expected.pairValidations[pair.id];
    if (videoValidation?.videoCorrect === false) {
      // This test case expects the video to be incorrectly identified
      // We might want to add specific assertions here
    }

    // Subtitle validations
    pair.subtitles.forEach((subtitle, subIndex) => {
      const subValidation = expected.pairValidations[`${pair.id}_sub_${subIndex}`];
      
      if (subValidation?.pairedCorrectly === false) {
        assert.fail(`Subtitle ${subtitle.name} was not expected to be paired correctly`);
      }

      if (subValidation?.languageCorrect === false) {
        // Language detection test - would need actual language detection to validate
        console.warn(`Language detection for ${subtitle.name} may be incorrect`);
      }
    });
  });

  // Check for orphaned subtitles
  const orphanedSubtitles = testCase.originalFiles.filter(f => 
    f.isSubtitle && !actualPairs.some(p => 
      p.subtitles.some(s => s.fullPath === f.fullPath)
    )
  );

  // Log orphaned subtitles for manual review
  if (orphanedSubtitles.length > 0) {
    console.log(`Orphaned subtitles in test case "${testCase.description}":`, 
      orphanedSubtitles.map(s => s.name)
    );
  }
};

/**
 * Extract directory path from full path
 */
const extractPath = (fullPath) => {
  const lastSlash = fullPath.lastIndexOf('/');
  return lastSlash > 0 ? fullPath.substring(0, lastSlash) : '';
};

/**
 * Generate a test file from captured test cases
 */
export const generateTestFile = (testCases, outputPath) => {
  const testFileContent = `import { test, describe } from 'node:test';
import assert from 'node:assert';
import { pairVideoAndSubtitleFiles } from '../../src/utils/fileUtils.js';
import { createMockFile } from '../utils/testHelpers.js';

// Generated test file from captured test cases
// Generated on: ${new Date().toISOString()}

describe('Captured Real-World Test Cases', () => {
${testCases.map(testCase => generateTestCaseCode(testCase)).join('\n\n')}
});
`;

  return testFileContent;
};

/**
 * Generate test case code for a single test case
 */
const generateTestCaseCode = (testCase) => {
  const filesCode = testCase.originalFiles.map(file => `
    createMockFile('${file.name}', '${extractPath(file.fullPath)}', {
      size: ${file.size},
      type: '${file.type}',
      isVideo: ${file.isVideo},
      isSubtitle: ${file.isSubtitle},
      isMedia: ${file.isMedia}
    })`).join(',');

  return `  test('${testCase.description}', () => {
    // Test case captured on: ${new Date(testCase.timestamp).toLocaleDateString()}
    const files = [${filesCode}
    ];

    const pairs = pairVideoAndSubtitleFiles(files);
    
    // Expected ${testCase.expectedResults.expectedPairs || testCase.pairedFiles.length} pairs
    assert.strictEqual(pairs.length, ${testCase.expectedResults.expectedPairs || testCase.pairedFiles.length});
    
    // Additional validations based on captured data
    ${generateValidationCode(testCase)}
  });`;
};

/**
 * Generate validation code for a test case
 */
const generateValidationCode = (testCase) => {
  const validations = [];

  testCase.pairedFiles.forEach((pair, index) => {
    const videoValidation = testCase.expectedResults.pairValidations?.[pair.id];
    const subValidations = pair.subtitles.map((_, subIndex) => 
      testCase.expectedResults.pairValidations?.[`${pair.id}_sub_${subIndex}`]
    );

    if (videoValidation?.videoCorrect) {
      validations.push(`
    // Video should be correctly identified
    assert.ok(pairs[${index}].video, 'Video should be present');
    assert.strictEqual(pairs[${index}].video.name, '${pair.video.name}');`);
    }

    if (pair.subtitles.length > 0) {
      validations.push(`
    // Should have ${pair.subtitles.length} subtitles
    assert.strictEqual(pairs[${index}].subtitles.length, ${pair.subtitles.length});`);
    }

    subValidations.forEach((subValidation, subIndex) => {
      if (subValidation?.pairedCorrectly) {
        validations.push(`
    // Subtitle ${subIndex} should be paired correctly
    assert.strictEqual(pairs[${index}].subtitles[${subIndex}].name, '${pair.subtitles[subIndex].name}');`);
      }
    });
  });

  return validations.join('');
};

/**
 * Load test cases from a JSON file
 */
export const loadTestCases = async (filePath) => {
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    return data.testCases || [];
  } catch (error) {
    console.error('Failed to load test cases:', error);
    return [];
  }
};

/**
 * Run all test cases from a JSON file
 */
export const runTestCasesFromFile = async (filePath) => {
  const testCases = await loadTestCases(filePath);
  if (testCases.length === 0) {
    console.log('No test cases found in file:', filePath);
    return;
  }

  console.log(`Running ${testCases.length} captured test cases...`);
  runCapturedTestCases(testCases);
};