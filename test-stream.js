const { streamObject } = require('ai');
const { z } = require('zod');
const { google } = require('@ai-sdk/google');
require('dotenv').config({path: '.env.local'});
async function run(){
 try { 
  const result = streamObject({
    model: google('gemini-2.5-flash'),
    schema: z.object({ title: z.string(),  detectedFormat: z.enum(['MCQ']) }),
    system: 'You are an AI.',
    prompt: 'Hello, create one MCQ'
  });
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
 } catch(e) { console.error(e); }
}
run();
