# YERMO

Sandbox voxel postapocalíptico en 3D para el navegador. Three.js, sin dependencias de build.

## Cómo jugar

- **Solo o con código de sala:** doble clic en **`Jugar.bat`** (o `node server.js`) → http://localhost:5173
- **Servidor dedicado (mundo siempre online):** doble clic en **`Servidor.bat`** (o `node server.js --dedicado --mundo NOMBRE [--tipo brew] [--semilla S] [--creativo] [--pvp] [--puerto 5173]`). El mundo se guarda en `mundos/NOMBRE/`. Los amigos entran a `http://TU-IP:5173` y tocan **Entrar al servidor**.

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

**Reglas del mundo** — Al crear el mundo (y después desde la pausa): radiación sí/no y animales mutantes que atacan de día sí/no. En línea las decide el anfitrión. El nombre también se cambia desde la pausa.

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
