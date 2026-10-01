# YERMO

Sandbox voxel postapocalíptico en 3D para el navegador. Three.js, sin dependencias de build.

## Cómo jugar

- **Solo o con código de sala:** doble clic en **`Jugar.bat`** (o `node server.js`) → http://localhost:5173
- **Servidor dedicado (mundo siempre online):** doble clic en **`Servidor.bat`** (o `node server.js --dedicado --mundo NOMBRE [--tipo brew] [--semilla S] [--creativo] [--pvp] [--puerto 5173]`). El mundo se guarda en `mundos/NOMBRE/`. Los amigos entran a `http://TU-IP:5173` y tocan **Entrar al servidor**.

## Mundo del grupo (en la nube)

Menú → **☁ Mundo del grupo**: cada uno crea su cuenta (usuario y contraseña) y ve **sólo los mundos de los que es miembro**. Los mundos son privados: para sumarse a uno hace falta su **código de invitación**, que ve sólo el creador (en ⚙, donde también puede echar miembros o cambiar el código). Al tocar **Entrar**, si alguien está jugando te conectás a su partida; si no, la abrís vos. El mundo y el progreso de cada uno quedan guardados en Supabase. Si el anfitrión se va, otro toma la posta solo.

Preparación (una sola vez, en el proyecto de Supabase): correr [`supabase/schema.sql`](supabase/schema.sql) en el SQL Editor y desactivar *Authentication → Providers → Email → Confirm email*.

## Controles

| Tecla | Acción |
|---|---|
| WASD · Shift · Espacio | Moverse · correr · saltar/nadar/trepar |
| Clic izquierdo (mantener) | Romper · golpear |
| Clic derecho | Colocar · comer/tomar · usar mesa, horno, cofre, máquina, puerta, catre · disparar ballesta · equipar armadura |
| E | Mochila, fabricación, cofres y máquinas |
| Q / Ctrl+Q | Tirar un ítem / la pila |
| F | Subir/bajar de la moto |
| M | Mapa grande (minimapa siempre visible) |
| J · B | Diario (historia, desafíos, facciones, cervezas) · gestos |
| 1–9 / rueda | Elegir ítem |
| T · G · F3 · Esc | Chat · guardar · datos técnicos · pausa |
| Joystick | Stick izq. moverse, der. mirar, A saltar, RT romper, LT usar, X mochila, Y mapa, LB/RB ítem, R3 moto, Start pausa |
| Celular/tablet | Joystick virtual, deslizar para mirar, botones en pantalla |

## Qué incluye

**Mundo** — Infinito y procedural: bosque muerto, desierto de ceniza, pantano tóxico, ciudad en ruinas (con **hospitales** y **subte**), cráteres radiactivos y el **Valle cervecero**. Búnkeres, **estaciones de servicio**, **antenas de radio** y **cervecerías abandonadas**. Cuevas con **lagos de lava**. **Clima**: tormentas de ceniza y lluvia ácida. Ciclo día/noche.

**Supervivencia** — Vida, hambre, radiación, aire, caídas, lava. Comida, botiquines, antirad. **Armaduras** (casco, chaleco, acero, traje antirradiación, máscara de gas). Catre para reaparecer y dormir.

**Construcción** — 104 bloques: **cofres**, **puertas**, **escaleras de mano**, **losas**, antorchas de pared. **Agua y lava que fluyen** y **baldes**.

**Criaturas** — Jabalí mutante, necrófago, escorpión radiactivo, **rata gigante**, **cuervo mutante** (vuela) y el jefe **Behemot**. Combate cuerpo a cuerpo y **ballesta**.

**Progresión** — 57 recetas, **planos** que desbloquean recetas avanzadas, **21 logros**, **electricidad** (generador, panel solar, cables, focos, cerco eléctrico), **moto de chatarra**, **agricultura** (cebada, lúpulo, papa).

**🍺 Cervecería** — Cultivá cebada y lúpulo → malteá en el horno → molé en el **molino** → cociná el mosto en la **olla** (agua limpia + malta + lúpulo + carbón) → fermentá con levadura en el **fermentador** (más rápido bajo techo) → Pale Ale, Stout de Ceniza o IPA Radiactiva, cada una con su efecto. Tipo de mundo **Cervecero** para arrancar en el valle con las recetas aprendidas.

