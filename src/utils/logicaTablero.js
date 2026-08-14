/**
 * Calcula las secuencias (líneas de 5 fichas) formadas por un jugador en el tablero.
 * 
 * @param {Array} tablero - Estado actual del tablero (array de 100 elementos).
 * @param {string} color - Color del jugador a evaluar.
 * @param {Array} fichasProtegidasActuales - Índices de las fichas que ya forman parte de una secuencia.
 * @param {Array} combosYaMarcados - Cadenas que representan las secuencias ya encontradas.
 * @returns {Object} Objeto con el número de nuevas secuencias, nuevas fichas protegidas y nuevos combos.
 */
export const calcularSecuencias = (tablero, color, fichasProtegidasActuales = [], combosYaMarcados = []) => {
  const nuevasProtegidas = [];
  let secuenciasEncontradas = 0;
  const nuevosCombos = [...combosYaMarcados];

  let arrayProtegidas = [];
  if (Array.isArray(fichasProtegidasActuales)) {
    arrayProtegidas = fichasProtegidasActuales;
  } else if (fichasProtegidasActuales && typeof fichasProtegidasActuales === 'object') {
    arrayProtegidas = Object.keys(fichasProtegidasActuales).map(Number);
  }

  // Llevamos un registro en vivo de lo que se va protegiendo en este mismo turno
  const todasProtegidas = [...arrayProtegidas];

  const direcciones = [
    [0, 1],  // Horizontal
    [1, 0],  // Vertical
    [1, 1],  // Diagonal \
    [1, -1]  // Diagonal /
  ];

  const esFichaValida = (fila, col) => {
    if (fila < 0 || fila >= 10 || col < 0 || col >= 10) return false;
    const idx = fila * 10 + col;
    // Las esquinas (0, 9, 90, 99) son comodines para todos
    if (idx === 0 || idx === 9 || idx === 90 || idx === 99) return true;
    return tablero[idx] === color;
  };

  for (let fila = 0; fila < 10; fila++) {
    for (let col = 0; col < 10; col++) {
      if (!esFichaValida(fila, col)) continue;

      for (const [df, dc] of direcciones) {
        let longitud = 1;
        const fichasLinea = [fila * 10 + col];

        for (let i = 1; i < 5; i++) {
          const nf = fila + df * i;
          const nc = col + dc * i;
          
          if (esFichaValida(nf, nc)) {
            longitud++;
            fichasLinea.push(nf * 10 + nc);
          } else {
            break;
          }
        }

        if (longitud === 5) {
          fichasLinea.sort((a, b) => a - b);
          const comboKey = fichasLinea.join(',');

          if (!nuevosCombos.includes(comboKey)) {
            // Verificar que al menos 4 fichas sean nuevas (no protegidas previamente)
            const fichasNuevas = fichasLinea.filter(idx => !todasProtegidas.includes(idx));
            
            if (fichasNuevas.length >= 4) {
              nuevosCombos.push(comboKey);
              secuenciasEncontradas++;
              nuevasProtegidas.push(...fichasLinea);
              todasProtegidas.push(...fichasLinea);
            }
          }
        }
      }
    }
  }

  return {
    nuevasSecuencias: secuenciasEncontradas,
    nuevasProtegidas: [...new Set(nuevasProtegidas)],
    nuevosCombos
  };
};
