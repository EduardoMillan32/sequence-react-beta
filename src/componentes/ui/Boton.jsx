import React from 'react';

export default function Boton({ 
  children, 
  onClick, 
  variante = 'primario', 
  disabled = false, 
  className = '',
  type = 'button',
  title = ''
}) {
  const baseClasses = "px-5 py-2 rounded-lg font-bold transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantes = {
    inicial: "bg-[#f1c40f] text-black hover:bg-[#f39c12] hover:shadow-[0_4px_12px_rgba(241, 196, 15, 0.4)]",
    primario: "bg-[#2ecc71] text-white hover:bg-[#27ae60] hover:shadow-[0_4px_12px_rgba(46,204,113,0.4)]",
    peligro: "bg-[#e74c3c] text-white hover:bg-[#c0392b] hover:shadow-[0_4px_12px_rgba(231,76,60,0.4)]",
    secundario: "bg-[#7f8c8d] text-white hover:bg-[#95a5a6]",
    info: "bg-[#3498db] text-white hover:bg-[#2980b9] hover:shadow-[0_4px_12px_rgba(52,152,219,0.4)]",
    especial: "bg-[#9b59b6] text-white hover:bg-[#8e44ad] hover:shadow-[0_4px_12px_rgba(155,89,182,0.4)]",
    rojo: "bg-[#e74c3c] text-white hover:scale-105",
    azul: "bg-[#3498db] text-white hover:scale-105",
    verde: "bg-[#2ecc71] text-white hover:scale-105",
    icono: "w-8 h-8 p-0 rounded bg-white/10 hover:bg-white/20",
    iconoPeligro: "w-8 h-8 p-0 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseClasses} ${variantes[variante] || variantes.primario} ${className}`}
    >
      {children}
    </button>
  );
}
