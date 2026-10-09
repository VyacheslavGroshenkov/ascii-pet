/*
 * catgirl: a chibi cat girl. She blinks, twitches an ear, sways her tail,
 * now and then waves a paw with a happy "nya~", and hearts drift up.
 *
 * The head, ears, hair, dress and tail are distance fields, filled from a
 * ramp and lit from the upper left so they keep their mass in a thumbnail;
 * the eyes are block characters, the one place that needs solid ink.
 * Written to the ascii.rest piece contract; scripts/fetch-pieces.sh copies it
 * into the ascii.rest tree before bundling, so "../types.ts" resolves there.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "catgirl",
  category: "creatures",
  note: "a chibi cat girl blinking, swaying her tail and waving a paw",
  cols: 41,
  rows: 24,
  fps: 15,
} satisfies Meta;

// Lengths are in column widths, y up from the bottom; a row is two of them tall.
const CX = 20.5; // her middle: the centre of column 20
const HAIR = "-=+*#%@";
const HAIR_BACK = ":-=+*"; // the hair behind her, a step dimmer
const DRESS = ".:-=+*";
const LOOP = 12; // seconds
const BLINKS: [number, number][] = [[1.2, 1.4], [4.5, 4.65], [4.8, 4.95], [9.6, 9.8]];
const WAVE: [number, number] = [5.8, 8.4];
const TWITCH: [number, number, number][] = [[3.0, 3.35, 1], [10.6, 10.95, -1]]; // start, end, which ear
const HEARTS = [6.4, 7.1, 7.8, 11.2]; // when each sets off
const LIGHT = (() => {
  const [x, y, z] = [-0.55, 0.65, 0.75];
  const m = Math.hypot(x, y, z);
  return [x / m, y / m, z / m];
})();

// Eyes, five columns by three rows: a heavy upper lash, a highlight, and an
// iris that brightens toward the bottom, as anime eyes do. [open, shut, happy]
// Six columns with a lash flicked out at the outer corner. Both highlights sit
// toward the light, so only the lash moves to the other side on the right eye.
const EYES = {
  open: [["▄▄███▄", " █● ░█", " ▀▓▓▓▀"], ["▄███▄▄", "█● ░█ ", "▀▓▓▓▀ "]],
  shut: [["      ", "▄▄▄▄▄▄", "      "], ["      ", "▄▄▄▄▄▄", "      "]],
  happy: [["  ▄▄▄ ", " ▀   ▀", "      "], [" ▄▄▄  ", "▀   ▀ ", "      "]],
};

type Sdf = (x: number, y: number) => number;

const capsule = (ax: number, ay: number, bx: number, by: number, r: number): Sdf => {
  const dx = bx - ax, dy = by - ay, dd = dx * dx + dy * dy || 1e-9;
  return (x, y) => {
    const px = x - ax, py = y - ay;
    const h = Math.max(0, Math.min(1, (px * dx + py * dy) / dd));
    return Math.hypot(px - dx * h, py - dy * h) - r;
  };
};

// Roughly the distance to an ellipse: exact on the axes, close enough between them.
const ellipse = (cx: number, cy: number, rx: number, ry: number): Sdf => (x, y) =>
  (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);

// Signed distance to a polygon given as flat [x0, y0, x1, y1, ...].
const polygon = (pts: number[]): Sdf => (x, y) => {
  let d = Infinity, s = 1;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const ax = pts[j], ay = pts[j + 1], bx = pts[i], by = pts[i + 1];
    const ex = bx - ax, ey = by - ay, wx = x - ax, wy = y - ay;
    const h = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
    d = Math.min(d, Math.hypot(wx - ex * h, wy - ey * h));
    const c1 = y >= ay, c2 = y < by, c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * d;
};

const within = (u: number, spans: [number, number][]) => spans.some(([a, b]) => u >= a && u < b);
const smooth = (p: number) => p * p * (3 - 2 * p);

// An ear: a triangle from two base points to an apex tipped by `tilt` radians,
// with a pink inside: the same triangle drawn in toward its middle.
const ear = (bx: number, by: number, cx: number, cy: number, ax: number, ay: number, tilt: number) => {
  const mx = (bx + cx) / 2, my = (by + cy) / 2;
  const cos = Math.cos(tilt), sin = Math.sin(tilt);
  const tx = mx + (ax - mx) * cos - (ay - my) * sin, ty = my + (ax - mx) * sin + (ay - my) * cos;
  const k = 0.5, gx = (bx + cx + tx) / 3, gy = (by + cy + ty) / 3 - 0.8;
  return {
    outer: polygon([bx, by, tx, ty, cx, cy]),
    inner: polygon([gx + (bx - gx) * k, gy + (by - gy) * k, gx + (tx - gx) * k, gy + (ty - gy) * k, gx + (cx - gx) * k, gy + (cy - gy) * k]),
  };
};

export default function catgirl(): Frame {
  const { cols, rows } = meta;
  const out: string[] = new Array(cols * rows);
  const face = new Uint8Array(cols * rows);

  // Still parts.
  const head = ellipse(CX, 28.6, 12.6, 11.6);
  // The face: round cheeks narrowing to a small chin.
  const faceRound = ellipse(CX, 25.4, 9.9, 9.2);
  const faceOval: Sdf = (x, y) => faceRound(CX + (x - CX) / (0.72 + 0.28 * Math.max(0, Math.min(1, (y - 16.2) / 8))), y);
  // Bangs: the face stops under a row of points along the brow.
  const bangs = (x: number) => 31.8 - 2.8 * Math.abs(((((x - CX) / 3 + 1) % 2) + 2) % 2 - 1);
  const locks = [capsule(CX - 11.8, 29, CX - 11.6, 15.4, 1.9), capsule(CX + 11.8, 29, CX + 11.6, 15.4, 1.9)];
  const dress = polygon([CX - 2.8, 15.4, CX + 2.8, 15.4, CX + 5.8, 4, CX - 5.8, 4]);
  const legs = [capsule(CX - 2.2, 4.2, CX - 2.4, 1.6, 0.7), capsule(CX + 2.2, 4.2, CX + 2.4, 1.6, 0.7)];
  const feet = [ellipse(CX - 2.8, 1.2, 1.6, 1), ellipse(CX + 2.8, 1.2, 1.6, 1)];
  const leftArm = capsule(CX - 3.2, 14, CX - 7, 9.4, 0.8);
  const leftPaw = ellipse(CX - 7.4, 8.8, 1.4, 1.3);

  // Long hair falls behind her shoulders to the waist, a tapering lock each side.
  const backLocks = [capsule(CX - 11.6, 20, CX - 10.8, 12.4, 2.3), capsule(CX + 11.6, 20, CX + 10.8, 12.4, 2.3)];
  const hairBack: Sdf = (x, y) => Math.min(backLocks[0](x, y), backLocks[1](x, y)) + Math.max(0, 15 - y) * 0.15;
  const hair = (x: number, y: number) => Math.min(head(x, y), locks[0](x, y), locks[1](x, y));
  const inFace = (x: number, y: number) => faceOval(x, y) < 0 && y < bangs(x);

  // Shade a filled part: 0 at its edge, 1 along its middle, lit from the upper left.
  const shade = (f: Sdf, x: number, y: number, width: number) => {
    const h = (px: number, py: number) => {
      const q = Math.max(0, Math.min(1, -f(px, py) / width));
      return Math.sqrt(1 - (1 - q) * (1 - q));
    };
    const e = 0.4;
    const hx = (h(x + e, y) - h(x - e, y)) / (2 * e), hy = (h(x, y + e) - h(x, y - e)) / (2 * e);
    const m = Math.hypot(hx, hy, 1);
    return Math.max(0, (-hx * LIGHT[0] - hy * LIGHT[1] + LIGHT[2]) / m);
  };
  const ramp = (s: string, v: number, paper: boolean) => {
    const i = Math.round(Math.max(0, Math.min(1, v)) * (s.length - 1));
    return s[paper ? s.length - 1 - i : i];
  };
  // A limb is drawn as strokes along it, so it reads as an arm and not as more dress.
  const stroke = (ax: number, ay: number, bx: number, by: number) => {
    const a = ((Math.atan2(by - ay, bx - ax) * 180) / Math.PI + 180) % 180;
    return a < 22.5 || a >= 157.5 ? "-" : a < 67.5 ? "/" : a < 112.5 ? "|" : "\\";
  };
  // An outline cell: the stroke that runs along the edge of f at (x, y).
  const edge = (f: Sdf, x: number, y: number) => {
    const gx = f(x + 0.3, y) - f(x - 0.3, y), gy = f(x, y + 0.3) - f(x, y - 0.3);
    const a = ((Math.atan2(gy, gx) * 180) / Math.PI + 180) % 180; // the normal, folded to 0..180
    if (a < 25 || a >= 155) return "|";
    if (a < 65) return "/";
    if (a < 115) return "_";
    return "\\";
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) face[r * cols + c] = inFace(c + 0.5, (rows - r - 0.5) * 2) ? 1 : 0;
  }
  const isFace = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols && face[r * cols + c] === 1;

  // Only the tail, the ears and the waving arm move, so everything else is worked out once
  // for each ink, in three layers that the moving parts slot between. "" is a gap.
  const still = (paper: boolean) => {
    const back: string[] = new Array(cols * rows).fill(""); // the long hair, behind the tail
    const body: string[] = new Array(cols * rows).fill(""); // legs, dress, left arm, behind the ears
    const front: string[] = new Array(cols * rows).fill(""); // hair and face, behind the right arm
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c + 0.5, y = (rows - r - 0.5) * 2;
        const k = r * cols + c;
        if (hairBack(x, y) < 0) back[k] = ramp(HAIR_BACK, 0.2 + 0.8 * shade(hairBack, x, y, 2.3), paper);
        for (const leg of legs) if (leg(x, y) < 0) body[k] = "|";
        for (const foot of feet) if (foot(x, y) < 0) body[k] = paper ? "▀" : "▄";
        if (dress(x, y) < 0) body[k] = ramp(DRESS, 0.15 + 0.85 * shade(dress, x, y, 2.6), paper);
        if (leftArm(x, y) < 0) body[k] = "/";
        if (leftPaw(x, y) < 0) body[k] = "@";
        if (face[k]) front[k] = " ";
        else if (hair(x, y) < 0) {
          // The fringe's edge zigzags, the sides follow the cheeks; elsewhere the hair is a lit mass
          // with a faint run of strands.
          if (isFace(r + 1, c)) front[k] = edge((qx, qy) => qy - bangs(qx), x, y);
          else if (isFace(r, c - 1) || isFace(r, c + 1)) front[k] = edge(faceOval, x, y);
          else front[k] = ramp(HAIR, (0.12 + 0.88 * shade(hair, x, y, 2.8)) * (0.88 + 0.12 * Math.sin(x * 1.9 + y * 0.35)), paper);
        } else if (isFace(r - 1, c) || isFace(r, c - 1) || isFace(r, c + 1)) {
          front[k] = edge(faceOval, x, y); // cheeks and chin
        }
      }
    }
    return { back, body, front };
  };
  const layers = { ink: still(false), paper: still(true) };

  return (t, { paper = false } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const waving = u >= WAVE[0] && u < WAVE[1];
    const blink = within(u, BLINKS);

    // Ears: one flicks back now and then.
    const tw = TWITCH.find(([a, b]) => u >= a && u < b);
    const flick = tw ? Math.sin((Math.PI * (u - tw[0])) / (tw[1] - tw[0])) * 0.4 : 0;
    const ears = [
      ear(CX - 11.8, 33.6, CX - 4.2, 39.8, CX - 13.4, 47.4, tw && tw[2] < 0 ? flick : 0),
      ear(CX + 4.2, 39.8, CX + 11.8, 33.6, CX + 13.4, 47.4, tw && tw[2] > 0 ? -flick : 0),
    ];

    // The right arm: down by her side, or up and waving from the shoulder.
    const lift = waving ? smooth(Math.min(1, (u - WAVE[0]) / 0.35, (WAVE[1] - u) / 0.35)) : 0;
    const swing = waving ? Math.sin((u - WAVE[0]) * 2 * Math.PI * 2.2) * 0.35 * lift : 0;
    const angle = -0.9 + lift * 1.75 + swing; // radians from pointing right: down-right at rest, up-right waving
    const hx = CX + 3.2 + Math.cos(angle) * 6.2, hy = 14 + Math.sin(angle) * 6.2;
    const rightArm = capsule(CX + 3.2, 14, hx, hy, 0.8);
    const rightPaw = ellipse(hx, hy, 1.4, 1.3);
    const rightStroke = stroke(CX + 3.2, 14, hx, hy);

    // The tail sways behind her and curls at the tip.
    const sway = Math.sin(t * 1.7) * 0.5;
    const tail: Sdf[] = [];
    let px = CX - 4.6, py = 6.2, dir = Math.PI * 0.97;
    let x0 = px, x1 = px, y0 = py, y1 = py; // the tail's bounds, to skip cells it can't reach
    for (let k = 0; k < 6; k++) {
      dir += -0.3 + sway * 0.3 + (k > 3 ? -0.55 : 0);
      const nx = px + Math.cos(dir) * 2.3, ny = py + Math.sin(dir) * 2.3;
      tail.push(capsule(px, py, nx, ny, 1.15 - k * 0.07));
      px = nx;
      py = ny;
      x0 = Math.min(x0, px), x1 = Math.max(x1, px), y0 = Math.min(y0, py), y1 = Math.max(y1, py);
    }
    const tailF: Sdf = (x, y) => {
      let d = Infinity;
      for (let i = 0; i < tail.length; i++) d = Math.min(d, tail[i](x, y));
      return d;
    };
    const nearTail = (x: number, y: number) => x > x0 - 1.4 && x < x1 + 1.4 && y > y0 - 1.4 && y < y1 + 1.4;
    const nearArm = (x: number, y: number) =>
      x > Math.min(CX + 3.2, hx) - 1.6 && x < Math.max(CX + 3.2, hx) + 1.6 && y > Math.min(14, hy) - 1.6 && y < Math.max(14, hy) + 1.6;

    const { back, body, front } = paper ? layers.paper : layers.ink;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c + 0.5, y = (rows - r - 0.5) * 2;
        const k = r * cols + c;

        // Back to front: long hair, tail, legs/dress/left arm, ears, hair/face, right arm.
        let ch = back[k] || " ";
        if (nearTail(x, y) && tailF(x, y) < 0) ch = ramp(HAIR, 0.2 + 0.8 * shade(tailF, x, y, 1.15), paper);
        if (body[k]) ch = body[k];
        if (y > 32) {
          for (const e of ears) {
            if (e.outer(x, y) < 0) ch = e.inner(x, y) < 0 ? (paper ? "=" : ":") : ramp(HAIR, 0.3 + 0.7 * shade(e.outer, x, y, 1.6), paper);
          }
        }
        if (front[k]) ch = front[k];
        if (nearArm(x, y)) {
          if (rightArm(x, y) < 0) ch = rightStroke;
          if (rightPaw(x, y) < 0) ch = "@";
        }
        out[k] = ch;
      }
    }

    // Features go on top as text, at [column, row from the top].
    const put = (c: number, r: number, s: string) => {
      [...s].forEach((chr, i) => {
        if (r >= 0 && r < rows && c + i >= 0 && c + i < cols) out[r * cols + c + i] = chr;
      });
    };
    const [left, right] = waving ? EYES.happy : blink ? EYES.shut : EYES.open;
    left.forEach((line, i) => put(12, 10 + i, line));
    right.forEach((line, i) => put(23, 10 + i, line));
    put(13, 13, "░░");
    put(26, 13, "░░");
    put(20, 13, "ω");
    put(19, 17, ">o<"); // a bow with a bell
    // An ahoge: the one strand that always sticks up.
    put(21, 1, "_");
    put(20, 2, "(");
    put(21, 3, ")");
    if (waving) put(cols - 5, 8, "nya~");

    // Hearts drift up from beside her head, swaying as they go.
    for (const [n, s] of HEARTS.entries()) {
      const age = u - s;
      if (age < 0 || age > 2.4) continue;
      const hc = Math.round(35 + n * 1.2 + Math.sin(age * 3 + n) * 1.2);
      const hr = Math.round(14 - age * 6);
      if (hr >= 0) put(hc, hr, age < 1.8 ? "♥" : ".");
    }

    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
