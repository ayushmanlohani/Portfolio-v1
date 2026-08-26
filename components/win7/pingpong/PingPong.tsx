"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

/**
 * PING PONG (Deparkanoid) — ported from departuremono.com (#deparkanoid canvas).
 *
 *   Xs=22 ball size   Vh=10 launch speed   ns=99 paddle w   ln=22 paddle h
 *   vl=16 key step    Ee=80 brick w        Te=22 brick h    Oo=3  bevel
 *   Hh=50 score/brick canvas 880x600
 */

const GAME_W = 880;
const GAME_H = 600;
const BALL_SIZE = 22;
const PADDLE_H = 22;
const PADDLE_STEP = 16;
const BRICK_W = 80;
const BRICK_H = 22;
const BEVEL = 3;
const SCORE_PER_BRICK = 50;

const BRICK_MAP = [
  "..d.....d..",
  "..d.....d..",
  "...d...d...",
  "...d...d...",
  "..sssssss..",
  "..sssssss..",
  ".ssdsssdss.",
  ".ssdsssdss.",
  "sssssssssss",
  "sssssssssss",
  "sssssssssss",
  "sssssssssss",
  "sss.....sss",
  "s.s.....s.s",
  "...ss.ss...",
  "...ss.ss...",
];

const BALL_PX = [
  "..AAA..",
  ".AWWAA.",
  "AWAAAAA",
  "AAAAAAA",
  "AAAAAAA",
  ".AAAAA.",
  "..AAA..",
];

const PADDLE_RLE = [
  "3|6.9A3c63s3c9A6.",
  "3|3.3A9W3c63l3c9W3A3.",
  "3|3A3W9A3c63s3c9A3W3A",
  "7|15A3c63s3c15A",
  "3|3.12A3c63s3c12A3.",
  "3|6.9P3c63d3c9P6.",
];

function expandPaddle(): string[] {
  const rows: string[] = [];
  for (const entry of PADDLE_RLE) {
    const split = entry.indexOf("|");
    const times = parseInt(entry.slice(0, split), 10);
    const enc = entry.slice(split + 1);
    let line = "";
    const re = /(\d+)(\D)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(enc)) !== null) line += m[2].repeat(parseInt(m[1], 10));
    for (let i = 0; i < times; i++) rows.push(line);
  }
  return rows;
}
const PADDLE_PX = expandPaddle();

