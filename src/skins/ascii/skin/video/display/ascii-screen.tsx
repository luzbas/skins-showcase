/** @jsxImportSource react */

'use client';

import { useEffect, useRef } from 'react';

/**
 * The ASCII screen shows only while the video is paused (before it starts, paused, or ended); during playback the
 * plain video shows and nothing is drawn.
 *
 * It is a WebGL canvas laid over the real `<video>` that redraws the frame as a grid of coloured
 * monospace glyphs. Each cell samples the video at its centre, picks a glyph from a brightness ramp and is tinted with
 * the pixel's own colour. On top of that sit the "bad signal" effects from the reference:
 *
 * - RGB split: red and blue (magenta) glyphs are drawn a little to the right, green a little to the left, so bright
 *   areas fringe green and magenta;
 * - shimmer: a little per-cell noise on brightness, re-rolled every frame, so glyphs flicker between neighbours;
 * - row tearing: now and then a row of glyphs slides sideways for a frame;
 * - scanlines and a faint whole-frame flicker.
 *
 * The canvas is decorative: it takes no pointer events and is hidden from assistive tech. If WebGL is missing, or the
 * video can't be read (no CORS), it marks the player `data-ascii="fallback"` and the plain video shows instead.
 * Under `prefers-reduced-motion` the shimmer, tearing and flicker stop; the glyphs still follow the video.
 */