**Online** — Por código de sala (WebRTC/PeerJS) o **servidor dedicado** (WebSocket, sin dependencias). Hasta 8 jugadores. Bloques, cofres, máquinas, criaturas, ítems tirados, motos, clima y hora sincronizados. **PvP opcional y equipos**. Los invitados conservan su inventario. En el servidor dedicado, si el jugador que simula se va, otro toma la posta.

**Presentación** — Tutorial interactivo, guía completa, minimapa y mapa grande, partículas al romper, agua con reflejos, sombras de criaturas, calidad gráfica baja/media/alta, música y efectos procedurales.

**v5 — 31 mejoras**
- 🍺 **Cerveza avanzada**: barriles de añejamiento (★ a ★★★★★), 4 estilos nuevos (Porter de Humo, Sour de Pantano, Lager Helada, Barleywine del Behemot), calidad según techo/limpieza/heladera, **taberna** propia con chopera que vende sola, **destilería** (alcohol = nafta y desinfectante), **cocina** en fogata.
- 🌍 **Mundo**: bosque de hongos gigantes, tundra nuclear, ríos y lagos, **asentamientos** con líder y misiones, **laboratorios** subterráneos de 3 pisos con trampas y el Mutante alfa, notas con la historia del yermo, **comerciantes errantes**.
- 🏁 **Autódromo abandonado**: pista con largada, curvas, tribunas, boxes con autos de carrera, motos de pista y camiones, torre de control, **carreras** con semáforo, vueltas, puntos de control, posiciones, récords y el **instructor** (IA en 3 niveles). Carreras multijugador.
- 🚗 **Vehículos**: moto, moto de cross, moto de pista, auto (baúl), camión (caja, atropella), auto de carrera, bote; nafta, daño y reparación, bocina, faros, acompañantes.
- 🧍 **Supervivencia**: sed, temperatura (fogatas, abrigo), enfermedades (infección, intoxicación), **hordas** cada 7 noches, armas de fuego, perros domesticables, 3 jefes nuevos (Reina de las ratas, Leviatán tóxico, Mutante alfa).
- 🔧 **Construcción**: escaleras y losas de varios materiales, muebles, vidrios de colores, cortinas, **tolvas y cintas**, palancas, sensores, puertas automáticas, alarmas, **torretas**, tótem de **protección de terreno**.
- 🌐 **Online**: lista de **partidas públicas**, clanes (equipos) con protección, **chat de voz por proximidad**, skins de personaje.
- 🎨 **Gráficos**: **sombras del sol** (calidad alta), niebla baja, fases lunares, faros que iluminan, **tercera persona** (V), **modo foto** (F2 / P).
- Combo de **semillas** con mundos preseleccionados (incluido 🏁 Autódromo) y 35 logros.

**v6 — 30 mejoras**
- 📜 **Historia principal** de 8 misiones (la señal, el laboratorio, el Abismo, el Guardián), **facciones** con reputación y tiendas (Cerveceros, Chatarreros, Hermandad del Acero), **diario** (J) y **desafíos diarios**.
- 🪙 **Fichas** (prensa) y **banco** con interés, **empleados** (granjero, guardia, cervecero), **repartos y rutas comerciales**, **concurso cervecero** cada 7 días y **cervezas con nombre propio**.
- 🌍 **Mar de chatarra** (barcos varados, piratas), **zona militar** (alambrados, tanques, cajas militares, soldados y minas), **ciudad subterránea** con mercado y banco, **trenes del subte**, y **el Abismo**: mazmorra infinita por niveles con un Guardián cada 5.
- ⛈ **Clima extremo** (tormentas eléctricas con rayos, tornados, nieve), **fuego que se propaga**, **estaciones del año** y **eventos** (caravanas, meteoritos, aviones caídos).
- 🔫 **Asaltos de bandidos** a tu base (rompen puertas, roban cofres), **arco**, **granadas**, **lanzallamas**, **minas**, **monturas** (jabalí y lobo).
- 🚗 **Taller** (motor, cubiertas, blindaje, nitro, pintura), **pistas propias** con banderas y conos, **campeonato** de 5 fechas contra 4 pilotos, **helicóptero**, **vagonetas sobre vías**.
- 🔧 **Planos de obra** (copiar y pegar construcciones, se guardan entre mundos), **cañerías, bombas y aspersores**, **ascensores**, **carteles** y **gestos** (B).
- 🎵 **Música dinámica** según el bioma y la situación (explorar, peligro, carrera, taberna, abismo). 51 logros.

