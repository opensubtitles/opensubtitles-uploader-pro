import { test, describe } from 'node:test';
import assert from 'node:assert';
import { pairVideoAndSubtitleFiles } from '../../src/utils/fileUtils.js';
import { createFileStructure, runTestScenario } from '../utils/testHelpers.js';

describe('File Processing Integration Tests', () => {
  
  describe('Real-world file structures', () => {
    test('should handle typical movie download structure', () => {
      const structure = {
        'The Matrix (1999) [1080p] [BluRay] [YTS.MX]': {
          'The.Matrix.1999.1080p.BluRay.YTS.MX.mp4': null,
          'Subs': [
            'English.srt',
            'French.srt',
            'German.srt',
            'Spanish.srt',
            'Chinese (Simplified).chi.srt',
            'Chinese (Traditional).chi.srt',
            'Portuguese (Brazil).por.srt'
          ]
        }
      };
      
      const files = createFileStructure(structure);
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 1);
      assert.strictEqual(pairs[0].subtitles.length, 7);
      assert.strictEqual(pairs[0].video.name, 'The.Matrix.1999.1080p.BluRay.YTS.MX.mp4');
    });
    
    test('should handle TV series structure', () => {
      const structure = {
        'Game of Thrones Season 1': {
          'S01E01.mp4': null,
          'S01E01.srt': null,
          'S01E02.mp4': null,
          'S01E02.srt': null,
          'S01E03.mp4': null,
          'S01E03.srt': null,
          'Subtitles': [
            'S01E01.French.srt',
            'S01E01.German.srt',
            'S01E02.French.srt',
            'S01E02.German.srt'
          ]
        }
      };
      
      const files = createFileStructure(structure);
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 3);
      
      // Check that S01E01 and S01E02 have additional subtitles from the Subtitles folder
      const e01Pair = pairs.find(p => p.video.name === 'S01E01.mp4');
      const e02Pair = pairs.find(p => p.video.name === 'S01E02.mp4');
      const e03Pair = pairs.find(p => p.video.name === 'S01E03.mp4');
      
      assert.ok(e01Pair);
      assert.ok(e02Pair);
      assert.ok(e03Pair);
      
      // Each episode should have at least its main subtitle
      assert.ok(e01Pair.subtitles.length >= 1);
      assert.ok(e02Pair.subtitles.length >= 1);
      assert.strictEqual(e03Pair.subtitles.length, 1); // Only main subtitle
    });
    
    test('should handle nested duplicate directories', () => {
      const structure = {
        'Downloads': {
          'Movies': {
            'The Godfather (1972) [1080p] [BluRay] [YTS.MX]': {
              'The Godfather (1972) [1080p] [BluRay] [YTS.MX]': {
                'The.Godfather.1972.1080p.BluRay.YTS.MX.mp4': null,
                'Subs': [
                  'English.srt',
                  'Italian.srt'
                ]
              }
            }
          }
        }
      };
      
      const files = createFileStructure(structure);
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 1);
      assert.strictEqual(pairs[0].subtitles.length, 2);
    });
    
    test('should handle mixed file types in same directory', () => {
      const structure = {
        'Mixed Content': [
          'Movie.mp4',
          'Movie.srt',
          'README.txt',
          'poster.jpg',
          'Movie.nfo',
          'Movie.en.srt',
          'Movie.fr.srt',
          'Another.Movie.mkv',
          'Another.Movie.srt'
        ]
      };
      
      const files = createFileStructure(structure);
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 2);
      
      const moviePair = pairs.find(p => p.video.name === 'Movie.mp4');
      const anotherPair = pairs.find(p => p.video.name === 'Another.Movie.mkv');
      
      assert.ok(moviePair);
      assert.ok(anotherPair);
      assert.strictEqual(moviePair.subtitles.length, 3); // Movie.srt, Movie.en.srt, Movie.fr.srt
      assert.strictEqual(anotherPair.subtitles.length, 1); // Another.Movie.srt
    });
  });
  
  describe('Complex matching scenarios', () => {
    test('should handle multiple subtitle formats for same video', () => {
      const structure = {
        'Multi Format': [
          'Movie.mp4',
          'Movie.srt',
          'Movie.vtt',
          'Movie.ass',
          'Movie.ssa',
          'Movie.sub'
        ]
      };
      
      const files = createFileStructure(structure);
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 1);
      assert.strictEqual(pairs[0].subtitles.length, 5);
    });
    
    test('should handle subtitle variants (forced, SDH, etc.)', () => {
      const structure = {
        'Variants': [
          'Movie.mp4',
          'Movie.srt',
          'Movie.forced.srt',
          'Movie.sdh.srt',
          'Movie.en.srt',
          'Movie.en.forced.srt',
          'Movie.en.sdh.srt'
        ]
      };
      
      const files = createFileStructure(structure);
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 1);
      assert.strictEqual(pairs[0].subtitles.length, 6);
    });
    
    test('should handle multiple video files with overlapping subtitle names', () => {
      const structure = {
        'Multiple Videos': [
          'Movie.Part1.mp4',
          'Movie.Part2.mp4',
          'Movie.Part1.srt',
          'Movie.Part2.srt',
          'Movie.srt' // This should not match either video
        ]
      };
      
      const files = createFileStructure(structure);
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 2);
      
      const part1Pair = pairs.find(p => p.video.name === 'Movie.Part1.mp4');
      const part2Pair = pairs.find(p => p.video.name === 'Movie.Part2.mp4');
      
      assert.ok(part1Pair);
      assert.ok(part2Pair);
      assert.strictEqual(part1Pair.subtitles.length, 1);
      assert.strictEqual(part2Pair.subtitles.length, 1);
    });
  });
  
  describe('Edge cases and error scenarios', () => {
    test('should handle empty directories', () => {
      const structure = {
        'Empty Movie Folder': {
          'Subs': [],
          'Extras': []
        }
      };
      
      const files = createFileStructure(structure);
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 0);
    });
    
    test('should handle directories with only subtitles', () => {
      const structure = {
        'Only Subtitles': [
          'Movie.srt',
          'Movie.en.srt',
          'Movie.fr.srt'
        ]
      };
      
      const files = createFileStructure(structure);
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 0);
    });
    
    test('should handle directories with only videos', () => {
      const structure = {
        'Only Videos': [
          'Movie1.mp4',
          'Movie2.mkv',
          'Movie3.avi'
        ]
      };
      
      const files = createFileStructure(structure);
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 3);
      pairs.forEach(pair => {
        assert.strictEqual(pair.subtitles.length, 0);
      });
    });
    
    test('should handle very deep directory structures', () => {
      const structure = {
        'Level1': {
          'Level2': {
            'Level3': {
              'Level4': {
                'Level5': {
                  'Movie.mp4': null,
                  'Subtitles': [
                    'English.srt'
                  ]
                }
              }
            }
          }
        }
      };
      
      const files = createFileStructure(structure);
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 1);
      assert.strictEqual(pairs[0].subtitles.length, 1);
    });
    
    test('should handle files with special characters in names', () => {
      const structure = {
        'Special Characters': [
          'Movie (2023) [1080p] [BluRay].mp4',
          'Movie (2023) [1080p] [BluRay].srt',
          'Movie - Director\'s Cut.mp4',
          'Movie - Director\'s Cut.srt',
          'Movie & More.mp4',
          'Movie & More.srt'
        ]
      };
      
      const files = createFileStructure(structure);
      const pairs = pairVideoAndSubtitleFiles(files);
      
      assert.strictEqual(pairs.length, 3);
      pairs.forEach(pair => {
        assert.strictEqual(pair.subtitles.length, 1);
      });
    });
  });
  
  describe('Performance with large datasets', () => {
    test('should handle large file collections efficiently', () => {
      const structure = {};
      
      // Create 50 movies with 5 subtitles each
      for (let i = 1; i <= 50; i++) {
        structure[`Movie${i} (202${i % 10})`] = {
          [`Movie${i}.mp4`]: null,
          'Subs': [
            'English.srt',
            'French.srt',
            'German.srt',
            'Spanish.srt',
            'Italian.srt'
          ]
        };
      }
      
      const files = createFileStructure(structure);
      
      const startTime = Date.now();
      const pairs = pairVideoAndSubtitleFiles(files);
      const endTime = Date.now();
      
      // Should complete in reasonable time
      assert.ok(endTime - startTime < 2000, `Processing took ${endTime - startTime}ms`);
      
      // Should create correct number of pairs
      assert.strictEqual(pairs.length, 50);
      
      // Each pair should have 5 subtitles
      pairs.forEach(pair => {
        assert.strictEqual(pair.subtitles.length, 5);
      });
    });
  });
});