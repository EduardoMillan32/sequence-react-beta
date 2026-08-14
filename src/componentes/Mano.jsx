import React from 'react';
import { useJuego } from '../contextos/JuegoContext';

import { Info, ScrollText } from 'lucide-react';

/**
 * Componente Mano: Muestra las cartas del jugador en la parte inferior de la pantalla.
 * Permite seleccionar cartas, descartar cartas muertas y ver el estado del turno.
 */
export default function Mano({ miTurno, colorJugador, nombreJugadorTurno, botPensando, estaBloqueado, tieneCartaMuerta, onMostrarHistorial, onMostrarReglas, historialLength }) {
  const { 
    mano, 
    cartaSeleccionadaIdx, 
    seleccionarCarta,
    pasarTurno,
    descartarCartaMuerta,
    mazoCount
  } = useJuego();

  // Replicamos exactamente los colores y el text-shadow de tu jugador.css original
  let clasesTituloTurno = 'text-white';
  if (miTurno) {
    if (colorJugador === 'rojo') clasesTituloTurno = 'text-[#e74c3c] font-bold [text-shadow:0_0_8px_rgba(231,76,60,0.8)]';
    if (colorJugador === 'azul') clasesTituloTurno = 'text-[#3498db] font-bold [text-shadow:0_0_8px_rgba(52,152,219,0.8)]';
    if (colorJugador === 'verde') clasesTituloTurno = 'text-[#2ecc71] font-bold [text-shadow:0_0_8px_rgba(46,204,113,0.8)]';
  }

  return (
    <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 bg-[#1a252f]/95 backdrop-blur-md border-2 border-b-0 z-50 flex 
      flex-col items-center transition-all duration-400 shadow-[0_-5px_25px_rgba(0,0,0,0.8)] w-full max-w-[680px] 
      p-[8px_12px_12px_12px] rounded-[16px_16px_0_0] md:w-[95%] md:p-[12px_20px_15px_20px] xl:max-w-[750px] 
      landscape:max-h-[500px]:p-[4px_10px_6px_10px] landscape:max-h-[500px]:max-w-full landscape:max-h-[500px]:rounded-[10px_10px_0_0] 
      min-[600px]:landscape:max-h-[700px]:max-w-[800px]
      ${miTurno ? 'border-[#2ecc71] shadow-[0_-5px_20px_rgba(46,204,113,0.3)]' : 'border-[#f1c40f]'}
    `}>
      
      <div className="w-full flex justify-between items-center px-2 mb-2">
        <div className="flex-1 flex justify-start items-center gap-2">
          <span className="bg-black/50 px-2 py-1 rounded-md text-sm text-white whitespace-nowrap">
            🎴 <strong className="text-[#f1c40f]">{mazoCount}</strong>
          </span>
          {miTurno && estaBloqueado && (
            <button 
              onClick={pasarTurno}
              className="bg-[#e67e22] text-white border-none px-2 py-1 rounded text-[0.8rem] cursor-pointer whitespace-nowrap hover:bg-[#d35400] transition-colors animate-pulse"
            >
              Pasar ⏭️
            </button>
          )}
        </div>
        
        <div className="flex-1 flex justify-center">
          <h3 className={`m-0 text-[0.85rem] md:text-[1rem] text-center transition-colors duration-300 font-sans ${clasesTituloTurno}`}>
            {miTurno ? "Tu Mano (¡ES TU TURNO!)" : botPensando ? `🤖 ${nombreJugadorTurno} está pensando...` : `Esperando a ${nombreJugadorTurno}...`}
          </h3>
        </div>

        <div className="flex-1 flex justify-end items-center gap-3">
          <button 
            onClick={onMostrarHistorial}
            className="bg-transparent border-none p-1 cursor-pointer text-[#3498db] hover:bg-[#3498db]/15 rounded-md transition-all hover:scale-110 relative flex items-center justify-center"
            title="Ver Historial"
          >
            <ScrollText size={20} className="drop-shadow-[0_0_4px_rgba(52,152,219,0.7)]" />
          </button>
          <button 
            onClick={onMostrarReglas}
            className="bg-transparent border-none p-1 cursor-pointer text-[#f1c40f] hover:bg-[#f1c40f]/15 rounded-md transition-all hover:scale-110 flex items-center justify-center"
            title="Ver Reglas"
          >
            <Info size={20} className="drop-shadow-[0_0_4px_rgba(241,196,15,0.7)]" />
          </button>
        </div>
      </div>

      <div className="flex flex-row items-center w-full overflow-x-auto box-border scrollbar-hide justify-start gap-[6px] p-[5px_2px_8px_2px] md:justify-center md:gap-[10px] landscape:max-h-[500px]:p-[2px_2px_4px_2px] landscape:max-h-[500px]:gap-[4px]">
        {mano.map((carta, index) => {
          const esSeleccionada = cartaSeleccionadaIdx === index;
          const esJack2Ojos = carta.startsWith("J1");
          const esJack1Ojo = carta.startsWith("J2");

          return (
            <div 
              key={index}
              onClick={() => seleccionarCarta(index)}
              className={`relative shrink-0 aspect-[5/7] rounded-[5px] cursor-pointer transition-all duration-200 border-2 border-transparent w-[50px] h-[70px] max-[360px]:w-[43px] max-[360px]:h-[60px] md:w-[64px] md:h-[90px] xl:w-[71px] xl:h-[100px] landscape:max-h-[500px]:w-[37px] landscape:max-h-[500px]:h-[52px] min-[600px]:landscape:max-h-[700px]:w-[46px] min-[600px]:landscape:max-h-[700px]:h-[65px]
                ${esSeleccionada ? 'border-[#f1c40f] -translate-y-3 shadow-[0_8px_20px_rgba(241,196,15,0.4)]' : 'hover:-translate-y-2 hover:shadow-[0_5px_12px_rgba(0,0,0,0.5)]'}
              `}
            >
              <img 
                src={`./images/cartas/${carta}.png`} 
                alt={carta} 
                className={`w-full h-full object-fill rounded-md pointer-events-none select-none ${esSeleccionada ? 'ring-2 ring-[#f1c40f]' : ''}`}
                draggable="false"
              />
              
              {esJack2Ojos && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#27ae60] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md border-[1.5px] border-white flex items-center gap-1 z-10 whitespace-nowrap">
                  {'\u2795'} 2 OJOS
                </span>
              )}
              {esJack1Ojo && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#c0392b] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md border-[1.5px] border-white flex items-center gap-1 z-10 whitespace-nowrap">
                  {'\u274C'} 1 OJO
                </span>
              )}
            </div>
          );
        })}
      </div>
      
      {tieneCartaMuerta ? (
        <button 
          onClick={descartarCartaMuerta}
          disabled={!miTurno || cartaSeleccionadaIdx === null}
          className={`mt-1 bg-[#c0392b] text-white border-none px-3.5 py-1.5 rounded-md text-[0.8rem] font-bold cursor-pointer transition-colors animate-pulse ${(!miTurno || cartaSeleccionadaIdx === null) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e74c3c]'}`}
        >
          Descartar Carta Muerta 🗑️
        </button>
      ) : (
        <button 
          onClick={descartarCartaMuerta}
          disabled={!miTurno || cartaSeleccionadaIdx === null}
          className={`mt-1 bg-[#c0392b] text-white border-none px-3.5 py-1.5 rounded-md text-[0.8rem] font-bold cursor-pointer transition-colors ${(!miTurno || cartaSeleccionadaIdx === null) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e74c3c]'}`}
        >
          Descartar Carta Muerta 🗑️
        </button>
      )}
    </div>
  );
}
