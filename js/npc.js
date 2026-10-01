// Comercio, misiones de asentamientos y notas del yermo.
import { ITEMS, itemName } from './blocks.js';
import { mulberry32 } from './noise.js';

const BEERS = [296, 297, 298, 316, 317, 318, 319];

// Ofertas del comerciante: give = lo que entrega el jugador, get = lo que recibe
export function traderOffers(seed, tavernBonus) {
  const r = mulberry32(seed);
  const bonus = tavernBonus ? 1.5 : 1;
  const buy = [
    { give: [['beer', 1]], get: [258, Math.round(3 * bonus)], note: 'Paga más cuanto mejor sea la cerveza (+1 chatarra por estrella)', beer: true },
    { give: [[327, 4]], get: [258, 2] },
    { give: [[336, 3]], get: [259, 1] },
    { give: [[271, 4]], get: [258, 2] },
    { give: [[261, 1]], get: [259, 2] },
    { give: [[313, 1]], get: [260, 6] },
    { give: [[422, 6]], get: [258, 2] },
    { give: [[439, 2]], get: [258, 2] },
    { give: [[416, 3]], get: [259, 1] },
    { give: [[440, 1]], get: [258, 3] },
  ];
  const sell = [
    { give: [[258, 3]], get: [281, 6] }, { give: [[258, 3]], get: [283, 3] }, { give: [[258, 4]], get: [291, 2] },
    { give: [[258, 10]], get: [442, 1] }, { give: [[258, 8]], get: [1111, 2] }, { give: [[258, 5]], get: [416, 3] }, { give: [[258, 4]], get: [1128, 1] }, { give: [[258, 6]], get: [1121, 1] },
    { give: [[258, 6]], get: [306, 1] }, { give: [[258, 5]], get: [274, 1] }, { give: [[258, 4]], get: [332, 6] },
    { give: [[258, 6]], get: [339, 1] }, { give: [[259, 2]], get: [330, 1] }, { give: [[258, 5]], get: [323, 2] },
    { give: [[259, 3]], get: [[346, 347, 349, 350, 351, 307, 310][Math.floor(r() * 7)], 1] },
    { give: [[260, 4]], get: [[348, 311, 309, 308][Math.floor(r() * 4)], 1] },
    { give: [[258, 2]], get: [285, 4] }, { give: [[258, 8]], get: [328, 1] },
  ];
  const pick = (arr, n) => { const a = [...arr]; const out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(r() * a.length), 1)[0]); return out; };
  return [...pick(buy, 3), ...pick(sell, 5)];
}

