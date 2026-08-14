// src/servicios/sesionService.js
import { ref, onDisconnect, set, remove } from 'firebase/database';
import { baseDatos } from '../config/firebase';

export const sesionService = {
  // Registra al usuario como "conectado" y prepara su testamento
  registrarPresencia: (idSala, idJugador) => {
    if (!idSala || !idJugador) return;

    const presenciaRef = ref(baseDatos, `${idSala}/presencia/${idJugador}`);
    const jugadorRef = ref(baseDatos, `${idSala}/jugadores/${idJugador}`);

    // Decimos que estamos online
    set(presenciaRef, true);

    // Si Firebase detecta que perdemos el internet o cerramos la app,
    // borrará automáticamente nuestra presencia.
    onDisconnect(presenciaRef).remove();
    
    // Cancelamos el borrado automático del jugador para dar tiempo de reconexión
    onDisconnect(jugadorRef).cancel(); 
  },

  // Limpieza manual y forzada (cuando el usuario le da explícitamente a "Salir")
  limpiarSesionCompleta: async (idSala, idJugador) => {
    if (!idSala || !idJugador) return;
    try {
      await remove(ref(baseDatos, `${idSala}/jugadores/${idJugador}`));
      await remove(ref(baseDatos, `${idSala}/presencia/${idJugador}`));
    } catch (error) {
      console.error("Error limpiando sesión:", error);
    }
  }
};