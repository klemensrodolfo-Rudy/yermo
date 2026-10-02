// Guía de consulta (menú principal y pausa).
import { RECIPES, itemName, ITEMS, BLUEPRINT_NAMES } from './blocks.js';
import { PET_TRICKS } from './nature.js';
const PET_TRICKS_TXT = PET_TRICKS.slice(1).map((t, i) => `${i + 1}) ${t.toLowerCase()}`).join(', ');
import { MOB_TYPES } from './entities.js';
import { ACHIEVEMENTS } from './achievements.js';

const $ = (s) => document.querySelector(s);
const ST = { mesa: 'Mesa de trabajo', horno: 'Horno', fogata: 'Fogata', prensa: 'Prensa de fichas', taller: 'Taller mecánico', runas: 'Altar de runas', alquimia: 'Mesa de alquimia' };

export function setupGuide(ui, getGame) {
  const icon = (id) => `<img class="gi" src="${ui.icon(id).toDataURL()}" alt="">`;
  const tabs = {
    'Cómo se juega': () => `
      <p><b>Yermo</b> es un mundo abierto que se genera solo: cada bloque se puede romper y cada material sirve para fabricar algo. Sobreviví, armá un refugio, explorá ruinas y búnkeres… y fabricá tu propia cerveza.</p>
      <h3>Teclado y mouse</h3>
      <div class="keys">
        <kbd>W A S D</kbd><span>Moverse · <b>Shift</b> correr · <b>Espacio</b> saltar/nadar/trepar</span>
        <kbd>Clic izq.</kbd><span>Mantener para romper · golpear</span>
        <kbd>Clic der.</kbd><span>Colocar · comer/tomar · usar mesa, horno, cofre, máquina, puerta o catre · disparar la ballesta</span>
        <kbd>E</kbd><span>Mochila y fabricación</span>
        <kbd>Q</kbd><span>Tirar un ítem (<b>Ctrl+Q</b> toda la pila)</span>
        <kbd>F</kbd><span>Subir/bajar de un vehículo (o de acompañante) · <b>H</b> bocina · <b>L</b> faros</span>
        <kbd>V / F5</kbd><span>Cámara: primera persona, tercera persona o frontal</span>
        <kbd>F2</kbd><span>Modo foto (oculta la interfaz) · <b>P</b> saca la captura</span>
        <kbd>M</kbd><span>Mapa grande (el minimapa está siempre arriba a la derecha)</span>
        <kbd>J</kbd><span>Diario: historia principal, desafíos del día, facciones, cervezas, mundo y datos</span>
        <kbd>B</kbd><span>Gestos (saludar, brindar, bailar…)</span>
        <kbd>1–9 / rueda</kbd><span>Elegir ítem</span>
        <kbd>T</kbd><span>Chat en línea · <b>G</b> guardar · <b>F3</b> datos técnicos · <b>Esc</b> pausa</span>
      </div>
      <h3>Joystick</h3>
      <p>Stick izquierdo: moverse · derecho: mirar · <b>A</b> saltar · <b>RT</b> romper/golpear · <b>LT</b> colocar/usar · <b>X</b> mochila · <b>Y</b> mapa · <b>LB/RB</b> cambiar ítem · <b>L3</b> correr · <b>R3</b> moto · <b>Start</b> pausa.</p>
      <h3>Celular y tablet</h3>
      <p>Joystick virtual a la izquierda, deslizá la mitad derecha para mirar, y botones en pantalla para saltar, romper, usar, correr, mochila, mapa y moto. Tocá la barra de ítems para elegir.</p>
      <h3>Primeros pasos</h3>
      <ol><li>Talá árboles muertos → troncos.</li><li>Troncos → tablas → mesa de trabajo.</li><li>En la mesa: palos y pico de madera.</li><li>Picá roca y buscá carbón → antorchas.</li><li>Armá un refugio iluminado (con puerta y catre) antes de la noche.</li></ol>`,
    'Construir': () => `
      <p><b>Romper:</b> apuntá y <b>mantené el clic izquierdo</b>. Lo que rompés va a la mochila; si está llena, cae al piso.</p>
      <p><b>Herramientas:</b> pico para roca, metal y minerales; hacha para madera; pala para tierra, ceniza, grava y lodo. Niveles: madera → chatarra → acero. El cobre pide pico de chatarra; el uranio, de acero.</p>
      <p><b>Colocar:</b> elegí un bloque y hacé clic derecho sobre la cara donde lo quieras pegar.</p>
      <ul>
        <li>${icon(26)} <b>Antorchas</b> y ${icon(61)} <b>escaleras de mano</b>: en paredes; las escaleras se trepan con W o Espacio.</li>
        <li>${icon(65)} <b>Puertas</b>: ocupan dos bloques; clic derecho para abrir/cerrar.</li>
        <li>${icon(59)} <b>Losas</b>: medio bloque; subís caminando, sin saltar.</li>
        <li>${icon(38)} <b>Cofres</b>: 27 espacios. Si lo rompés, su contenido va a tu mochila.</li>
        <li>${icon(277)} <b>Baldes</b>: juntan agua o lava (clic derecho sobre la fuente) y la vuelcan en otro lado. El agua y la lava <b>fluyen</b>; si se tocan, la lava se vuelve roca.</li>
      </ul>`,
    'Fabricación': () => '__RECIPES__',
    'Cervecería': () => `
      <p>En el <b>Valle cervecero</b>, el único lugar verde del yermo, crecen <b>cebada</b>, <b>lúpulo</b> y papas silvestres, hay <b>manantiales de agua limpia</b> y cervecerías abandonadas con equipos, levadura y el <b>Plano: Cervecería</b>. En un mundo de tipo <b>Cervecero</b> el valle es enorme, arrancás al lado de una cervecería y ya sabés las recetas.</p>
      <h3>1 · Cultivar</h3>
      <p>Arás la tierra con una <b>pala</b> (clic derecho sobre tierra o pasto) y sembrás ${icon(281)} semillas de cebada o ${icon(283)} esquejes de lúpulo. Necesitan luz (sol o una lámpara cerca) y tardan unos minutos. Rompé la planta madura para cosechar.</p>
      <h3>2 · Maltear</h3>
      <p>En el <b>horno</b>: 2 ${icon(282)} cebada → ${icon(287)} malta. Tostala otra vez → ${icon(288)} malta tostada (para stout).</p>
      <h3>3 · Moler</h3>
      <p>En el ${icon(79)} <b>molino de grano</b> la malta se vuelve ${icon(289)} malta molida.</p>
      <h3>4 · Cocinar el mosto</h3>
      <p>En la ${icon(80)} <b>olla de cocción</b>: ${icon(279)} balde de agua limpia + 4 malta molida + 2 ${icon(284)} lúpulo + 1 carbón → 2 ${icon(292)} mostos (tarda 25 s y te devuelve el balde). El agua limpia sale de los manantiales, o destilá agua tóxica en el horno (balde + carbón).</p>
      <p>Variantes: con malta <b>tostada</b> sale mosto oscuro; con un <b>fragmento de uranio</b> en el espacio extra, mosto radiactivo.</p>
      <h3>5 · Fermentar y embotellar</h3>
      <p>En el ${icon(81)} <b>fermentador</b>: mosto + ${icon(291)} levadura + 4 ${icon(295)} botellas → 4 cervezas. <b>Bajo techo fermenta el doble de rápido.</b> Muchas veces recuperás levadura, así que nunca se te acaba. Las botellas vacías se hacen en el horno con vidrio (y te las devuelven al tomar).</p>
      <h3>6 · Tomar</h3>
      <ul>
        <li>${icon(296)} <b>Pale Ale del Yermo</b>: Coraje, +30% de daño durante 90 s.</li>
        <li>${icon(297)} <b>Stout de Ceniza</b>: Coraza, +20% de defensa durante 90 s.</li>
        <li>${icon(298)} <b>IPA Radiactiva</b>: Hígado de plomo, -50% de radiación durante 90 s.</li>
      </ul>
      <p>Todas alimentan y curan un poco. Con 3 seguidas el mundo empieza a dar vueltas…</p>`,
    'Supervivencia': () => `
      <p><b>Vida</b> (se regenera con la panza llena), <b>hambre</b>, <b>radiación</b> y <b>aire</b> bajo el agua. Caer de más de 4 bloques duele; la lava quema e irradia.</p>
      <p><b>Comida:</b> carne (asala en el horno), papas, latas de cajas de suministros, cerveza. <b>Botiquín</b>: cura 5 ♥. <b>Antirad</b>: baja la radiación.</p>
      <p><b>Radiación:</b> uranio, barriles, cráteres, agua tóxica, lava y la <b>lluvia ácida</b> si no estás bajo techo. Protegete con <b>máscara de gas</b> o <b>traje antirradiación</b>.</p>
      <p><b>Armaduras:</b> casco y chaleco de chatarra, armadura de acero, traje antirradiación y máscara de gas. Clic derecho para equiparlas o arrastralas a los espacios Cabeza/Torso de la mochila. Se gastan con los golpes.</p>
      <p><b>Clima:</b> las <b>tormentas de ceniza</b> tapan la vista; la <b>lluvia ácida</b> irradia.</p>
      <p><b>Catre:</b> guarda tu punto de reaparición y de noche te deja dormir. Al morir conservás el inventario.</p>
      <h3>Lugares</h3>
      <ul><li><b>Ciudad en ruinas:</b> edificios, <b>hospitales</b> (cajas médicas), autos y un <b>subte</b> bajo las calles (bajá por las escaleras de mano de algunas esquinas).</li>
      <li><b>Estaciones de servicio</b>, <b>antenas de radio</b> y <b>búnkeres</b> con botín y planos.</li>
      <li><b>Cráteres:</b> uranio expuesto… y el <b>Behemot</b>.</li><li><b>Cuevas profundas:</b> lagos de lava radiactiva.</li></ul>
      <h3>Planos</h3><p>Algunas recetas están bloqueadas 🔒 hasta que encontrás su plano en cajas: ${Object.values(BLUEPRINT_NAMES).join(' · ')}.</p>`,
    'Criaturas': () => '__MOBS__',
    'Electricidad': () => `
      <p>Con el <b>Plano: Electricidad</b> podés fabricar:</p>
      <ul>
        <li>${icon(76)} <b>Generador</b>: poné carbón adentro (clic derecho). Cada carbón dura 90 s.</li>
        <li>${icon(77)} <b>Panel solar</b>: da electricidad de día, al aire libre.</li>
        <li>${icon(75)} <b>Cable</b>: lleva la energía; conectá bloques pegados (también en altura).</li>
        <li>${icon(73)} <b>Foco eléctrico</b>: luz fuerte cuando le llega energía.</li>
        <li>${icon(78)} <b>Cerco eléctrico</b>: con energía, lastima y empuja a las criaturas que lo tocan. Ideal para defender la base.</li>
      </ul>`,
    'Vehículos': () => `
      <p>${icon(312)} <b>Moto de chatarra</b> y ${icon(342)} <b>moto de cross</b> (sube pendientes) con el Plano: Motos · ${icon(340)} <b>auto</b> (2 asientos, baúl de 9) y ${icon(341)} <b>camión</b> (4 asientos, caja de 27, atropella criaturas) con el Plano: Autos · ${icon(343)} <b>moto de pista</b> y ${icon(344)} <b>auto de carrera</b> con el Plano: Auto de carrera · ${icon(345)} <b>bote</b> para ríos y lagos.</p>
      <p>Clic derecho en el piso para dejarlo, <b>F</b> para subir o bajar (si otro maneja, subís de acompañante). <b>W/S</b> acelerar y frenar, <b>A/D</b> doblar, <b>H</b> bocina, <b>L</b> faros (iluminan de noche), <b>V</b> cámara.</p>
      <p><b>Nafta</b>: se gasta al andar. Clic derecho sobre el vehículo con un ${icon(339)} bidón de nafta o ${icon(323)} alcohol. <b>Daño</b>: los choques fuertes lo rompen; clic derecho con chatarra para repararlo. <b>Baúl</b>: clic derecho sobre el auto o camión sin nada en la mano.</p>`,
    'Cuerpo y clima': () => `
      <p><b>Sed</b> (gotas azules): baja con el tiempo y el doble con calor. Tomá agua de manantial con la mano vacía (clic derecho), cargá una ${icon(328)} <b>cantimplora</b> en el manantial, o tomá cerveza, guisos y sopas. El agua tóxica te saca la sed pero irradia y puede intoxicarte.</p>
      <p><b>Temperatura</b> (🌡): la tundra es helada, el desierto quema de día y se enfría de noche. Abajo de 4° te hace daño; arriba de 40° también. Te calientan una ${icon(108)} <b>fogata</b>, un horno, la lava cerca, estar bajo techo, un <b>abrigo de piel</b> o ir en auto o camión.</p>
      <p><b>Enfermedades</b>: las mordidas de ratas y necrófagos pueden <b>infectarte</b> (no te curás solo y perdés vida de a poco: tomá <b>antibióticos</b> o alcohol). La carne cruda y el agua tóxica pueden <b>intoxicarte</b> (mareo y hambre: tomá sopa de hongos).</p>
      <p><b>Hordas</b>: cada 7 noches una oleada de necrófagos y ratas ataca. Al atardecer te avisan. Usá muros, puertas, antorchas, <b>cercos eléctricos</b> y <b>torretas</b>.</p>
      <p><b>Luna</b>: tiene 8 fases; con luna llena las noches son más claras.</p>`,
    'NPC': () => `
      <p>${icon(273)} <b>Comerciantes errantes</b> aparecen de día cerca tuyo por un rato. Clic derecho para comerciar: compran cerveza (pagan más por estrella y un 50% extra si tenés una taberna abierta), hongos, cuero y carne; venden semillas, levadura, remedios, munición, nafta y planos.</p>
      <p><b>Asentamientos</b>: pueblos amurallados con fogata. El <b>líder</b> te da misiones (traer materiales, eliminar criaturas, llevar cerveza de calidad) con buenas recompensas, y también comercia.</p>
      <p>🐕 <b>Perros del yermo</b>: dales carne (la asada funciona siempre) y te siguen, pelean con vos y reaparecen a tu lado si te alejás. Clic derecho: sentarse/seguirte.</p>
      <p>📜 <b>Notas y libros</b>: se encuentran en cajas y estantes. Clic derecho para leer la historia del yermo.</p>`,
    'Taberna y añejado': () => `
      <p>${icon(104)} <b>Barril de añejamiento</b>: la cerveza guardada gana <b>una estrella cada 5 minutos</b> (hasta ★★★★★). Más estrellas: más curación, efectos más largos y mejor precio.</p>
      <p><b>Calidad al fermentar</b>: bajo techo +1★, equipo limpio +1★ (limpialo cada 3 tandas poniendo un balde de agua limpia en el fermentador) y con una ${icon(109)} <b>heladera encendida</b> pegada +1★.</p>
      <p><b>Estilos</b> (según el extra en la olla): nada → Pale Ale (o <b>Lager Helada</b> si fermenta con heladera) · malta tostada → Stout · uranio → IPA Radiactiva · carbón → <b>Porter de Humo</b> (sigilo) · hongo brillante → <b>Sour de Pantano</b> (regeneración) · Núcleo del Behemot → <b>Barleywine</b> (furia, pega fuerte).</p>
      <p>${icon(105)} <b>Taberna</b>: una chopera con cerveza, una ${icon(106)} barra y sillas cerca (y mejor con cartel). Los clientes compran solos y dejan chatarra (y cobre o acero si la cerveza es muy buena) en la caja de la chopera.</p>
      <p>${icon(107)} <b>Alambique</b>: destila cerveza, mosto, papas, cebada u hongos en ${icon(323)} <b>alcohol</b>: combustible para vehículos y desinfectante.</p>
      <p>🍳 <b>Fogata</b>: estación de cocina (guiso, pan de cebada, sopa de hongos, carne y papas asadas) y fuente de calor.</p>`,
    'Autódromo': () => `
      <p>Un circuito abandonado en muy buen estado: recta principal con largada, curvas con neumáticos, tribunas, boxes con <b>autos de carrera, motos de pista y camiones</b> listos para usar, y la <b>torre de control</b> con el <b>instructor</b>. Elegí la semilla 🏁 Autódromo en el menú para arrancar ahí.</p>
      <h3>Correr</h3>
      <ol><li>Subite a un vehículo (F).</li><li>Andá al ${icon(152)} <b>semáforo de largada</b> (al costado de la recta, cerca de los boxes) y hacé clic derecho.</li><li>Elegí 1, 3 o 5 vueltas. Semáforo: rojo, rojo, rojo… ¡verde!</li><li>Pasá por toda la pista: los puntos de control no dejan cortar camino.</li></ol>
      <p>Arriba a la izquierda ves la vuelta, tu posición y los tiempos. Se guarda tu <b>récord de vuelta</b> en cada pista.</p>
      <h3>El instructor</h3>
      <p>Hablale en la torre (clic derecho) y contratalo: <b>Novato</b> (5 chatarra), <b>Piloto</b> (2 acero) o <b>Leyenda</b> (2 cervezas de ★★★ o más). Corre con su propio auto de carrera. Si le ganás te llevás el <b>Trofeo</b>; en Leyenda, además, el <b>Plano: Auto de carrera</b>.</p>
      <h3>En línea</h3><p>Cuando alguien larga una carrera, todos los que estén en un vehículo cerca de la largada corren juntos, con posiciones compartidas.</p>`,
    'Automatización': () => `
      <p>Con el <b>Plano: Automatización</b>:</p>
      <ul>
        <li>${icon(134)} <b>Tolva</b>: saca objetos del contenedor de arriba (de la salida de una máquina o de un cofre) y los mete en el de abajo. Encadená molino → tolva → olla → tolva → fermentador.</li>
        <li>${icon(130)} <b>Cinta transportadora</b>: lleva los objetos tirados hacia donde apunta; si terminan sobre una tolva, entran.</li>
        <li>${icon(135)} <b>Palanca</b>: corta o deja pasar la electricidad (clic derecho).</li>
      </ul>
      <p>Con el <b>Plano: Defensa</b>:</p>
      <ul>
        <li>${icon(137)} <b>Sensor de movimiento</b>: deja pasar la corriente cuando algo se acerca a menos de 5 bloques.</li>
        <li>🚪 <b>Puertas automáticas</b>: cualquier puerta con un cable con energía pegado se abre sola (combinalo con el sensor).</li>
        <li>${icon(139)} <b>Alarma</b> y ${icon(141)} <b>torreta</b>: la torreta dispara a las criaturas hostiles a 14 bloques si tiene corriente.</li>
        <li>${icon(160)} <b>Trampa de púas</b>: lastima a lo que la pise.</li>
      </ul>
      <p>${icon(142)} <b>Tótem de protección</b>: nadie fuera de vos y tu equipo puede romper ni construir a 12 bloques.</p>`,
    'Historia y facciones': () => `
      <p>La <b>historia principal</b> sigue una vieja señal de radio: mesa de trabajo → refugio → asentamientos → fichas → facciones → el laboratorio → el <b>Abismo</b> → el Guardián. El objetivo actual se ve arriba a la izquierda y en el diario (<b>J</b>).</p>
      <h3>Facciones</h3>
      <p><b>Cerveceros del Valle</b> (vender cerveza, el concurso), <b>Chatarreros</b> (misiones, comercio, repartos, piratas) y <b>Hermandad del Acero</b> (jefes, hordas y, si están activados, bandidos). Con reputación se desbloquean sus tiendas (en el diario, cerca de un comerciante o líder). Matar inocentes baja la reputación.</p>
      <h3>Desafíos del día</h3><p>Tres desafíos nuevos cada amanecer, pagan fichas. Completar los tres da 5 fichas extra.</p>
      <h3>Eventos</h3><p>Cada 6–11 minutos: <b>caravanas</b> de comerciantes, <b>meteoritos</b> (uranio y una caja del abismo) o <b>aviones caídos</b> (caja militar). Aparecen en el mapa.</p>`,
    'Fichas y negocios': () => `
      <p>${icon(353)} Las <b>fichas</b> son la moneda del yermo: se prensan en la ${icon(179)} <b>Prensa de fichas</b> (chatarra, cobre o acero) o se ganan con desafíos, repartos, carreras y el concurso.</p>
      <h3>Banco</h3><p>${icon(180)} La caja fuerte del banco (hay una en cada ciudad subterránea, o fabricala) guarda tus fichas y paga <b>3% por día</b>. De ahí salen los sueldos.</p>
      <h3>Empleados</h3><p>Se contratan con el líder de un asentamiento (15 fichas + 2 por día): <b>granjero</b> (cosecha, resiembra y guarda en tu cofre), <b>guardia</b> (dispara a lo hostil) y <b>cervecero</b> (vende la cerveza de tus choperas cada mañana y deposita en el banco).</p>
      <h3>Repartos y rutas</h3><p>El líder te da ${icon(354)} cajones para llevar a otro asentamiento. Si hacés la misma ruta dos veces queda como <b>ruta comercial</b> y paga todos los días (hasta 5 rutas).</p>
      <h3>Concurso cervecero</h3><p>Cada 7 días (el diario avisa). Presentá tu mejor cerveza a un líder: cuenta la calidad ★, el estilo, la reputación y si tiene <b>nombre propio</b> (etiquetala en el diario → Cervezas). El ganador se lleva la ${icon(363)} Copa cervecera y 25 fichas.</p>`,
    'Biomas nuevos y cuevas': () => `
      <p><b>Cañones rojos</b>: mesetas escalonadas con paredes en franjas de ${icon(1103)} arenisca roja y ${icon(1104)} ${icon(1105)} arcillas; abajo, ${icon(1102)} arena roja y a veces un arroyo. Hay serpientes y escorpiones.</p>
      <p><b>Salar</b>: un llano blanco de ${icon(1106)} costra de sal con lagunas y ${icon(1107)} cristales de sal (dan ${icon(422)} sal). Van flamencos.</p>
      <p><b>Campo de géiseres</b>: roca volcánica y ${icon(1109)} tierra termal. Los ${icon(1108)} <b>géiseres</b> largan un chorro de vapor cada tanto: si estás encima te lanza por el aire (sin daño al caer).</p>
      <p><b>Bosque de hongos</b>: ahora también hay hongos gigantes de hasta 17 bloques y ${icon(1114)} hongos que brillan.</p>
      <p><b>Cuevas</b>: ${icon(1112)} estalactitas, ${icon(1113)} estalagmitas, ${icon(1114)} hongos que brillan, ${icon(1115)} cristales violetas en lo profundo, lagos subterráneos y ${icon(1111)} obsidiana sobre la lava.</p>
      <h3>Minerales nuevos</h3>
      <p>${icon(1110)} <b>Cuarzo</b> (desde pico de chatarra): sirve para ${icon(1116)} bloques y ${icon(1117)} lámparas de cuarzo, y para los mecanismos nuevos. ${icon(1111)} <b>Obsidiana</b> (pico de acero o mejor): con ella se hacen ${icon(417)} herramientas y ${icon(420)} espada que casi no se gastan.</p>`,
    'Hurlingham': () => `
      <p>Creá un mundo nuevo de tipo <b>🏡 Hurlingham</b> (o elegí «Hurlingham» en las semillas): el centro de Hurlingham con el <b>mapa real</b>, en escala real (1 bloque = 1 metro), rodeado por el yermo. Arrancás en la <b>plaza John Ravenscroft</b>.</p>
      <ul><li><b>Qué abarca</b>: unos 2 × 2,2 km, de la estación Hurlingham hasta el hipódromo de trote, con el Hurlingham Club y su cancha de golf en el medio.</li>
      <li><b>🚆 Las estaciones</b> <b>Hurlingham</b> (San Martín) y <b>Rubén Darío</b> (Urquiza), con sus andenes elevados y las vías.</li>
      <li><b>⛪ La iglesia Santa Trinidad</b> (luterana), en Pedro de Mendoza esquina Isabel la Católica, modelada a mano a partir de las fotos de la calle: el hastial de ladrillo con sus tres ventanas ojivales y las tres rectangulares de abajo, la torre con el arco, la puerta y la rosa de Lutero mirando al jardín, el costado blanco, las cruces, la reja negra sobre el murito blanco y la casa de la esquina.</li>
      <li><b>🐎 El hipódromo de trote</b>: el óvalo no está en OpenStreetMap, así que se calcó de la foto satelital.</li>
      <li><b>Las casas</b>: cada una con su silueta real (Google Open Buildings y Microsoft, por Overture Maps). Como esos datos no traen la altura ni el techo, se dibujan de una planta (7 m las muy grandes), algunas con techo de tejas y otras con terraza: eso es aproximado.</li>
      <li><b>Árboles</b>: en las veredas y las plazas van con ubicación aproximada (el mapa no los tiene cargados).</li>
      <li><b>Carteles</b> en cada esquina con los nombres reales de las calles.</li></ul>
      <p class="muted">Datos del mapa © colaboradores de OpenStreetMap (ODbL); siluetas de edificios: Overture Maps (Google Open Buildings, Microsoft).</p>`,
    'Buenos Aires': () => `
      <p>Creá un mundo nuevo de tipo <b>🏙 Buenos Aires</b> (o elegí «Buenos Aires» en las semillas): es el centro porteño hecho con el <b>mapa real de OpenStreetMap</b>, en escala real (1 bloque = 1 metro), rodeado por el yermo.</p>
      <ul><li><b>Qué abarca</b>: unos 3,5 × 3,5 km alrededor del <b>🗼 Obelisco</b> (67,5 m, iluminado de noche): de Retiro y Plaza San Martín hasta la avenida Independencia, y del Congreso hasta los diques de Puerto Madero.</li>
      <li><b>Calles y cuadras</b>: todas en su lugar, con el ancho según sus carriles: la 9 de Julio con sus colectoras, Corrientes, Diagonal Norte y Sur, Avenida de Mayo, Rivadavia, Leandro N. Alem, Paseo Colón, Callao, Belgrano y el resto de la grilla.</li>
      <li><b>Edificios</b>: cada uno con su forma y su altura real cuando el mapa la tiene (Plaza de Mayo, Casa Rosada, Cabildo, Catedral, Congreso, Palacio Barolo, Teatro Colón, Galerías Pacífico, Torre Galicia…). Los que no tienen altura cargada se dibujan de 6 pisos, y donde el mapa todavía no cargó edificios queda la vereda.</li>
      <li><b>Plazas y árboles</b>: los árboles cargados en el mapa van en su lugar con su especie (plátano, jacarandá, tipa, palo borracho o palmera). En las plazas y canteros sin árboles cargados se agregan algunos, con ubicación aproximada.</li>
      <li><b>Carteles</b> en cada esquina: un poste con una placa por calle, con su nombre real y puesta paralela a la calle que nombra, faroles donde el mapa los tiene y los lugares famosos marcados en el mapa grande.</li></ul>
      <p>Arrancás al pie del Obelisco con un globo aerostático para verla desde arriba. En el centro no aparecen bichos peligrosos: sólo palomas. Suena un tango suave.</p>
      <p class="muted">Datos del mapa © colaboradores de OpenStreetMap, licencia ODbL (openstreetmap.org/copyright).</p>`,
    'Recuerdos y mascotas': () => `
      <p><b>📔 Álbum de viaje</b> (pausa → Juego): se llena solo con una foto de cada logro, cada bioma nuevo y los momentos especiales (tesoros, eclipses, caravanas, carreras, tu primer vuelo en globo).</p>
      <p><b>🎬 Grabar recorrido</b> (pausa → Juego): la cámara vuela sola alrededor de tu casa y se aleja mostrando tu mundo; en 30 segundos tenés un video para guardar o compartir. Esc lo corta.</p>
      <p><b>🐕 Tu perro</b> olfatea los tesoros de tus mapas y escarba donde hay cofres enterrados cerca. <b>🐐 Tu cabra</b> se pone nerviosa y te avisa si algo peligroso se acerca.</p>
      <p><b>🎵 Música</b>: los cañones, el salar y los géiseres tienen su propia música, y cada bioma suena con su timbre.</p>`,
    'Con amigos': () => `
      <p><b>🕰 El mundo sigue</b>: cuando volvés después de un rato, los cultivos crecieron y las baterías se cargaron según el tiempo que pasó (hasta un día). Te avisa al entrar.</p>
      <p><b>📦 Paquetes</b>: en el buzón (mundo del grupo) podés mandar hasta 4 cosas de tu barra juntas, aunque el otro no esté. Los cuadros viajan con su dibujo y los mapas del tesoro con su destino.</p>
      <p><b>🎈 Carrera en globo</b> (pausa → Juego): subite a un globo y pasá por 10 aros en el aire. El recorrido es el mismo para todos en el mundo, así que hay ranking del grupo.</p>
      <p><b>🏆 Concurso semanal</b> (pausa → Comunidad): cada semana un tema («la casa más linda», «el puente más largo»…). Sacá una foto de lo que construiste, presentala y votá las de los demás.</p>`,
    'Pincel, portones y planos': () => `
      <p>${icon(444)} <b>Pincel</b> (palo, tela y una ficha): clic derecho al aire para elegir entre 12 colores; clic derecho sobre <b>hormigón, vidrio o una cama</b> para teñirlos. Se gasta de a poco.</p>
      <p>${icon(1147)} <b>Portón automático</b>: se abre solo cuando te acercás (o un amigo) y se cierra cuando te vas. Apilalos para armar un portón de garaje.</p>
      <p><b>📤 Planos compartibles</b>: en el ${icon(362)} plano de obra tocá «Compartir o pegar planos». Generás un código de texto con tu diseño para mandarlo por chat; quien lo pegue lo guarda y lo puede construir.</p>`,
    'Caravanas, faros y estaciones': () => `
      <p><b>🐐 Caravanas</b>: de día, cada tanto pasa una caravana de comerciantes con sus cabras. Hablá con el que va adelante: si la escoltás hasta su destino (sin alejarte mucho) te pagan <b>25 fichas</b> y un regalo. A mitad de camino suele haber una emboscada.</p>
      <p><b>🗼 Faros</b>: en el archipiélago, de noche el faro gira un haz de luz que se ve de lejos. <b>🏛 Ruinas hundidas</b>: en el mar abierto hay templos sumergidos con columnas rotas, luces y cofres del tesoro (llevá tanque de buceo).</p>
      <p><b>Estaciones</b>: en invierno las mesetas altas de los cañones y los montes se cubren de nieve; después de llover, el <b>salar se inunda</b> con una capa de agua que refleja el cielo como un espejo; y los <b>géiseres</b> son más activos de noche.</p>`,
    'Cielo, mapa y fotos': () => `
      <p><b>🌑 Eclipses</b>: muy de vez en cuando, cerca del mediodía, la luna tapa el sol: se hace casi de noche un rato y se ven las estrellas. <b>🌠 Lluvias de estrellas</b>: algunas noches el cielo se llena de estrellas fugaces.</p>
      <p><b>🗺 Mapa grande</b>: arriba hay filtros para mostrar u ocultar lugares, gente, tus marcas, tesoros, tus camas y los géiseres.</p>
      <p><b>📸 Modo foto</b>: ahora podés elegir la hora del día y el clima sólo para la foto (al salir vuelve todo como estaba).</p>
      <p><b>📱 En el celular</b>: mantené apretado un objeto de la barra para ver qué es y para qué sirve.</p>
      <p>El <b>agua quieta</b> (lagos, lagunas del salar) refleja el cielo como un espejo, y las <b>plantas</b> se aplastan cuando pasás encima.</p>`,
    'Tesoros y pueblos fantasma': () => `
      <p>${icon(442)} <b>Mapas del tesoro</b>: aparecen en cajas y cofres (más en los pueblos fantasma y en cofres del tesoro) y los vende el comerciante. Al usarlo queda marcado un lugar a 120-320 bloques, con distancia y dirección. Cuando te acercás aparece una ${icon(1143)} <b>X roja</b> en el piso: cavá dos bloques debajo y está el ${icon(228)} cofre del tesoro.</p>
      <p><b>Pueblos fantasma</b>: en lugares planos de los cañones rojos hay casillas de madera abandonadas, con techos caídos, ventanas rotas y ${icon(1144)} baúles con fichas, cuarzo, cuero y a veces un mapa o un cofre del tesoro.</p>
      <p>${icon(443)} <b>Globo aerostático</b> (12 telas, 6 tablas y 2 lingotes de acero): se pone en el piso, F para subir. Espacio sube despacio, C baja, W avanza y A/D giran. Si no hacés nada baja solo, suave. Usa nafta, pero muy poca: ideal para recorrer cañones y buscar tesoros desde arriba.</p>
      <p>El <b>comerciante</b> ahora compra sal, leche, cuarzo y queso, y vende mapas del tesoro, obsidiana, cuarzo, hornos de barro y molinos.</p>`,
    'Fauna nueva': () => `
      <p><b>🐐 Cabras montés</b>: andan en grupo por los cañones rojos y los Montes de Hierroalto. Se domestican con ${icon(282)} cebada o ${icon(281)} semillas; una cabra domesticada se <b>ordeña con una ${icon(295)} botella vacía</b> (cada minuto y medio) y da ${icon(439)} leche. Con cebada tienen crías.</p>
      <p>En la cocina o el horno de barro: ${icon(440)} <b>queso de cabra</b> (2 leches y sal) y ${icon(441)} <b>dulce de leche</b> (3 leches, te deja liviano).</p>
      <p><b>🦎 Lagartijas</b> en los cañones, el desierto y el salar (escapan rápido). <b>🦇 Murciélagos</b> en las cuevas: no atacan, revolotean cerca del techo.</p>
      <p>Los pueblos ahora piden cosas nuevas: guisos, cuarzo de las cuevas, un molino armado, sal del salar, obsidiana y queso. Hay desafíos diarios de cocinar, ordeñar y encontrar cristales, y una página de <b>Cocina</b> en el libro de colección.</p>
      <p>Las <b>tormentas de arena</b> también llegan a los cañones rojos.</p>`,
    'Mecanismos y cocina': () => `
      <h3>Energía</h3>
      <p>${icon(1121)} <b>Molino de viento</b>: da energía mientras haya viento (más viento, más rápido giran las aspas). ${icon(1120)} <b>Batería</b>: se carga cuando le llega energía de un panel solar, molino o generador, y la devuelve cuando no hay otra fuente (de noche, sin viento). Clic derecho muestra la carga (hasta 15 minutos).</p>
      <h3>Aparatos</h3>
      <p>${icon(1118)} <b>Compuerta</b>: con energía se abre y deja pasar el agua; sin energía se cierra. Ideal con una ${icon(135)} palanca. ${icon(1123)} <b>Farola</b> y ${icon(1125)} <b>lámpara colgante</b>: se prenden con energía. ${icon(1127)} <b>Regador de huerta</b>: pegado a agua limpia, riega los cultivos cercanos sin bomba ni cañerías (crecen el doble de rápido). Las ${icon(130)} <b>cintas transportadoras</b> ahora también te llevan a vos.</p>
      <h3>${icon(1128)} Horno de barro</h3>
      <p>Se hace con arcilla ocre y roca. Cocina comidas que dan efectos:</p>
      <ul><li>${icon(423)} <b>Guiso caliente</b> (carne asada y papas): no te lastima el frío.</li>
      <li>${icon(424)} <b>Sopa de hongos brillantes</b>: visión nocturna.</li>
      <li>${icon(425)} <b>Pan de cebada</b>: corrés más liviano y sin cansarte.</li>
      <li>${icon(426)} <b>Brochette de pescado</b>: recuperás vida.</li>
      <li>${icon(427)} <b>Té de hierbas</b> (flores y una botella): más defensa.</li>
      <li>${icon(428)} <b>Pizza del yermo</b>: pegás más fuerte.</li></ul>`,
    'Hogar': () => `
      <h3>Camas</h3>
      <p>${icon(1129)} ${icon(1130)} ${icon(1131)} Camas roja, azul y verde (tela y tablas de roble). Cada cama donde dormís queda anotada (hasta 6): cuando morís podés <b>elegir en cuál aparecer</b>.</p>
      <h3>Cocina y muebles</h3>
      <p>${icon(1132)} La <b>cocina</b> sirve para cocinar como el horno de barro. ${icon(1133)} Mesada con pileta y ${icon(1134)} biblioteca de roble. En la mesa de trabajo: ${icon(429)} sillón, ${icon(430)} mesa de luz, ${icon(431)} florero, macetas con ${icon(432)} cactus, ${icon(433)} helecho y ${icon(434)} hongo, ${icon(435)} cajonera y ${icon(436)} perchero (se apoyan arriba de un bloque; con la sierra se giran).</p>
      <h3>Tus dibujos en la pared</h3>
      <p>Pintá un ${icon(247)} lienzo, hacé un ${icon(437)} <b>marco</b> y usalo sobre el lienzo: te llevás una copia del dibujo como ${icon(438)} cuadro para colgar en cualquier pared. Si lo rompés, vuelve con el dibujo.</p>
      <h3>Carteles de pared</h3>
      <p>${icon(1139)} Se cuelgan en la pared y el texto se lee sobre la placa (clic derecho para escribirlo).</p>`,
    'Peligros y clima': () => `
      <p><b>Estaciones</b>: primavera, verano, otoño e invierno (3 días cada una). Cambian la temperatura y la velocidad de los cultivos; en invierno nieva.</p>
      <p><b>Tormenta eléctrica</b>: caen rayos donde hay cielo abierto (prefieren lo alto y lo metálico) y prenden fuego. <b>Tornado</b>: un embudo que arrastra, levanta y rompe cosas livianas; bajo techo estás a salvo.</p>
      <p><b>Fuego</b>: quema madera, plantas y tela y se propaga. Lo apagan el agua, la lluvia y los <b>aspersores</b>. Los terrenos protegidos no se queman. ${icon(355)} El encendedor prende fuego.</p>
      <p><b>Mar de chatarra</b>: barcos varados. <b>Zona militar</b>: alambrados, tanques, cajas militares y ¡<b>minas</b>! (se ven como un círculo en el piso).</p>
      <p><b>Humanos armados</b> (opcional, regla del mundo, apagada por defecto): bandidos que asaltan tu base de noche y roban de los cofres, piratas en el mar de chatarra y soldados renegados en la zona militar.</p>
      <h3>Armas nuevas</h3><p>${icon(356)} Arco (flechas), ${icon(358)} granadas (explotan a los 2 s), ${icon(359)} lanzallamas (mantené clic derecho) y ${icon(369)} minas propias. Los planos de <b>Explosivos</b> salen de laboratorios y cajas militares.</p>`,
    'El Abismo': () => `
      <p>En el piso más profundo de cada laboratorio, junto al núcleo, hay un ${icon(197)} <b>portal violeta</b>. Del otro lado está el <b>Abismo</b>: salas y pasillos tallados en roca, infinitos hacia abajo.</p>
      <p>El portal junto a la llegada te devuelve a la superficie; el del <b>fondo del pasillo principal</b> baja al nivel siguiente. Cada nivel tiene criaturas más fuertes, ${icon(200)} cajas del abismo con fichas y botín raro, y cada 5 niveles espera un <b>Guardián</b> que bloquea el portal hasta que lo derrotes.</p>`,
    'Construcción avanzada': () => `
      <p>${icon(361)} <b>Cinta métrica</b>: clic derecho en dos esquinas opuestas marca una construcción (hasta 4096 bloques). ${icon(362)} <b>Plano de obra</b>: guardala con un nombre y construila donde quieras, girada hacia donde mirás. Los diseños sirven en todos tus mundos; en supervivencia usan tus materiales.</p>
      <p>${icon(190)} <b>Ascensores</b>: poné dos o más en la misma columna; parado encima, Espacio sube al siguiente y C baja.</p>
      <p>${icon(187)} <b>Cañerías</b>: una ${icon(188)} bomba con energía pegada al agua alimenta los ${icon(189)} aspersores conectados: riegan (cultivos al doble de velocidad) y apagan incendios.</p>
      <p>${icon(191)} <b>Carteles</b>: clic derecho para escribir; el texto se ve de lejos.</p>
      <h3>Paquetes de texturas</h3><p>En Opciones → <b>Exportar plantilla</b> descargás un PNG con todas las texturas (16 columnas, 32×32 cada una). Editalo o pegá texturas propias (dibujadas, de packs libres o generadas con IA) y cargalo con <b>Cargar paquete</b>. Las celdas que dejes transparentes conservan la textura original.</p>`,
    'Vehículos v6': () => `
      <p>${icon(183)} <b>Taller mecánico</b>: con un vehículo estacionado cerca, instalale motor, cubiertas, blindaje, <b>nitro</b> (Shift) y pintura.</p>
      <p>${icon(364)} <b>Helicóptero</b> (plano de Aviación): Espacio sube, C baja, W avanza. Gasta nafta aunque esté quieto en el aire; sin nafta planea hacia abajo.</p>
      <p>${icon(365)} <b>Vagoneta</b> y <b>trenes del subte</b>: andan sobre vías (${icon(101)}), doblan solos en las esquinas y suben pendientes. Hay trenes abandonados en los túneles del subte de las ciudades.</p>
      <p>${icon(360)} <b>Monturas</b>: domesticá un jabalí (papas) o un lobo (carne) y usá la montura: corren, saltan y no gastan nafta.</p>
      <h3>Pistas propias y campeonato</h3>
      <p>Poné una ${icon(185)} <b>bandera de largada</b> y varias ${icon(184)} <b>banderas de control</b> formando un circuito (se unen por cercanía, hasta 120 bloques entre sí). Los ${icon(186)} conos sirven de borde. Clic derecho en la bandera de largada para correr.</p>
      <p><b>Campeonato</b> (5 fichas): 5 fechas de 2 vueltas contra Rolo, La Chispa, Tuerca y Nafta Gómez. Puntos 10-6-4-3-2-1. El campeón gana un trofeo y 30 fichas.</p>`,
    'Base equipada': () => `
      <p>Tipo de mundo <b>🧰 Base equipada</b> (semilla del mismo nombre): arrancás en una base con todo listo para explorar y probar, como un creativo pero ya armado.</p>
      <p><b>Hangar</b> con moto, moto de cross, moto de pista, auto, auto de carrera y camión · <b>helipuerto</b> con helicóptero · <b>muelle</b> con bote · <b>vías</b> alrededor con tren y vagoneta · <b>corral</b> con cebra, avestruz, elefante, jabalí y lobo ensillados · <b>taller</b> con todas las estaciones y 5 cofres llenos (materiales, herramientas, vehículos y nafta, comida, electricidad).</p>
      <p>Todos los planos ya están aprendidos. Viene en Creativo, pero se puede elegir Supervivencia (arrancás con herramientas de acero y provisiones).</p>`,
    'Bioparque': () => `
      <p>Después del colapso nadie cuidó el <b>bioparque</b>: los animales andan sueltos entre los recintos rotos (◆ dorado en el mapa). Con la semilla <b>🦁 Bioparque</b> arrancás en la entrada.</p>
      <h3>Quién es quién</h3>
      <p><b>Pacíficos</b> (huyen si los atacás): jirafa, cebra, avestruz, flamenco, pingüino, mono.<br>
      <b>Neutrales</b> (tranquilos hasta que los molestás, y entonces pegan fuerte): elefante, rinoceronte (embiste), hipopótamo, gorila, canguro.<br>
      <b>Depredadores</b> (atacan solos): león, oso, cocodrilo, serpiente (venenosa).</p>
      <p>Algunos escaparon: hay <b>osos y pingüinos</b> en la tundra, <b>cocodrilos y flamencos</b> en el pantano y <b>serpientes</b> en el desierto. Con la regla «animales mutantes atacan de día» desactivada, de día no atacan.</p>
      <h3>Domesticar y montar</h3>
      <p>Dales de comer (clic derecho con la comida en la mano) hasta que acepten, y después usá una ${icon(360)} <b>Montura</b>:<br>
      cebra (cebada o papas), avestruz (semillas o cebada), elefante (cebada o papas; tarda más, pero carga 2 personas y tiene baúl), jabalí (papas) y lobo (carne).</p>`,
    'Reinos de Eldra': () => `
      <p>Tipo de mundo <b>🧙 Reinos de Eldra</b>: un mundo medieval y mágico sin historia principal, para explorar a tu ritmo.</p>
      <h3>Los reinos</h3>
      <p><b>Colinas de Valverde</b>: aldeas de medianos en cuevas redondas (comercian comida y pociones). <b>Bosque de Lunaria</b>: árboles gigantes y de plata que brillan de noche; viven elfas y ents. <b>Montes de Hierroalto</b>: minas enanas con mithril y cristal arcano. <b>Ciénaga Sombría</b>: telarañas que te frenan (rompelas con la espada) y arañas venenosas. <b>Tierras de Brasa</b>: basalto, lava y la guarida del <b>Dragón de Brasa</b> sobre montones de oro.</p>
      <h3>Criaturas</h3>
      <p>De noche bajan <b>orcos</b> y <b>huargos</b>. Los <b>trolls</b> salen en montes y ciénagas: si los agarra el sol, se vuelven piedra. Los <b>ents</b> son tranquilos hasta que les pegás. Los <b>caballos</b> se domestican con manzanas o cebada y se montan con una ${icon(360)} Montura. El mago de la torre, los medianos, los enanos y las elfas comercian (clic derecho) a cambio de ${icon(353)} fichas de oro.</p>
      <h3>Magia</h3>
      <p>La barra <b>✦ maná</b> se recarga sola, y mucho más rápido al lado de un ${icon(219)} <b>altar de runas</b>. Con el ${icon(386)} <b>Tomo de hechizos</b> (lo vende el mago) aprendés a fabricar en el altar:</p>
      <p>${icon(370)} <b>Luz</b>: crea un orbe de luz · ${icon(371)} <b>Fuego</b>: bola de fuego que quema · ${icon(372)} <b>Curación</b>: +8 de vida y cura el veneno · ${icon(373)} <b>Escudo</b>: 20 s recibiendo mucho menos daño · ${icon(374)} <b>Viento</b>: empuja a las criaturas y te eleva.</p>
      <p>Los <b>anillos</b> funcionan con sólo llevarlos en la mochila: ${icon(375)} rapidez, ${icon(376)} visión nocturna y ${icon(377)} sigilo (los monstruos no te ven hasta que estás muy cerca). En la ${icon(220)} <b>mesa de alquimia</b> se hacen ${icon(378)} pociones de vida y ${icon(379)} de maná con ${icon(380)} flores de luna.</p>`,
    'Dron y fechas especiales': () => `
      <h3>${icon(393)} Dron compañero</h3>
      <p>Se fabrica en la mesa de trabajo (plano de Electricidad): 4 lingotes de acero, 4 de cobre y un vidrio. Clic derecho con el dron en la mano para desplegarlo o guardarlo. Vuela sobre tu hombro y:</p>
      <ul><li>acerca lo que está tirado en el piso (imán),</li><li>cada pocos segundos busca <b>minerales y cofres</b> cerca y te marca el más cercano con un rayo azul,</li><li>te avisa si se acerca una criatura hostil (su luz se pone roja).</li></ul>
      <h3>Hora real y estaciones</h3>
      <p>Con la regla <b>🕐 Hora real</b> el día y la noche siguen el reloj de tu celu o compu, y la estación es la verdadera del hemisferio sur (primavera en septiembre, verano en diciembre…).</p>
      <h3>Fechas especiales (según el calendario real)</h3>
      <p>🎃 <b>Noche de brujas</b> (25 al 31 de octubre): los monstruos usan calabazas y sueltan ${icon(396)} caramelos · 🎄 <b>Navidad</b> (20 al 26 de diciembre): nieve y ${icon(397)} regalos escondidos · 🎆 <b>Año nuevo</b> y 🇦🇷 <b>25 de mayo / 9 de julio</b>: fuegos artificiales de noche · 🥚 <b>Pascua</b>: ${icon(395)} huevos de chocolate escondidos · 🤝 <b>Día del amigo</b>: un regalo para cada uno.</p>
      <p>${icon(394)} <b>Cohetes</b>: 2 carbones y un lingote de cobre dan 4. Clic derecho para lanzar uno cuando quieras.</p>
      <h3>Accesibilidad</h3>
      <p>En el menú y en la pausa: <b>🎮 Controles y accesibilidad</b> para cambiar las teclas, corregir los colores para daltonismo (deuteranopía, protanopía, tritanopía), agrandar la letra y los íconos o usar alto contraste. La regla <b>🧸 Modo chicos</b> saca los monstruos, el hambre, la sed y la radiación.</p>`,
    'Defensa y una sola vida': () => `
      <h3>${icon(227)} Defensa del refugio (cooperativa)</h3>
      <p>Fabricá un <b>Núcleo del refugio</b> en la mesa de trabajo (4 lingotes de acero, una lámpara de uranio y 2 placas de metal), ponelo en tu base y hacé clic derecho para empezar: los mutantes vienen en <b>10 oleadas</b> cada vez más grandes a romperlo (en Eldra, orcos, huargos y trolls). Si tienen un jugador muy cerca lo atacan a él; si no, van derecho al núcleo.</p>
      <p>Cada oleada rechazada da fichas a todos; resistir las 10 da 40 fichas y un regalo. Entre oleada y oleada hay 20 s para reparar. Online la maneja el anfitrión y todos ven la barra del núcleo. No está en modo chicos.</p>
      <h3>☠ Una sola vida</h3>
      <p>Modo de juego al crear el mundo. Si morís, se terminó: ves tus puntos (días × 100 + criaturas × 10 + logros × 25) y el mundo se borra. Las criaturas se hacen más fuertes cada 3 días. Tus partidas quedan en <b>🏆 Ranking</b> (menú); si entraste con tu cuenta en ☁ Mundo del grupo, también salen en el ranking de todos.</p>`,
    'Mares y archipiélago': () => `
      <p>Tipo de mundo <b>🏝 Archipiélago</b>: mar abierto con islas de arena y palmeras, arrecifes de coral, <b>naufragios</b> en el fondo con ${icon(228)} cofres del tesoro y <b>faros</b> en la costa (subí por la escalera de adentro).</p>
      <p>${icon(398)} <b>Caña de pescar</b> (3 ramas y un cuero): clic derecho apuntando al agua para tirar la línea. Cuando el corcho se hunde y dice <b>«¡Pica!»</b>, clic derecho rápido. Sale ${icon(399)} pescado (asalo en el horno o la fogata), a veces un ${icon(404)} pez dorado, fichas, regalos o un tanque de buceo. En mar abierto y con lluvia pican más.</p>
      <p>${icon(401)} <b>Tanque de buceo</b> (va en la cabeza): aguantás 90 s bajo el agua. ${icon(402)} <b>Velero</b>: más rápido que el bote, 3 asientos y 18 lugares de carga. ${icon(403)} <b>Cocos</b>: caen de las hojas de palmera, quitan el hambre y la sed.</p>`,
    'Minijuegos': () => `
      <p>Fabricá una ${icon(234)} <b>Mesa de minijuegos</b> (4 tablas y 2 fichas), ponela en un lugar abierto y hacé clic derecho. Juegan todos los que están en la partida (abrila a amigos); la arena se arma al lado de la mesa y desaparece al terminar. Ganar da 10 fichas.</p>
      <ul><li><b>🔥 El piso es lava</b>: los bloques se ponen rojos y desaparecen, cada vez más rápido. Gana el último arriba.</li>
      <li><b>❄ Spleef</b>: plataforma de nieve que se rompe de un golpe: rompé el piso debajo de los demás.</li>
      <li><b>🏃 Parkour</b>: saltos en el aire, puntos de control ${icon(237)} y meta ${icon(238)}. Si te caés, volvés al último control. Guarda tu récord.</li>
      <li><b>🙈 Escondidas</b> (2+): el que busca cuenta 30 s con la pantalla negra; encontrás a alguien acercándote a menos de 2 bloques.</li>
      <li><b>🚩 Captura la bandera</b> (2+): rojos contra azules; tocá la bandera rival, llevala a tu base, y si te toca un rival vuelve. Gana el primero en llegar a 3.</li></ul>
      <p>Los bloques ${icon(236)} rojo, ${icon(237)} azul y ${icon(239)} blanco también se fabrican, para armar tus propias pistas y canchas.</p>`,
    'Circuitos, música y pintura': () => `
      <h3>Circuitos</h3>
      <p>La energía viaja por ${icon(75)} cables desde una fuente: ${icon(76)} generador (con combustible), ${icon(77)} panel solar (de día) o ${icon(244)} <b>pila</b> (siempre prendida). Interruptores: ${icon(135)} palanca, ${icon(240)} <b>pulsador</b> (clic derecho: se prende 1 segundo y medio), ${icon(242)} <b>placa de presión</b> (se prende cuando alguien o algo está parado encima) y ${icon(137)} sensor de movimiento. Lo que recibe energía: focos, alarmas, torretas, bombas, <b>puertas</b> (se abren solas si tienen un cable con energía al lado) y los bloques musicales.</p>
      <p>Ejemplo: pila → cable → placa de presión delante de una puerta → la puerta se abre sola al pisarla.</p>
      <h3>Música</h3>
      <p>${icon(245)} <b>Bloque musical</b>: clic derecho para tocarlo y subir medio tono (Shift + clic para bajar). El instrumento depende del bloque de abajo: vidrio = campana, arena o tierra = tambor, madera = guitarra, piedra u hormigón = bajo, nieve o hielo = flauta, otro = piano. Si le llega energía, suena: poné varios con pulsadores o placas para armar un piano o un camino musical.</p>
      <p>${icon(246)} <b>Caja musical</b>: escribí una melodía (do re mi…, con octavas, sostenidos y silencios), elegí instrumento y tempo. Trae canciones de ejemplo y suena con electricidad o con «Probar».</p>
      <h3>Pintura</h3>
      <p>${icon(247)} <b>Lienzo</b>: ponelo contra una pared y hacé clic derecho desde el lado donde querés el cuadro. Pintás 16 × 16 píxeles con 16 colores (también transparente) y lo ven todos.</p>`,
    'Naturaleza y mascotas': () => `
      <h3>${icon(248)} Plantines</h3>
      <p>Las hojas de los árboles (y a veces las ramas secas del yermo) sueltan <b>plantines</b>. Plantalos con lugar arriba y en unos minutos crece un árbol solo (palmeras en el archipiélago). Así se puede volver a llenar de verde el yermo.</p>
      <h3>Crías</h3>
      <p>Los animales que domesticaste (y tus perros y lobos) tienen crías: dale su comida a dos de la misma especie que estén cerca (salen corazones) y nace una cría, que crece en unos 5 minutos.</p>
      <h3>Mascotas que evolucionan</h3>
      <p>Tu perro o lobo gana experiencia acompañándote y peleando a tu lado, y sube hasta el nivel 5: ${PET_TRICKS_TXT}. Clic derecho con la mano vacía para ponerle <b>nombre</b>, cambiar el <b>collar</b> o pedirle que se quede.</p>
      <h3>Clima extremo y mareas</h3>
      <p>En el desierto y las Tierras de Brasa se arman <b>tormentas de arena</b> que no dejan ver casi nada; en los pantanos y la Ciénaga sube una <b>niebla espesa</b>, sobre todo de noche. En el archipiélago la <b>marea</b> sube y baja dos veces por día y tapa las playas. Si pescás mucho en el mismo lugar, los peces se agotan por un rato.</p>`,
    'Aventuras, buzón y galería': () => `
      <p>Todo esto usa tu cuenta de <b>☁ Mundo del grupo</b>.</p>
      <h3>🗺 Aventuras</h3>
      <p>En el menú, <b>🗺 Aventuras de la comunidad</b> lista los mapas que armaron otros jugadores: juntá los ${icon(251)} trofeos y llegá a la ${icon(252)} meta; los ${icon(250)} controles guardan dónde reaparecés. En una aventura no se rompe ni se construye (las puertas, palancas y cofres sí funcionan).</p>
      <p><b>Crear una</b>: en un mundo tuyo (mejor en Creativo) armá el recorrido y poné un ${icon(249)} <b>Inicio de aventura</b>, controles, trofeos y la meta. Usá carteles para contar la historia y cofres con premios. Después, en la pausa: <b>🗺 Publicar como aventura</b> (sube lo que construiste a menos de 120 bloques del inicio). Podés volver a publicarla para actualizarla.</p>
      <h3>📬 Buzón y 📍 marcas</h3>
      <p>En un mundo del grupo, desde la pausa: mandale mensajes (y lo que tengas en la mano) a otro miembro aunque no esté conectado; le aparece cuando entra. <b>Marcar este lugar</b> pone una marca rosa en el mapa de todos.</p>
      <h3>🖼 Galería</h3>
      <p>Sacá una foto (F2 y después P) y en la pausa → <b>Galería del grupo</b> compartila con un epígrafe. Ahí ves las fotos de todos.</p>`,
    'Aprender y construir': () => `
      <h3>📚 Modo aprender</h3>
      <p>Activá la regla <b>📚 Modo aprender</b> (al crear el mundo o en la pausa) y aparece el <b>🤖 Profe Robi</b> cerca del inicio. Hablale (clic derecho) y te pone desafíos de 5 preguntas: cuentas y palabras para completar. Va subiendo de nivel solo: sumas hasta 10 → sumas y restas → tablas del 2 al 5 → tablas hasta el 10 → divisiones. Cada respuesta correcta a la primera da 1 ficha, y 4 o 5 bien, un regalo.</p>
      <p>${icon(253)} <b>Cofre con acertijo</b>: para abrirlo hay que responder una pregunta. El que lo pone puede escribir su propia pregunta y respuesta con <b>Shift + clic derecho</b> (por ejemplo, para que los chicos encuentren un premio). Si no tiene pregunta, inventa una cuenta.</p>
      <h3>🏗 Construcción guiada</h3>
      <p>En la pausa, <b>🏗 Construcción guiada</b>: elegí casita, torre, puente, fuente o cohete y aparece una silueta transparente delante tuyo. Poné los bloques donde marca, capa por capa; abajo a la izquierda te dice cuántos faltan de cada uno. Al terminar ganás 5 fichas.</p>`,
    'Celular y sin conexión': () => `
      <p><b>📱 Controles táctiles</b>: el joystick aparece donde apoyás el pulgar izquierdo (empujalo a fondo hacia adelante y corrés solo). A la derecha: ⤒ saltar, ⛏ romper (mantener), ✋ usar (dice lo que va a hacer: Abrir, Hablar, Poner, Comer…), 🏃 correr, ⇩ tirar, y aparecen 🚗 subir/bajar cerca de un vehículo y ⤓ bajar cuando volás, nadás o estás en una escalera. Arriba: pausa, mochila, mapa, marcador, gestos, cámara y foto. En <b>Controles y accesibilidad</b> cambiás el tamaño, la transparencia, la sensibilidad, la vibración y si el joystick es fijo.</p>
      <p>En la <b>mochila</b>, mantené apretada una casilla para moverla rápido (como Shift + clic), y en las recetas usá <b>×5</b> o <b>Máx</b> para fabricar varias.</p>
      <p><b>🔋 Ahorro de batería</b> (en la pausa): limita a 30 cuadros por segundo, baja un poco la resolución y saca las partículas. Ideal para jugar mucho rato en el celu.</p>
      <p><b>⚡ Distancia automática</b> (activada de entrada): si el juego se traba, dibuja un poco menos lejos; cuando vuelve a andar fluido, recupera la distancia que elegiste. Además, lo que está lejos se dibuja sin relieve ni sombras, que no se notan y cuestan mucho.</p>
      <p><b>✈ Sin conexión</b>: la app instalada guarda todo lo necesario la primera vez que la abrís con internet. Después podés jugar tus mundos del dispositivo en el avión o donde no haya señal; lo online (salas, mundo del grupo, aventuras, galería) vuelve cuando haya internet.</p>`,
    'Novedades v10': () => `
      <h3>Interfaz nueva</h3>
      <p>Menú en dos columnas (en el celu acostado entra todo): tus mundos con <b>miniatura</b>, tipo, modo, noches y hace cuánto jugaste. La <b>pausa tiene pestañas</b>: Juego, Opciones, Mundo y Comunidad. Los avisos se <b>apilan</b> en vez de pisarse, y la carga muestra el progreso y consejos.</p>
      <h3>Más lindo</h3>
      <p><b>Nubes</b> que se mueven, <b>estrellas fugaces</b> y <b>auroras</b> en la tundra, los montes y el invierno. Con una <b>antorcha en la mano</b> (o lámpara, orbe o báculo de luz) se ilumina todo alrededor. <b>Luciérnagas</b> de noche, hojas que caen, polvo en el desierto, chispas en las Tierras de Brasa y burbujas bajo el agua. <b>Color de cine</b> según el bioma y la hora, y la cámara se sacude al recibir daño.</p>
      <h3>Agua y viento</h3>
      <p>El <b>agua corre</b>: en los ríos y donde se derrama baja en pendiente y la textura avanza en la dirección de la corriente; en las <b>cascadas</b> cae, con espuma. La superficie tiene <b>olas</b> (más grandes con viento) y con lluvia se ven los <b>anillos de las gotas</b>. Bajo el agua limpia todo se ve azul y con <b>reflejos de luz</b> que bailan sobre el fondo (en el agua tóxica, verde y turbio).</p>
      <p>Hay <b>viento</b> que cambia de dirección y de fuerza, con ráfagas, y sopla más fuerte en las tormentas: mueve las plantas, las flores y las copas de los árboles, inclina la lluvia, empuja las nubes, el humo de las fogatas y el fuego, la arena de las tormentas y las hojas que caen.</p>
      <h3>Luces, sonido y vida</h3>
      <p>Cada luz tiene su <b>color</b> y tiñe lo que ilumina: antorchas y fogatas cálidas, lámpara de uranio verde, cristal arcano violeta, hojas de plata y altar de runas celestes, lava naranja, alarma roja, focos y orbes blancos. De noche las luces tienen un <b>halo</b> que titila con el fuego, y donde se juntan dos luces de distinto color se mezclan en un degradé.</p>
      <p><b>Sonido ambiente</b> (con su propio volumen en Opciones): olas cerca del mar, agua corriendo en ríos y cascadas, viento según la fuerza, pájaros de día y grillos de noche en lugares verdes, chasquidos de fogata, y todo apagado cuando estás bajo el agua. Los <b>pasos</b> suenan distinto en arena, nieve, pasto, madera, metal y agua.</p>
      <p>Los animales y las personas <b>giran la cabeza para mirarte</b> cuando estás cerca. En la arena y la nieve quedan tus <b>huellas</b>, que se borran solas.</p>
      <h3>Clima que se nota</h3>
      <p>Las <b>nubes proyectan sombras</b> que viajan por el terreno con el viento. Con lluvia, lo que está a la intemperie se ve <b>mojado</b> (más oscuro y con brillo); cuando nieva, la <b>nieve se acumula</b> arriba de los bloques y después se derrite de a poco (en la tundra tarda mucho más). Al atardecer el <b>mar refleja el sol en dorado</b>. La lava larga <b>brasas</b>, las criaturas y los objetos tirados tienen <b>sombra</b>, tu personaje <b>salta y nada</b> con su postura (se ve en tercera persona y online), y lo que tenés en la mano se balancea al girar.</p>
      <h3>Más cómodo</h3>
      <p>Al tener un bloque en la mano ves una <b>vista previa transparente</b> de dónde va a quedar. En el celu, <b>deslizá sobre la barra</b> para cambiar de objeto. Opcional: <b>herramienta automática</b> (al romper elige la mejor de la barra). Cuando morís queda un marcador <b>💀 Donde moriste</b> que se borra al volver.</p>
      <p><b>Mochila</b>: buscador de recetas y bloques, y botón <b>↕ Ordenar</b>. <b>📍 Marcadores</b>: <b>N</b> pone uno donde estás (o tocá el mapa grande); se ven en pantalla con la distancia, y si quedan atrás aparece una flecha al costado. 🏠 Casa siempre está. <b>Mapa grande</b> (M): arrastrar, zoom con rueda o pellizco, centrar. <b>Modo foto</b> (F2): filtros (cálido, frío, sepia, blanco y negro, dramático, ensueño), viñeta, campo de visión y cuenta regresiva de 3 s. <b>Consejos</b> que aparecen la primera vez que ves algo nuevo (se pueden apagar). En Opciones: campo de visión, balanceo, sacudón, invertir mirada, color de cine y partículas.</p>`,
    'Control por voz': () => `
      <p>Apretá <b>K</b> (o el botón <b>🎙</b> en el celu) y hablá. Abajo aparece lo que entendió y lo que hizo. Funciona en <b>Chrome</b> (compu y Android) y Edge, y necesita internet: el navegador manda el audio a su servicio de reconocimiento de voz. La primera vez te pide permiso para el micrófono. Se puede activar solo al entrar a un mundo, en <b>Controles y accesibilidad</b>.</p>
      <h3>Qué entiende</h3>
      <ul><li><b>Moverse</b>: «adelante», «caminá», «corré», «atrás», «a la izquierda», «un pasito a la derecha», «pará» (frena todo).</li>
      <li><b>Mirar</b>: «mirá a la derecha / izquierda» (con «mucho» o «un poco»), «mirá arriba / abajo», «mirá al frente», «date vuelta».</li>
      <li><b>Acciones</b>: «golpeá» o «rompé» (sigue hasta que digas «dejá de golpear» o «pará»), «usá», «abrí», «poné», «comé», «saltá», «agachate», «tirá», «subite» o «bajate» de un vehículo.</li>
      <li><b>Objetos y pantallas</b>: «elegí el tres», «siguiente», «abrí la mochila», «mapa», «pausa», «cerrá», «sacá una foto», «marcador», «cámara», «ayuda».</li></ul>
      <p>Se pueden encadenar: «caminá y después saltá». Las órdenes de frenar se cumplen apenas se escuchan, sin esperar a que termines de hablar.</p>`,
    'Mundo vivo': () => `
      <p><b>🏘 Pueblos que crecen</b>: los asentamientos (y las aldeas de Eldra) suben de nivel con los días que pasan y con tu ayuda (misiones y comercio). Cada nivel suma una casa nueva con un vecino. Aparecen en el mapa con su nombre y nivel.</p>
      <p><b>🌙 Rutina</b>: de noche los vecinos, medianos, enanos y elfas vuelven a su casa a dormir; de día salen a pasear y trabajar.</p>
      <p><b>🐾 Animales</b>: los pacíficos andan en manada, escapan de los cazadores y de noche vuelven a su lugar. Los cazadores (lobos, leones, osos, huargos…) persiguen presas cuando no hay nadie cerca.</p>
      <p><b>📜 Historias</b>: cada zona (ciudad, desierto, cráter, zona militar, mar de chatarra, tundra, pantano, bosque y el archipiélago) tiene una historia en 4 partes. Las notas que encontrás en los cofres de esa zona son partes de su historia; las ves en pausa → Mundo → Historias. Completar una da 8 fichas.</p>
      <p><b>🐦 Aves y 🐟 peces</b>: de día pasan bandadas por el cielo, y en el agua limpia nadan cardúmenes de colores que escapan si te acercás.</p>`,
    'Libro y mejoras': () => `
      <p>El <b>📖 Libro del superviviente</b> (tecla <b>O</b> o pausa → Juego → Libro) tiene tres partes:</p>
      <ul><li><b>Colección</b>: animales que viste, minerales que sacaste, biomas que visitaste, recetas que fabricaste y lo que pescaste. Al llegar al 25, 50, 75 y 100% de cada página ganás fichas.</li>
      <li><b>Semana</b>: 3 desafíos que cambian cada lunes (pescar, fabricar, cosechar, comerciar…). Cada uno da 20 fichas y un regalo.</li>
      <li><b>Mejoras</b>: casi todo lo que hacés da experiencia; cada nivel te da un punto para mejorar algo: correr más rápido, aguantar más bajo el agua, romper más rápido, pegar más fuerte, aguantar el frío y el calor, recuperar vida más rápido o tener más suerte en los cofres (hasta 3 niveles cada una).</li></ul>`,
    'Formas y decoración': () => `
      <h3>${icon(405)} Sierra de formas</h3>
      <p>Fabricala (2 lingotes de acero y una tabla) y hacé clic derecho sobre un bloque común (piedra, madera, ladrillo, hormigón…). Cada toque cambia la forma: <b>losa</b> → <b>losa de arriba</b> → <b>escalón</b> (mirando para donde estás vos) → <b>panel</b> → <b>alfombra</b> → otra vez cubo. Conserva el material. Al romperla te devuelve el bloque.</p>
      <h3>Decoración</h3>
      <p>${icon(406)} Maceta · ${icon(407)} Farol · ${icon(408)} Mesa · ${icon(409)} Silla · ${icon(410)} Estante · ${icon(411)} Barril · ${icon(412)} Banco · ${icon(413)} Alfombra roja · ${icon(414)} Caja. Se fabrican en la mesa de trabajo y se apoyan arriba de un bloque mirando hacia vos; con la sierra se giran.</p>
      <h3>Piedras</h3>
      <p>Roca, roca profunda, arenisca (arena en el horno), basalto y toba (ceniza y grava en el horno) tienen versión <b>pulida</b> (4 del material en la mesa), <b>ladrillos</b> y <b>cincelada</b> (a partir de la pulida).</p>
      <h3>Maderas, cercos y puertas</h3>
      <p>El roble y la palmera ahora sueltan su propio tronco: dan <b>tablas de roble</b> y <b>de palmera</b>. Con cada madera (común, roble, palmera y élfica) se hace un <b>cerco</b> (4 tablas y 2 palos) y una <b>puerta</b> (6 tablas).</p>
      <h3>Vitrales</h3>
      <p>Hay 12 vidrios de color. La luz de antorchas y lámparas que pasa por un vitral toma su color.</p>
      <h3>Ruinas</h3>
      <p>Pared derruida, azulejos viejos, cartel oxidado, caños viejos, cables colgando y ventana rota, para armar escenarios abandonados.</p>
      <h3>Hormigón de colores</h3>
      <p>12 colores (rojo, naranja, amarillo, lima, verde, cian, celeste, azul, violeta, rosa, negro y blanco). En la mesa de trabajo: 8 de hormigón y una ficha dan 8 del color que elijas.</p>
      <h3>Herramientas de obra</h3>
      <p>Marcá un área con la ${icon(361)} cinta métrica y abrí el ${icon(362)} plano de obra: <b>rellenar</b> con el bloque que tenés en la mano, <b>vaciar</b>, <b>reemplazar</b> el bloque que mirás por el de la mano y <b>deshacer</b> lo último (también los diseños construidos). Copiar y pegar con rotación sigue en el mismo plano.</p>`,
    'Juntos y comodidad': () => `
      <h3>🤝 Obras del grupo</h3>
      <p>Guardá un diseño con el ${icon(362)} plano de obra; después, mirando el lugar, abrí el plano y elegí el diseño en <b>🤝 Obra del grupo</b>. Las obras en marcha se ven en pausa → Comunidad → Obras del grupo. Aparece una silueta verde: cualquiera que ponga el bloque correcto en su lugar suma al avance, y se lleva la cuenta de quién ayudó. Se puede marcar en el mapa.</p>
      <h3>${icon(415)} Puesto de venta</h3>
      <p>Fabricalo en la mesa (6 tablas, 2 telas y 3 fichas) y apoyalo en el piso. Tocalo con algo en la mano para ponerlo a la venta con el precio que quieras (hasta 9 cosas). Los demás compran con fichas aunque no estés; vos cobrás lo juntado cuando vuelvas.</p>
      <h3>📸 Pose grupal</h3>
      <p>En el modo foto tocá <b>Pose grupal</b>: todos los del grupo saludan a la vez y la foto se saca a los 3 segundos.</p>
      <h3>📱 Táctil a tu gusto</h3>
      <p>En opciones → táctil elegís qué botones se ven y podés activar el <b>modo una mano</b> (todo del lado derecho, con un botón de caminar automático).</p>
      <h3>⚡ Más rápido y menos batería</h3>
      <p>Al abrir el juego <b>seguís donde dejaste</b> (se puede apagar en opciones). El mundo se carga antes hacia donde caminás, y en el menú, en pausa o sin tocar nada por 30 segundos baja los cuadros por segundo para gastar menos batería.</p>
      <h3>✨ Detalles</h3>
      <p>El vidrio y los metales reflejan el cielo y los minerales brillan con destellos cuando estás cerca.</p>`,
    'Logros': () => '__ACH__',
    'Online': () => `
      <h3>Con código de sala (lo más fácil)</h3>
      <ol><li>En la pausa tocá <b>Abrir a amigos</b>. Te aparece un <b>código</b>.</li><li>Tus amigos, desde el menú, tocan <b>Unirse a partida online</b> y lo escriben.</li></ol>
      <p>El mundo vive en tu compu; si salís, la partida termina. Tus amigos conservan su mochila la próxima vez que entren a tu mundo.</p>
      <h3>Servidor dedicado (mundo siempre online)</h3>
      <p>Ejecutá <b>Servidor.bat</b> (o <code>node server.js --dedicado</code>). El mundo queda en la carpeta <code>mundos/</code> y sigue ahí aunque todos se desconecten. Tus amigos entran a <code>http://tu-ip:5173</code> y tocan <b>Entrar al servidor</b>, o escriben la dirección en «Unirse».</p>
      <h3>Partidas públicas</h3>
      <p>En la pausa marcá <b>Partida pública</b> y tu sala aparece en «Partidas públicas» del menú para que cualquiera entre. Funciona cuando el juego se abre desde un servidor de Yermo.</p>
      <h3>Chat de voz</h3><p>En partidas por código, activá <b>Chat de voz</b> en la pausa: se escucha a los que están a menos de 40 bloques, más fuerte cuanto más cerca.</p>
      <h3>Clanes y protección</h3><p>El equipo funciona como clan: los tótems de protección de tu equipo te dejan construir; los de otros, no.</p>
      <h3>PvP y equipos</h3>
      <p>El anfitrión puede activar el <b>PvP</b> en la pausa. Cada jugador elige su <b>equipo</b>: los del mismo equipo no se lastiman y su nombre se ve del mismo color.</p>
      <p class="muted">La conexión por código es directa entre navegadores (WebRTC); en redes muy cerradas puede fallar. El servidor dedicado usa WebSocket.</p>`,
  };
  const mobInfo = {
    boar: 'Pacífico. Huye si lo atacás. Suelta carne. Bosques, desiertos, pantanos y el valle.',
    ghoul: 'Aparece de noche y en cuevas oscuras. Se desintegra al sol. Nunca cerca de antorchas.',
    scorpion: 'Desiertos y cráteres, de día o de noche. Su picadura irradia.',
    rat: 'En grupos, en cuevas y en ciudades de noche. Rápidas y débiles.',
    crow: 'Vuela de día sobre bosques, desiertos y el valle, y se tira en picada. Suelta plumas (virotes mejores).',
    behemoth: 'Jefe de los cráteres. Enorme, lento y devastador. Suelta el Núcleo del Behemot, acero, uranio y planos raros.',
  };

  const nav = $('#guideTabs'), body = $('#guideBody');
  const show = (name) => {
    [...nav.children].forEach((b) => b.classList.toggle('on', b.textContent === name));
    const html = tabs[name]();
    if (html === '__RECIPES__') {
      body.innerHTML = '<p>Abrí la mochila con <b>E</b>. Las recetas iluminadas se pueden hacer ya. Clic = una vez · Shift+clic = varias. Las que dicen <i>Mesa de trabajo</i> u <i>Horno</i> necesitan esa estación a 4 bloques o menos. 🔒 = necesitás el plano.</p>';
      const list = document.createElement('div'); list.className = 'glist';
      for (const r of RECIPES) {
        const row = document.createElement('div'); row.className = 'grow';
        const c = document.createElement('canvas'); c.width = c.height = 48; c.getContext('2d').drawImage(ui.icon(r.out[0]), 0, 0);
        row.appendChild(c);
        const txt = document.createElement('div');
        txt.innerHTML = `<b>${itemName(r.out[0])}${r.out[1] > 1 ? ' ×' + r.out[1] : ''}</b> <small>${r.station ? ST[r.station] : 'a mano'}${r.bp ? ' · 🔒 ' + BLUEPRINT_NAMES[r.bp] : ''}</small><br>` +
          r.in.map(([id, n]) => `${n} ${itemName(id)}`).join(' + ');
        row.appendChild(txt);
        list.appendChild(row);
      }
      body.appendChild(list);
      return;
    }
    if (html === '__MOBS__') {
      const weapons = Object.entries(ITEMS).filter(([, it]) => it.weapon && !it.tool).map(([, it]) => `${it.name} (${it.weapon})`).join(' · ');
      body.innerHTML = Object.entries(MOB_TYPES).map(([k, m]) => `<div class="mob"><b>${m.name}</b> <small>${m.hp / 2} ♥${m.dmg ? ` · golpea ${m.dmg / 2} ♥` : ''}</small><p>${mobInfo[k]}</p></div>`).join('') +
        `<h3>Combate</h3><p>Clic izquierdo para golpear. Daño: puño 1 · herramientas 2-4 · ${weapons}. La <b>ballesta</b> dispara virotes a distancia (clic derecho).</p>`;
      return;
    }
    if (html === '__ACH__') {
      const got = getGame()?.meta.achievements || {};
      body.innerHTML = `<p>${Object.keys(got).length} de ${ACHIEVEMENTS.length} logros${getGame() ? '' : ' (entrá a un mundo para ver tu progreso)'}.</p><div class="glist">` +
        ACHIEVEMENTS.map((a) => `<div class="grow ach ${got[a.id] ? 'got' : ''}"><span class="medal">${got[a.id] ? '🏆' : '🔒'}</span><div><b>${a.name}</b><br><small>${a.desc}</small></div></div>`).join('') + '</div>';
      return;
    }
    body.innerHTML = html;
  };
  nav.innerHTML = '';
  // buscador: filtra las secciones por su contenido
  const search = document.createElement('input'); search.placeholder = '🔍 Buscar en la guía…'; search.className = 'gsearch'; search.autocomplete = 'off';
  nav.appendChild(search);
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const textOf = {};
  for (const k of Object.keys(tabs)) { let h = ''; try { h = tabs[k](); } catch { /* sin texto */ } textOf[k] = norm(k + ' ' + String(h).replace(/<[^>]+>/g, ' ')); }
  search.addEventListener('keydown', (e) => e.stopPropagation());
  search.addEventListener('input', () => {
    const q = norm(search.value.trim());
    let first = null;
    for (const b of nav.querySelectorAll('button')) { const ok = !q || textOf[b.textContent].includes(q); b.hidden = !ok; if (ok && !first) first = b.textContent; }
    if (q && first) show(first);
  });
  for (const k of Object.keys(tabs)) { const b = document.createElement('button'); b.textContent = k; b.onclick = () => show(k); nav.appendChild(b); }
  return {
    open(tab) { $('#guide').hidden = false; show(tab || 'Cómo se juega'); },
    close() { $('#guide').hidden = true; },
  };
}
