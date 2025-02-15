/**
 * Fuente de datos y modelado
 */

// Conectammos nuestra aplicación al API de coincap.
// Vamos a solicitar actualizaciones de precios para: bitcoin, ethereum, monero y litecoin.
var preciosEndPoint = new WebSocket("wss://ws.coincap.io/prices?assets=bitcoin,ethereum,monero,litecoin");

// Cuando una de las criptomonedas cambia de precio, ejecutamos la función procesarNuevoMensaje.
preciosEndPoint.onmessage = procesarNuevoMensaje;

/**
 * Preprocesamiento y Modelado:
 * El API nos envía sólo 1 tipo de dato que es el precio actual de las criptomonedas.
 * A pesar de esto, podemos hacer cálculos matemáticos para producir una estructura de datos que nos permita darle sentido al cambio de precios que vamos a mostrar en la visualización.
 */
const monedas = [
  {nombre: "bitcoin", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: []}, 
  {nombre: "ethereum", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: []},
  {nombre: "monero", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: []},
  {nombre: "litecoin", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: []}
];

// Función que recibe los mensajes del Socket
function procesarNuevoMensaje(mensaje) {
  // Convertimos los datos de texto a formato JSON
  var mensajeJson = JSON.parse(mensaje.data);

  // Iteramos sobre los valores del mensaje que vienen en parejas de "nombre": "precio"
  for (var nombreMoneda in mensajeJson) {
    // En el siguiente loop, pasamos por cada objeto que definimos en la variable "monedas" que contiene la nueva estructura de datos que queremos llenar.
    for (var i = 0; i < monedas.length; i++) {
      // objetoMoneda va a ser cada uno de los objetos del modelado, por ejemplo:
      // cuando i = 0, objetoMoneda es: {nombre: "bitcoin", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: []}
      var objetoMoneda = monedas[i];

      // Comparamos el nombre de la moneda en nuestro modelo con el nombre de la moneda que cambió de valor y fue enviado por la API en el mensaje actual.
      // Si coinciden, significa que podemos actualizar los datos de nuestro modelo para esa moneda
      if (objetoMoneda.nombre === nombreMoneda) {
        // Extraemos el precio actual que llegó en el mensaje y lo guardamos en una variable para usarla varias veces de ahora en adelante.
        var nuevoPrecio = mensajeJson[nombreMoneda];

        // En JavaScript, podemos insertar un nuevo elemento a un array usando push()
        // Aquí estamos sumando una nueva entrada a los datos de la moneda que acaba de cambiar el precio.
        // En nuestra estructura de modelado: {nombre: "bitcoin", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: []}
        // va a quedar guardada en el array "datos"
        objetoMoneda.datos.push({
          fecha: Date.now(), // Este va a ser nuestro eje X, usamos la fecha del presente ya que la aplicación funciona en tiempo real.
          precio: nuevoPrecio, // El eje Y en la visualización va a ser el precio.
        });

        // Volviendo a la estructura: {nombre: "bitcoin", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: []}
        // podemos cambiar directamente el precioActual de la moneda con el precio que acaba de llegar de la API.
        objetoMoneda.precioActual = nuevoPrecio;

        // Ahora hagamos algo más interesante, vamos a guardar el precio más alto al que ha llegado la moneda.
        // La siguiente comparación revisa si el valor NO es "null" con: !objetoMoneda.precioMasAlto,
        // O si el precio que acaba de llegar es mayor al precioMasAlto guardado en nuestro modelo.
        if (!objetoMoneda.precioMasAlto || objetoMoneda.precioMasAlto < nuevoPrecio) {
          // Si alguna de estas dos pruebas es verdadera, cambiamos el precioMasAlto en el modelo.
          objetoMoneda.precioMasAlto = nuevoPrecio;
        }
        // Hacemos lo mismo para el precioMasBajo haciendo la comparación invertida.
        if (!objetoMoneda.precioMasBajo || objetoMoneda.precioMasBajo > nuevoPrecio) {
          objetoMoneda.precioMasBajo = nuevoPrecio;
        }

        // Para terminar, actualizamos la gráfica que tengamos seleccionada en el menú
        if (nombreMoneda === menu.value) {
          actualizar(monedas[i]);
        }
      }
    }
  }
}
/** FIN de Preprocesamiento y modelado. */

/**
 * Visualización y textos dinámicos
 */

var contexto1 = document.getElementById('contexto1');
var contexto2 = document.getElementById('contexto2');

var formatoUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });


function actualizar(objetoMoneda) {
  contexto1.innerText = "- " + menu.value + ": " + formatoUSD.format(objetoMoneda.precioActual) + " USD.";

  var precioInicial = objetoMoneda.datos[0].precio;

  if (precioInicial < objetoMoneda.precioActual) {
    var diferencia = objetoMoneda.precioActual - precioInicial;
    contexto2.innerText = "subió + " + formatoUSD.format(diferencia);
  } else if (precioInicial > objetoMoneda.precioActual) {
    var diferencia = precioInicial - objetoMoneda.precioActual;
    contexto2.innerText = "bajó - " + formatoUSD.format(diferencia);
  } else {
    contexto2.innerText = "igual = 0";
  }
}

// FIN de Visualización y textos dinámicos

/**
 * MENÚ
 */
var menu = document.getElementById("menuMonedas");

menu.onchange = function() {
  var objetoMoneda = monedas.find(function(obj) { return obj.nombre === menu.value });
  actualizar(objetoMoneda);
}
// ----- FIN MENÚ ----