// Misiones del líder del asentamiento
const QUESTS = [
  (r) => ({ kind: 'fetch', item: 260, n: 3 + Math.floor(r() * 3), reward: [[274, 2], [332, 8]], text: 'Necesitamos acero para reforzar la muralla.' }),
  (r) => ({ kind: 'fetch', item: 273, n: 3 + Math.floor(r() * 3), reward: [[306, 1], [258, 6]], text: 'La gente pasa hambre: conseguinos latas de comida.' }),
  (r) => ({ kind: 'fetch', item: 259, n: 4 + Math.floor(r() * 3), reward: [[310, 1]], text: 'Queremos luz eléctrica. Traé cobre y te enseño cómo.' }),
  (r) => ({ kind: 'kill', mob: 'ghoul', n: 5 + Math.floor(r() * 4), reward: [[276, 1], [274, 1]], text: 'Los necrófagos rondan de noche. Eliminá algunos.' }),
  (r) => ({ kind: 'kill', mob: 'wolf', n: 4, reward: [[335, 1]], text: 'Una manada de lobos irradiados ataca a los viajeros.' }),
  (r) => ({ kind: 'kill', mob: 'rat', n: 8, reward: [[346, 1]], text: 'Las ratas gigantes se comen las provisiones.' }),
  (r) => ({ kind: 'beer', q: 3, n: 3 + Math.floor(r() * 2), reward: [[260, 4], [350, 1]], text: 'Queremos festejar. Traé cervezas de 3 estrellas o más.' }),
  (r) => ({ kind: 'fetch', item: 285, n: 10, reward: [[281, 8], [283, 4]], text: 'Plantamos papas pero se pudrieron. Traé 10 y te doy semillas.' }),
  (r) => ({ kind: 'kill', mob: 'alpha', n: 1, reward: [[313, 1], [348, 1]], text: 'Hay un laboratorio bajo tierra con algo terrible adentro. Terminalo.' }),
  (r) => ({ kind: 'fetch', item: 336, n: 6, reward: [[328, 1], [331, 4]], text: 'Se viene el frío: juntá cuero para abrigos.' }),
  (r) => ({ kind: 'fetch', item: 423, n: 2 + Math.floor(r() * 2), reward: [[353, 14], [1129, 1]], text: 'Las noches están heladas: cociná guisos calientes para la gente.' }),
  (r) => ({ kind: 'fetch', item: 416, n: 5 + Math.floor(r() * 3), reward: [[1121, 1], [75, 6]], text: 'Bajá a una cueva de cristales y traé cuarzo: queremos armar un molino.' }),
  (r) => ({ kind: 'fetch', item: 1121, n: 1, reward: [[1120, 1], [1123, 2]], text: 'Queremos energía limpia: armá un molino de viento y traelo.' }),
  (r) => ({ kind: 'fetch', item: 422, n: 8, reward: [[426, 2], [353, 8]], text: 'Sin sal no se conserva la carne: traé sal del salar.' }),
  (r) => ({ kind: 'fetch', item: 1111, n: 4, reward: [[417, 1]], text: 'Necesitamos herramientas que no se rompan: traé obsidiana de las cuevas.' }),
  (r) => ({ kind: 'fetch', item: 440, n: 2, reward: [[353, 12], [441, 1]], text: 'Los chicos quieren queso: conseguí leche de cabra y hacé queso.' }),
];
export function makeQuest(seed) {
  const r = mulberry32(seed);
  const q = QUESTS[Math.floor(r() * QUESTS.length)](r);
  q.id = seed; q.progress = 0;
  return q;
}
export function questText(q) {
  const need = q.kind === 'fetch' ? `Entregá ${q.n} × ${itemName(q.item)}` : q.kind === 'kill' ? `Eliminá ${q.n} × ${MOB_NAMES[q.mob] ?? q.mob} (${Math.min(q.progress, q.n)}/${q.n})` : `Entregá ${q.n} cervezas de ${'★'.repeat(q.q)} o más`;
  const rew = q.reward.map(([id, n]) => `${n} × ${itemName(id)}`).join(', ');
  return { need, rew };
}
const MOB_NAMES = { ghoul: 'Necrófago', wolf: 'Lobo irradiado', rat: 'Rata gigante', alpha: 'Mutante alfa' };

