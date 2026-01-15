import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Modal {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
  isMinimized: boolean;
  status?: 'idle' | 'running' | 'success' | 'error';
}

interface ModalContextType {
  modals: Modal[];
  openModal: (id: string, title: string, content: ReactNode, description?: string) => void;
  closeModal: (id: string) => void;
  minimizeModal: (id: string) => void;
  maximizeModal: (id: string) => void;
  updateModalStatus: (id: string, status: 'idle' | 'running' | 'success' | 'error') => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modals, setModals] = useState<Modal[]>([]);

  const openModal = (id: string, title: string, content: ReactNode, description?: string) => {
    setModals(prev => {
      const existing = prev.find(m => m.id === id);
      if (existing) {
        return prev.map(m => m.id === id ? { ...m, isMinimized: false } : m);
      }
      return [...prev, { id, title, description, content, isMinimized: false, status: 'idle' }];
    });
  };

  const closeModal = (id: string) => {
    setModals(prev => prev.filter(m => m.id !== id));
  };

  const minimizeModal = (id: string) => {
    setModals(prev => prev.map(m => m.id === id ? { ...m, isMinimized: true } : m));
  };

  const maximizeModal = (id: string) => {
    setModals(prev => prev.map(m => m.id === id ? { ...m, isMinimized: false } : m));
  };

  const updateModalStatus = (id: string, status: 'idle' | 'running' | 'success' | 'error') => {
    setModals(prev => prev.map(m => m.id === id ? { ...m, status } : m));
  };

  return (
    <ModalContext.Provider value={{ modals, openModal, closeModal, minimizeModal, maximizeModal, updateModalStatus }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
};
