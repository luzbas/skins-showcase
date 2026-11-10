/** @jsxImportSource react */

'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import bundledModelUrl from '../../assets/picnic-scene.glb?url';

export interface PicnicStageProps {
  /** URL of the picnic scene exported from Blender (`skins-src/picnic/blender`). */
  modelUrl?: string | undefined;
}

type Layout = 'desktop' | 'phone';

/** Blender (Z up) → three.js (Y up). */
const B = (x: number, y: number, z: number) => new THREE.Vector3(x, z, -y);

/** Below this width/height ratio the player uses the portrait (phone) framing. */
const PHONE_BELOW = 0.85;

/** The two framings, taken from the Blender cameras. `hfov` is horizontal; the camera keeps it and widens vertically. */
const SHOTS: Record<Layout, { position: THREE.Vector3; target: THREE.Vector3; hfov: number; aspect: number }> = {
  desktop: { position: B(0, -9.6, 0.95), target: B(0, 0, 2.55), hfov: 2 * Math.atan(18 / 36), aspect: 16 / 9 },
  phone: { position: B(0, -6.9, 1.3), target: B(0, 0, 2.6), hfov: 2 * Math.atan(18 / 40), aspect: 720 / 1560 },
};

/** The video screen on the sheet: centre and size, for the fullscreen push-in. */
const SCREEN_CENTER = B(0, -0.045, 2.45);
const SCREEN_SIZE = { width: 3.84, height: 2.16 };
/**
 * Look around (desktop, fine pointer): drag orbits the camera around the sheet within these limits (degrees); zoom works
 * like a map — Ctrl/⌘ + scroll or a trackpad pinch — so plain scrolling still scrolls the page. After `idleMs` without
 * input the camera glides back to the default shot.
 */
const ORBIT = {
  yaw: 25,
  /** Tilt range: positive looks down at the blanket and table, negative looks up at the bulbs and sky. */
  lookDown: 38,
  lookUp: 22,
  /** Zoom runs from `zoomOut` (step back) to 1 (close in); 0 is the default shot. */
  zoomOut: -0.6,
  zoomIn: 0.62,
  idleMs: 7000,
  dragPx: 4,
};
const ORBIT_PIVOT = B(0, -0.05, 2.6);
/** Where the aim drifts as you tilt: down to the picnic table, up to the overhead strands. */
const LOOK_DOWN_AT = B(0, -4.3, 0.3);
const LOOK_UP_AT = B(0, -2.5, 6.8);
const FULLSCREEN_FOV = 30;
const PUSH_SECONDS = 0.85;
/** In fullscreen the remote tucks away this long after the last pointer or key activity while playing. */
const FULLSCREEN_IDLE_MS = 2500;

/** Tags on the strand, left to right. Time and Duration have a tag but no bulb. */
const TAGS = ['Captions', 'Volume', 'Time', 'Rewind', 'Play', 'Forward', 'Duration', 'Settings', 'Fullscreen'] as const;
/** Remote keys: control class suffix → mesh. */
const KEYS: ReadonlyArray<readonly [string, string]> = [
  ['CC', 'RKey_CC'],
  ['Volume', 'RKnob_Volume'],
  ['Rewind', 'RKey_Rewind'],
  ['Play', 'RKey_Play'],
  ['Forward', 'RKey_Forward'],
  ['Settings', 'RKey_Settings'],
  ['Fullscreen', 'RKey_Fullscreen'],
];
/** Tags are 1.45× in the Blender desktop layout and 1.8× in the phone layout. */
const PHONE_TAG_SCALE = 1.8 / 1.45;
/** Remote rest poses (Blender): on the crate for desktop, on the table for phones. */
const REMOTE_REST: Record<Layout, { position: THREE.Vector3; yaw: number }> = {
  desktop: { position: B(-0.1, -3.0, 0.55), yaw: THREE.MathUtils.degToRad(8) },
  phone: { position: B(0.2, -4.79, 0.2175), yaw: THREE.MathUtils.degToRad(-6) },
};
const REMOTE_WIDTH = 0.33;
/** Groove of the remote's scrubber, in the remote's local x (Blender modelling units). */
const GROOVE = { left: -0.085, length: 0.17 };
/** Hem fairy lights run from x = -2.15 to 2.15. */
const HEM = { left: -2.15, right: 2.15 };
/** Seconds paused before the fireflies come out. */
const FIREFLY_DELAY = 4;
const FIREFLY_COUNT = 40;
/** Night sky: a big crescent moon high overhead, just above the default framing, so it is a surprise when you drag up
 *  to look at the sky; and a dome of stars that come out more when the house lights go down, like eyes adjusting. */
const MOON_POSITION = B(2.0, 9.2, 17.4);
const MOON_SIZE = 5.4;
const STAR_COUNT = 1100;
const STAR_RADIUS = 46;

/** Light levels (paused, playing); the stage blends between them with `lit` (1 paused, 0 playing). */
const LEVELS = {
  bulbControl: [6, 0.35],
  bulbDeco: [5, 0.03],
  tag: [0.7, 0.025],
  hemPlayed: [5, 1.6],
  hemBuffered: [0.8, 0.15],
  pilot: [18, 1.2],
  strandLight: [7, 0.08],
  overheadLight: [9, 0.02],
  lantern: [1.6, 0.45],
  hemi: [0.55, 0.08],
  screenLight: [1.4, 3.6],
  haloDeco: [0.55, 0],
  haloControl: [0.7, 0.03],
  haloHem: [0.55, 0.22],
} as const;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Tag {
  name: string;
  group: THREE.Object3D | undefined;
  card: THREE.Mesh | undefined;
  bulb: THREE.Mesh | undefined;
  bulbMaterial: THREE.MeshStandardMaterial | undefined;
  hover: number;
  sway: number;
}

export function PicnicStage({ modelUrl = bundledModelUrl }: PicnicStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.closest<HTMLElement>('.media-container');
    if (!canvas || !container) return undefined;
    return startPicnicStage(canvas, container, modelUrl);
  }, [modelUrl]);

  return <canvas ref={canvasRef} className={'picnic-stage'} aria-hidden="true" />;
}