const RAMP = " .'`-:;=+*!?oxe%#&@";
const ATLAS_W = 24;
const ATLAS_H = 40;
const FPS = 30;

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform sampler2D uVideo;
uniform sampler2D uAtlas;
uniform vec2 uRes;
uniform vec2 uCell;
uniform float uGlyphs;
uniform float uFrame;
uniform float uSplit;
uniform float uTear;
uniform float uNoise;
uniform float uFlicker;
uniform vec2 uVideoScale;
uniform vec2 uVideoOffset;
uniform float uTint;
uniform vec3 uPalA;
uniform vec3 uPalB;
uniform vec3 uPalC;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float glyphAt(vec2 px, out vec3 col) {
  float row = floor(px.y / uCell.y);
  float tearSeed = hash(vec2(row, floor(uFrame / 2.0)));
  if (tearSeed > 1.0 - 0.035 * uTear) {
    px.x += (hash(vec2(row, uFrame)) - 0.5) * uCell.x * 10.0;
  }
  vec2 cell = floor(px / uCell);
  vec2 local = fract(px / uCell);
  vec2 uv = (cell + 0.5) * uCell / uRes;
  vec2 vuv = (uv - uVideoOffset) / uVideoScale;
  if (vuv.x < 0.0 || vuv.y < 0.0 || vuv.x > 1.0 || vuv.y > 1.0) { col = vec3(0.0); return 0.0; }
  vec3 c = texture2D(uVideo, vuv).rgb;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  // Lift the mids so lit areas fill with dense glyphs, like the reference; true blacks stay empty.
  float level = pow(clamp(lum, 0.0, 1.0), 0.62) * 1.12;
  level += (hash(cell + fract(uFrame * 0.0137) * 97.0) - 0.5) * uNoise;
  float idx = floor(clamp(level, 0.0, 0.999) * uGlyphs);
  float mask = texture2D(uAtlas, vec2((idx + local.x) / uGlyphs, local.y)).r;
  // Vivid colour: saturate, then normalise to the brightest channel and scale by the lifted level.
  vec3 sat = max(mix(vec3(lum), c, 1.7), 0.0);
  float peak = max(max(sat.r, sat.g), max(sat.b, 0.18));
  col = clamp(sat / peak * (0.35 + 0.8 * clamp(level, 0.0, 1.0)), 0.0, 1.0);
  // Optional palette: map the level onto a three-stop ramp and blend it over the source colour.
  float t = clamp(level, 0.0, 1.0);
  vec3 pal = t < 0.5 ? mix(uPalA, uPalB, t * 2.0) : mix(uPalB, uPalC, (t - 0.5) * 2.0);
  col = mix(col, pal, uTint);
  return mask;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec3 cM; vec3 cG;
  float mM = glyphAt(px - vec2(uSplit, 0.0), cM);
  float mG = glyphAt(px + vec2(uSplit, 0.0), cG);
  vec3 outc = vec3(cM.r * mM, cG.g * mG, cM.b * mM);
  outc *= 0.86 + 0.14 * step(0.5, fract(px.y / max(2.0, floor(uCell.y / 4.0))));
  outc *= 1.0 - uFlicker * 0.08 * hash(vec2(uFrame, 7.0));
  gl_FragColor = vec4(outc, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[ascii-skin]', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function hexToRgb(value: string, fallback: [number, number, number]): [number, number, number] {
  const hex = value.trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
  const n = parseInt(hex, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function drawAtlas(font: string) {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_W * RAMP.length;
  canvas.height = ATLAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = `600 ${Math.round(ATLAS_H * 0.78)}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < RAMP.length; i += 1) {
    ctx.fillText(RAMP[i], (i + 0.5) * ATLAS_W, ATLAS_H * 0.54);
  }
  return canvas;
}

export function AsciiScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.closest<HTMLElement>('.media-container');
    if (!canvas || !root) return undefined;

    const setState = (state: 'on' | 'fallback') => root.setAttribute('data-ascii', state);

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) {
      setState('fallback');
      return undefined;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram();
    if (!vs || !fs || !program) {
      setState('fallback');
      return undefined;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setState('fallback');
      return undefined;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uni = {
      video: u('uVideo'),
      atlas: u('uAtlas'),
      res: u('uRes'),
      cell: u('uCell'),
      glyphs: u('uGlyphs'),
      frame: u('uFrame'),
      split: u('uSplit'),
      tear: u('uTear'),
      noise: u('uNoise'),
      flicker: u('uFlicker'),
      videoScale: u('uVideoScale'),
      videoOffset: u('uVideoOffset'),
      tint: u('uTint'),
      palA: u('uPalA'),
      palB: u('uPalB'),
      palC: u('uPalC'),
    };

    const makeTexture = (unit: number) => {
      const texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return texture;
    };

    const videoTexture = makeTexture(0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    const atlasTexture = makeTexture(1);

    const uploadAtlas = () => {
      const font = getComputedStyle(root).getPropertyValue('--ax-glyph-font').trim() || 'ui-monospace, monospace';
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, drawAtlas(font));
    };
    uploadAtlas();
    document.fonts?.ready.then(() => {
      if (!disposed) uploadAtlas();
    });

    gl.uniform1i(uni.video, 0);
    gl.uniform1i(uni.atlas, 1);
    gl.uniform1f(uni.glyphs, RAMP.length);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let disposed = false;
    let raf = 0;
    let last = 0;
    let frame = 0;
    let lastVideoTime = -1;
    let dirty = true;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Layout size, not getBoundingClientRect: inside a transformed parent (the Duo simulation turns and tilts the
      // phone) the bounding box is the rotated one, and the glyph grid would be stretched.
      width = Math.max(1, Math.round((canvas.clientWidth || 1) * dpr));
      height = Math.max(1, Math.round((canvas.clientHeight || 1) * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      dirty = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 1000 / FPS) return;
      last = now;

      const video = root.querySelector('video');
      if (!video || video.readyState < 2 || !video.videoWidth) return;

      // While the video plays the plain video shows (see ascii.css), so skip the GPU work until it pauses again.
      if (!video.paused) {
        lastVideoTime = -1;
        return;
      }

      const still = reducedMotion.matches;
      const changed = video.currentTime !== lastVideoTime || !video.paused;
      if (still && !changed && !dirty) return;

      if (changed || dirty) {
        try {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, videoTexture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        } catch {
          // A cross-origin video without CORS can't be read; show the plain video instead.
          setState('fallback');
          cancelAnimationFrame(raf);
          return;
        }
        lastVideoTime = video.currentTime;
      }
      setState('on');
      dirty = false;
      frame += 1;

      // Glyph cells: a fixed column count across the player, roughly 0.6:1 like a monospace character.
      const styles = getComputedStyle(root);
      const columns = parseFloat(styles.getPropertyValue('--ax-columns')) || 160;
      // Optional palette tint (--ax-tint 0–1 with --ax-pal-a/b/c, dark to light); 0 keeps the video's own colours.
      const tint = parseFloat(styles.getPropertyValue('--ax-tint')) || 0;
      const palA = hexToRgb(styles.getPropertyValue('--ax-pal-a'), [0.6, 0.2, 0.1]);
      const palB = hexToRgb(styles.getPropertyValue('--ax-pal-b'), [1, 0.7, 0.2]);
      const palC = hexToRgb(styles.getPropertyValue('--ax-pal-c'), [1, 0.95, 0.85]);
      const cellW = Math.max(3 * dpr, width / columns);
      const cellH = cellW * 1.7;

      // object-fit: contain, so the glyph grid letterboxes the same way the video does.
      const videoAspect = video.videoWidth / video.videoHeight;
      const screenAspect = width / height;
      const scaleX = videoAspect > screenAspect ? 1 : videoAspect / screenAspect;
      const scaleY = videoAspect > screenAspect ? screenAspect / videoAspect : 1;

      // The split pulses: mostly a pixel or two, now and then a big jolt.
      const jolt = !still && Math.random() < 0.04 ? 2.5 + Math.random() * 3 : 1;
      const split = (still ? 1 : 0.8 + Math.random() * 0.6) * cellW * 0.22 * jolt;

      gl.uniform2f(uni.res, width, height);
      gl.uniform2f(uni.cell, cellW, cellH);
      gl.uniform1f(uni.frame, still ? 0 : frame);
      gl.uniform1f(uni.split, split);
      gl.uniform1f(uni.tear, still ? 0 : 1);
      gl.uniform1f(uni.noise, still ? 0 : 0.14);
      gl.uniform1f(uni.flicker, still ? 0 : 1);
      gl.uniform2f(uni.videoScale, scaleX, scaleY);
      gl.uniform2f(uni.videoOffset, (1 - scaleX) / 2, (1 - scaleY) / 2);
      gl.uniform1f(uni.tint, Math.min(1, Math.max(0, tint)));
      gl.uniform3f(uni.palA, palA[0], palA[1], palA[2]);
      gl.uniform3f(uni.palB, palB[0], palB[1], palB[2]);
      gl.uniform3f(uni.palC, palC[0], palC[1], palC[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(tick);

    const onContextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(raf);
      setState('fallback');
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      root.removeAttribute('data-ascii');
    };
  }, []);

  return (
    <div className={'ax-screen'} aria-hidden="true">
      <canvas ref={canvasRef} className={'ax-canvas'} />
    </div>
  );
}