**v8 — Bioparque y criaturas con textura**
- 15 animales nuevos: león, jirafa, elefante, cebra, gorila, oso, cocodrilo, avestruz, canguro, flamenco, pingüino, hipopótamo, serpiente, mono y rinoceronte (pacíficos, neutrales y depredadores). Algunos también viven en la tundra, el pantano y el desierto.
- **Bioparque**: zoológico abandonado con sabana, acacias, recintos rotos, estanques, pileta de pingüinos, casa de reptiles, fuente y carteles. Semilla **🦁 Bioparque**.
- Monturas nuevas: cebra, avestruz y elefante (2 asientos y baúl).
- Texturas en todas las criaturas (pelaje, escamas, plumas, piel, rayas, manchas) y el personaje con cara, manos, botas, cinturón y mochila.

**v9 — Reinos de Eldra** (tipo de mundo / semilla **🧙 Reinos de Eldra**, sin historia: explorás a tu ritmo)
- Cinco reinos: **Colinas de Valverde** (aldeas de medianos en cuevas redondas), **Bosque de Lunaria** (árboles gigantes y de plata que brillan), **Montes de Hierroalto** (minas enanas con mithril), **Ciénaga Sombría** (telarañas y arañas gigantes) y **Tierras de Brasa** (basalto, lava y la guarida del dragón sobre su oro). Torres de magos y castillos en ruinas con cofres antiguos.
- Criaturas: orcos y huargos de noche, **trolls que se vuelven piedra con el sol**, arañas venenosas, ents (tranquilos hasta que los molestás), caballos para domesticar y montar, y el **Dragón de Brasa** (vuela y escupe fuego).
- **Magia**: barra de maná ✦ que se recarga sola (más rápido junto a un altar de runas). Báculos de luz, fuego, curación, escudo y viento; anillos de rapidez, visión nocturna y sigilo (funcionan en la mochila); pociones de vida y maná en la mesa de alquimia. El mago de la torre vende el Tomo de hechizos.
- Comercio con medianos, enanos, elfas y magos (se paga con fichas de oro). Espadas de hierro y élficas, escudo, cota y herramientas de mithril, yelmo de escamas de dragón.

**v9.1 — Accesibilidad, fechas reales y dron**
- 🎮 **Controles y accesibilidad**: teclas configurables, corrección de color para daltonismo, letra grande y alto contraste.
- 🧸 **Modo chicos** (regla del mundo): sin monstruos, sin hambre, sed ni radiación.
- 🕐 **Hora real** (regla): día, noche y estación según tu reloj. **Fechas especiales** reales: noche de brujas, Navidad, año nuevo, Pascua, fiestas patrias y día del amigo.
- 🛸 **Dron compañero**: imán de ítems, escáner de minerales y cofres y alerta de criaturas. **Cohetes** de fuegos artificiales y regalos.

**v9.2 — Defensa y una sola vida**
- 🛡 **Defensa del refugio** cooperativa: un núcleo que hay que proteger de 10 oleadas de mutantes (orcos y trolls en Eldra), con premios por oleada.
- ☠ **Una sola vida**: modo roguelike, criaturas cada vez más fuertes, puntaje al morir y **ranking** local y en la nube.

**v9.3 — Archipiélago**
- 🏝 Tipo de mundo con mar abierto, islas con palmeras, corales, naufragios con cofres del tesoro y faros.
- 🎣 Pesca con caña (hay que reaccionar cuando pica), peces dorados y premios; 🤿 tanque de buceo; ⛵ velero con carga; cocos.

**v9.4 — Minijuegos** (mesa de minijuegos): el piso es lava, spleef, parkour, escondidas y captura la bandera, con arenas que se arman solas y récords.

**v9.5 — Circuitos, música y pintura**: pulsadores, placas de presión y pilas; bloques musicales con 6 instrumentos según el bloque de abajo; caja musical con melodías escritas (do re mi…) que suenan con electricidad; lienzos para pintar cuadros de 16 × 16.

