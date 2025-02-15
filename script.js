/**
 * Configuración y variables globales
 */
const formatoUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
let contadorDatos = 0;
let contadorDatos2 = 0;

// Modelo de datos para ambas fuentes
const crearModeloMonedas = () => ([
  { nombre: 'bitcoin', precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: [] },
  { nombre: 'ethereum', precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: [] },
  { nombre: 'monero', precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: [] },
  { nombre: 'litecoin', precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: [] },
]);

const monedasCoinCap = crearModeloMonedas();
const monedasBinance = crearModeloMonedas();

// Configuración de la gráfica
const configuracionGrafica = {
  margen: { top: 10, right: 30, bottom: 30, left: 100 },
  ancho: 800,
  alto: 400
};

/**
 * Inicialización de las gráficas
 */
function crearGrafica(containerId) {
  const { margen, ancho, alto } = configuracionGrafica;
  const anchoReal = ancho - margen.left - margen.right;
  const altoReal = alto - margen.top - margen.bottom;

  const svg = d3
    .select(containerId)
    .append('svg')
    .attr('width', ancho)
    .attr('height', alto)
    .append('g')
    .attr('transform', `translate(${margen.left},${margen.top})`);

  // Ejes
  const x = d3.scaleTime().range([0, anchoReal]);
  const y = d3.scaleLinear().range([altoReal, 0]);

  svg.append('g')
    .attr('transform', `translate(0,${altoReal})`)
    .attr('class', 'ejeX');

  svg.append('g')
    .attr('class', 'ejeY');

  return { svg, x, y, anchoReal, altoReal };
}

const grafica1 = crearGrafica('#modulo2');
const grafica2 = crearGrafica('#modulo4');

/**
 * Conexión WebSocket y procesamiento de datos
 */
const coincapWS = new WebSocket('wss://ws.coincap.io/prices?assets=bitcoin,ethereum,monero,litecoin');
const binanceWS = new WebSocket('wss://stream.binance.com:9443/ws');

// Al abrir la conexión con Binance, enviamos el mensaje de suscripción
binanceWS.onopen = function() {
  const subscriptionMessage = {
    method: "SUBSCRIBE",
    params: [
      "btcusdt@trade",
      "ethusdt@trade",
      "xmrusdt@trade",
      "ltcusdt@trade"
    ],
    id: 1
  };
  binanceWS.send(JSON.stringify(subscriptionMessage));
};

function procesarMensajeCoinCap(mensaje) {
  const mensajeJson = JSON.parse(mensaje.data);
  contadorDatos++;
  document.getElementById('contador-datos').innerText = `Datos recibidos: ${contadorDatos}`;

  actualizarModelo(mensajeJson, monedasCoinCap, grafica1, 'contexto1', 'contexto2');
}

function procesarMensajeBinance(mensaje) {
  const data = JSON.parse(mensaje.data);

  // Verificar si es un mensaje de trade
  if (!data.e || data.e !== 'trade') {
    return;
  }

  contadorDatos2++;
  document.getElementById('contador-datos-2').innerText = `Datos recibidos: ${contadorDatos2}`;

  // Crear el objeto formateado para un solo par
  const mensajeFormateado = {};

  // Mapear el símbolo al nombre de la moneda
  const simbolo = data.s.toLowerCase();
  let nombreMoneda;

  switch(simbolo) {
    case 'btcusdt':
      nombreMoneda = 'bitcoin';
      break;
    case 'ethusdt':
      nombreMoneda = 'ethereum';
      break;
    case 'xmrusdt':
      nombreMoneda = 'monero';
      break;
    case 'ltcusdt':
      nombreMoneda = 'litecoin';
      break;
    default:
      return;
  }

  mensajeFormateado[nombreMoneda] = parseFloat(data.p);

  if (!isNaN(mensajeFormateado[nombreMoneda])) {
    actualizarModelo(mensajeFormateado, monedasBinance, grafica2, 'contexto3', 'contexto4');
  }
}