function makeGlowMaterial(color: THREE.ColorRepresentation) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uScale: { value: 1 },
      uGroup: { value: new THREE.Vector4(1, 1, 1, 1) },
      uColor: { value: new THREE.Color(color) },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aGroup;
      attribute float aMul;
      uniform float uScale;
      uniform vec4 uGroup;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float g = aGroup < 0.5 ? uGroup.x : (aGroup < 1.5 ? uGroup.y : (aGroup < 2.5 ? uGroup.z : uGroup.w));
        vA = g * aMul;
        gl_PointSize = aSize * uScale / -mv.z * (0.8 + 0.2 * aMul);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 2.4);
        gl_FragColor = vec4(uColor * a * vA, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function startPicnicStage(canvas: HTMLCanvasElement, container: HTMLElement, modelUrl: string): () => void {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    console.warn('[picnic skin] WebGL is unavailable; keeping the flat layout.', error);
    return () => {};
  }

  let disposed = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.15;
  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);
  scene.fog = new THREE.Fog(0x05070d, 14, 30);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
  const root = new THREE.Group();
  scene.add(root);

  // ---- lights -------------------------------------------------------------------------------------------------------
  const warm = 0xffa04a;
  const hemi = new THREE.HemisphereLight(0x33416b, 0x140d08, 0.4);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x8fa4ff, 0.25);
  moon.position.copy(MOON_POSITION);
  scene.add(moon);
  const strandLights = [B(-1.7, -0.5, 4.7), B(0, -0.5, 4.5), B(1.7, -0.5, 4.7)].map((p) => {
    const light = new THREE.PointLight(warm, 1, 0, 2);
    light.position.copy(p);
    scene.add(light);
    return light;
  });
  const overheadLights = [B(-2.5, -4.5, 5.6), B(2.5, -5.5, 5.4)].map((p) => {
    const light = new THREE.PointLight(warm, 1, 0, 2);
    light.position.copy(p);
    scene.add(light);
    return light;
  });
  const lanternLights = [B(-1.95, -1.95, 0.25), B(1.98, -2.0, 0.25), B(0.2, -3.02, 0.77), B(0.1, -4.5, 0.45)].map((p, i) => {
    const light = new THREE.PointLight(0xff8a3a, i === 3 ? 0.9 : 1.6, 0, 2);
    light.position.copy(p);
    scene.add(light);
    return light;
  });
  const screenLight = new THREE.RectAreaLight(0xffd0b0, 1, SCREEN_SIZE.width, SCREEN_SIZE.height);
  screenLight.position.copy(SCREEN_CENTER).add(new THREE.Vector3(0, 0, 0.06));
  screenLight.lookAt(SCREEN_CENTER.clone().add(new THREE.Vector3(0, 0, 5)));
  scene.add(screenLight);
  // A soft lamp that follows the remote when it is lifted towards the camera, so its keys and brass read.
  const remoteLight = new THREE.PointLight(0xffd9b0, 0, 1.2, 2);
  scene.add(remoteLight);

  // ---- video --------------------------------------------------------------------------------------------------------
  const screenMaterial = new THREE.MeshBasicMaterial({ color: 0x0b0b0b, toneMapped: false });
  let video: HTMLVideoElement | null = null;
  let videoTexture: THREE.VideoTexture | null = null;
  const sampler = document.createElement('canvas');
  sampler.width = 4;
  sampler.height = 4;
  const sampleContext = sampler.getContext('2d', { willReadFrequently: true });
  const spillTarget = new THREE.Color(0xffd0b0);
  let lastSample = 0;

  function attachVideo() {
    const next = container.querySelector('video');
    if (!next || next === video) return;
    video = next;
    videoTexture?.dispose();
    videoTexture = new THREE.VideoTexture(next);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.flipY = false;
    screenMaterial.map = videoTexture;
    screenMaterial.color.setScalar(1);
    screenMaterial.needsUpdate = true;
  }

  /**
   * The picture keeps its own shape: the 16:9 screen area on the sheet shrinks to the video's (or poster's) aspect,
   * pillarboxed or letterboxed on the charcoal cloth instead of stretched. The screen mesh's height runs along its local z.
   */
  const picture = { width: SCREEN_SIZE.width, height: SCREEN_SIZE.height, aspect: 0 };
  function fitPicture() {
    if (!screenMesh) return;
    const map = screenMaterial.map;
    const image = map?.image as { videoWidth?: number; videoHeight?: number; width?: number; height?: number } | undefined;
    const w = image?.videoWidth || image?.width || 0;
    const h = image?.videoHeight || image?.height || 0;
    if (!w || !h) return;
    const aspect = w / h;
    if (Math.abs(aspect - picture.aspect) < 0.001) return;
    picture.aspect = aspect;
    const screenAspect = SCREEN_SIZE.width / SCREEN_SIZE.height;
    const sx = Math.min(1, aspect / screenAspect);
    const sz = Math.min(1, screenAspect / aspect);
    screenMesh.scale.set(sx, 1, sz);
    picture.width = SCREEN_SIZE.width * sx;
    picture.height = SCREEN_SIZE.height * sz;
    screenLight.width = picture.width;
    screenLight.height = picture.height;
  }

  // The poster is drawn on the sheet (a DOM poster would sit above the canvas and cover the lifted remote).
  let posterTexture: THREE.Texture | null = null;
  let posterUrl = '';
  function updateScreenMap() {
    if (!video) return;
    const started = video.played.length > 0 || video.currentTime > 0;
    if (!started) {
      const url = container.querySelector<HTMLImageElement>('.picnic-poster img')?.currentSrc || video.poster || '';
      if (url && url !== posterUrl) {
        posterUrl = url;
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        loader.load(url, (texture) => {
          if (disposed || url !== posterUrl) return texture.dispose();
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.flipY = false;
          posterTexture?.dispose();
          posterTexture = texture;
        });
      }
    }
    const next = !started && posterTexture ? posterTexture : videoTexture;
    if (screenMaterial.map !== next) {
      screenMaterial.map = next;
      screenMaterial.needsUpdate = true;
    }
  }

  /** The screen's light on the scene takes the video's average colour (a 4×4 read, a few times a second). */
  function sampleVideo(now: number) {
    if (!video || !sampleContext || now - lastSample < 250 || video.readyState < 2) return;
    lastSample = now;
    try {
      sampleContext.drawImage(video, 0, 0, 4, 4);
      const data = sampleContext.getImageData(0, 0, 4, 4).data;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      const n = (data.length / 4) * 255;
      spillTarget.setRGB(r / n, g / n, b / n, THREE.SRGBColorSpace);
      // Keep it a light, not a colour wash: lift dark frames, never fully black.
      spillTarget.lerp(new THREE.Color(0xffd8bc), 0.25);
    } catch {
      // Cross-origin video without CORS: keep the warm default.
    }
  }

  // ---- model --------------------------------------------------------------------------------------------------------
  let ready = false;
  const tags: Tag[] = [];
  const keys: Array<{ suffix: string; mesh: THREE.Mesh | undefined }> = [];
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  let hemDots: THREE.Mesh[] = [];
  let hemPlayhead: THREE.Object3D | undefined;
  let hemWire: THREE.Mesh | undefined;
  let hemMaterials: { played: THREE.Material; buffered: THREE.Material; off: THREE.Material } | undefined;
  let lastHemKey = '';
  let screenMesh: THREE.Mesh | undefined;
  let remote: THREE.Object3D | undefined;
  let remoteBody: THREE.Mesh | undefined;
  let remotePlate: THREE.Mesh | undefined;
  let remoteGroove: THREE.Mesh | undefined;
  let remotePlayed: THREE.Object3D | undefined;
  let remoteKnob: THREE.Object3D | undefined;
  let playedWidth = 1;
  const deskOnly: THREE.Object3D[] = [];
  let cable: THREE.Object3D | undefined;
  let crate: THREE.Object3D | undefined;

  // Glows (additive point sprites) stand in for bloom: one draw call for every bulb, flame and hem light.
  const glowMaterial = makeGlowMaterial(0xffb066);
  let glow: THREE.Points | undefined;
  let glowMul: THREE.BufferAttribute | undefined;
  const glowIndex = { control: new Map<string, number>(), hem: [] as number[], deskOnly: [] as number[] };

  // Fireflies.
  const fireflyGeometry = new THREE.BufferGeometry();
  const fireflyBase: THREE.Vector3[] = [];
  const fireflySeed: number[] = [];
  {
    const positions = new Float32Array(FIREFLY_COUNT * 3);
    const size = new Float32Array(FIREFLY_COUNT);
    const group = new Float32Array(FIREFLY_COUNT);
    const mul = new Float32Array(FIREFLY_COUNT);
    for (let i = 0; i < FIREFLY_COUNT; i += 1) {
      const near = i < 28;
      fireflyBase.push(
        near
          ? B(THREE.MathUtils.randFloat(-4, 4), THREE.MathUtils.randFloat(-3.4, 0.6), THREE.MathUtils.randFloat(0.4, 3.6))
          : B(THREE.MathUtils.randFloat(-7, 7), THREE.MathUtils.randFloat(1.5, 5), THREE.MathUtils.randFloat(0.6, 4.2)),
      );
      fireflySeed.push(Math.random() * 100);
      size[i] = THREE.MathUtils.randFloat(0.09, 0.15);
      mul[i] = 1;
    }
    fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    fireflyGeometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    fireflyGeometry.setAttribute('aGroup', new THREE.BufferAttribute(group, 1));
    fireflyGeometry.setAttribute('aMul', new THREE.BufferAttribute(mul, 1));
  }
  const fireflyMaterial = makeGlowMaterial(0xc9ff6a);
  const fireflies = new THREE.Points(fireflyGeometry, fireflyMaterial);
  fireflies.frustumCulled = false;
  fireflies.visible = false;
  scene.add(fireflies);

  // ---- sky ----------------------------------------------------------------------------------------------------------
  const starGeometry = new THREE.BufferGeometry();
  {
    const positions = new Float32Array(STAR_COUNT * 3);
    const size = new Float32Array(STAR_COUNT);
    const phase = new Float32Array(STAR_COUNT);
    const point = new THREE.Vector3();
    for (let i = 0; i < STAR_COUNT; i += 1) {
      // Above the horizon, denser towards it; skip the patch right around the moon.
      do {
        const azimuth = Math.random() * Math.PI * 2;
        const elevation = Math.asin(THREE.MathUtils.lerp(0.08, 1, Math.pow(Math.random(), 1.4)));
        point.set(Math.cos(elevation) * Math.sin(azimuth), Math.sin(elevation), -Math.cos(elevation) * Math.cos(azimuth));
        point.multiplyScalar(STAR_RADIUS);
      } while (point.angleTo(MOON_POSITION) < 0.12);
      point.toArray(positions, i * 3);
      const bright = Math.random();
      size[i] = bright > 0.95 ? THREE.MathUtils.randFloat(4.5, 6) : THREE.MathUtils.randFloat(2, 3.6);
      phase[i] = Math.random() * Math.PI * 2;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    starGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  }
  const starMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAmount: { value: 1 }, uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vA;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        float twinkle = 0.65 + 0.35 * sin(uTime * (0.6 + fract(aPhase) * 1.4) + aPhase * 7.0);
        vA = twinkle * clamp(aSize / 4.0, 0.45, 1.0);
        gl_PointSize = aSize * uPixelRatio;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uAmount;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 1.6);
        gl_FragColor = vec4(vec3(0.86, 0.9, 1.0) * 2.6 * a * vA * uAmount, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.frustumCulled = false;
  stars.renderOrder = -1;
  scene.add(stars);

  // A crescent drawn in a shader on a camera-facing quad: a lit disc minus an offset shadow disc, with a faint halo.
  const moonMaterial = new THREE.ShaderMaterial({
    uniforms: { uAmount: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uAmount;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float disc = smoothstep(0.36, 0.34, r);
        float shadow = smoothstep(0.33, 0.35, length(p - vec2(0.15, 0.07)));
        float crescent = disc * shadow;
        float halo = pow(max(0.0, 1.0 - r), 3.0) * 0.22;
        vec3 color = vec3(1.0, 0.95, 0.82) * crescent * 1.15 + vec3(0.75, 0.82, 1.0) * halo;
        gl_FragColor = vec4(color * uAmount, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const moonDisc = new THREE.Mesh(new THREE.PlaneGeometry(MOON_SIZE, MOON_SIZE), moonMaterial);
  moonDisc.position.copy(MOON_POSITION);
  moonDisc.renderOrder = -1;
  scene.add(moonDisc);

  const KEEP = /^(Ctrl_|Tag_|Hem_|HemWire|VideoScreen|Remote|Crate)/;
  const kept = (object: THREE.Object3D) => {
    for (let o: THREE.Object3D | null = object; o; o = o.parent) {
      if (KEEP.test(o.name) || o.userData.desk_only) return true;
    }
    return false;
  };

  new GLTFLoader().load(
    modelUrl,
    (gltf) => {
      if (disposed) return;
      const model = gltf.scene;
      root.add(model);
      model.updateMatrixWorld(true);

      // Collect named materials and the glow positions before static meshes are merged away.
      const glowPoints: Array<{ p: THREE.Vector3; size: number; group: number; key?: string; hem?: number; desk?: boolean }> = [];
      const world = new THREE.Vector3();
      model.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (material?.name && !materials.has(material.name)) materials.set(material.name, material);
        mesh.getWorldPosition(world);
        const name = mesh.name;
        if (/^Deco_/.test(name) && !/Socket/.test(name)) glowPoints.push({ p: world.clone(), size: 0.34, group: 0 });
        else if (/^Ctrl_/.test(name) && !/Socket/.test(name)) glowPoints.push({ p: world.clone(), size: 0.62, group: 1, key: name.slice(5) });
        else if (/^Hem_\d+$/.test(name)) glowPoints.push({ p: world.clone(), size: 0.13, group: 2, hem: Number(name.slice(4)) });
        else if (/^(Lantern)?Flame/.test(name)) glowPoints.push({ p: world.clone(), size: 0.42, group: 3, desk: !!mesh.userData.desk_only || !!mesh.parent?.userData.desk_only });
      });

      // Merge everything that never changes into one mesh per material (hundreds of draw calls → a few dozen).
      const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
      const merged: THREE.Mesh[] = [];
      model.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh || kept(mesh) || Array.isArray(mesh.material)) return;
        let geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        for (const name of Object.keys(geometry.attributes)) {
          if (name !== 'position' && name !== 'normal') geometry.deleteAttribute(name);
        }
        if (!geometry.attributes.normal) geometry.computeVertexNormals();
        geometry = geometry.applyMatrix4(mesh.matrixWorld);
        const list = buckets.get(mesh.material) ?? [];
        list.push(geometry);
        buckets.set(mesh.material, list);
        merged.push(mesh);
      });
      for (const mesh of merged) mesh.removeFromParent();
      for (const [material, list] of buckets) {
        const geometry = mergeGeometries(list, false);
        for (const g of list) g.dispose();
        if (geometry) root.add(new THREE.Mesh(geometry, material));
      }

      // The sheet is warm charcoal, like a cinema's black masking: the picture reads brighter against it, and the
      // hem fairy lights stand out. No self-light, so it falls dark with the house lights.
      const sheet = materials.get('SheetCloth');
      if (sheet) {
        sheet.color.set(0x2a2622);
        sheet.roughness = 0.95;
        sheet.emissiveIntensity = 0;
      }

      // Screen.
      screenMesh = model.getObjectByName('VideoScreen') as THREE.Mesh | undefined;
      if (screenMesh) {
        screenMesh.material = screenMaterial;
        screenMesh.geometry.computeBoundingBox();
      }

      // Tags and their bulbs. Each control bulb gets its own material so it can brighten on hover.
      for (const name of TAGS) {
        const bulb = model.getObjectByName(`Ctrl_${name}`) as THREE.Mesh | undefined;
        let bulbMaterial: THREE.MeshStandardMaterial | undefined;
        if (bulb) {
          bulbMaterial = (bulb.material as THREE.MeshStandardMaterial).clone();
          bulb.material = bulbMaterial;
        }
        const card = model.getObjectByName(`Tag_${name}_Card`) as THREE.Mesh | undefined;
        card?.geometry.computeBoundingBox();
        tags.push({ name, group: model.getObjectByName(`Tag_${name}`), card, bulb, bulbMaterial, hover: 0, sway: Math.random() * 6 });
      }

      // Hem lights: one material per state, swapped onto the dots as the video plays.
      hemDots = [];
      model.traverse((o) => {
        if (/^Hem_\d+$/.test(o.name)) hemDots.push(o as THREE.Mesh);
      });
      hemDots.sort((a, b) => Number(a.name.slice(4)) - Number(b.name.slice(4)));
      const played = materials.get('HemPlayed');
      const buffered = materials.get('HemBuffered');
      const off = materials.get('HemOff');
      if (played && buffered && off) hemMaterials = { played, buffered, off };
      hemPlayhead = model.getObjectByName('Hem_Playhead');
      hemWire = model.getObjectByName('HemWire_mesh') as THREE.Mesh | undefined;
      hemWire?.geometry.computeBoundingBox();

      // Remote.
      remote = model.getObjectByName('Remote');
      remoteBody = model.getObjectByName('Remote_Body') as THREE.Mesh | undefined;
      remotePlate = model.getObjectByName('RScrubPlate') as THREE.Mesh | undefined;
      remoteGroove = model.getObjectByName('RScrubGroove') as THREE.Mesh | undefined;
      remotePlayed = model.getObjectByName('RScrubPlayed');
      remoteKnob = model.getObjectByName('RScrubKnob');
      for (const mesh of [remoteBody, remotePlate, remoteGroove]) mesh?.geometry.computeBoundingBox();
      // The played bar is modelled in place; re-pivot it on its left end so it can grow.
      const playedMesh = remotePlayed as THREE.Mesh | undefined;
      if (playedMesh?.geometry) {
        playedMesh.geometry.computeBoundingBox();
        const box = playedMesh.geometry.boundingBox!;
        playedMesh.geometry.translate(-box.min.x, 0, 0);
        playedMesh.position.x += box.min.x;
        playedWidth = Math.max(box.max.x - box.min.x, 1e-4);
      }
      for (const [suffix, meshName] of KEYS) {
        const mesh = model.getObjectByName(meshName) as THREE.Mesh | undefined;
        mesh?.geometry.computeBoundingBox();
        keys.push({ suffix, mesh });
      }
      // The remote's keys share the tag paper in Blender; give them their own copy so they stay readable while the
      // house lights are down (the remote carries the controls in fullscreen).
      const tagPaper = materials.get('TagPaper');
      if (remote && tagPaper) {
        const keyPaper = tagPaper.clone();
        keyPaper.emissiveIntensity = 0.55;
        remote.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh && mesh.material === tagPaper) mesh.material = keyPaper;
        });
      }
      cable = model.getObjectByName('RemoteCable_mesh');
      crate = model.getObjectByName('Crate');
      model.traverse((o) => {
        if (o.userData.desk_only) deskOnly.push(o);
      });

      // Glow points.
      const n = glowPoints.length;
      const positions = new Float32Array(n * 3);
      const size = new Float32Array(n);
      const group = new Float32Array(n);
      const mul = new Float32Array(n).fill(1);
      glowPoints.forEach((point, i) => {
        point.p.toArray(positions, i * 3);
        size[i] = point.size;
        group[i] = point.group;
        if (point.key) glowIndex.control.set(point.key, i);
        if (point.hem !== undefined) glowIndex.hem[point.hem] = i;
        if (point.desk) glowIndex.deskOnly.push(i);
      });
      const glowGeometry = new THREE.BufferGeometry();
      glowGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      glowGeometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      glowGeometry.setAttribute('aGroup', new THREE.BufferAttribute(group, 1));
      glowMul = new THREE.BufferAttribute(mul, 1);
      glowGeometry.setAttribute('aMul', glowMul);
      glow = new THREE.Points(glowGeometry, glowMaterial);
      glow.frustumCulled = false;
      glow.renderOrder = 10;
      scene.add(glow);

      ready = true;
      container.dataset.picnic = 'ready';
      fit();
      applyLayout(true);
      frame();
    },
    undefined,
    (error) => console.warn('[picnic skin] Could not load the picnic scene; keeping the flat layout.', error),
  );

  // ---- layout -------------------------------------------------------------------------------------------------------
  let layout: Layout = 'desktop';
  let appliedLayout: Layout | null = null;

  function fit() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    layout = camera.aspect < PHONE_BELOW ? 'phone' : 'desktop';
    container.dataset.picnicLayout = layout;
  }

  function applyLayout(force = false) {
    if (!ready || (!force && appliedLayout === layout)) return;
    appliedLayout = layout;
    const phone = layout === 'phone';
    const k = phone ? PHONE_TAG_SCALE : 1;
    for (const tag of tags) tag.group?.scale.setScalar(k);
    // The crate, its lantern and the remote's cable only belong to the desktop scene.
    if (crate) crate.visible = !phone;
    for (const o of deskOnly) o.visible = !phone;
    if (cable) cable.visible = !phone;
    if (glowMul) {
      for (const i of glowIndex.deskOnly) glowMul.setX(i, phone ? 0 : 1);
      glowMul.needsUpdate = true;
    }
    if (remote && remoteMode === 'rest') snapRemote = true;
  }

  /** Vertical field of view (degrees) that keeps the shot's width, and its height when the player is wider. */
  function shotFov(shot: (typeof SHOTS)[Layout]) {
    const tanH = Math.tan(shot.hfov / 2);
    const aspect = Math.min(camera.aspect, shot.aspect);
    return THREE.MathUtils.radToDeg(2 * Math.atan(tanH / aspect));
  }

  function fullscreenDistance() {
    const tan = Math.tan(THREE.MathUtils.degToRad(FULLSCREEN_FOV / 2));
    const d = Math.max(picture.height / 2 / tan, picture.width / 2 / (tan * camera.aspect));
    return d / 1.01; // 1% overscan so the sheet's edge never shows
  }

  // ---- projection ---------------------------------------------------------------------------------------------------
  const corner = new THREE.Vector3();
  const lastRects = new WeakMap<Element, string>();

  function project(mesh: THREE.Mesh): Rect {
    const box = mesh.geometry.boundingBox!;
    const width = container.clientWidth;
    const height = container.clientHeight;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < 8; i += 1) {
      corner
        .set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)
        .applyMatrix4(mesh.matrixWorld)
        .project(camera);
      const x = ((corner.x + 1) / 2) * width;
      const y = ((1 - corner.y) / 2) * height;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  /** Grows a rect around its centre to at least `min` px (touch targets), keeping its drawn size in --picnic-h. */
  function grow(rect: Rect, minW: number, minH = minW): Rect {
    const w = Math.max(rect.w, minW);
    const h = Math.max(rect.h, minH);
    return { x: rect.x + rect.w / 2 - w / 2, y: rect.y + rect.h / 2 - h / 2, w, h };
  }

  function place(element: HTMLElement, rect: Rect, drawn = rect.h) {
    const key = `${rect.x.toFixed(1)},${rect.y.toFixed(1)},${rect.w.toFixed(1)},${rect.h.toFixed(1)},${drawn.toFixed(1)}`;
    if (lastRects.get(element) === key) return;
    lastRects.set(element, key);
    const style = element.style;
    style.left = `${rect.x.toFixed(1)}px`;
    style.top = `${rect.y.toFixed(1)}px`;
    style.width = `${rect.w.toFixed(1)}px`;
    style.height = `${rect.h.toFixed(1)}px`;
    style.setProperty('--picnic-h', `${drawn.toFixed(1)}px`);
  }

  const find = (selector: string) => container.querySelector<HTMLElement>(selector);
  const isActive = (element: HTMLElement | null) =>
    !!element && element.matches(':hover, :focus-visible, [aria-expanded="true"], [data-popup-open], [data-open]');

  function sliderFraction(slider: HTMLElement | null, name: string) {
    if (!slider) return 0;
    const value = parseFloat(getComputedStyle(slider).getPropertyValue(name));
    return Number.isFinite(value) ? THREE.MathUtils.clamp(value / 100, 0, 1) : 0;
  }

  // ---- remote -------------------------------------------------------------------------------------------------------
  type RemoteMode = 'rest' | 'open' | 'tucked';
  let remoteOpen = false;
  let remoteMode: RemoteMode = 'rest';
  let snapRemote = true;
  const remoteTarget = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
  const yAxis = new THREE.Vector3(0, 1, 0);
  const xAxis = new THREE.Vector3(1, 0, 0);
  const faceCamera = new THREE.Quaternion().setFromAxisAngle(xAxis, THREE.MathUtils.degToRad(90 - 24));
  const camForward = new THREE.Vector3();
  const camUp = new THREE.Vector3();

  function setRemoteOpen(next: boolean) {
    remoteOpen = next;
    const toggle = find('.picnic-remote-toggle');
    toggle?.setAttribute('aria-expanded', String(next));
    toggle?.setAttribute('aria-label', next ? 'Hide the remote control' : 'Show the remote control');
  }

  /** Where the remote goes: resting in the scene, lifted in front of the camera, or (fullscreen, idle) tucked below. */
  function remotePose(mode: RemoteMode) {
    if (mode === 'rest') {
      const rest = REMOTE_REST[layout];
      remoteTarget.position.copy(rest.position);
      remoteTarget.quaternion.setFromAxisAngle(yAxis, rest.yaw);
      return;
    }
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tanH = tanV * camera.aspect;
    const share = fullscreen ? 0.42 : layout === 'phone' ? 0.84 : 0.46;
    const d = REMOTE_WIDTH / (2 * tanH * share);
    const halfHeight = d * tanV;
    let lift = -halfHeight + REMOTE_WIDTH * 0.21;
    if (mode === 'tucked') lift -= REMOTE_WIDTH * 0.8;
    camera.getWorldDirection(camForward);
    camUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    remoteTarget.position.copy(camera.position).addScaledVector(camForward, d).addScaledVector(camUp, lift);
    remoteTarget.quaternion.copy(camera.quaternion).multiply(faceCamera);
  }

  // ---- state --------------------------------------------------------------------------------------------------------
  let lit = 1;
  let pausedFor = 0;
  let fireflyAmount = 0;
  let push = 0; // 0 scene, 1 fullscreen push-in done
  let fullscreen = false;
  const parallax = { x: 0, y: 0 };
  const orbit = { yaw: 0, pitch: 0, zoom: 0 };
  const orbitTarget = { yaw: 0, pitch: 0, zoom: 0 };
  let lastOrbit = 0;
  let orbitEnabled = false;
  const finePointer = window.matchMedia('(pointer: fine)');
  const orbitQuaternion = new THREE.Quaternion();
  const orbitEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  const orbitOffset = new THREE.Vector3();
  const parallaxTarget = { x: 0, y: 0 };
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const fsPos = new THREE.Vector3();
  let lastFrame = performance.now();
  let lastLit = '';
  let lastActivity = performance.now();
  let lastPointer = { x: NaN, y: NaN };

  function setLevel(name: string, value: number) {
    const material = materials.get(name);
    if (material) material.emissiveIntensity = value;
  }
  /** Unlit glass and paper still catch the screen's light, so the house lights also darken their base colour. */
  const baseColors = new Map<THREE.MeshStandardMaterial, THREE.Color>();
  function shade(material: THREE.MeshStandardMaterial | undefined, amount: number) {
    if (!material) return;
    let base = baseColors.get(material);
    if (!base) {
      base = material.color.clone();
      baseColors.set(material, base);
    }
    material.color.copy(base).multiplyScalar(amount);
  }
  const mix = (pair: readonly [number, number] | readonly number[], t: number) => pair[1] + (pair[0] - pair[1]) * t;

  function frame() {
    if (!ready || disposed) return;
    const now = performance.now();
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    const still = reduceMotion.matches;
    const ease = (rate: number) => (still ? 1 : 1 - Math.exp(-dt * rate));
    attachVideo();
    updateScreenMap();
    fitPicture();
    applyLayout();

    const playButton = find('.picnic-tag--Play');
    const paused = video ? video.paused : true;
    const ended = !!playButton?.hasAttribute('data-ended');

    // House lights: up when paused, down while playing.
    lit += ((paused ? 1 : 0) - lit) * ease(paused ? 3 : 2);
    pausedFor = paused && !ended ? pausedFor + dt : 0;
    const fireflyTarget = pausedFor > FIREFLY_DELAY ? 1 : 0;
    fireflyAmount += (fireflyTarget - fireflyAmount) * (fireflyTarget ? ease(0.6) : ease(5));

    // Camera: the layout's shot, or pushed into the sheet in fullscreen.
    // `data-picnic-preview-fullscreen` shows the fullscreen framing without the Fullscreen API (previews, showcases).
    fullscreen =
      document.fullscreenElement === container ||
      container.matches(':fullscreen') ||
      container.hasAttribute('data-picnic-preview-fullscreen');
    const pushTarget = fullscreen ? 1 : 0;
    const step = still ? 1 : dt / PUSH_SECONDS;
    if (pushTarget > push) push = Math.min(push + step, 1);
    else if (pushTarget < push) push = Math.max(push - step, 0);
    const p = push * push * (3 - 2 * push);
    container.toggleAttribute('data-picnic-fs', push > 0.5);

    const shot = SHOTS[layout];
    parallax.x += (parallaxTarget.x - parallax.x) * ease(3);
    parallax.y += (parallaxTarget.y - parallax.y) * ease(3);
    const sway = still ? 0 : 1 - p;
    camPos.copy(shot.position).add(new THREE.Vector3(parallax.x * 0.25 * sway, parallax.y * 0.12 * sway, 0));
    camTarget.copy(shot.target);

    // Look around: orbit both the eye and the aim point around the sheet, then move the eye in towards the aim.
    orbitEnabled = layout === 'desktop' && finePointer.matches && pushTarget === 0 && push === 0;
    container.toggleAttribute('data-picnic-orbit', orbitEnabled);
    const idle = !drag?.active && now - lastOrbit > ORBIT.idleMs;
    if (!orbitEnabled || (idle && !still)) {
      orbitTarget.yaw = 0;
      orbitTarget.pitch = 0;
      orbitTarget.zoom = 0;
    }
    const orbitRate = drag?.active || !idle ? 12 : 1.6;
    orbit.yaw += (orbitTarget.yaw - orbit.yaw) * ease(orbitRate);
    orbit.pitch += (orbitTarget.pitch - orbit.pitch) * ease(orbitRate);
    orbit.zoom += (orbitTarget.zoom - orbit.zoom) * ease(orbitRate);
    if (Math.abs(orbit.yaw) + Math.abs(orbit.pitch) + Math.abs(orbit.zoom) > 0.0005) {
      // Tilting both swings the eye around the sheet (up when looking down) and drifts the aim towards the table or
      // the bulbs, so looking down shows the picnic rather than the grass under the screen.
      orbitEuler.set(THREE.MathUtils.degToRad(-orbit.pitch * 0.45), THREE.MathUtils.degToRad(orbit.yaw), 0, 'YXZ');
      orbitQuaternion.setFromEuler(orbitEuler);
      orbitOffset.copy(camPos).sub(ORBIT_PIVOT).applyQuaternion(orbitQuaternion);
      camPos.copy(ORBIT_PIVOT).add(orbitOffset);
      orbitOffset.copy(camTarget).sub(ORBIT_PIVOT).applyQuaternion(orbitQuaternion);
      camTarget.copy(ORBIT_PIVOT).add(orbitOffset);
      if (orbit.pitch > 0) camTarget.lerp(LOOK_DOWN_AT, (orbit.pitch / ORBIT.lookDown) * 0.8);
      else if (orbit.pitch < 0) camTarget.lerp(LOOK_UP_AT, (-orbit.pitch / ORBIT.lookUp) * 0.7);
      // Zoom moves the eye along its line of sight: in towards the aim, or (negative) back away from it.
      camPos.lerp(camTarget, orbit.zoom * (orbit.zoom > 0 ? ORBIT.zoomIn : 1));
      camPos.y = Math.max(camPos.y, 0.35);
    }
    container.toggleAttribute(
      'data-picnic-moved',
      Math.abs(orbitTarget.yaw) > 0.5 || Math.abs(orbitTarget.pitch) > 0.5 || Math.abs(orbitTarget.zoom) > 0.02,
    );
    fsPos.copy(SCREEN_CENTER).add(new THREE.Vector3(0, 0, fullscreenDistance()));
    camera.position.lerpVectors(camPos, fsPos, p);
    camera.fov = THREE.MathUtils.lerp(shotFov(shot), FULLSCREEN_FOV, p);
    camera.updateProjectionMatrix();
    camera.lookAt(camTarget.lerp(SCREEN_CENTER, p));
    camera.updateMatrixWorld();

    // Light levels.
    const t = lit;
    setLevel('BulbDeco', mix(LEVELS.bulbDeco, t));
    setLevel('TagPaper', mix(LEVELS.tag, t));
    setLevel('HemPlayed', mix(LEVELS.hemPlayed, t));
    setLevel('HemBuffered', mix(LEVELS.hemBuffered, t));
    const shadeAmount = 0.18 + 0.82 * t;
    shade(materials.get('BulbDeco'), shadeAmount);
    shade(materials.get('TagPaper'), 0.3 + 0.7 * t);
    for (const tag of tags) shade(tag.bulbMaterial, 0.3 + 0.7 * t);
    setLevel('PilotLamp', mix(LEVELS.pilot, t) * (0.8 + 0.2 * Math.sin(now / 420)));
    for (const light of strandLights) light.intensity = mix(LEVELS.strandLight, t);
    for (const light of overheadLights) light.intensity = mix(LEVELS.overheadLight, t);
    hemi.intensity = mix(LEVELS.hemi, t);
    screenLight.intensity = mix(LEVELS.screenLight, t) * (video && video.readyState >= 2 ? 1 : 0.3);
    sampleVideo(now);
    screenLight.color.lerp(spillTarget, ease(4));
    lanternLights.forEach((light, i) => {
      light.intensity = mix(LEVELS.lantern, t) * (i === 3 ? 0.55 : 1) * (0.85 + 0.15 * Math.sin(now / (130 + i * 37) + i));
    });
    const glowUniform = glowMaterial.uniforms.uGroup.value as THREE.Vector4;
    glowUniform.set(mix(LEVELS.haloDeco, t), mix(LEVELS.haloControl, t), mix(LEVELS.haloHem, t), 0.5 + 0.08 * Math.sin(now / 90));
    const scale = (container.clientHeight * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    glowMaterial.uniforms.uScale.value = scale;
    fireflyMaterial.uniforms.uScale.value = scale;
    // Sky: the moon always faces the camera; the stars brighten as the house lights go down.
    moonDisc.quaternion.copy(camera.quaternion);
    moonDisc.rotateZ(-0.5);
    starMaterial.uniforms.uTime.value = still ? 0 : now / 1000;
    starMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    starMaterial.uniforms.uAmount.value = 0.6 + 0.4 * (1 - t);
    moonMaterial.uniforms.uAmount.value = 0.85 + 0.15 * (1 - t);
    const litText = t.toFixed(2);
    if (litText !== lastLit) {
      lastLit = litText;
      container.style.setProperty('--picnic-lit', litText);
    }

    // Tags: place each control over its paper tag; the hovered/focused tag's bulb brightens and its tag swings.
    root.updateMatrixWorld(true);
    let glowDirty = false;
    for (const tag of tags) {
      const element = find(`.picnic-tag--${tag.name}`);
      const active = isActive(element) ? 1 : 0;
      tag.hover += (active - tag.hover) * ease(10);
      if (tag.group) {
        tag.sway += dt * (1.2 + tag.hover * 4);
        tag.group.rotation.z = still ? 0 : Math.sin(tag.sway) * (0.012 + tag.hover * 0.06);
      }
      if (tag.bulbMaterial) tag.bulbMaterial.emissiveIntensity = mix(LEVELS.bulbControl, t) + tag.hover * 5;
      const glowI = glowIndex.control.get(tag.name);
      if (glowMul && glowI !== undefined) {
        const value = 1 + tag.hover * 0.9;
        if (Math.abs(glowMul.getX(glowI) - value) > 0.01) {
          glowMul.setX(glowI, value);
          glowDirty = true;
        }
      }
    }
    root.updateMatrixWorld(true);
    for (const tag of tags) {
      const element = find(`.picnic-tag--${tag.name}`);
      if (!element || !tag.card) continue;
      const rect = project(tag.card);
      const isTime = tag.name === 'Time' || tag.name === 'Duration';
      place(element, isTime ? rect : grow(rect, 40), rect.h);
    }

    // Timeline: the hem lights. Dots up to the playhead are lit, the buffered stretch glows faintly.
    const hemSlider = find('.picnic-hem');
    const remoteSlider = find('.picnic-remote-slider');
    const draggingRemote = !!remoteSlider?.hasAttribute('data-dragging');
    const slider = draggingRemote ? remoteSlider : hemSlider;
    const dragging = !!slider?.hasAttribute('data-dragging');
    const fill = sliderFraction(slider, dragging ? '--media-slider-pointer' : '--media-slider-fill');
    const bufferedFraction = sliderFraction(slider, '--media-slider-buffer');
    if (hemSlider && hemWire) {
      const rect = project(hemWire);
      place(hemSlider, grow(rect, rect.w, 30), rect.h);
    }
    const hemKey = `${Math.round(fill * 400)},${Math.round(bufferedFraction * 100)}`;
    if (hemMaterials && hemKey !== lastHemKey) {
      lastHemKey = hemKey;
      const last = Math.max(hemDots.length - 1, 1);
      hemDots.forEach((dot, i) => {
        const f = i / last;
        dot.material = f <= fill ? hemMaterials!.played : f <= bufferedFraction ? hemMaterials!.buffered : hemMaterials!.off;
        const gi = glowIndex.hem[Number(dot.name.slice(4))];
        if (glowMul && gi !== undefined) glowMul.setX(gi, f <= fill ? 1 : f <= bufferedFraction ? 0.2 : 0);
      });
      glowDirty = true;
      if (hemPlayhead) hemPlayhead.position.x = HEM.left + (HEM.right - HEM.left) * fill;
    }
    if (glowMul && glowDirty) glowMul.needsUpdate = true;

    // Remote: at rest in the scene, lifted when opened, and in fullscreen it carries the controls (tucked when idle).
    // In fullscreen the remote is the control bar. It follows real pointer/keyboard activity (not the player's own
    // controls-visible flag): moving the remote under a still cursor can make the browser report pointer activity,
    // which would flip it up and down forever. It also stays up while it is hovered, focused or the video is paused.
    const remoteEngaged = !!container.querySelector('.picnic-remote-keys:hover, .picnic-remote-keys:focus-within, .picnic-remote-keys [aria-expanded="true"]');
    const awake = paused || remoteEngaged || now - lastActivity < FULLSCREEN_IDLE_MS;
    const mode: RemoteMode = fullscreen ? (awake || remoteOpen ? 'open' : 'tucked') : remoteOpen ? 'open' : 'rest';
    remoteMode = mode;
    container.dataset.picnicRemote = mode;
    if (remote) {
      remotePose(mode);
      const k = snapRemote ? 1 : ease(mode === 'rest' ? 7 : 9);
      snapRemote = false;
      remote.position.lerp(remoteTarget.position, k);
      remote.quaternion.slerp(remoteTarget.quaternion, k);
      if (cable) cable.visible = layout === 'desktop' && mode === 'rest' && remote.position.distanceTo(remoteTarget.position) < 0.02;
      if (remotePlayed) remotePlayed.scale.x = Math.max((fill * GROOVE.length) / playedWidth, 0.001);
      if (remoteKnob) remoteKnob.position.x = GROOVE.left + GROOVE.length * fill;
      remote.updateMatrixWorld(true);
      const lifted = mode === 'rest' ? 0 : 1;
      remoteLight.intensity += (lifted * 0.16 - remoteLight.intensity) * ease(6);
      remoteLight.position.copy(remote.position).addScaledVector(camUp, 0.12).addScaledVector(camForward, -0.18);

      const toggle = find('.picnic-remote-toggle');
      if (toggle && remoteBody) {
        const rect = project(remoteBody);
        place(toggle, mode === 'rest' ? grow(rect, 48) : rect);
      }
      for (const key of keys) {
        const element = find(`.picnic-key--${key.suffix}`);
        if (!element || !key.mesh) continue;
        const rect = project(key.mesh);
        place(element, grow(rect, 32), rect.h);
      }
      if (remoteSlider && remoteGroove) {
        const rect = project(remoteGroove);
        place(remoteSlider, grow(rect, rect.w, 24), rect.h);
      }
      if (remotePlate) {
        const rect = project(remotePlate);
        const label = { y: rect.y, h: rect.h, w: rect.w * 0.17 };
        const time = find('.picnic-key--TimeLabel');
        const duration = find('.picnic-key--DurationLabel');
        if (time) place(time, { x: rect.x, ...label }, rect.h);
        if (duration) place(duration, { x: rect.x + rect.w - label.w, ...label }, rect.h);
      }
    }

    // Screen rect for the poster, captions and buffering indicator.
    if (screenMesh) {
      const rect = project(screenMesh);
      const style = container.style;
      style.setProperty('--picnic-screen-x', `${rect.x.toFixed(1)}px`);
      style.setProperty('--picnic-screen-y', `${rect.y.toFixed(1)}px`);
      style.setProperty('--picnic-screen-w', `${rect.w.toFixed(1)}px`);
      style.setProperty('--picnic-screen-h', `${rect.h.toFixed(1)}px`);
    }

    // Fireflies drift on slow Lissajous paths; on play they scatter outwards as they fade.
    fireflies.visible = fireflyAmount > 0.01 && push < 0.6;
    if (fireflies.visible) {
      const positions = fireflyGeometry.attributes.position as THREE.BufferAttribute;
      const time = still ? 0 : now / 1000;
      const scatter = 1 + (1 - fireflyAmount) * (paused ? 0 : 2.5);
      for (let i = 0; i < FIREFLY_COUNT; i += 1) {
        const s = fireflySeed[i];
        const base = fireflyBase[i];
        positions.setXYZ(
          i,
          base.x * scatter + Math.sin(time * 0.31 + s) * 0.6 + Math.sin(time * 0.77 + s * 2) * 0.2,
          base.y + Math.sin(time * 0.43 + s * 3) * 0.35,
          base.z + Math.cos(time * 0.27 + s) * 0.5,
        );
      }
      positions.needsUpdate = true;
      const blink = fireflyMaterial.uniforms.uGroup.value as THREE.Vector4;
      blink.setScalar(fireflyAmount * (0.9 + 0.1 * Math.sin(now / 300)));
    }

    renderer.render(scene, camera);
  }

  // ---- wiring -------------------------------------------------------------------------------------------------------
  const resizeObserver = new ResizeObserver(() => {
    fit();
    snapRemote = true;
    frame();
  });
  resizeObserver.observe(container);

  let running = false;
  const setRunning = (next: boolean) => {
    if (next === running || disposed) return;
    running = next;
    renderer.setAnimationLoop(next ? frame : null);
  };
  const intersectionObserver = new IntersectionObserver(([entry]) => setRunning(!!entry?.isIntersecting));
  intersectionObserver.observe(container);

  // ---- look around ------------------------------------------------------------------------------------------------
  const INTERACTIVE = 'button, a, input, [role="slider"], [role="menu"], [role="dialog"], .media-popup, [popover]';
  let drag: { id: number; x: number; y: number; yaw: number; pitch: number; active: boolean } | null = null;
  let suppressClick = false;
  let hintTimer = 0;
  const hint = find('.picnic-zoom-hint');
  if (hint) hint.textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? 'Use ⌘ + scroll to zoom' : 'Use Ctrl + scroll to zoom';

  const onOrbitDown = (event: PointerEvent) => {
    if (!orbitEnabled || event.pointerType !== 'mouse' || event.button !== 0) return;
    if ((event.target as Element | null)?.closest(INTERACTIVE)) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: orbitTarget.yaw, pitch: orbitTarget.pitch, active: false };
  };
  const onOrbitMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.active && Math.hypot(dx, dy) > ORBIT.dragPx) {
      drag.active = true;
      container.setAttribute('data-picnic-dragging', '');
      try {
        container.setPointerCapture(event.pointerId);
      } catch {
        // The pointer may already be gone.
      }
    }
    if (!drag.active) return;
    orbitTarget.yaw = THREE.MathUtils.clamp(drag.yaw - dx * 0.12, -ORBIT.yaw, ORBIT.yaw);
    // Drag down to look down at the table, up to look up at the lights.
    orbitTarget.pitch = THREE.MathUtils.clamp(drag.pitch + dy * 0.14, -ORBIT.lookUp, ORBIT.lookDown);
    lastOrbit = performance.now();
  };
  // A drag is not a click: swallow the release so the player doesn't toggle playback or controls.
  const onOrbitUp = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.active) {
      event.stopImmediatePropagation();
      suppressClick = true;
      window.setTimeout(() => (suppressClick = false), 0);
      container.removeAttribute('data-picnic-dragging');
      try {
        container.releasePointerCapture(event.pointerId);
      } catch {
        // Already released.
      }
    }
    drag = null;
  };
  const onWheel = (event: WheelEvent) => {
    if (!orbitEnabled) return;
    if (!event.ctrlKey && !event.metaKey) {
      // Like a map: plain scrolling scrolls the page, and a hint says how to zoom.
      container.setAttribute('data-picnic-hint', '');
      window.clearTimeout(hintTimer);
      hintTimer = window.setTimeout(() => container.removeAttribute('data-picnic-hint'), 1400);
      return;
    }
    event.preventDefault();
    container.removeAttribute('data-picnic-hint');
    // Trackpad pinches arrive as small ctrl+wheel steps; mouse wheels as large ones.
    const speed = Math.abs(event.deltaY) > 40 ? 0.0025 : 0.012;
    orbitTarget.zoom = THREE.MathUtils.clamp(orbitTarget.zoom - event.deltaY * speed, ORBIT.zoomOut, 1);
    lastOrbit = performance.now();
  };
  // Safari reports trackpad pinches as gesture events.
  let gestureStartZoom = 0;
  const onGestureStart = (event: Event) => {
    if (!orbitEnabled) return;
    event.preventDefault();
    gestureStartZoom = orbitTarget.zoom;
  };
  const onGestureChange = (event: Event) => {
    if (!orbitEnabled) return;
    event.preventDefault();
    const scale = (event as Event & { scale?: number }).scale ?? 1;
    orbitTarget.zoom = THREE.MathUtils.clamp(gestureStartZoom + (scale - 1) * 0.9, ORBIT.zoomOut, 1);
    lastOrbit = performance.now();
  };

  const onClick = (event: MouseEvent) => {
    if (suppressClick) {
      event.stopImmediatePropagation();
      event.preventDefault();
      suppressClick = false;
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest('.picnic-reset-view')) {
      event.stopPropagation();
      orbitTarget.yaw = 0;
      orbitTarget.pitch = 0;
      orbitTarget.zoom = 0;
      lastOrbit = 0;
      return;
    }
    if (target?.closest('.picnic-remote-toggle')) {
      event.stopPropagation();
      setRemoteOpen(!remoteOpen);
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    lastActivity = performance.now();
    if (event.key === 'Escape' && remoteOpen && !fullscreen) {
      setRemoteOpen(false);
      find('.picnic-remote-toggle')?.focus();
    }
  };
  const onPointerMove = (event: PointerEvent) => {
    // Only a pointer that really moved counts as activity (synthetic moves after layout changes keep their position).
    if (event.clientX !== lastPointer.x || event.clientY !== lastPointer.y) {
      if (!Number.isNaN(lastPointer.x)) lastActivity = performance.now();
      lastPointer = { x: event.clientX, y: event.clientY };
    }
    if (event.pointerType !== 'mouse') return;
    const rect = container.getBoundingClientRect();
    parallaxTarget.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    parallaxTarget.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  };
  const onPointerLeave = () => {
    parallaxTarget.x = 0;
    parallaxTarget.y = 0;
  };
  const onPointerDown = () => {
    lastActivity = performance.now();
  };
  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointerdown', onOrbitDown, true);
  container.addEventListener('pointermove', onOrbitMove, true);
  container.addEventListener('pointerup', onOrbitUp, true);
  container.addEventListener('pointercancel', onOrbitUp, true);
  container.addEventListener('wheel', onWheel, { passive: false });
  container.addEventListener('gesturestart', onGestureStart);
  container.addEventListener('gesturechange', onGestureChange);
  container.addEventListener('click', onClick, true);
  container.addEventListener('keydown', onKeyDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerleave', onPointerLeave);

  return () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    container.removeEventListener('pointerdown', onPointerDown);
    container.removeEventListener('pointerdown', onOrbitDown, true);
    container.removeEventListener('pointermove', onOrbitMove, true);
    container.removeEventListener('pointerup', onOrbitUp, true);
    container.removeEventListener('pointercancel', onOrbitUp, true);
    container.removeEventListener('wheel', onWheel);
    container.removeEventListener('gesturestart', onGestureStart);
    container.removeEventListener('gesturechange', onGestureChange);
    window.clearTimeout(hintTimer);
    container.removeEventListener('click', onClick, true);
    container.removeEventListener('keydown', onKeyDown);
    container.removeEventListener('pointermove', onPointerMove);
    container.removeEventListener('pointerleave', onPointerLeave);
    delete container.dataset.picnic;
    delete container.dataset.picnicLayout;
    delete container.dataset.picnicRemote;
    container.removeAttribute('data-picnic-fs');
    for (const name of ['data-picnic-orbit', 'data-picnic-moved', 'data-picnic-dragging', 'data-picnic-hint']) {
      container.removeAttribute(name);
    }
    for (const property of ['--picnic-lit', '--picnic-screen-x', '--picnic-screen-y', '--picnic-screen-w', '--picnic-screen-h']) {
      container.style.removeProperty(property);
    }
    container.querySelectorAll<HTMLElement>('[class*="picnic-tag"], [class*="picnic-key"], .picnic-hem, .picnic-remote-slider, .picnic-remote-toggle').forEach((element) => {
      for (const property of ['left', 'top', 'width', 'height', '--picnic-h']) element.style.removeProperty(property);
    });
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh && !(object as THREE.Points).isPoints) return;
      mesh.geometry?.dispose();
      for (const material of ([] as THREE.Material[]).concat(mesh.material)) material?.dispose();
    });
    videoTexture?.dispose();
    posterTexture?.dispose();
    renderer.dispose();
  };
}
