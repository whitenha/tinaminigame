'use client';
import React, { useState, useRef, useMemo, useCallback, Fragment, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import styles from '../../notebook.module.css';
import { convertToHandwriting } from '@/lib/vietnameseHandwriting';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { use } from 'react';

// Original proportions from lophoc.net:
// chuSize = 60, chuHeight = chuSize / 0.625 = 96 (for 4 ô ly)
// chuHeight = chuSize / 0.5 = 120 (for 5 ô ly)
const DEFAULT_FONT_SIZE = 60;
const GRID_CHAR_4 = 'ǯ'; // 4-line grid character in tapviet4hang font
const GRID_CHAR_5 = 'ǰ'; // 5-line grid character in tapviet5hang font

// Map PUA chars back to their original English letters
const PUA_MAP = {
  '\uE001': 'w', '\uE002': 'W',
  '\uE003': 'f', '\uE004': 'F',
  '\uE005': 'j', '\uE006': 'J',
  '\uE007': 'z', '\uE008': 'Z',
};

export default function HandwritingNotebook(props) {
  const params = use(props.params);
  const { authType, id } = params;
  const { user, isTeacher, loading } = useAuth();
  const [text, setText] = useState(
    'Thứ hai, ngày 10 tháng 4 năm 2026\n\n     Tất cả những người thành công đều bắt đầu từ những bước nhỏ nhất.\n\nHere are some English words: wife, jump, zebra, family.'
  );
  const [oly, setOly] = useState(4);
  const [isBold, setIsBold] = useState(true);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [docTitle, setDocTitle] = useState('Bài viết của tôi');
  const [containerWidth, setContainerWidth] = useState(794 - 20);
  const [currentPage, setCurrentPage] = useState(0);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const paperRef = useRef(null);

  // 1. Phục hồi dữ liệu từ Database khi trang vừa load xong (Chỉ Giáo Viên)
  useEffect(() => {
    if (loading) return; // Wait for AuthContext to resolve

    if (authType === 'u1' && isTeacher) {
      const fetchDoc = async () => {
        try {
          const { data, error } = await supabase
            .from('mg_activities')
            .select('*')
            .eq('share_code', id)
            .single();

          if (data && data.settings) {
            const actSettings = data.settings;
            if (actSettings.text) setText(actSettings.text);
            if (actSettings.oly) setOly(actSettings.oly);
            if (actSettings.isBold !== undefined) setIsBold(actSettings.isBold);
            if (actSettings.fontSize) setFontSize(actSettings.fontSize);
            if (data.title) setDocTitle(data.title);
          }
        } catch (err) {
          // might not exist yet, which is fine
        } finally {
          setIsStorageLoaded(true);
        }
      };
      fetchDoc();
    } else {
      setIsStorageLoaded(true);
    }
  }, [isTeacher, loading, authType, id]);

  // Theo dõi chiều rộng liên tục để tự động lấp đầy các ô ly
  useEffect(() => {
    if (!paperRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(paperRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute line-height from font size
  const lineHeight = oly === 4 ? fontSize / 0.625 : fontSize / 0.5;
  const textPaddingTop = oly === 4 ? 0 : fontSize / 5;

  // Font families
  const gridFont = oly === 4 ? 'tapviet4hang' : 'tapviet5hang';
  const textFont = isBold ? 'tapviet1bold' : 'tapviet1normal';

  // Đo chiều rộng thực tế của 1 ký tự ô ly (= 1 ô lớn) sau khi font tải xong
  const [gridCharWidth, setGridCharWidth] = useState(fontSize);
  useEffect(() => {
    const measure = () => {
      const span = document.createElement('span');
      span.style.fontFamily = gridFont;
      span.style.fontSize = `${fontSize}px`;
      span.style.position = 'absolute';
      span.style.visibility = 'hidden';
      span.style.whiteSpace = 'nowrap';
      span.textContent = oly === 4 ? GRID_CHAR_4 : GRID_CHAR_5;
      document.body.appendChild(span);
      const w = span.getBoundingClientRect().width;
      document.body.removeChild(span);
      if (w > 0) setGridCharWidth(w);
    };
    document.fonts.ready.then(measure);
  }, [fontSize, oly, gridFont]);

  // 1 ký tự ô ly = 1 ô lớn
  const charsPerLine = Math.floor(containerWidth / gridCharWidth);
  const exactNotebookWidth = charsPerLine * gridCharWidth;

  // Tính chiều cao trang chuẩn A4 (tỉ lệ 1 : 1.4142) dựa trên chiều rộng
  const a4PaperHeight = exactNotebookWidth * 1.4142;

  // Số dòng vừa 1 trang A4
  const linesPerPage = Math.floor(a4PaperHeight / lineHeight);

  // Tính toán phân trang: ước tính số ký tự vừa 1 dòng dựa trên chiều rộng có sẵn
  // (trừ paddingLeft = 1 ô lớn)
  const usableWidth = exactNotebookWidth - gridCharWidth;
  const [textCharWidth, setTextCharWidth] = useState(fontSize * 0.444);
  useEffect(() => {
    const measure = () => {
      const span = document.createElement('span');
      span.style.fontFamily = textFont;
      span.style.fontSize = `${fontSize}px`;
      span.style.position = 'absolute';
      span.style.visibility = 'hidden';
      span.style.whiteSpace = 'nowrap';
      span.textContent = 'a'; // ký tự đại diện
      document.body.appendChild(span);
      const w = span.getBoundingClientRect().width;
      document.body.removeChild(span);
      if (w > 0) setTextCharWidth(w);
    };
    document.fonts.ready.then(measure);
  }, [fontSize, textFont]);

  const textCharsPerLine = Math.max(1, Math.floor(usableWidth / textCharWidth));

  // Ước tính số dòng hiển thị mà 1 đoạn text chiếm (bao gồm word-wrap)
  const estimateLines = useCallback((str) => {
    if (!str) return 0;
    const lines = str.split('\n');
    let count = 0;
    for (const line of lines) {
      if (line.length === 0) {
        count += 1; // dòng trống
      } else {
        count += Math.ceil(line.length / textCharsPerLine);
      }
    }
    return count;
  }, [textCharsPerLine]);

  // Phân trang theo ranh giới câu: mỗi trang luôn bắt đầu bằng 1 câu hoàn chỉnh
  const pages = useMemo(() => {
    if (!text) return [''];

    // Tách text thành các token (từ + khoảng trắng/xuống dòng)
    // Giữ nguyên dấu xuống dòng như token riêng
    const tokens = text.split(/( +|\n)/);

    const result = [];
    let currentPageText = '';
    let currentPageLines = 0;

    for (const token of tokens) {
      if (!token) continue;

      const testText = currentPageText + token;
      const testLines = estimateLines(testText);

      if (testLines <= linesPerPage) {
        // Từ vừa trang hiện tại
        currentPageText = testText;
        currentPageLines = testLines;
      } else {
        // Từ không vừa → đẩy trang hiện tại, bắt đầu trang mới
        if (currentPageText) {
          result.push(currentPageText);
        }
        currentPageText = token.replace(/^ +/, ''); // Bỏ khoảng trắng đầu trang mới
        currentPageLines = estimateLines(currentPageText);
      }
    }

    // Đẩy trang cuối cùng
    if (currentPageText) {
      result.push(currentPageText);
    }

    if (result.length === 0) result.push('');
    return result;
  }, [text, linesPerPage, textCharsPerLine, estimateLines]);

  const totalPages = pages.length;

  // Đảm bảo currentPage không vượt quá tổng số trang
  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages, currentPage]);

  const currentText = pages[currentPage] || '';

  const gridHTML = useMemo(() => {
    const gridChar = oly === 4 ? GRID_CHAR_4 : GRID_CHAR_5;
    const lineStr = new Array(charsPerLine).fill(gridChar).join('');
    const numRows = linesPerPage + 2;
    const rows = new Array(numRows).fill(lineStr);
    return rows.join('<br>');
  }, [oly, charsPerLine, linesPerPage]);

  // Shared style object
  const sharedStyle = {
    fontSize: `${fontSize}px`,
    lineHeight: `${lineHeight}px`,
  };

  // Map text through the HP001 font engine and render with font mixing
  const renderMappedText = useCallback(() => {
    const mapped = convertToHandwriting(currentText);
    const parts = mapped.split(/([\uE001-\uE008])/g);

    return parts.map((part, i) => {
      const englishChar = PUA_MAP[part];
      if (englishChar) {
        if (englishChar === 'z' || englishChar === 'Z') {
          return (
            <span
              key={`e-${i}`}
              style={{
                fontFamily: "'Great Vibes', cursive",
                fontSize: `${fontSize * 1.1}px`,
                lineHeight: '0px',
                display: 'inline',
                verticalAlign: 'baseline',
                position: 'relative',
                top: `0px`,
                fontWeight: 'normal',
                opacity: 0.9,
                marginLeft: '4.8px',
                marginRight: '4.8px',
              }}
            >
              {englishChar}
            </span>
          );
        }

        return (
          <span
            key={`e-${i}`}
            style={{
              fontFamily: "'tapvietenglish', sans-serif",
              fontSize: `${fontSize}px`,
              display: 'inline',
              verticalAlign: 'baseline',
              position: 'relative',
              fontWeight: 'normal'
            }}
          >
            {englishChar}
          </span>
        );
      }
      return <span key={`t-${i}`}>{part}</span>;
    });
  }, [currentText, fontSize]);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Export ALL pages to PDF
  const handleExport = async () => {
    if (!paperRef.current) return;
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      const savedPage = currentPage;

      for (let p = 0; p < totalPages; p++) {
        setCurrentPage(p);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 300))));

        // Tính toán chiều cao chính xác theo tỉ lệ chuẩn A4 của trang giấy
        const contentHeight = Math.ceil(exactNotebookWidth * 1.4142);

        const canvas = await html2canvas(paperRef.current, {
          scale: 2, // Đã giải quyết lỗi file tĩnh nên quay lại scale 2 cho nét PDF
          useCORS: true,
          backgroundColor: '#ffffff',
          height: contentHeight,
          windowHeight: contentHeight,
        });

        // Dùng JPEG thay PNG → giảm 90% dung lượng
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const imgRatio = canvas.height / canvas.width;
        const pdfHeight = Math.min(pdfWidth * imgRatio, pdfPageHeight);

        if (p > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      const now = new Date();
      const dateStr = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
      const safeTitle = docTitle.trim().replace(/[^a-zA-Z0-9_\-À-ỹ\s]/g, '').replace(/\s+/g, '_') || 'Khong_Ten';
      const fileName = `VoLuyenViet_${safeTitle}.pdf`;

      // Lấy Blob từ jsPDF
      const pdfBlob = pdf.output('blob');

      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: 'PDF Document',
                accept: { 'application/pdf': ['.pdf'] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(pdfBlob);
          await writable.close();
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.error('File Picker Error:', err);
            alert('Không thể lưu file. Nếu bạn đang lưu vào OneDrive, hãy thử lưu ra ngoài Desktop hoặc Downloads nhé!');
          }
        }
      } else {
        // Fallback an toàn nếu trình duyệt của họ cực kì cũ không hỗ trợ (tuy nhiên Chrome hiện tại auto hỗ trợ)
        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      }

      setCurrentPage(savedPage);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Đã có lỗi xảy ra khi xuất PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // Xử lý input: gõ vào textarea cập nhật đúng trang hiện tại
  const handleTextChange = (e) => {
    const newPageText = e.target.value;
    const newPages = [...pages];
    newPages[currentPage] = newPageText;
    setText(newPages.join('\n'));
  };

  return (
    <div className={styles.container}>

      <div className={styles.toolbar}>
        <input 
          type="text" 
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
          className={styles.titleInput}
          placeholder="Tên bài viết..."
          maxLength={50}
        />

        <div className={styles.toolGroup}>
          <button
            className={`${styles.toolButton} ${oly === 4 ? styles.active : ''}`}
            onClick={() => setOly(4)}
          >
            4 Ô Ly
          </button>
          <button
            className={`${styles.toolButton} ${oly === 5 ? styles.active : ''}`}
            onClick={() => setOly(5)}
          >
            5 Ô Ly
          </button>
        </div>

        <div className={styles.toolGroup}>
          <button
            className={`${styles.toolButton} ${isBold ? styles.active : ''}`}
            onClick={() => setIsBold(!isBold)}
          >
            Đậm
          </button>
        </div>

        <div className={styles.toolGroup}>
          <button
            className={styles.toolButton}
            onClick={() => setFontSize((s) => Math.max(30, s - 2))}
          >
            ➖ Nhỏ
          </button>
          <span style={{ fontSize: '14px', fontWeight: 'bold', padding: '0 8px', color: '#475569' }}>
            {fontSize}px
          </span>
          <button
            className={styles.toolButton}
            onClick={() => setFontSize((s) => Math.min(100, s + 2))}
          >
            ➕ To
          </button>
        </div>

        {/* Page Nav */}
        <div className={styles.toolGroup} style={{ gap: '16px' }}>
          <button
            className={styles.toolButton}
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0 || isExporting}
          >
            ◀ Trang trước
          </button>
          
          <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
            {currentPage + 1} / {totalPages}
          </span>
          
          <button
            className={styles.toolButton}
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1 || isExporting}
          >
            Trang sau ▶
          </button>

          {isTeacher && authType === 'u1' && (
            <button
              className={`${styles.toolButton} ${styles.active}`}
              onClick={async () => {
                try {
                  const settings = { text, oly, isBold, fontSize };
                  const { data: existing } = await supabase
                    .from('mg_activities')
                    .select('id')
                    .eq('share_code', id)
                    .single();

                  if (existing) {
                    await supabase.from('mg_activities').update({
                      title: docTitle,
                      settings: settings,
                    }).eq('id', existing.id);
                  } else {
                    await supabase.from('mg_activities').insert({
                      creator_id: user.id,
                      template_slug: 'viet-bai',
                      title: docTitle || 'Bản nháp không tên',
                      share_code: id,
                      settings: settings,
                      is_public: false,
                    });
                  }
                  alert('✅ Đã sao lưu thành công lên Máy Chủ!');
                } catch(err) {
                  console.error(err);
                  alert('Lỗi kết nối khi lưu.');
                }
              }}
              disabled={isExporting}
              style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none' }}
            >
              💾 Lưu Nháp
            </button>
          )}

          <button
            className={`${styles.toolButton} ${styles.active}`}
            onClick={handleExport}
            disabled={isExporting}
            style={{ backgroundColor: '#10b981', color: 'white', border: 'none' }}
          >
            {isExporting ? '⏳ Đang tạo PDF...' : '🖨 Tải xuống PDF'}
          </button>
        </div>
      </div>

      {/* Paper — chỉ hiển thị trang hiện tại */}
      <div ref={paperRef} className={styles.paperContainer}>
        <div 
           className={styles.notebookWrapper} 
           style={{ 
             width: exactNotebookWidth, 
             height: Math.ceil(exactNotebookWidth * 1.4142),
             margin: '0 auto' 
           }}
        >
          {/* Grid layer */}
          <div
            className={styles.gridLayer}
            style={{
              fontFamily: gridFont,
              ...sharedStyle,
            }}
            dangerouslySetInnerHTML={{ __html: gridHTML }}
          />

          {/* Text input layer */}
          <textarea
            className={styles.textInput}
            style={{
              fontFamily: textFont,
              paddingTop: `${textPaddingTop}px`,
              paddingLeft: `${gridCharWidth}px`,
              boxSizing: 'border-box',
              tabSize: `${gridCharWidth}px`,
              ...sharedStyle,
              color: 'transparent',
            }}
            value={currentText}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const start = e.target.selectionStart;
                const end = e.target.selectionEnd;
                const newVal = currentText.substring(0, start) + '\t' + currentText.substring(end);
                const newPages = [...pages];
                newPages[currentPage] = newVal;
                setText(newPages.join('\n'));
                setTimeout(() => {
                  if (e.target) e.target.selectionStart = e.target.selectionEnd = start + 1;
                }, 0);
              }
            }}
            spellCheck="false"
          />

          {/* Rendered text layer */}
          <div
            className={styles.textRender}
            style={{
              fontFamily: textFont,
              paddingTop: `${textPaddingTop}px`,
              paddingLeft: `${gridCharWidth}px`,
              boxSizing: 'border-box',
              tabSize: `${gridCharWidth}px`,
              ...sharedStyle,
            }}
          >
            {renderMappedText()}
          </div>
        </div>
      </div>
    </div>
  );
}