// ---------- Notas ----------
export const NOTES = [
  ['Diario de un guardaparques', 'Día 3 después del destello. El bosque se quedó sin hojas en una noche. Los pájaros caían como piedras. Me voy al sur, dicen que en el valle todavía crece algo.'],
  ['Carta sin enviar', 'Marta: si leés esto, no vuelvas a la ciudad. Los túneles del subte están llenos de ratas del tamaño de un perro, y algo más grande que las manda.'],
  ['Registro del laboratorio 7', 'Sujeto alfa responde al núcleo. Cada vez más fuerte. El director quiere seguir. Si alguien encuentra esto: apaguen el reactor del tercer nivel.'],
  ['Receta de la abuela', 'Para una buena cerveza: agua limpia de verdad, malta bien tostada si la querés oscura, y paciencia. La levadura es un ser vivo, tratala bien. Fermenta mejor a la sombra.'],
  ['Folleto del autódromo', '¡Gran Premio del Yermo! Récord de la pista: 41 segundos. El instructor Rolo corre contra cualquiera que le pague. Nadie le ganó en modo Leyenda.'],
  ['Nota pegada a un surtidor', 'La nafta se terminó hace años. Algunos destilan alcohol de papas y cerveza para mover los motores. Funciona, pero no se la tomen.'],
  ['Mensaje de radio transcripto', '…repito, este es el asentamiento Esperanza. Tenemos agua, tenemos muros. Aceptamos a quien traiga acero y ganas de trabajar…'],
  ['Página arrancada', 'Los hongos gigantes brillan de noche. Comerlos crudos da visiones. En sopa curan el estómago. En el mosto, dan una cerveza ácida increíble.'],
  ['Advertencia', 'NO bajar al cráter de noche. El Behemot duerme de día. Si lo despertás, corré.'],
  ['Diario de un camionero', 'Ruta 40 bloqueada. Dejé el camión en los boxes del autódromo. Tiene el tanque lleno y la caja cargada. Si alguien lo encuentra, es suyo.'],
  ['Manual del técnico', 'Generador + cables + palanca = luz a voluntad. Poné un sensor de movimiento entre el cable y la puerta y se abre sola. Las torretas necesitan corriente constante.'],
  ['Poema en una pared', 'La ceniza cae como nieve gris / y nadie la barre. / Las ciudades duermen / y sueñan con nosotros.'],
  ['Inventario del búnker', 'Latas: 40. Agua: 12 días. Antirad: 6 cajas. Moral: baja. Alguien sigue golpeando la escotilla de noche.'],
  ['Carta de un cervecero', 'Dejé mi mejor barril añejando en la bodega. Cinco estrellas, dicen los que probaron. Vale una fortuna en cualquier taberna.'],
  ['Nota del Leviatán', 'En el pantano algo enorme se mueve bajo el agua verde. Brilla. Si el agua empieza a burbujear, alejate de la orilla.'],
  ['Mapa garabateado', 'Tundra al norte: frío que mata. Llevá abrigo de piel y hacé fogatas. Los lobos irradiados cazan en manada.'],
  ['Consejo de un viejo', 'Nunca tomes agua del pantano sin destilarla. Un balde, un horno y un carbón te salvan la vida.'],
  ['Hoja de un cuaderno', 'Los perros del yermo son buenos compañeros si les das carne. Te siguen a todos lados y pelean por vos.'],
  ['Última página', 'Si estás leyendo esto, todavía hay alguien vivo. Eso ya es algo. Construí, cultivá, compartí. El yermo no es el final.'],
  ['Cartel del asentamiento', 'Cada siete noches viene la horda. Reforzá las puertas, prendé las torretas y no salgas solo.'],
];
// historias por zona: notas que se encuentran en esa zona y se arman como un rompecabezas (4 partes cada una)
export const STORIES = [
  { id: 'ciudad', name: 'La última línea del subte', icon: '🏙', parts: [
    ['La última línea (1/4)', 'Soy conductora de la línea C. Esa mañana el tren se quedó sin luz entre dos estaciones. Esperamos una hora. Después dejamos de esperar.'],
    ['La última línea (2/4)', 'Caminamos por las vías con linternas. Arriba se escuchaba el viento como si fuera un mar. Nadie quería subir a ver.'],
    ['La última línea (3/4)', 'En el andén de la plaza armamos un campamento. Hay un banco que todavía guarda monedas y un kiosco con caramelos vencidos. Los chicos estaban felices.'],
    ['La última línea (4/4)', 'Hoy subimos. El cielo estaba gris pero había cielo. Dejo esta nota en el vagón por si alguien más se quedó abajo: arriba se puede vivir.'] ] },
  { id: 'desierto', name: 'Las cartas del cartero', icon: '🏜', parts: [
    ['El cartero (1/4)', 'Treinta años repartiendo cartas en este pueblo. Ahora la arena tapó las calles, pero yo sigo teniendo el bolso lleno.'],
    ['El cartero (2/4)', 'Leí una carta. Perdón. Era de una nieta a su abuela, contándole que había aprendido a andar en bicicleta.'],
    ['El cartero (3/4)', 'Encontré a la abuela. Vive en una casa de la meseta con tres cabras flacas. Lloró con la carta y me invitó a tomar mate de jarilla.'],
    ['El cartero (4/4)', 'Voy a entregar todas las cartas, aunque tarde años. Si encontrás una con un sello rojo, es mía. Dejala en un buzón, que algún día paso.'] ] },
  { id: 'crater', name: 'El ingeniero del reactor', icon: '☢', parts: [
    ['Bitácora del reactor (1/4)', 'Lectura normal a las 06:00. Lectura anormal a las 06:04. A las 06:05 el jefe dijo que no era nada.'],
    ['Bitácora del reactor (2/4)', 'Era algo. El suelo se hundió como una galletita mojada. El brillo verde se ve desde la ruta.'],
    ['Bitácora del reactor (3/4)', 'El uranio que queda en el borde del cráter sirve para lámparas. Paradójico: lo que nos rompió ahora nos alumbra.'],
    ['Bitácora del reactor (4/4)', 'Si bajás, llevá traje y salí antes de que oscurezca. Y si ves algo enorme durmiendo en el fondo, no lo despiertes. Por favor.'] ] },
  { id: 'militar', name: 'El soldado que no disparó', icon: '🪖', parts: [
    ['Diario de un recluta (1/4)', 'Me dieron un fusil y una orden. El fusil lo guardé en el armario. La orden la perdí.'],
    ['Diario de un recluta (2/4)', 'La base quedó vacía en una semana. Los demás se fueron con los camiones. Yo me quedé a cuidar la huerta del casino de oficiales.'],
    ['Diario de un recluta (3/4)', 'Las minas del campo de tiro siguen ahí. Marqué cada una con una piedra blanca. Si las ves, rodealas.'],
    ['Diario de un recluta (4/4)', 'Planté papas donde estaba el polígono. Crecen. Si pasás por acá, llevate algunas. Es lo único bueno que salió de este lugar.'] ] },
  { id: 'chatarra', name: 'La capitana sin barco', icon: '⚓', parts: [
    ['La capitana (1/4)', 'Mi barco encalló cuando el mar se fue. Así nomás: un día había agua y al otro, óxido hasta el horizonte.'],
    ['La capitana (2/4)', 'Con la tripulación desarmamos los botes salvavidas para hacer casas. La chapa naval aguanta todo.'],
    ['La capitana (3/4)', 'Dicen que en otro lado el mar sigue, con islas y palmeras. Me cuesta creerlo, pero lo sueño cada noche.'],
    ['La capitana (4/4)', 'Si encontrás el mar, contale que la capitana Irma lo extraña. Y llevate esta brújula: siempre marca el agua.'] ] },
  { id: 'frio', name: 'La estación meteorológica', icon: '❄', parts: [
    ['Estación polar (1/4)', 'Temperatura: −23. Viento: fuerte del sur. Ánimo: bueno, porque encontré café.'],
    ['Estación polar (2/4)', 'Los lobos irradiados rondan de noche, pero respetan la fogata. Les dejo huesos lejos de la puerta.'],
    ['Estación polar (3/4)', 'Vi luces de colores en el cielo. Verdes, violetas. Me quedé afuera hasta que no sentí los pies. Valió la pena.'],
    ['Estación polar (4/4)', 'Me voy al valle antes del invierno largo. Si llegás a la estación, el café está en la lata azul. Dejá un poco para el próximo.'] ] },
  { id: 'pantano', name: 'La botánica del pantano', icon: '🍄', parts: [
    ['Cuaderno de campo (1/4)', 'Especie nueva: hongo luminoso de sombrero azul. Brilla más cuando llueve. Lo dibujé tres veces.'],
    ['Cuaderno de campo (2/4)', 'Los hongos gigantes forman bosques enteros. Debajo de ellos el agua es menos tóxica. Hipótesis: la filtran.'],
    ['Cuaderno de campo (3/4)', 'Sopa de hongo brillante: cura el estómago. Crudo: visiones de colores. No recomiendo crudo.'],
    ['Cuaderno de campo (4/4)', 'La naturaleza no se rindió: se transformó. Quizás nosotros también podamos. Dejo mis semillas en el cofre del refugio.'] ] },
  { id: 'bosque', name: 'El guardaparques', icon: '🌲', parts: [
    ['El guardaparques (1/4)', 'Los árboles perdieron las hojas en una noche, pero las raíces siguen vivas. Lo sé porque cavé.'],
    ['El guardaparques (2/4)', 'Encontré un brote verde al lado de un tronco muerto. Lo rodeé con piedras para que no lo pisen.'],
    ['El guardaparques (3/4)', 'Ya son siete brotes. Les puse nombres. El más alto se llama Esperanza, como el asentamiento del sur.'],
    ['El guardaparques (4/4)', 'Si encontrás plantines, plantalos. Un yermo con árboles ya no es un yermo: es un bosque que se está despertando.'] ] },
  { id: 'islas', name: 'La bitácora del náufrago', icon: '🏝', parts: [
    ['El náufrago (1/4)', 'Día 1 en la isla. Hay cocos, hay sombra, hay mar. No está tan mal para ser un naufragio.'],
    ['El náufrago (2/4)', 'Aprendí a pescar con una rama y un hilo de mi camisa. El primer pez dorado lo solté: me pareció de buena suerte.'],
    ['El náufrago (3/4)', 'Encontré un faro abandonado. Desde arriba se ven otras islas. Por las noches prendo la lámpara por si alguien navega.'],
    ['El náufrago (4/4)', 'Armé un velero con tablas del barco hundido. Me voy a la isla grande. Si leés esto, el faro es tuyo: mantenelo prendido.'] ] },
];
// nota de historia: 2000 + historia * 10 + parte
export const storyOf = (i) => (i >= 2000 ? { s: STORIES[Math.floor((i - 2000) / 10) % STORIES.length], part: (i - 2000) % 10 } : null);
export const noteFor = (i) => { const st = storyOf(i); if (st) return st.s.parts[st.part] || st.s.parts[0]; return NOTES[((i % NOTES.length) + NOTES.length) % NOTES.length]; };

// valor de una oferta de compra de cerveza según su calidad
export function beerValue(q, base) { return base + (q ?? 1); }
export { BEERS };
void ITEMS;
