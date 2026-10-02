import * as THREE from 'three';
import { BLOCKS, ITEMS, isBlock, T, HEIGHT, BLUEPRINT_NAMES, ATLAS, tileUV, LIQ } from './blocks.js';
import { buildAtlas, drawIcon, exportTemplate, applyPack } from './textures.js';
import { World } from './world.js';
import { WorldGen, BIOME_NAMES } from './worldgen.js';
import { Player } from './player.js';
import { Inventory } from './inventory.js';
import { UI } from './ui.js';
import { Sfx } from './audio.js';
import { Storage } from './storage.js';
import { Mobs, Drops, Projectiles, Vehicles } from './entities.js';
import { Tutorial } from './tutorial.js';
import { setupGuide } from './guide.js';
import { Net, TEAMS, Avatar } from './net.js';
import { Sim, k3 } from './sim.js';
import { MapView } from './map.js';
import { Achievements, ACHIEVEMENTS } from './achievements.js';
import { Weather, Particles, WEATHER_NAMES } from './fx.js';
import { Input } from './input.js';
import { createFeatures } from './features.js';
import { createFeatures2, TAME } from './features2.js';
import { createEldra } from './eldra.js';
import { setupAccess, createExtras } from './extras.js';
import { createModes, openRanking } from './modes.js';
import { createSea } from './sea.js';
import { createMinigames } from './minigames.js';
import { createCreative } from './creative.js';
import { createNature } from './nature.js';
import { createSocial, openAdventures } from './social.js';
import { createLearn } from './learn.js';
import { createVisuals } from './visuals.js';
import { createUX } from './ux.js';
import { createVoiceCmd } from './voicecmd.js';
import { createLife } from './life.js';
import { createProgress } from './progress.js';
import { createBuilding } from './building.js';
import { createTogether } from './together.js';
import { createGeo } from './geo.js';
import { createMachines } from './machines.js';
import { createHome } from './home.js';
import { createNews } from './news.js';
import { createWildlife } from './wildlife.js';
import { createQol } from './qol.js';
import { createWorld13 } from './world13.js';
import { createBuild13 } from './build13.js';
import { createFriends13 } from './friends13.js';
import { createMemories } from './memories.js';
import { createBaires } from './baires.js';
import { createTaxi } from './taxi.js';
import { loadBA, isReal } from './badata.js';
import { createTreasure } from './treasure.js';
import { Cloud } from './cloud.js';
import { Race } from './race.js';
import { Voice } from './voice.js';
import { VEHICLE_TYPES } from './entities.js';

const $ = (s) => document.querySelector(s);
const DAY_LEN = 1200; // segundos por ciclo completo

// ---------- Render base ----------
const canvas = $('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.autoClear = false;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 1000);
const handScene = new THREE.Scene();
const handCam = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.01, 10);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = handCam.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix(); handCam.updateProjectionMatrix();
});

const atlasCanvas = buildAtlas();
// color y material como texturas de datos (sin premultiplicar), con mipmaps y filtrado anisotrópico
const mkTex = (data, srgb) => {
  const t = new THREE.DataTexture(data, ATLAS.size, ATLAS.size, THREE.RGBAFormat);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
};
const atlas = mkTex(atlasCanvas.colorData, true);
const matAtlas = mkTex(atlasCanvas.matData, false);

const uniforms = {
  map: { value: atlas },
  matMap: { value: matAtlas },
  texFx: { value: 1 }, // 0 = texturas simples (calidad baja)
  daylight: { value: 1 },
  skyTint: { value: new THREE.Color(1, 0.95, 0.88) },
  fogColor: { value: new THREE.Color() },
  fogNear: { value: 40 }, fogFar: { value: 90 },
  time: { value: 0 },
  underwater: { value: 0 }, uwCol: { value: new THREE.Color(0.18, 0.26, 0.06) }, uwFar: { value: 14 },
  sunDir: { value: new THREE.Vector3(0, 1, 0) },
  waterFx: { value: 1 },
  // sombras del sol
  shadowMap: { value: null }, shadowMatrix: { value: new THREE.Matrix4() }, shadowOn: { value: 0 },
  // niebla baja y luna
  fogHeight: { value: 1 }, moonLight: { value: 1 },
  // faros de vehículos
  hlPos: { value: new THREE.Vector3() }, hlDir: { value: new THREE.Vector3(0, 0, -1) }, hlOn: { value: 0 },
  // luz que lleva el jugador en la mano
  plPos: { value: new THREE.Vector3() }, plOn: { value: 0 }, plCol: { value: new THREE.Color(1, 0.72, 0.42) }, plR: { value: 10 },
  // v13: pies del jugador (plantas que se aplastan) y colores del cielo (reflejo del agua quieta)
  meP: { value: new THREE.Vector3(0, -999, 0) }, skyTopC: { value: new THREE.Color() }, skyHorC: { value: new THREE.Color() },
  // viento (dirección × fuerza) y lluvia, para plantas, hojas y agua
  wind: { value: new THREE.Vector2(0.3, 0.1) }, rain: { value: 0 },
  // nieve acumulada y sombras de nubes sobre el terreno
  snow: { value: 0 }, cloudOff: { value: new THREE.Vector2() }, cloudCov: { value: 0.45 },
};
const vert = /* glsl */`
  attribute vec4 lit; attribute vec4 tinf; attribute vec4 tint; attribute vec3 lcol;
  uniform float time; uniform vec2 wind; uniform vec3 meP;
  varying vec2 vUv; varying vec4 vLit; varying float vDepth; varying vec3 vWorld; varying vec3 vTint;
  flat varying vec4 vInf; varying vec3 vLcol;
  void main() {
    vUv = uv; vLit = lit; vInf = tinf; vTint = tint.rgb * 2.0; vLcol = lcol;
    vec3 p = position;
    vec4 wp = modelMatrix * vec4(p, 1.0);
    // plantas: la parte de arriba se mece con el viento
    int fl = int(tinf.y + 0.5), fc = int(tinf.z + 0.5);
    float wk = length(wind);
    if ((fl & 16) != 0) {
      // ráfagas: una onda que viaja en la dirección del viento
      float gust = 0.6 + 0.4 * sin(time * 0.9 + dot(wp.xz, wind) * 0.35);
      if (fc == 6) {
        float cellY = floor(tinf.x / 32.0) * 48.0 + 8.0;
        float ly = ((1.0 - uv.y) * 1536.0 - cellY) / 32.0;
        // pisadas: la planta se aparta y se aplasta cuando pasás encima
        { vec2 dd = wp.xz - meP.xz; float dist = length(dd), hy = abs(wp.y - meP.y - 0.5);
          if (dist < 1.4 && hy < 1.2 && ly < 0.5) { float k = (1.4 - dist) / 1.4; wp.xz += normalize(dd + 0.0001) * k * 0.45; wp.y -= k * 0.38; } }
        if (ly < 0.5) {
          float amp = 0.05 + wk * 0.12;
          wp.x += sin(time * (1.7 + wk) + wp.x * 0.7 + wp.z * 0.3) * amp + wind.x * 0.12 * gust;
          wp.z += cos(time * (1.3 + wk) + wp.z * 0.8 + wp.x * 0.2) * amp * 0.7 + wind.y * 0.12 * gust;
        }
      } else {
        // copas de los árboles: se mecen enteras, suave
        float amp = (0.012 + wk * 0.035) * gust;
        wp.x += sin(time * 1.4 + wp.y * 0.6 + wp.z * 0.4) * amp + wind.x * 0.02 * gust;
        wp.z += cos(time * 1.1 + wp.y * 0.5 + wp.x * 0.4) * amp + wind.y * 0.02 * gust;
      }
    }
    // olas en la superficie del agua (más con viento)
    if ((fl & 4) != 0 && fc == 2) {
      float a = 0.025 + wk * 0.04;
      wp.y += (sin(wp.x * 1.3 + time * 1.6 + wind.x * 2.0) + cos(wp.z * 1.1 + time * 1.3) + sin((wp.x + wp.z) * 0.7 + time * 2.1) * 0.5) * a - a;
    }
    vWorld = wp.xyz;
    vec4 mv = viewMatrix * wp;
    vDepth = length(mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const frag = (water) => /* glsl */`
  uniform sampler2D map; uniform sampler2D matMap; uniform float texFx;
  uniform float daylight; uniform vec3 skyTint; uniform vec3 fogColor;
  uniform float fogNear; uniform float fogFar; uniform float time; uniform float underwater; uniform vec3 uwCol; uniform float uwFar;
  uniform vec3 sunDir; uniform float waterFx;
  uniform sampler2D shadowMap; uniform mat4 shadowMatrix; uniform float shadowOn;
  uniform float fogHeight; uniform float moonLight;
  uniform vec3 hlPos; uniform vec3 hlDir; uniform float hlOn;
  uniform vec3 plPos; uniform float plOn; uniform vec3 plCol; uniform float plR;
  uniform vec2 wind; uniform float rain; uniform float snow; uniform vec2 cloudOff; uniform float cloudCov; uniform vec3 skyTopC; uniform vec3 skyHorC;
  varying vec2 vUv;
  float vh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(vh(i), vh(i + vec2(1.0, 0.0)), f.x), mix(vh(i + vec2(0.0, 1.0)), vh(i + vec2(1.0, 1.0)), f.x), f.y); } varying vec4 vLit; varying float vDepth; varying vec3 vWorld; varying vec3 vTint;
  flat varying vec4 vInf; varying vec3 vLcol;
  const float SZ = 1536.0;
  vec3 lightCol(float id) {
    int i = int(id + 0.5);
    if (i == 1) return vec3(0.55, 1.0, 0.4); if (i == 2) return vec3(0.8, 0.5, 1.0); if (i == 3) return vec3(0.7, 0.85, 1.0);
    if (i == 4) return vec3(1.0, 0.3, 0.22); if (i == 5) return vec3(1.0, 0.5, 0.18); if (i == 6) return vec3(0.4, 0.9, 1.0); if (i == 7) return vec3(1.0, 0.95, 0.85);
    return vec3(1.0, 0.7, 0.4);
  }
  float shadowAt(vec3 wp) {
    vec4 sc = shadowMatrix * vec4(wp, 1.0);
    vec3 c = sc.xyz / sc.w * 0.5 + 0.5;
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0 || c.z > 1.0) return 1.0;
    float lit = 0.0;
    for (int i = 0; i < 4; i++) {
      vec2 o = vec2(float(i / 2) - 0.5, float(i - (i / 2) * 2) - 0.5) / 2048.0 * 1.5;
      lit += c.z - 0.0015 > texture2D(shadowMap, c.xy + o).r ? 0.0 : 1.0;
    }
    return lit / 4.0;
  }
  float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  vec3 faceN(int f) {
    if (f == 0) return vec3(1.0, 0.0, 0.0); if (f == 1) return vec3(-1.0, 0.0, 0.0);
    if (f == 3) return vec3(0.0, -1.0, 0.0); if (f == 4) return vec3(0.0, 0.0, 1.0);
    if (f == 5) return vec3(0.0, 0.0, -1.0); return vec3(0.0, 1.0, 0.0);
  }
  void main() {
    int tile = int(vInf.x + 0.5), flags = int(vInf.y + 0.5), face = int(vInf.z + 0.5);
    vec2 cell = vec2(float(tile - (tile / 32) * 32), float(tile / 32)) * 48.0 + 8.0;
    vec2 local = vec2(vUv.x * SZ - cell.x, (1.0 - vUv.y) * SZ - cell.y) / 32.0;
    vec3 N = faceN(face);
    vec3 bp = floor(vWorld - N * 0.01);
    float h = hash3(bp), h2 = hash3(bp + 17.0);
    // variación por bloque: rotar / espejar el tile
    vec2 c = local - 0.5;
    if (texFx > 0.5 && (flags & 1) != 0) {
      int k = int(h * 8.0);
      if (k >= 4) { c.x = -c.x; k -= 4; }
      if (k == 1) c = vec2(-c.y, c.x); else if (k == 2) c = -c; else if (k == 3) c = vec2(c.y, -c.x);
    } else if (texFx > 0.5 && (flags & 2) != 0 && h > 0.5) c.x = -c.x;
    vec2 lt = c + 0.5;
    // animaciones
    bool wrap = false;
    if ((flags & 4) != 0) {
      // agua: corre en la dirección de la corriente; en cascadas cae; quieta, se mueve apenas con el viento
      vec2 fw = vTint.xy - 1.0; bool falls = vTint.z > 1.5;
      if (falls && face != 2 && face != 3) lt.y -= time * 1.1;
      else if (length(fw) > 0.06 && face == 2) lt -= fw * time * 0.55;
      else lt += vec2(time * 0.035, time * 0.02) + wind * time * 0.02;
      lt += vec2(sin(time * 0.7 + lt.y * 6.28), cos(time * 0.6 + lt.x * 6.28)) * 0.015;
      wrap = true;
    }
    if ((flags & 8) != 0) { lt += vec2(time * 0.01, -time * 0.006); wrap = true; }
    if ((flags & 32) != 0) { vec2 q = lt - 0.5; float a = time * 0.9 * (1.0 - length(q) * 1.4); lt = mat2(cos(a), sin(a), -sin(a), cos(a)) * q + 0.5; wrap = true; }
    if ((flags & 64) != 0) { lt.x += sin(time * 9.0 + lt.y * 12.0 + h * 6.0) * 0.02 * (1.0 - lt.y); }
    vec2 gx = dFdx(lt) * 32.0, gy = dFdy(lt) * 32.0;
    float lx = length(gx), ly = length(gy);
    if (lx > 8.0) gx *= 8.0 / lx; if (ly > 8.0) gy *= 8.0 / ly;
    vec2 ltw = wrap ? fract(lt) : clamp(lt, 0.0, 1.0);
    vec2 pix = cell + ltw * 32.0;
    vec2 suv = vec2(pix.x / SZ, 1.0 - pix.y / SZ);
    vec2 dgx = vec2(gx.x, -gx.y) / SZ, dgy = vec2(gy.x, -gy.y) / SZ;
    vec4 tex = textureGrad(map, suv, dgx, dgy);
    vec4 mt = textureGrad(matMap, suv, dgx, dgy);
    ${water ? '' : 'if (tex.a < 0.4) discard;'}
    // tinte del bioma (pasto) y leve cambio de tono por bloque
    if ((flags & 4) == 0) tex.rgb = mix(tex.rgb, tex.rgb * vTint, mt.a);
    if ((flags & 3) != 0) tex.rgb *= 0.96 + h2 * 0.08;
    // variación por zona: manchas grandes de tono (más claro, más oscuro, más cálido o más frío) para que el terreno no se vea repetido
    if ((flags & 128) != 0 && texFx > 0.5) {
      vec2 zp = bp.xz + vec2(bp.y * 0.37, -bp.y * 0.29);
      float m1 = vn(zp * 0.045), m2 = vn(zp * 0.17 + 31.0);
      tex.rgb *= 1.0 + (m1 - 0.5) * 0.26 + (m2 - 0.5) * 0.09;
      tex.rgb = mix(tex.rgb, tex.rgb * vec3(1.07, 1.0, 0.9), smoothstep(0.55, 0.8, vn(zp * 0.02 + 5.0)) * 0.6);
      tex.rgb = mix(tex.rgb, tex.rgb * vec3(0.93, 1.0, 1.06), smoothstep(0.6, 0.85, vn(zp * 0.025 - 9.0)) * 0.5);
    }
    float B = mt.b * 255.0;
    float emis = B > 200.5 ? (B - 200.0) / 55.0 : 0.0;
    float spec = B > 200.5 ? 0.0 : B / 200.0;
    if (texFx < 0.5) spec = 0.0;
    // normal con relieve (marco tangente a partir de las derivadas)
    vec3 Np = N;
    if (face < 6 && texFx > 0.5 && vDepth < 48.0) {
      vec3 dp1 = dFdx(vWorld), dp2 = dFdy(vWorld);
      vec2 du1 = dFdx(lt), du2 = dFdy(lt);
      vec3 dp2p = cross(dp2, N), dp1p = cross(N, dp1);
      vec3 Tt = dp2p * du1.x + dp1p * du2.x, Bt = dp2p * du1.y + dp1p * du2.y;
      float im = inversesqrt(max(max(dot(Tt, Tt), dot(Bt, Bt)), 1e-12));
      vec2 nxy = mt.rg * 2.0 - 1.0;
      float fade = 1.0 - smoothstep(24.0, 48.0, vDepth);
      nxy *= fade;
      Np = normalize(Tt * im * nxy.x + Bt * im * nxy.y + N * sqrt(max(0.0, 1.0 - dot(nxy, nxy))));
    }
    float sky = pow(vLit.x, 1.4) * daylight;
    // sombras de las nubes que pasan
    if (cloudCov > 0.05 && vLit.x > 0.4 && daylight > 0.3) {
      vec2 cp = vWorld.xz * 0.011 + cloudOff * 4.0;
      float cn = vn(cp) * 0.65 + vn(cp * 2.3 + 7.0) * 0.35;
      float cs = smoothstep(1.0 - cloudCov * 0.85, 1.05 - cloudCov * 0.5, cn);
      sky *= 1.0 - cs * 0.42;
    }
    float shadowF = 1.0;
    if (shadowOn > 0.5 && vLit.x > 0.6 && vDepth < 80.0) { shadowF = shadowAt(vWorld + vec3(0.0, 0.02, 0.0)); sky *= mix(0.5, 1.0, shadowF); }
    float blk = pow(vLit.y, 1.25);
    vec3 Ls = sunDir.y > -0.05 ? sunDir : -sunDir;
    vec3 V = normalize(cameraPosition - vWorld);
    // relieve: diferencia entre la luz con y sin la normal de la textura
    float relief = 1.0 + (max(dot(Np, Ls), 0.0) - max(dot(N, Ls), 0.0)) * 1.4 * (0.4 + 0.6 * vLit.x);
    float reliefV = 1.0 + (dot(Np, V) - dot(N, V)) * 0.8;
    vec3 light = skyTint * sky * mix(1.0, moonLight, 1.0 - daylight) * relief + vLcol * blk * 1.35 * reliefV;
    // faros
    if (hlOn > 0.5) {
      vec3 Lh = vWorld - hlPos; float dh = length(Lh);
      float cone = dot(Lh / max(dh, 0.001), hlDir);
      light += vec3(1.0, 0.95, 0.8) * smoothstep(0.82, 0.95, cone) * (1.0 - smoothstep(5.0, 24.0, dh)) * 1.3 * reliefV;
    }
    if (plOn > 0.01) {
      vec3 Lp = plPos - vWorld; float dp = length(Lp);
      float fall = 1.0 - smoothstep(1.0, plR, dp);
      light += plCol * fall * fall * plOn * (0.55 + 0.45 * max(dot(Np, Lp / max(dp, 0.001)), 0.0)) * 1.25;
    }
    light = max(light, vec3(0.035, 0.035, 0.05));
    vec3 col = tex.rgb * light * vLit.z * vLit.w;
    ${water ? '' : `
    // nieve acumulada arriba de los bloques expuestos al cielo
    if (snow > 0.01 && face == 2 && vLit.x > 0.75 && (flags & 12) == 0) {
      float edge = vn(vWorld.xz * 3.0) * 0.5 + vn(vWorld.xz * 9.0) * 0.5;
      float cover = smoothstep(1.0 - snow, 1.0 - snow + 0.15, edge * 0.85 + 0.15);
      col = mix(col, vec3(0.92, 0.95, 1.0) * light * vLit.z, cover * 0.92);
    }
    // con lluvia, lo que está al aire libre se ve mojado: más oscuro y con brillo
    if (rain > 0.05 && vLit.x > 0.6 && (flags & 12) == 0) {
      float wet = rain * smoothstep(0.6, 0.95, vLit.x);
      col *= 1.0 - wet * 0.2;
      float fr = pow(1.0 - max(dot(N, normalize(cameraPosition - vWorld)), 0.0), 4.0);
      col += fogColor * wet * fr * 0.25;
    }`}
    // brillo especular: sol (o luna) y antorchas
    if (spec > 0.01) {
      vec3 Hh = normalize(Ls + V);
      float sp = pow(max(dot(Np, Hh), 0.0), 16.0 + spec * 64.0) * spec * (0.3 + spec);
      col += vec3(1.0, 0.93, 0.8) * sp * sky * shadowF * 1.6;
      col += vLcol * pow(max(dot(Np, V), 0.0), 24.0) * spec * blk * 0.35;
      // lo brillante (metal, vidrio, hielo) refleja un poco el cielo
      if (spec > 0.3) col += fogColor * pow(1.0 - max(dot(Np, V), 0.0), 3.0) * spec * 0.3 * vLit.x;
    }
    // píxeles que brillan solos (minerales, lava, lámparas, hongos)
    if (emis > 0.0) {
      float fl = (flags & 8) != 0 ? 0.85 + 0.15 * sin(time * 2.0 + h * 6.0) : 1.0;
      col = mix(col, tex.rgb * 1.15 * fl, emis * (0.55 + 0.45 * (1.0 - daylight * vLit.x * 0.6)));
    }
    vec3 glint = vec3(0.0); float glintA = 0.0;
    ${water ? `
    if (tex.g > tex.b * 1.15) col += vec3(0.05,0.12,0.0) * (0.5 + 0.5*sin(vWorld.x*0.7 + time*1.3) * sin(vWorld.z*0.6 - time)); // sólo el agua tóxica
    if (waterFx > 0.5) {
      // reflejo del cielo (Fresnel) y brillo del sol con olas
      float calm = face == 2 ? 1.0 - smoothstep(0.05, 0.3, length(vTint.xy - 1.0)) : 0.0;
      float rip = 0.06 * (1.0 - calm * 0.75);
      vec3 Nw = normalize(vec3(sin(vWorld.x*1.7 + time*1.6)*rip, 1.0, cos(vWorld.z*1.9 - time*1.3)*rip) + (Np - N) * (0.5 - calm * 0.35));
      float fres = pow(1.0 - max(dot(V, Nw), 0.0), 3.0);
      vec3 Rw = reflect(-V, Nw);
      vec3 refl = mix(skyHorC, skyTopC, pow(clamp(Rw.y, 0.0, 1.0), 0.55));
      col = mix(col, mix(fogColor * (0.4 + daylight * 0.8), refl * 1.1, calm), (fres * (0.6 + calm * 0.3) + calm * 0.18) * vLit.x);
      float low = 1.0 - clamp(sunDir.y * 2.5, 0.0, 1.0);
      float spw = pow(max(dot(reflect(-sunDir, Nw), V), 0.0), mix(80.0, 14.0, low)) * vLit.x * smoothstep(-0.08, 0.05, sunDir.y);
      vec3 gold = mix(vec3(1.0, 0.8, 0.5), vec3(1.0, 0.3, 0.06), low);
      // el reflejo del sol se suma después de la niebla, así se ve hasta el horizonte
      glint = gold; glintA = min(1.0, spw * (2.0 + low * 2.0)) * mix(0.7, 0.85, low) + pow(max(dot(reflect(-sunDir, Nw), V), 0.0), 9.0) * low * 0.45 * vLit.x * smoothstep(-0.08, 0.05, sunDir.y);
    }
    // espuma donde el agua corre o cae
    { vec2 fw = vTint.xy - 1.0; bool fallF = vTint.z > 1.5 && face != 2 && face != 3;
      float foam = (fallF ? 0.22 : 0.0) + smoothstep(0.4, 1.0, length(fw)) * 0.12;
      if (foam > 0.0) {
        vec3 fp = vWorld * 8.0; fp.y += fallF ? time * 9.0 : 0.0; fp.xz -= fw * time * 4.0;
        float n = fract(sin(dot(floor(fp), vec3(12.9, 78.2, 37.7))) * 43758.5);
        col = mix(col, vec3(0.88, 0.94, 0.97) * (0.35 + daylight * 0.65), foam * step(0.72, n));
      } }
    // gotas de lluvia: anillos que se abren en la superficie
    if (rain > 0.05 && face == 2) {
      vec2 g = vWorld.xz * 1.6; vec2 c0 = floor(g);
      float rings = 0.0;
      for (int k = 0; k < 2; k++) {
        vec2 c = c0 + vec2(float(k), 0.0);
        float r1 = fract(sin(dot(c, vec2(41.3, 289.1))) * 43758.5);
        float t = fract(time * 0.9 + r1 * 7.0);
        vec2 ctr = c + vec2(fract(r1 * 13.7), fract(r1 * 7.3));
        float d = length(g - ctr);
        rings += smoothstep(0.06, 0.0, abs(d - t * 0.6)) * (1.0 - t);
      }
      col += vec3(0.6, 0.7, 0.75) * rings * rain * 0.5 * (0.3 + daylight);
    }` : `
    // bajo el agua: reflejos de luz que bailan sobre el fondo
    if (underwater > 0.5) {
      vec2 q = vWorld.xz * 0.9 + vWorld.y * 0.15;
      float v = sin(q.x + time * 1.1 + sin(q.y * 1.3 + time)) * sin(q.y * 1.1 - time * 0.9 + sin(q.x * 1.7 + time * 0.5));
      col += vec3(0.55, 0.75, 0.8) * pow(abs(v), 3.0) * 0.35 * daylight * vLit.x;
    }`}
    float fog = smoothstep(fogNear, fogFar, vDepth);
    // niebla baja: se junta en valles y zonas bajas
    fog = max(fog, fogHeight * 0.35 * exp(-max(vWorld.y - 40.0, 0.0) / 10.0) * smoothstep(8.0, 60.0, vDepth));
    fog = max(fog, underwater * smoothstep(0.0, uwFar, vDepth));
    vec3 Vf = normalize(vWorld - cameraPosition);
    vec3 fc = fogColor + vec3(1.0, 0.75, 0.45) * pow(max(dot(Vf, sunDir), 0.0), 8.0) * 0.35 * daylight;
    fc = mix(fc, uwCol * (0.35 + daylight * 0.65), underwater);
    gl_FragColor = vec4(mix(mix(col, fc, fog), glint * 1.15, clamp(glintA * (1.0 - underwater), 0.0, 0.9)), ${water ? 'min(0.92, tex.a + 0.08)' : '1.0'});
    #include <colorspace_fragment>
  }`;
const materials = {
  solid: new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag(false) }),
  water: new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag(true), transparent: true, depthWrite: false, side: THREE.DoubleSide }),
};

// ---------- Cielo ----------
const skyUniforms = {
  top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() },
  sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, night: { value: 0 }, moonPhase: { value: 1 },
  time: { value: 0 }, clouds: { value: 0.45 }, aurora: { value: 0 }, cloudDark: { value: 0 }, cloudOff: { value: new THREE.Vector2() },
  eclipse: { value: 0 }, meteors: { value: 0 },
};
const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 24, 16), new THREE.ShaderMaterial({
  uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false,
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunCol; uniform float night; uniform float moonPhase;
    uniform float time; uniform float clouds; uniform float aurora; uniform float cloudDark; uniform vec2 cloudOff; uniform float eclipse; uniform float meteors;
    varying vec3 vDir;
    float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * n2(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
    // una estrella fugaz (slot = cuál, ph = avance 0-1)
    float streak(vec3 d, float slot, float ph) {
      vec3 a = normalize(vec3(h(vec3(slot, 3.0, 1.0)) - 0.5, 0.55 + h(vec3(slot, 4.0, 1.0)) * 0.35, h(vec3(slot, 5.0, 1.0)) - 0.5));
      vec3 b = normalize(a + normalize(vec3(h(vec3(slot, 6.0, 1.0)) - 0.5, -0.35, h(vec3(slot, 7.0, 1.0)) - 0.5)) * 0.35);
      float best = 0.0;
      for (int i = 0; i < 6; i++) { float k = ph - float(i) * 0.05; if (k < 0.0) break; best = max(best, pow(max(dot(d, normalize(mix(a, b, k))), 0.0), 60000.0) * (1.0 - float(i) / 6.0)); }
      return best;
    }
    void main(){
      vec3 d = normalize(vDir);
      float t = pow(clamp(d.y, 0.0, 1.0), 0.55);
      vec3 col = mix(horizon, top, t);
      if (d.y < 0.0) col = horizon * (1.0 + d.y * 0.6);
      float s = max(dot(d, sunDir), 0.0);
      col += sunCol * (pow(s, 900.0) * 3.0 * (1.0 - eclipse) + pow(s, 12.0) * 0.35 * (1.0 - eclipse * 0.85));
      // eclipse: la luna tapa el sol y queda la corona
      if (eclipse > 0.01) { float r = acos(clamp(dot(d, sunDir), -1.0, 1.0)); col += vec3(1.0, 0.92, 0.8) * eclipse * (exp(-pow((r - 0.03) / 0.008, 2.0)) * 1.6 + exp(-r * 18.0) * 0.25); }
      vec3 md = -sunDir; float m = max(dot(d, md), 0.0);
      // fase lunar: un disco oscuro desplazado tapa parte de la luna
      vec3 side = normalize(cross(md, vec3(0.0, 1.0, 0.0)));
      float sh = max(dot(d, normalize(md + side * (0.075 * moonPhase))), 0.0);
      float disc = pow(m, 1400.0), shadow = pow(sh, 1400.0) * (1.0 - moonPhase);
      col += vec3(0.75, 0.8, 0.7) * max(disc - shadow * 1.2, disc * 0.08) * 2.0 * night;
      vec3 g = floor(d * 220.0);
      float st = step(0.9975, h(g)) * night * smoothstep(0.0, 0.3, d.y);
      col += vec3(st) * (0.7 + 0.3 * sin(time * 3.0 + h(g) * 40.0));
      // estrellas fugaces: de vez en cuando una raya cruza el cielo de noche
      if (night > 0.5) {
        float slot = floor(time / 7.0), ph = fract(time / 7.0) / 0.13;
        if (ph < 1.0 && h(vec3(slot, 1.0, 2.0)) < 0.55) col += vec3(1.0, 0.95, 0.85) * streak(d, slot, ph) * 2.5 * (night - 0.5) * 2.0;
        // lluvia de estrellas: muchas a la vez
        if (meteors > 0.01) for (int j = 0; j < 5; j++) {
          float per = 1.3 + float(j) * 0.47, sl = floor(time / per) + float(j) * 101.0, p2 = fract(time / per) / 0.22;
          if (p2 < 1.0) col += vec3(0.95, 0.97, 1.0) * streak(d, sl, p2) * 2.2 * meteors * (night - 0.5) * 2.0;
        }
      }
      // aurora austral en los lugares fríos
      if (aurora > 0.01 && d.y > 0.05) {
        vec2 q = d.xz / (d.y + 0.25);
        float band = sin(q.x * 2.2 + fbm(q * 0.8 + time * 0.05) * 6.0 + time * 0.15) * 0.5 + 0.5;
        float curtain = smoothstep(0.55, 1.0, band) * smoothstep(0.05, 0.35, d.y) * (1.0 - smoothstep(0.55, 0.95, d.y));
        vec3 ac = mix(vec3(0.1, 1.0, 0.45), vec3(0.55, 0.25, 1.0), smoothstep(0.2, 0.7, d.y + fbm(q * 2.0) * 0.2));
        col += ac * curtain * aurora * night * (0.55 + 0.45 * sin(time * 0.7 + q.y));
      }
      // nubes: una capa que se mueve con el viento, iluminada por el sol (o la luna)
      if (d.y > 0.0 && clouds > 0.01) {
        vec2 uv = d.xz / (d.y + 0.12) * 1.6 + cloudOff;
        float c = fbm(uv);
        float cov = smoothstep(1.0 - clouds * 0.85, 1.05 - clouds * 0.5, c) * smoothstep(0.0, 0.18, d.y);
        float lit = clamp(0.55 + dot(normalize(vec3(sunDir.x, 0.0, sunDir.z) + 0.001), normalize(vec3(d.x, 0.0, d.z))) * 0.25, 0.0, 1.0);
        vec3 cc = mix(horizon * 1.25 + sunCol * 0.25 * lit, top * 0.6, 0.25) * (1.0 - cloudDark * 0.55);
        cc = mix(cc, vec3(0.045, 0.05, 0.07), night * 0.92);
        col = mix(col, cc, cov * 0.88);
      }
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`,
}));
sky.renderOrder = -1;
scene.add(sky);

