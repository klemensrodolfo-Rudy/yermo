// Definiciones compartidas (main thread + workers). Sin dependencias de DOM.

export const CHUNK = 16;
export const HEIGHT = 128;
export const SEA = 38;

// Nombres de tiles del atlas (orden = índice). textures.js dibuja cada uno.
export const TILES = [
  'bedrock', 'stone', 'deepstone', 'dirt', 'deadgrass_top', 'deadgrass_side',
  'ash', 'mud', 'gravel', 'concrete', 'concrete_cracked', 'asphalt',
  'rust', 'brick', 'glass', 'log_side', 'log_top', 'branches',
  'toxic_water', 'coal_ore', 'scrap_ore', 'copper_ore', 'uranium_ore', 'trinitite',
  'planks', 'bench_top', 'bench_side', 'furnace_front', 'furnace_side', 'furnace_top',
  'torch', 'metal_plate', 'lamp', 'barrel_side', 'barrel_top', 'rubble',
  'crack0', 'crack1', 'crack2', 'crack3', 'crack4', 'crack5', 'crack6', 'crack7', 'crack8', 'crack9',
  'crate_side', 'crate_top', 'sandbag', 'cot_top', 'cot_side',
  // v4
  'chest_front', 'chest_side', 'chest_top', 'farmland', 'clean_water', 'lava',
  'ladder', 'door_metal', 'bulb_off', 'bulb_on', 'cable', 'generator_front', 'generator_side',
  'solar_top', 'fence', 'mill_front', 'mill_side', 'mill_top', 'kettle_side', 'kettle_top',
  'fermenter_side', 'fermenter_top', 'medcrate_side', 'medcrate_top', 'tile_white', 'grass_top', 'grass_side',
  'post', 'oak_barrel_side', 'oak_barrel_top', 'brewcrate_side', 'brewcrate_top',
  'barley0', 'barley1', 'barley2', 'barley3', 'hops0', 'hops1', 'hops2', 'hops3',
  'potato0', 'potato1', 'potato2', 'potato3', 'rail', 'pump', 'lattice', 'sign_brew',
  // v5
  'cask_side', 'cask_top', 'tap_front', 'tap_side', 'bar_top', 'bar_side', 'still_side', 'still_top', 'fire',
  'fridge_front', 'fridge_side', 'bookshelf', 'painting', 'glass_red', 'glass_green', 'glass_blue', 'glass_yellow',
  'glass_purple', 'glass_orange', 'curtain', 'belt', 'hopper_side', 'hopper_top', 'lever_off', 'lever_on',
  'detector_off', 'detector_on', 'alarm_off', 'alarm_on', 'turret_side', 'turret_top', 'totem', 'mycelium_top',
  'mycelium_side', 'mush_stem', 'mush_cap_blue', 'mush_cap_purple', 'snow_top', 'snow_side', 'ice', 'kerb', 'track',
  'start_line', 'start_light', 'tires', 'pit_floor', 'reactor', 'spikes', 'tavern_sign', 'cloth', 'grandstand',
  // v6
  'press_side', 'press_top', 'safe_front', 'safe_side', 'flame', 'mine_top', 'garage_side', 'garage_top', 'flag_check', 'flag_start',
  'cone', 'pipe', 'pump_side', 'pump_top', 'sprinkler', 'elevator_top', 'elevator_side', 'sign', 'sand_toxic', 'hull', 'mil_fence',
  'camo', 'abyss', 'portal', 'asphalt_under',
  // v8
  'leaves',
  // v9: Reinos de Eldra
  'basalt', 'oak_leaves', 'silver_bark', 'silver_leaves', 'elf_planks', 'stone_bricks', 'stone_bricks_moss', 'thatch', 'green_frame',
  'flowers', 'web', 'mithril_ore', 'crystal', 'gold_pile', 'rune_top', 'rune_side', 'alchemy_top', 'alchemy_side', 'light_orb', 'oak_bark',
  // v9.3: archipiélago
  'sand', 'palm_bark', 'palm_leaves', 'coral_red', 'coral_yellow',
  // v9.4: minijuegos
  'mg_red', 'mg_blue', 'mg_gold', 'mg_white', 'mg_table',
  // v9.5: circuitos, música y pintura
  'button_off', 'button_on', 'battery', 'note_block', 'music_box', 'canvas',
  // v9.6
  'sapling',
  // v12: hormigón de colores (primeros bloques con id de 16 bits)
  'conc_rojo', 'conc_naranja', 'conc_amarillo', 'conc_lima', 'conc_verde', 'conc_cian', 'conc_celeste', 'conc_azul', 'conc_violeta', 'conc_rosa', 'conc_negro', 'conc_blanco',
  // v12.1: materiales
  'sandstone', 'tuff', 'stone_pol', 'stone_carv', 'deepstone_pol', 'deepstone_carv', 'deepstone_brk', 'sandstone_pol', 'sandstone_carv', 'sandstone_brk', 'basalt_pol', 'basalt_carv', 'basalt_brk', 'tuff_pol', 'tuff_carv', 'tuff_brk', 'glass_cyan', 'glass_sky', 'glass_pink', 'glass_white', 'glass_smoke', 'glass_lime', 'planks_oak', 'planks_palm', 'door_wood', 'door_oak', 'door_palm', 'door_elf', 'old_tiles', 'rusty_sign', 'hanging_cables', 'broken_glass',
];
export const T = Object.fromEntries(TILES.map((n, i) => [n, i]));

// Atlas: 32×32 celdas de 48 px; cada tile de 32 px va centrado con 8 px de borde repetido (para los mipmaps)
export const ATLAS = { res: 32, cell: 48, pad: 8, cols: 32, size: 1536 }; // hasta 1024 texturas
// rectángulo del tile en píxeles del atlas (imagen, y hacia abajo) y sus UV (v invertida, como la textura)
export const tileRect = (ti) => [(ti % ATLAS.cols) * ATLAS.cell + ATLAS.pad, Math.floor(ti / ATLAS.cols) * ATLAS.cell + ATLAS.pad, ATLAS.res, ATLAS.res];
export const tileUV = (ti) => { const [x, y] = tileRect(ti), s = ATLAS.size; return { u0: x / s, u1: (x + ATLAS.res) / s, v0: 1 - y / s, v1: 1 - (y + ATLAS.res) / s }; };
// tinte del pasto por bioma (128 = neutro; multiplica el color de los píxeles marcados)
export const BIOME_TINT = [
  [122, 112, 96], [130, 122, 104], [108, 120, 78], [116, 118, 102], [120, 138, 84], [104, 146, 98],
  [126, 104, 140], [116, 124, 126], [106, 132, 100], [126, 114, 94], [112, 116, 92], [128, 128, 128], [134, 128, 82],
  [96, 152, 88], [108, 150, 124], [116, 128, 110], [92, 108, 84], [140, 112, 92],
  [100, 140, 120], [92, 168, 80],
];
// banderas por tile para el shader: 1 variación completa (rota/espeja por bloque), 2 sólo espejo, 4 agua que fluye,
// 8 lava, 16 se mece con el viento, 32 remolino (portal), 64 llama que titila
export const TILE_FLAGS = new Uint8Array(1024);
{
  const set = (names, f) => names.split(' ').forEach((n) => { if (T[n] != null) TILE_FLAGS[T[n]] |= f; });
  set('leaves flowers oak_leaves silver_leaves', 16);
  set('sand coral_red coral_yellow', 1);
  set('palm_leaves sapling', 16);
  set('bedrock stone deepstone dirt ash mud gravel coal_ore scrap_ore copper_ore uranium_ore trinitite grass_top deadgrass_top snow_top sand_toxic rubble abyss mycelium_top concrete asphalt asphalt_under track camo mush_cap_blue mush_cap_purple log_top ice oak_barrel_top', 1);
  set('brick concrete_cracked planks log_side grass_side deadgrass_side snow_side mycelium_side rust metal_plate hull sandbag tile_white crate_side crate_top farmland mush_stem bar_top cloth', 2);
  set('clean_water toxic_water', 4);
  set('lava', 8);
  set('barley0 barley1 barley2 barley3 hops0 hops1 hops2 hops3 potato0 potato1 potato2 potato3 branches', 16);
  set('portal', 32);
  set('fire flame', 64);
}

export const AIR = 0;

// tool: 'pick' | 'axe' | 'shovel' | null ; tier: nivel mínimo para que suelte algo
// solid: colisiona ; opaque: bloquea luz y oculta caras ; light: emisión 0-15
// render: 'cube' | 'torch' | 'liquid' | 'box' | 'cross'
// v12: los bloques se guardan en 16 bits. Ids 1-255 (los de siempre) y 1024-4095 (los nuevos);
// del 256 al 1023 quedan para los ítems.
export const MAXB = 4096, NEW_BLOCKS = 1024;
const B = [];
function def(id, o) {
  B[id] = Object.assign({
    id, name: '?', tex: null, solid: true, opaque: true, light: 0,
    hardness: 1, tool: null, tier: 0, drop: id, dropCount: 1, render: 'cube', alpha: false,
  }, o);
}
const tx = (all) => ({ top: all, side: all, bottom: all });

def(0, { name: 'Aire', solid: false, opaque: false, hardness: 0, drop: 0 });
def(1, { name: 'Lecho de roca', tex: tx(T.bedrock), hardness: -1 });
def(2, { name: 'Roca', tex: tx(T.stone), hardness: 1.5, tool: 'pick', tier: 1 });
def(3, { name: 'Roca profunda', tex: tx(T.deepstone), hardness: 3, tool: 'pick', tier: 1 });
def(4, { name: 'Tierra', tex: tx(T.dirt), hardness: 0.5, tool: 'shovel' });
def(5, { name: 'Tierra muerta', tex: { top: T.deadgrass_top, side: T.deadgrass_side, bottom: T.dirt }, hardness: 0.6, tool: 'shovel', drop: 4, extra: [[281, 1, 0.04]] });
def(6, { name: 'Ceniza', tex: tx(T.ash), hardness: 0.5, tool: 'shovel' });
def(7, { name: 'Lodo', tex: tx(T.mud), hardness: 0.5, tool: 'shovel' });
def(8, { name: 'Grava', tex: tx(T.gravel), hardness: 0.6, tool: 'shovel' });
def(9, { name: 'Hormigón', tex: tx(T.concrete), hardness: 2, tool: 'pick', tier: 1 });
def(10, { name: 'Hormigón agrietado', tex: tx(T.concrete_cracked), hardness: 1.5, tool: 'pick', tier: 1, drop: 30 });
def(11, { name: 'Asfalto', tex: tx(T.asphalt), hardness: 1.5, tool: 'pick', tier: 1, drop: 8 });
def(12, { name: 'Metal oxidado', tex: tx(T.rust), hardness: 2.5, tool: 'pick', tier: 1, drop: 258, dropCount: 2 });
def(13, { name: 'Ladrillo', tex: tx(T.brick), hardness: 2, tool: 'pick', tier: 1 });
def(14, { name: 'Vidrio', tex: tx(T.glass), opaque: false, alpha: true, hardness: 0.3, drop: 0 });
def(15, { name: 'Tronco muerto', tex: { top: T.log_top, side: T.log_side, bottom: T.log_top }, hardness: 1.5, tool: 'axe' });
def(16, { name: 'Ramas secas', tex: tx(T.branches), opaque: false, alpha: true, hardness: 0.2, tool: 'axe', drop: 256, dropChance: 0.3, extra: [[248, 1, 0.04]] });
def(17, { name: 'Agua tóxica', tex: tx(T.toxic_water), solid: false, opaque: false, render: 'liquid', hardness: -1, drop: 0, liquid: 'toxic', level: 0 });
def(18, { name: 'Carbón mineral', tex: tx(T.coal_ore), hardness: 2, tool: 'pick', tier: 1, drop: 257 });
def(19, { name: 'Veta de chatarra', tex: tx(T.scrap_ore), hardness: 2.2, tool: 'pick', tier: 1, drop: 258, dropCount: 2 });
def(20, { name: 'Mineral de cobre', tex: tx(T.copper_ore), hardness: 3, tool: 'pick', tier: 2 });
def(21, { name: 'Mineral de uranio', tex: tx(T.uranium_ore), hardness: 4, tool: 'pick', tier: 3, drop: 261, light: 7 });
def(22, { name: 'Trinitita', tex: tx(T.trinitite), hardness: 1.2, tool: 'pick', tier: 1, light: 4 });
def(23, { name: 'Tablas', tex: tx(T.planks), hardness: 1.2, tool: 'axe' });
def(24, { name: 'Mesa de trabajo', tex: { top: T.bench_top, side: T.bench_side, bottom: T.planks }, hardness: 1.5, tool: 'axe', station: 'mesa' });
def(25, { name: 'Horno', tex: { top: T.furnace_top, side: T.furnace_side, bottom: T.furnace_top, front: T.furnace_front }, hardness: 2.5, tool: 'pick', tier: 1, station: 'horno', light: 6 });
def(26, { name: 'Antorcha', tex: tx(T.torch), solid: false, opaque: false, render: 'torch', hardness: 0, light: 14 });
def(27, { name: 'Placa de metal', tex: tx(T.metal_plate), hardness: 4, tool: 'pick', tier: 2 });
def(28, { name: 'Lámpara de uranio', tex: tx(T.lamp), hardness: 1, light: 15 });
def(29, { name: 'Barril tóxico', tex: { top: T.barrel_top, side: T.barrel_side, bottom: T.barrel_top }, hardness: 2, tool: 'pick', light: 8 });
def(30, { name: 'Escombros', tex: tx(T.rubble), hardness: 0.8, tool: 'shovel' });
def(31, { name: 'Caja de suministros', tex: { top: T.crate_top, side: T.crate_side, bottom: T.crate_top }, hardness: 1.2, tool: 'axe', drop: 0, loot: 'normal' });
def(32, { name: 'Bolsas de arena', tex: tx(T.sandbag), hardness: 1, tool: 'shovel' });
def(33, { name: 'Catre', tex: { top: T.cot_top, side: T.cot_side, bottom: T.planks }, hardness: 1, tool: 'axe', bed: true });
// antorchas de pared: wall = dirección hacia afuera del muro [dx, dz]
[[34, [1, 0]], [35, [-1, 0]], [36, [0, 1]], [37, [0, -1]]].forEach(([id, wall]) =>
  def(id, { name: 'Antorcha', tex: tx(T.torch), solid: false, opaque: false, render: 'torch', hardness: 0, light: 14, drop: 26, wall, hidden: true }));

