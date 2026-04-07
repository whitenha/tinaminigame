import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const textData = formData.get('text');

    if (!file && !textData) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    const tempDir = os.tmpdir();
    let tempFilePath = '';

    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      tempFilePath = path.join(tempDir, `quiz_upload_${Date.now()}.pdf`);
      await fs.writeFile(tempFilePath, buffer);
    } else if (textData) {
      tempFilePath = path.join(tempDir, `quiz_upload_${Date.now()}.txt`);
      await fs.writeFile(tempFilePath, textData, 'utf-8');
    }

    // Path to python script
    const scriptPath = path.join(process.cwd(), 'scripts', 'parse_quiz_pdf.py');

    // Run python script
    return new Promise((resolve) => {
      execFile('python', [scriptPath, tempFilePath], { maxBuffer: 1024 * 1024 * 5 }, async (error, stdout, stderr) => {
        // Clean up temp file
        try {
          await fs.unlink(tempFilePath);
        } catch (e) {
          console.error('Failed to clear temp file:', e);
        }

        if (error) {
          console.error("Python Error:", error);
          console.error("Python Stderr:", stderr);
          return resolve(NextResponse.json({ error: 'Lỗi trong quá trình đọc PDF bằng Python.' }, { status: 500 }));
        }

        try {
          const result = JSON.parse(stdout);
          if (result.error) {
            return resolve(NextResponse.json({ error: result.error }, { status: 400 }));
          }
          return resolve(NextResponse.json({ data: result.data }));
        } catch (err) {
          console.error('Failed to parse Python JSON Output:', stdout);
          return resolve(NextResponse.json({ error: 'Dữ liệu trả về bị lỗi định dạng.' }, { status: 500 }));
        }
      });
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
