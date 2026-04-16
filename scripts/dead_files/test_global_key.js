const cleanText = (text) => text.replace(/\s+/g, ' ').trim();

const parseQuizText = (fullText) => {
  let normalizedText = cleanText(fullText);
  
  // Split by Question marker
  const questionPattern = /\b(?:Câu|Question|Q|Bài)\s*\d+[\.\:\)]\s+|\b\d+[\.\)]\s+/gi;
  const matches = [...normalizedText.matchAll(questionPattern)];
  
  if (matches.length === 0) return { error: "No questions" };
  
  // Answer Key Extraction
  const ansKeyMap = {};
  const lastQStartIdx = matches[matches.length - 1].index + matches[matches.length - 1][0].length;
  // We look at the text after the VERY LAST option marker of the LAST question, OR just the last chunk.
  const lastQChunk = normalizedText.substring(lastQStartIdx);
  
  // Strategy 1: Look for explicit header
  const ansSectionPattern = /(?:bảng đáp án|answer key|đáp án chi tiết|đáp án|answers)[\s:\-]*(.*)/i;
  const ansSectionMatch = lastQChunk.match(ansSectionPattern);
  
  let answersStr = "";
  let truncateIdx = -1;
  
  if (ansSectionMatch) {
    answersStr = ansSectionMatch[1];
    truncateIdx = lastQStartIdx + ansSectionMatch.index;
  } else {
    // Strategy 2: Look for a sequence of 1. A, 2. B at the very end of the document WITHOUT a header.
    // If the last e.g. 50-100 chars contains densely packed answers.
    // We can just find all `num. Letter` pairs in the lastQChunk.
    // BUT we must be careful not to mistake "1. A" inside the question text for a global key.
    // Usually global keys are at the VERY END.
    // Let's find the FIRST occurrence of a pair that structurally looks like an answer key
    // i.e., "1. A 2. B 3. C" in sequence.
    
    // For now, let's just make the header optional IF we find at least 3 pairs clumped together?
    // Actually, relaxing the header colon usually covers 95% of cases. "Bảng đáp án 1.A 2.B" matches Strategy 1.
  }
  
  if (answersStr) {
    const pairPattern = /\b(\d+)[\.\s:\*\-]{1,6}([A-D])\b/gi;
    const pairs = [...answersStr.matchAll(pairPattern)];
    if (pairs.length >= 2) {
      pairs.forEach(match => {
        ansKeyMap[parseInt(match[1])] = match[2].toUpperCase();
      });
      if (truncateIdx !== -1) {
        normalizedText = normalizedText.substring(0, truncateIdx);
      }
    }
  }
  
  console.log("Extracted ansKeyMap:", ansKeyMap);
};

parseQuizText(`Question 1. Foo 
A. 1 B. 2 C. 3 D. 4 
Question 2. Bar
A. 1 B. 2 C. 3 D. 4
Bảng đáp án
1. C 2. A`);

parseQuizText(`Question 1. Foo 
A. 1 B. 2 C. 3 D. 4 
Question 2. Bar
A. 1 B. 2 C. 3 D. 4
Answer Key 1-C, 2-A`);