// ---------- v4 ----------
def(38, { name: 'Cofre', tex: { top: T.chest_top, side: T.chest_side, bottom: T.chest_top, front: T.chest_front }, hardness: 1.5, tool: 'axe', container: 'chest' });
def(39, { name: 'Tierra de cultivo', tex: { top: T.farmland, side: T.dirt, bottom: T.dirt }, hardness: 0.5, tool: 'shovel', drop: 4 });
// líquidos: fuentes (level 0) y corrientes (level 1..7)
for (let l = 1; l <= 7; l++) def(39 + l, { name: 'Agua tóxica', tex: tx(T.toxic_water), solid: false, opaque: false, render: 'liquid', hardness: -1, drop: 0, liquid: 'toxic', level: l, hidden: true });
def(47, { name: 'Agua de manantial', tex: tx(T.clean_water), solid: false, opaque: false, render: 'liquid', hardness: -1, drop: 0, liquid: 'clean', level: 0 });
for (let l = 1; l <= 7; l++) def(47 + l, { name: 'Agua de manantial', tex: tx(T.clean_water), solid: false, opaque: false, render: 'liquid', hardness: -1, drop: 0, liquid: 'clean', level: l, hidden: true });
def(55, { name: 'Lava radiactiva', tex: tx(T.lava), solid: false, opaque: false, render: 'liquid', hardness: -1, drop: 0, liquid: 'lava', level: 0, light: 15 });
for (let l = 1; l <= 3; l++) def(55 + l, { name: 'Lava radiactiva', tex: tx(T.lava), solid: false, opaque: false, render: 'liquid', hardness: -1, drop: 0, liquid: 'lava', level: l * 2, light: 14, hidden: true });
def(59, { name: 'Losa de hormigón', tex: tx(T.concrete), opaque: false, render: 'box', box: [[0, 0, 0, 16, 8, 16]], hardness: 1.5, tool: 'pick', tier: 1, coll: [0, 0, 0, 1, 0.5, 1] });
def(60, { name: 'Losa de tablas', tex: tx(T.planks), opaque: false, render: 'box', box: [[0, 0, 0, 16, 8, 16]], hardness: 1, tool: 'axe', coll: [0, 0, 0, 1, 0.5, 1] });
// escaleras de mano (61 = ítem; 61..64 orientaciones)
const LADDER_BOX = { '1,0': [0, 0, 0, 1, 16, 16], '-1,0': [15, 0, 0, 16, 16, 16], '0,1': [0, 0, 0, 16, 16, 1], '0,-1': [0, 0, 15, 16, 16, 16] };
[[61, [1, 0]], [62, [-1, 0]], [63, [0, 1]], [64, [0, -1]]].forEach(([id, wall]) =>
  def(id, { name: 'Escalera de mano', tex: tx(T.ladder), solid: false, opaque: false, render: 'box', box: [LADDER_BOX[wall.join(',')]], hardness: 0.5, tool: 'axe', drop: 61, ladder: wall, hidden: id !== 61 }));
// puertas: base..base+7 (eje x/z, cerrada/abierta, abajo/arriba). base = ítem (65 = metal).
const DOORS = [];
function doorSet(base, name, tile, tool, hardness) {
for (const open of [0, 1]) for (const axis of ['x', 'z']) for (const top of [0, 1]) {
  const id = base + open * 4 + (axis === 'z' ? 2 : 0) + top;
  // cerrada: panel centrado; abierta: panel girado contra el borde
  const panel = !open ? (axis === 'x' ? [0, 0, 6.5, 16, 16, 9.5] : [6.5, 0, 0, 9.5, 16, 16]) : (axis === 'x' ? [0, 0, 0, 3, 16, 16] : [0, 0, 0, 16, 16, 3]);
  def(id, { name, tex: tx(tile), solid: !open, opaque: false, render: 'box', box: [panel], hardness, tool, drop: base, door: { open, axis, top, base }, hidden: id !== base });
  DOORS.push(id);
}
}
doorSet(65, 'Puerta de metal', T.door_metal, 'pick', 2);
def(73, { name: 'Foco eléctrico', tex: tx(T.bulb_off), hardness: 0.6, elec: 'device', drop: 73 });
def(74, { name: 'Foco eléctrico', tex: tx(T.bulb_on), hardness: 0.6, elec: 'device', drop: 73, light: 15, hidden: true });
def(75, { name: 'Cable', tex: tx(T.cable), solid: false, opaque: false, render: 'box', box: [[0, 0, 6.5, 16, 1.5, 9.5], [6.5, 0, 0, 9.5, 1.5, 16]], hardness: 0.2, elec: 'wire' });
def(76, { name: 'Generador', tex: { top: T.generator_side, side: T.generator_side, bottom: T.generator_side, front: T.generator_front }, hardness: 3, tool: 'pick', tier: 1, elec: 'source', container: 'generator' });
def(77, { name: 'Panel solar', tex: { top: T.solar_top, side: T.metal_plate, bottom: T.metal_plate }, opaque: false, render: 'box', box: [[0, 0, 0, 16, 5, 16]], coll: [0, 0, 0, 1, 0.32, 1], hardness: 1.5, tool: 'pick', elec: 'solar' });
def(78, { name: 'Cerco eléctrico', tex: tx(T.fence), opaque: false, alpha: true, render: 'box', box: [[6, 0, 6, 10, 16, 10], [0, 4, 7.5, 16, 5, 8.5], [0, 10, 7.5, 16, 11, 8.5], [7.5, 4, 0, 8.5, 5, 16], [7.5, 10, 0, 8.5, 11, 16]], hardness: 2, tool: 'pick', elec: 'fence' });
def(79, { name: 'Molino de grano', tex: { top: T.mill_top, side: T.mill_side, bottom: T.mill_top, front: T.mill_front }, hardness: 2, tool: 'pick', container: 'mill' });
def(80, { name: 'Olla de cocción', tex: { top: T.kettle_top, side: T.kettle_side, bottom: T.kettle_side }, hardness: 2, tool: 'pick', container: 'kettle', light: 3 });
def(81, { name: 'Fermentador', tex: { top: T.fermenter_top, side: T.fermenter_side, bottom: T.fermenter_top }, hardness: 2, tool: 'axe', container: 'fermenter' });
def(82, { name: 'Caja médica', tex: { top: T.medcrate_top, side: T.medcrate_side, bottom: T.medcrate_top }, hardness: 1, tool: 'axe', drop: 0, loot: 'med' });
def(83, { name: 'Azulejo blanco', tex: tx(T.tile_white), hardness: 1.8, tool: 'pick', tier: 1 });
def(84, { name: 'Pasto vivo', tex: { top: T.grass_top, side: T.grass_side, bottom: T.dirt }, hardness: 0.6, tool: 'shovel', drop: 4, extra: [[281, 1, 0.12], [283, 1, 0.05]] });
def(85, { name: 'Poste de madera', tex: tx(T.post), opaque: false, render: 'box', box: [[5, 0, 5, 11, 16, 11]], hardness: 1, tool: 'axe' });
def(86, { name: 'Barril de roble', tex: { top: T.oak_barrel_top, side: T.oak_barrel_side, bottom: T.oak_barrel_top }, hardness: 1.5, tool: 'axe', drop: 23, dropCount: 3 });
def(87, { name: 'Caja de cervecería', tex: { top: T.brewcrate_top, side: T.brewcrate_side, bottom: T.brewcrate_top }, hardness: 1, tool: 'axe', drop: 0, loot: 'brew' });
def(88, { name: 'Cartel de cervecería', tex: { top: T.planks, side: T.sign_brew, bottom: T.planks }, hardness: 1, tool: 'axe', drop: 23 });
// cultivos: 3 especies × 4 etapas (render cruz)
export const CROPS = {
  barley: { base: 89, seed: 281, product: 282, name: 'Cebada', tiles: 'barley' },
  hops: { base: 93, seed: 283, product: 284, name: 'Lúpulo', tiles: 'hops' },
  potato: { base: 97, seed: 285, product: 285, name: 'Papa', tiles: 'potato' },
};
for (const [k, c] of Object.entries(CROPS)) for (let s = 0; s < 4; s++) {
  def(c.base + s, { name: c.name + (s < 3 ? ' (creciendo)' : ''), tex: tx(T[c.tiles + s]), solid: false, opaque: false, render: 'cross', hardness: 0, drop: 0, crop: { kind: k, stage: s }, hidden: true });
}
def(101, { name: 'Vía de tren', tex: tx(T.rail), solid: false, opaque: false, render: 'box', box: [[0, 0, 0, 16, 1, 16]], hardness: 1, tool: 'pick', drop: 258 });
def(102, { name: 'Surtidor de nafta', tex: { top: T.metal_plate, side: T.pump, bottom: T.metal_plate }, hardness: 2.5, tool: 'pick', drop: 258, dropCount: 3 });
def(103, { name: 'Estructura de antena', tex: tx(T.lattice), opaque: false, alpha: true, hardness: 2, tool: 'pick', drop: 258 });

// ---------- v5 ----------
// variantes orientadas: facing = [dx, dz] hacia donde "mira" el bloque
const ORIENT = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const rot = (bx, f) => {
  // rota una caja (16avos) definida mirando a -z hacia la orientación f
  const [x0, y0, z0, x1, y1, z1, t] = bx;
  let r;
  if (f[0] === 0 && f[1] === -1) r = [x0, y0, z0, x1, y1, z1];
  else if (f[0] === 0 && f[1] === 1) r = [16 - x1, y0, 16 - z1, 16 - x0, y1, 16 - z0];
  else if (f[0] === 1) r = [16 - z1, y0, x0, 16 - z0, y1, x1];
  else r = [z0, y0, 16 - x1, z1, y1, 16 - x0];
  if (t !== undefined) r.push(t);
  return r;
};
export const ORIENTED = {}; // id base -> [ids por orientación]
function defOriented(base, o, boxes, collFn) {
  const ids = [];
  ORIENT.forEach((f, i) => {
    const id = base + i;
    const bxs = boxes.map((b) => rot(b, f));
    def(id, { ...o, render: 'box', box: bxs, facing: f, drop: o.drop ?? base, hidden: i > 0, coll: collFn ? collFn(bxs) : o.coll });
    ids.push(id);
  });
  ORIENTED[base] = ids;
}
const toColl = (bxs) => bxs.map((b) => [b[0] / 16, b[1] / 16, b[2] / 16, b[3] / 16, b[4] / 16, b[5] / 16]);

def(104, { name: 'Barril de añejamiento', tex: { top: T.cask_top, side: T.cask_side, bottom: T.cask_top }, hardness: 1.5, tool: 'axe', container: 'cask' });
def(105, { name: 'Chopera', tex: { top: T.bar_top, side: T.tap_side, bottom: T.planks, front: T.tap_front }, hardness: 1.5, tool: 'axe', container: 'tap' });
def(106, { name: 'Barra de taberna', tex: { top: T.bar_top, side: T.bar_side, bottom: T.planks }, hardness: 1.5, tool: 'axe' });
def(107, { name: 'Alambique', tex: { top: T.still_top, side: T.still_side, bottom: T.still_side }, hardness: 2, tool: 'pick', container: 'still', light: 4 });
def(108, { name: 'Fogata', tex: { top: T.log_top, side: T.log_side, bottom: T.log_top }, solid: false, opaque: false, render: 'box', light: 13, station: 'fogata', hardness: 0.5, tool: 'axe',
  box: [[1, 0, 6, 15, 3, 10], [6, 0, 1, 10, 3, 15], [3, 2, 7.5, 13, 13, 8.5, T.fire], [7.5, 2, 3, 8.5, 13, 13, T.fire]] });
def(109, { name: 'Heladera', tex: { top: T.fridge_side, side: T.fridge_side, bottom: T.fridge_side, front: T.fridge_front }, hardness: 2, tool: 'pick', elec: 'device' });
def(110, { name: 'Mesa', tex: tx(T.planks), opaque: false, render: 'box', box: [[0, 13, 0, 16, 16, 16], [1, 0, 1, 3, 13, 3], [13, 0, 1, 15, 13, 3], [1, 0, 13, 3, 13, 15], [13, 0, 13, 15, 13, 15]], hardness: 1, tool: 'axe' });
defOriented(111, { name: 'Silla', tex: tx(T.planks), opaque: false, hardness: 1, tool: 'axe', seat: true, coll: [[0.1, 0, 0.1, 0.9, 0.5, 0.9]] },
  [[3, 7, 3, 13, 9, 13], [3, 0, 3, 5, 7, 5], [11, 0, 3, 13, 7, 5], [3, 0, 11, 5, 7, 13], [11, 0, 11, 13, 7, 13], [3, 9, 11, 13, 20, 13]]);
def(115, { name: 'Estante con libros', tex: { top: T.planks, side: T.bookshelf, bottom: T.planks }, hardness: 1.2, tool: 'axe', drop: 23, dropCount: 3, extra: [[337, 1, 0.3]] });
[[116, [1, 0]], [117, [-1, 0]], [118, [0, 1]], [119, [0, -1]]].forEach(([id, wall]) => {
  const b = { '1,0': [0, 2, 1, 1, 14, 15], '-1,0': [15, 2, 1, 16, 14, 15], '0,1': [1, 2, 0, 15, 14, 1], '0,-1': [1, 2, 15, 15, 14, 16] }[wall.join(',')];
  def(id, { name: 'Cuadro', tex: tx(T.painting), solid: false, opaque: false, render: 'box', box: [b], hardness: 0.3, drop: 116, wall2: wall, hidden: id !== 116 });
});
[['rojo', T.glass_red], ['verde', T.glass_green], ['azul', T.glass_blue], ['amarillo', T.glass_yellow], ['violeta', T.glass_purple], ['naranja', T.glass_orange]].forEach(([n, t], i) =>
  def(120 + i, { name: 'Vidrio ' + n, tex: tx(t), opaque: false, alpha: true, hardness: 0.3, drop: 0, tinted: true }));
