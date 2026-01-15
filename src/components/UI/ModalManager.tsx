import React from 'react';
import { useModal } from '../../contexts/ModalContext';
import { FullScreenModal } from './FullScreenModal';
import { MinimizedModals } from './MinimizedModals';

export const ModalManager: React.FC = () => {
  const { modals } = useModal();

  return (
    <>
      {modals.map(modal => (
        !modal.isMinimized && (
          <FullScreenModal
            key={modal.id}
            id={modal.id}
            title={modal.title}
            description={modal.description}
          >
            {modal.content}
          </FullScreenModal>
        )
      ))}
      <MinimizedModals />
    </>
  );
};
