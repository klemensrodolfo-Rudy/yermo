// Logros: se desbloquean con eventos del juego.
export const ACHIEVEMENTS = [
  { id: 'lenador', name: 'Leñador', desc: 'Talá tu primer tronco.' },
  { id: 'pico', name: 'Manos a la obra', desc: 'Fabricá un pico.' },
  { id: 'luz', name: 'Luz en la oscuridad', desc: 'Colocá una antorcha.' },
  { id: 'noche', name: 'Sobreviviente', desc: 'Sobreviví a tu primera noche.' },
  { id: 'semana', name: 'Una semana en el yermo', desc: 'Sobreviví 7 noches.' },
  { id: 'cazador', name: 'Cazador', desc: 'Eliminá un necrófago.' },
  { id: 'behemot', name: 'Mata-Behemot', desc: 'Derrotá al Behemot del cráter.' },
  { id: 'zonacero', name: 'Zona cero', desc: 'Entrá a un cráter radiactivo.' },
  { id: 'profundo', name: 'Las profundidades', desc: 'Bajá por debajo de la altura 12.' },
  { id: 'carronero', name: 'Carroñero', desc: 'Abrí una caja de suministros.' },
  { id: 'granjero', name: 'Granjero', desc: 'Sembrá algo.' },
  { id: 'cosecha', name: 'Buena cosecha', desc: 'Cosechá un cultivo maduro.' },
  { id: 'acaparador', name: 'Acaparador', desc: 'Colocá un cofre.' },
  { id: 'blindado', name: 'Blindado', desc: 'Equipá una armadura.' },
  { id: 'francotirador', name: 'Francotirador', desc: 'Acertale a una criatura con la ballesta.' },
  { id: 'electricista', name: 'Electricista', desc: 'Encendé un foco eléctrico.' },
  { id: 'easyrider', name: 'Easy Rider', desc: 'Manejá una moto.' },
  { id: 'estudioso', name: 'Estudioso', desc: 'Aprendé un plano.' },
  { id: 'cervecero', name: 'Maestro cervecero', desc: 'Tomá una cerveza hecha por vos.' },
  { id: 'fiesta', name: 'Fiesta en el yermo', desc: 'Tomá 3 cervezas seguidas.' },
  { id: 'valle', name: 'Tierra prometida', desc: 'Encontrá el valle cervecero.' },
  { id: 'horda', name: 'Resistencia', desc: 'Sobreviví a una horda.' },
  { id: 'tabernero', name: 'Tabernero', desc: 'Vendé cerveza a un comerciante.' },
  { id: 'reserva', name: 'Gran Reserva', desc: 'Tomá una cerveza de ★★★★★.' },
  { id: 'piloto', name: 'Piloto', desc: 'Ganale una carrera al instructor.' },
  { id: 'leyenda', name: 'Leyenda del asfalto', desc: 'Ganale al instructor en modo Leyenda.' },
  { id: 'mascota', name: 'El mejor amigo', desc: 'Domesticá un perro del yermo.' },
  { id: 'misiones', name: 'Vecino ejemplar', desc: 'Completá una misión de un asentamiento.' },
  { id: 'fotografo', name: 'Fotógrafo del fin del mundo', desc: 'Sacá una foto en el modo foto.' },
  { id: 'lector', name: 'Historiador', desc: 'Leé 5 notas distintas.' },
  { id: 'reina', name: 'Regicida', desc: 'Derrotá a la Reina de las ratas.' },
  { id: 'leviatan', name: 'Cazador de monstruos', desc: 'Derrotá al Leviatán tóxico.' },
  { id: 'alfa', name: 'Apagón', desc: 'Derrotá al Mutante alfa del laboratorio.' },
  { id: 'nafta', name: 'Lleno, por favor', desc: 'Cargale combustible a un vehículo.' },
  // v6
  { id: 'campana', name: 'La fuente', desc: 'Terminá la historia principal.' },
  { id: 'abismo', name: 'Al otro lado', desc: 'Cruzá un portal al Abismo.' },
  { id: 'abismo5', name: 'Sin fondo', desc: 'Llegá al nivel 5 del Abismo.' },
  { id: 'guardian', name: 'Guardián caído', desc: 'Derrotá al Guardián del abismo.' },
  { id: 'campeon', name: 'Campeón del yermo', desc: 'Ganá el campeonato de 5 fechas.' },
  { id: 'concurso', name: 'La mejor birra', desc: 'Ganá el concurso cervecero.' },
  { id: 'etiqueta', name: 'Cerveza de autor', desc: 'Ponele nombre a una cerveza.' },
  { id: 'banco', name: 'Ahorrista', desc: 'Depositá fichas en el banco.' },
  { id: 'empleado', name: 'Patrón', desc: 'Contratá a un empleado.' },
  { id: 'ruta', name: 'Ruta comercial', desc: 'Establecé una ruta comercial.' },
  { id: 'diario', name: 'Constancia', desc: 'Completá los 3 desafíos de un día.' },
  { id: 'asalto', name: 'Defensor', desc: 'Rechazá un asalto de bandidos.' },
  { id: 'montura', name: 'Jinete del yermo', desc: 'Ensillá un animal domesticado.' },
  { id: 'heli', name: 'Por los aires', desc: 'Volá en helicóptero.' },
  { id: 'tuning', name: 'Tuerca', desc: 'Mejorá un vehículo en el taller.' },
  { id: 'plano', name: 'Arquitecto', desc: 'Guardá un diseño con el plano de obra.' },
  { id: 'brindis', name: '¡Salud!', desc: 'Brindá con una cerveza en la mano (gesto).' },
  // v8
  { id: 'bioparque', name: 'Entrada libre', desc: 'Entrá a un bioparque abandonado.' },
  { id: 'elefante', name: 'Sobre la trompa', desc: 'Ensillá un elefante.' },
  { id: 'safari', name: 'Safari', desc: 'Encontrate con 10 especies distintas de animales.' },
];

