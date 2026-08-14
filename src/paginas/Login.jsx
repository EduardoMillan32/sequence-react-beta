import React, { useState, useRef } from 'react';
import { useSala } from '../contextos/SalaContext';
import { useToast } from '../contextos/ToastContext';
import Boton from '../componentes/ui/Boton';

export default function Login() {
  const [nombre, setNombre] = useState('');
  const [sala, setSala] = useState('');
  const [cargando, setCargando] = useState(false);
  const [clicsTitulo, setClicsTitulo] = useState(0);
  const { entrarSala } = useSala();
  const { mostrarToast } = useToast();
  const timerRef = useRef(null);

  /**
   * Maneja el evento de clic en el botón "Entrar a la Sala".
   * Valida que los campos no estén vacíos y llama a la función entrarSala del contexto.
   */
  const handleEntrar = async () => {
    if (nombre.trim() && sala.trim()) {
      setCargando(true);
      try {
        await entrarSala(nombre, sala);
      } catch (error) {
        console.error("Error al entrar:", error);
        mostrarToast("Error al conectar con la sala","error");
      } finally {
        setCargando(false);
      }
    }
  };

  const handleKeyDownNombre = (e) => {
    if (e.key === 'Enter') {
      document.getElementById('input-sala').focus();
    }
  };

  const handleKeyDownSala = (e) => {
    if (e.key === 'Enter') {
      handleEntrar();
    }
  };

  const handleTituloClick = (e) => {
    // Prevenir el zoom en móviles si es un evento táctil
    if (e && e.type === 'touchstart') e.preventDefault();

    // Limpiar el timer anterior
    if (timerRef.current) clearTimeout(timerRef.current);

    // Si pasa 1 segundo sin tocar, reiniciar el contador
    timerRef.current = setTimeout(() => {
      setClicsTitulo(0);
    }, 1000);

    if (clicsTitulo + 1 === 5) {
      mostrarToast('Versión instalada: 2.0.0', 'info');
      setClicsTitulo(0);
      clearTimeout(timerRef.current);
    } else {
      setClicsTitulo(prev => prev + 1);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full">
      <h1 
        className="text-4xl font-bold mb-4 text-center drop-shadow-md select-none cursor-pointer"
        onClick={handleTituloClick}
        onTouchStart={handleTituloClick}
      >
        Sequence 🃏
      </h1>
      
      <div className="glass-panel">
        <h3 className="text-[#bdc3c7] mb-4 text-lg font-semibold">
          Ingresa tus datos para jugar
        </h3>
        
        <input 
          id="input-nombre"
          type="text" 
          placeholder="Tu nombre (Ej. Carlos)" 
          className="input-field mb-3"
          autoComplete="off"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={handleKeyDownNombre}
        />
        
        <input 
          id="input-sala"
          type="text" 
          placeholder="Código de sala (Ej. casa)" 
          className="input-field mb-5"
          autoComplete="off"
          value={sala}
          onChange={(e) => setSala(e.target.value)}
          onKeyDown={handleKeyDownSala}
        />
        
        <Boton 
          variante="inicial"
          className="w-full"
          onClick={handleEntrar}
          disabled={cargando || !nombre.trim() || !sala.trim()}
        >
          {cargando ? 'Conectando...' : 'Entrar a la Sala'}
        </Boton>
      </div>
    </div>
  );
}
