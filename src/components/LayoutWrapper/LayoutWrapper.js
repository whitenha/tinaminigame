'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  
  const isRoomCode = pathname && /^\/[A-Za-z0-9]{6}$/.test(pathname);
  const isFullScreen = pathname?.startsWith('/create') || pathname?.startsWith('/play') || isRoomCode;

  return (
    <>
      {!isFullScreen && <Navbar />}
      
      <main style={{ position: 'relative', zIndex: 1, minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
      
      {!isFullScreen && <Footer />}
    </>
  );
}
