// Novedades v12.6: al abrir una versión nueva avisa qué cambió; también desde pausa → Juego → Novedades.
import { itemName } from './blocks.js';

export const NEWS = [
  ['14.1', 'Buenos Aires de verdad', [[1116, 'El centro porteño se rehízo con el mapa real de OpenStreetMap: unos 3,5 × 3,5 km, de Retiro a Independencia y del Congreso a Puerto Madero.'], [1043, 'Cada cuadra, cada calle y cada edificio en su lugar, con su altura cuando el mapa la tiene.'], [1148, 'Los árboles cargados en el mapa, con su especie: plátanos, jacarandás, tipas, palos borrachos y palmeras.'], [191, 'Carteles en cada esquina con los nombres reales de las dos calles, y los lugares famosos en el mapa.']]],
  ['14.0', 'Buenos Aires', [[1116, 'Nuevo tipo de mundo: réplica del centro porteño con el Obelisco, la 9 de Julio y Corrientes.'], [1148, 'Jacarandás, palos borrachos y tipas en las plazoletas.'], [1117, 'Carteles del Gran Rex y del Ópera, Teatro Colón y Diagonal Norte.'], [443, 'Arrancás al pie del Obelisco con un globo aerostático.']]],
  ['13.4', 'Recuerdos y mascotas', [[116, 'Álbum de viaje automático con tus mejores momentos.'], [443, 'Grabar recorrido: un video de tu mundo en 30 segundos.'], [271, 'El perro encuentra tesoros y la cabra avisa del peligro.'], [245, 'Música propia en los cañones, el salar y los géiseres.']]],
  ['13.3', 'Con amigos', [[285, 'El mundo sigue mientras no estás: cultivos y baterías avanzan.'], [442, 'Paquetes de hasta 4 cosas por el buzón.'], [443, 'Carreras en globo con 10 aros y ranking del grupo.'], [251, 'Concurso semanal de construcción con votos.']]],
  ['13.2', 'Pincel, portones y planos', [[444, 'Pincel para teñir hormigón, vidrio y camas con 12 colores.'], [1147, 'Portón automático que se abre al acercarte.'], [362, 'Planos compartibles como código de texto.']]],
  ['13.1', 'Caravanas, faros y estaciones', [[271, 'Caravanas de comerciantes para escoltar (25 fichas y un regalo).'], [1146, 'Faros con haz de luz giratorio de noche.'], [228, 'Templos hundidos en el mar abierto.'], [1106, 'Nieve en las mesetas en invierno, salar inundado tras la lluvia y géiseres más activos de noche.']]],
  ['13.0', 'Cielo, mapa y fotos', [[1035, 'Eclipses de sol y lluvias de estrellas.'], [442, 'Filtros en el mapa grande, con tus camas y los géiseres.'], [247, 'Modo foto con hora y clima a elección.'], [47, 'Agua quieta que refleja el cielo y plantas que se aplastan al pasar.'], [191, 'En el celular, mantené apretado un objeto para ver su descripción.']]],
  ['12.9', 'Globo aerostático', [[443, 'Un globo para recorrer el mundo desde arriba, despacio y con poca nafta.'], [251, 'Logro «Viento en la cara».']]],
  ['12.8', 'Tesoros', [[442, 'Mapas del tesoro: una X en el piso y un cofre enterrado.'], [1144, 'Pueblos fantasma en los cañones rojos.'], [258, 'El comerciante compra y vende lo nuevo.'], [251, 'Logro Cazatesoros.']]],
  ['12.7', 'Fauna y aventuras', [[439, 'Cabras montés: se domestican y se ordeñan. Queso y dulce de leche.'], [271, 'Lagartijas en los cañones y murciélagos en las cuevas.'], [1121, '6 misiones nuevas en los pueblos y desafíos de cocinar, ordeñar y explorar.'], [423, 'Página de Cocina en el libro de colección.'], [1103, 'Tormentas de arena en los cañones y sonido de los géiseres.'], [1120, 'En línea, la carga de las baterías se ve igual para todos.']]],
  ['12.6', 'Orden y logros', [[1035, 'Categorías en la fabricación y en el modo creativo: Construir, Decorar, Máquinas, Equipo, Comida y Otros.'], [251, '8 logros nuevos para lo que se sumó en la v12.'], [191, 'Este panel de novedades.']]],
  ['12.5', 'Terreno sin repetición', [[2, 'La piedra, el pasto, la tierra y la arena cambian de tono por zonas.']]],
  ['12.4', 'Hogar', [[1129, 'Camas de colores: al morir elegís en cuál aparecer.'], [1132, 'Cocina, mesada con pileta y biblioteca de roble.'], [429, 'Sillón, mesa de luz, florero, macetas, cajonera y perchero.'], [437, 'Marcos para colgar copias de tus dibujos.'], [1139, 'Carteles de pared.']]],
  ['12.3', 'Mecanismos y cocina', [[1121, 'Molino de viento y batería recargable.'], [1118, 'Compuertas de agua, farolas y lámparas colgantes.'], [1127, 'Regador de huerta sin cañerías; las cintas te llevan.'], [1128, 'Horno de barro: comidas con efectos.']]],
  ['12.2', 'Mundo', [[1103, 'Cañones rojos, salar y campo de géiseres.'], [1115, 'Cuevas con cristales, hongos que brillan y lagos.'], [417, 'Cuarzo y herramientas de obsidiana.']]],
  ['12.1', 'Materiales', [[1043, 'Piedras pulidas, en ladrillo y cinceladas.'], [1052, 'Vitrales que tiñen la luz.'], [1072, 'Maderas con cerco y puerta.'], [1101, 'Bloques de ruina.']]],
];

export function createNews(ctx) {
  const { flash } = ctx;
  const api = {};
  const cur = NEWS[0][0];
  let seen = null; try { seen = localStorage.getItem('yermo-news'); } catch { /* sin almacenamiento */ }
  function open() {
    ctx.openPanel('✨ Novedades', (list) => {
      for (const [v, title, items] of NEWS) {
        const box = document.createElement('div'); box.className = 'quest';
        box.innerHTML = `<p><b>v${v} · ${title}</b></p>`;
        for (const [id, txt] of items) {
          const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;align-items:center;margin:3px 0;font-size:15px';
          const c = document.createElement('canvas'); c.width = c.height = 32; c.title = itemName(id); c.style.flex = 'none';
          try { c.getContext('2d').drawImage(ctx.ui.icon(id), 0, 0, 32, 32); } catch { /* sin ícono */ }
          row.append(c, txt); box.appendChild(row);
        }
        list.appendChild(box);
      }
    });
    try { localStorage.setItem('yermo-news', cur); } catch { /* sin almacenamiento */ }
  }
  api.open = open;
  const grid = document.querySelector('.ptab[data-t="juego"] .pgrid');
  const bn = document.createElement('button'); bn.textContent = '✨ Novedades';
  bn.onclick = () => { document.querySelector('#pause').hidden = true; ctx.setPause(false); open(); };
  grid?.appendChild(bn);
  if (seen !== cur) {
    if (seen || ctx.game.meta.lastPlayed) setTimeout(() => flash(`✨ Hay novedades en la v${cur}: pausa → Juego → Novedades`), 6000);
    try { localStorage.setItem('yermo-news', cur); } catch { /* sin almacenamiento */ }
  }
  api.update = () => {};
  api.dispose = () => bn.remove();
  return api;
}
