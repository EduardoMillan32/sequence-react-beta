import React from 'react';

export default function Modal({ 
  isOpen, 
  onClose, 
  titulo, 
  colorTitulo = 'text-white', 
  children, 
  footer,
  maxWidth = 'max-w-[500px]'
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm w-full h-full">
      <div className={`bg-[#34495e] text-white p-6 md:p-8 rounded-xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col animate-scale-in mx-auto`}>
        
        {titulo && (
          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
            <h2 className={`text-2xl md:text-3xl font-bold ${colorTitulo} m-0`}>{titulo}</h2>
            {onClose && (
              <button 
                onClick={onClose}
                className="text-[#e74c3c] text-3xl font-bold leading-none hover:text-[#ff7675] transition-colors ml-4"
              >
                &times;
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto text-left text-[0.95rem]">
          {children}
        </div>

        {footer && (
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
