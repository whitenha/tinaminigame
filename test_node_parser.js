const cleanText = (text) => text.replace(/\s+/g, ' ').trim();

const parseQuizText = (fullText) => {
  let normalizedText = cleanText(fullText);
  
  // Split by Question marker
  const questionPattern = /\b(?:Câu|Question|Q|Bài)\s*\d+[\.\:\)]\s+|\b\d+[\.\)]\s+/gi;
  const matches = [...normalizedText.matchAll(questionPattern)];
  
  if (matches.length === 0) {
    return { error: "Không tìm thấy cấu trúc câu hỏi nào (Vd: 'Câu 1.', '1.', v.v.) trong file." };
  }
  
  // Answer Key Extraction
  const ansKeyMap = {};
  const lastQStartIdx = matches[matches.length - 1].index + matches[matches.length - 1][0].length;
  const lastQChunk = normalizedText.substring(lastQStartIdx);
  
  const ansSectionPattern = /(?:bảng đáp án|answer key|đáp án chi tiết|đáp án|answers)\s*:\s*(.*)/i;
  const ansSectionMatch = lastQChunk.match(ansSectionPattern);
  
  if (ansSectionMatch) {
    const answersStr = ansSectionMatch[1];
    const pairPattern = /\b(\d+)[\.\s:\*\-]{1,6}([A-D])\b/gi;
    const pairs = [...answersStr.matchAll(pairPattern)];
    if (pairs.length >= 2) {
      pairs.forEach(match => {
        ansKeyMap[parseInt(match[1])] = match[2].toUpperCase();
      });
      const truncateIdx = lastQStartIdx + ansSectionMatch.index;
      normalizedText = normalizedText.substring(0, truncateIdx);
    }
  }
  
  const questionsData = [];
  
  for (let i = 0; i < matches.length; i++) {
    const startIdx = matches[i].index + matches[i][0].length;
    const endIdx = (i + 1 < matches.length) ? matches[i + 1].index : normalizedText.length;
    
    let qChunk = normalizedText.substring(startIdx, endIdx).trim();
    
    const qNumMatch = matches[i][0].match(/\d+/);
    const qNum = qNumMatch ? parseInt(qNumMatch[0]) : (i + 1);
    
    let correctAnswerLetter = null;
    
    if (ansKeyMap[qNum]) {
      correctAnswerLetter = ansKeyMap[qNum];
    }
    
    if (!correctAnswerLetter) {
      const ansPattern = /(?:đáp án đúng|đáp án|answer|key|correct|=>|->|[👉✓])[\s:\-]*([A-F])/i;
      const ansMatch = qChunk.match(ansPattern);
      if (ansMatch) {
        correctAnswerLetter = ansMatch[1].toUpperCase();
        qChunk = qChunk.substring(0, ansMatch.index).trim();
      }
    }
    
    const optPattern = /\b([A-F])[\.\)]\s+/gi;
    const optMatches = [...qChunk.matchAll(optPattern)];
    
    let questionText = "";
    let options = [];
    let optionLetters = [];
    
    if (optMatches.length === 0) {
      questionText = qChunk.trim().replace(/\*\*/g, '');
      options = ["", ""];
      optionLetters = ["A", "B"];
    } else {
      questionText = qChunk.substring(0, optMatches[0].index).trim().replace(/\*\*/g, '');
      
      for (let j = 0; j < optMatches.length; j++) {
        const letter = optMatches[j][1].toUpperCase();
        const oStart = optMatches[j].index + optMatches[j][0].length;
        const oEnd = (j + 1 < optMatches.length) ? optMatches[j + 1].index : qChunk.length;
        
        const optText = qChunk.substring(oStart, oEnd).trim().replace(/\*\*/g, '');
        options.push(optText);
        optionLetters.push(letter);
      }
    }
    
    while (options.length < 2) {
      options.push("");
    }
    
    let correctIndex = 0;
    if (correctAnswerLetter && optionLetters.includes(correctAnswerLetter)) {
      correctIndex = optionLetters.indexOf(correctAnswerLetter);
    } else if (correctAnswerLetter === 'A' && options.length >= 1) correctIndex = 0;
    else if (correctAnswerLetter === 'B' && options.length >= 2) correctIndex = 1;
    else if (correctAnswerLetter === 'C' && options.length >= 3) correctIndex = 2;
    else if (correctAnswerLetter === 'D' && options.length >= 4) correctIndex = 3;
    
    questionsData.push({
      question: questionText,
      options: options.slice(0, 4),
      correct_answer: correctIndex
    });
  }
  
  return { data: questionsData };
};

const fs = require('fs');
const text = fs.readFileSync('test_parse_2.txt', 'utf-8');
console.log(JSON.stringify(parseQuizText(text), null, 2));