def(126, { name: 'Cortina', tex: tx(T.curtain), solid: false, opaque: false, render: 'box', box: [[0, 0, 7.5, 16, 16, 8.5]], hardness: 0.2, drop: 126 });
def(127, { name: 'Cortina', tex: tx(T.curtain), solid: false, opaque: false, render: 'box', box: [[7.5, 0, 0, 8.5, 16, 16]], hardness: 0.2, drop: 126, hidden: true });
defOriented(130, { name: 'Cinta transportadora', tex: { top: T.belt, side: T.metal_plate, bottom: T.metal_plate }, opaque: false, hardness: 1, tool: 'pick', belt: true, coll: [[0, 0, 0, 1, 0.19, 1]] }, [[0, 0, 0, 16, 3, 16]]);
def(134, { name: 'Tolva', tex: { top: T.hopper_top, side: T.hopper_side, bottom: T.hopper_side }, hardness: 2, tool: 'pick', container: 'hopper' });
def(135, { name: 'Palanca', tex: tx(T.lever_off), hardness: 0.5, elec: 'switch', on: 136 });
def(136, { name: 'Palanca', tex: tx(T.lever_on), hardness: 0.5, elec: 'switch', off: 135, drop: 135, hidden: true });
def(137, { name: 'Detector de movimiento', tex: tx(T.detector_off), hardness: 1, elec: 'detector' });
def(138, { name: 'Detector de movimiento', tex: tx(T.detector_on), hardness: 1, elec: 'detector', drop: 137, hidden: true, light: 4 });
def(139, { name: 'Alarma', tex: tx(T.alarm_off), hardness: 1, elec: 'device' });
def(140, { name: 'Alarma', tex: tx(T.alarm_on), hardness: 1, elec: 'device', drop: 139, hidden: true, light: 8 });
def(141, { name: 'Torreta', tex: { top: T.turret_top, side: T.turret_side, bottom: T.metal_plate }, hardness: 3, tool: 'pick', elec: 'device' });
def(142, { name: 'Tótem de protección', tex: tx(T.totem), hardness: 3, tool: 'pick', light: 5, claim: true });
def(143, { name: 'Micelio', tex: { top: T.mycelium_top, side: T.mycelium_side, bottom: T.dirt }, hardness: 0.6, tool: 'shovel', drop: 4, extra: [[327, 1, 0.15]] });
def(144, { name: 'Tallo de hongo', tex: tx(T.mush_stem), hardness: 1, tool: 'axe' });
def(145, { name: 'Sombrero de hongo', tex: tx(T.mush_cap_blue), hardness: 0.6, tool: 'axe', light: 11, drop: 327, dropCount: 2 });
def(146, { name: 'Sombrero de hongo', tex: tx(T.mush_cap_purple), hardness: 0.6, tool: 'axe', light: 11, drop: 327, dropCount: 2 });
def(147, { name: 'Nieve gris', tex: { top: T.snow_top, side: T.snow_side, bottom: T.dirt }, hardness: 0.5, tool: 'shovel', drop: 4 });
def(148, { name: 'Hielo sucio', tex: tx(T.ice), hardness: 0.8, tool: 'pick', drop: 0 });
def(149, { name: 'Bordillo', tex: tx(T.kerb), hardness: 1.5, tool: 'pick', drop: 9 });
def(150, { name: 'Asfalto de pista', tex: tx(T.track), hardness: 1.5, tool: 'pick', drop: 8 });
def(151, { name: 'Línea de largada', tex: { top: T.start_line, side: T.track, bottom: T.track }, hardness: 1.5, tool: 'pick', drop: 8 });
def(152, { name: 'Semáforo de largada', tex: { top: T.metal_plate, side: T.start_light, bottom: T.metal_plate }, hardness: 3, tool: 'pick', race: true, light: 6 });
def(153, { name: 'Neumáticos apilados', tex: { top: T.tires, side: T.tires, bottom: T.tires }, hardness: 1, drop: 258 });
// marcadores: se ven como piso de boxes y hacen aparecer vehículos/NPC una sola vez
def(154, { name: 'Piso de boxes', tex: tx(T.pit_floor), hardness: 2, tool: 'pick', drop: 9, marker: 'racecar' });
def(155, { name: 'Piso de boxes', tex: tx(T.pit_floor), hardness: 2, tool: 'pick', drop: 9, marker: 'racebike', hidden: true });
def(156, { name: 'Piso de boxes', tex: tx(T.pit_floor), hardness: 2, tool: 'pick', drop: 9, marker: 'truck', hidden: true });
def(157, { name: 'Piso de boxes', tex: tx(T.pit_floor), hardness: 2, tool: 'pick', drop: 9, marker: 'instructor', hidden: true });
def(158, { name: 'Piso del asentamiento', tex: tx(T.planks), hardness: 1.2, tool: 'axe', drop: 23, marker: 'leader', hidden: true });
def(159, { name: 'Núcleo del laboratorio', tex: tx(T.reactor), hardness: 6, tool: 'pick', tier: 3, light: 12, marker: 'alpha', drop: 313 });
def(160, { name: 'Trampa de púas', tex: tx(T.spikes), solid: false, opaque: false, render: 'box', box: [[1, 0, 1, 15, 5, 15]], hardness: 1.5, tool: 'pick', spikes: true, drop: 258 });
defOriented(161, { name: 'Escalera de hormigón', tex: tx(T.concrete), opaque: false, hardness: 2, tool: 'pick', tier: 1 }, [[0, 0, 0, 16, 8, 16], [0, 8, 0, 16, 16, 8]], toColl);
defOriented(165, { name: 'Escalera de tablas', tex: tx(T.planks), opaque: false, hardness: 1.2, tool: 'axe' }, [[0, 0, 0, 16, 8, 16], [0, 8, 0, 16, 16, 8]], toColl);
defOriented(169, { name: 'Escalera de ladrillo', tex: tx(T.brick), opaque: false, hardness: 2, tool: 'pick', tier: 1 }, [[0, 0, 0, 16, 8, 16], [0, 8, 0, 16, 16, 8]], toColl);
def(173, { name: 'Losa de ladrillo', tex: tx(T.brick), opaque: false, render: 'box', box: [[0, 0, 0, 16, 8, 16]], hardness: 1.5, tool: 'pick', tier: 1, coll: [0, 0, 0, 1, 0.5, 1] });
def(174, { name: 'Losa de roca', tex: tx(T.stone), opaque: false, render: 'box', box: [[0, 0, 0, 16, 8, 16]], hardness: 1.5, tool: 'pick', tier: 1, coll: [0, 0, 0, 1, 0.5, 1] });
def(175, { name: 'Cartel de taberna', tex: { top: T.planks, side: T.tavern_sign, bottom: T.planks }, hardness: 1, tool: 'axe' });
def(176, { name: 'Tela', tex: tx(T.cloth), hardness: 0.5, drop: 176 });
def(178, { name: 'Caja del laboratorio', tex: { top: T.medcrate_top, side: T.hopper_side, bottom: T.medcrate_top }, hardness: 1.5, tool: 'pick', drop: 0, loot: 'lab' });
def(177, { name: 'Tribuna', tex: { top: T.grandstand, side: T.concrete, bottom: T.concrete }, hardness: 2, tool: 'pick', tier: 1, drop: 9 });

