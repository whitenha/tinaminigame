'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, isTeacher } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isTeacher) {
      router.push('/dashboard');
    }
  }, [isTeacher, router]);

  if (isTeacher) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: signInError } = await signInWithEmail(email, password);
      if (signInError) throw signInError;
      
      // Successfully logged in
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại. Kiểm tra lại email/mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>👩‍🏫</span>
          <h1 className={styles.title}>Giáo Viên Đăng Nhập</h1>
          <p className={styles.subtitle}>Tạo và quản lý các trò chơi cho học sinh</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>Email (Tài khoản LMS)</label>
            <input
              type="email"
              id="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>Mật khẩu</label>
            <input
              type="password"
              id="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            className={`${styles.button} ${loading ? styles.loading : ''}`}
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
          </button>
        </form>
        
        <p className={styles.note}>
          <strong>Lưu ý:</strong> Học sinh không cần đăng nhập. Học sinh chỉ cần click vào link chia sẻ để chơi ngay!
        </p>
      </div>
    </div>
  );
}
