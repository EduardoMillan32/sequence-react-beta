// src/config/reglas.js

export const calcularReglas = (jugadoresTotales, equiposTotales) => {
  let cartasPorJugador = 0;
  if (jugadoresTotales === 2) cartasPorJugador = 7;
  else if (jugadoresTotales >= 3 && jugadoresTotales <= 4) cartasPorJugador = 6;
  else if (jugadoresTotales === 6) cartasPorJugador = 5;
  else if (jugadoresTotales >= 8 && jugadoresTotales <= 9) cartasPorJugador = 4;
  else if (jugadoresTotales >= 10 && jugadoresTotales <= 12) cartasPorJugador = 3;

  return {
    sequencesParaGanar: equiposTotales === 3 ? 1 : 2,
    cartasPorJugador
  };
};

export const obtenerMazoBarajado = () => {
  const palos = ['S', 'H', 'D', 'C'];
  const valores = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Q', 'K'];
  let mazoBase = [];
  
  palos.forEach(palo => {
    valores.forEach(valor => mazoBase.push(valor + palo));
  });
  
  const jacksEspeciales = ['J1D', 'J1D', 'J1C', 'J1C', 'J2H', 'J2H', 'J2S', 'J2S'];
  let mazoCompleto = [...mazoBase, ...mazoBase, ...jacksEspeciales];

  // Algoritmo de Fisher-Yates para barajar
  for (let i = mazoCompleto.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mazoCompleto[i], mazoCompleto[j]] = [mazoCompleto[j], mazoCompleto[i]];
  }
  
  return mazoCompleto;
};