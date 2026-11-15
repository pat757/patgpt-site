"use client";
import { useEffect, useRef } from "react";

// A slow field of brand-orange "ink" behind the homepage hero. It drifts on its own and leans toward the
// pointer. Desktop only: on phones the hero text fills the space, so there'd be nothing to see for the battery
// it costs. Drawn with WebGL at low resolution and about 30 frames a second (the drift is slow, so nobody can
// tell), paused whenever it's off-screen or the tab is hidden, and skipped for reduced motion or when WebGL
// isn't available. In every skipped case the page's normal static glow shows instead.
//
// Contrast: behind the headline and the intro (each measured tightly around its actual words) the ink is capped
// at TEXT_ALPHA, so even its densest patch keeps the muted intro text above 4.5:1 (about 4.8:1 light, 5.3:1 dark).
// Away from the words it may run deeper (OPEN_ALPHA).
const TEXT_ALPHA = { light: 0.2, dark: 0.22 };
const OPEN_ALPHA = { light: 0.5, dark: 0.5 };

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPtr;
uniform float uPtrOn;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uAlphaOpen;
uniform vec4 uText1;
uniform vec4 uText2;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// 1 inside the box r (x0, y0, x1, y1 in 0..1, y up), easing to 0 over a soft margin outside it.
float boxMask(vec4 r, vec2 uv, vec2 f){
  float inX = smoothstep(r.x - f.x, r.x, uv.x) * (1.0 - smoothstep(r.z, r.z + f.x, uv.x));
  float inY = smoothstep(r.y - f.y, r.y, uv.y) * (1.0 - smoothstep(r.w, r.w + f.y, uv.y));
  return inX * inY;
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * 1.5;
  float t = uTime * 0.035;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, -t)));
  float n = fbm(p + 1.9 * q + vec2(t * 0.6, t * 0.3));
  float ink = smoothstep(0.3, 0.78, n);
  float right = smoothstep(0.0, 1.0, uv.x);
  float top = smoothstep(0.05, 0.85, uv.y);
  float field = ink * (0.45 + 0.55 * right) * (0.5 + 0.5 * top) * 1.6;
  vec2 d = (uv - uPtr) * vec2(aspect, 1.0);
  field += uPtrOn * 0.6 * exp(-dot(d, d) / 0.05) * (0.55 + 0.45 * ink);
  // uText1 is the headline (photo + words), uText2 the intro. Over them, and a soft margin around them, the cap is uAlpha.
  vec2 feather = vec2(0.05, 0.14);
  float overText = max(boxMask(uText1, uv, feather), boxMask(uText2, uv, feather));
  float cap = mix(uAlphaOpen, uAlpha, overText);
  float a = clamp(field, 0.0, 1.0) * cap;
  gl_FragColor = vec4(uColor * a, a);
}`;

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.trim().replace("#", "");
  const n = parseInt(m.length === 3 ? m.replace(/./g, (c) => c + c) : m.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function HeroInk() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (matchMedia("(prefers-reduced-motion: reduce), (max-width: 767px), (hover: none)").matches) return;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "low-power" });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(prog, name);
    const uRes = u("uRes"), uTime = u("uTime"), uPtr = u("uPtr"), uPtrOn = u("uPtrOn"), uColor = u("uColor");
    const uAlpha = u("uAlpha"), uAlphaOpen = u("uAlphaOpen"), uText1 = u("uText1"), uText2 = u("uText2");

    const applyTheme = () => {
      const root = document.documentElement;
      const accent = getComputedStyle(root).getPropertyValue("--accent") || "#ED7436";
      const dark = root.getAttribute("data-theme") === "dark";
      gl.uniform3fv(uColor, hexToRgb(accent));
      gl.uniform1f(uAlpha, dark ? TEXT_ALPHA.dark : TEXT_ALPHA.light);
      gl.uniform1f(uAlphaOpen, dark ? OPEN_ALPHA.dark : OPEN_ALPHA.light);
    };
    applyTheme();
    const themeWatch = new MutationObserver(applyTheme);
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const host = canvas.parentElement!;

    // Soft field, so render at half the CSS pixel size and let the browser scale it up.
    const resize = () => {
      const scale = 0.5 * Math.min(devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, w, h);
      // Where the words sit, in the canvas's 0..1 space (y up), measured around the text itself rather than its
      // full-width containers, and padded so letters never meet deep ink.
      const c = canvas.getBoundingClientRect();
      if (!c.width || !c.height) return;
      const textBox = (el: Element | null) => {
        if (!el) return null;
        const range = document.createRange();
        range.selectNodeContents(el);
        return range.getBoundingClientRect();
      };
      const toUv = (rects: (DOMRect | null)[]) => {
        const r = rects.filter((b): b is DOMRect => !!b && b.width > 0);
        if (!r.length) return [0, 0, 0, 0] as const;
        const pad = 18;
        const x0 = Math.min(...r.map((b) => b.left)) - pad, x1 = Math.max(...r.map((b) => b.right)) + pad;
        const y0 = Math.min(...r.map((b) => b.top)) - pad, y1 = Math.max(...r.map((b) => b.bottom)) + pad;
        return [(x0 - c.left) / c.width, 1 - (y1 - c.top) / c.height, (x1 - c.left) / c.width, 1 - (y0 - c.top) / c.height] as const;
      };
      const headline = toUv([host.querySelector(".avatar")?.getBoundingClientRect() ?? null, textBox(host.querySelector("h1"))]);
      const intro = toUv([textBox(host.querySelector(".intro"))]);
      gl.uniform4f(uText1, ...headline);
      gl.uniform4f(uText2, ...intro);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    document.fonts?.ready.then(resize).catch(() => {});

    // Pointer, eased so the ink follows lazily rather than snapping.
    const target = { x: 0.7, y: 0.6, on: 0 };
    const cur = { x: 0.7, y: 0.6, on: 0 };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = canvas.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width;
      target.y = 1 - (e.clientY - r.top) / r.height;
      target.on = 1;
    };
    const onLeave = () => (target.on = 0);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let visible = true;
    let last = 0;
    const start = performance.now();
    const frame = (now: number) => {
      raf = 0;
      // About 30 frames a second is plenty for a slow drift and halves the GPU work.
      if (now - last < 32) {
        if (visible && !document.hidden) raf = requestAnimationFrame(frame);
        return;
      }
      last = now;
      cur.x += (target.x - cur.x) * 0.05;
      cur.y += (target.y - cur.y) * 0.05;
      cur.on += (target.on - cur.on) * 0.04;
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uPtr, cur.x, cur.y);
      gl.uniform1f(uPtrOn, cur.on);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const run = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      run();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", run);
    canvas.classList.add("on");
    run();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      themeWatch.disconnect();
      document.removeEventListener("visibilitychange", run);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <canvas ref={ref} className="hero-ink" aria-hidden="true" />;
}
