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
  // v9
  { id: 'hechicero', name: 'Aprendiz de hechicero', desc: 'Lanzá tu primer hechizo con un báculo.' },
  { id: 'troll', name: 'Amanecer', desc: 'Mirá cómo un troll se vuelve piedra con el sol.' },
  { id: 'dragon', name: 'Matadragones', desc: 'Derrotá al Dragón de Brasa.' },
  { id: 'ent', name: 'Leñador arrepentido', desc: 'Derrotá a un Ent enojado.' },
  { id: 'dron', name: 'Copiloto', desc: 'Desplegá un dron compañero.' },
  { id: 'cohete', name: '¡Que empiece la fiesta!', desc: 'Lanzá un cohete de fuegos artificiales.' },
  { id: 'defensa', name: 'Muralla', desc: 'Resistí las 10 oleadas de la defensa del refugio.' },
  { id: 'unavida', name: 'Sin segundas oportunidades', desc: 'Terminá una partida de una sola vida.' },
  { id: 'pescador', name: 'Paciencia de pescador', desc: 'Pescá algo con la caña.' },
  { id: 'pezdorado', name: 'Pez dorado', desc: 'Pescá un pez dorado.' },
  { id: 'minijuego', name: 'Campeón del recreo', desc: 'Ganá un minijuego.' },
  { id: 'musico', name: 'Compositor', desc: 'Guardá una melodía en una caja musical.' },
  { id: 'pintor', name: 'Artista del yermo', desc: 'Pintá un cuadro en un lienzo.' },
  { id: 'arbol', name: 'Reverdecer', desc: 'Hacé crecer un árbol desde un plantín.' },
  { id: 'cria', name: 'La familia crece', desc: 'Lográ que nazca una cría.' },
  { id: 'mejoramigo', name: 'Mejores amigos', desc: 'Llevá a tu mascota al nivel 5.' },
  { id: 'aventura', name: 'Aventurero', desc: 'Terminá una aventura de la comunidad.' },
  { id: 'autor', name: 'Creador de mundos', desc: 'Publicá tu propia aventura.' },
  { id: 'alumno', name: 'Buen alumno', desc: 'Subí de nivel con el Profe Robi.' },
  { id: 'perfecto', name: '¡Diez felicitado!', desc: 'Acertá las 5 preguntas de un desafío a la primera.' },
  { id: 'acertijo', name: 'Cerrajero sabio', desc: 'Abrí un cofre con acertijo.' },
  { id: 'constructor', name: 'Maestro mayor de obras', desc: 'Terminá una construcción guiada.' },
  { id: 'marcador', name: 'Cartógrafo', desc: 'Poné tu primer marcador.' },
  { id: 'voz', name: 'A tus órdenes', desc: 'Hacé algo con el control por voz.' },
  { id: 'historia', name: 'Cronista', desc: 'Completá las 4 partes de una historia de una zona.' },
  { id: 'pueblo', name: 'Vecino querido', desc: 'Ayudá a que un pueblo crezca.' },
  { id: 'coleccion', name: 'Coleccionista', desc: 'Completá una página entera del libro.' },
  { id: 'semana', name: 'Semana perfecta', desc: 'Completá los 3 desafíos de una semana.' },
  { id: 'nivel', name: 'Experimentado', desc: 'Subí de nivel.' },
  { id: 'sierra', name: 'Carpintero fino', desc: 'Dale forma a un bloque con la sierra.' },
  { id: 'geiser', name: 'Despegue natural', desc: 'Dejate lanzar por un géiser.' },
  { id: 'cocinero', name: 'Cocinero del yermo', desc: 'Cociná una comida con efecto.' },
  { id: 'vitral', name: 'Vitralista', desc: 'Colocá un vitral de color.' },
  { id: 'molinero', name: 'Energía limpia', desc: 'Colocá un molino de viento.' },
  { id: 'obsidiana', name: 'Filo volcánico', desc: 'Fabricá una herramienta de obsidiana.' },
  { id: 'espeleo', name: 'Espeleólogo', desc: 'Encontrá un cristal de cueva.' },
  { id: 'galeria', name: 'Galería propia', desc: 'Colgá un cuadro con tu dibujo.' },
  { id: 'globo', name: 'Viento en la cara', desc: 'Volá en globo aerostático.' },
  { id: 'tesoro', name: 'Cazatesoros', desc: 'Encontrá el tesoro de un mapa.' },
  { id: 'pastor', name: 'Pastor del yermo', desc: 'Ordeñá una cabra domesticada.' },
  { id: 'cañones', name: 'Tierra roja', desc: 'Visitá los cañones rojos, el salar y el campo de géiseres.' },
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
    if (name === 'spell') u('hechicero');
    if (name === 'fish') u('pescador');
    if (name === 'v9' || name === 'v10' || name === 'v12') u(id);
    if (name === 'craft' && id >= 423 && id <= 428) u('cocinero');
    if (name === 'craft' && id >= 417 && id <= 420) u('obsidiana');
    if (name === 'milk') u('pastor');
    if (name === 'place' && ((id >= 120 && id <= 125) || (id >= 1052 && id <= 1057))) u('vitral');
    if (name === 'place' && id === 1121) u('molinero');
    if (name === 'break' && id === 1115) u('espeleo');
    if (name === 'biome' && (id === 20 || id === 21 || id === 22)) { this.meta.v12b = this.meta.v12b || []; if (!this.meta.v12b.includes(id)) this.meta.v12b.push(id); if (this.meta.v12b.length >= 3) u('cañones'); }
    if (name === 'kill' && id === 'dragon') u('dragon');
    if (name === 'kill' && id === 'ent') u('ent');
    if (name === 'v6') u(id === 'guardian' ? 'guardian' : id);
    if (name === 'champion') u('campeon');
    if (name === 'dawn') { this.meta.nights++; u('noche'); if (this.meta.nights >= 7) u('semana'); }
  }
  count() { return Object.keys(this.got).length; }
}
