import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { queries } = await req.json();
    if (!queries || !Array.isArray(queries)) {
      return NextResponse.json({ error: 'Invalid queries' }, { status: 400 });
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      return NextResponse.json({ error: 'Chưa cấu hình API Key Unsplash (.env)' }, { status: 500 });
    }

    const results = [];
    // Gọi tuần tự từng query để tránh rate limit nếu số lượng query lớn
    for (const q of queries) {
      try {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=1&client_id=${accessKey}`;
        const res = await fetch(url);
        const data = await res.json();
        
        let imageUrl = null;
        if (data.results && data.results.length > 0) {
          // Dùng ảnh cỡ regular để dung lượng vừa phải
          imageUrl = data.results[0].urls.regular;
        }
        results.push({ query: q, imageUrl });
        
        // Thêm delay nhỏ tránh gọi quá dồn dập (Unsplash rate limit 50/hour cho tk free)
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (err) {
        console.error('Error fetching image for', q, err);
        results.push({ query: q, imageUrl: null });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Unsplash API route error:', error);
    return NextResponse.json({ error: 'Lỗi server khi fetch Unsplash' }, { status: 500 });
  }
}