// ---------- v6 ----------
def(179, { name: 'Prensa de fichas', tex: { top: T.press_top, side: T.press_side, bottom: T.metal_plate }, hardness: 3, tool: 'pick', tier: 1, station: 'prensa' });
def(180, { name: 'Caja fuerte del banco', tex: { top: T.metal_plate, side: T.safe_side, bottom: T.metal_plate, front: T.safe_front }, hardness: 8, tool: 'pick', tier: 3, bank: true });
def(181, { name: 'Fuego', tex: tx(T.flame), solid: false, opaque: false, render: 'cross', hardness: 0, drop: 0, light: 14, fire: true, hidden: true });
def(182, { name: 'Mina terrestre', tex: { top: T.mine_top, side: T.dirt, bottom: T.dirt }, hardness: 0.5, tool: 'shovel', drop: 369, mine: true, hidden: true });
def(183, { name: 'Taller mecánico', tex: { top: T.garage_top, side: T.garage_side, bottom: T.metal_plate }, hardness: 3, tool: 'pick', station: 'taller' });
def(184, { name: 'Bandera de control', tex: tx(T.flag_check), solid: false, opaque: false, render: 'box', box: [[7.5, 0, 7.5, 8.5, 16, 8.5, T.metal_plate], [8.5, 9, 7.5, 15, 15, 8.5]], hardness: 0.3, checkpoint: true });
def(185, { name: 'Bandera de largada', tex: tx(T.flag_start), solid: false, opaque: false, render: 'box', box: [[7.5, 0, 7.5, 8.5, 16, 8.5, T.metal_plate], [8.5, 9, 7.5, 15, 15, 8.5]], hardness: 0.3, race: 'custom' });
def(186, { name: 'Cono de pista', tex: tx(T.cone), opaque: false, render: 'box', box: [[3, 0, 3, 13, 2, 13], [5, 2, 5, 11, 7, 11], [6.5, 7, 6.5, 9.5, 12, 9.5]], hardness: 0.2, coll: [0.2, 0, 0.2, 0.8, 0.75, 0.8] });
def(187, { name: 'Cañería', tex: tx(T.pipe), solid: false, opaque: false, render: 'box', box: [[0, 5, 5, 16, 11, 11], [5, 5, 0, 11, 11, 16], [5, 0, 5, 11, 16, 11]], hardness: 0.8, tool: 'pick', pipe: true });
def(188, { name: 'Bomba de agua', tex: { top: T.pump_top, side: T.pump_side, bottom: T.metal_plate }, hardness: 2, tool: 'pick', elec: 'device', pipe: true, pump: true });
def(189, { name: 'Aspersor', tex: tx(T.sprinkler), solid: false, opaque: false, render: 'box', box: [[6, 0, 6, 10, 6, 10], [3, 6, 3, 13, 8, 13]], hardness: 0.5, pipe: true, sprinkler: true });
def(190, { name: 'Ascensor', tex: { top: T.elevator_top, side: T.elevator_side, bottom: T.elevator_side }, hardness: 2, tool: 'pick', elevator: true });
def(191, { name: 'Cartel', tex: tx(T.sign), solid: false, opaque: false, render: 'box', box: [[7, 0, 7, 9, 10, 9, T.post], [1, 9, 7, 15, 16, 9]], hardness: 0.5, tool: 'axe', container: 'sign' });
def(192, { name: 'Arena contaminada', tex: tx(T.sand_toxic), hardness: 0.5, tool: 'shovel' });
def(193, { name: 'Chapa naval', tex: tx(T.hull), hardness: 3, tool: 'pick', tier: 1, drop: 258, dropCount: 3 });
def(194, { name: 'Alambrado militar', tex: tx(T.mil_fence), opaque: false, alpha: true, hardness: 2, tool: 'pick', drop: 258 });
def(195, { name: 'Bloque de camuflaje', tex: tx(T.camo), hardness: 2, tool: 'pick', tier: 1 });
def(196, { name: 'Roca del abismo', tex: tx(T.abyss), hardness: 7, tool: 'pick', tier: 3, drop: 3 });
def(198, { name: 'Caja militar', tex: { top: T.camo, side: T.safe_side, bottom: T.camo }, hardness: 1.5, tool: 'pick', drop: 0, loot: 'military' });
def(199, { name: 'Piso del mercado', tex: tx(T.pit_floor), hardness: 2, tool: 'pick', drop: 9, marker: 'undercity', hidden: true });
def(200, { name: 'Caja del abismo', tex: { top: T.abyss, side: T.medcrate_side, bottom: T.abyss }, hardness: 2, tool: 'pick', drop: 0, loot: 'abyss', light: 3 });
def(201, { name: 'Andén del subte', tex: tx(T.concrete), hardness: 2, tool: 'pick', tier: 1, drop: 9, marker: 'train', hidden: true });
def(202, { name: 'Hojas de acacia', tex: tx(T.leaves), opaque: false, alpha: true, hardness: 0.3, tool: 'axe', drop: 0, extra: [[248, 1, 0.1]] });
def(203, { name: 'Plaza del bioparque', tex: tx(T.concrete), hardness: 2, tool: 'pick', tier: 1, drop: 9, marker: 'zoo', hidden: true });
def(204, { name: 'Centro de la base', tex: tx(T.concrete), hardness: 2, tool: 'pick', tier: 1, drop: 9, marker: 'base', hidden: true });
// ---------- v9: Reinos de Eldra ----------
def(205, { name: 'Basalto', tex: tx(T.basalt), hardness: 3, tool: 'pick', tier: 1 });
def(206, { name: 'Hojas de roble', tex: tx(T.oak_leaves), opaque: false, alpha: true, hardness: 0.3, tool: 'axe', drop: 0, extra: [[385, 1, 0.08], [248, 1, 0.1]] });
def(207, { name: 'Corteza plateada', tex: { top: T.log_top, side: T.silver_bark, bottom: T.log_top }, hardness: 2, tool: 'axe', drop: 209, dropCount: 2 });
def(208, { name: 'Hojas de plata', tex: tx(T.silver_leaves), opaque: false, alpha: true, hardness: 0.3, tool: 'axe', drop: 0, light: 4 });
def(209, { name: 'Madera élfica', tex: tx(T.elf_planks), hardness: 1.5, tool: 'axe' });
def(210, { name: 'Piedra tallada', tex: tx(T.stone_bricks), hardness: 2.5, tool: 'pick', tier: 1 });
def(211, { name: 'Piedra tallada con musgo', tex: tx(T.stone_bricks_moss), hardness: 2.5, tool: 'pick', tier: 1, drop: 210 });
def(212, { name: 'Techo de paja', tex: tx(T.thatch), hardness: 0.6, tool: 'axe' });
def(213, { name: 'Madera pintada de verde', tex: tx(T.green_frame), hardness: 1.5, tool: 'axe' });
def(214, { name: 'Flores silvestres', tex: tx(T.flowers), solid: false, opaque: false, render: 'cross', hardness: 0, drop: 380, hidden: true });
def(215, { name: 'Telaraña', tex: tx(T.web), solid: false, opaque: false, render: 'cross', hardness: 0.4, tool: 'axe', drop: 0, web: true });
def(216, { name: 'Mineral de mithril', tex: tx(T.mithril_ore), hardness: 4, tool: 'pick', tier: 3, light: 3 });
def(217, { name: 'Cristal arcano', tex: tx(T.crystal), opaque: false, alpha: true, hardness: 1.5, tool: 'pick', drop: 387, dropCount: 2, light: 10 });
def(218, { name: 'Montón de oro', tex: tx(T.gold_pile), hardness: 1, tool: 'shovel', drop: 353, dropCount: 6 });
def(219, { name: 'Altar de runas', tex: { top: T.rune_top, side: T.rune_side, bottom: T.stone_bricks }, hardness: 3, tool: 'pick', station: 'runas', light: 7 });
def(220, { name: 'Mesa de alquimia', tex: { top: T.alchemy_top, side: T.alchemy_side, bottom: T.elf_planks }, hardness: 1.5, tool: 'axe', station: 'alquimia' });
def(221, { name: 'Orbe de luz', tex: tx(T.light_orb), solid: false, opaque: false, render: 'cross', hardness: 0, drop: 0, light: 15, hidden: true });
def(222, { name: 'Roble', tex: { top: T.log_top, side: T.oak_bark, bottom: T.log_top }, hardness: 1.8, tool: 'axe' });
def(223, { name: 'Guarida del dragón', tex: tx(T.basalt), hardness: 3, tool: 'pick', drop: 205, marker: 'dragon', hidden: true });
def(224, { name: 'Torre del mago', tex: tx(T.stone_bricks), hardness: 3, tool: 'pick', drop: 210, marker: 'mage', hidden: true });
def(225, { name: 'Plaza de la aldea', tex: tx(T.stone_bricks), hardness: 3, tool: 'pick', drop: 210, marker: 'village', hidden: true });
def(227, { name: 'Núcleo del refugio', tex: { top: T.lamp, side: T.metal_plate, bottom: T.metal_plate }, hardness: 4, tool: 'pick', light: 10 });
def(228, { name: 'Cofre del tesoro', tex: { top: T.chest_top, side: T.chest_side, bottom: T.chest_top, front: T.chest_front }, hardness: 1.5, tool: 'axe', drop: 0, loot: 'treasure' });
def(229, { name: 'Arena', tex: tx(T.sand), hardness: 0.5, tool: 'shovel' });
def(230, { name: 'Coral rojo', tex: tx(T.coral_red), hardness: 0.8, tool: 'pick' });
def(231, { name: 'Coral amarillo', tex: tx(T.coral_yellow), hardness: 0.8, tool: 'pick' });
def(232, { name: 'Palmera', tex: { top: T.log_top, side: T.palm_bark, bottom: T.log_top }, hardness: 1.5, tool: 'axe' });
def(233, { name: 'Hojas de palmera', tex: tx(T.palm_leaves), opaque: false, alpha: true, hardness: 0.3, tool: 'axe', drop: 0, extra: [[403, 1, 0.15], [248, 1, 0.06]] });
def(234, { name: 'Mesa de minijuegos', tex: { top: T.mg_table, side: T.planks, bottom: T.planks }, hardness: 1.5, tool: 'axe', light: 4 });
def(235, { name: 'Nieve de spleef', tex: { top: T.snow_top, side: T.snow_top, bottom: T.snow_top }, hardness: 0.05, drop: 0 });
def(236, { name: 'Bloque rojo', tex: tx(T.mg_red), hardness: 0.8, drop: 236 });
def(237, { name: 'Bloque azul', tex: tx(T.mg_blue), hardness: 0.8, drop: 237 });
def(238, { name: 'Meta dorada', tex: tx(T.mg_gold), hardness: 0.8, drop: 238, light: 8 });
def(239, { name: 'Bloque blanco', tex: tx(T.mg_white), hardness: 0.8, drop: 239 });
def(240, { name: 'Pulsador', tex: tx(T.button_off), hardness: 0.5, elec: 'switch' });
def(241, { name: 'Pulsador', tex: tx(T.button_on), hardness: 0.5, elec: 'switch', drop: 240, hidden: true, light: 3 });
def(242, { name: 'Placa de presión', tex: tx(T.metal_plate), solid: false, opaque: false, render: 'box', box: [[1, 0, 1, 15, 1, 15]], hardness: 0.5, elec: 'switch' });
def(243, { name: 'Placa de presión', tex: tx(T.mg_gold), solid: false, opaque: false, render: 'box', box: [[1, 0, 1, 15, 0.5, 15]], hardness: 0.5, elec: 'switch', drop: 242, hidden: true });
def(244, { name: 'Pila', tex: { top: T.battery, side: T.battery, bottom: T.metal_plate }, hardness: 1, elec: 'source' });
def(245, { name: 'Bloque musical', tex: tx(T.note_block), hardness: 1, tool: 'axe', elec: 'device', container: 'note' });
def(246, { name: 'Caja musical', tex: { top: T.music_box, side: T.note_block, bottom: T.planks }, hardness: 1, tool: 'axe', elec: 'device', container: 'musicbox' });
def(247, { name: 'Lienzo', tex: { top: T.planks, side: T.canvas, bottom: T.planks }, hardness: 0.5, tool: 'axe', container: 'canvas' });
def(248, { name: 'Plantín', tex: tx(T.sapling), solid: false, opaque: false, render: 'cross', hardness: 0, drop: 248 });
def(249, { name: 'Inicio de aventura', tex: { top: T.mg_table, side: T.mg_white, bottom: T.mg_white }, hardness: 1, light: 6 });
def(250, { name: 'Control de aventura', tex: { top: T.mg_blue, side: T.mg_white, bottom: T.mg_white }, hardness: 1, light: 6 });
def(251, { name: 'Trofeo', tex: tx(T.mg_gold), solid: false, opaque: false, render: 'box', box: [[5, 0, 5, 11, 2, 11], [7, 2, 7, 9, 5, 9], [4, 5, 4, 12, 11, 12]], hardness: 0.3, light: 10 });
def(252, { name: 'Meta de aventura', tex: { top: T.mg_gold, side: T.mg_table, bottom: T.mg_white }, hardness: 1, light: 12 });
def(253, { name: 'Cofre con acertijo', tex: { top: T.chest_top, side: T.mg_blue, bottom: T.chest_top, front: T.chest_front }, hardness: 1.5, tool: 'axe', container: 'chest' });
def(128, { name: 'Losa', tex: tx(T.stone), opaque: false, render: 'box', box: [[0, 0, 0, 16, 8, 16]], coll: [0, 0, 0, 1, 0.5, 1], hardness: 1.2, drop: 0, shaped: 'losa' });
def(129, { name: 'Escalón', tex: tx(T.stone), opaque: false, render: 'box', box: [[0, 0, 0, 16, 8, 16], [0, 8, 8, 16, 16, 16]], coll: [[0, 0, 0, 1, 0.5, 1], [0, 0.5, 0.5, 1, 1, 1]], hardness: 1.2, drop: 0, shaped: 'escalon' });
def(254, { name: 'Panel', tex: tx(T.stone), opaque: false, render: 'box', box: [[0, 0, 6, 16, 16, 10]], coll: [0, 0, 0.375, 1, 1, 0.625], hardness: 1, drop: 0, shaped: 'panel' });
def(255, { name: 'Decoración', tex: tx(T.planks), solid: false, opaque: false, render: 'box', box: [[4, 0, 4, 12, 8, 12]], hardness: 0.3, drop: 0, shaped: 'decor' });
def(226, { name: 'Cofre antiguo', tex: { top: T.chest_top, side: T.chest_side, bottom: T.chest_top, front: T.chest_front }, hardness: 1.5, tool: 'axe', drop: 0, loot: 'eldra' });
def(197, { name: 'Portal del abismo', tex: tx(T.portal), hardness: -1, light: 12, portal: true });

// colisión: normalizar a lista de cajas
for (const b of B) if (b?.coll && typeof b.coll[0] === 'number') b.coll = [b.coll];

// ---------- v12: bloques nuevos (desde el 1024) ----------
def(1024, { name: 'Hormigón rojo', tex: tx(T.conc_rojo), hardness: 2, tool: 'pick', tier: 1 });
def(1025, { name: 'Hormigón naranja', tex: tx(T.conc_naranja), hardness: 2, tool: 'pick', tier: 1 });
def(1026, { name: 'Hormigón amarillo', tex: tx(T.conc_amarillo), hardness: 2, tool: 'pick', tier: 1 });
def(1027, { name: 'Hormigón lima', tex: tx(T.conc_lima), hardness: 2, tool: 'pick', tier: 1 });
def(1028, { name: 'Hormigón verde', tex: tx(T.conc_verde), hardness: 2, tool: 'pick', tier: 1 });
def(1029, { name: 'Hormigón cian', tex: tx(T.conc_cian), hardness: 2, tool: 'pick', tier: 1 });
def(1030, { name: 'Hormigón celeste', tex: tx(T.conc_celeste), hardness: 2, tool: 'pick', tier: 1 });
def(1031, { name: 'Hormigón azul', tex: tx(T.conc_azul), hardness: 2, tool: 'pick', tier: 1 });
def(1032, { name: 'Hormigón violeta', tex: tx(T.conc_violeta), hardness: 2, tool: 'pick', tier: 1 });
def(1033, { name: 'Hormigón rosa', tex: tx(T.conc_rosa), hardness: 2, tool: 'pick', tier: 1 });
def(1034, { name: 'Hormigón negro', tex: tx(T.conc_negro), hardness: 2, tool: 'pick', tier: 1 });
def(1035, { name: 'Hormigón blanco', tex: tx(T.conc_blanco), hardness: 2, tool: 'pick', tier: 1 });
// ---------- v12.1: materiales ----------
def(1036, { name: 'Arenisca', tex: tx(T.sandstone), hardness: 1.2, tool: 'pick', tier: 1 });
def(1037, { name: 'Toba', tex: tx(T.tuff), hardness: 1.2, tool: 'pick', tier: 1 });
def(1038, { name: 'Roca pulida', tex: tx(T.stone_pol), hardness: 2, tool: 'pick', tier: 1 });
def(1039, { name: 'Roca cincelada', tex: tx(T.stone_carv), hardness: 2, tool: 'pick', tier: 1 });
def(1040, { name: 'Roca profunda pulida', tex: tx(T.deepstone_pol), hardness: 2, tool: 'pick', tier: 1 });
def(1041, { name: 'Ladrillos de roca profunda', tex: tx(T.deepstone_brk), hardness: 2, tool: 'pick', tier: 1 });
def(1042, { name: 'Roca profunda cincelada', tex: tx(T.deepstone_carv), hardness: 2, tool: 'pick', tier: 1 });
def(1043, { name: 'Arenisca pulida', tex: tx(T.sandstone_pol), hardness: 2, tool: 'pick', tier: 1 });
def(1044, { name: 'Ladrillos de arenisca', tex: tx(T.sandstone_brk), hardness: 2, tool: 'pick', tier: 1 });
def(1045, { name: 'Arenisca cincelada', tex: tx(T.sandstone_carv), hardness: 2, tool: 'pick', tier: 1 });
def(1046, { name: 'Basalto pulido', tex: tx(T.basalt_pol), hardness: 2, tool: 'pick', tier: 1 });
def(1047, { name: 'Ladrillos de basalto', tex: tx(T.basalt_brk), hardness: 2, tool: 'pick', tier: 1 });
def(1048, { name: 'Basalto cincelado', tex: tx(T.basalt_carv), hardness: 2, tool: 'pick', tier: 1 });
def(1049, { name: 'Toba pulida', tex: tx(T.tuff_pol), hardness: 2, tool: 'pick', tier: 1 });
def(1050, { name: 'Ladrillos de toba', tex: tx(T.tuff_brk), hardness: 2, tool: 'pick', tier: 1 });
def(1051, { name: 'Toba cincelada', tex: tx(T.tuff_carv), hardness: 2, tool: 'pick', tier: 1 });
def(1052, { name: 'Vidrio cian', tex: tx(T.glass_cyan), opaque: false, alpha: true, hardness: 0.3, drop: 0, tinted: true });
def(1053, { name: 'Vidrio celeste', tex: tx(T.glass_sky), opaque: false, alpha: true, hardness: 0.3, drop: 0, tinted: true });
def(1054, { name: 'Vidrio rosa', tex: tx(T.glass_pink), opaque: false, alpha: true, hardness: 0.3, drop: 0, tinted: true });
def(1055, { name: 'Vidrio blanco', tex: tx(T.glass_white), opaque: false, alpha: true, hardness: 0.3, drop: 0, tinted: true });
def(1056, { name: 'Vidrio ahumado', tex: tx(T.glass_smoke), opaque: false, alpha: true, hardness: 0.3, drop: 0, tinted: true });
def(1057, { name: 'Vidrio lima', tex: tx(T.glass_lime), opaque: false, alpha: true, hardness: 0.3, drop: 0, tinted: true });
def(1058, { name: 'Tablas de roble', tex: tx(T.planks_oak), hardness: 1.5, tool: 'axe' });
def(1059, { name: 'Tablas de palmera', tex: tx(T.planks_palm), hardness: 1.5, tool: 'axe' });
def(1060, { name: 'Cerco de madera', tex: tx(T.planks), opaque: false, render: 'box', box: [[6, 0, 6, 10, 16, 10], [0, 6, 7, 16, 8, 9], [0, 12, 7, 16, 14, 9], [7, 6, 0, 9, 8, 16], [7, 12, 0, 9, 14, 16]], hardness: 1, tool: 'axe' });
def(1061, { name: 'Cerco de roble', tex: tx(T.planks_oak), opaque: false, render: 'box', box: [[6, 0, 6, 10, 16, 10], [0, 6, 7, 16, 8, 9], [0, 12, 7, 16, 14, 9], [7, 6, 0, 9, 8, 16], [7, 12, 0, 9, 14, 16]], hardness: 1, tool: 'axe' });
def(1062, { name: 'Cerco de palmera', tex: tx(T.planks_palm), opaque: false, render: 'box', box: [[6, 0, 6, 10, 16, 10], [0, 6, 7, 16, 8, 9], [0, 12, 7, 16, 14, 9], [7, 6, 0, 9, 8, 16], [7, 12, 0, 9, 14, 16]], hardness: 1, tool: 'axe' });
def(1063, { name: 'Cerco élfico', tex: tx(T.elf_planks), opaque: false, render: 'box', box: [[6, 0, 6, 10, 16, 10], [0, 6, 7, 16, 8, 9], [0, 12, 7, 16, 14, 9], [7, 6, 0, 9, 8, 16], [7, 12, 0, 9, 14, 16]], hardness: 1, tool: 'axe' });
def(1096, { name: 'Pared derruida', tex: tx(T.brick), opaque: false, render: 'box', box: [[0, 0, 0, 16, 9, 16], [0, 9, 0, 11, 13, 16], [0, 13, 0, 5, 16, 16]], hardness: 1.5, tool: 'pick', drop: 30 });
def(1097, { name: 'Azulejos viejos', tex: tx(T.old_tiles), hardness: 1, tool: 'pick' });
def(1098, { name: 'Cartel oxidado', tex: tx(T.rusty_sign), solid: false, opaque: false, render: 'box', box: [[7, 0, 7, 9, 9, 9, T.rust], [0, 8, 7, 16, 16, 9]], hardness: 0.6, tool: 'pick' });
def(1099, { name: 'Caños viejos', tex: tx(T.pipe), opaque: false, render: 'box', box: [[0, 2, 2, 16, 6, 6], [0, 9, 9, 16, 14, 14], [0, 0, 11, 16, 3, 14]], hardness: 0.8, tool: 'pick' });
def(1100, { name: 'Cables colgando', tex: tx(T.hanging_cables), solid: false, opaque: false, render: 'cross', hardness: 0.1, drop: 75 });
def(1101, { name: 'Ventana rota', tex: tx(T.broken_glass), opaque: false, alpha: true, hardness: 0.3, drop: 0 });
doorSet(1064, 'Puerta de madera', T.door_wood, 'axe', 1.5);
doorSet(1072, 'Puerta de roble', T.door_oak, 'axe', 1.5);
doorSet(1080, 'Puerta de palmera', T.door_palm, 'axe', 1.5);
doorSet(1088, 'Puerta élfica', T.door_elf, 'axe', 1.5);
export const V121 = { sandstone: 1036, tuff: 1037, stone_pol: 1038, stone_carv: 1039, deepstone_pol: 1040, deepstone_brk: 1041, deepstone_carv: 1042, sandstone_pol: 1043, sandstone_brk: 1044, sandstone_carv: 1045, basalt_pol: 1046, basalt_brk: 1047, basalt_carv: 1048, tuff_pol: 1049, tuff_brk: 1050, tuff_carv: 1051, glass_cyan: 1052, glass_sky: 1053, glass_pink: 1054, glass_white: 1055, glass_smoke: 1056, glass_lime: 1057, planks_oak: 1058, planks_palm: 1059, fence_wood: 1060, fence_oak: 1061, fence_palm: 1062, fence_elf: 1063, door_wood: 1064, door_oak: 1072, door_palm: 1080, door_elf: 1088, ruin_wall: 1096, old_tiles: 1097, rusty_sign: 1098, pipes: 1099, hanging_cables: 1100, broken_glass: 1101 };
export const CONC_COLORS = [1024, 1025, 1026, 1027, 1028, 1029, 1030, 1031, 1032, 1033, 1034, 1035];

