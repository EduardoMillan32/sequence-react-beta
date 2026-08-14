// src/servicios/lobbyService.js
import { ref, onValue, set, update, remove, push, off } from 'firebase/database';
import { baseDatos } from '../config/firebase';

export const lobbyService = {
  // Une al jugador por primera vez y le asigna un ID
  unirJugadorInicial: async (idSala, nombre) => {
    const jugadoresRef = ref(baseDatos, `${idSala}/jugadores`);
    const nuevoJugadorRef = push(jugadoresRef);
    const jugador = { nombre, color: null, listo: false };
    
    await set(nuevoJugadorRef, jugador);
    return { id: nuevoJugadorRef.key, ...jugador };
  },

  // Escucha los cambios en la sala en tiempo real
  escucharJugadores: (idSala, callback) => {
    const salaRef = ref(baseDatos, `${idSala}/jugadores`);
    
    onValue(salaRef, (snapshot) => {
      const lista = [];

      snapshot.forEach((childSnap) => {
        lista.push({ ...childSnap.val(), id: childSnap.key });
      });
      callback(lista);
    });

    return () => off(salaRef);
  },

  // Actualiza cualquier dato de un jugador o bot (color, listo, etc.)
  actualizarJugador: (idSala, idJugador, datos) => {
    return update(ref(baseDatos, `${idSala}/jugadores/${idJugador}`), datos);
  },

  // Elimina un jugador o bot de la sala
  eliminarJugador: (idSala, idJugador) => {
    return remove(ref(baseDatos, `${idSala}/jugadores/${idJugador}`));
  },

  // Escucha el estado general del juego (iniciado, empate, victoria, etc.)
  escucharEstado: (idSala, callback) => {
    const salaRef = ref(baseDatos, `${idSala}`);
    onValue(salaRef, (snapshot) => {
      const datos = snapshot.val();
      if (datos && datos.estado) {
        callback({
          ...datos.estado,
          tablero: datos.tablero || {},
          mazoRestante: datos.mazo ? datos.mazo.length : 0
        });
      } else {
        callback(null);
      }
    });
    return () => off(salaRef);
  },

  // Escribe el mazo, reparte cartas y cambia el estado a "iniciado" de un solo golpe
  iniciarPartidaAtomica: (actualizacionesMultiples) => {
    return update(ref(baseDatos), actualizacionesMultiples);
  }
};