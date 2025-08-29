import React, { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string; // e.g. max-w-lg
}

const Modal: React.FC<ModalProps> = ({ open, title, onClose, children, footer, widthClassName = 'max-w-lg' }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // Use a high z-index so this modal sits above any page-level overlays (e.g., BookForm uses z-50)
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl w-full ${widthClassName} mx-4`} role="dialog" aria-modal="true">
        {title && (
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