export const BLOCKS = B;
export const NUM_BLOCKS = B.length;
export const DOOR_IDS = DOORS;

// Tablas planas para el mesher (rápido en workers)
export const OPAQUE = new Uint8Array(MAXB);
export const SOLID = new Uint8Array(MAXB);
export const EMIT = new Uint8Array(MAXB);
// color de la luz que emite cada bloque (0 cálida de fuego · 1 verde · 2 violeta · 3 fría · 4 roja · 5 lava · 6 cian · 7 blanca)
export const LCOL = new Uint8Array(MAXB);
export const RENDER = new Uint8Array(MAXB); // 0 none,1 cube,2 torch,3 liquid,4 box,5 cross
export const TORCH_DIR = new Int8Array(MAXB * 2); // [dx, dz] por id (antorchas de pared)
export const LIQ = new Uint8Array(MAXB);     // 0 no, 1 tóxica, 2 limpia, 3 lava
export const LIQ_LEVEL = new Uint8Array(MAXB);
export const BOXES = [];                    // id -> [[x0,y0,z0,x1,y1,z1] en 16avos]
export const TEX_TOP = new Uint16Array(MAXB), TEX_SIDE = new Uint16Array(MAXB), TEX_BOTTOM = new Uint16Array(MAXB), TEX_FRONT = new Uint16Array(MAXB);
const RMAP = { cube: 1, torch: 2, liquid: 3, box: 4, cross: 5 };
for (const b of B) {
  if (!b) continue;
  OPAQUE[b.id] = b.opaque ? 1 : 0;
  SOLID[b.id] = b.solid ? 1 : 0;
  EMIT[b.id] = b.light;
  RENDER[b.id] = b.id === 0 ? 0 : RMAP[b.render];
  if (b.wall) { TORCH_DIR[b.id * 2] = b.wall[0]; TORCH_DIR[b.id * 2 + 1] = b.wall[1]; }
  if (b.liquid) { LIQ[b.id] = b.liquid === 'toxic' ? 1 : b.liquid === 'clean' ? 2 : 3; LIQ_LEVEL[b.id] = b.level; }
  if (b.box) BOXES[b.id] = b.box;
  if (b.tex) {
    TEX_TOP[b.id] = b.tex.top; TEX_SIDE[b.id] = b.tex.side; TEX_BOTTOM[b.id] = b.tex.bottom;
    TEX_FRONT[b.id] = b.tex.front ?? b.tex.side;
  }
}
// vitrales: la luz de las lámparas que los atraviesa toma su color (índice de LCOL + 1)
export const GLASS_TINT = new Uint8Array(MAXB);
GLASS_TINT[120] = 4;
GLASS_TINT[121] = 1;
GLASS_TINT[122] = 9;
GLASS_TINT[123] = 8;
GLASS_TINT[124] = 2;
GLASS_TINT[125] = 5;
GLASS_TINT[1052] = 7;
GLASS_TINT[1053] = 4;
GLASS_TINT[1054] = 11;
GLASS_TINT[1055] = 8;
GLASS_TINT[1057] = 2;
export const isWater = (id) => LIQ[id] === 1 || LIQ[id] === 2;
export const isLiquid = (id) => LIQ[id] > 0;
export const liquidId = (kind, level) => (kind === 1 ? (level ? 39 + level : 17) : kind === 2 ? (level ? 47 + level : 47) : (level ? 55 + Math.ceil(level / 2) : 55));
// caja de colisión (0..1) de un bloque sólido
export const collBox = (id, x, y, z) => (shapeHook && B[id]?.shaped && x != null ? shapeHook(id, x, y, z) : null) ?? B[id]?.coll ?? null; // lista de cajas o null (= cubo entero)
// formas: cajas en 16avos según la rotación (0-3); el panel con rot 2 es una alfombra
export const SHAPE_BOXES = {
  losa: [[[0, 0, 0, 16, 8, 16]], [[0, 8, 0, 16, 16, 16]]],
  escalon: [[[0, 0, 0, 16, 8, 16], [0, 8, 8, 16, 16, 16]], [[0, 0, 0, 16, 8, 16], [0, 8, 0, 8, 16, 16]], [[0, 0, 0, 16, 8, 16], [0, 8, 0, 16, 16, 8]], [[0, 0, 0, 16, 8, 16], [8, 8, 0, 16, 16, 16]]],
  panel: [[[0, 0, 6, 16, 16, 10]], [[6, 0, 0, 10, 16, 16]], [[0, 0, 0, 16, 1, 16]]],
};
// decoración (bloque 255): cajas con su propia textura
export const DECOR = [
  { id: 'maceta', name: 'Maceta', boxes: [[5, 0, 5, 11, 6, 11, T.brick], [6, 6, 6, 10, 7, 10, T.dirt], [7.5, 7, 7.5, 8.5, 10, 8.5, T.oak_bark], [5, 10, 5, 11, 15, 11, T.oak_leaves]] },
  { id: 'farol', name: 'Farol', boxes: [[5, 0, 5, 11, 1, 11, T.metal_plate], [6, 1, 6, 10, 8, 10, T.light_orb], [5, 8, 5, 11, 9, 11, T.metal_plate], [7.5, 9, 7.5, 8.5, 12, 8.5, T.metal_plate]] },
  { id: 'mesa', name: 'Mesa', boxes: [[0, 13, 0, 16, 16, 16, T.planks], [1, 0, 1, 3, 13, 3, T.planks], [13, 0, 1, 15, 13, 3, T.planks], [1, 0, 13, 3, 13, 15, T.planks], [13, 0, 13, 15, 13, 15, T.planks]] },
  { id: 'silla', name: 'Silla', boxes: [[3, 7, 3, 13, 9, 13, T.planks], [3, 0, 3, 5, 7, 5, T.planks], [11, 0, 3, 13, 7, 5, T.planks], [3, 0, 11, 5, 7, 13, T.planks], [11, 0, 11, 13, 7, 13, T.planks], [3, 9, 11, 13, 16, 13, T.planks]] },
  { id: 'estante', name: 'Estante', boxes: [[0, 0, 8, 16, 16, 16, T.crate_side]] },
  { id: 'barril', name: 'Barril', boxes: [[3, 0, 3, 13, 14, 13, T.log_side]] },
  { id: 'banco', name: 'Banco', boxes: [[0, 6, 4, 16, 8, 12, T.planks], [1, 0, 5, 3, 6, 11, T.planks], [13, 0, 5, 15, 6, 11, T.planks]] },
  { id: 'alfombra', name: 'Alfombra roja', boxes: [[0, 0, 0, 16, 1, 16, T.mg_red]] },
  { id: 'caja', name: 'Caja de madera', boxes: [[1, 0, 1, 15, 14, 15, T.crate_side]] },
  { id: 'puesto', name: 'Puesto de venta', boxes: [[0, 0, 4, 16, 10, 12, T.planks], [0, 10, 3, 16, 11, 13, T.planks], [1, 11, 11, 2, 16, 12, T.planks], [14, 11, 11, 15, 16, 12, T.planks], [0, 15, 4, 16, 16, 13, T.mg_red]] },
];
let shapeHook = null;
export const setShapeHook = (fn) => { shapeHook = fn; };

