import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { queries } = await req.json();
    if (!queries || !Array.isArray(queries)) {
      return NextResponse.json({ error: 'Invalid queries' }, { status: 400 });
    }

    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    const pixabayKey = process.env.PIXABAY_API_KEY;

    if (!unsplashKey && !pixabayKey) {
      return NextResponse.json({ error: 'Chưa cấu hình API Key (Unsplash/Pixabay)' }, { status: 500 });
    }

    const results = [];
    
    // Lặp qua từng khóa từ
    for (const q of queries) {
      let imageUrl = null;
      let usedSource = '';
      
      // 1. Thử gọi Unsplash trước (Ưu tiên ảnh đẹp)
      if (unsplashKey) {
         try {
            const uUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=1&client_id=${unsplashKey}`;
            const res = await fetch(uUrl);
            
            if (res.ok) {
               const data = await res.json();
               if (data.results && data.results.length > 0) {
                  imageUrl = data.results[0].urls.regular;
                  usedSource = 'unsplash';
               }
            }
         } catch (e) {
            console.error('Unsplash error for', q, e);
         }
      }

      // 2. Chữa cháy bằng Pixabay Nếu Unsplash Thất Bại hoặc Hết Giới Hạn
      if (!imageUrl && pixabayKey) {
         try {
            const pUrl = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(q)}&image_type=photo&per_page=3`;
            const res = await fetch(pUrl);
            if (res.ok) {
               const data = await res.json();
               if (data.hits && data.hits.length > 0) {
                  imageUrl = data.hits[0].webformatURL;
                  usedSource = 'pixabay';
               }
            }
         } catch (e) {
            console.error('Pixabay error for', q, e);
         }
      }

      results.push({ query: q, imageUrl });
      
      // Delay để tránh Rate Limit
      await new Promise(resolve => setTimeout(resolve, usedSource === 'unsplash' ? 150 : 100));
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Fetch Images API error:', error);
    return NextResponse.json({ error: 'Lỗi server khi fetch ảnh' }, { status: 500 });
  }
}
