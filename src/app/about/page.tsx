import Link from 'next/link';
import { TEMPLATES, CATEGORIES } from '@/data/templates';
import styles from './about.module.css';

export const metadata = {
  title: 'Giới thiệu — Tina MiniGame',
  description: 'Tina MiniGame là nền tảng trò chơi giáo dục tương tác dành cho học sinh K-5.',
};

export default function AboutPage() {
  const features = [
    {
      emoji: '🎮',
      title: `${TEMPLATES.length}+ Templates`,
      desc: 'Đa dạng trò chơi từ trắc nghiệm, ghép nối, từ vựng đến hành động và toán học.',
    },
    {
      emoji: '🎨',
      title: 'Giao diện đẹp mắt',
      desc: 'Thiết kế sáng, rực rỡ, dễ sử dụng. Phù hợp với trẻ em và thu hút sự chú ý.',
    },
    {
      emoji: '📱',
      title: 'Đáp ứng đa thiết bị',
      desc: 'Hoạt động mượt mà trên máy tính, máy tính bảng và điện thoại.',
    },
    {
      emoji: '⚡',
      title: 'Tốc độ nhanh',
      desc: 'Tải trang siêu nhanh nhờ Next.js và Static Generation. Không cần chờ đợi.',
    },
    {
      emoji: '🌍',
      title: 'Tiếng Việt',
      desc: 'Hỗ trợ tiếng Việt đầy đủ cho tên và mô tả mỗi template.',
    },
    {
      emoji: '🔄',
      title: 'Dễ mở rộng',
      desc: 'Thêm template mới chỉ cần thêm 1 object vào file dữ liệu. Không cần sửa code phức tạp.',
    },
  ];

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.hero}>
          <span className={styles.heroEmoji}>🎲</span>
          <h1 className={styles.title}>Về Tina MiniGame</h1>
          <p className={styles.subtitle}>
            Nền tảng học tập tương tác với {TEMPLATES.length}+ trò chơi giáo dục, 
            được thiết kế đặc biệt cho học sinh K-5. Biến mỗi bài học thành một cuộc phiêu lưu!
          </p>
        </div>

        <div className={styles.features}>
          {features.map((feature, i) => (
            <div
              key={i}
              className={styles.featureCard}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <span className={styles.featureEmoji}>{feature.emoji}</span>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDesc}>{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className={styles.howItWorks}>
          <h2 className={styles.howTitle}>📋 Cách sử dụng</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h3 className={styles.stepTitle}>Chọn Template</h3>
              <p className={styles.stepDesc}>
                Duyệt qua {TEMPLATES.length}+ templates và chọn loại trò chơi phù hợp với bài học.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h3 className={styles.stepTitle}>Nhập Nội dung</h3>
              <p className={styles.stepDesc}>
                Thêm câu hỏi, từ vựng, hoặc nội dung bài học vào template.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h3 className={styles.stepTitle}>Chơi & Học!</h3>
              <p className={styles.stepDesc}>
                Chia sẻ link cho học sinh. Các em có thể chơi trên bất kỳ thiết bị nào!
              </p>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link
            href="/templates"
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 'var(--text-xl)',
              padding: 'var(--space-lg) var(--space-2xl)',
              borderRadius: 'var(--radius-full)',
              background: 'var(--gradient-hero)',
              color: 'white',
              boxShadow: 'var(--shadow-lg)',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            🚀 Bắt đầu ngay →
          </Link>
        </div>
      </div>
    </div>
  );
}