const EMBEDDED_FAMILY = "Departure Mono Subset";
const EMBEDDED_FONT_B64 =
  "d09GMk9UVE8AAATgAAsAAAAAC0wAAASYAAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAADY4OGyAcKgZgAFwBNgIkA1gEBgWDHAcgG4cKUVRNohBfHNjgDj0qKzWKGdvBNGJwXv34ZAfh+x68ScExtv1HxLVDKZ40NIhEl1Isutyitc0LkqASNxS0Ummm2ebfdw+xRo6UBPHfrn1/kgCzKEowizSBYzitlmi7/3M9dg9Nd8aAGIEuQgyoaW0AmdtpTKkEJ6yihcpEKaDRKRvZU5CDHOQi3++vqf3tiN3mispMLZOquffvmn+FKwGoMbo5IjfX+GYKQU7OGBKGrJn1W9RtapBavPBBZVIFho7/vzDgceXU1Nq/YEQlXjjt0w2f7vz0EJ/OatKcBeZy2Vx5Oj+hEz0xAT58xWjih4/nz7XhI8lqyX3Utqq2gQyNgzOjo2MiE5ZhFKmqyXZ9Q59YzIJ6kNbkoDETrIz18k+BCL4DNh1WYAFuYA2WEFYgQYrU5GvJqiM80ZSeTOEgx7jILV4LYoly8fVw7mHu5dyX+dX5zfmD+af5r/O/v8SyX27Lh6LfedgeToe74XF4M3wefrZGrXsUwlBDmKzMDrIGIB2n4WUbf73+50kaIWhSsNpiKCpED2Zt1KHNWfUKsulYkMSt1qNWR0GqXBIUlZ8oTnKchdyU0WNS/LQsQRGooWbAoLVhG4w82trmZ/SAYmhJhxxbshOonJDoNfbWn9eB6q2ZAEQVk86yXElEYayR4eJMu+LRSOQSM92xEwugotRY2VB8tHY8koWA6MAmxBlkJ0eG9WgUikbMCpL9iSTWtZgo76EkmJsbzu4Au6PAMRAco9FkXIpejHKF3h2A9FGXMTA568/Jhg7iwFZYvaBrFiFQbEbAsDqYAkwQa3QMN6aGZcTRhsgSyxSPhibYxPQCjn6sZ2JBF310pBTcbbs0UBx4wggJ6RUsZQ3WKTalSRhFXwUCGLVVqFhjyANHg5UxWVmSEIYHPTAatQGkxg0ZaSNvtINHDwh09uzhlEBNXze2Xjig0cpjCIGGjJjhjGCV0HSpckBxRrrGKnQfsDVp6TitkVxrnOoq3/KADl3KGr492I6VzQF7HAvl0J6Oa5bc4VqNQRu5tDW2Kgbw54bbwZ0pnYyiG3WoejRXMQv2jm6K3fsRcoMaRu/dAlazMriacEUa5sKEOMoJmUclh37rwcuyLBxzupJsveDaxqf/KyYXK0snK8s6FfYgwJQ7TzyFkw3qFABa46GziAMFE8drvJ67opWRh9NVOjkLA8YZZimAYFCwD09zKQEm+r50p4a7n+EHb60VqEdBLMxl6+HmrN+bhAVAsT2J11WKAeaMCYq3KClStbIW9RYuOgLlVNGXgL7V93pXJObJDxIqUEjCV/FDxn9h3dVMfzOWIhAAbmZr46Bfj6bzdBkRgmCmZZ0eAFbxPITRvMFfiN2tc/pnEjvHUQ1h7FRvFWAzAZANQSm5y5YKltqlUrZMqoRbkRrI9X+AodA4I49xPq5SscSdaPnRxml3vH48b8WoQOpAtEocqNgIOQdXdw9XJCoYZVYo9lBk+V19kRJEi5amwdjezBAFM83SbsdPbDaZrTsE7DdplplCnhRli344SSdLRHHwRmKCXcHiSHy7WCGs6QOPQJ/CU38E";

let embeddedFontPromise: Promise<void> | null = null;
function ensureEmbeddedFont(): Promise<void> {
  if (embeddedFontPromise) return embeddedFontPromise;
  if (typeof document === "undefined" || !(document as any).fonts) {
    embeddedFontPromise = Promise.resolve();
    return embeddedFontPromise;
  }
  embeddedFontPromise = (async () => {
    try {
      const face = new (window as any).FontFace(
        EMBEDDED_FAMILY,
        `url(data:font/woff2;base64,${EMBEDDED_FONT_B64}) format("woff2")`
      );
      const loaded = await face.load();
      (document as any).fonts.add(loaded);
    } catch {
      /* fall back to the monospace stack */
    }
  })();
  return embeddedFontPromise;
}

const clamp = (lo: number, hi: number, v: number) => Math.min(Math.max(v, lo), hi);

type Palette = {
  carbon: string;
  smoke: string;
  dark: string;
  amber: string;
  pumpkin: string;
  cement: string;
};

