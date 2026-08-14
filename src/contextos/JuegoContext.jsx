import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { ref, onValue, update, get, runTransaction } from 'firebase/database';
import { useSala } from './SalaContext';
import { useToast } from './ToastContext';
import { MAPA_CARTAS } from '../utils/constantes';
import { calcularSecuencias } from '../utils/logicaTablero';
import { calcularReglas } from '../config/reglas';

const JuegoContext = createContext();

export function useJuego() {
  return useContext(JuegoContext);
}

export function JuegoProvider({ children }) {
  const { salaId, jugadorId, jugadorLocal, estadoJuego } = useSala();
  
  const [mano, setMano] = useState([]);
  const [cartaSeleccionadaIdx, setCartaSeleccionadaIdx] = useState(null);
  const [turnoActual, setTurnoActual] = useState(null);
  const [tablero, setTablero] = useState({});
  const [historial, setHistorial] = useState([]);
  const [mazoCount, setMazoCount] = useState(0);
  const [ordenTurnos, setOrdenTurnos] = useState([]);
  const [ultimoJack, setUltimoJack] = useState(null);
  const [botPensando, setBotPensando] = useState(false);
  const [secuencias, setSecuencias] = useState({ rojo: 0, azul: 0, verde: 0 });
  const [fichasProtegidas, setFichasProtegidas] = useState([]);
  const [combosYaMarcados, setCombosYaMarcados] = useState([]);
  const [ultimaFichaColocada, setUltimaFichaColocada] = useState(null);
  const [ultimaCasillaRemovida, setUltimaCasillaRemovida] = useState(null);

  const { mostrarToast } = useToast();

  const miTurno = turnoActual === jugadorId;

  /**
   * Función para reproducir sonidos en el juego.
   * Actualmente desactivada.
   */
  const reproducirSonido = (tipo) => {
    try {
      const audio = new Audio(`${import.meta.env.BASE_URL}sounds/${tipo}.mp3`);
      audio.volume = 0.6;
      audio.play().catch(() => {
          // El navegador bloqueó la reproducción o el archivo no existe (silencio)
      });
    } catch (error) {
        // Silencio en caso de error
    }
  };

  /**
   * Convierte el código interno de una carta (ej. "10H") en un formato visual HTML
   * con el icono del palo y el color correspondiente para mostrar en el historial.
   */
  const traducirCartaAIcono = (codigoCarta) => {
    if (codigoCarta === "LIBRE") return "⭐ Esquina Libre";

    const numero = codigoCarta.substring(0, codigoCarta.length - 1);
    const paloCodigo = codigoCarta.slice(-1);

    let iconoPalo = "";
    let colorTexto = "white";

    if (paloCodigo === 'H') { iconoPalo = "❤️"; colorTexto = "#e74c3c"; }
    if (paloCodigo === 'D') { iconoPalo = "♦️"; colorTexto = "#e74c3c"; }
    if (paloCodigo === 'S') { iconoPalo = "♠️"; colorTexto = "#bdc3c7"; }
    if (paloCodigo === 'C') { iconoPalo = "♣️"; colorTexto = "#bdc3c7"; }

    return `<span style="color:${colorTexto}; font-weight:bold; padding:2px 6px; background:rgba(0,0,0,0.3); border-radius:4px;">${numero} ${iconoPalo}</span>`;
  };

  /**
   * Envuelve el nombre de un jugador en una etiqueta HTML con el color de su equipo
   * para que resalte en los mensajes del historial.
   */
  const colorearNombre = (nombre, color) => {
    const hex = color === "rojo" ? "#e74c3c"
              : color === "azul" ? "#3498db"
              : color === "verde" ? "#2ecc71"
              : "#ffffff";
    return `<b style="color:${hex}; text-shadow:0 0 6px ${hex}80;">${nombre}</b>`;
  };

  /**
   * Efecto principal que configura todos los "listeners" (observadores) de Firebase
   * necesarios para mantener sincronizado el estado del juego en tiempo real.
   * Escucha cambios en: la mano del jugador, el tablero, el turno actual, el orden de turnos,
   * la cantidad de cartas en el mazo, el historial de acciones, y las animaciones (Jacks, fichas colocadas/removidas).
   */
  // Escuchar evento de limpieza de estado desde SalaContext
  useEffect(() => {
    const handleLimpiar = () => limpiarEstadoLocal();
    window.addEventListener('limpiarEstadoJuego', handleLimpiar);
    return () => window.removeEventListener('limpiarEstadoJuego', handleLimpiar);
  }, []);

  useEffect(() => {
    if (!salaId || !jugadorId) return;

    const manoRef = ref(db, `${salaId}/jugadores/${jugadorId}/mano`);
    const unsubMano = onValue(manoRef, (snapshot) => {
      if (snapshot.exists()) {
        setMano(snapshot.val() || []);
      } else {
        setMano([]);
      }
    });

    const tableroRef = ref(db, `${salaId}/tablero`);
    const unsubTablero = onValue(tableroRef, (snapshot) => {
      if (snapshot.exists()) {
        const nuevoTablero = snapshot.val() || {};
        
        setTablero(prevTablero => {
          for (const idx in nuevoTablero) {
            if (nuevoTablero[idx] && !prevTablero[idx]) {
              if (!miTurno) {
                setUltimaFichaColocada({
                  indice: Number(idx),
                  jugadorId: 'otro',
                  ts: Date.now()
                });
                reproducirSonido('ficha');
                
                setTimeout(() => {
                  setUltimaFichaColocada(null);
                }, 5000);
              }
            }
          }
          
          for (const idx in prevTablero) {
            if (prevTablero[idx] && !nuevoTablero[idx]) {
              if (!miTurno) {
                setUltimaCasillaRemovida({
                  indice: Number(idx),
                  jugadorId: 'otro',
                  ts: Date.now()
                });
                
                setTimeout(() => {
                  setUltimaCasillaRemovida(null);
                }, 5000);
              }
            }
          }
          
          return nuevoTablero;
        });
      } else {
        setTablero({});
      }
    });

    const turnoRef = ref(db, `${salaId}/estado/turnoActual`);
    const unsubTurno = onValue(turnoRef, (snapshot) => {
      setTurnoActual(snapshot.val());
    });

    const ordenRef = ref(db, `${salaId}/estado/ordenTurnos`);
    const unsubOrden = onValue(ordenRef, (snapshot) => {
      setOrdenTurnos(snapshot.val() || []);
    });

    const mazoRef = ref(db, `${salaId}/mazo`);
    const unsubMazo = onValue(mazoRef, (snapshot) => {
      const mazo = snapshot.val() || [];
      setMazoCount(mazo.length);
    });

    const historialRef = ref(db, `${salaId}/estado/historial`);
    const unsubHistorial = onValue(historialRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const lista = Object.keys(data).map(key => ({
          id: key,
          mensaje: data[key]
        }));
        setHistorial(lista);
      } else {
        setHistorial([]);
      }
    });

    const jackRef = ref(db, `${salaId}/estado/ultimoJack`);
    let timerJack = null;
    const unsubJack = onValue(jackRef, (snapshot) => {
      const jackData = snapshot.val();
      if (jackData) {
        setUltimoJack(jackData);
        
        if (timerJack) clearTimeout(timerJack);
        timerJack = setTimeout(() => {
          setUltimoJack(null);
        }, 2200);
      } else {
        setUltimoJack(null);
      }
    });

    const ultimaFichaRef = ref(db, `${salaId}/estado/ultimaFichaColocada`);
    let timerFicha = null;
    const unsubUltimaFicha = onValue(ultimaFichaRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUltimaFichaColocada(data);
        if (data.jugadorId !== jugadorId) reproducirSonido('ficha');
        
        if (timerFicha) clearTimeout(timerFicha);
        timerFicha = setTimeout(() => {
          setUltimaFichaColocada(null);
        }, 5000);
      } else {
        setUltimaFichaColocada(null);
      }
    });

    const ultimaRemovidaRef = ref(db, `${salaId}/estado/ultimaCasillaRemovida`);
    let timerRemovida = null;
    const unsubUltimaRemovida = onValue(ultimaRemovidaRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUltimaCasillaRemovida(data);
        
        if (timerRemovida) clearTimeout(timerRemovida);
        timerRemovida = setTimeout(() => {
          setUltimaCasillaRemovida(null);
        }, 5000);
      } else {
        setUltimaCasillaRemovida(null);
      }
    });

    const botRef = ref(db, `${salaId}/estado/botPensando`);
    const unsubBot = onValue(botRef, (snapshot) => {
      setBotPensando(snapshot.val() || false);
    });

    const secuenciasRef = ref(db, `${salaId}/estado/secuencias`);
    const unsubSecuencias = onValue(secuenciasRef, (snapshot) => {
      if (snapshot.exists()) {
        setSecuencias(snapshot.val());
      } else {
        setSecuencias({ rojo: 0, azul: 0, verde: 0 });
      }
    });

    const protegidasRef = ref(db, `${salaId}/estado/fichasProtegidas`);
    const unsubProtegidas = onValue(protegidasRef, (snapshot) => {
      if (snapshot.exists()) {
        setFichasProtegidas(snapshot.val());
      } else {
        setFichasProtegidas([]);
      }
    });

    const combosRef = ref(db, `${salaId}/estado/combosYaMarcados`);
    const unsubCombos = onValue(combosRef, (snapshot) => {
      if (snapshot.exists()) {
        setCombosYaMarcados(snapshot.val());
      } else {
        setCombosYaMarcados([]);
      }
    });

    return () => {
      unsubMano();
      unsubTablero();
      unsubTurno();
      unsubOrden();
      unsubMazo();
      unsubHistorial();
      unsubJack();
      unsubBot();
      unsubSecuencias();
      unsubProtegidas();
      unsubCombos();
      unsubUltimaFicha();
      unsubUltimaRemovida();
      if (timerJack) clearTimeout(timerJack);
      if (timerFicha) clearTimeout(timerFicha);
      if (timerRemovida) clearTimeout(timerRemovida);
    };
  }, [salaId, jugadorId]);

  /**
   * Efecto que se ejecuta cada vez que el tablero cambia para detectar si se formó una nueva secuencia.
   * Para evitar que todos los clientes escriban en Firebase al mismo tiempo, solo el "Host"
   * (el primer jugador en la lista de turnos) se encarga de realizar este cálculo y guardar el resultado.
   */
  useEffect(() => {
    if (!salaId || !jugadorId || !ordenTurnos || ordenTurnos.length === 0) return;
    
    const esHost = ordenTurnos[0] === jugadorId;
    if (!esHost) return;

    const colores = ['rojo', 'azul', 'verde'];
    let huboCambios = false;
    
    let secuenciasTemp = { ...secuencias };

    let protegidasTemp = Array.isArray(fichasProtegidas) 
      ? fichasProtegidas.reduce((acc, idx) => ({ ...acc, [idx]: tablero[idx] || 'rojo' }), {})
      : { ...fichasProtegidas };let combosTemp = [...combosYaMarcados];
    const updates = {};

    colores.forEach(color => {
      const indicesProtegidos = Object.keys(protegidasTemp).map(Number);
      const { nuevasSecuencias, nuevasProtegidas, nuevosCombos } = calcularSecuencias(tablero, color, protegidasTemp, combosTemp);
      
      if (nuevasSecuencias > 0) {
        huboCambios = true;
        secuenciasTemp[color] = (secuenciasTemp[color] || 0) + nuevasSecuencias;
        
        // ¡Guardamos el índice protegido CON SU COLOR asignado!
        nuevasProtegidas.forEach(idx => {
          protegidasTemp[idx] = color;
        });

        combosTemp = nuevosCombos;
        
        // Registrar en el historial
        const historialKey = Date.now().toString() + Math.random().toString(36).substring(7);
        updates[`${salaId}/estado/historial/${historialKey}`] = `🎉 ¡El equipo ${color.toUpperCase()} formó una SEQUENCE!`;
      }
    });

    if (huboCambios) {
      updates[`${salaId}/estado/secuencias`] = secuenciasTemp;
      updates[`${salaId}/estado/fichasProtegidas`] = protegidasTemp;
      updates[`${salaId}/estado/combosYaMarcados`] = combosTemp;
      
      // Obtener el número de equipos para saber cuántas secuencias se necesitan para ganar
      const equiposTotales = estadoJuego?.equiposTotales || 2;
      const secuenciasParaGanar = equiposTotales === 3 ? 1 : 2;

      // Verificar victoria
      for (const color in secuenciasTemp) {
        if (secuenciasTemp[color] >= secuenciasParaGanar) {
          updates[`${salaId}/estado/victoria`] = color;
        }
      }
        
      update(ref(db), updates);
    }
  }, [tablero, secuencias, fichasProtegidas, combosYaMarcados, salaId, jugadorId, ordenTurnos]);

  /**
   * Efecto que detecta cuando es el turno de un bot.
   * Al igual que con las secuencias, solo el "Host" se encarga de llamar a la API del bot
   * para evitar que múltiples clientes hagan la misma petición simultáneamente.
   */
  useEffect(() => {
    if (!salaId || !turnoActual || !ordenTurnos || ordenTurnos.length === 0) return;

    // Pausa de gracia para permitir que el cálculo de secuencias declare victoria
    const botTimer = setTimeout(() => {
      get(ref(db, `${salaId}/estado`)).then((estadoSnap) => {
        const estado = estadoSnap.val();
        if (estado && (estado.victoria || estado.empate || estado.abandonado)) {
          return; // El juego ya terminó, abortar turno del bot
        }

        const jugadoresRef = ref(db, `${salaId}/jugadores`);
        get(jugadoresRef).then((snapshot) => {
          if (snapshot.exists()) {
            const jugadoresData = snapshot.val();
            const jugadores = Object.keys(jugadoresData).map(key => ({
              id: key,
              ...jugadoresData[key]
            }));
            
            const jugadorEnTurno = jugadores.find(j => j.id === turnoActual);
            
            if (jugadorEnTurno && jugadorEnTurno.esBot && ordenTurnos[0] === jugadorId) {
              llamarApiBot(jugadorEnTurno.id);
            }
          }
        });
      });
    }, 800); // 800ms de seguridad

    return () => clearTimeout(botTimer);
  }, [turnoActual, ordenTurnos, salaId, jugadorId]);

  /**
   * Función que realiza la petición HTTP a la API externa que controla la lógica del bot.
   * Marca en Firebase que el bot está "pensando" para mostrar un indicador visual a los jugadores.
   * Si la API falla, automáticamente pasa el turno del bot para que el juego no se quede trabado.
   */
  const llamarApiBot = async (botId) => {
    if (window.botLlamado === botId) return;
    
    try {
      const botPensandoRef = ref(db, `${salaId}/estado/botPensando`);
      const snapshot = await get(botPensandoRef);
      
      if (snapshot.val()) return;
      
      window.botLlamado = botId;
      
      await update(ref(db, `${salaId}/estado`), { botPensando: true });
      
      setTimeout(async () => {
        try {
          const apiUrl = `https://juegos-bots-api.vercel.app/api/bot?sala=${salaId}&botId=${botId}`;
          
          const response = await fetch(apiUrl);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          
          const data = await response.json();
          console.log("Respuesta del bot:", data);
          window.botLlamado = null;
        } catch (error) {
          console.error("Error al llamar al bot:", error);
          window.botLlamado = null;
          
          const ordenTurnosRef = ref(db, `${salaId}/estado/ordenTurnos`);
          const ordenSnapshot = await get(ordenTurnosRef);
          const ordenTurnos = ordenSnapshot.val() || [];
          
          const indiceActual = ordenTurnos.indexOf(botId);
          const siguienteIndice = (indiceActual + 1) % ordenTurnos.length;
          
          await update(ref(db, `${salaId}/estado`), {
            turnoActual: ordenTurnos[siguienteIndice],
            botPensando: null
          });
        }
      }, 1500);
    } catch (error) {
      console.error("Error en la lógica del bot:", error);
      window.botLlamado = null;
    }
  };

  /**
   * Selecciona o deselecciona una carta de la mano del jugador.
   */
  const seleccionarCarta = (index) => {
    setCartaSeleccionadaIdx(prev => prev === index ? null : index);
  };

  /**
   * Permite al jugador pasar su turno (generalmente usado cuando no tiene cartas válidas para jugar).
   * Incrementa un contador de "turnos pasados". Si todos los jugadores pasan su turno consecutivamente
   * y ya no hay cartas en el mazo, el juego termina y se calcula el ganador basado en quién tiene más secuencias.
   */
  const pasarTurno = async () => {
    if (!salaId || !miTurno) return;

    const indiceActual = ordenTurnos.indexOf(jugadorId);
    const siguienteIndice = (indiceActual + 1) % ordenTurnos.length;
    const siguienteTurno = ordenTurnos[siguienteIndice];

    const nombreColor = colorearNombre(jugadorLocal.nombre, jugadorLocal.color);

    const turnosPasadosRef = ref(db, `${salaId}/estado/turnosPasados`);
    let pases = 0;
    try {
      const result = await runTransaction(turnosPasadosRef, (actual) => {
        return (actual || 0) + 1;
      });
      pases = result.snapshot.val();
    } catch (error) {
      console.error("Error en transacción de turnos pasados:", error);
      return;
    }

    const updates = {};
    updates[`${salaId}/estado/turnoActual`] = siguienteTurno;
    
    const historialKey = Date.now().toString();
    updates[`${salaId}/estado/historial/${historialKey}`] = `⏭️ ${nombreColor} tuvo que pasar su turno.`;

    const totalJugadores = ordenTurnos.length;
    if (pases >= totalJugadores && mazoCount === 0) {
      let maxSecuencias = -1;
      let posiblesGanadores = [];

      for (const [color, cantidad] of Object.entries(secuencias)) {
        if (cantidad > maxSecuencias) {
          maxSecuencias = cantidad;
          posiblesGanadores = [color];
        } else if (cantidad === maxSecuencias) {
          posiblesGanadores.push(color);
        }
      }

      if (posiblesGanadores.length === 1) {
        updates[`${salaId}/estado/victoria`] = posiblesGanadores[0];
        updates[`${salaId}/estado/historial/${Date.now().toString() + '_fin'}`] = `🏆 ¡El juego ha terminado por falta de cartas! Ganador: ${posiblesGanadores[0]}`;
      } else {
        updates[`${salaId}/estado/empate`] = true;
        updates[`${salaId}/estado/historial/${Date.now().toString() + '_fin'}`] = `🤝 ¡El juego ha terminado en empate por falta de cartas!`;
      }
    }

    await update(ref(db), updates);
  };

  /**
   * Método principal para realizar una jugada en el tablero.
   * Recibe el índice de la casilla en el tablero, el tipo de acción ('add' para colocar ficha, 'remove' para quitarla con Jack de 1 ojo)
   * y opcionalmente el código de la carta si se usó un Jack.
   * 1. Quita la carta jugada de la mano localmente.
   * 2. Roba una nueva carta del mazo usando una transacción para evitar que dos jugadores roben la misma carta.
   * 3. Prepara todas las actualizaciones para Firebase: actualizar tablero, cambiar turno, registrar en historial,
   *    y configurar los estados de animación (última ficha colocada, último Jack usado, etc.).
   */
  const jugarCarta = async (indiceTablero, tipoAccion, jackCarta = null) => {
    if (!salaId || !jugadorId || !miTurno || cartaSeleccionadaIdx === null) return;

    const cartaJugada = mano[cartaSeleccionadaIdx];
    
    // 1. Quitar carta de la mano localmente para UI rápida
    const nuevaMano = [...mano];
    nuevaMano.splice(cartaSeleccionadaIdx, 1);
    setCartaSeleccionadaIdx(null);
    setMano(nuevaMano);

    // 2. Robar del mazo (Transacción)
    let cartaRobada = null;
    const mazoRef = ref(db, `${salaId}/mazo`);
    
    try {
      await runTransaction(mazoRef, (mazoActual) => {
        if (mazoActual === null) return null;
        const mazoNuevo = [...mazoActual];
        if (mazoNuevo.length > 0) {
          cartaRobada = mazoNuevo.pop();
        }
        return mazoNuevo;
      });
    } catch (error) {
      console.error("Error en transacción del mazo:", error);
      return;
    }

    if (cartaRobada) {
      nuevaMano.push(cartaRobada);
    }

    // 3. Preparar actualizaciones
    const indiceActual = ordenTurnos.indexOf(jugadorId);
    const siguienteIndice = (indiceActual + 1) % ordenTurnos.length;
    const siguienteTurno = ordenTurnos[siguienteIndice];
    const historialKey = Date.now().toString();

    const updates = {};
    
    if (tipoAccion === 'add') {
      updates[`${salaId}/tablero/${indiceTablero}`] = jugadorLocal.color;
      
      if (jackCarta) {
        updates[`${salaId}/estado/ultimoJack`] = {
          tipo: 'add',
          codigoCarta: jackCarta,
          jugadorId: jugadorId,
          ts: Date.now()
        };
      }
      
      // Siempre actualizar la última ficha colocada, incluso si fue con Jack
      updates[`${salaId}/estado/ultimaFichaColocada`] = {
        indice: indiceTablero,
        jugadorId: jugadorId,
        ts: Date.now()
      };
      
      // Limpiar la última casilla removida para que no se empalmen animaciones
      updates[`${salaId}/estado/ultimaCasillaRemovida`] = null;
    } else if (tipoAccion === 'remove') {
      updates[`${salaId}/tablero/${indiceTablero}`] = null;
      updates[`${salaId}/estado/ultimoJack`] = {
        tipo: 'remove',
        codigoCarta: jackCarta,
        jugadorId: jugadorId,
        ts: Date.now()
      };
      updates[`${salaId}/estado/ultimaCasillaRemovida`] = {
        indice: indiceTablero,
        jugadorId: jugadorId,
        ts: Date.now()
      };
      
      // Limpiar la última ficha colocada para que no se empalmen animaciones
      updates[`${salaId}/estado/ultimaFichaColocada`] = null;
    }

    updates[`${salaId}/jugadores/${jugadorId}/mano`] = nuevaMano;
    updates[`${salaId}/estado/turnoActual`] = siguienteTurno;
    updates[`${salaId}/estado/turnosPasados`] = 0;
    
    const nombreColor = colorearNombre(jugadorLocal.nombre, jugadorLocal.color);
    const cartaTraducida = MAPA_CARTAS[indiceTablero] ? traducirCartaAIcono(MAPA_CARTAS[indiceTablero]) : "";

    let msj = '';
    if (tipoAccion === 'remove') {
      reproducirSonido('jack');
      msj = `❌ ${nombreColor} quitó una ficha con su Jack de 1 Ojo.`;
    } else if (jackCarta) {
      reproducirSonido('jack');
      msj = `🃏 ${nombreColor} usó un Comodín (2 Ojos) en ${cartaTraducida}.`;
    } else {
      reproducirSonido('ficha');
      msj = `🃏 ${nombreColor} colocó ficha en ${cartaTraducida}.`;
    }
    updates[`${salaId}/estado/historial/${historialKey}`] = msj;

    await update(ref(db), updates);
  };

  /**
   * Permite al jugador descartar una "carta muerta" (una carta cuyas dos posiciones en el tablero ya están ocupadas).
   * Primero valida que la carta seleccionada realmente sea una carta muerta.
   * Si es válida, la quita de la mano, roba una nueva del mazo y registra la acción en el historial.
   * A diferencia de jugar una carta normal, descartar una carta muerta NO pasa el turno al siguiente jugador.
   */
  /**
   * Limpia el estado local del juego.
   * Se llama cuando el jugador abandona la sala para evitar el "estado zombi".
   */
  const limpiarEstadoLocal = () => {
    setMano([]);
    setCartaSeleccionadaIdx(null);
    setTurnoActual(null);
    setTablero({});
    setHistorial([]);
    setMazoCount(0);
    setOrdenTurnos([]);
    setUltimoJack(null);
    setBotPensando(false);
    setSecuencias({ rojo: 0, azul: 0, verde: 0 });
    setFichasProtegidas([]);
    setCombosYaMarcados([]);
    setUltimaFichaColocada(null);
    setUltimaCasillaRemovida(null);
  };

  const descartarCartaMuerta = async () => {
    if (!salaId || !jugadorId || !miTurno || cartaSeleccionadaIdx === null) {
      return;
    }

    const cartaDescartada = mano[cartaSeleccionadaIdx];
    
    if (cartaDescartada.startsWith("J")) {
      mostrarToast("Los Jacks son comodines, nunca pueden ser cartas muertas.", "info");
      return;
    }

    let totalPosiciones = 0;
    let posicionesOcupadas = 0;

    MAPA_CARTAS.forEach((carta, idx) => {
      if (carta === cartaDescartada) {
        totalPosiciones++;
        if (tablero[idx]) posicionesOcupadas++;
      }
    });

    if (totalPosiciones === 0 || posicionesOcupadas < totalPosiciones) {
      mostrarToast("Esta carta NO es una carta muerta. Aún hay espacios libres en el tablero para ella.", "error");
      return;
    }

    mostrarToast("¡Efectivamente! Es una carta muerta.", "success");
    
    const nuevaMano = [...mano];
    nuevaMano.splice(cartaSeleccionadaIdx, 1);
    setCartaSeleccionadaIdx(null);
    setMano(nuevaMano);

    let cartaRobada = null;
    const mazoRef = ref(db, `${salaId}/mazo`);
    
    try {
      await runTransaction(mazoRef, (mazoActual) => {
        if (mazoActual === null) return null;
        const mazoNuevo = [...mazoActual];
        if (mazoNuevo.length > 0) {
          cartaRobada = mazoNuevo.pop();
        }
        return mazoNuevo;
      });
    } catch (error) {
      console.error("Error en transacción de descarte:", error);
      return;
    }

    if (cartaRobada) {
      nuevaMano.push(cartaRobada);
    }

    const nombreColor = colorearNombre(jugadorLocal.nombre, jugadorLocal.color);
    const cartaTraducida = traducirCartaAIcono(cartaDescartada);

    const historialKey = Date.now().toString();
    const updates = {};
    updates[`${salaId}/jugadores/${jugadorId}/mano`] = nuevaMano;
    updates[`${salaId}/estado/historial/${historialKey}`] = `🗑️ ${nombreColor} descartó un ${cartaTraducida} muerto.`;

    await update(ref(db), updates);
  };

  const reiniciarJuego = async () => {
    if (!salaId || !jugadorId) return;
    
    // Solo el host puede reiniciar
    if (ordenTurnos[0] !== jugadorId) return;

    const jugadoresRef = ref(db, `${salaId}/jugadores`);
    const snapshot = await get(jugadoresRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      const listaJugadores = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      const totalJugadores = listaJugadores.length;

      // Generar nuevo mazo
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
      
      // Repartir nuevas cartas
      listaJugadores.forEach(jugador => {
        const mano = mazoCompleto.splice(-cartasPorJugador);
        updates[`${salaId}/jugadores/${jugador.id}/mano`] = mano;
      });

      // Rotar el orden de turnos para que empiece el siguiente jugador
      const nuevoOrdenTurnos = [...ordenTurnos];
      const primerJugador = nuevoOrdenTurnos.shift();
      nuevoOrdenTurnos.push(primerJugador);

      // Limpiar tablero y estados
      updates[`${salaId}/tablero`] = null;
      updates[`${salaId}/mazo`] = mazoCompleto;
      updates[`${salaId}/estado/ordenTurnos`] = nuevoOrdenTurnos;
      updates[`${salaId}/estado/turnoActual`] = nuevoOrdenTurnos[0];
      updates[`${salaId}/estado/secuencias`] = null;
      updates[`${salaId}/estado/fichasProtegidas`] = null;
      updates[`${salaId}/estado/combosYaMarcados`] = null;
      updates[`${salaId}/estado/victoria`] = null;
      updates[`${salaId}/estado/empate`] = null;
      updates[`${salaId}/estado/turnosPasados`] = 0;
      updates[`${salaId}/estado/historial`] = {
        [Date.now()]: "🔄 ¡El anfitrión ha reiniciado la partida!"
      };

      await update(ref(db), updates);
    }
  };

  const value = {
    mano,
    cartaSeleccionadaIdx,
    seleccionarCarta,
    turnoActual,
    miTurno,
    tablero,
    historial,
    mazoCount,
    ultimoJack,
    botPensando,
    secuencias,
    fichasProtegidas,
    jugarCarta,
    pasarTurno,
    descartarCartaMuerta,
    ultimaFichaColocada,
    setUltimaFichaColocada,
    ultimaCasillaRemovida,
    setUltimaCasillaRemovida,
    limpiarEstadoLocal,
    reiniciarJuego
  };

  return (
    <JuegoContext.Provider value={value}>
      {children}
    </JuegoContext.Provider>
  );
}
