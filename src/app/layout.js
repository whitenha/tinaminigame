import './tokens.css';
import './layout.css';
import './utilities.css';
import './globals.css';
import LayoutWrapper from '@/components/LayoutWrapper/LayoutWrapper';
import { AuthProvider } from '@/contexts/AuthContext';
import QueryProvider from '@/components/Providers/QueryProvider';

export const metadata = {
  title: 'Tina MiniGame — Học mà chơi, Chơi mà học!',
  description: '40+ trò chơi tương tác dành cho học sinh K-5. Nền tảng giáo dục giúp bài học trở nên sống động với các template trò chơi phong phú.',
  keywords: 'minigame, education, K-5, trò chơi giáo dục, interactive learning, quiz, matching, word games',
  openGraph: {
    title: 'Tina MiniGame — Học mà chơi, Chơi mà học!',
    description: '40+ trò chơi tương tác dành cho học sinh K-5.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
