// Novedades v12.6: al abrir una versión nueva avisa qué cambió; también desde pausa → Juego → Novedades.
import { itemName } from './blocks.js';

export const NEWS = [
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
