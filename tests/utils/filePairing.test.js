import { test, describe } from 'node:test';
import assert from 'node:assert';
import { pairVideoAndSubtitleFiles } from '../../src/utils/fileUtils.js';
import { 
  createMockVideoFile, 
  createMockSubtitleFile, 
  createFileStructure, 
  TEST_SCENARIOS,
  assertPairMatch,
  runTestScenario
} from './testHelpers.js';

describe('File Pairing Tests', () => {
  
  describe('Basic pairing scenarios', () => {
    test('should pair video and subtitle with same name', () => {
      const files = [
        createMockVideoFile('Movie.mp4', ''),
        createMockSubtitleFile('Movie.srt', '')
      ];
      
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 1);
      assertPairMatch(pairs[0], 'Movie.mp4', ['Movie.srt']);
    });
    
    test('should pair video with multiple subtitle languages', () => {
      const files = [
        createMockVideoFile('Movie.mp4', ''),
        createMockSubtitleFile('Movie.en.srt', ''),
        createMockSubtitleFile('Movie.fr.srt', ''),
        createMockSubtitleFile('Movie.de.srt', '')
      ];
      
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 1);
      assertPairMatch(pairs[0], 'Movie.mp4', ['Movie.en.srt', 'Movie.fr.srt', 'Movie.de.srt']);
    });
    
    test('should handle multiple videos with their subtitles', () => {
      const files = [
        createMockVideoFile('Movie1.mp4', ''),
        createMockSubtitleFile('Movie1.srt', ''),
        createMockVideoFile('Movie2.mp4', ''),
        createMockSubtitleFile('Movie2.srt', '')
      ];
      
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 2);
      assertPairMatch(pairs[0], 'Movie1.mp4', ['Movie1.srt']);
      assertPairMatch(pairs[1], 'Movie2.mp4', ['Movie2.srt']);
    });
  });
  
  describe('Subtitle directory matching', () => {
    test('should match subtitles in "Subs" directory', () => {
      const files = [
        createMockVideoFile('Movie.mp4', 'Movie Folder'),
        createMockSubtitleFile('Movie.srt', 'Movie Folder/Subs')
      ];
      
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 1);
      assertPairMatch(pairs[0], 'Movie.mp4', ['Movie.srt']);
    });
    
    test('should match subtitles in "Subtitles" directory', () => {
      const files = [
        createMockVideoFile('Movie.mp4', 'Movie Folder'),
        createMockSubtitleFile('English.srt', 'Movie Folder/Subtitles'),
        createMockSubtitleFile('French.srt', 'Movie Folder/Subtitles')
      ];
      
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 1);
      assertPairMatch(pairs[0], 'Movie.mp4', ['English.srt', 'French.srt']);
    });
    
    test('should match subtitles in normalized directory names', () => {
      const files = [
        createMockVideoFile('Movie Title (2023).mp4', 'Movie Title (2023)'),
        createMockSubtitleFile('English.srt', 'Movie Title [2023]/Subtitles')
      ];
      
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 1);
      assertPairMatch(pairs[0], 'Movie Title (2023).mp4', ['English.srt']);
    });
  });
  
  describe('Text file handling', () => {
    test('should only match .txt files with subtitle-like names', () => {
      const files = [
        createMockVideoFile('Movie.mp4', ''),
        createMockSubtitleFile('Movie.txt', ''),
        createMockSubtitleFile('README.txt', ''),
        createMockSubtitleFile('Movie.subtitle.txt', '')
      ];
      
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 1);
      // Should only match Movie.txt and Movie.subtitle.txt, not README.txt
      const subtitleNames = pairs[0].subtitles.map(s => s.name);
      assert.ok(subtitleNames.includes('Movie.txt'));
      assert.ok(subtitleNames.includes('Movie.subtitle.txt'));
      assert.ok(!subtitleNames.includes('README.txt'));
    });
    
    test('should match .txt files with language codes', () => {
      const files = [
        createMockVideoFile('Movie.mp4', ''),
        createMockSubtitleFile('Movie.en.txt', ''),
        createMockSubtitleFile('Movie.fr.txt', '')
      ];
      
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 1);
      assertPairMatch(pairs[0], 'Movie.mp4', ['Movie.en.txt', 'Movie.fr.txt']);
    });
  });
  
  describe('Complex real-world scenarios', () => {
    test('should handle YTS movie structure', () => {
      const result = runTestScenario(TEST_SCENARIOS.complexYTS, pairVideoAndSubtitleFiles);
      
      assert.strictEqual(result.videoCount, 1);
      assert.strictEqual(result.subtitleCount, 6);
      assert.strictEqual(result.pairCount, 1);
      
      const pair = result.pairs[0];
      assert.strictEqual(pair.video.name, 'The.Matrix.1999.1080p.BluRay.YTS.MX.mp4');
      assert.strictEqual(pair.subtitles.length, 6);
    });
    
    test('should handle TV series episodes', () => {
      const result = runTestScenario(TEST_SCENARIOS.multipleMovies, pairVideoAndSubtitleFiles);
      
      assert.strictEqual(result.videoCount, 2);
      assert.strictEqual(result.subtitleCount, 2);
      assert.strictEqual(result.pairCount, 2);
      
      assertPairMatch(result.pairs[0], 'S01E01.mp4', ['S01E01.srt']);
      assertPairMatch(result.pairs[1], 'S01E02.mp4', ['S01E02.srt']);
    });
    
    test('should handle nested directory structures', () => {
      const result = runTestScenario(TEST_SCENARIOS.nestedStructure, pairVideoAndSubtitleFiles);
      
      assert.strictEqual(result.videoCount, 1);
      assert.strictEqual(result.subtitleCount, 3);
      assert.strictEqual(result.pairCount, 1);
      
      const pair = result.pairs[0];
      assert.strictEqual(pair.video.name, 'Movie.Title.2023.mp4');
      assert.strictEqual(pair.subtitles.length, 3);
    });
  });
  
  describe('Edge cases', () => {
    test('should handle empty file list', () => {
      const pairs = pairVideoAndSubtitleFiles([]);
      assert.strictEqual(pairs.length, 0);
    });
    
    test('should handle video without subtitles', () => {
      const files = [
        createMockVideoFile('Movie.mp4', '')
      ];
      
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 1);
      assert.strictEqual(pairs[0].subtitles.length, 0);
    });
    
    test('should handle subtitle without video', () => {
      const files = [
        createMockSubtitleFile('Movie.srt', '')
      ];
      
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 0);
    });
    
    test('should handle files marked for removal', () => {
      const files = [
        createMockVideoFile('Movie.mp4', '', { shouldRemove: true }),
        createMockSubtitleFile('Movie.srt', '')
      ];
      
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 0);
    });
    
    test('should not reuse subtitles across multiple videos', () => {
      const files = [
        createMockVideoFile('Movie1.mp4', ''),
        createMockVideoFile('Movie2.mp4', ''),
        createMockSubtitleFile('Movie1.srt', '')
      ];
      
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 2);
      
      // Find the pair with the subtitle
      const pairWithSub = pairs.find(p => p.subtitles.length > 0);
      const pairWithoutSub = pairs.find(p => p.subtitles.length === 0);
      
      assert.ok(pairWithSub);
      assert.ok(pairWithoutSub);
      assert.strictEqual(pairWithSub.subtitles.length, 1);
      assert.strictEqual(pairWithoutSub.subtitles.length, 0);
    });
  });
  
  describe('Performance and scalability', () => {
    test('should handle large number of files efficiently', () => {
      const files = [];
      
      // Create 100 video files with their subtitles
      for (let i = 1; i <= 100; i++) {
        files.push(createMockVideoFile(`Movie${i}.mp4`, ''));
        files.push(createMockSubtitleFile(`Movie${i}.srt`, ''));
        files.push(createMockSubtitleFile(`Movie${i}.en.srt`, ''));
        files.push(createMockSubtitleFile(`Movie${i}.fr.srt`, ''));
      }
      
      const startTime = Date.now();
      const pairs = pairVideoAndSubtitleFiles(files);
      const endTime = Date.now();
      
      // Should complete in reasonable time (less than 1 second for 400 files)
      assert.ok(endTime - startTime < 1000, `Pairing took ${endTime - startTime}ms`);
      
      // Should create 100 pairs
      assert.strictEqual(pairs.length, 100);
      
      // Each pair should have 3 subtitles
      pairs.forEach(pair => {
        assert.strictEqual(pair.subtitles.length, 3);
      });
    });
  });
});