function spriteCanvas(rows: string[], pal: Palette): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const h = rows.length;
  const w = rows[0].length;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) return null;
  const map: Record<string, string | null> = {
    A: pal.amber,
    W: "#ffffff",
    P: pal.pumpkin,
    s: pal.smoke,
    l: "#a4a4a4",
    d: "#333333",
    c: pal.carbon,
    ".": null,
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = map[rows[y][x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

type Brick = { x: number; y: number; w: number; h: number; c: string };

type Game = {
  bricks: Brick[];
  paddle: { x: number; y: number; width: number; height: number };
  ball: { x: number; y: number; radius: number; xSpeed: number; ySpeed: number };
  score: number;
  running: boolean;
  left: boolean;
  right: boolean;
};

export interface PingPongProps {
  carbon?: string;
  smoke?: string;
  dark?: string;
  amber?: string;
  pumpkin?: string;
  cement?: string;
  launchSpeed?: number;
  paddleWidth?: number;
  autoPlay?: boolean;
  startImmediately?: boolean;
  fontFamily?: string;
  fontUrl?: string;
  style?: React.CSSProperties;
}

export function PingPong(props: PingPongProps) {
  const {
    carbon = "#222222",
    smoke = "#666666",
    dark = "#444444",
    amber = "#ffa133",
    pumpkin = "#e47b1a",
    cement = "#c0c0c0",
    launchSpeed = 7,
    paddleWidth = 300,
    autoPlay = false,
    startImmediately = false,
    fontFamily = '"Departure Mono", "Departure Mono Subset", ui-monospace, SFMono-Regular, Menlo, monospace',
    fontUrl = "",
    style,
  } = props;

  const pal: Palette = { carbon, smoke, dark, amber, pumpkin, cement };

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const layoutRef = useRef({ cw: GAME_W, ch: GAME_H, ox: 0, oy: 0, s: 1 });
  const spritesRef = useRef<{ ball: HTMLCanvasElement | null; paddle: HTMLCanvasElement | null }>({
    ball: null,
    paddle: null,
  });
  const palRef = useRef(pal);
  palRef.current = pal;
  const optsRef = useRef({ launchSpeed, paddleWidth, autoPlay, fontFamily });
  optsRef.current = { launchSpeed, paddleWidth, autoPlay, fontFamily };

  const resetBricks = useCallback((g: Game) => {
    g.score = 0;
    const out: Brick[] = [];
    for (let r = 0; r < BRICK_MAP.length; r++) {
      for (let c = 0; c < BRICK_MAP[r].length; c++) {
        const ch = BRICK_MAP[r][c];
        if (ch === ".") continue;
        out.push({
          x: c * BRICK_W,
          y: r * BRICK_H,
          w: BRICK_W,
          h: BRICK_H,
          c: ch === "d" ? palRef.current.dark : palRef.current.smoke,
        });
      }
    }
    g.bricks = out;
  }, []);

  const resetBall = useCallback((g: Game) => {
    g.ball.x = GAME_W / 2;
    g.ball.y = (GAME_H * 5) / 9;
    let vx = Math.random() * 2 - 1;
    let vy = Math.random();
    const len = Math.hypot(vx, vy);
    if (len !== 0) {
      vx /= len;
      vy /= len;
    }
    g.ball.xSpeed = vx * optsRef.current.launchSpeed;
    g.ball.ySpeed = vy * optsRef.current.launchSpeed;
  }, []);

  const ensureGame = useCallback((): Game => {
    if (!gameRef.current) {
      const pw = optsRef.current.paddleWidth;
      const g: Game = {
        bricks: [],
        paddle: {
          x: GAME_W / 2 - pw / 2,
          y: GAME_H - PADDLE_H,
          width: pw,
          height: PADDLE_H,
        },
        ball: { x: GAME_W / 2, y: GAME_H / 2, radius: BALL_SIZE / 2, xSpeed: 5, ySpeed: 5 },
        score: 0,
        running: false,
        left: false,
        right: false,
      };
      resetBricks(g);
      gameRef.current = g;
    }
    return gameRef.current;
  }, [resetBricks]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const g = ensureGame();
    const p = palRef.current;
    const { cw, ch, ox, oy, s } = layoutRef.current;
    const dpr = canvas.width / Math.max(1, cw);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = p.carbon;
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.rect(0, 0, GAME_W, GAME_H);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;

    const ff = optsRef.current.fontFamily;

    if (g.bricks.length === 0) {
      ctx.fillStyle = p.amber;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `88px ${ff}`;
      ctx.fillText("YOU WIN", GAME_W / 2, 244);
      if (performance.now() % 1000 < 500) {
        ctx.fillStyle = p.pumpkin;
        ctx.font = `33px ${ff}`;
        ctx.fillText("RIGHT CLICK TO INSERT COIN", GAME_W / 2 + 8, 328);
      }
      ctx.restore();
      return;
    }

    const paddleSprite = spritesRef.current.paddle;
    if (paddleSprite) {
      ctx.drawImage(paddleSprite, g.paddle.x, g.paddle.y, g.paddle.width, PADDLE_H);
    }

    const margin = PADDLE_H / 2;
    const maxX = GAME_W - g.paddle.width - margin;
    if (optsRef.current.autoPlay) {
      g.paddle.x = clamp(margin, maxX, g.ball.x - g.paddle.width / 2);
    } else {
      if (g.left && g.paddle.x > margin) g.paddle.x -= PADDLE_STEP;
      else if (g.right && g.paddle.x < maxX) g.paddle.x += PADDLE_STEP;
      g.paddle.x = clamp(margin, maxX, g.paddle.x);
    }

    const ballSprite = spritesRef.current.ball;
    if (ballSprite) {
      ctx.drawImage(
        ballSprite,
        g.ball.x - BALL_SIZE / 2,
        g.ball.y - BALL_SIZE / 2,
        BALL_SIZE,
        BALL_SIZE
      );
    }

    if (g.running) {
      const b = g.ball;
      b.x += b.xSpeed;
      b.y += b.ySpeed;

      if (b.x < b.radius || b.x > GAME_W - b.radius) {
        b.x = clamp(b.radius, GAME_W - b.radius, b.x);
        b.xSpeed *= -1;
      }
      if (b.y < b.radius) {
        b.y = clamp(b.radius, GAME_H - b.radius, b.y);
        b.ySpeed *= -1;
      }
      if (b.y > GAME_H) {
        g.running = false;
        resetBall(g);
      }

      const pad = g.paddle;
      if (b.y + b.radius > pad.y && b.x > pad.x && b.x < pad.x + pad.width) {
        b.ySpeed *= -1;
        b.y = pad.y - b.radius;
      }
    }

    for (const br of g.bricks) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = p.carbon;
      ctx.fillStyle = br.c;
      ctx.beginPath();
      ctx.rect(br.x, br.y, br.w, br.h);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255," + 80 / 255 + ")";
      ctx.fillRect(br.x + 2, br.y + 2, br.w - 4, BEVEL);
      ctx.fillRect(br.x + 2, br.y + 2 + BEVEL, BEVEL, br.h - 4 - BEVEL);
      ctx.fillStyle = "rgb(51,51,51)";
      ctx.fillRect(br.x + 2, br.y + br.h - 5, br.w - 4, BEVEL);
      ctx.fillRect(br.x + br.w - 5, br.y + 2, BEVEL, br.h - 4 - BEVEL);
    }

    {
      const b = g.ball;
      let hit = false;
      for (let k = g.bricks.length - 1; k >= 0; k--) {
        const br = g.bricks[k];
        if (
          b.x + b.radius > br.x &&
          b.x - b.radius < br.x + br.w &&
          b.y - b.radius < br.y + br.h &&
          b.y + b.radius > br.y
        ) {
          hit = true;
          g.score += SCORE_PER_BRICK;
          g.bricks.splice(k, 1);
        }
      }
      if (hit) b.ySpeed *= -1;
    }

    ctx.fillStyle = p.cement;
    ctx.font = `16px ${ff}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("SCORE", 0, 0);
    ctx.fillText(String(g.score).padStart(5, "0"), 0, 20);

    ctx.restore();
  }, [ensureGame, resetBall]);

  const relayout = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    let cw = wrap.clientWidth;
    let ch = wrap.clientHeight;
    if (!cw || cw < 1) cw = GAME_W;
    if (!ch || ch < 1) ch = Math.round(cw * (GAME_H / GAME_W));
    const dpr = Math.min(3, Math.max(1, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1));
    const bw = Math.round(cw * dpr);
    const bh = Math.round(ch * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    const s = Math.min(cw / GAME_W, ch / GAME_H);
    layoutRef.current = {
      cw,
      ch,
      s,
      ox: (cw - GAME_W * s) / 2,
      oy: (ch - GAME_H * s) / 2,
    };
  }, []);

  useLayoutEffect(() => {
    spritesRef.current = {
      ball: spriteCanvas(BALL_PX, pal),
      paddle: spriteCanvas(PADDLE_PX, pal),
    };
    const g = gameRef.current;
    if (g) {
      for (const br of g.bricks) {
        br.c = br.c === pal.dark || br.c === dark ? pal.dark : br.c;
      }
    }
    relayout();
    draw();
  }, [carbon, smoke, dark, amber, pumpkin, cement, relayout, draw]);

  useLayoutEffect(() => {
    const g = gameRef.current;
    if (!g) return;
    g.paddle.width = paddleWidth;
    g.paddle.x = clamp(PADDLE_H / 2, GAME_W - paddleWidth - PADDLE_H / 2, g.paddle.x);
  }, [paddleWidth]);

  useEffect(() => {
    if (!startImmediately) return;
    const g = ensureGame();
    g.running = true;
    resetBall(g);
  }, [startImmediately, ensureGame, resetBall]);

  useEffect(() => {
    let cancelled = false;
    ensureEmbeddedFont().then(() => {
      if (!cancelled) draw();
    });
    if (fontUrl && typeof document !== "undefined" && (document as any).fonts) {
      try {
        const face = new (window as any).FontFace("Departure Mono", `url(${fontUrl})`);
        face.load()
          .then((loaded: any) => {
            if (cancelled) return;
            (document as any).fonts.add(loaded);
            draw();
          })
          .catch(() => undefined);
      } catch {
        /* no FontFace support */
      }
    }
    return () => {
      cancelled = true;
    };
  }, [fontUrl, draw]);

  useLayoutEffect(() => {
    ensureGame();
    relayout();
    draw();

    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const wrap = wrapRef.current;
    let ro: ResizeObserver | null = null;
    if (wrap && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        relayout();
        draw();
      });
      ro.observe(wrap);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [ensureGame, relayout, draw]);

  const pointerToBoardX = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const r = canvas.getBoundingClientRect();
    if (!r.width) return 0;
    const ratio = (clientX - r.left) / r.width;
    const { cw, ox, s } = layoutRef.current;
    return (ratio * cw - ox) / (s || 1);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const g = ensureGame();
      const bx = pointerToBoardX(e.clientX);
      const margin = PADDLE_H / 2;
      g.paddle.x = clamp(margin, GAME_W - g.paddle.width - margin, bx - g.paddle.width / 2);
    },
    [ensureGame, pointerToBoardX]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 2) return;
      wrapRef.current?.focus();
      const g = ensureGame();
      g.running = true;
      if (e.pointerType !== "touch") resetBall(g);
    },
    [ensureGame, resetBall]
  );

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const g = ensureGame();
      g.running = false;
      resetBall(g);
      resetBricks(g);
    },
    [ensureGame, resetBall, resetBricks]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const g = ensureGame();
      if (e.key === "ArrowLeft") {
        g.left = true;
        e.preventDefault();
      }
      if (e.key === "ArrowRight") {
        g.right = true;
        e.preventDefault();
      }
      if (e.key === " ") {
        g.running = true;
        resetBall(g);
        e.preventDefault();
      }
    },
    [ensureGame, resetBall]
  );

  const onKeyUp = useCallback(
    (e: React.KeyboardEvent) => {
      const g = ensureGame();
      if (e.key === "ArrowLeft") g.left = false;
      if (e.key === "ArrowRight") g.right = false;
    },
    [ensureGame]
  );

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 1,
        minHeight: 1,
        background: carbon,
        overflow: "hidden",
        outline: "none",
        touchAction: "none",
        cursor: "default",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}

export default PingPong;
