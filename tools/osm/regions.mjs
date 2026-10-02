// Zonas reales que se convierten en mundos (ver dl_api.mjs y build.mjs).
// rect: rectángulo de la grilla en metros, ya girada (x0, z0, x1, z1), con el origen en `origin`.
// axis: calle que queda a lo largo del eje z (se toma su dirección media cerca de `near`).
export const REGIONS = {
  ba: {
    out: 'ba_centro',
    inputs: /^[bhoa]_.*\.json$/, // en tools/osm (datos ya bajados para la v14)
    origin: 'obelisco',
    axis: { name: /9 de Julio/i, highway: /^(trunk|primary|secondary)/ },
    lim: 1750,
    defaultHeight: 19, // sin dato: 6 pisos
    plazaTrees: true,
    // edificios con la fachada dibujada a mano (silueta real del mapa; ver js/hitos3d.js).
    // target: el lugar al que mira la fachada principal. h: altura de la fachada (aproximada si el mapa no la tiene).
    facades: [
      { way: 185738988, style: 'rosada', h: 20, target: 'Pirámide de Mayo' },
      { way: 293947112, style: 'cabildo', h: 11, target: 'Pirámide de Mayo' },
      { way: 265344159, style: 'catedral', h: 20, target: 'Pirámide de Mayo', porch: 5 },
      { way: 23633911, style: 'colon', h: 18.5, target: 'Plaza Lavalle' },
      { rel: 2468981, style: 'congreso', h: 26, target: 'Plaza del Congreso' },
      { way: 720034699, style: 'piramide', h: 0, target: 'Plaza de Mayo' },
      { way: 173065810, style: 'fragata', h: 0, target: 'Puente de la Mujer' }, // Fragata Sarmiento: la proa mira al puente
      { way: 720034722, style: 'ecuestre', h: 0, target: 'Museo Casa Rosada' }, // Monumento a Belgrano: el caballo mira a la Casa Rosada
    ],
  },
  hurlingham: {
    out: 'hurlingham',
    dir: 'hurlingham',
    origin: [-34.5901, -58.6281], // Plaza John Ravenscroft
    approxRot: 45.5,
    axis: { name: /^Pedro de Mendoza$/, near: [-34.5883, -58.6275], radius: 700 },
    rect: [-650, -1850, 1300, 350],
    defaultHeight: 4, // sin dato: casas de una planta
    bigHeight: [600, 7], // los galpones y edificios grandes sin dato, de 7 m
    suburb: true, // terrenos con jardín, veredas angostas, techos de tejas
    overture: true, // siluetas de Google Open Buildings y Microsoft (Overture Maps)
    // el óvalo del hipódromo de trote no está en OpenStreetMap: calcado de la foto satelital
    track: { x: 1097, z0: -1611, z1: -1153, r: 108, w: 20 },
    landmarks: [{ kind: 'santaTrinidad', at: [-34.5883229, -58.6274919], a: 'Pedro de Mendoza', b: 'Isabel La Católica' }],
  },
};