export class Achievements {
  constructor(meta, onUnlock) {
    this.meta = meta;
    meta.achievements = meta.achievements || {};
    this.got = meta.achievements;
    this.onUnlock = onUnlock;
    meta.nights = meta.nights || 0;
  }
  unlock(id) {
    if (this.got[id]) return;
    this.got[id] = Date.now();
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (a) this.onUnlock(a);
  }
  event(name, id, p) {
    const u = (x) => this.unlock(x);
    if (name === 'break' && id === 15) u('lenador');
    if (name === 'craft' && [262, 265, 268].includes(id)) u('pico');
    if (name === 'place' && id === 26) u('luz');
    if (name === 'place' && id === 38) u('acaparador');
    if (name === 'kill' && id === 'ghoul') u('cazador');
    if (name === 'kill' && id === 'behemoth') u('behemot');
    if (name === 'loot') u('carronero');
    if (name === 'plant') u('granjero');
    if (name === 'harvest') u('cosecha');
    if (name === 'equip') u('blindado');
    if (name === 'shotHit') u('francotirador');
    if (name === 'ride') u('easyrider');
    if (name === 'learn') u('estudioso');
    if (name === 'power') u('electricista');
    if (name === 'drink') { u('cervecero'); if (p && p.drunk >= 3) u('fiesta'); }
    if (name === 'biome' && id === 4) u('zonacero');
    if (name === 'biome' && id === 5) u('valle');
    if (name === 'biome' && id === 12) u('bioparque');
    if (name === 'seen') { this.meta.seen = this.meta.seen || []; if (!this.meta.seen.includes(id)) { this.meta.seen.push(id); if (this.meta.seen.length >= 10) u('safari'); } }
    if (name === 'depth') u('profundo');
    if (name === 'hordeSurvived') u('horda');
    if (name === 'sellBeer') u('tabernero');
    if (name === 'drink' && p?.lastQ >= 5) u('reserva');
    if (name === 'raceWin') { u('piloto'); if (id === 'leyenda') u('leyenda'); }
    if (name === 'tame') u('mascota');
    if (name === 'quest') u('misiones');
    if (name === 'photo') u('fotografo');
    if (name === 'note' && id >= 5) u('lector');
    if (name === 'kill' && id === 'ratqueen') u('reina');
    if (name === 'kill' && id === 'leviathan') u('leviatan');
    if (name === 'kill' && id === 'alpha') u('alfa');
    if (name === 'refuel') u('nafta');
    if (name === 'v6') u(id === 'guardian' ? 'guardian' : id);
    if (name === 'champion') u('campeon');
    if (name === 'dawn') { this.meta.nights++; u('noche'); if (this.meta.nights >= 7) u('semana'); }
  }
  count() { return Object.keys(this.got).length; }
}