// ---------- Ítems (no bloques) ----------
export const ITEMS = {
  256: { name: 'Palo', icon: 'stick' },
  257: { name: 'Carbón', icon: 'coal' },
  258: { name: 'Chatarra', icon: 'scrap' },
  259: { name: 'Lingote de cobre', icon: 'copper_ingot' },
  260: { name: 'Lingote de acero', icon: 'steel_ingot' },
  261: { name: 'Fragmento de uranio', icon: 'uranium' },
  262: { name: 'Pico de madera', icon: 'pick', color: 'wood', tool: 'pick', tier: 1, speed: 2, durability: 60 },
  263: { name: 'Hacha de madera', icon: 'axe', color: 'wood', tool: 'axe', tier: 1, speed: 2, durability: 60 },
  264: { name: 'Pala de madera', icon: 'shovel', color: 'wood', tool: 'shovel', tier: 1, speed: 2, durability: 60 },
  265: { name: 'Pico de chatarra', icon: 'pick', color: 'scrap', tool: 'pick', tier: 2, speed: 4, durability: 180 },
  266: { name: 'Hacha de chatarra', icon: 'axe', color: 'scrap', tool: 'axe', tier: 2, speed: 4, durability: 180 },
  267: { name: 'Pala de chatarra', icon: 'shovel', color: 'scrap', tool: 'shovel', tier: 2, speed: 4, durability: 180 },
  268: { name: 'Pico de acero', icon: 'pick', color: 'steel', tool: 'pick', tier: 3, speed: 7, durability: 600 },
  269: { name: 'Hacha de acero', icon: 'axe', color: 'steel', tool: 'axe', tier: 3, speed: 7, durability: 600 },
  270: { name: 'Pala de acero', icon: 'shovel', color: 'steel', tool: 'shovel', tier: 3, speed: 7, durability: 600 },
  271: { name: 'Carne cruda', icon: 'meat', food: 3 },
  272: { name: 'Carne asada', icon: 'cooked', food: 8 },
  273: { name: 'Lata de comida', icon: 'can', food: 6 },
  274: { name: 'Antirad', icon: 'pills', antirad: 45 },
  275: { name: 'Bate con clavos', icon: 'bat', weapon: 5, durability: 150 },
  276: { name: 'Machete', icon: 'machete', weapon: 8, durability: 450 },
  // v4
  277: { name: 'Balde de metal', icon: 'bucket', stack: 16 },
  278: { name: 'Balde de agua tóxica', icon: 'bucket_toxic', stack: 1, bucket: 17 },
  279: { name: 'Balde de agua limpia', icon: 'bucket_clean', stack: 1, bucket: 47 },
  280: { name: 'Balde de lava', icon: 'bucket_lava', stack: 1, bucket: 55 },
  281: { name: 'Semillas de cebada', icon: 'seeds', plant: 'barley' },
  282: { name: 'Cebada', icon: 'barley' },
  283: { name: 'Esqueje de lúpulo', icon: 'hop_cutting', plant: 'hops' },
  284: { name: 'Lúpulo', icon: 'hops' },
  285: { name: 'Papa', icon: 'potato', food: 2, plant: 'potato' },
  286: { name: 'Papa asada', icon: 'potato_baked', food: 6 },
  287: { name: 'Malta', icon: 'malt' },
  288: { name: 'Malta tostada', icon: 'malt_dark' },
  289: { name: 'Malta molida', icon: 'grist' },
  290: { name: 'Malta tostada molida', icon: 'grist_dark' },
  291: { name: 'Levadura', icon: 'yeast' },
  292: { name: 'Mosto pálido', icon: 'wort', color: 0xd8a040 },
  293: { name: 'Mosto oscuro', icon: 'wort', color: 0x4a2a14 },
  294: { name: 'Mosto radiactivo', icon: 'wort', color: 0x9cd83a },
  295: { name: 'Botella vacía', icon: 'bottle' },
  296: { name: 'Pale Ale del Yermo', icon: 'beer', color: 0xe0a030, food: 3, heal: 2, buff: 'coraje', beer: true },
  297: { name: 'Stout de Ceniza', icon: 'beer', color: 0x2a1a10, food: 4, heal: 2, buff: 'coraza', beer: true },
  298: { name: 'IPA Radiactiva', icon: 'beer', color: 0x9cff3a, food: 3, heal: 2, buff: 'plomo', beer: true },
  299: { name: 'Ballesta', icon: 'crossbow', ranged: 9, durability: 250 },
  300: { name: 'Virote', icon: 'bolt' },
  301: { name: 'Chaleco de chatarra', icon: 'vest', color: 0x9a5a30, armor: 'body', def: 0.25, durability: 220 },
  302: { name: 'Armadura de acero', icon: 'vest', color: 0xb8bcc4, armor: 'body', def: 0.45, durability: 520 },
  303: { name: 'Traje antirradiación', icon: 'hazmat', color: 0xe0c23a, armor: 'body', def: 0.12, radRes: 0.6, durability: 320 },
  304: { name: 'Máscara de gas', icon: 'mask', armor: 'head', def: 0.05, radRes: 0.3, air: 2, durability: 320 },
  305: { name: 'Casco de chatarra', icon: 'helmet', color: 0x9a5a30, armor: 'head', def: 0.12, durability: 200 },
  306: { name: 'Botiquín', icon: 'medkit', heal: 10 },
  307: { name: 'Plano: Ballesta', icon: 'blueprint', learn: 'ballesta' },
  308: { name: 'Plano: Armadura de acero', icon: 'blueprint', learn: 'acero' },
  309: { name: 'Plano: Traje antirradiación', icon: 'blueprint', learn: 'hazmat' },
  310: { name: 'Plano: Electricidad', icon: 'blueprint', learn: 'electricidad' },
  311: { name: 'Plano: Moto', icon: 'blueprint', learn: 'moto' },
  312: { name: 'Moto de chatarra', icon: 'moto', vehicle: 'moto' },
  313: { name: 'Núcleo del Behemot', icon: 'core' },
  314: { name: 'Pluma negra', icon: 'feather' },
  315: { name: 'Plano: Cervecería', icon: 'blueprint', learn: 'cerveza' },
  // v5 · cerveza
  316: { name: 'Porter de Humo', icon: 'beer', color: 0x3a2418, food: 4, heal: 2, buff: 'humo', beer: true, thirst: 5 },
  317: { name: 'Sour de Pantano', icon: 'beer', color: 0xc8d060, food: 3, heal: 3, buff: 'acido', beer: true, thirst: 7 },
  318: { name: 'Lager Helada', icon: 'beer', color: 0xf0d870, food: 3, heal: 2, buff: 'frescura', beer: true, thirst: 9 },
  319: { name: 'Barleywine del Behemot', icon: 'beer', color: 0x8a2a14, food: 6, heal: 4, buff: 'furia', beer: true, strong: true, thirst: 3 },
  320: { name: 'Mosto ahumado', icon: 'wort', color: 0x5a3420 },
  321: { name: 'Mosto ácido', icon: 'wort', color: 0xb8c050 },
  322: { name: 'Mosto fuerte', icon: 'wort', color: 0x9a3a1a },
  323: { name: 'Alcohol', icon: 'bottle_alc', heal: 4, cures: 'infeccion', fuel: 40 },
  // cocina
  324: { name: 'Guiso del yermo', icon: 'stew', food: 14, heal: 2, thirst: 6 },
  325: { name: 'Pan de cebada', icon: 'bread', food: 6 },
  326: { name: 'Sopa de hongos', icon: 'soup', food: 8, thirst: 5, cures: 'intoxicacion' },
  327: { name: 'Hongo brillante', icon: 'mushroom', food: 1 },
  // supervivencia
  328: { name: 'Cantimplora vacía', icon: 'canteen', stack: 1 },
  329: { name: 'Cantimplora', icon: 'canteen_full', durability: 5, drink: 7 },
  330: { name: 'Antibióticos', icon: 'pills_blue', cures: 'infeccion' },
  331: { name: 'Pólvora', icon: 'powder' },
  332: { name: 'Munición', icon: 'ammo' },
  333: { name: 'Pistola de chatarra', icon: 'pistol', gun: { dmg: 10, pellets: 1, spread: 0.01, cd: 0.45, range: 40 }, durability: 300 },
  334: { name: 'Escopeta recortada', icon: 'shotgun', gun: { dmg: 5, pellets: 6, spread: 0.09, cd: 1.0, range: 22 }, durability: 220 },
  335: { name: 'Abrigo de piel', icon: 'coat', color: 0x8a6040, armor: 'body', def: 0.1, warm: 1, durability: 300 },
  336: { name: 'Cuero', icon: 'leather' },
  337: { name: 'Nota', icon: 'note', stack: 1, note: true },
  338: { name: 'Bidón vacío', icon: 'jerrycan', stack: 4 },
  339: { name: 'Bidón de nafta', icon: 'jerrycan_full', stack: 4, fuel: 60 },
  // vehículos
  340: { name: 'Auto de chatarra', icon: 'car', vehicle: 'car' },
  341: { name: 'Camión', icon: 'truck', vehicle: 'truck' },
  342: { name: 'Moto de cross', icon: 'moto', vehicle: 'cross', color: 0xd9823b },
  343: { name: 'Moto de pista', icon: 'moto', vehicle: 'racebike', color: 0xc8302a },
  344: { name: 'Auto de carrera', icon: 'racecar', vehicle: 'racecar' },
  345: { name: 'Bote', icon: 'boat', vehicle: 'boat' },
  // planos v5
  346: { name: 'Plano: Armas de fuego', icon: 'blueprint', learn: 'armas' },
  347: { name: 'Plano: Autos y camiones', icon: 'blueprint', learn: 'autos' },
  348: { name: 'Plano: Auto de carrera', icon: 'blueprint', learn: 'carrera' },
  349: { name: 'Plano: Automatización', icon: 'blueprint', learn: 'automatizacion' },
  350: { name: 'Plano: Destilería', icon: 'blueprint', learn: 'destileria' },
  351: { name: 'Plano: Defensa', icon: 'blueprint', learn: 'defensa' },
  352: { name: 'Trofeo del autódromo', icon: 'trophy' },
  // v6
  353: { name: 'Ficha', icon: 'coin' },
  354: { name: 'Cajón de mercancía', icon: 'cargo', stack: 8 },
  355: { name: 'Encendedor', icon: 'lighter', durability: 60, lighter: true },
  356: { name: 'Arco', icon: 'bow', bow: 6, durability: 200 },
  357: { name: 'Flecha', icon: 'arrow' },
  358: { name: 'Granada', icon: 'grenade', grenade: true, stack: 16 },
  359: { name: 'Lanzallamas', icon: 'flamer', flamer: true, durability: 400 },
  360: { name: 'Montura', icon: 'saddle', stack: 1 },
  361: { name: 'Cinta métrica', icon: 'tape', tape: true, stack: 1 },
  362: { name: 'Plano de obra', icon: 'blueprint_build', stack: 1, build: true },
  363: { name: 'Copa cervecera', icon: 'cup' },
  364: { name: 'Helicóptero', icon: 'heli', vehicle: 'heli' },
  365: { name: 'Vagoneta', icon: 'cart', vehicle: 'cart' },
  366: { name: 'Plano: Aviación', icon: 'blueprint', learn: 'aviacion' },
  367: { name: 'Plano: Explosivos', icon: 'blueprint', learn: 'explosivos' },
  368: { name: 'Plano: Fontanería', icon: 'blueprint', learn: 'fontaneria' },
  369: { name: 'Mina (desactivada)', icon: 'mine', place: 182 },
  // v9: magia y armas medievales
  370: { name: 'Báculo de luz', icon: 'staff', color: 'light', spell: 'light', mana: 3, durability: 300 },
  371: { name: 'Báculo de fuego', icon: 'staff', color: 'fire', spell: 'fire', mana: 5, durability: 250 },
  372: { name: 'Báculo de curación', icon: 'staff', color: 'heal', spell: 'heal', mana: 6, durability: 250 },
  373: { name: 'Báculo de escudo', icon: 'staff', color: 'shield', spell: 'shield', mana: 8, durability: 200 },
  374: { name: 'Báculo de viento', icon: 'staff', color: 'wind', spell: 'wind', mana: 4, durability: 300 },
  375: { name: 'Anillo de rapidez', icon: 'ring', color: 0xe0c23a, ring: 'speed', stack: 1 },
  376: { name: 'Anillo de visión nocturna', icon: 'ring', color: 0x6ab0ff, ring: 'night', stack: 1 },
  377: { name: 'Anillo de sigilo', icon: 'ring', color: 0x9a7ad8, ring: 'stealth', stack: 1 },
  378: { name: 'Poción de vida', icon: 'potion', color: 0xd83a3a, heal: 10 },
  379: { name: 'Poción de maná', icon: 'potion', color: 0x3a7ad8, manaPot: 20 },
  380: { name: 'Flor de luna', icon: 'flower' },
  381: { name: 'Espada de hierro', icon: 'sword', color: 'iron', weapon: 9, durability: 500 },
  382: { name: 'Espada élfica', icon: 'sword', color: 'elf', weapon: 11, durability: 800 },
  383: { name: 'Escudo de roble', icon: 'shield', color: 0x8a6a40, armor: 'body', def: 0.3, durability: 400 },
  384: { name: 'Lingote de mithril', icon: 'mithril_ingot' },
  385: { name: 'Manzana', icon: 'apple', food: 4 },
  386: { name: 'Tomo de hechizos', icon: 'tome', learn: 'magia' },
  387: { name: 'Cristal arcano', icon: 'crystal' },
  388: { name: 'Escama de dragón', icon: 'scale' },
  389: { name: 'Cota de mithril', icon: 'vest', color: 0xd8e8f0, armor: 'body', def: 0.55, radRes: 0.2, durability: 1200 },
  390: { name: 'Pico de mithril', icon: 'pick', color: 'mithril', tool: 'pick', tier: 3, speed: 11, durability: 1600 },
  391: { name: 'Hacha de mithril', icon: 'axe', color: 'mithril', tool: 'axe', tier: 3, speed: 11, durability: 1600, weapon: 9 },
  392: { name: 'Yelmo de escamas', icon: 'helmet', color: 0x7a3a2a, armor: 'head', def: 0.3, radRes: 0.3, durability: 900 },
  // v9.1
  393: { name: 'Dron compañero', icon: 'drone', stack: 1 },
  394: { name: 'Cohete de fuegos artificiales', icon: 'rocket', firework: true },
  395: { name: 'Huevo de Pascua', icon: 'egg', food: 3 },
  396: { name: 'Caramelo', icon: 'candy', food: 2 },
  397: { name: 'Regalo', icon: 'gift', gift: true },
  // v9.3: mares
  398: { name: 'Caña de pescar', icon: 'rod', rod: true, durability: 120 },
  399: { name: 'Pescado crudo', icon: 'fish', color: 0x8aa8c0, food: 2 },
  400: { name: 'Pescado asado', icon: 'fish', color: 0xc08a50, food: 7 },
  401: { name: 'Tanque de buceo', icon: 'tank', armor: 'head', def: 0.05, air: 9, durability: 600 },
  402: { name: 'Velero', icon: 'sailboat', vehicle: 'ship' },
  403: { name: 'Coco', icon: 'coconut', food: 3, thirst: 6 },
  404: { name: 'Pez dorado', icon: 'fish', color: 0xf0c040, food: 4 },
  // v10.9: construcción y decoración
  405: { name: 'Sierra de formas', icon: 'saw', saw: true, durability: 400 },
  406: { name: 'Maceta', icon: 'decor', decor: 0, color: 0xc0603a },
  407: { name: 'Farol', icon: 'decor', decor: 1, color: 0xf0e0a0 },
  408: { name: 'Mesa', icon: 'decor', decor: 2, color: 0x9a7040 },
  409: { name: 'Silla', icon: 'decor', decor: 3, color: 0x8a6036 },
  410: { name: 'Estante', icon: 'decor', decor: 4, color: 0x7a5a36 },
  411: { name: 'Barril', icon: 'decor', decor: 5, color: 0x6a4a2a },
  412: { name: 'Banco', icon: 'decor', decor: 6, color: 0x9a7040 },
  413: { name: 'Alfombra roja', icon: 'decor', decor: 7, color: 0xc83a3a },
  414: { name: 'Caja de madera', icon: 'decor', decor: 8, color: 0xa08050 },
  415: { name: 'Puesto de venta', icon: 'decor', decor: 9, color: 0xd84a3a },
};
// daño cuerpo a cuerpo de herramientas (sin arma dedicada)
for (const it of Object.values(ITEMS)) if (it.tool && !it.weapon) it.weapon = 1 + it.tier;

export const BLUEPRINT_NAMES = {
  ballesta: 'Ballesta y virotes', acero: 'Armadura de acero', hazmat: 'Traje antirradiación', electricidad: 'Electricidad', moto: 'Motos',
  cerveza: 'Cervecería', armas: 'Armas de fuego', autos: 'Autos y camiones', carrera: 'Auto de carrera', automatizacion: 'Automatización',
  destileria: 'Destilería', defensa: 'Defensa (torretas, sensores)', magia: 'Magia (báculos y anillos)',
  aviacion: 'Helicóptero', explosivos: 'Granadas, minas y lanzallamas', fontaneria: 'Cañerías, bombas y aspersores',
};

