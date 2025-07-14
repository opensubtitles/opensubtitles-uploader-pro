#!/usr/bin/env node

/**
 * CLI tool to generate test files from captured test cases
 * Usage: node generateTests.js <input-json-file> [output-test-file]
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { generateTestFile } from './testCaseRunner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node generateTests.js <input-json-file> [output-test-file]');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1] || join(__dirname, '../generated/capturedTests.test.js');

  try {
    // Read the captured test cases
    const content = await readFile(inputFile, 'utf-8');
    const data = JSON.parse(content);
    
    if (!data.testCases || !Array.isArray(data.testCases)) {
      console.error('Invalid test case file format');
      process.exit(1);
    }

    console.log(`Found ${data.testCases.length} test cases`);

    // Generate test file content
    const testFileContent = generateTestFile(data.testCases, outputFile);

    // Ensure output directory exists
    const outputDir = dirname(outputFile);
    try {
      await import('fs/promises').then(fs => fs.mkdir(outputDir, { recursive: true }));
    } catch (error) {
      // Directory might already exist
    }

    // Write the test file
    await writeFile(outputFile, testFileContent);

    console.log(`✅ Generated test file: ${outputFile}`);
    console.log(`📊 Contains ${data.testCases.length} test cases`);
    
    // Show summary
    const summary = data.testCases.reduce((acc, testCase) => {
      const pairs = testCase.pairedFiles.length;
      const files = testCase.originalFiles.length;
      const orphaned = testCase.originalFiles.filter(f => 
        f.isSubtitle && !testCase.pairedFiles.some(p => 
          p.subtitles.some(s => s.fullPath === f.fullPath)
        )
      ).length;
      
      acc.totalPairs += pairs;
      acc.totalFiles += files;
      acc.totalOrphaned += orphaned;
      return acc;
    }, { totalPairs: 0, totalFiles: 0, totalOrphaned: 0 });

    console.log(`📈 Summary:`);
    console.log(`   - Total files: ${summary.totalFiles}`);
    console.log(`   - Total pairs: ${summary.totalPairs}`);
    console.log(`   - Orphaned subtitles: ${summary.totalOrphaned}`);

  } catch (error) {
    console.error('Error generating test file:', error.message);
    process.exit(1);
  }
}

main();