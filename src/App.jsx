import React, { useEffect, useState } from 'react';
import { SalaProvider, useSala } from './contextos/SalaContext';
import { JuegoProvider } from './contextos/JuegoContext';
import { ToastProvider } from './contextos/ToastContext';
import Login from './paginas/Login';
import Lobby from './paginas/Lobby';
import Juego from './paginas/Juego';

// Hook para mantener la pantalla encendida
// Hook para mantener la pantalla encendida y manejar la app en segundo plano (PWA)
function usePWA(salaId, jugadorId, juegoIniciado) {
  useEffect(() => {
    let wakeLock = null;
    let timerSegundoPlano = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.log(`${err.name}, ${err.message}`);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App vuelve al primer plano: cancelamos el timer de desconexión
        if (timerSegundoPlano) {
          clearTimeout(timerSegundoPlano);
          timerSegundoPlano = null;
        }
        if (wakeLock !== null) {
          requestWakeLock();
        }
      } else {
        // App pasa a segundo plano: si estamos jugando, iniciamos timer de 60s
        if (juegoIniciado && salaId && jugadorId) {
          timerSegundoPlano = setTimeout(() => {
            console.log('[PWA] App en segundo plano por mucho tiempo. Limpiando sesión.');
            localStorage.removeItem('sequence_sesion_activa');
            
            // Usamos la REST API de Firebase con keepalive para asegurar que se envíe
            const baseUrl = "https://secuence-7d7af-default-rtdb.firebaseio.com";
            fetch(`${baseUrl}/${salaId}/jugadores/${jugadorId}.json`, { 
              method: 'DELETE', 
              keepalive: true 
            }).catch(() => {});
            fetch(`${baseUrl}/${salaId}/presencia/${jugadorId}.json`, { 
              method: 'DELETE', 
              keepalive: true 
            }).catch(() => {});
          }, 60000);
        }
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (wakeLock !== null) {
        wakeLock.release().then(() => {
          wakeLock = null;
        });
      }
      if (timerSegundoPlano) clearTimeout(timerSegundoPlano);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [salaId, jugadorId, juegoIniciado]);
}

/**
 * Componente principal que maneja el enrutamiento de la aplicación
 * basado en el estado de la sala y del juego.
 */
function AppContent() {
  const { salaId, jugadorId, estadoJuego } = useSala();
  const [mostrarJuego, setMostrarJuego] = useState(false);
  usePWA(salaId, jugadorId, estadoJuego?.iniciado);

  // Efecto para manejar el delay al iniciar el juego
  useEffect(() => {
    if (estadoJuego?.iniciado) {
      const timer = setTimeout(() => {
        setMostrarJuego(true);
      }, 1000); // 1 segundo de delay
      return () => clearTimeout(timer);
    } else {
      setMostrarJuego(false);
    }
  }, [estadoJuego?.iniciado]);

  // Lógica de enrutamiento basada en el estado de Firebase
  if (!salaId) {
    return <Login />;
  }

  if (mostrarJuego) {
    // Le agregamos una animación de entrada suave al Tablero
    return (
      <div className="animate-fade-in-down w-full h-full">
        <Juego />
      </div>
    );
  }

  // Si Firebase dice que ya inició, pero mostrarJuego aún es false, estamos en el segundo de "delay".
  const saliendoDelLobby = estadoJuego?.iniciado && !mostrarJuego;

  return (
    // Aplicamos un desvanecimiento suave mientras dura el delay
    <div 
      className={`w-full h-full transition-all duration-1000 ease-in-out ${
        saliendoDelLobby ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <Lobby />
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <SalaProvider>
        <JuegoProvider>
          <div className="min-h-screen bg-[#1a1a1a] text-white font-sans overflow-x-hidden">
            <AppContent />
          </div>
        </JuegoProvider>
      </SalaProvider>
    </ToastProvider>
  );
}

export default App;
