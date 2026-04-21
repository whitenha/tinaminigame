'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import { Suspense } from 'react';

function LayoutContent({ children }: any) {
  const pathname = usePathname();
  
  const isRoomCode = pathname && /^\/[A-Za-z0-9]{6}$/.test(pathname);
  const isFullScreen = pathname?.startsWith('/create') || pathname?.startsWith('/play') || pathname?.startsWith('/dev') || isRoomCode;

  return (
    <>
      {!isFullScreen && <Navbar />}
      
      <main style={{ position: 'relative', zIndex: 1, minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
      
      {pathname === '/' && <Footer />}
    </>
  );
}

export default function LayoutWrapper({ children }: any) {
  return (
    <Suspense fallback={<main style={{ position: 'relative', zIndex: 1, minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>{children}</main>}>
      <LayoutContent>{children}</LayoutContent>
    </Suspense>
  );
}
