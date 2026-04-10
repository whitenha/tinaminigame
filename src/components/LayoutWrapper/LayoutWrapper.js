'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import FloatingShapes from '@/components/FloatingShapes/FloatingShapes';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  
  const isRoomCode = pathname && /^\/[A-Za-z0-9]{6}$/.test(pathname);
  // Hide UI chunks if we are in fullscreen modes (like the editor, playing a game, or joining a room)
  const isFullScreen = pathname?.startsWith('/create') || pathname?.startsWith('/play') || isRoomCode;

  return (
    <>
      {!isFullScreen && <FloatingShapes />}
      {!isFullScreen && <Navbar />}
      
      <main style={{ position: 'relative', zIndex: 1, minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
      
      {!isFullScreen && <Footer />}
    </>
  );
}