// ---------- Partículas de ceniza ----------
const ASH = 1400;
const ashGeo = new THREE.BufferGeometry();
const ashPos = new Float32Array(ASH * 3);
for (let i = 0; i < ASH * 3; i++) ashPos[i] = (Math.random() - 0.5) * 60;
ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3));
const ashMat = new THREE.PointsMaterial({ color: 0xbcb4a8, size: 0.07, transparent: true, opacity: 0.7, depthWrite: false });
const ash = new THREE.Points(ashGeo, ashMat);
ash.frustumCulled = false;
scene.add(ash);

// ---------- Selección y grietas ----------
const selBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 }));
selBox.visible = false; scene.add(selBox);
const crackGeo = new THREE.BoxGeometry(1.006, 1.006, 1.006);
const crackMat = new THREE.MeshBasicMaterial({ map: atlas, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
const crack = new THREE.Mesh(crackGeo, crackMat); crack.visible = false; scene.add(crack);
function setCrack(stage) {
  if (stage < 0) { crack.visible = false; return; }
  const q = tileUV(T.crack0 + stage);
  const uv = crackGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const k = i % 4;
    uv.setXY(i, k % 2 ? q.u1 : q.u0, k < 2 ? q.v0 : q.v1);
  }
  uv.needsUpdate = true;
  crack.visible = true;
}

// ---------- Mano / ítem sostenido ----------
const handGroup = new THREE.Group(); handScene.add(handGroup);
const handLight = { value: 1 };
let handMesh = null, handId = -1;
function blockGeometry(id) {
  const b = BLOCKS[id];
  const g = new THREE.BoxGeometry(1, 1, 1);
  const uv = g.attributes.uv;
  const faces = [b.tex.side, b.tex.side, b.tex.top, b.tex.bottom, b.tex.front ?? b.tex.side, b.tex.side];
  for (let f = 0; f < 6; f++) {
    const q = tileUV(faces[f]);
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, k % 2 ? q.u1 : q.u0, k < 2 ? q.v0 : q.v1);
    }
  }
  return g;
}
const handMat = new THREE.MeshBasicMaterial({ map: atlas, transparent: true, alphaTest: 0.5 });
const armMat = new THREE.MeshBasicMaterial({ color: 0x8a6a52 });
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.5), armMat);
function setHand(id) {
  if (id === handId) return;
  handId = id;
  if (handMesh) { handGroup.remove(handMesh); handMesh.geometry.dispose(); if (handMesh.material !== handMat) handMesh.material.dispose(); }
  handMesh = null;
  handGroup.remove(arm);
  if (id <= 0) { handGroup.add(arm); arm.position.set(0.42, -0.36, -0.75); arm.rotation.set(0.35, -0.25, 0); return; }
  if (isBlock(id) && BLOCKS[id].render === 'cube' && !BLOCKS[id].alpha) {
    handMesh = new THREE.Mesh(blockGeometry(id), handMat);
    handMesh.scale.setScalar(0.2);
    handMesh.position.set(0.36, -0.3, -0.6);
    handMesh.rotation.set(0.1, 0.7, 0);
  } else {
    const c = document.createElement('canvas'); c.width = c.height = 48; drawIcon(c, id, atlasCanvas);
    const tx = new THREE.CanvasTexture(c); tx.magFilter = THREE.NearestFilter; tx.colorSpace = THREE.SRGBColorSpace;
    handMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: tx, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
    handMesh.position.set(0.4, -0.3, -0.7);
    handMesh.rotation.set(0, -0.4, 0.15);
  }
  handGroup.add(handMesh);
}