// Botín: [id, min, max, probabilidad]
export const LOOT_TABLES = {
  normal: [
    [273, 1, 2, 0.5], [258, 2, 4, 0.55], [257, 2, 5, 0.45], [26, 2, 4, 0.3], [274, 1, 1, 0.22],
    [260, 1, 2, 0.15], [256, 2, 4, 0.25], [259, 1, 1, 0.1], [281, 1, 3, 0.15], [285, 1, 2, 0.15],
    [300, 2, 5, 0.1], [306, 1, 1, 0.06], [307, 1, 1, 0.04], [308, 1, 1, 0.03], [309, 1, 1, 0.03],
    [310, 1, 1, 0.04], [311, 1, 1, 0.025], [295, 1, 3, 0.1],
  ],
  med: [[306, 1, 2, 0.7], [274, 1, 3, 0.7], [273, 1, 1, 0.3], [304, 1, 1, 0.12], [309, 1, 1, 0.15]],
  brew: [
    [291, 2, 4, 0.9], [295, 3, 6, 0.8], [281, 2, 4, 0.6], [283, 1, 2, 0.5], [287, 2, 4, 0.5],
    [277, 1, 1, 0.6], [279, 1, 1, 0.3], [315, 1, 1, 0.55], [296, 1, 2, 0.35], [297, 1, 1, 0.2],
  ],
  bunker: [[260, 2, 4, 0.5], [274, 1, 2, 0.5], [273, 2, 3, 0.6], [300, 4, 8, 0.3], [306, 1, 1, 0.3],
    [307, 1, 1, 0.12], [308, 1, 1, 0.12], [310, 1, 1, 0.15], [311, 1, 1, 0.1], [304, 1, 1, 0.1]],
  lab: [[330, 1, 2, 0.5], [306, 1, 2, 0.5], [274, 1, 3, 0.6], [332, 4, 10, 0.4], [261, 1, 3, 0.4], [346, 1, 1, 0.25],
    [349, 1, 1, 0.2], [351, 1, 1, 0.2], [309, 1, 1, 0.15], [337, 1, 1, 0.5]],
};
LOOT_TABLES.normal.push([337, 1, 1, 0.12], [330, 1, 1, 0.05], [331, 1, 2, 0.1], [332, 2, 6, 0.08], [338, 1, 1, 0.1], [339, 1, 1, 0.06],
  [346, 1, 1, 0.02], [347, 1, 1, 0.025], [349, 1, 1, 0.02], [350, 1, 1, 0.025], [351, 1, 1, 0.02], [328, 1, 1, 0.08], [336, 1, 2, 0.08]);
LOOT_TABLES.med.push([330, 1, 2, 0.5]);
LOOT_TABLES.normal.push([353, 1, 4, 0.25], [357, 3, 8, 0.12], [355, 1, 1, 0.06], [366, 1, 1, 0.01], [367, 1, 1, 0.02], [368, 1, 1, 0.025], [360, 1, 1, 0.03]);
LOOT_TABLES.lab.push([367, 1, 1, 0.2], [366, 1, 1, 0.08], [358, 1, 3, 0.3]);
LOOT_TABLES.eldra = [[353, 2, 8, 0.7], [387, 1, 3, 0.6], [380, 1, 3, 0.5], [385, 1, 4, 0.5], [378, 1, 2, 0.35], [379, 1, 2, 0.3], [386, 1, 1, 0.25], [381, 1, 1, 0.15], [384, 1, 2, 0.2], [375, 1, 1, 0.03], [376, 1, 1, 0.03], [377, 1, 1, 0.03]];
LOOT_TABLES.treasure = [[353, 10, 30, 1], [218, 1, 3, 0.6], [397, 1, 1, 0.3], [401, 1, 1, 0.25], [398, 1, 1, 0.3], [375, 1, 1, 0.05], [394, 2, 6, 0.4], [14, 2, 6, 0.3]];
LOOT_TABLES.military = [[332, 6, 14, 0.7], [358, 1, 3, 0.5], [333, 1, 1, 0.15], [334, 1, 1, 0.1], [302, 1, 1, 0.1], [367, 1, 1, 0.3], [366, 1, 1, 0.12], [339, 1, 2, 0.4], [306, 1, 1, 0.3]];
LOOT_TABLES.abyss = [[353, 3, 10, 0.8], [261, 1, 4, 0.6], [313, 1, 1, 0.15], [306, 1, 2, 0.5], [332, 5, 12, 0.5], [358, 1, 3, 0.4], [348, 1, 1, 0.05], [366, 1, 1, 0.08], [302, 1, 1, 0.1], [303, 1, 1, 0.1]];
LOOT_TABLES.brew.push([350, 1, 1, 0.3], [327, 1, 3, 0.2]);
export const LOOT = LOOT_TABLES.normal;

export const isBlock = (id) => id > 0 && (id < 256 || (id >= NEW_BLOCKS && id < MAXB));
// datos de un sector en 16 bits; los mundos guardados antes de la v12 (1 byte por bloque) se convierten solos
const VOX = CHUNK * CHUNK * HEIGHT;
export function toVox(d) {
  if (!d) return null;
  if (d instanceof Uint16Array) return d;
  const u8 = d instanceof Uint8Array ? d : d instanceof ArrayBuffer ? new Uint8Array(d) : ArrayBuffer.isView(d) ? new Uint8Array(d.buffer, d.byteOffset, d.byteLength) : null;
  if (!u8) return null;
  if (u8.length === VOX) return Uint16Array.from(u8);
  if (u8.length === VOX * 2) return new Uint16Array(u8.slice().buffer);
  return null;
}
export const voxBytes = (v) => new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
export const TORCHES = new Set([26, 34, 35, 36, 37]);
export const wallTorchFor = (dx, dz) => BLOCKS.find((b) => b?.wall && b.wall[0] === dx && b.wall[1] === dz)?.id;
export const ladderFor = (dx, dz) => BLOCKS.find((b) => b?.ladder && b.ladder[0] === dx && b.ladder[1] === dz)?.id;
export const doorId = (open, axis, top, base = 65) => base + open * 4 + (axis === 'z' ? 2 : 0) + top;
export const itemName = (id) => (isBlock(id) ? B[id]?.name : ITEMS[id]?.name) ?? '?';
export const maxStack = (id) => (ITEMS[id]?.durability || ITEMS[id]?.stack === 1 ? 1 : ITEMS[id]?.stack ?? 64);
// bloques que se prenden fuego (madera, plantas, tela)
export const FLAMMABLE = new Uint8Array(MAXB);
for (let i = 1; i < B.length; i++) { const b = B[i]; if (b && !b.container && !b.station && !b.marker && !b.loot && !LIQ[i] && (b.tool === 'axe' || /hoja|tela|cortina|paja|cebada|lúpulo|pasto|hongo|papa/i.test(b.name))) FLAMMABLE[i] = 1; }
{
  const C = { 28: 1, 21: 1, 217: 2, 208: 3, 219: 3, 55: 5, 221: 7, 74: 7, 140: 4, 241: 4, 138: 4, 238: 0, 159: 1 };
  for (const [id, c] of Object.entries(C)) LCOL[+id] = c;
  for (let i = 1; i < B.length; i++) { const bl = B[i]; if (!bl?.light || LCOL[i]) continue; if (/hongo|seta/i.test(bl.name || '')) LCOL[i] = 6; else if (/portal/i.test(bl.name || '')) LCOL[i] = 2; }
}
export const PLACEABLE = (id) => isBlock(id) && id !== 1 && !LIQ[id] && !B[id]?.crop;

