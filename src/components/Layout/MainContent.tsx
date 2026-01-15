import React from 'react';
import './MainContent.css';

interface MainContentProps {
  children: React.ReactNode;
}

export const MainContent: React.FC<MainContentProps> = ({ children }) => {
  return (
    <main className="main-content cyber-bg">
      <div className="content-wrapper">
        {children}
      </div>
    </main>
  );
};