// ---------- Estado del juego ----------
function lockPointer() { if (input?.touch) return; try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch { /* sin foco */ } }
const sfx = new Sfx();
// ?mute: sin ningún sonido (pruebas automáticas)
if (new URLSearchParams(location.search).has('mute')) sfx.start = () => {};
const ui = new UI(atlasCanvas, sfx);
const net = new Net();
const mapView = new MapView(atlasCanvas);
const hemi = new THREE.HemisphereLight(0xfff0dd, 0x443322, 1.2);
scene.add(hemi);
const particles = new Particles(scene);
let game = null;
let paused = false;
let locked = false;
let chatting = false;
let bigMap = false;
const guide = setupGuide(ui, () => game);
const getName = () => { try { return localStorage.getItem('yermo-name') || ''; } catch { return ''; } };
const setName = (n) => { try { localStorage.setItem('yermo-name', n); } catch { /* sin almacenamiento */ } };

// ---------- Opciones gráficas ----------
const QUALITY = {
  bajo: { ratio: 0.75, particles: false, ash: 0.35, water: 0, dist: 4 },
  medio: { ratio: 1, particles: true, ash: 0.7, water: 1, dist: 6 },
  alto: { ratio: Math.min(devicePixelRatio, 1.5), particles: true, ash: 1, water: 1, dist: 8 },
};
let settings = { quality: 'medio', music: 50, sfx: 60 };
try { Object.assign(settings, JSON.parse(localStorage.getItem('yermo-settings') || '{}')); } catch { /* por defecto */ }
function applySettings() {
  const q = QUALITY[settings.quality] || QUALITY.medio;
  // ahorro de batería: menos resolución, sin partículas y 30 cuadros por segundo
  renderer.setPixelRatio(settings.battery ? Math.min(q.ratio, 0.75) : q.ratio);
  renderer.setSize(innerWidth, innerHeight);
  particles.enabled = q.particles && !settings.battery;
  uniforms.waterFx.value = q.water;
  uniforms.texFx.value = settings.quality === 'bajo' ? 0 : 1;
  sfx.vol = settings.sfx / 100; if (sfx.master) sfx.master.gain.value = sfx.vol;
  sfx.setMusicVol(settings.music / 100);
  try { localStorage.setItem('yermo-settings', JSON.stringify(settings)); } catch { /* sin almacenamiento */ }
}
applySettings();
const access = setupAccess({ settings, flash: (m) => flash(m), saveSettings: () => { try { localStorage.setItem('yermo-settings', JSON.stringify(settings)); } catch { /* sin almacenamiento */ } } });

function colorsAt(t) {
  const sunH = Math.sin((t - 0.25) * Math.PI * 2);
  const day = THREE.MathUtils.smoothstep(sunH, -0.18, 0.3);
  const dusk = Math.max(0, 1 - Math.abs(sunH) / 0.35) * (sunH > -0.25 ? 1 : 0);
  const top = new THREE.Color(0x0a0c16).lerp(new THREE.Color(0x7c8a96), day);
  const hor = new THREE.Color(0x191822).lerp(new THREE.Color(0xc4a27a), day).lerp(new THREE.Color(0xc2643a), dusk * 0.65);
  return { sunH, day, dusk, top, hor };
}

function updateSky(t) {
  const { sunH, day, dusk, top, hor } = colorsAt(t);
  const w = game.weather;
  // clima: cielo más gris o verdoso
  if (w.k > 0) {
    const tint = w.type === 'ash' ? new THREE.Color(0x8a8278) : new THREE.Color(0x6a7a5a);
    const f = w.k * 0.6;
    top.lerp(tint.clone().multiplyScalar(0.3 + day * 0.7), f); hor.lerp(tint.clone().multiplyScalar(0.3 + day * 0.7), f);
  }
  const ecl = game.eclipse || 0;
  if (isReal(game.meta.worldType)) { top.lerp(new THREE.Color(0x3d7ec8).multiplyScalar(0.15 + day * 0.85), 0.75 * day); hor.lerp(new THREE.Color(0xb8d4ea).multiplyScalar(0.12 + day * 0.88), 0.7 * day * (1 - dusk * 0.6)); }
  if (ecl > 0) { top.multiplyScalar(1 - ecl * 0.78); hor.lerp(new THREE.Color(0x2a1e2a), ecl * 0.7); }
  skyUniforms.eclipse.value = ecl; skyUniforms.meteors.value = game.meteors || 0;
  skyUniforms.top.value.copy(top);
  skyUniforms.horizon.value.copy(hor);
  uniforms.skyTopC.value.copy(top); uniforms.skyHorC.value.copy(hor);
  const ang = (t - 0.25) * Math.PI * 2;
  skyUniforms.sunDir.value.set(Math.cos(ang), Math.sin(ang), 0.25).normalize();
  uniforms.sunDir.value.copy(skyUniforms.sunDir.value);
  skyUniforms.sunCol.value.setRGB(1, 0.75 + day * 0.15, 0.5 + day * 0.3).multiplyScalar(sunH > -0.1 ? 1 - w.k * 0.7 : 0);
  skyUniforms.night.value = Math.max((1 - day) * (1 - w.k * 0.8), ecl * 0.75);
  skyUniforms.time.value = performance.now() / 1000;
  uniforms.rain.value = game?.weather ? game.weather.rainK : 0;
  skyUniforms.clouds.value = 0.42 + w.k * 0.5; skyUniforms.cloudDark.value = w.k;
  uniforms.daylight.value = (0.1 + day * 0.9) * (1 - w.k * 0.25) * (1 - ecl * 0.6);
  uniforms.skyTint.value.setRGB(1, 0.93 - dusk * 0.12, 0.85 - dusk * 0.25).lerp(new THREE.Color(0.55, 0.62, 0.9), 1 - day);
  uniforms.fogColor.value.copy(hor);
  const R = game.world.renderDist * 16 * w.fogMul * (isReal(game.meta.worldType) ? 1.35 : 1);
  uniforms.fogNear.value = R * 0.5; uniforms.fogFar.value = R * 1.0;
  handLight.value = uniforms.daylight.value;
  hemi.intensity = 0.25 + day * 1.1;
  sfx.night = 1 - day;
}

function nearbyStations(p) {
  const s = new Set();
  const w = game.world;
  const x0 = Math.floor(p.x), y0 = Math.floor(p.y), z0 = Math.floor(p.z);
  for (let dx = -4; dx <= 4; dx++) for (let dy = -2; dy <= 3; dy++) for (let dz = -4; dz <= 4; dz++) {
    const b = w.getBlock(x0 + dx, y0 + dy, z0 + dz);
    if (b > 0 && BLOCKS[b].station) s.add(BLOCKS[b].station);
  }
  return s;
}

function openInventory(extraStation, cont) {
  const st = nearbyStations(game.player.pos);
  if (extraStation) st.add(extraStation);
  ui.player = game.player;
  ui.openInv(st, cont);
  document.exitPointerLock();
  $('#hud').classList.add('dim');
}
function closeInventory() {
  ui.closeInv();
  $('#hud').classList.remove('dim');
  lockPointer();
}
function openContainer(x, y, z) {
  const k = k3(x, y, z);
  const c = game.sim.container(x, y, z, true);
  if (!c) return;
  openInventory(null, { key: k, c });
}

const isAuthority = () => !net.active || net.isHost || net.authority;

function spawnDrop(item, count, pos, vel, dur, q) {
  const v = vel ?? new THREE.Vector3((Math.random() - 0.5) * 2, 3, (Math.random() - 0.5) * 2);
  if (isAuthority()) game.drops.spawn(item, count, pos, v, dur, undefined, q);
  else net.sendDrop(item, count, pos, v, dur);
}
function dropFromPlayer(item, count, dur, q) {
  const p = game.player;
  const dir = new THREE.Vector3(-Math.sin(p.yaw), 0.3, -Math.cos(p.yaw)).normalize();
  spawnDrop(item, count, new THREE.Vector3(p.pos.x, p.pos.y + 1.4, p.pos.z).addScaledVector(dir, 0.6), dir.multiplyScalar(5), dur, q);
}

