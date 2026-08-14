import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  /**
   * Muestra una notificación flotante (toast) en la pantalla.
   * @param {string} mensaje - El texto a mostrar.
   * @param {string} tipo - 'success', 'error', 'warning' o 'info'. Determina el color.
   * @param {number} duracion - Tiempo en milisegundos antes de que desaparezca automáticamente.
   */
  const mostrarToast = useCallback((mensaje, tipo = 'info', duracion = 3000) => {
    // Usar un ID más único para evitar colisiones si se llaman múltiples toasts muy rápido
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, mensaje, tipo }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duracion);
  }, []);

  const eliminarToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-2 pointer-events-none w-[90%] max-w-[400px]">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`
              pointer-events-auto flex items-center justify-center p-3 rounded-lg shadow-lg text-white text-sm font-bold animate-fade-in-down
              ${toast.tipo === 'success' ? 'bg-[#2ecc71]' : ''}
              ${toast.tipo === 'error' ? 'bg-[#e74c3c]' : ''}
              ${toast.tipo === 'warning' ? 'bg-[#f1c40f] text-black' : ''}
              ${toast.tipo === 'info' ? 'bg-[#3498db]' : ''}
            `}
          >
            <span>{toast.mensaje}</span>
            <button 
              onClick={() => eliminarToast(toast.id)}
              className="ml-4 text-current opacity-70 hover:opacity-100"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
