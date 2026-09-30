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
  ];
  const sell = [
    { give: [[258, 3]], get: [281, 6] }, { give: [[258, 3]], get: [283, 3] }, { give: [[258, 4]], get: [291, 2] },
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
export const noteFor = (i) => NOTES[((i % NOTES.length) + NOTES.length) % NOTES.length];

// valor de una oferta de compra de cerveza según su calidad
export function beerValue(q, base) { return base + (q ?? 1); }
export { BEERS };
void ITEMS;