async function saveGame(quiet) {
  if (game?.meta.cloud) return saveCloud(quiet);
  if (!game || game.meta.remote) return;
  const { meta, player, inv, world } = game;
  meta.player = player.serialize();
  meta.inventory = inv.serialize();
  meta.equip = inv.serializeEquip();
  meta.selected = inv.selected;
  meta.time = game.time;
  meta.containers = game.sim.serialize();
  meta.vehicles = game.vehicles.save();
  game.features?.save(meta);
  meta.weather = game.weather.serialize();
  meta.blueprints = [...game.known];
  meta.lastPlayed = Date.now();
  await Storage.saveWorld(meta);
  await world.saveAll();
  if (!quiet) flash('Partida guardada');
}
// ---------- mundo del grupo (nube) ----------
let cloudHost = null; // { id, tok, timer } cuando este navegador es el anfitrión del mundo del grupo
let cloudSaving = false;
async function saveCloud(quiet) {
  if (!game || cloudSaving) return;
  cloudSaving = true;
  const { meta, player, inv, world } = game;
  try {
    meta.player = player.serialize();
    meta.inventory = inv.serialize();
    meta.equip = inv.serializeEquip();
    meta.selected = inv.selected;
    meta.blueprints = [...game.known];
    if (!meta.remote) {
      meta.time = game.time;
      meta.containers = game.sim.serialize();
      meta.vehicles = game.vehicles.save();
      game.features?.save(meta);
      meta.weather = game.weather.serialize();
      await Promise.all([Cloud.saveWorldMeta(meta.cloud, meta), world.saveAll()]);
    }
    await Cloud.savePlayer(meta.cloud, Cloud.playerPart(meta));
    if (!quiet) flash('Guardado en la nube');
  } catch (e) { console.warn(e); if (!quiet) flash('No se pudo guardar en la nube'); } finally { cloudSaving = false; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cloudMsg = (t) => { $('#cMsg').textContent = t; };
async function enterCloud(id) {
  cloudMsg('Entrando al mundo…');
  for (let i = 0; i < 20; i++) {
    const alive = await Cloud.aliveHost(id);
    if (alive?.code) {
      cloudMsg(`Conectando con ${alive.name}…`);
      try { await joinCloud(id, alive.code); return; } catch (e) { net.close(); cloudMsg(`${alive.name} no responde, reintentando…`); await sleep(2500); continue; }
    }
    if (alive) { cloudMsg(`${alive.name} está abriendo el mundo…`); await sleep(2000); continue; }
    const tok = (crypto.randomUUID?.() ?? String(Math.random()).slice(2)) + Date.now();
    if (await Cloud.claimHost(id, tok)) { await hostCloud(id, tok); return; }
    await sleep(1200);
  }
  throw new Error('No se pudo entrar al mundo del grupo. Probá de nuevo en un rato.');
}
async function hostCloud(id, tok) {
  cloudMsg('Cargando el mundo desde la nube…');
  const [row, keys, pdata] = await Promise.all([Cloud.loadWorld(id), Cloud.chunkKeys(id), Cloud.loadPlayer(id)]);
  const meta = { ...(row.meta || {}), ...(pdata || {}), id: 'cloud-' + id, cloud: id, cloudName: row.name, name: row.name, seed: Number(row.seed), worldType: row.world_type, mode: row.mode };
  if (!meta.renderDist) meta.renderDist = +$('#optDist').value || QUALITY[settings.quality].dist;
  delete meta.remote;
  cloudHost = { id, tok, timer: null };
  $('#cloud').hidden = true;
  await startGame(meta, null, { keys });
  const name = Cloud.username;
  const code = await net.host(game, scene, name);
  await Cloud.setHostCode(id, tok, code);
  cloudHost.timer = setInterval(async () => {
    if (!cloudHost) return;
    const ok = await Cloud.beat(cloudHost.id, cloudHost.tok).catch(() => true);
    if (!ok) flash('⚠ Se perdió la conexión con la nube: guardá y volvé a entrar');
  }, 8000);
  $('#netInfo').hidden = false; $('#netInfo').textContent = `☁ ${row.name} · sos el anfitrión`;
  $('#pauseHost').hidden = true;
  addChat(null, `☁ Abriste «${row.name}». Los miembros entran solos desde «Mundo del grupo».`);
  await saveCloud(true); // deja guardado el punto de inicio del mundo
}
async function joinCloud(id, code) {
  const pdata = await Cloud.loadPlayer(id);
  const hello = await net.join(code, Cloud.username);
  const meta = metaFromHello(hello, 'cloudc-' + id);
  if (pdata) {
    Object.assign(meta, pdata);
    if (pdata.player) meta.player = { ...pdata.player };
  }
  meta.remote = true; meta.cloud = id;
  $('#cloud').hidden = true;
  await startGame(meta, hello);
  $('#netInfo').textContent = `☁ ${hello.hostName ? 'con ' + hello.hostName : 'mundo del grupo'}`;
}
// menú de la nube
async function openCloud() {
  $('#cloud').hidden = false; cloudMsg('Conectando…');
  try {
    await Cloud.init();
    cloudMsg('');
    renderCloud();
  } catch (e) { cloudMsg('No se pudo conectar con la nube: ' + (e.message || e)); }
}
async function renderCloud() {
  const logged = !!Cloud.user;
  $('#cloudLogin').hidden = logged; $('#cloudHome').hidden = !logged;
  if (!logged) { $('#cUser').value = getName() || ''; return; }
  $('#cName').textContent = Cloud.username;
  if ($('#cwSeed').options.length === 0) for (const p of SEED_PRESETS) if (p.id !== 'custom') { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; $('#cwSeed').appendChild(o); }
  const list = $('#cWorlds');
  list.innerHTML = '<p class="muted">Buscando mundos…</p>';
  try {
    const worlds = await Cloud.listWorlds();
    list.innerHTML = worlds.length ? '' : '<p class="empty">Todavía no sos miembro de ningún mundo. Creá uno o sumate con el código que te pase un amigo.</p>';
    for (const w of worlds) {
      const row = document.createElement('div'); row.className = 'world';
      const d = new Date(w.updated_at);
      row.innerHTML = `<div><b></b><small>${w.playing ? `<b>🟢 jugando: ${w.playing.replace(/[<>&]/g, '')}</b> · ` : '⚪ nadie conectado · '}${w.world_type === 'brew' ? '🍺 ' : w.world_type === 'magic' ? '🧙 ' : w.world_type === 'islands' ? '🏝 ' : w.world_type === 'baires' ? '🏙 ' : w.world_type === 'hurlingham' ? '🏡 ' : w.world_type === 'base' ? '🧰 ' : ''}${w.mode === 'creative' ? 'Creativo' : 'Supervivencia'} · ${w.players} miembro${w.players == 1 ? '' : 's'}${w.owner === Cloud.user.id ? ' · 👑 tuyo' : ''}</small></div><button class="play">Entrar</button><button class="cfg" title="Código, miembros y opciones">⚙</button>`;
      row.querySelector('b').textContent = w.name;
      row.querySelector('.play').onclick = () => { row.querySelector('.play').disabled = true; enterCloud(w.id).catch((e) => { cloudMsg(e.message); row.querySelector('.play').disabled = false; }); };
      row.querySelector('.cfg').onclick = () => cloudWorldCfg(w);
      list.appendChild(row);
    }
  } catch (e) {
    list.innerHTML = '';
    cloudMsg(/yermo_list_worlds|does not exist|schema|permission denied/i.test(e.message) ? 'Falta actualizar la base: corré supabase/schema.sql en el SQL Editor de Supabase.' : e.message);
  }
}
// ⚙ de un mundo: código de invitación, miembros, echar, cambiar código, salir o borrar
async function cloudWorldCfg(w) {
  const box = $('#cCfg');
  const mine = w.owner === Cloud.user.id;
  box.hidden = false; box.innerHTML = '<p class="muted">Cargando…</p>';
  try {
    const [members, code] = await Promise.all([Cloud.members(w.id), mine ? Cloud.getInvite(w.id) : null]);
    box.innerHTML = '';
    const H = (h) => box.insertAdjacentHTML('beforeend', h);
    const btn = (t, fn, cls = '') => { const b = document.createElement('button'); b.textContent = t; if (cls) b.className = cls; b.onclick = fn; return b; };
    H(`<p><b></b></p>`); box.querySelector('b').textContent = w.name;
    if (mine) {
      H(`<p>Código de invitación: <b style="font-size:24px;letter-spacing:3px;color:var(--accent)">${code}</b></p><p class="muted">Pasáselo sólo a quien quieras invitar. Con el código se suman una vez y queda en su cuenta.</p>`);
      const r = document.createElement('div'); r.className = 'row2';
      r.appendChild(btn('Copiar código', () => { navigator.clipboard?.writeText(code); cloudMsg('Código copiado'); }));
      r.appendChild(btn('Cambiar código', async () => { if (!confirm('El código viejo deja de servir (los que ya son miembros siguen). ¿Cambiarlo?')) return; await Cloud.newInvite(w.id); cloudWorldCfg(w); }));
      box.appendChild(r);
    }
    H('<h3 style="margin:10px 0 4px">Miembros</h3>');
    for (const m of members) {
      const row = document.createElement('div'); row.className = 'trade';
      row.innerHTML = `<div class="tget">${m.role === 'owner' ? '👑 ' : ''}<span></span>${m.user_id === Cloud.user.id ? ' (vos)' : ''}</div>`;
      row.querySelector('span').textContent = m.name || 'Jugador';
      if (mine && m.user_id !== Cloud.user.id) row.appendChild(btn('Echar', async () => { if (!confirm(`¿Echar a ${m.name} de «${w.name}»? Para volver va a necesitar el código.`)) return; await Cloud.removeMember(w.id, m.user_id).catch((e) => cloudMsg(e.message)); cloudWorldCfg(w); renderCloud(); }));
      box.appendChild(row);
    }
    if (mine) box.appendChild(btn('Borrar este mundo para todos', async () => { if (!confirm(`¿Borrar «${w.name}» para todo el grupo? No se puede deshacer.`)) return; await Cloud.deleteWorld(w.id).catch((e) => cloudMsg(e.message)); box.hidden = true; renderCloud(); }, 'danger'));
    else box.appendChild(btn('Salir de este mundo', async () => { if (!confirm(`¿Salir de «${w.name}»? Para volver vas a necesitar el código.`)) return; await Cloud.removeMember(w.id, Cloud.user.id).catch((e) => cloudMsg(e.message)); box.hidden = true; renderCloud(); }));
    box.appendChild(btn('Cerrar', () => { box.hidden = true; }));
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  } catch (e) { box.innerHTML = ''; box.hidden = true; cloudMsg(e.message); }
}
async function cloudJoinCode() {
  const code = $('#cJoinCode').value.trim();
  if (code.length < 4) { cloudMsg('Escribí el código de invitación que te pasaron.'); return; }
  cloudMsg('Buscando el mundo…');
  try { const w = await Cloud.joinByCode(code); $('#cJoinCode').value = ''; cloudMsg(`¡Te sumaste a «${w.name}»! Tocá Entrar para jugar.`); renderCloud(); }
  catch (e) { cloudMsg(e.message); }
}
$('#cJoin').onclick = cloudJoinCode;
$('#cJoinCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); cloudJoinCode(); } });
async function cloudAuth(signUp) {
  const u = $('#cUser').value.trim(), pw = $('#cPass').value;
  if (!u || !pw) { cloudMsg('Escribí usuario y contraseña.'); return; }
  cloudMsg(signUp ? 'Creando la cuenta…' : 'Entrando…');
  try {
    await (signUp ? Cloud.signUp(u, pw) : Cloud.signIn(u, pw));
    setName(Cloud.username); $('#jName').value = Cloud.username;
    $('#cPass').value = ''; cloudMsg('');
    renderCloud();
  } catch (e) { cloudMsg(e.message); }
}
$('#openCloud').onclick = openCloud;
$('#cloudClose').onclick = () => { $('#cloud').hidden = true; };
$('#cSignIn').onclick = () => cloudAuth(false);
$('#cSignUp').onclick = () => cloudAuth(true);
$('#cPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); cloudAuth(false); } });
$('#cOut').onclick = async () => { await Cloud.signOut(); renderCloud(); };
$('#cwCreate').onclick = async () => {
  const preset = SEED_PRESETS.find((x) => x.id === $('#cwSeed').value) || SEED_PRESETS[0];
  const name = $('#cwName').value.trim() || 'Yermo del grupo';
  const seed = preset.seed ?? ((Math.random() * 2e9) | 0);
  const meta = { rules: { rad: true, dayMobs: true, armed: false } };
  if (preset.spawn) meta.spawnPref = preset.spawn;
  const id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  cloudMsg('Creando el mundo…');
  try { await Cloud.createWorld({ id, name, seed, worldType: preset.type || 'normal', mode: $('#cwMode').value, meta }); $('#cwName').value = ''; const code = await Cloud.getInvite(id); cloudMsg(`Mundo creado. Código para invitar: ${code} (lo ves siempre en ⚙)`); await sleep(1800); await enterCloud(id); }
  catch (e) { cloudMsg(e.message); }
};

// notificaciones: se apilan (hasta 4), las repetidas se juntan con un contador
function flash(msg) {
  const box = $('#toasts'); if (!box || !msg) return;
  msg = String(msg);
  for (const el of box.children) if (el.dataset.msg === msg && !el.classList.contains('out')) {
    const n = (+el.dataset.n || 1) + 1; el.dataset.n = n;
    el.querySelector('.n').textContent = `×${n}`;
    clearTimeout(el._t); el._t = setTimeout(() => dropToast(el), 2600);
    return;
  }
  const el = document.createElement('div'); el.className = 'tst'; el.dataset.msg = msg;
  el.innerHTML = '<span class="m"></span><span class="n"></span>'; el.querySelector('.m').textContent = msg;
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  el._t = setTimeout(() => dropToast(el), 2600 + Math.min(2400, msg.length * 25));
}
function dropToast(el) { el.classList.add('out'); setTimeout(() => el.remove(), 400); }
function achievementToast(a) {
  const el = $('#ach');
  el.innerHTML = `<small>Logro desbloqueado</small><b>${a.name}</b><span>${a.desc}</span>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  sfx.achievement();
}

// ---------- HUD de supervivencia ----------
function pixIcon(pattern, colors) {
  const c = document.createElement('canvas'); c.width = c.height = 9;
  const x = c.getContext('2d');
  pattern.forEach((row, y) => [...row].forEach((ch, i) => { if (colors[ch]) { x.fillStyle = colors[ch]; x.fillRect(i, y, 1, 1); } }));
  return c.toDataURL();
}
const HEART = ['.kk...kk.', 'kaak.kaak', 'kabaakaak', 'kaaaaaaak', 'kaaaaaaak', '.kaaaaak.', '..kaaak..', '...kak...', '....k....'];
const HEART_HALF = HEART.map((r) => [...r].map((ch, i) => (i > 4 && (ch === 'a' || ch === 'b') ? 'e' : ch)).join(''));
const FOOD = ['......kk.', '.....kwwk', '....kwwk.', '..kkkwk..', '.kaaaak..', 'kaabaak..', 'kaaaaak..', 'kaaaak...', '.kkkk....'];
const FOOD_HALF = FOOD.map((r) => [...r].map((ch, i) => (i < 4 && (ch === 'a' || ch === 'b') ? 'e' : ch)).join(''));
const BUBBLE = ['..kkkkk..', '.kbbbbbk.', 'kbwbbbbbk', 'kbwbbbbbk', 'kbbbbbbbk', 'kbbbbbbbk', 'kbbbbbbbk', '.kbbbbbk.', '..kkkkk..'];
const ICONS = {
  heart: pixIcon(HEART, { k: '#1a0a08', a: '#d93a2e', b: '#ff9a8a' }),
  heartHalf: pixIcon(HEART_HALF, { k: '#1a0a08', a: '#d93a2e', b: '#ff9a8a', e: '#3a2622' }),
  heartEmpty: pixIcon(HEART, { k: '#1a0a08', a: '#3a2622', b: '#3a2622' }),
  food: pixIcon(FOOD, { k: '#1a0e06', a: '#b86a3a', b: '#e0a070', w: '#e8e0d0' }),
  foodHalf: pixIcon(FOOD_HALF, { k: '#1a0e06', a: '#b86a3a', b: '#e0a070', w: '#e8e0d0', e: '#33261c' }),
  foodEmpty: pixIcon(FOOD, { k: '#1a0e06', a: '#33261c', b: '#33261c', w: '#4a4038' }),
  bubble: pixIcon(BUBBLE, { k: '#0e2a3a', b: '#5ab0e0', w: '#e0f4ff' }),
};
const statCache = {};
function renderStats(p) {
  const show = !p.creative;
  $('#stats').hidden = !show;
  if (!show) return;
  const row = (id, val, full, half, empty) => {
    const k = Math.ceil(val);
    if (statCache[id] === k) return;
    statCache[id] = k;
    const el = $(id); el.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const v = k - i * 2;
      const img = document.createElement('img');
      img.src = v >= 2 ? full : v === 1 ? half : empty;
      el.appendChild(img);
    }
  };
  row('#hearts', p.health, ICONS.heart, ICONS.heartHalf, ICONS.heartEmpty);
  row('#food', p.hunger, ICONS.food, ICONS.foodHalf, ICONS.foodEmpty);
  const air = p.headInWater || p.air < 10 ? Math.ceil(p.air) : -1;
  if (statCache.air !== air) {
    statCache.air = air;
    const el = $('#air'); el.innerHTML = '';
    for (let i = 0; i < Math.max(0, Math.min(10, air)); i++) { const img = document.createElement('img'); img.src = ICONS.bubble; el.appendChild(img); }
  }
  const r = Math.round(p.rad);
  if (statCache.rad !== r) {
    statCache.rad = r;
    $('#radFill').style.width = r + '%';
    $('#radFill').style.background = r > 60 ? '#d9534a' : r > 30 ? '#e0c23a' : '#9cff3a';
    $('#radVal').textContent = r + '%';
    $('#rad').classList.toggle('danger', r > 60);
  }
  $('#hearts').classList.toggle('low', p.health <= 6);
  // efectos activos
  const fx = [];
  if (p.buffs.coraje > 0) fx.push('⚔ Coraje');
  if (p.buffs.coraza > 0) fx.push('🛡 Coraza');
  if (p.buffs.plomo > 0) fx.push('☢ Hígado de plomo');
  if (p.buffs.abrigo > 0) fx.push('🍲 Abrigado');
  if (p.buffs.vision > 0) fx.push('👁 Visión nocturna');
  if (p.buffs.frescura > 0) fx.push('🍃 Liviano');
  if (p.buffs.acido > 0) fx.push('❤ Recuperándote');
  if (p.drunk >= 1) fx.push(p.drunk >= 3 ? '🍺 Borracho' : '🍺 Alegre');
  const eq = p.inv.equip;
  if (eq.head || eq.body) fx.push(`🦺 ${Math.round(p.armorDef * 100)}%`);
  const txt = fx.join(' · ');
  if (statCache.fx !== txt) { statCache.fx = txt; $('#buffs').textContent = txt; }
}

function hurtFx(amount) {
  sfx.hurt();
  const el = $('#hurt');
  el.style.transition = 'none'; el.style.opacity = Math.min(0.8, 0.3 + amount * 0.08);
  requestAnimationFrame(() => { el.style.transition = 'opacity 0.6s'; el.style.opacity = 0; });
  game.shake = 0.25;
}
const DEATH_MSG = { 'caída': 'Te caíste desde muy alto.', 'ahogo': 'Te ahogaste.', 'hambre': 'Moriste de hambre.', 'radiación': 'La radiación te consumió.', 'lava': 'Te hundiste en la lava radiactiva.' };
function onDeath(cause) {
  document.exitPointerLock();
  $('#death h2').textContent = 'MORISTE'; $('#respawn').hidden = false; $('#death p.muted').hidden = false; if ($('#runEnd')) $('#runEnd').hidden = true;
  $('#deathCause').textContent = DEATH_MSG[cause] ?? `Te mató ${cause}.`;
  $('#death').hidden = false;
  game.home?.deathOptions();
}
$('#respawn').onclick = () => {
  const m = game.meta;
  game.player.respawn(m.spawn ?? m.origin);
  $('#death').hidden = true;
  statCache['#hearts'] = null;
  lockPointer();
};

function onBed(x, y, z) {
  const m = game.meta;
  m.spawn = { x: x + 0.5, y: y + 1, z: z + 0.5 };
  game.tutorial?.event('bed');
  if (uniforms.daylight.value > 0.4) { flash('Punto de reaparición guardado'); return; }
  for (const mob of game.mobs.list.values()) if (mob.def.hostile && mob.pos.distanceTo(game.player.pos) < 12) { flash('No podés dormir: hay criaturas cerca'); return; }
  if (net.active && !net.isHost) { flash('Punto guardado. En línea sólo el anfitrión hace pasar la noche.'); return; }
  const f = $('#sleepFade');
  f.hidden = false; f.style.opacity = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => { f.style.opacity = 1; }));
  sfx.sleep();
  setTimeout(() => {
    game.time = 0.27;
    for (const mob of [...game.mobs.list.values()]) if (mob.type === 'ghoul' || mob.type === 'rat') game.mobs.remove(mob);
    f.style.opacity = 0;
    setTimeout(() => { f.hidden = true; }, 900);
    flash('Amaneció. Punto de reaparición guardado.');
    saveGame(true);
  }, 1400);
}

function onLearn(bp) {
  if (game.known.has(bp)) { flash('Ya conocías este plano'); return; }
  game.known.add(bp);
  game.meta.blueprints = [...game.known];
  flash(`Aprendiste a fabricar: ${BLUEPRINT_NAMES[bp]}`);
  sfx.craft();
  game.ach.event('learn');
}

function toggleMount() {
  const p = game.player;
  if (p.riding) {
    const v = p.dismount();
    v.rider = null;
    if (!isAuthority()) net.sendVehMove(v, false);
    return;
  }
  if (p.passenger) { p.passenger = null; p.pos.y += 1; flash('Te bajaste'); return; }
  const v = game.vehicles.nearest(p.pos, 4);
  if (!v) {
    // ¿hay uno ocupado con asientos libres? subir como acompañante
    for (const o of game.vehicles.list.values()) if (o.rider && o.rider !== 'local' && o.rider !== 'ai' && VEHICLE_TYPES[o.type].seats > 1 && o.pos.distanceTo(p.pos) < 4) { p.passenger = o; flash('Vas de acompañante · F para bajarte'); return; }
    flash('No hay ningún vehículo cerca'); return;
  }
  v.rider = 'local';
  p.mount(v);
  if (!isAuthority()) net.sendVehMove(v, true);
  const VT = VEHICLE_TYPES[v.type];
  flash(VT.fly ? `${VT.name}: Espacio sube · C baja${VT.climb ? ' (sin tocar nada baja solo)' : ''} · W avanza · A/D giran · F bajarte` : VT.rail ? `${VT.name}: W avanza por las vías · S frena · F bajarte` : VT.mount ? `${VT.name}: W corre · A/D giran · Espacio salta · F bajarte` : `${VT.name}: W acelera · A/D doblan · H bocina · L faros · V cámara${v.tune?.nitro ? ' · Shift nitro' : ''} · F bajarte`);
}

// ---------- Chat ----------
function addChat(name, text) {
  const log = $('#chatLog');
  const line = document.createElement('div');
  if (name) { const b = document.createElement('b'); b.textContent = name + ': '; line.appendChild(b); }
  else line.className = 'sys';
  line.append(text);
  log.appendChild(line);
  while (log.children.length > 8) log.firstChild.remove();
  setTimeout(() => line.classList.add('old'), 9000);
}
function openChat() {
  if (!net.active) return;
  chatting = true;
  const i = $('#chatInput'); i.hidden = false; i.value = ''; setTimeout(() => i.focus(), 0);
  $('#chatLog').classList.add('open');
}
function closeChat() {
  chatting = false;
  const i = $('#chatInput'); i.hidden = true; i.blur();
  $('#chatLog').classList.remove('open');
}
$('#chatInput').addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter') { const v = e.target.value.trim(); if (v) net.sendChat(v); closeChat(); lockPointer(); }
  else if (e.key === 'Escape') { closeChat(); lockPointer(); }
});
net.onChat = addChat;
net.onClosed = async (msg) => {
  if (!game?.meta.remote) return;
  const cloudId = game.meta.cloud;
  await quitToMenu();
  if (cloudId) {
    $('#cloud').hidden = false; renderCloud();
    cloudMsg('El anfitrión salió: retomando el mundo…');
    await sleep(600 + Math.random() * 2400);
    enterCloud(cloudId).catch((e) => cloudMsg(e.message));
    return;
  }
  alert(msg);
};
net.onAuthority = () => addChat(null, 'Ahora tu compu simula las criaturas y el clima de este servidor.');
net.onRace = (m) => game?.race?.onNet(m);
const voice = new Voice(net);
const skinOf = () => { try { return localStorage.getItem('yermo-skin') || 'c0662a|3a3530|gas|none|b08a6a'; } catch { return 'c0662a|3a3530|gas|none|b08a6a'; } };
net.skin = skinOf();

// ---------- Inicio de partida ----------
// en el celular (desde el navegador) jugar en pantalla completa, acostado
function goFullscreen() {
  if (!input?.touch || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || document.fullscreenElement) return;
  try {
    const r = document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    r?.then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  } catch { /* el navegador no lo permite */ }
}
const TIPS = [
  'Con <b>F2</b> entrás al modo foto y con <b>P</b> sacás la captura.',
  'El <b>catre</b> guarda tu punto de reaparición y hace pasar la noche.',
  'Apretá <b>M</b> para ver el mapa grande; <b>J</b> abre el diario.',
  'Las <b>antorchas</b> evitan que aparezcan criaturas cerca.',
  'En la pausa → <b>🌍 Mundo</b> podés cambiar las reglas cuando quieras.',
  'Los <b>plantines</b> que sueltan las hojas crecen solos y se vuelven árboles.',
  'Con la <b>mesa de minijuegos</b> jugás al piso es lava, spleef, parkour y más.',
  'La <b>caja musical</b> toca melodías escritas con do re mi… cuando le llega electricidad.',
  'Tu <b>perro</b> sube de nivel acompañándote: después trae cosas y te avisa del peligro.',
  'En el archipiélago, cuando el corcho dice <b>¡Pica!</b>, clic derecho rápido.',
  'Con <b>V</b> cambiás entre primera y tercera persona.',
  'El <b>dron</b> te marca minerales y cofres cercanos con un rayo azul.',
];
function showTip() { const el = $('#loadTip'); if (!el) return; el.style.opacity = 0; setTimeout(() => { el.innerHTML = '💡 ' + TIPS[Math.floor(Math.random() * TIPS.length)]; el.style.opacity = 1; }, 300); }

async function startGame(meta, hello, cloudInfo) {
  try { if (!meta.remote && !meta.cloud) { localStorage.setItem('yermo-last', meta.id); localStorage.setItem('yermo-open', '1'); } } catch { /* sin almacenamiento */ }
  goFullscreen();
  $('#menu').hidden = true;
  $('#loading').hidden = false;
  $('#loadText').textContent = hello ? 'Conectando al yermo…' : 'Generando el yermo…';
  sfx.start();
  applySettings();
  const world = new World(scene, materials, meta);
  const sim = new Sim(world, meta);
  if (meta.remote) {
    world.noSave = true;
    world.remoteLoader = (k) => net.requestChunk(k);
    for (const k of hello.keys) world.savedKeys.add(k);
  } else if (meta.cloud) {
    // mundo del grupo: los bloques modificados vienen de (y vuelven a) la nube
    for (const k of cloudInfo?.keys || []) world.savedKeys.add(k);
    world.cloudLoad = (k) => Cloud.loadChunk(meta.cloud, k);
    world.remoteLoader = (k) => Cloud.loadChunk(meta.cloud, k).then((data) => ({ data }));
    world.cloudSave = (list) => Cloud.saveChunks(meta.cloud, list);
  } else await world.init();
  if (isReal(meta.worldType)) { const nm = meta.worldType === 'hurlingham' ? 'Hurlingham' : 'Buenos Aires'; $('#loadText').textContent = `Cargando el mapa de ${nm}…`; try { await loadBA(meta.worldType); } catch { flash(`No se pudo cargar el mapa de ${nm}`); } }
  const wgen = new WorldGen(meta.seed, meta.worldType || 'normal');
  if (!meta.origin) meta.origin = meta.player ? { x: meta.player.x, y: meta.player.y, z: meta.player.z } : wgen.findSpawn(meta.spawnPref);
  if (!meta.player) meta.player = { ...meta.origin };
  const inv = new Inventory(meta.inventory, meta.equip);
  inv.selected = meta.selected ?? 0;
  const player = new Player(world, inv, camera, meta, sfx);
  const mobs = new Mobs(scene, world, wgen, sfx);
  const drops = new Drops(scene, world, (id) => ui.icon(id));
  const vehicles = new Vehicles(scene, world);
  const projectiles = new Projectiles(scene, world, mobs);
  const weather = new Weather(scene, meta.weather);
  const known = new Set(meta.blueprints || []);
  if (meta.worldType === 'brew') known.add('cerveza');
  // base equipada: todos los planos aprendidos (menos armas de fuego)
  if (meta.worldType === 'base') for (const k of Object.keys(BLUEPRINT_NAMES)) if (k !== 'armas') known.add(k);
  mobs.sim = sim; drops.sim = sim;
  player.mobs = mobs; player.sim = sim;
  game = { meta, world, sim, player, inv, mobs, drops, vehicles, projectiles, weather, known, sfx, time: meta.time ?? 0.3, saveAcc: 0, shake: 0, geiger: 0, lastTime: meta.time ?? 0.3 };
  game.ach = new Achievements(meta, achievementToast);
  game.guestData = () => ({ inv: inv.serialize(), equip: inv.serializeEquip(), pos: player.serialize(), blueprints: [...known], spawn: meta.spawn, p6: meta.p6 });
  game.dropLocal = (id, n) => dropFromPlayer(id, n);
  game.onRemoteContainer = (k) => {
    if (ui.cont?.key !== k) return;
    const c = sim.containers.get(k);
    if (!c) { closeInventory(); return; }
    ui.cont.c = c; ui.refreshContainerSlots();
  };
  const ev = (n, id) => {
    game?.tutorial?.event(n, id); game?.ach.event(n, id, player);
    if (n === 'kill' && game) game.meta.kills = { ...(game.meta.kills || {}), [id]: ((game.meta.kills || {})[id] || 0) + 1 };
    game?.features2?.event(n, id);
    game?.extras?.event(n, id);
    game?.life?.event(n, id);
    game?.progress?.event(n, id);
    game?.visuals?.event?.(n, id);
    game?.treasure?.event?.(n, id);
  };
  player.onBreakStage = setCrack;
  player.onStation = (st) => openInventory(st);
  player.onDamage = hurtFx;
  player.onDeath = onDeath;
  player.onBed = (x, y, z) => { onBed(x, y, z); ev('bed'); };
  player.onEvent = ev;
  player.onContainer = openContainer;
  player.onShoot = (o, d, dmg) => projectiles.fire(o, d, dmg, player);
  player.onSpawnVehicle = (pos, yaw, type) => { if (isAuthority()) vehicles.spawn(pos, yaw, type); else net.sendVehSpawn(pos, yaw, type); };
  player.onLearn = onLearn;
  player.onHitPlayer = (id, dmg, dir) => net.hitPlayer(id, dmg, dir);
  player.pvpRaycast = (o, d, m) => net.pvpRaycast(o, d, m);
  player.onDrop = (id, n, extra) => dropFromPlayer(id, n, extra?.dur, extra?.q);
  player.onBreakParticles = (x, y, z, id) => { const b = BLOCKS[id]; if (b?.tex) particles.burst(x, y, z, mapView.tileColor[b.tex.side]); };
  projectiles.pvp = (o, d, m) => net.pvpRaycast(o, d, m);
  projectiles.onHitPlayer = (id, dmg, dir) => net.hitPlayer(id, dmg, dir);
  projectiles.onStuck = (pos, item) => spawnDrop(item || 300, 1, pos, new THREE.Vector3());
  drops.onPickupRemote = (peer, item, count, dur) => net.sendTo(peer, { t: 'give', items: [[item, count, dur]] });
  mobs.onBoss = () => { sfx.boss(); flash('¡Un Behemot despertó en el cráter!'); };
  sim.onContainerSync = (k, c) => { if (net.active) net.sendContainer(k, c); if (ui.cont?.key === k) ui.refreshContainerSlots(); };
  sim.onPowerOn = () => game?.ach.event('power');
  ui.onCraft = (id) => { ev('craft', id); if ((id >= 423 && id <= 428) || id === 440 || id === 441) ev('cook', id); };
  ui.onContainerChange = (k, c) => { if (isAuthority()) sim.touch(k); else net.sendContainer(k, c); };
  ui.onDropHeld = (s) => dropFromPlayer(s.id, s.count, s.dur, s.q);
  world.onLocalSet = (x, y, z, id) => { if (net.active) net.sendSet(x, y, z, id); };
  if (meta.remote) {
    net.attachClient(game, scene);
    for (const [k, c] of Object.entries(hello.containers || {})) sim.containers.set(k, c);
    game.time = hello.time;
  } else {
    if (meta.vehicles) for (const v of meta.vehicles) vehicles.spawn(new THREE.Vector3(v.x, v.y, v.z), v.yaw, v.type, v.id, v);
    mobs.loadKeep(meta.npcs);
  }
  mobs.onAttackRemote = (peer, dmg, rad, kn, name) => net.sendTo(peer, { t: 'dmg', amount: dmg, rad, knock: [kn.x, kn.z], cause: name });
  mobs.onKillRemote = (peer, items, type) => net.sendTo(peer, { t: 'give', items, kill: type });
  mobs.onHitRemote = (id, dmg, dir) => net.sendHitMob(id, dmg, dir);
  ui.bind(inv, meta.mode === 'creative', known);
  if (!meta.inventory && !meta.remote) {
    if (meta.mode === 'creative') [2, 9, 13, 23, 14, 26, 28, 38, 80, 245, 246, 247, 240, 244, 75, 249, 250, 251, 252, 191].forEach((id) => inv.add(id, 64)), [405, 406, 407, 408, 409].forEach((id) => inv.add(id, id === 405 ? 1 : 16));
    else if (meta.worldType === 'brew') [[277, 1], [281, 8], [283, 4], [291, 2], [295, 4], [273, 2]].forEach(([id, n]) => inv.add(id, n));
    else if (meta.worldType === 'magic') [[385, 6], [353, 10], [379, 1], [26, 8]].forEach(([id, n]) => inv.add(id, n));
    else if (meta.worldType === 'islands') [[398, 1], [402, 1], [403, 4], [26, 8], [267, 1]].forEach(([id, n]) => inv.add(id, n));
    else if (isReal(meta.worldType)) [[445, 1], [443, 1], [306, 2], [441, 2], [440, 2], [26, 8], [444, 1]].forEach(([id, n]) => inv.add(id, n));
    else if (meta.worldType === 'base') [[234, 1], [268, 1], [269, 1], [270, 1], [276, 1], [26, 32], [272, 16], [329, 1], [306, 4], [360, 1], [339, 2], [24, 1]].forEach(([id, n]) => inv.add(id, n));
  }
  // mundo cervecero: siempre arrancás con un balde (también los que se unen online y los mundos ya creados)
  if (meta.worldType === 'brew' && meta.mode !== 'creative' && ![277, 278, 279, 280].some((id) => inv.count(id) > 0) && !meta.bucketGift) {
    inv.add(277, 1);
    if (!meta.remote) meta.bucketGift = true;
    setTimeout(() => flash('Tenés un balde en la mochila: llenalo en el arroyo para la olla de la cervecería'), 2500);
  }
  game.tutorial = new Tutorial(game, ui, sfx);
  // reglas del mundo: radiación y animales mutantes de día (se pueden cambiar en la pausa)
  game.applyRules = () => {
    const r = Object.assign({ rad: true, dayMobs: true, armed: false, kids: false, realTime: false, learn: false }, game.meta.rules);
    game.meta.rules = r;
    mobs.noArmed = !r.armed || r.kids;
    if (mobs.noArmed && isAuthority()) for (const m of [...mobs.list.values()]) if (m.def.ranged && m.def.human) mobs.remove(m);
    mobs.kids = player.kids = !!r.kids;
    player.noRad = !r.rad || r.kids;
    if (player.noRad) { player.rad = 0; player.radExposure = 0; }
    mobs.peacefulDay = !r.dayMobs;
    $('#rad').hidden = player.noRad;
  };
  game.applyRules();
  // v5: sistemas nuevos
  game.gen = wgen;
  player.name = net.myName || getName() || 'Superviviente'; player.team = net.team;
  player.vehicles = vehicles;
  sim.mobs = mobs;
  sim.entities = () => { const out = [{ x: player.pos.x, y: player.pos.y, z: player.pos.z }]; for (const m of mobs.list.values()) out.push(m.pos); for (const a of net.avatars.values()) out.push(a.pos); return out; };
  game.race = new Race(game, net, sfx, flash, scene);
  const ext = {};
  const fctx = {
    game, ui, net, sfx, flash, scene, camera, renderer, uniforms, skyUniforms, settings, particles, voice, ext,
    skin: skinOf, isAuthority, openInventory, closeInventory, lockPointer, toggleMount, addChat,
    saveGame, Storage, setPause, mapView, toggleBigMap,
    input, isPhoto: () => !!game?.features?.photo, photoKey: () => game.features.key({ code: 'F2', preventDefault() {} }),
    saveSettings: () => { try { localStorage.setItem('yermo-settings', JSON.stringify(settings)); } catch { /* sin almacenamiento */ } },
    endRun: async () => { const id = game.meta.id, local = !game.meta.remote && !game.meta.cloud; $('#death').hidden = true; await quitToMenu(); if (local) { await Storage.deleteWorld(id); showMenu(); } },
    openPanel: (title, render) => { ui.player = player; ui.openPanel(nearbyStations(player.pos), title, render); document.exitPointerLock(); $('#hud').classList.add('dim'); },
  };
  const F = game.features = createFeatures(fctx);
  const F2 = game.features2 = createFeatures2(fctx);
  const E = game.eldra = createEldra(fctx);
  const X = game.extras = createExtras(fctx);
  const MD = game.modes = createModes(fctx);
  const SEAM = game.sea = createSea(fctx);
  const useF2 = player.onUseItem;
  player.onUseItem = (...a) => SEAM.onUseItem(...a) || X.onUseItem(...a) || E.onUseItem(...a) || useF2(...a);
  const MG = game.minigames = createMinigames(fctx);
  const CR = game.creative = createCreative(fctx);
  const NA = game.nature = createNature(fctx);
  game.social = createSocial(fctx);
  const LE = game.learn = createLearn(fctx);
  game.visuals = createVisuals(fctx);
  game.ux = createUX(fctx);
  game.voiceCmd = createVoiceCmd(fctx);
  game.life = createLife(fctx);
  game.progress = createProgress(fctx);
  const BU = game.building = createBuilding(fctx);
  const TO = game.together = createTogether(fctx);
  game.geo = createGeo(fctx);
  const MA = game.machines = createMachines(fctx);
  const blockMA = player.onUseBlock;
  player.onUseBlock = (...a) => MA.onUseBlock(...a) || blockMA(...a);
  const HO = game.home = createHome(fctx);
  game.news = createNews(fctx);
  const WL = game.wildlife = createWildlife(fctx);
  game.qol = createQol(fctx);
  const W13 = game.world13 = createWorld13(fctx);
  const B13 = game.build13 = createBuild13(fctx);
  game.friends13 = createFriends13(fctx);
  game.album = createMemories(fctx);
  game.baires = createBaires(fctx);
  const TX = game.taxi = createTaxi(fctx);
  const useTX = player.onUseItem;
  player.onUseItem = (...a) => TX.onUseItem(...a) || useTX(...a);
  const useB13 = player.onUseItem;
  player.onUseItem = (...a) => B13.onUseItem(...a) || useB13(...a);
  const TR = game.treasure = createTreasure(fctx);
  const useTR = player.onUseItem;
  player.onUseItem = (...a) => TR.onUseItem(...a) || useTR(...a);
  const blockHO = player.onUseBlock, useHO = player.onUseItem;
  player.onUseBlock = (...a) => HO.onUseBlock(...a) || blockHO(...a);
  player.onUseItem = (...a) => HO.onUseItem(...a) || useHO(...a);
  const blockAll = player.onUseBlock;
  player.onUseBlock = (...a) => TO.onUseBlock(...a) || blockAll(...a);
  const useAll = player.onUseItem;
  player.onUseItem = (...a) => BU.onUseItem(...a) || useAll(...a);
  // clic derecho en bloques y criaturas: cada módulo mira primero lo suyo
  const blockF2 = player.onUseBlock;
  player.onUseBlock = (...a) => LE.onUseBlock(...a) || CR.onUseBlock(...a) || MG.onUseBlock(...a) || MD.onUseBlock(...a) || blockF2(...a);
  sim.onMarker = (...a) => E.onMarker(...a) || F2.onMarker(...a) || F.onMarker(...a);
  player.onInteractMob = (m, h) => W13.onInteractMob(m, h) || WL.onInteractMob(m, h) || LE.onInteractMob(m, h) || NA.onInteractMob(m, h) || E.onInteractMob(m, h) || F2.onInteractMob(m, h) || F.onInteractMob(m, h);
  player.onGun = F.onGun;
  player.onReadNote = F.readNote;
  player.onLever = (x, y, z) => sim.toggleLever(x, y, z);
  player.onClaim = (x, y, z) => { if (!sim.claimAt(x, z) || sim.claimAt(x, z).k === `${x},${y},${z}`) { sim.claim(x, y, z, player.name, net.team); flash('Terreno protegido: 12 bloques alrededor del tótem son tuyos (y de tu equipo)'); } };
  player.onBlocked = (msg) => flash(msg || 'Terreno protegido por otro jugador');
  player.onVehicleStorage = F.onVehicleStorage;
  player.onRace = (x, y, z) => game.race.openMenu(x, z, y);
  if (!meta.lastPlayed && !meta.remote) { meta.lastPlayed = Date.now(); await Storage.saveWorld(meta); }
  const t0 = performance.now();
  showTip();
  const tipTimer = setInterval(showTip, 4500);
  await new Promise((res) => {
    const tick = () => {
      world.update(player.pos.x, player.pos.z);
      const n = [...world.chunks.values()].filter((c) => c.hasMesh).length;
      $('#loadText').textContent = `${hello ? 'Recibiendo el mundo' : 'Generando el mundo'}…`;
      $('#loadBar').style.width = Math.min(100, n / 25 * 100) + '%';
      if (world.loadedAround(player.pos.x, player.pos.z, 2) || performance.now() - t0 > 25000) res();
      else setTimeout(tick, 50);
    };
    tick();
  });
  clearInterval(tipTimer);
  let tries = 0;
  while (player.collides(player.pos.x, player.pos.y, player.pos.z) && tries++ < 60) player.pos.y += 1;
  for (const k in statCache) delete statCache[k];
  $('#loading').hidden = true;
  $('#hud').hidden = false;
  $('#chatLog').innerHTML = '';
  $('#netInfo').hidden = !net.active;
  if (net.isClient) $('#netInfo').textContent = net.transport === 'ws' ? `Servidor · ${net.code}` : `En línea · sala ${net.code}`;
  if (!game.tutorial.active && !meta.seenHelp) { $('#help').hidden = false; }
  meta.seenHelp = true;
  paused = false;
  lockPointer();
  if (meta.remote) addChat(null, `Te uniste a la partida de ${hello.hostName}. Chat: T`);
  if (meta.worldType === 'brew' && !meta.brewHint) { meta.brewHint = true; setTimeout(() => flash('Mundo cervecero: explorá la cervecería y abrí la Guía → Cervecería'), 1500); }
}

let quitting = false;
async function quitToMenu() {
  if (!game || quitting) return;
  try { localStorage.setItem('yermo-open', '0'); } catch { /* sin almacenamiento */ }
  quitting = true;
  try { await doQuit(); } finally { quitting = false; }
}
async function doQuit() {
  if (game.player.riding) toggleMount();
  await saveGame(true);
  if (cloudHost) { clearInterval(cloudHost.timer); const ch = cloudHost; cloudHost = null; await Cloud.release(ch.id, ch.tok).catch(() => {}); }
  net.close();
  game.race?.end(); game.features?.dispose(); game.features2?.dispose(); game.eldra?.dispose(); game.extras?.dispose(); game.modes?.dispose(); game.sea?.dispose(); game.minigames?.dispose(); game.creative?.dispose(); game.nature?.dispose(); game.social?.dispose(); game.learn?.dispose(); game.visuals?.dispose(); game.ux?.dispose(); game.voiceCmd?.dispose(); game.life?.dispose(); game.progress?.dispose(); game.building?.dispose(); game.together?.dispose(); game.geo?.dispose(); game.machines?.dispose(); game.home?.dispose(); game.news?.dispose(); game.wildlife?.dispose(); game.treasure?.dispose(); game.qol?.dispose(); game.world13?.dispose(); game.build13?.dispose(); game.friends13?.dispose(); game.album?.dispose(); game.baires?.dispose(); game.taxi?.dispose(); voice.disable();
  game.mobs.clear(); game.drops.clear(); game.vehicles.clear(); game.projectiles.clear();
  scene.remove(game.weather.rain);
  game.world.dispose();
  game = null;
  sfx.setEngine(0); sfx.setRain(0);
  setHand(-2);
  for (const id of ['#pause', '#hud', '#death', '#guide', '#help', '#bigmapWrap']) $(id).hidden = true;
  bigMap = false;
  closeChat();
  $('#pauseHost').hidden = false; $('#hostCode').hidden = true;
  await showMenu();
}

// ---------- Menú ----------
function ago(t) {
  if (!t) return 'nuevo';
  const s = (Date.now() - t) / 1000;
  if (s < 90) return 'recién'; if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`; if (s < 86400 * 30) return `hace ${Math.round(s / 86400)} días`;
  return new Date(t).toLocaleDateString();
}
async function showMenu() {
  $('#menu').hidden = false;
  const worlds = await Storage.listWorlds();
  const list = $('#worldList');
  list.innerHTML = '';
  if (!worlds.length) list.innerHTML = '<p class="empty">Todavía no hay mundos. Creá uno para empezar.</p>';
  for (const w of worlds) {
    const row = document.createElement('div'); row.className = 'world';
    const TYPE = { brew: ['🍺', 'Cervecero'], magic: ['🧙', 'Eldra'], islands: ['🏝', 'Archipiélago'], base: ['🧰', 'Base equipada'], baires: ['🏙', 'Buenos Aires'], hurlingham: ['🏡', 'Hurlingham'] }[w.worldType] || ['🌲', 'Yermo'];
    const MODE = { creative: 'Creativo', hardcore: '☠ Una sola vida', adventure: '🗺 Aventura' }[w.mode] || 'Supervivencia';
    row.innerHTML = `${w.thumb ? `<img class="thumb" src="${w.thumb}" alt="">` : `<div class="thumb">${TYPE[0]}</div>`}<div><b></b><div class="badges"><span class="badge">${TYPE[0]} ${TYPE[1]}</span><span class="badge m-${w.mode}">${MODE}</span>${w.nights ? `<span class="badge">🌙 ${w.nights} noches</span>` : ''}<span class="badge">${ago(w.lastPlayed)}</span></div></div>
      <button class="play primary">Jugar</button><button class="del" title="Borrar mundo">✕</button>`;
    row.querySelector('b').textContent = w.name;
    row.querySelector('.play').onclick = () => startGame(w);
    row.querySelector('.del').onclick = async () => {
      if (confirm(`¿Borrar "${w.name}" para siempre?`)) { await Storage.deleteWorld(w.id); showMenu(); }
    };
    list.appendChild(row);
  }
  $('#jName').value = getName();
  // ¿este sitio es un servidor dedicado?
  try {
    const r = await fetch('/api/server', { cache: 'no-store' });
    const s = await r.json();
    $('#serverBox').hidden = !s.dedicated;
    if (s.dedicated) $('#serverName').textContent = `${s.name} · ${s.players} conectados`;
  } catch { $('#serverBox').hidden = true; }
}
$('#newWorld').onclick = () => { $('#newForm').hidden = false; $('#joinForm').hidden = true; $('#wName').focus(); };
$('#cancelNew').onclick = () => ($('#newForm').hidden = true);
$('#wMode').onchange = (e) => { $('#wTut').checked = e.target.value === 'survival'; };
// semillas elegidas por su arranque (buscadas con tools/find_seeds.mjs)
const SEED_PRESETS = [
  { id: 'random', name: '🎲 Aleatoria', desc: 'Un mundo nuevo y distinto cada vez.' },
  { id: '556', seed: 556, type: 'normal', name: '🌲 El Refugio', desc: 'Bosque muerto tranquilo para empezar; la ciudad queda a unos 90 bloques.' },
  { id: '156', seed: 156, type: 'normal', name: '🏙 Metrópolis', desc: 'Arrancás al borde de una ciudad en ruinas enorme: botín, hospitales y subte.' },
  { id: '226', seed: 226, type: 'normal', name: '☢ Zona Cero', desc: 'Un cráter radiactivo a la vista (y quizás el Behemot). Difícil.' },
  { id: '254', seed: 254, type: 'normal', name: '🏜 Mar de Ceniza', desc: 'Desierto de dunas grises y mesetas; escorpiones y chatarra.' },
  { id: '246', seed: 246, type: 'normal', name: '🟢 Pantano Tóxico', desc: 'Lodo y agua irradiada por todos lados. Cuidado con la radiación.' },
  { id: '317', seed: 317, type: 'normal', name: '🧭 Todo Cerca', desc: 'Todos los biomas a menos de 45 bloques: ciudad, cráter, desierto, pantano y valle.' },
  { id: '29', seed: 29, type: 'normal', name: '🌾 Valle Escondido', desc: 'Mundo normal con una cervecería abandonada a 20 bloques y una ciudad cerca.' },
  { id: '167b', seed: 167, type: 'brew', name: '🍺 Cervecería del Valle', desc: 'Mundo cervecero: valle verde hasta donde da la vista, arrancás en la cervecería.' },
  { id: '317b', seed: 317, type: 'brew', name: '🍺 Ruta del Lúpulo', desc: 'Mundo cervecero con una ciudad en ruinas a unos 110 bloques para saquear.' },
  { id: 'settlement', seed: 3, type: 'normal', spawn: 'settlement', name: '🏘 Asentamiento', desc: 'Arrancás dentro de un pueblo de sobrevivientes con su líder, que da misiones y comercia.' },
  { id: 'circuit', seed: 1, type: 'normal', spawn: 'circuit', name: '🏁 Autódromo', desc: 'Arrancás en los boxes de un autódromo abandonado: autos, motos, carreras y el instructor.' },
  { id: 'base', seed: 556, type: 'base', mode: 'creative', name: '🧰 Base equipada', desc: 'Arrancás en una base con todo listo: helicóptero, bote, autos, motos, camión, tren y vagoneta sobre vías, monturas, taller y cofres llenos. Todos los planos aprendidos. Viene en Creativo, pero podés elegir Supervivencia.' },
  { id: 'hurlingham', seed: 1888, type: 'hurlingham', name: '🏡 Hurlingham', desc: 'El centro de Hurlingham con el mapa real: la plaza Ravenscroft, las estaciones Hurlingham (San Martín) y Rubén Darío (Urquiza), la iglesia Santa Trinidad, el Hurlingham Club y el hipódromo de trote. Alrededor, el yermo.' },
  { id: 'baires', seed: 1936, type: 'baires', name: '🏙 Buenos Aires', desc: 'Réplica del centro porteño: la Avenida 9 de Julio con el Obelisco, la Plaza de la República, Corrientes con sus teatros, la Diagonal Norte, el Teatro Colón y el Metrobús. Alrededor, el yermo. Arrancás al pie del Obelisco con un globo aerostático.' },
  { id: 'islas', seed: 11, type: 'islands', name: '🏝 Archipiélago', desc: 'Mar abierto con islas de arena y palmeras, corales, naufragios con cofres del tesoro y faros. Arrancás con caña de pescar y un velero: pescá, buceá (con tanque de buceo) y navegá entre islas.' },
  { id: 'eldra', seed: 7, type: 'magic', name: '🧙 Reinos de Eldra', desc: 'Mundo medieval y mágico: colinas de medianos, bosques élficos de árboles de plata, montes enanos con mithril, ciénagas con arañas y un dragón en las Tierras de Brasa. Orcos de noche, trolls que se vuelven piedra con el sol, magos, báculos, anillos y pociones. Sin historia: explorá a tu ritmo.' },
  { id: 'zoo', seed: 5, type: 'normal', spawn: 'zoo', name: '🦁 Bioparque', desc: 'Arrancás en la entrada de un zoológico abandonado: leones, jirafas, elefantes, cebras, gorilas, pingüinos, hipopótamos y más andan sueltos. Algunos se domestican y se montan.' },
  { id: 'custom', name: '✏ Personalizada…', desc: 'Escribí tu propia semilla (número o palabra). La misma semilla genera siempre el mismo mundo.' },
];
for (const p of SEED_PRESETS) { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; $('#wSeedSel').appendChild(o); }
$('#wSeedSel').onchange = () => {
  const p = SEED_PRESETS.find((x) => x.id === $('#wSeedSel').value);
  $('#seedDesc').textContent = p.desc + (p.seed != null ? ` (semilla ${p.seed})` : '');
  $('#wSeed').hidden = p.id !== 'custom';
  if (p.id === 'custom') $('#wSeed').focus();
  if (p.type) $('#wType').value = p.type;
  if (p.mode) { $('#wMode').value = p.mode; $('#wTut').checked = p.mode === 'survival'; }
};
$('#wSeedSel').onchange();
$('#createWorld').onclick = () => {
  const name = $('#wName').value.trim() || ($('#wType').value === 'brew' ? 'Cervecería del yermo' : $('#wType').value === 'magic' ? 'Reinos de Eldra' : $('#wType').value === 'islands' ? 'Archipiélago' : $('#wType').value === 'baires' ? 'Buenos Aires' : $('#wType').value === 'hurlingham' ? 'Hurlingham' : 'Yermo sin nombre');
  const preset = SEED_PRESETS.find((x) => x.id === $('#wSeedSel').value);
  const s = preset.id === 'custom' ? $('#wSeed').value.trim() : '';
  const seed = preset.seed ?? (s ? (/^-?\d+$/.test(s) ? parseInt(s) : [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7)) : (Math.random() * 2e9) | 0);
  const meta = { id: 'w' + Date.now().toString(36), name, seed, mode: $('#wMode').value, worldType: $('#wType').value, renderDist: +$('#optDist').value || QUALITY[settings.quality].dist };
  if (preset.spawn) meta.spawnPref = preset.spawn;
  meta.rules = { rad: $('#wRad').checked, dayMobs: $('#wDay').checked, armed: $('#wArmed').checked, kids: $('#wKids').checked, realTime: $('#wReal').checked, learn: $('#wLearn').checked };
  if ($('#wTut').checked) meta.tutorial = { step: 0, done: false };
  $('#newForm').hidden = true;
  startGame(meta);
};
$('#joinWorld').onclick = () => { $('#joinForm').hidden = false; $('#newForm').hidden = true; $('#jCode').focus(); setTimeout(() => $('#doJoin').scrollIntoView({ block: 'center', behavior: 'smooth' }), 350); };
// Enter / «Ir» del teclado del celular confirma
$('#jCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#jCode').blur(); $('#doJoin').click(); } });
$('#jName').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#jCode').focus(); } });
$('#cancelJoin').onclick = () => ($('#joinForm').hidden = true);
function metaFromHello(hello, id) {
  const g = hello.guest;
  return {
    id, name: 'Online', seed: hello.seed, mode: hello.mode, worldType: hello.worldType, remote: true, renderDist: Math.min(6, QUALITY[settings.quality].dist),
    player: g?.pos ? { ...g.pos } : { ...hello.spawn }, origin: hello.spawn, spawn: g?.spawn, rules: hello.rules,
    inventory: g?.inv, equip: g?.equip, blueprints: g?.blueprints, p6: g?.p6,
  };
}
async function joinWith(fn, id) {
  const name = $('#jName').value.trim() || 'Superviviente';
  setName(name);
  $('#joinMsg').textContent = 'Conectando…';
  $('#doJoin').disabled = true;
  try {
    const hello = await fn(name);
    $('#joinMsg').textContent = '';
    $('#joinForm').hidden = true;
    await startGame(metaFromHello(hello, id), hello);
  } catch (e) {
    net.close();
    $('#joinMsg').textContent = e.message || 'No se pudo conectar.';
    $('#joinForm').hidden = false;
  } finally { $('#doJoin').disabled = false; }
}
$('#doJoin').onclick = () => {
  const code = $('#jCode').value.trim();
  if (code.length < 4) { $('#joinMsg').textContent = 'Escribí el código de la sala o la dirección del servidor.'; return; }
  // dirección de servidor dedicado (ip:puerto o dominio)
  if (/[.:]/.test(code)) {
    const url = code.startsWith('ws') ? code : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${code.replace(/^https?:\/\//, '')}/ws`;
    joinWith((n) => net.joinServer(url, n), 'srv-' + code);
  } else joinWith((n) => net.join(code, n), 'net-' + code.toUpperCase());
};
$('#joinServer').onclick = () => {
  $('#joinForm').hidden = false;
  if (!$('#jName').value.trim()) { $('#jName').focus(); $('#joinMsg').textContent = 'Poné tu nombre y tocá de nuevo «Entrar al servidor».'; return; }
  joinWith((n) => net.joinServer(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`, n), 'srv-' + location.host);
};
$('#openGuide').onclick = () => guide.open();
$('#guideClose').onclick = () => guide.close();

// ---------- Pausa / opciones ----------
function setPause(p) {
  if (p && !paused && typeof pauseTab === 'function') pauseTab('juego');
  paused = p;
  $('#pause').hidden = !p;
  if (p && game) {
    $('#optDistP').value = game.world.renderDist; $('#optDistV').textContent = game.world.renderDist;
    const t = game.tutorial;
    $('#tutBtn').textContent = t.active ? '🎓 Saltar tutorial' : '🎓 Reiniciar tutorial';
    $('#pauseHost').hidden = !!game.meta.remote || net.isHost;
    $('#pauseTitle').textContent = net.active ? 'Menú (la partida sigue)' : 'Pausa';
    $('#onlineOpts').hidden = !net.active;
    $('#optPvp').disabled = !net.isHost;
    $('#optPvp').checked = net.pvp;
    $('#optTeam').value = net.team;
    $('#optPublic').checked = net.public; $('#optPublic').disabled = !net.isHost;
    $('#optVoice').checked = voice.on; $('#optVoice').disabled = net.transport !== 'peer';
    $('#achBtn').textContent = `🏅 Logros ${game.ach.count()}/${ACHIEVEMENTS.length}`;
    $('#optName').value = game.player.name;
    const rules = game.meta.rules || {}, canRules = !net.isClient;
    $('#optRad').checked = rules.rad !== false; $('#optDay').checked = rules.dayMobs !== false; $('#optArmed').checked = !!rules.armed;
    $('#optKids').checked = !!rules.kids; $('#optReal').checked = !!rules.realTime; $('#optLearn').checked = !!rules.learn;
    $('#optRad').disabled = $('#optDay').disabled = $('#optArmed').disabled = $('#optKids').disabled = $('#optReal').disabled = $('#optLearn').disabled = !canRules;
    $('#rulesInfo').textContent = canRules ? '' : '(las decide el anfitrión)';
  }
}
$('#resume').onclick = () => { setPause(false); lockPointer(); };
function pauseTab(t) {
  for (const b of document.querySelectorAll('.ptabs button')) b.classList.toggle('on', b.dataset.t === t);
  for (const s of document.querySelectorAll('.ptab')) s.hidden = s.dataset.t !== t;
  settings.pauseTab = t;
}
for (const b of document.querySelectorAll('.ptabs button')) b.onclick = () => { pauseTab(b.dataset.t); sfx.click(); };
pauseTab('juego');
$('#saveQuit').onclick = () => quitToMenu();
$('#pauseGuide').onclick = () => guide.open();
$('#achBtn').onclick = () => guide.open('Logros');
$('#tutBtn').onclick = () => { const t = game.tutorial; if (t.active) t.skip(); else t.restart(); setPause(true); };
$('#pauseHost').onclick = async () => {
  const b = $('#pauseHost');
  b.disabled = true; b.textContent = 'Abriendo…';
  try {
    let name = getName();
    if (!name) { name = (prompt('¿Con qué nombre te van a ver?', 'Superviviente') || 'Superviviente').slice(0, 20); setName(name); }
    const code = await net.host(game, scene, name);
    b.hidden = true;
    $('#hostCode').hidden = false;
    $('#hostCodeVal').textContent = code;
    $('#netInfo').hidden = false; $('#netInfo').textContent = `Sala abierta · código ${code}`;
    addChat(null, `Sala abierta. Código: ${code}`);
    setPause(true);
  } catch (e) {
    alert('No se pudo abrir la sala: ' + (e.message || e.type || e));
  } finally { b.disabled = false; b.textContent = 'Abrir a amigos (online)'; }
};
$('#copyCode').onclick = () => { navigator.clipboard?.writeText($('#hostCodeVal').textContent); flash('Código copiado'); };
$('#optPvp').onchange = (e) => { net.pvp = e.target.checked; addChat(null, net.pvp ? 'PvP activado' : 'PvP desactivado'); };
$('#optTeam').onchange = (e) => { net.team = e.target.value; if (game) game.player.team = net.team; };
$('#optDistP').oninput = (e) => { const v = +e.target.value; $('#optDistV').textContent = v; game.world.renderDist = v; game.meta.renderDist = v; };
$('#optSens').oninput = (e) => { const v = +e.target.value; game.player.sens = v / 10000; game.meta.sens = v / 10000; };
$('#optVol').oninput = (e) => { settings.sfx = +e.target.value; applySettings(); };
$('#optMusic').oninput = (e) => { settings.music = +e.target.value; applySettings(); };
$('#optAmb').oninput = (e) => { settings.ambVol = +e.target.value; applySettings(); };
$('#optAmb').value = settings.ambVol ?? 70;
$('#optQuality').onchange = (e) => { settings.quality = e.target.value; applySettings(); };
$('#optBattery').onchange = (e) => { settings.battery = e.target.checked; applySettings(); flash(settings.battery ? '🔋 Ahorro de batería: 30 cuadros por segundo y menos efectos' : 'Ahorro de batería desactivado'); };
$('#optAutoDist').onchange = (e) => { settings.autoDist = e.target.checked; applySettings(); if (!settings.autoDist && game) game.world.renderDist = game.meta.renderDist || game.world.renderDist; };
$('#optBattery').checked = !!settings.battery; $('#optAutoDist').checked = settings.autoDist !== false;
// sin conexión: se puede jugar igual (lo online y la nube quedan para cuando vuelva internet)
function onlineState() { const off = !navigator.onLine; $('#offlineNote').hidden = !off; }
addEventListener('online', onlineState); addEventListener('offline', onlineState); onlineState();
// cambiar el nombre en plena partida: mascotas, terrenos, empleados y online siguen siendo tuyos
function renamePlayer() {
  if (!game) return;
  const n = $('#optName').value.trim().slice(0, 20);
  const old = game.player.name;
  if (!n || n === old) return;
  setName(n); $('#jName').value = n;
  game.player.name = n;
  for (const m of game.mobs.list.values()) if (m.owner === old) m.owner = n;
  for (const [k, c] of game.sim.containers) if (c.type === 'claim' && c.owner === old) { c.owner = n; game.sim.touch(k); }
  if (net.active) { net.myName = n; net.send({ t: 'fx', op: 'rename', id: net.myId, name: n, old }); addChat(null, `Ahora te llamás ${n}`); }
  flash(`Ahora te llamás ${n}`);
}
$('#optNameOk').onclick = renamePlayer;
$('#optName').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); renamePlayer(); $('#optName').blur(); } });
const RULE_MSG = { rad: ['☢ Radiación activada', 'Radiación desactivada'], dayMobs: ['Los animales mutantes vuelven a atacar de día', 'De día los animales mutantes ya no atacan'], armed: ['🔫 Vuelven los bandidos, piratas y soldados', 'Sin humanos armados en este mundo'], kids: ['🧸 Modo chicos: sin monstruos, sin hambre ni sed y sin radiación', 'Modo chicos desactivado'], realTime: ['🕐 Hora real: el día y la noche siguen tu reloj, y la estación es la de verdad', 'El tiempo vuelve a correr a ritmo de juego'], learn: ['📚 Modo aprender: el Profe Robi te espera cerca del inicio', 'Modo aprender desactivado'] };
const setRule = (k, v) => { if (!game || net.isClient) return; game.meta.rules = { ...(game.meta.rules || {}), [k]: v }; game.applyRules(); flash(RULE_MSG[k][v ? 0 : 1]); };
$('#optRad').onchange = (e) => setRule('rad', e.target.checked);
$('#optDay').onchange = (e) => setRule('dayMobs', e.target.checked);
$('#optArmed').onchange = (e) => setRule('armed', e.target.checked);
$('#optKids').onchange = (e) => setRule('kids', e.target.checked);
$('#optReal').onchange = (e) => setRule('realTime', e.target.checked);
$('#optLearn').onchange = (e) => setRule('learn', e.target.checked);
$('#accBtn').onclick = () => { $('#pause').hidden = true; access.open(() => { $('#pause').hidden = false; }); };
$('#openAccess').onclick = () => access.open();
$('#openRanking').onclick = () => openRanking();
$('#openAdventures').onclick = () => openAdventures({ startGame, Storage });
// paquetes de texturas: plantilla para editar y carga de un PNG propio (se guarda en el navegador)
function usePack(url, save) {
  const img = new Image();
  img.onload = () => {
    const n = applyPack(atlasCanvas, img);
    atlas.needsUpdate = true; matAtlas.needsUpdate = true;
    ui.iconCache.clear(); if (game) ui.refresh?.(); handId = -1;
    $('#packInfo').textContent = n ? `· paquete propio (${n} texturas)` : '';
    $('#packClear').hidden = !n;
    if (save && n) { try { localStorage.setItem('yermo-pack', url); } catch { flash('El paquete es muy grande para guardarlo: se usa sólo en esta sesión'); } }
    if (save) flash(n ? `Paquete de texturas cargado: ${n} texturas reemplazadas` : 'El PNG no tiene texturas (¿16 columnas?)');
  };
  img.src = url;
}
$('#packExport').onclick = () => {
  const c = exportTemplate(atlasCanvas, 32);
  const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'yermo-texturas-plantilla.png'; a.click();
  flash('Plantilla descargada: 16 columnas, un tile de 32×32 por celda. Editala y cargala con «Cargar paquete».');
};
$('#packLoad').onclick = () => $('#packFile').click();
$('#packFile').onchange = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => usePack(r.result, true); r.readAsDataURL(f); e.target.value = ''; };
$('#packClear').onclick = () => { try { localStorage.removeItem('yermo-pack'); } catch { /* nada */ } location.reload(); };
try { const saved = localStorage.getItem('yermo-pack'); if (saved) usePack(saved, false); } catch { /* sin almacenamiento */ }
$('#optQuality').value = settings.quality; $('#optVol').value = settings.sfx; $('#optMusic').value = settings.music;
for (const [k, t] of Object.entries(TEAMS)) { const o = document.createElement('option'); o.value = k; o.textContent = t.name; $('#optTeam').appendChild(o); }
$('#helpClose').onclick = () => { $('#help').hidden = true; lockPointer(); };
$('#bigmapWrap').onclick = (e) => { if (e.target !== $('#bigmapWrap')) return; bigMap = false; $('#bigmapWrap').hidden = true; };
$('#invClose').onclick = () => closeInventory();

// ---------- v5: notas, carreras, personaje, lista pública, voz ----------
$('#noteClose').onclick = () => { $('#noteReader').hidden = true; lockPointer(); };
document.querySelectorAll('#raceMenu [data-laps]').forEach((b) => (b.onclick = () => { game.race.start(+b.dataset.laps); lockPointer(); }));
$('#raceCancel').onclick = () => { $('#raceMenu').hidden = true; lockPointer(); };
$('#raceChamp').onclick = () => { game.race.startChamp(); lockPointer(); };
$('#podiumNext').onclick = () => { game.race.nextRound(); lockPointer(); };
$('#optPublic').onchange = (e) => { net.public = e.target.checked; if (net.public) { net.announce(); flash('Tu sala aparece en «Partidas públicas»'); } };
$('#optVoice').onchange = async (e) => {
  if (e.target.checked) {
    try { await voice.enable(); flash('Chat de voz activado: se te escucha a menos de 40 bloques'); }
    catch (err) { e.target.checked = false; flash(err.message || 'No se pudo usar el micrófono'); }
  } else voice.disable();
};

// editor de personaje con vista previa 3D
const SKIN_COLORS = [
  ['c0662a', '3a7ac0', '7ac03a', 'c03a8a', 'c0b03a', '3ac0b0', '5a6a4a', '8a2a24', '2a2a2a', 'e8e8e8'],
  ['3a3530', '2a3a5a', '4a4a3a', '5a3a2a', '1a1a1a', '6a6a66'],
  null, null,
  ['b08a6a', 'e0b890', '8a5a3a', '5a3a2a', 'f0c8a0'],
];
let skinScene = null;
function skinParts() { return skinOf().split('|'); }
function setSkinPart(i, v) { const s = skinParts(); s[i] = v; const str = s.join('|'); try { localStorage.setItem('yermo-skin', str); } catch { /* sin almacenamiento */ } net.skin = str; drawSkin(); }
function drawSkin() {
  if (!skinScene) {
    const r = new THREE.WebGLRenderer({ canvas: $('#skinPreview'), antialias: true, alpha: true });
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));
    const cam = new THREE.PerspectiveCamera(35, 440 / 200, 0.1, 50); cam.position.set(0, 1.2, 4.2); cam.lookAt(0, 1, 0);
    const av = new Avatar(sc, 'preview', '', 0); av.tag.visible = false; av.seen = true;
    skinScene = { r, sc, cam, av };
  }
  const { r, sc, cam, av } = skinScene;
  av.setSkin(skinOf()); av.skinKey = null; av.setSkin(skinOf());
  av.update(0.016); av.group.rotation.y = performance.now() / 1500;
  r.render(sc, cam);
  document.querySelectorAll('.swatches').forEach((w) => { const k = +w.dataset.k; [...w.children].forEach((b) => b.classList.toggle('on', b.dataset.c === skinParts()[k])); });
  if (!$('#skinEditor').hidden) requestAnimationFrame(drawSkin);
}
document.querySelectorAll('.swatches').forEach((w) => {
  const k = +w.dataset.k;
  for (const c of SKIN_COLORS[k]) { const b = document.createElement('button'); b.style.background = '#' + c; b.dataset.c = c; b.onclick = () => setSkinPart(k, c); w.appendChild(b); }
});
$('#skinMask').onchange = (e) => setSkinPart(2, e.target.value);
$('#skinHat').onchange = (e) => setSkinPart(3, e.target.value);
$('#openSkin').onclick = () => { $('#skinEditor').hidden = false; $('#skinMask').value = skinParts()[2]; $('#skinHat').value = skinParts()[3]; drawSkin(); };
$('#skinClose').onclick = () => { $('#skinEditor').hidden = true; };

// lista pública de partidas
async function loadLobby() {
  const list = $('#lobbyList');
  list.innerHTML = '<p class="muted">Buscando…</p>';
  try {
    const rooms = await (await fetch('/api/lobby', { cache: 'no-store' })).json();
    list.innerHTML = rooms.length ? '' : '<p class="empty">No hay partidas públicas en este momento.</p>';
    for (const r of rooms) {
      const row = document.createElement('div'); row.className = 'world';
      row.innerHTML = `<div><b></b><small>${r.server ? '🖧 Servidor dedicado' : 'Sala ' + r.code} · ${r.players} jugando · ${r.type === 'brew' ? '🍺 Cervecero · ' : ''}${r.mode === 'creative' ? 'Creativo' : 'Supervivencia'}</small></div><button class="play">Unirse</button>`;
      row.querySelector('b').textContent = r.server ? r.name : `${r.world} (de ${r.name})`;
      row.querySelector('.play').onclick = () => {
        $('#lobby').hidden = true; $('#joinForm').hidden = false;
        if (r.server) $('#joinServer').click(); else { $('#jCode').value = r.code; $('#doJoin').click(); }
      };
      list.appendChild(row);
    }
  } catch { list.innerHTML = '<p class="empty">Este sitio no tiene lista pública (abrilo con Jugar.bat o desde un servidor de Yermo).</p>'; }
}
$('#openLobby').onclick = () => { $('#lobby').hidden = false; loadLobby(); };
$('#lobbyRefresh').onclick = loadLobby;
$('#lobbyClose').onclick = () => { $('#lobby').hidden = true; };

// ---------- Entrada ----------
const overlayOpen = () => !$('#cloud').hidden || !$('#death').hidden || !$('#guide').hidden || !$('#help').hidden || !$('#noteReader').hidden || !$('#raceMenu').hidden || !!document.querySelector('.v6modal') || chatting;
const inputActive = () => locked || (input && (input.touch || input.padActive)) || !!game?.voiceCmd?.on;
canvas.addEventListener('click', () => { if (game && !paused && !ui.open && !overlayOpen()) lockPointer(); });
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && game && !ui.open && !overlayOpen() && !input.padActive) setPause(true);
  if (locked) { setPause(false); $('#help').hidden = true; }
});
document.addEventListener('mousemove', (e) => { if (locked && game) game.player.look(e.movementX, e.movementY); });
document.addEventListener('mousedown', (e) => {
  if (!locked || !game) return;
  if (e.button === 0) game.player.mouse.left = true;
  if (e.button === 2) { game.player.mouse.right = true; game.player.placeCooldown = 0; }
});
document.addEventListener('mouseup', (e) => {
  if (!game) return;
  if (e.button === 0) game.player.mouse.left = false;
  if (e.button === 2) game.player.mouse.right = false;
});
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('wheel', (e) => { if (locked && game) ui.select(game.inv.selected + Math.sign(e.deltaY)); }, { passive: true });
function dropHand(all) {
  const h = game.inv.hand;
  if (!h) return;
  const n = all ? h.count : 1;
  dropFromPlayer(h.id, n, h.dur, h.q);
  h.count -= n; if (h.count <= 0) game.inv.slots[game.inv.selected] = null;
  game.inv.onChange();
}
function toggleBigMap() { bigMap = !bigMap; $('#bigmapWrap').hidden = !bigMap; if (bigMap) { mapView.panX = mapView.panZ = 0; game?.ux?.mapOpened?.(); document.exitPointerLock(); } else lockPointer(); }
let showDebug = false;
document.addEventListener('keydown', (e) => {
  if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA' || e.target?.tagName === 'SELECT') return;
  if (e.code === 'Escape' && !$('#guide').hidden) { guide.close(); return; }
  if (!game || chatting) return;
  if (!$('#death').hidden) return;
  if (e.code === 'KeyE' || (e.code === 'Escape' && ui.open)) {
    e.preventDefault();
    if (ui.open) closeInventory(); else if (inputActive()) openInventory();
    return;
  }
  if (e.code === 'F3') { e.preventDefault(); showDebug = !showDebug; $('#debug').hidden = !showDebug; return; }
  if ((locked || game.features.photo) && game.features.key(e)) return;
  if (locked && game.features2.key(e)) return;
  if (locked && game.ux?.key(e)) return;
  if (game.voiceCmd?.key(e)) return;
  if (locked && game.progress?.key(e)) return;
  if (e.code === 'KeyM' && inputActive()) { toggleBigMap(); return; }
  if (!locked) return;
  if (e.code === 'KeyT' && net.active) { e.preventDefault(); game.player.keys = {}; openChat(); return; }
  if (e.code === 'KeyQ') { dropHand(e.ctrlKey); return; }
  if (e.code === 'KeyF') { toggleMount(); return; }
  if (e.code.startsWith('Digit')) { const n = +e.code.slice(5); if (n >= 1 && n <= 9) ui.select(n - 1); }
  if (e.code === 'KeyG') { saveGame(); }
  if (['Space', 'ControlLeft'].includes(e.code)) e.preventDefault();
  game.player.keyDown(e.code);
});
document.addEventListener('keyup', (e) => { if (game) game.player.keyUp(e.code); });
addEventListener('beforeunload', () => { if (game) saveGame(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && game) saveGame(true); });

// joystick y pantallas táctiles
const input = new Input({
  look: (dx, dy) => { if (game && !ui.open && !paused) game.player.look(dx, dy); },
  setKey: (code, on) => { if (!game) return; if (on) game.player.keyDown(code); else game.player.keyUp(code); },
  mouse: (btn, on) => { if (!game || ui.open) return; if (btn === 0) game.player.mouse.left = on; else { game.player.mouse.right = on; game.player.placeCooldown = 0; } },
  press: (name) => {
    if (!game) return;
    if (name === 'inventory') { if (ui.open) closeInventory(); else openInventory(); }
    else if (name === 'map') toggleBigMap();
    else if (name === 'prev') ui.select(game.inv.selected - 1);
    else if (name === 'next') ui.select(game.inv.selected + 1);
    else if (name === 'pause') setPause(!paused);
    else if (name === 'mount') toggleMount();
    else if (name === 'drop') dropHand(false);
    else if (name === 'voice') game.voiceCmd?.toggle();
    else if (name === 'chat') { if (net.active) { game.player.keys = {}; openChat(); } }
    else {
      // atajos del teclado para la barra táctil
      const code = { waypoint: 'KeyN', emotes: 'KeyB', camera: 'KeyV', photo: 'F2', journal: 'KeyJ' }[name];
      const e = { code, preventDefault() {} };
      if (code) game.features.key(e) || game.features2.key(e) || game.ux?.key(e);
    }
  },
  opts: () => settings,
});
input.applyTouchOpts(settings);
addEventListener('touchopts', () => input.applyTouchOpts(settings));

// ---------- Bucle ----------
let last = performance.now(), fpsAcc = 0, fpsN = 0, fps = 0, hudAcc = 0;
const gen = { g: null, seed: null };
// versión visible (cambiarla en cada actualización publicada)
const VERSION = '14.4 · 2026-10-02';
document.querySelectorAll('.ver').forEach((e) => (e.textContent = 'YERMO v' + VERSION));
let wasPlaying = null;
document.body.classList.add('ctl'); // esta versión controla cuándo se ven los controles táctiles
let skipT = 0, distAcc = 0, distLow = 0, distHigh = 0, lastInputT = performance.now();
for (const ev2 of ['keydown', 'mousemove', 'mousedown', 'touchstart', 'wheel']) addEventListener(ev2, () => { lastInputT = performance.now(); }, { passive: true });
function loop(now) {
  requestAnimationFrame(loop);
  // ahorro: con batería, a 30 cuadros; en menús, pausa o mochila, a 20; quieto un rato, a 30
  const idleSlow = game && !paused && !ui.open && performance.now() - (lastInputT || 0) > 30000 && Math.hypot(game.player.vel.x, game.player.vel.z) < 0.1;
  const cap = !game || paused || ui.open ? 48 : settings.battery || idleSlow ? 30 : 0;
  if (cap && now - skipT < cap) return;
  skipT = now;
  // controles táctiles visibles sólo jugando (sin menús, mochila ni ventanas encima)
  const playing = !!game && !ui.open && $('#menu').hidden && $('#loading').hidden && !document.querySelector('.overlay:not([hidden]), .v6modal');
  if (playing !== wasPlaying) { wasPlaying = playing; document.body.classList.toggle('playing', playing); }
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  // distancia automática: si se traba, dibuja menos lejos; si anda sobrado, vuelve a lo elegido
  if (game && settings.autoDist !== false && !paused && document.visibilityState === 'visible') {
    distAcc += dt;
    if (distAcc > 1) {
      distAcc = 0;
      const target = settings.battery ? 26 : 50, W = game.world, want = game.meta.renderDist || 6;
      if (fps && fps < target * 0.55 && W.renderDist > 3) { if (++distLow >= 4) { distLow = 0; W.renderDist--; if (!game.distNote) { game.distNote = true; flash('⚡ Bajé un poco la distancia de visión para que ande fluido'); } } } else distLow = 0;
      if (fps >= target * 0.95 && W.renderDist < want) { if (++distHigh >= 10) { distHigh = 0; W.renderDist++; } } else distHigh = 0;
    }
  }
  renderer.clear();
  input.updatePad(dt);
  if (!game) {
    camera.position.set(0, 0, 0); camera.rotation.set(0.15, now / 30000, 0);
    const t = 0.72;
    const { top, hor } = colorsAt(t);
    skyUniforms.top.value.copy(top); skyUniforms.horizon.value.copy(hor);
    const ang = (t - 0.25) * Math.PI * 2;
    skyUniforms.sunDir.value.set(Math.cos(ang), Math.sin(ang), 0.25).normalize();
    skyUniforms.sunCol.value.setRGB(1, 0.7, 0.45); skyUniforms.night.value = 0.2;
    sky.position.copy(camera.position);
    ash.visible = false;
    renderer.render(scene, camera);
    return;
  }
  ash.visible = true;
  const { player, world, mobs, sim, drops, vehicles, projectiles, weather } = game;
  const auth = isAuthority();
  mobs.authority = drops.authority = vehicles.authority = weather.authority = sim.authority = auth;
  // en línea el mundo no se detiene con la pausa
  const simDt = paused && !net.active ? 0 : dt;
  const active = inputActive() && !paused && !ui.open && !chatting;
  player.analog = input.analog; player.autoRun = input.autoRun;
  { const v = player.riding || player; const vx = v.vel?.x ?? 0, vz = v.vel?.z ?? 0, sp = Math.hypot(vx, vz); world.bias = sp > 2 ? { x: vx / sp * Math.min(3, sp / 4), z: vz / sp * Math.min(3, sp / 4) } : null; }
  game.time = (game.time + simDt / DAY_LEN) % 1;
  // amanecer: logro por noche sobrevivida
  if (game.lastTime < 0.25 && game.time >= 0.25 && !player.dead) game.ach.event('dawn');
  game.lastTime = game.time;
  player.extraRad = weather.rainK > 0.3 && sim.skyOpen(Math.floor(player.pos.x), Math.floor(player.pos.y + 1.6), Math.floor(player.pos.z)) ? weather.rainK * 1.5 : 0;
  if (player.passenger) { const v = player.passenger; player.pos.set(v.pos.x + Math.cos(v.yaw) * 0.6, v.pos.y + 0.2, v.pos.z - Math.sin(v.yaw) * 0.6); player.vel.set(0, 0, 0); if (!game.vehicles.list.has(v.id)) player.passenger = null; }
  player.update(simDt, active);
  game.features.camera();
  world.update(player.pos.x, player.pos.z);
  updateSky(game.time);
  const players = [{ pos: player.pos, dead: player.dead, creative: player.creative, local: true, player, name: player.name }];
  if (net.active && auth) players.push(...net.remotePlayers());
  mobs.update(simDt, players, uniforms.daylight.value);
  drops.update(simDt, players, uniforms.daylight.value);
  vehicles.update(simDt);
  projectiles.update(simDt);
  weather.update(simDt, camera.position);
  sim.update(simDt, uniforms.daylight.value);
  particles.update(dt, uniforms.daylight.value);
  net.update(dt);
  game.tutorial.update(simDt);
  game.features.update(dt);
  game.features2.update(dt);
  game.eldra?.update(dt);
  game.extras?.update(dt);
  game.modes?.update(dt);
  game.sea?.update(dt);
  game.minigames?.update(dt);
  game.creative?.update(dt);
  game.nature?.update(dt);
  game.social?.update(dt);
  game.learn?.update(dt);
  game.visuals?.update(dt);
  game.ux?.update(dt);
  game.voiceCmd?.update(dt);
  game.life?.update(dt);
  game.progress?.update(dt);
  game.together?.update(dt);
  game.geo?.update(dt);
  game.machines?.update(dt);
  game.treasure?.update(dt);
  game.wildlife?.update(dt);
  game.qol?.update(dt);
  game.world13?.update(dt);
  game.build13?.update(dt);
  game.friends13?.update(dt);
  game.album?.update(dt);
  game.baires?.update(dt);
  game.taxi?.update(dt);
  game.race.update(dt);
  if (player.riding) {
    if (auth) player.riding.rider = 'local';
    sfx.setEngine(Math.min(1, (player.riding.speed || 0) / 15) * 0.8 + 0.2);
  } else sfx.setEngine(0);
  sfx.setRain(weather.rainK);
  uniforms.time.value = now / 1000;
  uniforms.underwater.value = player.headInWater ? 1 : 0;
  if (player.headInWater) {
    // agua limpia: azul y se ve más lejos; tóxica: verde y turbia
    const cb = world.getBlock(Math.floor(camera.position.x), Math.floor(camera.position.y), Math.floor(camera.position.z));
    const clean = LIQ[cb] === 2;
    uniforms.uwCol.value.setRGB(clean ? 0.07 : 0.18, clean ? 0.3 : 0.26, clean ? 0.42 : 0.06);
    uniforms.uwFar.value = clean ? 26 : 14;
  }
  if (game.shake > 0) {
    game.shake -= dt;
    camera.position.x += (Math.random() - 0.5) * game.shake * 0.4;
    camera.position.y += (Math.random() - 0.5) * game.shake * 0.4;
  }
  sky.position.copy(camera.position);
  if (player.radExposure > 0 && !player.creative) {
    game.geiger += simDt * player.radExposure * 3;
    while (game.geiger > 1) { game.geiger -= 1 + Math.random(); sfx.geiger(); }
  }

  // ceniza (más densa en tormentas)
  const q = QUALITY[settings.quality];
  const ashN = Math.floor(ASH * Math.min(1, q.ash * weather.ashMul));
  ashGeo.setDrawRange(0, ashN);
  ashMat.size = 0.07 * (1 + (weather.ashMul - 1) * 0.3);
  const ap = ashGeo.attributes.position.array;
  const cp = camera.position;
  const wind = 1 + weather.windK * 5;
  for (let i = 0; i < ashN; i++) {
    let x = ap[i * 3], y = ap[i * 3 + 1], z = ap[i * 3 + 2];
    y -= dt * (0.6 + (i % 7) * 0.08);
    x += dt * (0.8 + Math.sin(now / 2000 + i) * 0.3) * wind;
    z += dt * Math.cos(now / 3000 + i * 0.3) * 0.3 * wind;
    if (x - cp.x > 30) x -= 60; else if (x - cp.x < -30) x += 60;
    if (z - cp.z > 30) z -= 60; else if (z - cp.z < -30) z += 60;
    if (y - cp.y < -20) y += 40; else if (y - cp.y > 20) y -= 40;
    ap[i * 3] = x; ap[i * 3 + 1] = y; ap[i * 3 + 2] = z;
  }
  ashGeo.attributes.position.needsUpdate = true;
  ashMat.color.setRGB(0.74, 0.7, 0.66).multiplyScalar(0.25 + uniforms.daylight.value * 0.75);

  // selección
  const t = player.target;
  if (t && active && !player.mobTarget && !player.playerTarget) { selBox.visible = true; selBox.position.set(t.x + 0.5, t.y + 0.5, t.z + 0.5); crack.position.copy(selBox.position); }
  else { selBox.visible = false; crack.visible = false; }
  $('#crosshair').classList.toggle('mob', !!(player.mobTarget || player.playerTarget));
  {
    let hint = '';
    const mt = player.mobTarget?.mob;
    if (mt?.def.npc === 'trader') hint = 'Clic derecho: comerciar';
    else if (mt?.def.npc === 'leader') hint = 'Clic derecho: hablar (misiones y comercio)';
    else if (mt?.def.npc === 'instructor') hint = 'Clic derecho: contratar para una carrera';
    else if (mt?.def.npc === 'settler') hint = 'Clic derecho: hablar';
    else if (mt?.type === 'dog') hint = mt.owner === player.name ? 'Clic derecho: sentarse / seguirte' : 'Dale carne para domesticarlo (clic derecho)';
    else if (mt?.type === 'worker') hint = 'Clic derecho: hablar con tu empleado';
    else if (mt && TAME[mt.type]) { const TM = TAME[mt.type], tamed = TM.pet ? mt.owner === player.name : mt.tamed; if (tamed) hint = 'Clic derecho con una Montura: ensillar'; else if (!TM.pet || !mt.def.hostile) hint = `${mt.def.name}: ${TM.hint} para domesticarlo`; }
    else if (mt?.def && !mt.def.hostile && !mt.def.npc) hint = mt.def.name;
    else if (mt?.def?.neutral && !mt.provoked) hint = `${mt.def.name} · tranquilo mientras no lo molestes`;
    else if (player.vehTarget) hint = 'F: subir · clic derecho: baúl, nafta (bidón) o reparar (chatarra)';
    else if (t && active) {
      const b = BLOCKS[t.id];
      if (b.race === 'custom') hint = 'Clic derecho: correr en tu pista (usa tus banderas de control)';
      else if (b.race) hint = 'Clic derecho: largar una carrera';
      else if (b.bank) hint = 'Clic derecho: banco (depositar y retirar fichas)';
      else if (b.portal) hint = 'Clic derecho: cruzar el portal';
      else if (b.container === 'sign') hint = 'Clic derecho: escribir el cartel';
      else if (b.station === 'taller') hint = 'Clic derecho: taller (mejorar el vehículo más cercano)';
      else if (b.elevator) hint = 'Ascensor: parate arriba · Espacio sube · C baja';
      else if (b.container) hint = 'Clic derecho: abrir';
      else if (b.station) hint = 'Clic derecho: fabricar';
      else if (b.bed) hint = 'Clic derecho: dormir / guardar reaparición';
      else if (b.seat) hint = 'Clic derecho: sentarse';
      else if (b.elec === 'switch') hint = 'Clic derecho: accionar';
      else if (b.door) hint = 'Clic derecho: abrir / cerrar';
    }
    if (mt && !mt.def.npc && !mt.def.human && !mt.def.boss) game.ach.event('seen', mt.type);
    if (hint !== game.hintTxt) {
      game.hintTxt = hint;
      const shown = input.touch ? hint.replace(/Clic derecho/g, '✋ Usar').replace(/\bF:/g, '🚗:').replace(/Espacio/g, '⤒').replace(/\bC baja/g, '⤓ baja') : hint;
      $('#interactHint').textContent = shown; $('#interactHint').hidden = !hint;
    }
  }

  game.features.preRender();
  renderer.render(scene, camera);
  if (game.features.wantPhoto) game.features.capture();
  game.album?.grab();
  if (!paused && !ui.open && !game.player.dead && !game.meta.remote && now - (game.thumbT || 0) > (game.meta.thumb ? 90000 : 8000)) {
    game.thumbT = now;
    try { const c = document.createElement('canvas'); c.width = 176; c.height = 100; c.getContext('2d').drawImage(renderer.domElement, 0, 0, 176, 100); game.meta.thumb = c.toDataURL('image/jpeg', 0.6); } catch { /* sin miniatura */ }
  }

  // mano
  const hand = game.inv.hand;
  setHand(hand ? hand.id : 0);
  const sw = player.swing;
  const hsp = Math.hypot(player.vel.x, player.vel.z);
  // la mano se queda un poquito atrás cuando girás (inercia)
  const lag = game.handLag || (game.handLag = { yaw: player.yaw, pitch: player.pitch, x: 0, y: 0 });
  let dyaw = player.yaw - lag.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
  lag.x += (Math.max(-0.08, Math.min(0.08, dyaw * 0.9)) - lag.x) * Math.min(1, dt * 10); lag.y += (Math.max(-0.06, Math.min(0.06, (player.pitch - lag.pitch) * 0.9)) - lag.y) * Math.min(1, dt * 10);
  lag.yaw = player.yaw; lag.pitch = player.pitch;
  const air = player.onGround || player.riding ? 0 : Math.max(-0.05, Math.min(0.05, -player.vel.y * 0.006));
  handGroup.position.set(Math.sin(now / 180) * 0.012 * hsp / 4 + lag.x * 0.6, Math.abs(Math.cos(now / 180)) * 0.015 * hsp / 4 - sw * 0.1 - lag.y * 0.5 + air, -sw * 0.05);
  handGroup.rotation.set(-Math.sin(sw * Math.PI) * 0.5 + lag.y, Math.sin(sw * Math.PI) * 0.2 + lag.x, -lag.x * 0.6);
  const hl = 0.35 + handLight.value * 0.65;
  handMat.color.setScalar(hl); armMat.color.setHex(0x4a3b2c).multiplyScalar(hl);
  if (handMesh && handMesh.material !== handMat) handMesh.material.color.setScalar(hl);
  if (!player.dead && !player.riding && !game.features.thirdPerson && !game.features.photo) { renderer.clearDepth(); renderer.render(handScene, handCam); }

  renderStats(player);
  if (ui.open && ui.cont) { ui.uiAcc = (ui.uiAcc || 0) + dt; if (ui.uiAcc > 0.25) { ui.uiAcc = 0; ui.updateContainer(); } }

  // mapa
  const markers = [];
  const home = game.meta.spawn ?? game.meta.origin;
  if (home) markers.push({ x: home.x, z: home.z, color: '#d9823b', kind: 'home', label: game.meta.spawn ? 'Catre' : 'Inicio' });
  for (const a of net.avatars.values()) if (a.seen) markers.push({ x: a.pos.x, z: a.pos.z, color: TEAMS[a.team]?.color ?? '#fff', label: a.name });
  for (const v of vehicles.list.values()) if (v.rider !== 'local') markers.push({ x: v.pos.x, z: v.pos.z, color: '#ffd84a', label: 'Moto' });
  const boss = mobs.boss();
  if (boss) markers.push({ x: boss.pos.x, z: boss.pos.z, color: '#ff3a2a', kind: 'boss', label: boss.def.name });
  for (const m of mobs.list.values()) {
    if (m.dying) continue;
    if (m.type === 'trader') markers.push({ x: m.pos.x, z: m.pos.z, color: '#ffd84a', kind: 'npc', label: 'Comerciante' });
    else if (m.type === 'leader') markers.push({ x: m.pos.x, z: m.pos.z, color: '#ff8a4a', kind: 'npc', label: 'Líder' });
    else if (m.type === 'instructor') markers.push({ x: m.pos.x, z: m.pos.z, color: '#ff5a4a', kind: 'npc', label: 'Instructor' });
    else if (m.type === 'dog' && m.owner === player.name) markers.push({ x: m.pos.x, z: m.pos.z, color: '#9cff3a', label: 'Perro' });
  }
  for (const poi of game.features.pois()) markers.push(poi);
  for (const poi of game.features2.pois()) markers.push(poi);
  for (const mk of game.features2.markers()) markers.push(mk);
  for (const mk of game.social?.markers() || []) markers.push(mk);
  for (const mk of game.ux?.markers() || []) markers.push(mk);
  for (const mk of game.life?.markers() || []) markers.push(mk);
  for (const mk of game.together?.markers() || []) markers.push(mk);
  for (const mk of game.qol?.markers() || []) markers.push(mk);
  for (const mk of game.world13?.markers() || []) markers.push(mk);
  for (const mk of game.baires?.markers() || []) markers.push(mk);
  mapView.update(dt, world, player, game.qol ? game.qol.filter(markers) : markers, bigMap);

  // HUD
  hudAcc += dt;
  if (hudAcc > 0.25) {
    hudAcc = 0;
    if (gen.seed !== game.meta.seed) { gen.g = new WorldGen(game.meta.seed, game.meta.worldType || 'normal'); gen.seed = game.meta.seed; }
    const c = gen.g.column(Math.floor(player.pos.x), Math.floor(player.pos.z));
    const hours = Math.floor(game.time * 24), mins = Math.floor((game.time * 24 % 1) * 60);
    $('#biome').textContent = (c.biome === 23 && game.meta.worldType === 'hurlingham' ? 'Hurlingham' : BIOME_NAMES[c.biome]) + (c.level ? ` · nivel ${c.level}` : '');
    const se = game.season?.();
    $('#clock').textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}` + (se ? ` · ${se.icon} ${se.name}` : '') + (weather.k > 0.3 ? ` · ${WEATHER_NAMES[weather.type]}` : '');
    game.ach.event('biome', c.biome);
    if (player.pos.y < 12) game.ach.event('depth');
    // barra del jefe
    const showBoss = boss && boss.pos.distanceTo(player.pos) < 45;
    $('#bossbar').hidden = !showBoss;
    if (showBoss) { $('#bossFill').style.width = Math.max(0, boss.hp / boss.def.hp * 100) + '%'; $('#bossName').textContent = boss.def.name.toUpperCase(); }
    if (showDebug) {
      $('#debug').textContent = `${fps} fps · XYZ ${player.pos.x.toFixed(1)} ${player.pos.y.toFixed(1)} ${player.pos.z.toFixed(1)} · chunks ${world.chunks.size} · criaturas ${mobs.list.size} · ítems ${drops.list.size} · semilla ${game.meta.seed}` +
        (t ? ` · mira: ${BLOCKS[t.id].name}` : '') + (player.mobTarget ? ` · ${player.mobTarget.mob.def.name} ${player.mobTarget.mob.hp}hp` : '') + (auth ? '' : ' · (cliente)');
    }
  }
  game.saveAcc += dt;
  if (game.saveAcc > (game.meta.cloud ? 20 : 45)) { game.saveAcc = 0; saveGame(true); }
}
requestAnimationFrame(loop);
showMenu().then(async () => {
  // seguir donde dejaste: si la app se cerró jugando, vuelve a entrar sola a ese mundo
  try {
    if (settings.resume === false || localStorage.getItem('yermo-open') !== '1' || new URLSearchParams(location.search).has('mute')) return;
    const id = localStorage.getItem('yermo-last');
    const w = (await Storage.listWorlds()).find((x) => x.id === id);
    if (w && !game) { flash(`▶ Seguís en «${w.name}»`); startGame(w); }
  } catch { /* nada */ }
});

// ---------- App instalable (PWA) ----------
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {});
let installEvt = null;
const installed = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (!installed()) $('#installApp').hidden = false; });
addEventListener('appinstalled', () => { $('#installApp').hidden = true; $('#installHint').hidden = true; flash('YERMO quedó instalado: abrilo desde el ícono'); });
$('#installApp').onclick = async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice.catch(() => {}); installEvt = null; $('#installApp').hidden = true; };
// iPhone/iPad: no hay botón automático, se instala desde Compartir
if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !installed()) { $('#installHint').hidden = false; $('#installHint').textContent = '📲 Para instalarlo: tocá Compartir ⬆ y «Agregar a inicio».'; }

// Ganchos para pruebas automatizadas
window.__yermoDebug = { voice, get game() { return game; }, startGame, saveGame, openInventory, closeInventory, openContainer, ITEMS, BLOCKS, HEIGHT, setPause, renderer, scene, camera, net, guide, quitToMenu, toggleMount, dropHand, particles, mapView, settings, applySettings, toggleBigMap };
