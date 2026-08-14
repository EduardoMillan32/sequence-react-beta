import React, { useState, useRef, useEffect } from 'react';
import { useSala } from '../contextos/SalaContext';
import { useToast } from '../contextos/ToastContext';
import Boton from '../componentes/ui/Boton';

/**
 * Componente Lobby: Pantalla de espera donde los jugadores se unen a equipos,
 * se declaran listos y el anfitrión puede agregar bots antes de iniciar la partida.
 */
export default function Lobby() {
  const { 
    salaId, 
    jugadorLocal, 
    jugadores, 
    nombresEquipos, 
    seleccionarColor, 
    alternarListo, 
    salirSala,
    agregarBot,
    eliminarBot,
    ciclarColorBot,
    ciclarDificultadBot,
    cambiarNombreEquipo,
    mensajeValidacion
  } = useSala();
  const { mostrarToast } = useToast();

  const [colorBot, setColorBot] = useState('azul');
  const [dificultadBot, setDificultadBot] = useState('normal');

  const colorSeleccionado = jugadorLocal.color;
  const listo = jugadorLocal.listo;
  
  const spanRef = useRef(null);

  // Efecto para actualizar el contenido del span solo si no está siendo editado
  useEffect(() => {
    if (spanRef.current && document.activeElement !== spanRef.current) {
      const nombreActual = nombresEquipos[colorSeleccionado] || (colorSeleccionado ? colorSeleccionado.charAt(0).toUpperCase() + colorSeleccionado.slice(1) : '');
      if (spanRef.current.innerText !== nombreActual) {
        spanRef.current.innerText = nombreActual;
      }
    }
  }, [nombresEquipos, colorSeleccionado]);

  // Interceptar botón hacia atrás para salir directamente de la sala
  useEffect(() => {
    const handlePopState = () => {
      salirSala();
    };

    // Inyectamos el estado en el historial para atrapar el botón "Atrás"
    window.history.pushState({ page: 'lobby' }, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [salirSala]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full py-8">
      <h1 className="text-4xl font-bold mb-2 text-center drop-shadow-md cursor-pointer select-none">
        Sala de Espera ⏳
      </h1>
      <p className="text-[#f1c40f] text-sm mb-4 tracking-widest">
        Código de sala: <strong>{salaId?.toUpperCase()}</strong>
      </p>

      <div className="glass-panel w-[95%] max-w-[500px]">
        <h3 className="text-[#bdc3c7] mb-3 text-lg font-semibold">Jugadores Conectados</h3>
        
        {/* Lista de Jugadores */}
        <ul className="bg-[#34495e]/80 rounded-lg p-3 mb-6 max-h-[200px] overflow-y-auto text-left">
          {jugadores.map(j => {
            let colorPublico = 'Pensando...';
            if (j.color === 'rojo')  colorPublico = '🔴 Rojo';
            if (j.color === 'azul')  colorPublico = '🔵 Azul';
            if (j.color === 'verde') colorPublico = '🟢 Verde';

            return (
              <li key={j.id} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0 text-sm">
                <div>
                  {j.nombre} {'\u2014'} Equipo: {colorPublico} {'\u2014'} {j.listo ? '✅ LISTO' : '⏳ Esperando'}
                </div>
                {j.esBot && (
                  <div className="flex gap-1 ml-2">
                    <Boton 
                      variante="icono"
                      title="Cambiar Color"
                      onClick={() => ciclarColorBot(j.id, j.color)}
                    >
                      🎨
                    </Boton>
                    <Boton 
                      variante="icono"
                      title="Cambiar Dificultad"
                      onClick={() => ciclarDificultadBot(j.id, j.dificultad)}
                    >
                      ⚙️
                    </Boton>
                    <Boton 
                      variante="iconoPeligro"
                      title="Eliminar Bot"
                      onClick={() => eliminarBot(j.id)}
                    >
                      ❌
                    </Boton>
                  </div>
                )}
              </li>
            );
          })}
          {jugadores.length === 0 && (
            <li className="text-center text-gray-400 py-2">No hay jugadores</li>
          )}
        </ul>

        <h3 className="text-[#bdc3c7] mb-3 text-lg font-semibold">
          Equipo: {colorSeleccionado ? (
            <span 
              ref={spanRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => cambiarNombreEquipo(colorSeleccionado, e.target.innerText)}
              className="outline-none"
            >
              {nombresEquipos[colorSeleccionado] || (colorSeleccionado.charAt(0).toUpperCase() + colorSeleccionado.slice(1))}
            </span>
          ) : 'Ninguno'}
        </h3>
        
        {/* Botones de Color */}
        <div className="flex justify-center gap-3 mb-6 flex-wrap">
          <Boton 
            variante="rojo"
            onClick={() => seleccionarColor('rojo')}
            className={colorSeleccionado === 'rojo' ? 'ring-2 ring-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : ''}
          >
            Rojo
          </Boton>
          <Boton 
            variante="azul"
            onClick={() => seleccionarColor('azul')}
            className={colorSeleccionado === 'azul' ? 'ring-2 ring-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : ''}
          >
            Azul
          </Boton>
          <Boton 
            variante="verde"
            onClick={() => seleccionarColor('verde')}
            className={colorSeleccionado === 'verde' ? 'ring-2 ring-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : ''}
          >
            Verde
          </Boton>
        </div>

        {/* Botón Listo */}
        <Boton 
          variante={listo ? "secundario" : "primario"}
          className="w-full py-3 mb-4"
          onClick={alternarListo}
          disabled={!colorSeleccionado}
        >
          {listo ? "Esperando a los demás..." : "Estoy Listo"}
        </Boton>

        {/* Panel de Bot */}
        <div className="bg-black/25 border border-white/10 rounded-xl p-4 mb-4 flex flex-col gap-3">
          <h4 className="text-left text-[#bdc3c7] font-semibold m-0">Ajustes de CPU 🤖</h4>
          
          <div className="flex gap-2">
            <select 
              className="flex-1 bg-[#2c3e50] text-white border border-white/20 rounded-lg p-2 outline-none focus:border-[#3498db] transition-colors"
              value={colorBot}
              onChange={(e) => setColorBot(e.target.value)}
            >
              <option value="rojo">🔴 Equipo Rojo</option>
              <option value="azul">🔵 Equipo Azul</option>
              <option value="verde">🟢 Equipo Verde</option>
            </select>

            <select 
              className="flex-1 bg-[#2c3e50] text-white border border-white/20 rounded-lg p-2 outline-none focus:border-[#3498db] transition-colors"
              value={dificultadBot}
              onChange={(e) => setDificultadBot(e.target.value)}
            >
              <option value="facil">🟢 Fácil</option>
              <option value="normal">🟡 Normal</option>
              <option value="dificil">🔴 Difícil</option>
            </select>
          </div>

          <Boton 
            variante="especial"
            className="w-full py-2"
            onClick={() => {
              mostrarToast(`Bot agregado (${colorBot}) modo (${dificultadBot})`, "success");
              agregarBot(colorBot, dificultadBot);
            }}
          >
            Agregar Bot a la Sala
          </Boton>
        </div>

        <Boton 
          variante="peligro"
          className="w-full py-2"
          onClick={salirSala}
        >
          Salir de la Sala
        </Boton>
        
        {mensajeValidacion && (
          <p className="text-[#e74c3c] text-sm mt-3 text-center font-bold animate-pulse">
            {mensajeValidacion}
          </p>
        )}
      </div>
    </div>
  );
}
