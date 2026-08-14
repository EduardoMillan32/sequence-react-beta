import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { ref, set, onValue, onDisconnect, remove, update, get, push } from 'firebase/database';
import { useJuego } from './JuegoContext';
import { useToast } from './ToastContext';
import { calcularReglas } from '../config/reglas';

const SalaContext = createContext();

export function useSala() {
  return useContext(SalaContext);
}

export function SalaProvider({ children }) {
  const [salaId, setSalaId] = useState(null);
  const [jugadorId, setJugadorId] = useState(null);
  const [jugadorLocal, setJugadorLocal] = useState({ nombre: '', color: null, listo: false });
  const [jugadores, setJugadores] = useState([]);
  const [estadoJuego, setEstadoJuego] = useState(null);
  const [nombresEquipos, setNombresEquipos] = useState({ rojo: 'Rojo', azul: 'Azul', verde: 'Verde' });
  const [yaLimpioSala, setYaLimpioSala] = useState(false);
  const [mensajeValidacion, setMensajeValidacion] = useState('');
  const { mostrarToast } = useToast();

  // Limpieza al cerrar la pestaña abruptamente (Idéntico a tu Vanilla JS)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Solo limpiamos si estamos en una sala y el juego AÚN NO ha iniciado (estamos en el Lobby)
      if (salaId && jugadorId && (!estadoJuego || !estadoJuego.iniciado)) {
        const baseUrl = "https://secuence-7d7af-default-rtdb.firebaseio.com";
        
        // Peticiones "keepalive" para que se envíen aunque el navegador se esté cerrando
        fetch(`${baseUrl}/${salaId}/jugadores/${jugadorId}.json`, { method: 'DELETE', keepalive: true }).catch(()=>{});
        fetch(`${baseUrl}/${salaId}/presencia/${jugadorId}.json`, { method: 'DELETE', keepalive: true }).catch(()=>{});
        
        // Si no hay más jugadores humanos, destruir la sala completa
        if (jugadores.filter(j => !j.esBot).length <= 1) {
           fetch(`${baseUrl}/${salaId}.json`, { method: 'DELETE', keepalive: true }).catch(()=>{});
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [salaId, jugadorId, estadoJuego, jugadores]);

  /**
   * Efecto de inicialización que verifica si el usuario tiene una sesión activa guardada en el navegador (localStorage).
   * Si existe, consulta a Firebase para confirmar que la sala y el jugador aún son válidos.
   * Esto permite que si el usuario recarga la página por accidente, vuelva a entrar automáticamente a su partida
   * sin tener que volver a escribir su nombre y el código de la sala.
   * También configura un evento 'onDisconnect' en Firebase para que, si el usuario cierra la pestaña o pierde conexión,
   * su estado de "presencia" se elimine automáticamente de la base de datos.
   */
  useEffect(() => {
    const sesionGuardada = localStorage.getItem('sequence_sesion_activa');
    if (sesionGuardada) {
      try {
        const datosSesion = JSON.parse(sesionGuardada);
        const verificarSesion = async () => {
          const jugadorRef = ref(db, `${datosSesion.salaId}/jugadores/${datosSesion.jugadorId}`);
          const snapshot = await get(jugadorRef);
          if (snapshot.exists()) {
            setSalaId(datosSesion.salaId);
            setJugadorId(datosSesion.jugadorId);
            setJugadorLocal(snapshot.val());
            
            const presenciaRef = ref(db, `${datosSesion.salaId}/presencia/${datosSesion.jugadorId}`);
            await set(presenciaRef, true);
            onDisconnect(presenciaRef).remove();
          } else {
            localStorage.removeItem('sequence_sesion_activa');
          }
        };
        verificarSesion();
      } catch (e) {
        localStorage.removeItem('sequence_sesion_activa');
      }
    }
  }, []);

  /**
   * Método principal para que un usuario ingrese a una sala desde la pantalla de Login.
   * Recibe el nombre del jugador y el código de la sala.
   * Primero normaliza el nombre de la sala (quita espacios y caracteres especiales).
   * Luego realiza una limpieza de "jugadores fantasma" (jugadores que están en la base de datos pero no tienen presencia activa).
   * Finalmente, registra al nuevo jugador en Firebase, guarda su sesión en localStorage y configura su desconexión automática.
   */
  const entrarSala = async (nombre, sala) => {
    const salaNormalizada = sala.trim().toLowerCase().replace(/[\s.#$[\]]/g, '');
    
    try {
      const snapJugadores = await get(ref(db, `${salaNormalizada}/jugadores`));
      const snapPresencia = await get(ref(db, `${salaNormalizada}/presencia`));
      
      const jugadoresBD = snapJugadores.val() || {};
      const presenciaBD = snapPresencia.val() || {};
      const updatesFantasma = {};
      let limpioAlgo = false;

      Object.keys(jugadoresBD).forEach(id => {
          if (!presenciaBD[id]) {
              updatesFantasma[`${salaNormalizada}/jugadores/${id}`] = null;
              limpioAlgo = true;
          }
      });

      if (limpioAlgo) {
          await update(ref(db), updatesFantasma);
      }

      setSalaId(salaNormalizada);
      setJugadorLocal(prev => ({ ...prev, nombre }));
      setYaLimpioSala(false);

      const jugadoresRef = ref(db, `${salaNormalizada}/jugadores`);
      const nuevoJugadorRef = push(jugadoresRef);
      const nuevoId = nuevoJugadorRef.key;

      setJugadorId(nuevoId);

      const datosJugador = { nombre, color: null, listo: false };
      await set(nuevoJugadorRef, datosJugador);

      localStorage.setItem('sequence_sesion_activa', JSON.stringify({
        salaId: salaNormalizada,
        jugadorId: nuevoId
      }));

      const presenciaRef = ref(db, `${salaNormalizada}/presencia/${nuevoId}`);
      await set(presenciaRef, true);
      onDisconnect(presenciaRef).remove();
      
      const jugadorRef = ref(db, `${salaNormalizada}/jugadores/${nuevoId}`);
      onDisconnect(jugadorRef).cancel();

      // Configurar testamento para abandono abrupto
      const estadoRef = ref(db, `${salaNormalizada}/estado`);
      onDisconnect(estadoRef).update({
        abandonado: true,
        nombreAbandono: nombre
      });

      return true;
    } catch (error) {
      console.error("Error al entrar a la sala:", error);
      mostrarToast("Error al entrar a la sala:", "error");
      throw error;
    }
  };

  /**
   * Efecto que se encarga de escuchar en tiempo real los cambios en la sala de Firebase.
   * Se activa únicamente cuando el usuario ya tiene un 'salaId' asignado.
   * Configura tres "listeners" (observadores) principales:
   * 1. Jugadores: Actualiza la lista de jugadores conectados. Además, contiene lógica de limpieza:
   *    si detecta que eres el único humano en la sala al entrar, asume que es una sala vieja y borra
   *    el tablero, el mazo y los bots anteriores para empezar de cero.
   * 2. Estado del Juego: Escucha si el juego ya inició, de quién es el turno, si alguien ganó, etc.
   * 3. Nombres de Equipos: Escucha si alguien cambió el nombre de los equipos (Rojo, Azul, Verde).
   * Al desmontarse el componente, se cancelan las suscripciones para evitar fugas de memoria.
   */
  useEffect(() => {
    if (!salaId) return;

    const jugadoresRef = ref(db, `${salaId}/jugadores`);
    const unsubJugadores = onValue(jugadoresRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setJugadores(lista);

        // Guard de re-inserción: Si mi jugadorId no está en la lista, me vuelvo a insertar
        if (jugadorId && !data[jugadorId] && jugadorLocal.nombre) {
          console.warn("Guard de re-inserción activado: Restaurando jugador en Firebase");
          set(ref(db, `${salaId}/jugadores/${jugadorId}`), jugadorLocal);
          set(ref(db, `${salaId}/presencia/${jugadorId}`), true);
        }

        const humanosEnSala = lista.filter(j => !j.esBot);
        if (!yaLimpioSala && jugadorId &&
            humanosEnSala.length === 1 &&
            humanosEnSala[0].id === jugadorId) {
            setYaLimpioSala(true);
            
            const updates = {};
            updates[`${salaId}/nombresEquipos`] = null;
            updates[`${salaId}/estado`] = null;
            updates[`${salaId}/tablero`] = null;
            updates[`${salaId}/mazo`] = null;
            
            const bots = lista.filter(j => j.esBot);
            bots.forEach(bot => {
                updates[`${salaId}/jugadores/${bot.id}`] = null;
                updates[`${salaId}/presencia/${bot.id}`] = null;
            });

            update(ref(db), updates);
        }

        if (lista.length > 0) {
            get(ref(db, `${salaId}/estado`)).then((snap) => {
                const est = snap.val();
                if (est && est.abandonado && !est.iniciado) {
                    set(ref(db, `${salaId}/estado`), null);
                }
            });
        }
      } else {
        setJugadores([]);
        setEstadoJuego(null);
      }
    });

    const estadoRef = ref(db, `${salaId}/estado`);
    const unsubEstado = onValue(estadoRef, (snapshot) => {
      setEstadoJuego(snapshot.val());
    });

    const equiposRef = ref(db, `${salaId}/nombresEquipos`);
    const unsubEquipos = onValue(equiposRef, (snapshot) => {
      if (snapshot.exists()) {
        setNombresEquipos(snapshot.val());
      }
    });

    return () => {
      unsubJugadores();
      unsubEstado();
      unsubEquipos();
    };
  }, [salaId, jugadorId, yaLimpioSala]);

  // ==========================================
  // ACCIONES DEL LOBBY
  // ==========================================
  const seleccionarColor = async (color) => {
    if (!salaId || !jugadorId) return;
    setJugadorLocal(prev => ({ ...prev, color }));
    await update(ref(db, `${salaId}/jugadores/${jugadorId}`), { color });
  };

  const alternarListo = async () => {
    if (!salaId || !jugadorId) return;
    const nuevoEstado = !jugadorLocal.listo;
    setJugadorLocal(prev => ({ ...prev, listo: nuevoEstado }));
    await update(ref(db, `${salaId}/jugadores/${jugadorId}`), { listo: nuevoEstado });
  };

  // Efecto para verificar si todos están listos e iniciar el juego automáticamente
  useEffect(() => {
    if (!salaId || !jugadorId || jugadores.length === 0) return;
    if (estadoJuego?.iniciado) return; // No hacer nada si ya inició

    const totalJugadores = jugadores.length;
    const todosListos = jugadores.every(j => j.listo);
    
    if (!todosListos) {
      setMensajeValidacion("Faltan jugadores por confirmar.");
      return;
    }

    // Validar reglas de equipos
    const conteo = { rojo: 0, azul: 0, verde: 0 };
    jugadores.forEach(j => { if (j.color) conteo[j.color]++; });

    const cantidades = Object.values(conteo).filter(c => c > 0);
    const numEquipos = cantidades.length;

    let juegoValido = false;

    if (numEquipos === 2) {
        if (totalJugadores % 2 === 0 && cantidades[0] === cantidades[1]) {
            juegoValido = true;
        } else {
            setMensajeValidacion("Para 2 equipos, deben ser pares y estar equilibrados.");
        }
    } else if (numEquipos === 3) {
        if (totalJugadores % 3 === 0 && cantidades[0] === cantidades[1] && cantidades[1] === cantidades[2]) {
            juegoValido = true;
        } else {
            setMensajeValidacion("Para 3 equipos, deben tener la misma cantidad de jugadores.");
        }
    } else {
      setMensajeValidacion("Debe haber al menos 2 equipos para jugar.");
    }

    if (!juegoValido) return;

    setMensajeValidacion("¡Todo listo! Iniciando partida...");

    // Solo el primer jugador (anfitrión) inicia la partida
    if (jugadores[0].id === jugadorId) {
      const iniciarPartida = async () => {
        // Iniciar juego automáticamente
        const palos = ['S', 'H', 'D', 'C'];
        const valores = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Q', 'K'];
        let mazoBase = [];
        palos.forEach(palo => {
            valores.forEach(valor => mazoBase.push(valor + palo));
        });
        const jacksEspeciales = ['J1D', 'J1D', 'J1C', 'J1C', 'J2H', 'J2H', 'J2S', 'J2S'];
        let mazoCompleto = [...mazoBase, ...mazoBase, ...jacksEspeciales];
        
        for (let i = mazoCompleto.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [mazoCompleto[i], mazoCompleto[j]] = [mazoCompleto[j], mazoCompleto[i]];
        }

        const { cartasPorJugador } = calcularReglas(totalJugadores, numEquipos);
        const updates = {};
        
        jugadores.forEach(jugador => {
          const mano = mazoCompleto.splice(-cartasPorJugador);
          updates[`${salaId}/jugadores/${jugador.id}/mano`] = mano;
        });

        // Ordenar turnos intercalando equipos
        const verdes = jugadores.filter(j => j.color === 'verde');
        const azules = jugadores.filter(j => j.color === 'azul');
        const rojos  = jugadores.filter(j => j.color === 'rojo');

        const ordenTurnos = [];
        const maxPorEquipo = Math.max(verdes.length, azules.length, rojos.length);
        for (let i = 0; i < maxPorEquipo; i++) {
            if (verdes[i]) ordenTurnos.push(verdes[i].id);
            if (azules[i]) ordenTurnos.push(azules[i].id);
            if (rojos[i])  ordenTurnos.push(rojos[i].id);
        }

        const indiceAleatorio = Math.floor(Math.random() * ordenTurnos.length);
        const primerTurnoId   = ordenTurnos[indiceAleatorio];

        updates[`${salaId}/mazo`] = mazoCompleto;
        updates[`${salaId}/estado/ordenTurnos`] = ordenTurnos;
        updates[`${salaId}/estado/turnoActual`] = primerTurnoId;
        updates[`${salaId}/estado/iniciado`] = true;
        updates[`${salaId}/estado/host`] = jugadorId;
        updates[`${salaId}/estado/jugadoresTotales`] = totalJugadores;
        updates[`${salaId}/estado/equiposTotales`] = numEquipos;
        updates[`${salaId}/estado/historial/${Date.now()}`] = "🎮 ¡El juego ha comenzado!";

        await update(ref(db), updates);
      };
      
      iniciarPartida();
    }
  }, [jugadores, salaId, jugadorId, estadoJuego?.iniciado]);

  const agregarBot = async (color, dificultad) => {
    if (!salaId) {
      return;
    }

    const idBot = `bot_${Date.now()}`;
    let nombreDificultad = "";
    if (dificultad === 'facil') nombreDificultad = "Fácil";
    if (dificultad === 'normal') nombreDificultad = "Normal";
    if (dificultad === 'dificil') nombreDificultad = "Difícil";

    const nuevoBot = {
        nombre: `🤖 CPU ${nombreDificultad}`,
        color: color,
        listo: true,
        esBot: true,
        dificultad: dificultad
    };

    const updates = {};
    updates[`${salaId}/jugadores/${idBot}`] = nuevoBot;
    updates[`${salaId}/presencia/${idBot}`] = true;

    try {
      await update(ref(db), updates);
    } catch (error) {
      console.error("Error al agregar bot:", error);
      mostrarToast("Error al agregar bot:", "error");
    }
  };

  const eliminarBot = async (idBot) => {
    if (!salaId) return;
    
    const updates = {};
    updates[`${salaId}/jugadores/${idBot}`] = null;
    updates[`${salaId}/presencia/${idBot}`] = null;

    await update(ref(db), updates);
  };

  const ciclarColorBot = async (idBot, colorActual) => {
    if (!salaId) return;
    const colores = ['rojo', 'azul', 'verde'];
    let idx = colores.indexOf(colorActual);
    let nuevoColor = colores[(idx + 1) % colores.length];
    
    await update(ref(db, `${salaId}/jugadores/${idBot}`), {
        color: nuevoColor
    });
  };

  const ciclarDificultadBot = async (idBot, dificultadActual) => {
    if (!salaId) return;
    const dificultades = ['facil', 'normal', 'dificil'];
    let idx = dificultades.indexOf(dificultadActual);
    let nuevaDificultad = dificultades[(idx + 1) % dificultades.length];
    
    let nombreDificultad = "";
    if (nuevaDificultad === 'facil') nombreDificultad = "Fácil";
    if (nuevaDificultad === 'normal') nombreDificultad = "Normal";
    if (nuevaDificultad === 'dificil') nombreDificultad = "Difícil";

    await update(ref(db, `${salaId}/jugadores/${idBot}`), {
        dificultad: nuevaDificultad,
        nombre: `🤖 CPU ${nombreDificultad}`
    });
  };

  // Usamos un ref o un evento para limpiar el estado del juego sin causar dependencias circulares
  // Ya que SalaContext envuelve a JuegoContext, no podemos usar useJuego aquí directamente.
  // En su lugar, despacharemos un evento personalizado que JuegoContext escuchará.
  
  const salirSala = async () => {
    // Despachar evento para limpiar estado local del juego
    window.dispatchEvent(new Event('limpiarEstadoJuego'));

    if (salaId && jugadorId) {
      const humanosEnSala = jugadores.filter(j => !j.esBot);
      
      if (estadoJuego && estadoJuego.iniciado) {
        // Si hay partida activa y somos más de 1 humano, marcamos abandono inmediato
        if (humanosEnSala.length > 1) {
            const updates = {
                abandonado: true,
                nombreAbandono: jugadorLocal.nombre
            };
            
            // Si somos el host, pasamos el host a otro humano
            if (estadoJuego.host === jugadorId) {
                const otroHumano = humanosEnSala.find(j => j.id !== jugadorId);
                if (otroHumano) {
                    updates.host = otroHumano.id;
                }
            }
            
            await update(ref(db, `${salaId}/estado`), updates);
        }
      }

      if (humanosEnSala.length <= 1) {
        // Si éramos el último humano, destruimos la sala completa
        await remove(ref(db, salaId));
      } else {
        // Si quedan humanos, solo nos borramos a nosotros
        await remove(ref(db, `${salaId}/jugadores/${jugadorId}`));
        await remove(ref(db, `${salaId}/presencia/${jugadorId}`));
      }
    }
    
    localStorage.removeItem('sequence_sesion_activa');
    setSalaId(null);
    setJugadorId(null);
    setJugadorLocal({ nombre: '', color: null, listo: false });
  };

  const cambiarNombreEquipo = async (color, nuevoNombre) => {
    if (!salaId || !color || !nuevoNombre.trim()) return;
    await set(ref(db, `${salaId}/nombresEquipos/${color}`), nuevoNombre.trim());
  };

  const volverAlLobby = async () => {
    if (!salaId || !jugadorId) return;
    
    const humanosEnSala = jugadores.filter(j => !j.esBot);
    if (humanosEnSala.length > 0 && humanosEnSala[0].id !== jugadorId) return;

    const updates = {};
    updates[`${salaId}/estado`] = null;
    updates[`${salaId}/tablero`] = null;
    updates[`${salaId}/nombresEquipos`] = null;
    updates[`${salaId}/mazo`] = null;
    
    jugadores.forEach(j => {
        updates[`${salaId}/jugadores/${j.id}/mano`] = null;
        // Los bots siempre están listos, los humanos vuelven a estado no listo
        updates[`${salaId}/jugadores/${j.id}/listo`] = j.esBot ? true : false;
    });

    // Actualizar el estado local del jugador para que el botón refleje el cambio
    setJugadorLocal(prev => ({ ...prev, listo: false }));

    await update(ref(db), updates);
  };

  const value = {
    salaId,
    jugadorId,
    jugadorLocal,
    jugadores,
    estadoJuego,
    nombresEquipos,
    mensajeValidacion,
    entrarSala,
    seleccionarColor,
    alternarListo,
    salirSala,
    agregarBot,
    eliminarBot,
    ciclarColorBot,
    ciclarDificultadBot,
    cambiarNombreEquipo,
    volverAlLobby
  };

  return (
    <SalaContext.Provider value={value}>
      {children}
    </SalaContext.Provider>
  );
}
