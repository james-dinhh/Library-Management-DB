import React, { createContext, useContext, useState, useCallback } from 'react';

type Toast = { id: number; type: 'success' | 'error' | 'info'; message: string };

type ToastContextType = {
  show: (message: string, type?: Toast['type']) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter(x => x.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* Inline styles for slide down/up animation */}
      <style>{`
        @keyframes slideDownUp {
          0% { transform: translateY(-16px); opacity: 0; }
          12% { transform: translateY(0); opacity: 1; }
          85% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-16px); opacity: 0; }
        }
        .toast-animate { animation: slideDownUp 3s ease forwards; }
      `}</style>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast-animate pointer-events-auto mx-auto max-w-md px-4 py-2 rounded-lg shadow text-white text-sm text-center ${
              t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-gray-800'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