**v9.6 — Naturaleza viva**: plantines que crecen solos, crías de animales domesticados, mascotas con nombre, collar y 5 niveles (traen cosas, avisan del peligro), tormentas de arena, niebla espesa, mareas en el archipiélago y peces que se agotan.

**v9.7 — Comunidad**: aventuras hechas por los jugadores (inicio, controles, trofeos y meta; se publican y se juegan desde el menú), buzón entre miembros con objetos, marcas compartidas en el mapa y galería de fotos del grupo. Requiere volver a correr `supabase/schema.sql`.

**v9.8 — Aprender y construir**: modo aprender con el robot Profe Robi (cuentas y palabras por niveles), cofres con acertijo (con preguntas propias) y construcción guiada capa por capa con silueta fantasma.

**v9.9 — Celular y sin conexión**: ahorro de batería (30 FPS), distancia de visión automática, relieve y sombras sólo de cerca, y la app instalada guarda todo para jugar sin internet (aviso en el menú). Al agregar un archivo nuevo en `js/`, sumarlo a la lista de `sw.js`.

**v10 — Vuelta de rosca visual y de interfaz**
- Interfaz: menú en dos columnas con miniaturas de los mundos, pausa con pestañas, avisos apilados, pantalla de carga con progreso y consejos, tema visual más pulido.
- Visual: nubes, estrellas fugaces, auroras, luz dinámica de la antorcha en la mano, partículas del ambiente (luciérnagas, hojas, polvo, chispas, burbujas), color de cine por bioma, sacudón de cámara.
- Comodidad: buscador y orden en la mochila, marcadores en pantalla y en el mapa, mapa grande con zoom y arrastre, modo foto con filtros, consejos la primera vez, opciones de cámara.

**v10.1 — Celular y pulido**: controles táctiles nuevos (joystick flotante, botones con íconos, «Usar» que dice qué hace, botones que aparecen según la situación, vibración, tamaño/opacidad/sensibilidad), mochila en dos columnas en el celu con mover rápido y fabricar ×5/Máx, guía con índice al costado y buscador, tamaño de la interfaz ajustable, indicador de dónde viene el daño, pulso rojo con poca vida, estilos de mira, pantalla de muerte nueva y pulido de casillas, avisos y logros.

**v10.2 — Agua y viento**: agua que corre en pendiente según su nivel, cascadas con espuma, olas, anillos de lluvia, reflejos de luz bajo el agua (azul en agua limpia), viento con dirección, fuerza y ráfagas que mueve plantas, flores, copas, lluvia, nubes, humo de fogatas y partículas.

**v10.3 — Control por voz**: con K o el botón 🎙, frases en castellano («adelante», «corré», «pará», «golpeá», «dejá de golpear», «mirá a la derecha», «saltá», «abrí la mochila», «elegí el tres»…), encadenables y con indicador de lo que entendió. Usa el reconocimiento del navegador (Chrome/Edge).

**v10.4 — Luces, sonido y vida**: luces de colores que tiñen el entorno y halos de noche, sonido ambiente por capas (olas, agua, viento, pájaros, grillos, fogata, bajo el agua) con volumen propio, pasos según la superficie, animales que te miran, huellas en arena y nieve, vista previa al construir, deslizar la barra en el celu, herramienta automática y marcador de donde moriste.

**v10.5 — Clima que se nota**: sombras de nubes sobre el terreno, superficies mojadas con lluvia, nieve que se acumula y se derrite, mar dorado al atardecer, brasas de la lava, sombras bajo criaturas y objetos, posturas de salto, caída y nado, y la mano que se balancea con inercia.

**v10.7 — Mundo vivo**: pueblos que crecen con casas y vecinos nuevos, rutina de día y de noche, manadas, cazadores y presas, historias de 4 partes por zona, aves en bandada y peces en el agua limpia.

**v10.8 — Progresión**: libro de colección con premios, desafíos semanales y experiencia con 7 mejoras del personaje.

**v10.9 — Construcción**: sierra de formas (losa, escalón, panel y alfombra de cualquier material), 9 decoraciones (maceta, farol, mesa, silla, estante, barril, banco, alfombra, caja) y herramientas de obra (rellenar, vaciar, reemplazar, deshacer).

