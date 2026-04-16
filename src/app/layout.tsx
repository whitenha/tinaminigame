import './tokens.css';
import './layout.css';
import './utilities.css';
import './globals.css';
import LayoutWrapper from '@/components/LayoutWrapper/LayoutWrapper';
import { AuthProvider } from '@/contexts/AuthContext';
import QueryProvider from '@/components/Providers/QueryProvider';
import { LanguageProvider } from '@/i18n/LanguageContext';

export const metadata = {
  title: 'Tina MiniGame — Học mà chơi, Chơi mà học!',
  description: '40+ trò chơi tương tác dành cho học sinh K-5. Nền tảng giáo dục giúp bài học trở nên sống động với các template trò chơi phong phú.',
  keywords: 'minigame, education, K-5, trò chơi giáo dục, interactive learning, quiz, matching, word games',
  openGraph: {
    title: 'Tina MiniGame — Học mà chơi, Chơi mà học!',
    description: '40+ trò chơi tương tác dành cho học sinh K-5.',
    type: 'website',
  },
  other: {
    'theme-color': '#4F46E5',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: any) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        <QueryProvider>
          <LanguageProvider>
            <AuthProvider>
              <LayoutWrapper>
                {children}
              </LayoutWrapper>
            </AuthProvider>
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
