// src/servicios/botService.js
import { ref, set, remove, get } from 'firebase/database';
import { baseDatos } from '../config/firebase';

export const botService = {
  ejecutarTurnoBot: async (idSala, bot, estadoPartida, tablero) => {
    // Evitar llamadas múltiples si ya se está procesando
    if (window.botLlamado === bot.id) return;

    const botPensandoRef = ref(baseDatos, `${idSala}/estado/botPensando`);
    
    try {
      // Verificar si otro cliente ya está procesando el bot
      const snapshot = await get(botPensandoRef);
      if (snapshot.val()) return; // Alguien más ya lo está procesando

      window.botLlamado = bot.id;
      
      // Marcar en Firebase que el bot está pensando
      await set(botPensandoRef, true);

      // Llamar a la API externa del bot
      const apiUrl = `https://juegos-bots-api.vercel.app/api/bot?sala=${idSala}&botId=${bot.id}`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.error) {
        console.error("Error del bot:", data.error);
      }
    } catch (error) {
      console.error("Error llamando al bot:", error);
    } finally {
      window.botLlamado = null;
      await remove(botPensandoRef);
    }
  }
};
