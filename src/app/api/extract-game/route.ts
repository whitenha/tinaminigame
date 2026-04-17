import { streamObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

export const maxDuration = 60;

// ── Zod Schemas for each content format ─────────────────────

const MCQItemSchema = z.object({
  question: z.string().describe('Đề bài câu hỏi'),
  options: z.array(z.string()).length(4).describe('4 đáp án, đáp án đúng LUÔN là phần tử đầu tiên (index 0)'),
  correctIndex: z.number().default(0).describe('Luôn là 0 vì đáp án đúng đã được đặt ở vị trí đầu'),
});

const TrueFalseItemSchema = z.object({
  question: z.string().describe('Phát biểu để đánh giá đúng/sai'),
  isTrue: z.boolean().describe('true nếu phát biểu đúng, false nếu sai'),
});

const PairItemSchema = z.object({
  term: z.string().describe('Từ / khái niệm / câu hỏi'),
  definition: z.string().describe('Nghĩa / định nghĩa / đáp án'),
});

const SentenceItemSchema = z.object({
  sentence: z.string().describe('Một câu hoàn chỉnh'),
});

const ListItemSchema = z.object({
  item: z.string().describe('Một mục trong danh sách'),
});

const GroupItemSchema = z.object({
  groupName: z.string().describe('Tên nhóm'),
  items: z.array(z.object({
    text: z.string(),
    isCorrect: z.boolean().describe('true nếu thuộc nhóm này, false nếu là thẻ gây nhiễu'),
  })),
});

// ── Main extraction schema ──────────────────────────────────

const ExtractionSchema = z.object({
  title: z.string().describe('Tiêu đề ngắn gọn cho bộ câu hỏi/nội dung (tối đa 50 ký tự)'),
  detectedFormat: z.enum(['MCQ', 'TRUE_FALSE', 'PAIRS', 'WORD', 'SENTENCE', 'LIST', 'GROUP']).describe(
    'Loại nội dung phát hiện được. MCQ = trắc nghiệm có đáp án. TRUE_FALSE = phát biểu đúng/sai. PAIRS/WORD = từ vựng có nghĩa. SENTENCE = câu hoàn chỉnh. LIST = danh sách mục. GROUP = phân nhóm.'
  ),
  mcqItems: z.array(MCQItemSchema).optional().describe('Chỉ điền khi detectedFormat = MCQ'),
  trueFalseItems: z.array(TrueFalseItemSchema).optional().describe('Chỉ điền khi detectedFormat = TRUE_FALSE'),
  pairItems: z.array(PairItemSchema).optional().describe('Chỉ điền khi detectedFormat = PAIRS hoặc WORD'),
  sentenceItems: z.array(SentenceItemSchema).optional().describe('Chỉ điền khi detectedFormat = SENTENCE'),
  listItems: z.array(ListItemSchema).optional().describe('Chỉ điền khi detectedFormat = LIST'),
  groupItems: z.array(GroupItemSchema).optional().describe('Chỉ điền khi detectedFormat = GROUP'),
});

// ── System prompt ───────────────────────────────────────────

const SYSTEM_PROMPT = `Bạn là trợ lý AI chuyên bóc tách nội dung giáo dục từ văn bản thô thành dữ liệu có cấu trúc.

NHIỆM VỤ:
1. Đọc văn bản đầu vào
2. Xác định loại nội dung (detectedFormat)
3. Bóc tách thành các items có cấu trúc
4. Tạo tiêu đề phù hợp

QUY TẮC XÁC ĐỊNH FORMAT:
- Nếu có câu hỏi + đáp án A/B/C/D → MCQ
- Nếu có phát biểu + Đúng/Sai → TRUE_FALSE  
- Nếu có cặp từ-nghĩa (word -> definition, từ: nghĩa) → PAIRS hoặc WORD
- Nếu có các câu hoàn chỉnh cần sắp xếp → SENTENCE
- Nếu là danh sách các mục → LIST
- Nếu có phân nhóm/phân loại → GROUP

QUY TẮC CHO MCQ:
- Đáp án ĐÚNG phải LUÔN ở vị trí đầu tiên (index 0) của mảng options
- Luôn có đúng 4 đáp án
- Nếu văn bản không có đáp án sai, hãy tự tạo thêm

QUY TẮC CHO TRUE_FALSE:
- Trích xuất phát biểu và xác định đúng/sai

QUY TẮC CHUNG:
- Giữ nguyên ngôn ngữ gốc (không dịch)
- Loại bỏ số thứ tự đầu dòng
- Sửa lỗi chính tả rõ ràng
- Nếu người dùng yêu cầu format cụ thể (preferredFormat), ưu tiên format đó`;

// ── POST handler ────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, preferredFormat, useFallback } = body;

    // 1. Kiểm tra API Key tương ứng
    if (useFallback && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Chưa cấu hình GOOGLE_GENERATIVE_AI_API_KEY trong file .env.local.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!useFallback && !process.env.GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Chưa cấu hình GROQ_API_KEY trong file .env.local.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'Văn bản quá ngắn. Cần ít nhất 10 ký tự.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userPrompt = preferredFormat
      ? `Hãy bóc tách văn bản sau thành format "${preferredFormat}":\n\n${text}`
      : `Hãy tự động phát hiện loại nội dung và bóc tách văn bản sau:\n\n${text}`;

    let result;

    if (useFallback) {
      // Dùng Google Gemma 3 27B
      const customGoogle = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        fetch: async (url, options) => {
          if (options?.body) {
            try {
              const body = JSON.parse(options.body as string);
              let sys = '';
              // Bypass Developer Instructions (System Prompt) limitation on Gemma 3
              if (body.systemInstruction) {
                body.systemInstruction.parts.forEach((p: any) => sys += p.text + '\\n');
                delete body.systemInstruction;
              }
              // Bypass JSON config limitation on Gemma 3
              if (body.generationConfig) {
                if (body.generationConfig.responseSchema) {
                  sys += '\\nReturn strictly ONE valid JSON object matching this schema (do NOT use markdown \`\`\` wrappers):\\n' + JSON.stringify(body.generationConfig.responseSchema);
                  delete body.generationConfig.responseSchema;
                }
                if (body.generationConfig.responseMimeType) {
                  delete body.generationConfig.responseMimeType;
                }
              }
              if (sys && body.contents && body.contents.length > 0) {
                body.contents[0].parts.unshift({ text: 'SYSTEM INSTRUCTIONS:\\n' + sys + '\\n\\nUSER PROMPT:\\n' });
              }
              options.body = JSON.stringify(body);
            } catch (e) {}
          }
          return fetch(url, options);
        }
      });
      
      result = streamObject({
        model: customGoogle('models/gemma-3-27b-it'),
        maxRetries: 0,
        schema: ExtractionSchema,
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
      });
    } else {
      // Dùng Groq Llama 3.3 70B
      const customGroq = createGroq({
        apiKey: process.env.GROQ_API_KEY,
        fetch: async (url, options) => {
          if (options?.body) {
            try {
              const body = JSON.parse(options.body as string);
              if (body.response_format && body.response_format.type === 'json_schema') {
                const schemaStr = JSON.stringify(body.response_format.json_schema.schema);
                if (body.messages && body.messages.length > 0) {
                  body.messages[0].content += '\\n\\nIMPORTANT: You must return ONLY a JSON object that perfectly matches the following JSON Schema:\\n' + schemaStr;
                }
                body.response_format = { type: 'json_object' };
                options.body = JSON.stringify(body);
              }
            } catch (e) {}
          }
          let res = await fetch(url, options);
          // If Groq rate limits, we bubble up the error to trigger fallback correctly
          if (res.status === 429) {
             throw new Error("GROQ_QUOTA_EXCEEDED");
          }
          return res;
        }
      });

      result = streamObject({
        model: customGroq('llama-3.3-70b-versatile'),
        maxRetries: 0,
        schema: ExtractionSchema,
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
      });
    }

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('Extract game error:', error);
    
    // Convert thrown explicitly errors gracefully
    if (error.message === 'GROQ_QUOTA_EXCEEDED') {
        return new Response(JSON.stringify({ error: 'GROQ_QUOTA_EXCEEDED', message: 'Quota exceeded' }), { status: 429 });
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Lỗi server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

