import React, { useState, useEffect, useRef } from 'react';
import Tablero from '../componentes/Tablero';
import Mano from '../componentes/Mano';
import { useSala } from '../contextos/SalaContext';
import { useJuego } from '../contextos/JuegoContext';
import { MAPA_CARTAS } from '../utils/constantes';
import Modal from '../componentes/ui/Modal';
import Boton from '../componentes/ui/Boton';
import { ScrollText, AlertTriangle } from 'lucide-react';

/**
 * Componente Juego: Pantalla principal donde se desarrolla la partida.
 * Contiene el tablero, la mano del jugador, y maneja modales como reglas, historial y confirmación de salida.
 */
export default function Juego() {
  const { salaId, jugadorId, jugadorLocal, salirSala, volverAlLobby, jugadores, estadoJuego } = useSala();
  const { 
    miTurno, 
    mazoCount, 
    historial, 
    turnoActual,
    botPensando,
    secuencias,
    ultimoJack,
    mano,
    tablero,
    pasarTurno,
    reiniciarJuego
  } = useJuego();

  const [mostrarReglas, setMostrarReglas] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [jackAnimado, setJackAnimado] = useState(null);
  const [estaBloqueado, setEstaBloqueado] = useState(false);
  const [tieneCartaMuerta, setTieneCartaMuerta] = useState(false);
  const [mostrarConfirmacionSalida, setMostrarConfirmacionSalida] = useState(false);
  const historialRef = useRef(null);

  // Interceptar botón hacia atrás
  useEffect(() => {
    const handlePopState = (event) => {
      // Volver a inyectar el estado para que no salga de la página
      window.history.pushState({ page: 'sequence' }, '', window.location.href);
      // Mostrar el modal de confirmación
      setMostrarConfirmacionSalida(true);
    };

    // Inyectar el estado inicial
    window.history.pushState({ page: 'sequence' }, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const confirmarSalida = () => {
    setMostrarConfirmacionSalida(false);
    salirSala();
  };

  const cancelarSalida = () => {
    setMostrarConfirmacionSalida(false);
    // Volver a inyectar el estado para atrapar el siguiente intento de ir atrás
    window.history.pushState({ page: 'sequence' }, '', window.location.href);
  };

  const jugadorEnTurno = jugadores.find(j => j.id === turnoActual);

  // Evaluar si el jugador está bloqueado (no tiene jugadas válidas)
  useEffect(() => {
    if (!miTurno || mano.length === 0) {
      setEstaBloqueado(false);
      return;
    }

    let tieneJugadaValida = false;
    let tieneCartaMuerta = false;

    for (const carta of mano) {
      // Si tiene un Jack, siempre tiene jugada válida
      if (carta.startsWith("J")) {
        tieneJugadaValida = true;
        continue;
      }

      // Buscar si hay al menos un espacio libre para esta carta
      let espaciosLibres = 0;
      MAPA_CARTAS.forEach((cartaTablero, idx) => {
        if (cartaTablero === carta && !tablero[idx]) {
          espaciosLibres++;
        }
      });

      if (espaciosLibres > 0) {
        tieneJugadaValida = true;
      } else {
        tieneCartaMuerta = true;
      }
    }

    // Solo está bloqueado si no tiene jugadas válidas Y NO tiene cartas muertas
    // Si tiene cartas muertas, debe descartarlas, no pasar turno
    setEstaBloqueado(!tieneJugadaValida && !tieneCartaMuerta);
    setTieneCartaMuerta(tieneCartaMuerta);
  }, [miTurno, mano, tablero]);

  // Efecto para mostrar la animación del Jack gigante
  useEffect(() => {
    if (ultimoJack && ultimoJack.ts > Date.now() - 2200) { // Sincronizado con JuegoContext (2200ms)
      setJackAnimado(ultimoJack);
      // No necesitamos un timer aquí porque JuegoContext ya limpia ultimoJack a los 2200ms,
      // lo que disparará este useEffect de nuevo y entrará al 'else'
    } else {
      setJackAnimado(null);
    }
  }, [ultimoJack]);

  const esHost = estadoJuego?.host === jugadorId;
  const juegoTerminado = estadoJuego?.victoria || estadoJuego?.empate || estadoJuego?.abandonado;

  // Safe check for estadoJuego properties to prevent null reference errors
  const isAbandonado = estadoJuego?.abandonado;
  const isEmpate = estadoJuego?.empate;
  const victoria = estadoJuego?.victoria;
  const nombreAbandono = estadoJuego?.nombreAbandono;

  useEffect(() => {
    if (historialRef.current) {
      historialRef.current.scrollTop = historialRef.current.scrollHeight;
    }
  }, [historial]);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#2c3e50]">
      {/* Área Principal (Tablero) */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col items-center bg-[#1a252f]">
        <Tablero />
      </main>

      {/* Área Inferior (Mano) */}
      {!juegoTerminado && (
        <div className="z-20">
          <Mano 
            miTurno={miTurno} 
            colorJugador={jugadorLocal.color} 
            nombreJugadorTurno={jugadorEnTurno?.nombre || "el oponente"}
            botPensando={botPensando}
            estaBloqueado={estaBloqueado}
            tieneCartaMuerta={tieneCartaMuerta}
            onMostrarHistorial={() => setMostrarHistorial(true)}
            onMostrarReglas={() => setMostrarReglas(true)}
            historialLength={historial.length}
          />
        </div>
      )}

      {/* Modales */}
      <Modal
        isOpen={mostrarConfirmacionSalida}
        titulo={<span className="flex items-center gap-2"><AlertTriangle size={28} /> ¿Abandonar partida?</span>}
        colorTitulo="text-[#e74c3c]"
        maxWidth="max-w-[400px]"
        footer={
          <>
            <Boton variante="secundario" onClick={cancelarSalida}>
              Cancelar
            </Boton>
            <Boton variante="peligro" onClick={confirmarSalida}>
              Sí, salir
            </Boton>
          </>
        }
      >
        <p className="text-center text-[#bdc3c7]">Si sales ahora, te desconectarás de la sala y la partida podría terminar para los demás.</p>
      </Modal>

      <Modal
        isOpen={mostrarReglas}
        onClose={() => setMostrarReglas(false)}
        titulo={<span className="flex items-center gap-2"><ScrollText size={28} /> Reglas de Sequence</span>}
        colorTitulo="text-[#f1c40f]"
        footer={
          <Boton variante="peligro" className="w-full" onClick={() => setMostrarReglas(false)}>
            Cerrar
          </Boton>
        }
      >
        <ul className="space-y-3 text-sm text-[#bdc3c7]">
          <li>🎯 <strong>Objetivo:</strong> Formar {estadoJuego?.equiposTotales === 3 ? '1 Sequence' : '2 Sequences'} (líneas de 5 fichas).</li>
          <li>🃏 <strong>Jacks de 2 Ojos:</strong> Comodines. Pon una ficha donde quieras.</li>
          <li>🗡️ <strong>Jacks de 1 Ojo:</strong> Quita una ficha del oponente (que no sea parte de un Sequence).</li>
          <li>⭐ <strong>Esquinas:</strong> Son comodines para todos.</li>
          <li>🗑️ <strong>Carta Muerta:</strong> Si tienes una carta y sus dos espacios en el tablero están ocupados, puedes descartarla y robar otra.</li>
        </ul>
      </Modal>

      <Modal
        isOpen={mostrarHistorial}
        onClose={() => setMostrarHistorial(false)}
        titulo={<span className="flex items-center gap-2"><ScrollText size={28} /> Historial de Jugadas</span>}
        colorTitulo="text-[#3498db]"
      >
        <ul ref={historialRef} className="list-none p-0 m-0 max-h-[50vh] overflow-y-auto">
          {historial.map(h => (
            <li key={h.id} className="py-1.5 border-b border-white/10 last:border-0" dangerouslySetInnerHTML={{__html: h.mensaje}}></li>
          ))}
          {historial.length === 0 && (
            <li className="text-gray-400 text-center py-4">No hay jugadas aún.</li>
          )}
        </ul>
      </Modal>

      {/* Overlay Jack Animado */}
      <div 
        className={`fixed inset-0 flex flex-col items-center justify-center z-[5000] pointer-events-none transition-opacity duration-300 ${jackAnimado ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: jackAnimado?.tipo === 'add' 
            ? 'radial-gradient(ellipse at center, rgba(39,174,96,0.4) 0%, rgba(0,0,0,0.65) 70%)'
            : 'radial-gradient(ellipse at center, rgba(192,57,43,0.4) 0%, rgba(0,0,0,0.65) 70%)'
        }}
      >
        {jackAnimado && (
          <img 
            src={`./images/cartas/${jackAnimado.codigoCarta}.png`} 
            alt="Jack" 
            className="w-[clamp(80px,18vw,160px)] h-auto rounded-lg shadow-[0_0_30px_rgba(255,255,255,0.4),0_8px_30px_rgba(0,0,0,0.8)] animate-jack-giro origin-center pointer-events-none select-none"
          />
        )}
      </div>

      {/* Interfaz de Fin de Juego (Reemplaza la mano) */}
      {juegoTerminado && (
        <div className="absolute bottom-0 left-0 right-0 bg-[#2c3e50] border-t-4 border-[#f1c40f] p-6 z-30 flex flex-col items-center justify-center shadow-[0_-10px_30px_rgba(0,0,0,0.5)] animate-slide-up">
          <div className="text-center mb-6">
            {isAbandonado ? (
              <>
                <h2 className="text-2xl font-bold mb-2 text-[#e74c3c]">PARTIDA TERMINADA: {nombreAbandono} abandonó la sala. 🚪</h2>
              </>
            ) : isEmpate ? (
              <>
                <h2 className="text-2xl font-bold mb-2 text-[#bdc3c7]">¡EMPATE TÉCNICO! 🤝</h2>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold mb-2 text-[#f1c40f] drop-shadow-[0_0_10px_rgba(241,196,15,0.5)]">
                  ¡GANA EL EQUIPO {victoria?.toUpperCase()}! 🎉
                </h2>
              </>
            )}
          </div>
          
          <div className="flex gap-4 w-full max-w-md">
            {esHost ? (
              <Boton variante="primario" className="flex-1 py-3 text-lg" onClick={volverAlLobby}>
                Volver al Lobby 🔄
              </Boton>
            ) : (
              <Boton variante="secundario" className="flex-1 py-3 text-lg opacity-70 cursor-not-allowed" disabled>
                Esperando al anfitrión...
              </Boton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
