import React, { useState, useEffect } from 'react';
import { MAPA_CARTAS } from '../utils/constantes';
import { useJuego } from '../contextos/JuegoContext';
import { useSala } from '../contextos/SalaContext';
import { useToast } from '../contextos/ToastContext';

/**
 * Componente Tablero: Renderiza la cuadrícula de 10x10 con las cartas y fichas.
 * Maneja la interacción del usuario al hacer clic en una casilla para jugar una carta.
 */
export default function Tablero() {
  const { 
    tablero, 
    mano, 
    cartaSeleccionadaIdx, 
    miTurno, 
    jugarCarta,
    fichasProtegidas,
    ultimaFichaColocada,
    setUltimaFichaColocada,
    ultimaCasillaRemovida,
    setUltimaCasillaRemovida
  } = useJuego();

  const [fichasSaliendo, setFichasSaliendo] = useState({});
  
  const { jugadorLocal } = useSala();
  const { mostrarToast } = useToast();
  const { ultimoJack } = useJuego();

  // Limpiar efectos visuales después de un tiempo
  useEffect(() => {
    if (ultimaFichaColocada) {
      const timer = setTimeout(() => setUltimaFichaColocada(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [ultimaFichaColocada, setUltimaFichaColocada]);

  useEffect(() => {
    if (ultimaCasillaRemovida) {
      const timer = setTimeout(() => setUltimaCasillaRemovida(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [ultimaCasillaRemovida, setUltimaCasillaRemovida]);

  // Efecto para manejar la animación de salida suave
  useEffect(() => {
    if (ultimaCasillaRemovida) {
      const indice = ultimaCasillaRemovida.indice;
      const color = tablero[indice]; // Guardamos el color antes de que se borre de Firebase
      
      if (color) {
        setFichasSaliendo(prev => ({ ...prev, [indice]: color }));
        
        // Limpiar el estado local después de que termine la animación (ej. 300ms)
        setTimeout(() => {
          setFichasSaliendo(prev => {
            const newState = { ...prev };
            delete newState[indice];
            return newState;
          });
        }, 300);
      }
    }
  }, [ultimaCasillaRemovida, tablero]);

  /**
   * Maneja el clic en una casilla del tablero.
   * Valida si es el turno del jugador, si tiene una carta seleccionada,
   * y si la jugada es válida (coincide la carta o es un Jack).
   */
  const manejarClickCasilla = (indice, cartaTablero) => {
    if (!miTurno) {
      mostrarToast("¡Paciencia! Aún no es tu turno.", "warning");
      return;
    }
    if (cartaSeleccionadaIdx === null) {
      mostrarToast("¡Primero selecciona una carta de tu mano!", "warning");
      return;
    }
    if (cartaTablero === "LIBRE") {
      mostrarToast("Las esquinas son comodines para todos.", "info");
      return;
    }

    const cartaEnMano = mano[cartaSeleccionadaIdx];
    const colorFichaActual = tablero[indice];

    // Lógica Jack 1 Ojo (Quitar)
    if (cartaEnMano.startsWith("J2")) {
      if (!colorFichaActual) {
        mostrarToast("Usa el Jack sobre una ficha del oponente.", "warning");
        return;
      }
      if (colorFichaActual === jugadorLocal.color) {
        mostrarToast("No puedes quitar tus propias fichas con el Jack de 1 Ojo.", "error");
        return;
      }
      
      // Validar si la ficha es parte de un Sequence protegido
      const estaProtegida = fichasProtegidas && (Array.isArray(fichasProtegidas) ? fichasProtegidas.includes(indice) : !!fichasProtegidas[indice]);

      if (estaProtegida) {
        mostrarToast("No puedes quitar una ficha que forma parte de un Sequence.", "error");
        return;
      }
      
      setUltimaCasillaRemovida({ indice, ts: Date.now() });
      setUltimaFichaColocada(null);
      jugarCarta(indice, 'remove', cartaEnMano);
      return;
    }

    // Lógica Poner Ficha
    if (colorFichaActual) {
      mostrarToast("Esta casilla ya está ocupada.", "warning");
      return;
    }

    const jugadaValida = cartaEnMano.startsWith("J1") || (cartaEnMano === cartaTablero);
    if (!jugadaValida) {
      mostrarToast("Esa carta no coincide con esta casilla.", "error");
      return;
    }

    setUltimaFichaColocada({ indice, ts: Date.now() });
    setUltimaCasillaRemovida(null);
    jugarCarta(indice, 'add', cartaEnMano.startsWith("J1") ? cartaEnMano : null);
  };

  return (
    <div className="w-full flex justify-center p-2.5 pb-0">
      <div className="grid grid-cols-10 bg-[#1a472a] rounded-lg mx-auto shadow-[0_8px_25px_rgba(0,0,0,0.6)] border-[#3e2723] w-[98vw] p-[2px] gap-[1px] border-[1.5px] mt-0 mb-[160px] min-[701px]:w-[95vw] min-[701px]:max-w-[650px] min-[701px]:p-[6px] min-[701px]:gap-[2px] min-[701px]:border-[5px] min-[701px]:mt-[10px] min-[701px]:mb-[180px] md:max-w-[min(650px,70vh)] md:p-[8px] md:gap-[3px] md:mb-[200px]">
        {MAPA_CARTAS.map((carta, index) => {
          const colorFicha = tablero[index] || fichasSaliendo[index];
          const estaSaliendo = !!fichasSaliendo[index];
          const esProtegida = fichasProtegidas && (Array.isArray(fichasProtegidas) ? fichasProtegidas.includes(index) : !!fichasProtegidas[index]);
          const colorProtegida = esProtegida ? (Array.isArray(fichasProtegidas) ? colorFicha : fichasProtegidas[index]) : null;
          const esUltimaColocada = ultimaFichaColocada?.indice === index;
          const esUltimaRemovida = ultimaCasillaRemovida?.indice === index;
          
          return (
            <div 
              key={index}
              onClick={() => manejarClickCasilla(index, carta)}
              className={`bg-white flex items-center justify-center rounded-[3px] overflow-hidden relative box-border cursor-pointer transition-transform duration-150 isolate hover:scale-[1.08] hover:z-20 hover:shadow-[0_0_8px_rgba(241,196,15,0.6)] active:scale-95 aspect-[2.3/3.5] min-[701px]:aspect-[2.5/3.5]
                ${esProtegida ? `protegida-${colorProtegida}` : ''}
                ${esUltimaRemovida ? 'animate-shake bg-red-500/30' : ''}
              `}
            >
              {carta === "LIBRE" ? (
                <div className="w-full h-full bg-[#f1c40f] flex items-center justify-center text-black text-[1.5rem] md:text-[2rem] max-[700px]:text-[1.2rem] cursor-default">
                  ⭐
                </div>
              ) : (
                <img 
                  src={`./images/cartas/${carta}.png`} 
                  alt={carta} 
                  className="w-full h-full object-fill pointer-events-none select-none rounded-[3px]"
                  loading="lazy"
                  draggable="false"
                />
              )}
              
              {colorFicha && (
                <div className={`
                  absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] md:w-[70%] max-[700px]:w-[70%] aspect-square rounded-full z-10 
                  shadow-[inset_0_0_8px_rgba(0,0,0,0.5),0_2px_5px_rgba(0,0,0,0.8)] border-2 max-[700px]:border-[1px] border-white
                  transition-all duration-300 ease-in-out
                  ${colorFicha === 'rojo' ? 'bg-[radial-gradient(circle_at_35%_35%,#ff6b6b,#c0392b)]' : ''}
                  ${colorFicha === 'azul' ? 'bg-[radial-gradient(circle_at_35%_35%,#74b9ff,#2980b9)]' : ''}
                  ${colorFicha === 'verde' ? 'bg-[radial-gradient(circle_at_35%_35%,#55efc4,#00b894)]' : ''}
                  ${estaSaliendo ? 'scale-0 opacity-0' : esUltimaColocada ? 'animate-scale-in-ficha delay-pulso-ultima border-[#f1c40f]' : 'animate-scale-in-ficha'}
                `}></div>
              )}

              {/* Efecto de remoción */}
              {esUltimaRemovida && !colorFicha && (
                <div className="absolute inset-0 flex items-center justify-center rounded-[3px] z-[11] pointer-events-none animate-pulso-removida bg-[rgba(231,76,60,0.15)]">
                  <svg width="45%" height="45%" viewBox="0 0 24 24" fill="none" stroke="rgba(231,76,60,0.9)" strokeWidth="3" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Overlay para animación de Jack (Comodín) */}
      <div 
        id="overlay-jack" 
        className={`fixed inset-0 z-[5000] flex flex-col items-center justify-center transition-opacity duration-300 pointer-events-none ${ultimoJack ? 'opacity-100' : 'opacity-0'} ${ultimoJack?.tipo === 'add' ? 'bg-[radial-gradient(ellipse_at_center,rgba(39,174,96,0.4)_0%,rgba(0,0,0,0.65)_70%)]' : 'bg-[radial-gradient(ellipse_at_center,rgba(192,57,43,0.4)_0%,rgba(0,0,0,0.65)_70%)]'}`}
        style={{ display: ultimoJack ? 'flex' : 'none' }}
      >
        {ultimoJack && (
          <img 
            src={`./images/cartas/${ultimoJack.codigoCarta}.png`} 
            alt={ultimoJack.codigoCarta} 
            className="w-[clamp(80px,18vw,160px)] h-auto rounded-lg shadow-[0_0_30px_rgba(255,255,255,0.4),0_8px_30px_rgba(0,0,0,0.8)] animate-jack-giro origin-center pointer-events-none select-none"
            draggable="false"
          />
        )}
      </div>
    </div>
  );
}
