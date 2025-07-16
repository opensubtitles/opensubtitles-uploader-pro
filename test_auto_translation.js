// Test the auto-translation detection regex
const checkAutoTranslationFromContent = (content) => {
  if (!content) return false;
  // Regex pattern for automatic translation indicators
  const autoTranslationRegex = /<Aj>.*<\/I>|N'-t|{\\ An8}/i;
  return autoTranslationRegex.test(content);
};

// Test cases for auto-translation detection
const testCases = [
  // First pattern: <Aj>.*</I>
  '<Aj>This is auto-translated text</I>',
  '<aj>Some text here</i>',
  '<Aj>Multi-line\nauto translation</I>',
  
  // Second pattern: N'-t
  "I don't know → I N'-t know",
  "You can't do it → You N'-t do it",
  "N'-t working properly",
  
  // Third pattern: {\\ An8}
  '{\\An8}Some subtitle text here',
  '{\\an8}Different casing',
  'Regular text {\\An8} more text',
  
  // Non-matching cases
  'Regular subtitle text',
  '<i>Normal italic text</i>',
  "Don't worry about it",
  '{\\An1}Different annotation',
  '<b>Bold text</b>',
  'Just some normal subtitle content',
  
  // Combined content
  `1
00:00:01,000 --> 00:00:05,000
<Aj>This is auto-translated</I>

2
00:00:05,000 --> 00:00:10,000
Normal subtitle text`,

  `1
00:00:01,000 --> 00:00:05,000
I N'-t understand this

2
00:00:05,000 --> 00:00:10,000
Regular subtitle here`,

  `1
00:00:01,000 --> 00:00:05,000
{\\An8}Auto-positioned text

2
00:00:05,000 --> 00:00:10,000
Normal subtitle content`
];

console.log('Testing auto-translation detection:');
testCases.forEach((content, index) => {
  const result = checkAutoTranslationFromContent(content);
  console.log(`Test ${index + 1}: ${result ? 'AUTO-TRANSLATED' : 'NORMAL'}`);
  console.log(`Content: ${content.replace(/\n/g, '\\n')}`);
  console.log('---');
});