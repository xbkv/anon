"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DynamicTitleWrapperProps {
  children: React.ReactNode;
}

const DynamicTitleWrapper: React.FC<DynamicTitleWrapperProps> = ({ children }) => {

  useEffect(() => {
    // ページタイトルの動的更新ロジックをここに追加
    const updateTitle = () => {
      const path = window.location.pathname;
      if (path === '/home') {
        document.title = '地雷掲';
      } else if (path.startsWith('/threads/')) {
        document.title = 'スレッド | 地雷掲';
      } else if (path === '/create-thread') {
        document.title = 'スレッド作成 | 地雷掲';
      }
    };

    updateTitle();
  }, []);

  return <>{children}</>;
};

export default DynamicTitleWrapper; 