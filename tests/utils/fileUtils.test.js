import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getBestMovieDetectionName } from '../../src/utils/fileUtils.js';

describe('getBestMovieDetectionName', () => {
  
  describe('Short filenames (< 4 characters)', () => {
    test('should use parent directory for 2-letter ISO codes', () => {
      const testFile = {
        fullPath: 'Movie Title (2023)/subs/en.srt',
        name: 'en.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Movie Title (2023)');
    });

    test('should use parent directory for 3-letter codes', () => {
      const testFile = {
        fullPath: 'The Great Movie/Subs/eng.srt', 
        name: 'eng.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'The Great Movie');
    });

    test('should skip short directories and use longer ones', () => {
      const testFile = {
        fullPath: 'Movie Name/sub/en.srt',
        name: 'en.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Movie Name');
    });
  });

  describe('Language names (5+ characters)', () => {
    test('should detect "English" as generic', () => {
      const testFile = {
        fullPath: 'Spirited Away (2022)/Subs/English.srt',
        name: 'English.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Spirited Away (2022)');
    });

    test('should detect "French" as generic', () => {
      const testFile = {
        fullPath: 'Movie Title/French.srt',
        name: 'French.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Movie Title');
    });

    test('should detect "Traditional" as generic', () => {
      const testFile = {
        fullPath: 'The Wonderful Story/Subs/Traditional.chi.srt',
        name: 'Traditional.chi.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'The Wonderful Story');
    });

    test('should detect "Simplified" as generic', () => {
      const testFile = {
        fullPath: 'Call (2020)/Subs/Simplified.chi.srt',
        name: 'Simplified.chi.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Call (2020)');
    });
  });

  describe('Language variants with regions', () => {
    test('should detect "Chinese (Simplified)" as generic', () => {
      const testFile = {
        fullPath: 'The Wonderful Story Of Henry Sugar (2023) [1080p] [WEBRip] [5.1] [YTS.MX]/Subs/Chinese (Simplified).chi.srt',
        name: 'Chinese (Simplified).chi.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'The Wonderful Story Of Henry Sugar (2023) [1080p] [WEBRip] [5.1] [YTS.MX]');
    });

    test('should detect "Chinese (Traditional)" as generic', () => {
      const testFile = {
        fullPath: 'The Wonderful Story Of Henry Sugar (2023) [1080p] [WEBRip] [5.1] [YTS.MX]/Subs/Chinese (Traditional).chi.srt',
        name: 'Chinese (Traditional).chi.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'The Wonderful Story Of Henry Sugar (2023) [1080p] [WEBRip] [5.1] [YTS.MX]');
    });

    test('should detect "Portuguese (Brazil)" as generic', () => {
      const testFile = {
        fullPath: 'The Wonderful Story Of Henry Sugar (2023) [1080p] [WEBRip] [5.1] [YTS.MX]/Subs/Portuguese (Brazil).por.srt',
        name: 'Portuguese (Brazil).por.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'The Wonderful Story Of Henry Sugar (2023) [1080p] [WEBRip] [5.1] [YTS.MX]');
    });

    test('should detect "Portuguese (Portugal)" as generic', () => {
      const testFile = {
        fullPath: 'Companion (2025)/Subs/Portuguese (Portugal).por.srt',
        name: 'Portuguese (Portugal).por.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Companion (2025)');
    });

    test('should detect "Spanish (Latin America)" as generic', () => {
      const testFile = {
        fullPath: 'Companion (2025)/Subs/Spanish (Latin America).spa.srt',
        name: 'Spanish (Latin America).spa.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Companion (2025)');
    });
  });

  describe('Regional language variants', () => {
    test('should detect "Latin American" as generic', () => {
      const testFile = {
        fullPath: 'The Program (2024) [1080p] [WEBRip] [YTS.MX]/Subs/Latin American.spa.srt',
        name: 'Latin American.spa.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'The Program (2024) [1080p] [WEBRip] [YTS.MX]');
    });

    test('should detect "Brazilian" as generic', () => {
      const testFile = {
        fullPath: 'The Program (2024) [1080p] [WEBRip] [YTS.MX]/Subs/Brazilian.por.srt',
        name: 'Brazilian.por.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'The Program (2024) [1080p] [WEBRip] [YTS.MX]');
    });

    test('should detect "European" as generic', () => {
      const testFile = {
        fullPath: 'Call (2020)/Subs/European.por.srt',
        name: 'European.por.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Call (2020)');
    });

    test('should detect "Canadian" as generic', () => {
      const testFile = {
        fullPath: 'The Program (2024)/Subs/Canadian.fre.srt',
        name: 'Canadian.fre.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'The Program (2024)');
    });
  });

  describe('Subtitle modifiers and types', () => {
    test('should detect "Forced" as generic', () => {
      const testFile = {
        fullPath: 'Call (2020) [1080p] [WEBRip] [5.1] [YTS.MX]/Subs/Forced.eng.srt',
        name: 'Forced.eng.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Call (2020) [1080p] [WEBRip] [5.1] [YTS.MX]');
    });

    test('should detect "English [Forced]" as generic', () => {
      const testFile = {
        fullPath: 'Anora (2024) [1080p] [WEBRip] [5.1] [YTS.MX]/Subs/English [Forced].eng.srt',
        name: 'English [Forced].eng.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Anora (2024) [1080p] [WEBRip] [5.1] [YTS.MX]');
    });

    test('should detect "English [SDH]" as generic', () => {
      const testFile = {
        fullPath: 'Anora (2024) [1080p] [WEBRip] [5.1] [YTS.MX]/Subs/English [SDH].eng.srt',
        name: 'English [SDH].eng.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Anora (2024) [1080p] [WEBRip] [5.1] [YTS.MX]');
    });

    test('should detect "SDH.eng.HI" as generic', () => {
      const testFile = {
        fullPath: 'After Death (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]/Subs/SDH.eng.HI.srt',
        name: 'SDH.eng.HI.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'After Death (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]');
    });

    test('should detect "Latin America Spanish [SDH]" as generic', () => {
      const testFile = {
        fullPath: 'Surveilled (2024) [1080p] [WEBRip] [5.1] [YTS.MX]/Subs/Latin America Spanish [SDH].spa.srt',
        name: 'Latin America Spanish [SDH].spa.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Surveilled (2024) [1080p] [WEBRip] [5.1] [YTS.MX]');
    });
  });

  describe('Complex file structures', () => {
    test('should handle nested duplicate directories', () => {
      const testFile = {
        fullPath: 'Spirited Away Live On Stage (2022) [1080p] [BluRay] [YTS.MX]/Spirited Away Live On Stage (2022) [1080p] [BluRay] [YTS.MX]/Subz/English.srt',
        name: 'English.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Spirited Away Live On Stage (2022) [1080p] [BluRay] [YTS.MX]');
    });

    test('should skip short directories like "Subs"', () => {
      const testFile = {
        fullPath: 'Movie Title/Subs/English.srt',
        name: 'English.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Movie Title');
    });

    test('should skip short directories like "subs" (lowercase)', () => {
      const testFile = {
        fullPath: 'How To Have Sex (2023) [1080p] [WEBRip] [x265] [10bit] [YTS.MX]/subs/English.srt',
        name: 'English.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'How To Have Sex (2023) [1080p] [WEBRip] [x265] [10bit] [YTS.MX]');
    });

    test('should work with Chinese variants without parentheses', () => {
      const testFile = {
        fullPath: 'Spirited Away Live On Stage (2022) [1080p] [BluRay] [YTS.MX]/Subs/Chinese(Traditional).chi.srt',
        name: 'Chinese(Traditional).chi.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Spirited Away Live On Stage (2022) [1080p] [BluRay] [YTS.MX]');
    });

    test('should work with Chinese variants without parentheses (Simplified)', () => {
      const testFile = {
        fullPath: 'Spirited Away Live On Stage (2022) [1080p] [BluRay] [YTS.MX]/Subs/Chinese(Simplified).chi.srt',
        name: 'Chinese(Simplified).chi.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Spirited Away Live On Stage (2022) [1080p] [BluRay] [YTS.MX]');
    });

    test('should handle forced subtitles in nested directories', () => {
      const testFile = {
        fullPath: 'The Brutalist (2024) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]/The Brutalist (2024) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]/Subsaaa/Forced.eng.srt',
        name: 'Forced.eng.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'The Brutalist (2024) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]');
    });

    test('should skip multilingual subtitle directories', () => {
      const testFile1 = {
        fullPath: 'Movie Title (2024)/subtitles_multilingual/eng/English.srt',
        name: 'English.srt'
      };
      const result1 = getBestMovieDetectionName(testFile1);
      assert.strictEqual(result1, 'Movie Title (2024)');

      const testFile2 = {
        fullPath: 'Another Movie/titulky_cz_sk/Czech.srt',
        name: 'Czech.srt'
      };
      const result2 = getBestMovieDetectionName(testFile2);
      assert.strictEqual(result2, 'Another Movie');

      const testFile3 = {
        fullPath: 'Film/sous-titres_fr/French.srt',
        name: 'French.srt'
      };
      const result3 = getBestMovieDetectionName(testFile3);
      assert.strictEqual(result3, 'Film');
    });

    test('should handle subtitles with detailed filenames in subdirectories', () => {
      const testFile = {
        fullPath: 'Torrents/Torrents/The Prosecutor (2024) [1080p] [BluRay] [x265] [10bit] [5.1] [YTS.MX]/back/The.Prosecutor.2024.1080p.BluRay.x265.10bit.AAC5.1-[YTS.MX].sk.srt',
        name: 'The.Prosecutor.2024.1080p.BluRay.x265.10bit.AAC5.1-[YTS.MX].sk.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'The.Prosecutor.2024.1080p.BluRay.x265.10bit.AAC5.1-[YTS.MX]');
    });
  });

  describe('Non-generic filenames', () => {
    test('should return original name for non-generic long filenames', () => {
      const testFile = {
        fullPath: 'Some Movie/Really Long Subtitle Name.srt',
        name: 'Really Long Subtitle Name.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Really Long Subtitle Name');
    });

    test('should return original name for movie titles as subtitles', () => {
      const testFile = {
        fullPath: 'Movie Directory/Movie Title (2023).srt',
        name: 'Movie Title (2023).srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Movie Title (2023)');
    });

    test('should return original name for custom subtitle names', () => {
      const testFile = {
        fullPath: 'Movie/Commentary Track.srt',
        name: 'Commentary Track.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Commentary Track');
    });
  });

  describe('Edge cases', () => {
    test('should handle files without extensions', () => {
      const testFile = {
        fullPath: 'Movie Title/en',
        name: 'en'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Movie Title');
    });

    test('should handle multiple dots in filename', () => {
      const testFile = {
        fullPath: 'Movie/SDH.eng.HI.forced.srt',
        name: 'SDH.eng.HI.forced.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Movie');
    });

    test('should handle root level files', () => {
      const testFile = {
        fullPath: 'en.srt',
        name: 'en.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'en'); // Fallback to original when no directories
    });

    test('should handle single directory level', () => {
      const testFile = {
        fullPath: 'Movie/en.srt',
        name: 'en.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Movie');
    });

    test('should handle all short directories', () => {
      const testFile = {
        fullPath: 'A/B/C/D/en.srt',
        name: 'en.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'A'); // Fallback to longest directory
    });
  });

  describe('Real-world YTS examples', () => {
    test('The Prosecutor (2024) - Traditional.chi.srt', () => {
      const testFile = {
        fullPath: 'The Prosecutor (2024) [1080p] [BluRay] [x265] [10bit] [5.1] [YTS.MX]/Subs/Traditional.chi.srt',
        name: 'Traditional.chi.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'The Prosecutor (2024) [1080p] [BluRay] [x265] [10bit] [5.1] [YTS.MX]');
    });

    test('Better Man (2024) - SDH.eng.HI.srt', () => {
      const testFile = {
        fullPath: 'Better Man (2024) [1080p] [WEBRip] [5.1] [YTS.MX]/Subs/SDH.eng.HI.srt',
        name: 'SDH.eng.HI.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Better Man (2024) [1080p] [WEBRip] [5.1] [YTS.MX]');
    });

    test('American Fiction (2023) - Latin American.spa.srt', () => {
      const testFile = {
        fullPath: 'American Fiction (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]/Subs/Latin American.spa.srt',
        name: 'Latin American.spa.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'American Fiction (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]');
    });

    test('Companion (2025) - ca English.srt', () => {
      const testFile = {
        fullPath: 'Companion (2025) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]/Subs/ca English.srt',
        name: 'ca English.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'Companion (2025) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]');
    });

    test('National Theatre Live Prima Facie (2022) - English.srt', () => {
      const testFile = {
        fullPath: 'National Theatre Live Prima Facie (2022) [1080p] [WEBRip] [YTS.MX]/Subs/English.srt',
        name: 'English.srt'
      };
      const result = getBestMovieDetectionName(testFile);
      assert.strictEqual(result, 'National Theatre Live Prima Facie (2022) [1080p] [WEBRip] [YTS.MX]');
    });
  });
});