**v11.0 — Juntos**: obras del grupo con silueta y aportes, puestos de venta que funcionan sin el dueño, pose grupal para fotos, botones táctiles a elección y modo una mano, seguir donde dejaste al abrir, carga anticipada hacia donde caminás, ahorro de batería en reposo, reflejos del cielo en vidrio y metal y destellos en minerales.

**v12.0 — Lugar para crecer**: los bloques pasan a guardarse en 16 bits (hasta ~3300 bloques nuevos, desde el id 1024; del 256 al 1023 siguen siendo ítems) y el atlas de texturas pasa a 1536×1536 (hasta 1024 texturas). Los mundos guardados antes se convierten solos al cargarlos (en el navegador, en la nube y en el servidor dedicado). Primeros bloques nuevos: hormigón de 12 colores.

**v12.1 — Materiales**: familias de piedra (pulida, ladrillos y cincelada de roca, roca profunda, arenisca, basalto y toba), 6 vidrios nuevos y luz teñida por los vitrales, tablas de roble y palmera, cercos y puertas de 4 maderas, y 6 bloques de ruina.

**v12.2 — Mundo**: biomas nuevos (cañones rojos, salar y campo de géiseres con géiseres que te lanzan), hongos gigantes, cuevas con estalactitas, hongos que brillan, cristales, lagos subterráneos y obsidiana; cuarzo y herramientas de obsidiana.

**v12.3 — Mecanismos y cocina**: molinos de viento con aspas que giran, baterías recargables, compuertas de agua, farolas y lámparas colgantes, regadores de huerta, cintas que llevan al jugador, horno de barro con 6 comidas que dan efectos (abrigo, visión nocturna, velocidad, recuperación, defensa y fuerza) y ruinas más variadas en las ciudades.

**v12.4 — Hogar**: camas de colores y elegir en cuál aparecer al morir, cocina (también sirve para cocinar), mesada con pileta, biblioteca de roble, 8 decoraciones nuevas (sillón, mesa de luz, florero, macetas con cactus, helecho y hongo, cajonera, perchero), marcos para colgar copias de tus dibujos y carteles de pared.

**v12.5 — Terreno sin repetición**: la piedra, la tierra, el pasto, la arena y la nieve cambian un poco de tono por zonas (más claro, más oscuro, más cálido o más frío), así el terreno no se ve como un mosaico repetido.

**v12.6 — Orden y logros**: categorías en la fabricación y en la paleta creativa (Construir, Decorar, Máquinas, Equipo, Comida, Otros), 8 logros nuevos y un panel de novedades que avisa qué cambió en cada versión.

**v12.7 — Fauna y aventuras**: cabras montés que se domestican y se ordeñan (queso y dulce de leche), lagartijas y murciélagos, 6 misiones nuevas en los pueblos, desafíos diarios y semanales de cocinar y ordeñar, página de Cocina en el libro, tormentas de arena en los cañones, sonido de los géiseres y carga de baterías compartida en línea.

**v12.8 — Tesoros**: mapas del tesoro con una X en el piso y un cofre enterrado, pueblos fantasma en los cañones rojos, comerciante que compra y vende lo nuevo y logro Cazatesoros.

**v12.9 — Globo aerostático**: un vehículo volador lento y tranquilo para explorar desde arriba (baja solo si no hacés nada).

**v13.0 — Cielo, mapa y fotos**: eclipses y lluvias de estrellas, filtros en el mapa grande (con camas y géiseres), modo foto con hora y clima a elección, agua quieta que refleja el cielo, plantas que se aplastan al pasar y descripción de objetos manteniendo apretado en el celular.

**v13.1 — Caravanas, faros y estaciones**: caravanas de comerciantes que se pueden escoltar, faros con haz giratorio, templos hundidos en el mar, nieve en las mesetas en invierno, salar inundado tras la lluvia y géiseres más activos de noche.

**v13.2 — Pincel, portones y planos**: pincel para teñir hormigón, vidrio y camas, portón automático que se abre al acercarte y planos compartibles como código de texto.

**v13.3 — Con amigos**: el mundo sigue mientras no estás (cultivos y baterías), paquetes de hasta 4 objetos por el buzón, carreras en globo con ranking y concurso semanal de construcción con votos (hay que volver a correr `supabase/schema.sql` para los votos).

