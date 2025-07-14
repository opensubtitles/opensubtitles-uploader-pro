import { test, describe } from 'node:test';
import assert from 'node:assert';
import { 
  isVideoFile, 
  isSubtitleFile, 
  isSubtitleContent, 
  isMediaFile,
  detectVideoFileInfo,
  getBestMovieDetectionName
} from '../../src/utils/fileUtils.js';
import { SAMPLE_SUBTITLE_CONTENT } from './testHelpers.js';

describe('File Detection Tests', () => {
  
  describe('Video file detection', () => {
    test('should detect common video extensions', () => {
      const videoFiles = [
        'movie.mp4', 'movie.mkv', 'movie.avi', 'movie.mov', 
        'movie.wmv', 'movie.flv', 'movie.webm', 'movie.mpg', 
        'movie.mpeg', 'movie.ts', 'movie.ogv'
      ];
      
      videoFiles.forEach(fileName => {
        assert.ok(isVideoFile(fileName), `${fileName} should be detected as video`);
      });
    });
    
    test('should detect video extensions case-insensitively', () => {
      const videoFiles = [
        'movie.MP4', 'movie.MKV', 'movie.AVI', 'movie.MOV'
      ];
      
      videoFiles.forEach(fileName => {
        assert.ok(isVideoFile(fileName), `${fileName} should be detected as video`);
      });
    });
    
    test('should not detect non-video files', () => {
      const nonVideoFiles = [
        'movie.srt', 'movie.txt', 'movie.doc', 'movie.pdf',
        'movie.jpg', 'movie.png', 'movie.exe', 'movie'
      ];
      
      nonVideoFiles.forEach(fileName => {
        assert.ok(!isVideoFile(fileName), `${fileName} should not be detected as video`);
      });
    });
  });
  
  describe('Subtitle file detection', () => {
    test('should detect common subtitle extensions', () => {
      const subtitleFiles = [
        'movie.srt', 'movie.vtt', 'movie.ass', 'movie.ssa',
        'movie.sub', 'movie.smi', 'movie.mpl', 'movie.tmp'
      ];
      
      subtitleFiles.forEach(fileName => {
        assert.ok(isSubtitleFile(fileName), `${fileName} should be detected as subtitle`);
      });
    });
    
    test('should detect subtitle extensions case-insensitively', () => {
      const subtitleFiles = [
        'movie.SRT', 'movie.VTT', 'movie.ASS', 'movie.SSA'
      ];
      
      subtitleFiles.forEach(fileName => {
        assert.ok(isSubtitleFile(fileName), `${fileName} should be detected as subtitle`);
      });
    });
    
    test('should not detect .txt files by extension alone', () => {
      assert.ok(!isSubtitleFile('movie.txt'), '.txt files should require content analysis');
    });
    
    test('should not detect non-subtitle files', () => {
      const nonSubtitleFiles = [
        'movie.mp4', 'movie.doc', 'movie.pdf', 'movie.jpg',
        'movie.png', 'movie.exe', 'movie'
      ];
      
      nonSubtitleFiles.forEach(fileName => {
        assert.ok(!isSubtitleFile(fileName), `${fileName} should not be detected as subtitle`);
      });
    });
  });
  
  describe('Subtitle content detection', () => {
    test('should detect SRT content', () => {
      assert.ok(isSubtitleContent(SAMPLE_SUBTITLE_CONTENT.srt));
    });
    
    test('should detect WebVTT content', () => {
      assert.ok(isSubtitleContent(SAMPLE_SUBTITLE_CONTENT.vtt));
    });
    
    test('should detect ASS content', () => {
      assert.ok(isSubtitleContent(SAMPLE_SUBTITLE_CONTENT.ass));
    });
    
    test('should detect SRT content in .txt files', () => {
      assert.ok(isSubtitleContent(SAMPLE_SUBTITLE_CONTENT.txtSubtitle));
    });
    
    test('should not detect regular text content', () => {
      assert.ok(!isSubtitleContent(SAMPLE_SUBTITLE_CONTENT.txt));
    });
    
    test('should handle empty content', () => {
      assert.ok(!isSubtitleContent(''));
      assert.ok(!isSubtitleContent(null));
      assert.ok(!isSubtitleContent(undefined));
    });
    
    test('should handle very short content', () => {
      assert.ok(!isSubtitleContent('1'));
      assert.ok(!isSubtitleContent('1\n2'));
      assert.ok(!isSubtitleContent('1\n2\n3'));
    });
    
    test('should require minimum pattern matches', () => {
      const insufficientContent = `1
00:00:01,000 --> 00:00:05,000
Hello world!`;
      
      assert.ok(!isSubtitleContent(insufficientContent));
    });
  });
  
  describe('Media file detection', () => {
    test('should detect video files as media', () => {
      const mockVideoFile = { name: 'movie.mp4', type: 'video/mp4' };
      const result = isMediaFile(mockVideoFile);
      
      assert.ok(result.isVideo);
      assert.ok(!result.isSubtitle);
      assert.ok(result.isMedia);
    });
    
    test('should detect subtitle files as media', () => {
      const mockSubtitleFile = { name: 'movie.srt', type: 'text/plain' };
      const result = isMediaFile(mockSubtitleFile);
      
      assert.ok(!result.isVideo);
      assert.ok(result.isSubtitle);
      assert.ok(result.isMedia);
    });
    
    test('should handle .txt files specially', () => {
      const mockTxtFile = { name: 'movie.txt', type: 'text/plain' };
      const result = isMediaFile(mockTxtFile);
      
      assert.ok(!result.isVideo);
      assert.ok(!result.isSubtitle);
      assert.ok(!result.isMedia);
      assert.strictEqual(result.fileKind, 'Unknown text file');
    });
    
    test('should use MIME type as fallback', () => {
      const mockFile = { name: 'movie', type: 'video/mp4' };
      const result = isMediaFile(mockFile);
      
      assert.ok(result.isVideo);
      assert.ok(result.isMedia);
    });
  });
  
  describe('Video file info detection', () => {
    test('should detect video file types correctly', () => {
      const testCases = [
        { file: { name: 'movie.mp4' }, expected: { file_type: 'mp4', file_kind: 'MPEG-4 Video' } },
        { file: { name: 'movie.mkv' }, expected: { file_type: 'mkv', file_kind: 'Matroska Video' } },
        { file: { name: 'movie.avi' }, expected: { file_type: 'avi', file_kind: 'AVI Video' } },
        { file: { name: 'movie.mov' }, expected: { file_type: 'mov', file_kind: 'QuickTime Video' } }
      ];
      
      testCases.forEach(({ file, expected }) => {
        const result = detectVideoFileInfo(file);
        assert.strictEqual(result.file_type, expected.file_type);
        assert.strictEqual(result.file_kind, expected.file_kind);
      });
    });
    
    test('should handle unknown extensions', () => {
      const file = { name: 'movie.unknown' };
      const result = detectVideoFileInfo(file);
      
      assert.strictEqual(result.file_type, 'unknown');
      assert.strictEqual(result.file_kind, 'UNKNOWN Video');
    });
  });
  
  describe('Movie detection name extraction', () => {
    test('should use filename for non-generic names', () => {
      const file = {
        name: 'The Matrix (1999).srt',
        fullPath: 'Movies/The Matrix (1999).srt'
      };
      
      const result = getBestMovieDetectionName(file);
      assert.strictEqual(result, 'The Matrix (1999)');
    });
    
    test('should use parent directory for generic language names', () => {
      const file = {
        name: 'English.srt',
        fullPath: 'The Matrix (1999)/Subs/English.srt'
      };
      
      const result = getBestMovieDetectionName(file);
      assert.strictEqual(result, 'The Matrix (1999)');
    });
    
    test('should handle short language codes', () => {
      const file = {
        name: 'en.srt',
        fullPath: 'The Matrix (1999)/en.srt'
      };
      
      const result = getBestMovieDetectionName(file);
      assert.strictEqual(result, 'The Matrix (1999)');
    });
    
    test('should skip subtitle directory names', () => {
      const file = {
        name: 'English.srt',
        fullPath: 'The Matrix (1999)/Subtitles/English.srt'
      };
      
      const result = getBestMovieDetectionName(file);
      assert.strictEqual(result, 'The Matrix (1999)');
    });
    
    test('should handle multiple language extensions', () => {
      const file = {
        name: 'Traditional.chi.srt',
        fullPath: 'The Matrix (1999)/Subs/Traditional.chi.srt'
      };
      
      const result = getBestMovieDetectionName(file);
      assert.strictEqual(result, 'The Matrix (1999)');
    });
  });
  
  describe('Edge cases and error handling', () => {
    test('should handle files without extensions', () => {
      assert.ok(!isVideoFile('movie'));
      assert.ok(!isSubtitleFile('movie'));
    });
    
    test('should handle files with multiple dots', () => {
      assert.ok(isVideoFile('movie.2023.mp4'));
      assert.ok(isSubtitleFile('movie.eng.srt'));
    });
    
    test('should handle very long filenames', () => {
      const longName = 'a'.repeat(255) + '.mp4';
      assert.ok(isVideoFile(longName));
    });
    
    test('should handle empty filenames', () => {
      assert.ok(!isVideoFile(''));
      assert.ok(!isSubtitleFile(''));
    });
    
    test('should handle filename with only extension', () => {
      assert.ok(isVideoFile('.mp4'));
      assert.ok(isSubtitleFile('.srt'));
    });
  });
});