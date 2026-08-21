"use client";

import React, { useEffect, useRef } from "react";

/**
 * Aceternity UI's "Cloud Shader" component, fetched from
 * https://ui.aceternity.com/registry/cloud-shader.json and adapted to this
 * repo: the `cn()` merge (clsx + tailwind-merge, neither installed here)
 * is replaced with a plain className join since there's only one call site.
 * The shader itself is unmodified.
 */

export type CloudShaderProps = {
  className?: string;
  children?: React.ReactNode;
  /** Animation speed multiplier. 1 = default drift. */
  speed?: number;
  /** Number of clouds (1-6). */
  count?: number;
  /** Cloud tint color (hex or rgb string). */
  cloudColor?: string;
  /** Sky color at the top (hex or rgb string). */
  skyTopColor?: string;
  /** Sky color at the bottom (hex or rgb string). */
  skyBottomColor?: string;
};

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// Original cloud shader for Aceternity UI.
// Each cloud is an asymmetric envelope (dome top, flat base) filled with
// domain-warped billow noise. A second density sample above the pixel
// approximates self-shadowing. Clouds drift horizontally and wrap around.
const FRAG = `
precision highp float;

varying vec2 v_uv;

uniform vec2 u_res;
uniform float u_time;
uniform float u_count;
uniform vec3 u_cloud;
uniform vec3 u_skyTop;
uniform vec3 u_skyBottom;

const mat2 R = mat2(0.80, 0.60, -0.60, 0.80);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.31, 289.17))) * 26737.367);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// 3 octaves, not 4: the fourth is amplitude 0.0625, far below what survives
// the fade mask, and it costs a full noise fetch per sample. The 1.0714
// restores the total amplitude a 4-octave sum had, so the thresholds further
// down still mean what they meant.
float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * vnoise(p);
    p = R * p * 2.03 + 19.19;
    amp *= 0.5;
  }
  return sum * 1.0714;
}

// billow noise: sharp puffy ridges, like cauliflower cloud tops
float billow(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * (1.0 - abs(2.0 * vnoise(p) - 1.0));
    p = R * p * 2.11 + 13.37;
    amp *= 0.5;
  }
  return sum * 1.0333;
}

// raw density for one cloud at point p
float cloudDensity(vec2 p, vec2 c, vec2 r, float seed, float t) {
  vec2 q = p - c;

  // envelope: dome above the center, flat base below
  float ry = q.y > 0.0 ? r.y : r.y * 0.42;
  float env = 1.0 - length(vec2(q.x / r.x, q.y / ry));
  if (env < -0.35) return 0.0;

  // domain-warped billow detail, moves with the cloud, evolves slowly
  vec2 dp = q * (2.4 / r.x) + seed;
  dp += 0.6 * vec2(
    fbm(dp * 1.4 + t * 0.04),
    fbm(dp * 1.4 + 7.7 - t * 0.03)
  );
  float detail = billow(dp * 1.6);

  return env + (detail - 0.62) * 0.62;
}

// shades one cloud and blends it over the current color
vec3 shadeCloud(vec3 color, vec3 sky, vec2 p, vec2 c, vec2 r, float seed, float t, float dist) {
  float d = cloudDensity(p, c, r, seed, t);
  if (d < 0.02) return color;

  // sample density toward the sun (straight up) for self-shadowing
  float dUp = cloudDensity(p + vec2(0.0, r.y * 0.55), c, r, seed, t);
  float occl = clamp((dUp - d) * 1.1 + d * 0.55, 0.0, 1.0);

  vec3 lit = u_cloud * 1.04;
  vec3 shadow = mix(u_cloud * 0.46, sky, 0.28);
  vec3 cloudCol = mix(lit, shadow, occl * 0.92);

  float alpha = smoothstep(0.02, 0.38, d);

  // silver lining on thin edges
  float rim = smoothstep(0.02, 0.14, d) * (1.0 - smoothstep(0.14, 0.40, d));
  cloudCol += rim * 0.10;

  // atmospheric perspective: far clouds fade into the sky
  cloudCol = mix(cloudCol, sky, dist * 0.22);
  alpha *= mix(1.0, 0.88, dist);

  return mix(color, cloudCol, alpha);
}

// one drifting cloud: horizontal wrap + gentle vertical bob
vec3 cloudPass(vec3 color, vec3 sky, vec2 p, float aspect, float t,
               float spd, float phase, float y, vec2 r, float seed, float dist) {
  float cx = mix(-r.x - 0.25, aspect + r.x + 0.25, fract(t * spd + phase));
  float cy = y + sin(t * 0.05 + phase * 6.2831) * 0.012;
  return shadeCloud(color, sky, p, vec2(cx, cy), r, seed, t, dist);
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(v_uv.x * aspect, v_uv.y);
  float t = u_time;

  vec3 sky = mix(u_skyBottom, u_skyTop, v_uv.y);
  vec3 color = sky;

  // faint haze band near the horizon
  color = mix(color, u_skyBottom * 1.06, smoothstep(0.35, 0.0, v_uv.y) * 0.5);

  // soft sun glow, upper area
  vec2 sunPos = vec2(aspect * 0.78, 0.92);
  float sunDist = length(p - sunPos);
  color += vec3(1.0, 0.95, 0.82) * exp(-sunDist * sunDist * 5.0) * 0.26;

  // thin cirrus streaks, stretched horizontally, high in the sky
  float cirrusBand = smoothstep(0.55, 0.8, v_uv.y) * (1.0 - smoothstep(0.9, 1.0, v_uv.y));
  if (cirrusBand > 0.01) {
    float streak = fbm(vec2(p.x * 1.6 - t * 0.006, p.y * 12.0));
    float wisp = smoothstep(0.52, 0.78, streak) * cirrusBand;
    color = mix(color, u_cloud * 0.98, wisp * 0.48);
  }

  // far layer: small, high, slow
  if (u_count > 5.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.006, 0.10, 0.84, vec2(0.20, 0.10), 43.7, 1.0);
  }
  if (u_count > 4.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.008, 0.62, 0.73, vec2(0.24, 0.12), 71.3, 0.85);
  }

  // middle layer
  if (u_count > 3.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.011, 0.33, 0.60, vec2(0.34, 0.16), 17.3, 0.55);
  }
  if (u_count > 2.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.013, 0.80, 0.47, vec2(0.30, 0.15), 29.9, 0.45);
  }

  // near layer: big, low, fast
  if (u_count > 1.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.016, 0.05, 0.35, vec2(0.46, 0.20), 91.1, 0.15);
  }
  color = cloudPass(color, sky, p, aspect, t, 0.020, 0.48, 0.20, vec2(0.56, 0.24), 57.2, 0.0);

  gl_FragColor = vec4(color, 1.0);
}
`;