// ---------- Recetas ----------
// station: null (a mano) | 'mesa' | 'horno' ; bp: plano necesario
export const RECIPES = [
  { out: [23, 4], in: [[15, 1]], station: null },
  { out: [256, 4], in: [[23, 2]], station: null },
  { out: [24, 1], in: [[23, 4]], station: null },
  { out: [26, 4], in: [[256, 1], [257, 1]], station: null },
  { out: [262, 1], in: [[23, 3], [256, 2]], station: 'mesa' },
  { out: [263, 1], in: [[23, 3], [256, 2]], station: 'mesa' },
  { out: [264, 1], in: [[23, 1], [256, 2]], station: 'mesa' },
  { out: [25, 1], in: [[2, 8]], station: 'mesa' },
  { out: [33, 1], in: [[23, 3], [256, 3]], station: 'mesa' },
  { out: [38, 1], in: [[23, 8]], station: 'mesa' },
  { out: [275, 1], in: [[23, 2], [258, 2]], station: 'mesa' },
  { out: [265, 1], in: [[258, 3], [256, 2]], station: 'mesa' },
  { out: [266, 1], in: [[258, 3], [256, 2]], station: 'mesa' },
  { out: [267, 1], in: [[258, 1], [256, 2]], station: 'mesa' },
  { out: [301, 1], in: [[258, 8]], station: 'mesa' },
  { out: [305, 1], in: [[258, 5]], station: 'mesa' },
  { out: [304, 1], in: [[257, 2], [14, 1], [258, 2]], station: 'mesa' },
  { out: [61, 3], in: [[256, 7]], station: 'mesa' },
  { out: [65, 1], in: [[258, 6]], station: 'mesa' },
  { out: [59, 6], in: [[9, 3]], station: 'mesa' },
  { out: [60, 6], in: [[23, 3]], station: 'mesa' },
  { out: [9, 4], in: [[8, 2], [6, 2]], station: 'mesa' },
  // v12.1: materiales
  { out: [1036, 4], in: [[229, 4]], station: 'horno' },
  { out: [1037, 4], in: [[6, 4], [8, 1]], station: 'horno' },
  { out: [1038, 4], in: [[2, 4]], station: 'mesa' },
  { out: [1039, 2], in: [[1038, 2]], station: 'mesa' },
  { out: [1040, 4], in: [[3, 4]], station: 'mesa' },
  { out: [1041, 4], in: [[1040, 4]], station: 'mesa' },
  { out: [1042, 2], in: [[1040, 2]], station: 'mesa' },
  { out: [1043, 4], in: [[1036, 4]], station: 'mesa' },
  { out: [1044, 4], in: [[1043, 4]], station: 'mesa' },
  { out: [1045, 2], in: [[1043, 2]], station: 'mesa' },
  { out: [1046, 4], in: [[205, 4]], station: 'mesa' },
  { out: [1047, 4], in: [[1046, 4]], station: 'mesa' },
  { out: [1048, 2], in: [[1046, 2]], station: 'mesa' },
  { out: [1049, 4], in: [[1037, 4]], station: 'mesa' },
  { out: [1050, 4], in: [[1049, 4]], station: 'mesa' },
  { out: [1051, 2], in: [[1049, 2]], station: 'mesa' },
  { out: [1052, 4], in: [[14, 4], [230, 1]], station: 'horno' },
  { out: [1053, 4], in: [[14, 4], [147, 1]], station: 'horno' },
  { out: [1054, 4], in: [[14, 4], [231, 1]], station: 'horno' },
  { out: [1055, 4], in: [[14, 4], [83, 1]], station: 'horno' },
  { out: [1056, 4], in: [[14, 4], [18, 1], [6, 1]], station: 'horno' },
  { out: [1057, 4], in: [[14, 4], [202, 1]], station: 'horno' },
  { out: [1058, 4], in: [[222, 1]], station: null },
  { out: [1059, 4], in: [[232, 1]], station: null },
  { out: [1060, 4], in: [[23, 4], [256, 2]], station: 'mesa' },
  { out: [1061, 4], in: [[1058, 4], [256, 2]], station: 'mesa' },
  { out: [1062, 4], in: [[1059, 4], [256, 2]], station: 'mesa' },
  { out: [1063, 4], in: [[209, 4], [256, 2]], station: 'mesa' },
  { out: [1064, 1], in: [[23, 6]], station: 'mesa' },
  { out: [1072, 1], in: [[1058, 6]], station: 'mesa' },
  { out: [1080, 1], in: [[1059, 6]], station: 'mesa' },
  { out: [1088, 1], in: [[209, 6]], station: 'mesa' },
  { out: [1097, 4], in: [[83, 4], [8, 1]], station: 'mesa' },
  { out: [1096, 2], in: [[13, 2], [30, 1]], station: 'mesa' },
  { out: [1098, 1], in: [[12, 2]], station: 'mesa' },
  { out: [1099, 2], in: [[187, 2]], station: 'mesa' },
  { out: [1100, 2], in: [[75, 2]], station: null },
  { out: [1101, 2], in: [[14, 2]], station: null },
  ...[1024, 1025, 1026, 1027, 1028, 1029, 1030, 1031, 1032, 1033, 1034, 1035].map((c) => ({ out: [c, 8], in: [[9, 8], [353, 1]], station: 'mesa' })),
  { out: [32, 2], in: [[6, 2], [4, 2]], station: 'mesa' },
  { out: [277, 1], in: [[260, 3]], station: 'mesa' },
  { out: [277, 1], in: [[258, 5]], station: 'mesa' },
  { out: [300, 2], in: [[256, 1], [258, 1]], station: 'mesa' },
  { out: [300, 4], in: [[256, 1], [258, 1], [314, 1]], station: 'mesa' },
  { out: [260, 1], in: [[258, 2], [257, 1]], station: 'horno' },
  { out: [259, 1], in: [[20, 1], [257, 1]], station: 'horno' },
  { out: [257, 2], in: [[15, 1]], station: 'horno' },
  { out: [14, 2], in: [[6, 2], [257, 1]], station: 'horno' },
  { out: [13, 4], in: [[7, 4], [257, 1]], station: 'horno' },
  { out: [272, 2], in: [[271, 2], [257, 1]], station: 'horno' },
  { out: [286, 2], in: [[285, 2], [257, 1]], station: 'horno' },
  { out: [279, 1], in: [[278, 1], [257, 1]], station: 'horno' },
  { out: [295, 3], in: [[14, 3]], station: 'horno' },
  { out: [287, 1], in: [[282, 2]], station: 'horno' },
  { out: [288, 1], in: [[287, 1]], station: 'horno' },
  { out: [268, 1], in: [[260, 3], [256, 2]], station: 'mesa' },
  { out: [269, 1], in: [[260, 3], [256, 2]], station: 'mesa' },
  { out: [270, 1], in: [[260, 1], [256, 2]], station: 'mesa' },
  { out: [276, 1], in: [[260, 2], [256, 1]], station: 'mesa' },
  { out: [274, 1], in: [[259, 1], [257, 2]], station: 'mesa' },
  { out: [27, 1], in: [[260, 4]], station: 'mesa' },
  { out: [12, 2], in: [[258, 4]], station: 'mesa' },
  { out: [28, 1], in: [[261, 1], [14, 1], [259, 1]], station: 'mesa' },
  // con plano
  { out: [299, 1], in: [[23, 3], [260, 2], [256, 2]], station: 'mesa', bp: 'ballesta' },
  { out: [302, 1], in: [[260, 8]], station: 'mesa', bp: 'acero' },
  { out: [303, 1], in: [[259, 4], [260, 3], [14, 2]], station: 'mesa', bp: 'hazmat' },
  { out: [76, 1], in: [[260, 6], [259, 2], [25, 1]], station: 'mesa', bp: 'electricidad' },
  { out: [75, 8], in: [[259, 1]], station: 'mesa', bp: 'electricidad' },
  { out: [73, 1], in: [[14, 1], [259, 1]], station: 'mesa', bp: 'electricidad' },
  { out: [77, 1], in: [[14, 3], [259, 2], [260, 1]], station: 'mesa', bp: 'electricidad' },
  { out: [78, 4], in: [[260, 2], [259, 2]], station: 'mesa', bp: 'electricidad' },
  { out: [312, 1], in: [[260, 6], [258, 4], [259, 2]], station: 'mesa', bp: 'moto' },
  { out: [79, 1], in: [[2, 4], [23, 2], [260, 1]], station: 'mesa', bp: 'cerveza' },
  { out: [80, 1], in: [[259, 6], [25, 1]], station: 'mesa', bp: 'cerveza' },
  { out: [81, 1], in: [[23, 6], [260, 2], [14, 1]], station: 'mesa', bp: 'cerveza' },
  // v5
  { out: [104, 1], in: [[23, 6], [260, 1]], station: 'mesa', bp: 'cerveza' },
  { out: [105, 1], in: [[23, 4], [259, 2], [295, 2]], station: 'mesa', bp: 'cerveza' },
  { out: [106, 2], in: [[23, 4]], station: 'mesa' },
  { out: [175, 1], in: [[23, 2], [256, 1]], station: 'mesa' },
  { out: [109, 1], in: [[260, 4], [259, 2], [14, 1]], station: 'mesa', bp: 'electricidad' },
  { out: [107, 1], in: [[259, 5], [14, 2], [25, 1]], station: 'mesa', bp: 'destileria' },
  { out: [108, 1], in: [[15, 2], [2, 3]], station: null },
  { out: [324, 2], in: [[271, 2], [285, 2], [279, 1]], station: 'fogata' },
  { out: [325, 2], in: [[282, 3]], station: 'fogata' },
  { out: [326, 2], in: [[327, 3], [279, 1]], station: 'fogata' },
  { out: [272, 2], in: [[271, 2]], station: 'fogata' },
  { out: [286, 2], in: [[285, 2]], station: 'fogata' },
  { out: [328, 1], in: [[260, 1], [336, 1]], station: 'mesa' },
  { out: [335, 1], in: [[336, 6]], station: 'mesa' },
  { out: [176, 2], in: [[336, 2]], station: 'mesa' },
  { out: [126, 2], in: [[176, 2]], station: 'mesa' },
  { out: [110, 1], in: [[23, 4]], station: 'mesa' },
  { out: [111, 2], in: [[23, 3], [256, 2]], station: 'mesa' },
  { out: [115, 1], in: [[23, 4], [337, 1]], station: 'mesa' },
  { out: [116, 1], in: [[256, 2], [176, 1]], station: 'mesa' },
  { out: [120, 4], in: [[14, 4], [18, 1]], station: 'horno' },
  { out: [121, 4], in: [[14, 4], [22, 1]], station: 'horno' },
  { out: [122, 4], in: [[14, 4], [259, 1]], station: 'horno' },
  { out: [123, 4], in: [[14, 4], [282, 1]], station: 'horno' },
  { out: [124, 4], in: [[14, 4], [327, 1]], station: 'horno' },
  { out: [125, 4], in: [[14, 4], [20, 1]], station: 'horno' },
  { out: [161, 4], in: [[9, 6]], station: 'mesa' },
  { out: [165, 4], in: [[23, 6]], station: 'mesa' },
  { out: [169, 4], in: [[13, 6]], station: 'mesa' },
  { out: [173, 6], in: [[13, 3]], station: 'mesa' },
  { out: [174, 6], in: [[2, 3]], station: 'mesa' },
  { out: [142, 1], in: [[261, 1], [27, 2], [28, 1]], station: 'mesa' },
  { out: [338, 1], in: [[260, 2]], station: 'mesa' },
  { out: [331, 2], in: [[257, 2], [6, 1]], station: 'mesa' },
  { out: [332, 4], in: [[258, 1], [331, 1]], station: 'mesa', bp: 'armas' },
  { out: [333, 1], in: [[260, 3], [258, 2], [23, 1]], station: 'mesa', bp: 'armas' },
  { out: [334, 1], in: [[260, 5], [23, 2]], station: 'mesa', bp: 'armas' },
  { out: [330, 2], in: [[327, 2], [323, 1]], station: 'mesa', bp: 'destileria' },
  { out: [130, 4], in: [[260, 1], [336, 2]], station: 'mesa', bp: 'automatizacion' },
  { out: [134, 1], in: [[260, 5], [38, 1]], station: 'mesa', bp: 'automatizacion' },
  { out: [135, 1], in: [[256, 1], [2, 1], [259, 1]], station: 'mesa', bp: 'automatizacion' },
  { out: [137, 1], in: [[259, 2], [14, 1], [261, 1]], station: 'mesa', bp: 'defensa' },
  { out: [139, 1], in: [[259, 2], [260, 1]], station: 'mesa', bp: 'defensa' },
  { out: [141, 1], in: [[260, 6], [259, 3], [332, 8]], station: 'mesa', bp: 'defensa' },
  { out: [160, 2], in: [[260, 2]], station: 'mesa', bp: 'defensa' },
  { out: [342, 1], in: [[260, 5], [258, 4], [259, 2]], station: 'mesa', bp: 'moto' },
  { out: [340, 1], in: [[260, 10], [258, 8], [259, 3], [14, 2]], station: 'mesa', bp: 'autos' },
  { out: [341, 1], in: [[260, 16], [258, 12], [259, 4], [14, 2]], station: 'mesa', bp: 'autos' },
  { out: [345, 1], in: [[23, 8], [260, 1]], station: 'mesa' },
  { out: [343, 1], in: [[260, 6], [259, 3], [313, 1]], station: 'mesa', bp: 'carrera' },
  { out: [344, 1], in: [[260, 12], [259, 6], [313, 1], [14, 2]], station: 'mesa', bp: 'carrera' },
  // v6
  { out: [179, 1], in: [[260, 6], [2, 4]], station: 'mesa' },
  { out: [353, 1], in: [[258, 3]], station: 'prensa' },
  { out: [353, 4], in: [[259, 1]], station: 'prensa' },
  { out: [353, 8], in: [[260, 1]], station: 'prensa' },
  { out: [183, 1], in: [[260, 8], [259, 4], [24, 1]], station: 'mesa', bp: 'autos' },
  { out: [184, 4], in: [[256, 4], [176, 2]], station: 'mesa' },
  { out: [185, 1], in: [[256, 2], [176, 2], [260, 1]], station: 'mesa' },
  { out: [186, 4], in: [[176, 1], [258, 2]], station: 'mesa' },
  { out: [101, 8], in: [[260, 2], [23, 2]], station: 'mesa' },
  { out: [365, 1], in: [[260, 5], [258, 3]], station: 'mesa' },
  { out: [190, 1], in: [[260, 6], [259, 2], [27, 1]], station: 'mesa', bp: 'electricidad' },
  { out: [191, 2], in: [[23, 2], [256, 1]], station: null },
  { out: [355, 1], in: [[260, 1], [257, 1]], station: 'mesa' },
  { out: [356, 1], in: [[256, 3], [336, 2]], station: 'mesa' },
  { out: [357, 6], in: [[256, 2], [2, 1]], station: 'mesa' },
  { out: [357, 10], in: [[256, 2], [2, 1], [314, 1]], station: 'mesa' },
  { out: [360, 1], in: [[336, 4], [260, 1]], station: 'mesa' },
  { out: [361, 1], in: [[259, 1], [176, 1]], station: 'mesa' },
  { out: [362, 1], in: [[176, 2], [257, 1]], station: 'mesa' },
  { out: [358, 2], in: [[260, 1], [331, 2]], station: 'mesa', bp: 'explosivos' },
  { out: [369, 2], in: [[260, 1], [331, 3], [258, 1]], station: 'mesa', bp: 'explosivos' },
  { out: [359, 1], in: [[260, 6], [259, 3], [355, 1]], station: 'mesa', bp: 'explosivos' },
  { out: [187, 8], in: [[259, 1], [260, 1]], station: 'mesa', bp: 'fontaneria' },
  { out: [188, 1], in: [[260, 4], [259, 3], [14, 1]], station: 'mesa', bp: 'fontaneria' },
  { out: [189, 2], in: [[259, 2]], station: 'mesa', bp: 'fontaneria' },
  { out: [364, 1], in: [[260, 20], [259, 8], [313, 2], [14, 4]], station: 'mesa', bp: 'aviacion' },
  { out: [192, 4], in: [[6, 2], [7, 2]], station: null },
  { out: [354, 1], in: [[23, 4], [258, 2]], station: 'mesa' },
  // v9: Eldra
  { out: [210, 4], in: [[2, 4]], station: 'mesa' },
  { out: [212, 4], in: [[282, 4]], station: null },
  { out: [209, 4], in: [[207, 1]], station: null },
  { out: [220, 1], in: [[209, 4], [387, 1], [327, 1]], station: 'mesa' },
  { out: [219, 1], in: [[210, 6], [387, 3]], station: 'mesa' },
  { out: [381, 1], in: [[260, 2], [256, 1]], station: 'mesa' },
  { out: [383, 1], in: [[23, 6], [260, 1]], station: 'mesa' },
  { out: [384, 1], in: [[216, 1], [257, 1]], station: 'horno' },
  { out: [390, 1], in: [[384, 3], [209, 2]], station: 'mesa' },
  { out: [391, 1], in: [[384, 3], [209, 2]], station: 'mesa' },
  { out: [389, 1], in: [[384, 8]], station: 'mesa' },
  { out: [392, 1], in: [[388, 5], [384, 1]], station: 'mesa' },
  { out: [393, 1], in: [[260, 4], [259, 4], [14, 1]], station: 'mesa', bp: 'electricidad' },
  { out: [227, 1], in: [[260, 4], [28, 1], [27, 2]], station: 'mesa' },
  { out: [398, 1], in: [[256, 3], [336, 1]], station: 'mesa' },
  { out: [234, 1], in: [[23, 4], [353, 2]], station: 'mesa' },
  { out: [240, 2], in: [[2, 1], [259, 1]], station: 'mesa' },
  { out: [242, 2], in: [[27, 1], [259, 1]], station: 'mesa' },
  { out: [244, 1], in: [[259, 2], [260, 1], [257, 2]], station: 'mesa', bp: 'electricidad' },
  { out: [245, 1], in: [[23, 4], [259, 1]], station: 'mesa' },
  { out: [246, 1], in: [[23, 4], [259, 2], [260, 1]], station: 'mesa' },
  { out: [247, 2], in: [[23, 2], [176, 1]], station: 'mesa' },
  { out: [249, 1], in: [[239, 2], [353, 1]], station: 'mesa' },
  { out: [250, 2], in: [[237, 2], [239, 1]], station: 'mesa' },
  { out: [251, 2], in: [[238, 1], [353, 2]], station: 'mesa' },
  { out: [252, 1], in: [[238, 2], [239, 2]], station: 'mesa' },
  { out: [238, 4], in: [[353, 3], [9, 2]], station: 'mesa' },
  { out: [253, 1], in: [[38, 1], [353, 1]], station: 'mesa' },
  { out: [405, 1], in: [[260, 2], [23, 1]], station: 'mesa' },
  { out: [406, 1], in: [[13, 2], [248, 1]], station: 'mesa' },
  { out: [407, 2], in: [[27, 1], [14, 1], [26, 1]], station: 'mesa' },
  { out: [408, 1], in: [[23, 4]], station: 'mesa' },
  { out: [409, 2], in: [[23, 3]], station: 'mesa' },
  { out: [410, 1], in: [[23, 6]], station: 'mesa' },
  { out: [411, 1], in: [[23, 4], [258, 1]], station: 'mesa' },
  { out: [412, 1], in: [[23, 3]], station: 'mesa' },
  { out: [413, 4], in: [[176, 2], [236, 1]], station: 'mesa' },
  { out: [414, 1], in: [[23, 4], [256, 2]], station: 'mesa' },
  { out: [415, 1], in: [[23, 6], [176, 2], [353, 3]], station: 'mesa' },
  { out: [236, 8], in: [[176, 1], [23, 2]], station: 'mesa' },
  { out: [237, 8], in: [[176, 1], [9, 2]], station: 'mesa' },
  { out: [239, 8], in: [[9, 4]], station: 'mesa' },
  { out: [400, 1], in: [[399, 1], [257, 1]], station: 'horno' },
  { out: [400, 1], in: [[399, 1]], station: 'fogata' },
  { out: [401, 1], in: [[260, 3], [14, 1], [336, 2]], station: 'mesa' },
  { out: [402, 1], in: [[23, 16], [336, 4], [260, 2]], station: 'mesa' },
  { out: [394, 4], in: [[257, 2], [259, 1]], station: 'mesa' },
  { out: [370, 1], in: [[209, 2], [387, 1], [327, 2]], station: 'runas', bp: 'magia' },
  { out: [371, 1], in: [[209, 2], [387, 2], [257, 3]], station: 'runas', bp: 'magia' },
  { out: [372, 1], in: [[209, 2], [387, 2], [380, 3]], station: 'runas', bp: 'magia' },
  { out: [373, 1], in: [[209, 2], [387, 3], [384, 1]], station: 'runas', bp: 'magia' },
  { out: [374, 1], in: [[209, 2], [387, 2], [314, 3]], station: 'runas', bp: 'magia' },
  { out: [375, 1], in: [[384, 1], [387, 2], [218, 1]], station: 'runas', bp: 'magia' },
  { out: [376, 1], in: [[384, 1], [387, 2], [327, 4]], station: 'runas', bp: 'magia' },
  { out: [377, 1], in: [[384, 1], [387, 2], [215, 3]], station: 'runas', bp: 'magia' },
  { out: [378, 2], in: [[380, 2], [385, 1], [329, 1]], station: 'alquimia' },
  { out: [379, 2], in: [[380, 1], [387, 1], [329, 1]], station: 'alquimia' },
  { out: [180, 1], in: [[260, 8], [259, 2], [27, 2]], station: 'mesa' },
];
