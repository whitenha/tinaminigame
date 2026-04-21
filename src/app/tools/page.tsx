'use client';

import { Suspense } from 'react';
import TemplateCard from '@/components/TemplateCard/TemplateCard';
import styles from '../templates/templates.module.css';

import { TEMPLATES } from '@/data/templates';

// Mock data definition for tools (can be moved to a data file later)
const TOOLS = [
  {
    id: 't0',
    slug: 'extract',
    name: 'Bóc Tách Thông Minh',
    nameVi: 'AI Text-to-Game',
    description: 'Dán văn bản vào, AI tự động nhận dạng loại nội dung và tạo game ngay lập tức. Không cần thao tác gì thêm!',
    color: '#6c5ce7', // purple
    badges: ['NEW', 'POPULAR'],
    difficulty: 1,
    playerCount: '1',
    basePath: '/tools',
  },
  {
    id: 't1',
    slug: 'viet-bai',
    name: 'Vở Luyện Viết',
    nameVi: 'Handwriting Notebook',
    description: 'Công cụ soạn thảo và tạo file PDF luyện viết chữ chuẩn theo ly dâng tiếng Việt dành cho giáo viên và học sinh cấp 1.',
    color: '#3b82f6', // blue
    badges: ['NEW', 'POPULAR'],
    difficulty: 1,
    playerCount: '1',
    basePath: '/tools',
  },
  ...TEMPLATES.filter(template => template.isTool).map(template => ({
    ...template,
    // @ts-ignore
    basePath: template.instantLaunch ? '/tools/play' : '/templates',
  }))
];

export default function ToolsPage() {
  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.title}>🛠️ Tất cả Tools</h1>
          <p className={styles.subtitle}>Công cụ hỗ trợ quá trình soạn giảng và tạo tài liệu</p>
        </div>
        
        <p className={styles.resultCount}>
          Hiển thị {TOOLS.length} / {TOOLS.length} công cụ
        </p>

        {TOOLS.length > 0 ? (
          <div className={styles.grid}>
            {TOOLS.map((tool, i) => (
              <TemplateCard key={tool.id} template={tool} index={i} basePath={tool.basePath || "/tools"} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyEmoji}>🛠️</span>
            <p className={styles.emptyText}>Chưa có công cụ nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