**v13.4 — Recuerdos y mascotas**: álbum de viaje automático, «Grabar recorrido» (video de 30 s de tu mundo), perro que olfatea tesoros, cabra que avisa del peligro y música propia de los biomas nuevos.

**v14.0 — Buenos Aires**: nuevo tipo de mundo con una réplica del centro porteño en escala real: la Avenida 9 de Julio (140 m, Metrobús, plazoletas con jacarandás, palos borrachos y tipas), el Obelisco en la Plaza de la República con las letras «BA», Corrientes con los carteles del Gran Rex y el Ópera, la Diagonal Norte, el Teatro Colón, carteles con los nombres de las calles, palomas y tango.

**Base equipada** — Tipo de mundo con todo listo desde el inicio: hangar con autos y motos, helicóptero, bote, tren y vagoneta sobre vías, monturas, taller con todas las estaciones y cofres llenos, todos los planos aprendidos.

**Reglas del mundo** — Al crear el mundo (y después desde la pausa): radiación sí/no, animales mutantes que atacan de día sí/no y humanos armados (bandidos, piratas y soldados) sí/no, apagado por defecto. En línea las decide el anfitrión. El nombre también se cambia desde la pausa.

**Gráficos v7 — texturas HD**
- Texturas de **32×32** (antes 16×16): ~60 rediseñadas a mano con ruido tileable, celdas y alturas propias (piedra con fisuras, ladrillos con junta, tablas con veta y clavos, corteza con musgo, chapa con remaches, óxido en capas, minerales facetados, lava con grietas incandescentes, agua con cáusticas…); el resto, ampliadas con detalle fino.
- **Relieve** (normal maps) que reacciona al sol, la luna, las antorchas y los faros; **brillo especular** por material (metal, vidrio, hielo, barro mojado).
- **Variación por bloque** (rotación/espejo y tono) para que no se note la repetición, **tinte del pasto según el bioma** con transición suave.
- **Animaciones**: agua que fluye, lava que late, portal que gira, llamas que titilan y plantas que se mecen. Píxeles **emisivos** (uranio, lava, lámparas, hongos) que brillan en la oscuridad.
- **Mipmaps y filtrado anisotrópico** sin sangrado entre texturas (atlas con bordes). En calidad Baja se desactivan los efectos.
- **Paquetes de texturas**: Opciones → Exportar plantilla (PNG de 16 columnas), editala y Cargar paquete. Los tiles vacíos conservan la textura original.

## Estructura

```
js/blocks.js       bloques, ítems, recetas, botín y planos
js/worldgen.js     terreno, biomas y estructuras
js/mesher.js       mallado + luz (en workers): cubos, cajas, plantas, líquidos
js/world.js        chunks, raycast, guardado, ediciones en red
js/sim.js          cofres y máquinas, cultivos, líquidos, electricidad
js/player.js       física, interacción, supervivencia, combate, vehículos
js/entities.js     criaturas, ítems tirados, virotes, motos
js/net.js          online (PeerJS + WebSocket)
js/fx.js           clima y partículas
js/map.js          minimapa y mapa grande
js/achievements.js logros
js/input.js        joystick y controles táctiles
js/tutorial.js     tutorial interactivo
js/guide.js        guía de consulta
js/ui.js           hotbar, mochila, fabricación, cofres y máquinas
js/textures.js     atlas pixel-art procedural e íconos
js/audio.js        efectos, clima, motor y música procedurales
js/main.js         render, cielo, HUD, menús y bucle principal
js/features.js     v5: entorno, hordas, NPC, armas, cámara, sombras, modo foto
js/features2.js    v6: campaña, facciones, economía, eventos, clima extremo, armas, Abismo, planos, gestos, música
js/race.js         carreras, pistas propias, pilotos IA y campeonato
js/npc.js          comercio, misiones y notas
js/voice.js        chat de voz por proximidad
server.js          servidor web + servidor dedicado
tools/             pruebas y utilidades de desarrollo
```

## Publicar

Es un sitio estático (salvo el servidor dedicado): se sube tal cual a Vercel, Netlify, GitHub Pages o itch.io (zip). El servidor dedicado necesita un host con Node (una PC propia, Render, Fly.io, un VPS…).
