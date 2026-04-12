const qChunk = `On a test with 25 questions, Lan answered 80% correctly. How many questions did she get right?
A. 15 B. 18 C. 20 D. 22
đáp án đúng: C. 20`;

// Old pattern
const ansPatternOld = /(?:đáp án đúng|đáp án|answer|key|correct|=>|->|[👉✓])[\s:\-]*([A-F])/i;
const matchOld = qChunk.match(ansPatternOld);
console.log('Old Matched text:', matchOld ? matchOld[0] : null, 'Captured:', matchOld ? matchOld[1] : null);

// New pattern
const ansPatternNew = /(?:đáp án đúng|đáp án|\banswer\b|\bkey\b|\bcorrect\b|=>|->|[👉✓])\s*[:\-]?\s*([A-F])(?:\b|\.|\))/i;
const matchNew = qChunk.match(ansPatternNew);
console.log('New Matched text:', matchNew ? matchNew[0] : null, 'Captured:', matchNew ? matchNew[1] : null);