function actualizarModelo(mensajeJson, modeloMonedas, grafica, contextoId1, contextoId2) {
  for (const nombreMoneda in mensajeJson) {
    const moneda = modeloMonedas.find(m => m.nombre === nombreMoneda);
    if (moneda) {
      const nuevoPrecio = parseFloat(mensajeJson[nombreMoneda]);

      if (isNaN(nuevoPrecio)) {
        console.error('Precio inválido para', nombreMoneda, mensajeJson[nombreMoneda]);
        continue;
      }

      moneda.datos.push({
        fecha: Date.now(),
        precio: nuevoPrecio
      });

      // Limitar el número de puntos de datos
      if (moneda.datos.length > 100) {
        moneda.datos = moneda.datos.slice(-100);
      }

      moneda.precioActual = nuevoPrecio;

      if (!moneda.precioMasAlto || moneda.precioMasAlto < nuevoPrecio) {
        moneda.precioMasAlto = nuevoPrecio;
      }
      if (!moneda.precioMasBajo || moneda.precioMasBajo > nuevoPrecio) {
        moneda.precioMasBajo = nuevoPrecio;
      }

      if (nombreMoneda === menu.value) {
        actualizarVisualizacion(moneda, grafica, contextoId1, contextoId2);
      }
    }
  }
}

function actualizarVisualizacion(moneda, grafica, contextoId1, contextoId2) {
  const { svg, x, y, anchoReal, altoReal } = grafica;

  // Actualizar textos
  document.getElementById(contextoId1).innerText = 
    `${moneda.nombre}: ${formatoUSD.format(moneda.precioActual)} USD`;

  const precioInicial = moneda.datos[0].precio;
  const diferencia = Math.abs(moneda.precioActual - precioInicial);
  document.getElementById(contextoId2).innerText = 
    precioInicial < moneda.precioActual 
      ? `subió +${formatoUSD.format(diferencia)}`
      : `bajó -${formatoUSD.format(diferencia)}`;

  // Actualizar gráfica
  x.domain(d3.extent(moneda.datos, d => d.fecha));
  y.domain([
    d3.min(moneda.datos, d => d.precio),
    d3.max(moneda.datos, d => d.precio)
  ]);

  svg.select('.ejeX')
    .transition()
    .duration(300)
    .call(d3.axisBottom(x));

  svg.select('.ejeY')
    .transition()
    .duration(300)
    .call(d3.axisLeft(y));

  const linea = svg.selectAll('.linea').data([moneda.datos]);

  linea
    .join('path')
    .attr('class', 'linea')
    .transition()
    .duration(300)
    .attr('d', d3.line()
      .x(d => x(d.fecha))
      .y(d => y(d.precio))
    )
    .attr('fill', 'none')
    .attr('stroke', '#42b3f5')
    .attr('stroke-width', 2.5);
}

/**
 * Actualización de fecha y hora
 */
function actualizarFechaHora() {
  const ahora = new Date();
  const opciones = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit'
  };
  const fechaFormateada = ahora.toLocaleDateString('es-ES', opciones);
  document.getElementById('fecha-actual').innerText = fechaFormateada;
  document.getElementById('fecha-actual-2').innerText = fechaFormateada;
}

// Configurar los WebSockets
coincapWS.onmessage = procesarMensajeCoinCap;
binanceWS.onmessage = procesarMensajeBinance;

coincapWS.onerror = (error) => {
  console.error('Error en CoinCap WebSocket:', error);
};

binanceWS.onerror = (error) => {
  console.error('Error en Binance WebSocket:', error);
};

coincapWS.onclose = () => {
  console.log('CoinCap WebSocket cerrado. Intentando reconectar...');
  setTimeout(() => {
    window.location.reload();
  }, 5000);
};

binanceWS.onclose = () => {
  console.log('Binance WebSocket cerrado. Intentando reconectar...');
  setTimeout(() => {
    window.location.reload();
  }, 5000);
};

// Iniciar actualización de fecha y hora
setInterval(actualizarFechaHora, 1000);
actualizarFechaHora();

/**
 * Manejo del menú
 */
const menu = document.getElementById('menuMonedas');
menu.onchange = function() {
  const monedaCoinCap = monedasCoinCap.find(m => m.nombre === menu.value);
  const monedaBinance = monedasBinance.find(m => m.nombre === menu.value);

  if (monedaCoinCap) {
    actualizarVisualizacion(monedaCoinCap, grafica1, 'contexto1', 'contexto2');
  }
  if (monedaBinance) {
    actualizarVisualizacion(monedaBinance, grafica2, 'contexto3', 'contexto4');
  }
};