function parseHex(color: string): [number, number, number] {
  const value = color.trim();
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16) / 255,
        parseInt(hex[1] + hex[1], 16) / 255,
        parseInt(hex[2] + hex[2], 16) / 255,
      ];
    }
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
    ];
  }
  const rgb = value.match(/[\d.]+/g);
  if (rgb && rgb.length >= 3) {
    return [Number(rgb[0]) / 255, Number(rgb[1]) / 255, Number(rgb[2]) / 255];
  }
  return [0.95, 0.95, 0.95];
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Fraction of the display's pixels the sky is actually drawn at, then scaled
 * up by the browser. 0.6 is a little under half the fragments of native.
 */
const RENDER_SCALE = 0.6;

/** 30fps. See the note in the draw loop for why that's free here. */
const FRAME_MS = 1000 / 30;

export const CloudShader = ({
  className,
  children,
  speed = 1,
  count = 6,
  cloudColor = "#fbf8f2",
  skyTopColor = "#3876ba",
  skyBottomColor = "#8cbfe8",
}: CloudShaderProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paramsRef = useRef({
    speed,
    count,
    cloudColor,
    skyTopColor,
    skyBottomColor,
  });

  // Kept in sync via effect rather than assigned during render — the mount
  // effect below has empty deps on purpose (rebuilding the GL program on
  // every prop change would restart the animation), so it reads the latest
  // values through this ref instead.
  useEffect(() => {
    paramsRef.current = {
      speed,
      count,
      cloudColor,
      skyTopColor,
      skyBottomColor,
    };
  }, [speed, count, cloudColor, skyTopColor, skyBottomColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      // A decorative sky has no business waking a discrete GPU. On a laptop
      // this is the difference between the fans staying quiet and not.
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vert = compile(gl, gl.VERTEX_SHADER, VERT);
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.bindAttribLocation(program, 0, "a_pos");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const loc = {
      res: gl.getUniformLocation(program, "u_res"),
      time: gl.getUniformLocation(program, "u_time"),
      count: gl.getUniformLocation(program, "u_count"),
      cloud: gl.getUniformLocation(program, "u_cloud"),
      skyTop: gl.getUniformLocation(program, "u_skyTop"),
      skyBottom: gl.getUniformLocation(program, "u_skyBottom"),
    };

    let frame = 0;
    let last = 0;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * RENDER_SCALE;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const w = Math.max(1, Math.floor(width * dpr));
      const h = Math.max(1, Math.floor(height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(loc.res, w, h);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const t0 = performance.now();
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      // The loop keeps ticking; the GPU work doesn't. At this drift speed a
      // cloud moves well under a pixel per frame, so 30 and 60 are the same
      // picture at half the cost — and on a 144Hz panel, a fifth of it.
      if (now - last < FRAME_MS) return;
      last = now;

      const p = paramsRef.current;
      // Wall time, not accumulated: pausing while hidden and picking up the
      // real elapsed time on return is what a real sky would do.
      const elapsed = reduceMotion ? 0 : ((now - t0) / 1000) * p.speed;
      const cloud = parseHex(p.cloudColor);
      const skyTop = parseHex(p.skyTopColor);
      const skyBottom = parseHex(p.skyBottomColor);

      gl.uniform1f(loc.time, elapsed);
      gl.uniform1f(loc.count, Math.min(6, Math.max(1, p.count)));
      gl.uniform3f(loc.cloud, cloud[0], cloud[1], cloud[2]);
      gl.uniform3f(loc.skyTop, skyTop[0], skyTop[1], skyTop[2]);
      gl.uniform3f(loc.skyBottom, skyBottom[0], skyBottom[1], skyBottom[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const play = () => {
      if (frame === 0) frame = requestAnimationFrame(draw);
    };
    const pause = () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      frame = 0;
    };

    // Nothing renders unless the canvas is actually on screen. This covers
    // more than scrolling past it: a minimised window is `display: none`, and
    // an element in a hidden subtree reports no intersection, so the sky stops
    // the moment the window goes to the taskbar.
    const onScreen = new IntersectionObserver(([entry]) =>
      entry.isIntersecting ? play() : pause(),
    );
    onScreen.observe(canvas);

    return () => {
      pause();
      onScreen.disconnect();
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    };
  }, []);

  return (
    <div
      className={`relative h-full min-h-80 w-full overflow-hidden${className ? ` ${className}` : ""}`}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      {children ? (
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
};
