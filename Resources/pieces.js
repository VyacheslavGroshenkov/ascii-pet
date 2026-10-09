/* AsciiPet pieces. ascii.rest animations by @bas3line, MIT License, commit 813ea2a. See THIRD_PARTY_NOTICES.md */
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // ascii/src/pieces/catgirl.ts
  var catgirl_exports = {};
  __export(catgirl_exports, {
    default: () => catgirl,
    meta: () => meta
  });
  var meta = {
    name: "catgirl",
    category: "creatures",
    note: "a chibi cat girl blinking, swaying her tail and waving a paw",
    cols: 41,
    rows: 24,
    fps: 15
  };
  var CX = 20.5;
  var HAIR = "-=+*#%@";
  var HAIR_BACK = ":-=+*";
  var DRESS = ".:-=+*";
  var LOOP = 12;
  var BLINKS = [[1.2, 1.4], [4.5, 4.65], [4.8, 4.95], [9.6, 9.8]];
  var WAVE = [5.8, 8.4];
  var TWITCH = [[3, 3.35, 1], [10.6, 10.95, -1]];
  var HEARTS = [6.4, 7.1, 7.8, 11.2];
  var LIGHT = (() => {
    const [x, y, z] = [-0.55, 0.65, 0.75];
    const m = Math.hypot(x, y, z);
    return [x / m, y / m, z / m];
  })();
  var EYES = {
    open: [["\u2584\u2584\u2588\u2588\u2588\u2584", " \u2588\u25CF \u2591\u2588", " \u2580\u2593\u2593\u2593\u2580"], ["\u2584\u2588\u2588\u2588\u2584\u2584", "\u2588\u25CF \u2591\u2588 ", "\u2580\u2593\u2593\u2593\u2580 "]],
    shut: [["      ", "\u2584\u2584\u2584\u2584\u2584\u2584", "      "], ["      ", "\u2584\u2584\u2584\u2584\u2584\u2584", "      "]],
    happy: [["  \u2584\u2584\u2584 ", " \u2580   \u2580", "      "], [" \u2584\u2584\u2584  ", "\u2580   \u2580 ", "      "]]
  };
  var capsule = (ax, ay, bx, by, r) => {
    const dx = bx - ax, dy = by - ay, dd = dx * dx + dy * dy || 1e-9;
    return (x, y) => {
      const px = x - ax, py = y - ay;
      const h = Math.max(0, Math.min(1, (px * dx + py * dy) / dd));
      return Math.hypot(px - dx * h, py - dy * h) - r;
    };
  };
  var ellipse = (cx, cy, rx, ry) => (x, y) => (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);
  var polygon = (pts) => (x, y) => {
    let d = Infinity, s = 1;
    for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
      const ax = pts[j], ay = pts[j + 1], bx = pts[i], by = pts[i + 1];
      const ex = bx - ax, ey = by - ay, wx = x - ax, wy = y - ay;
      const h = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
      d = Math.min(d, Math.hypot(wx - ex * h, wy - ey * h));
      const c1 = y >= ay, c2 = y < by, c3 = ex * wy > ey * wx;
      if (c1 && c2 && c3 || !c1 && !c2 && !c3) s = -s;
    }
    return s * d;
  };
  var within = (u, spans) => spans.some(([a, b]) => u >= a && u < b);
  var smooth = (p) => p * p * (3 - 2 * p);
  var ear = (bx, by, cx, cy, ax, ay, tilt) => {
    const mx = (bx + cx) / 2, my = (by + cy) / 2;
    const cos = Math.cos(tilt), sin = Math.sin(tilt);
    const tx = mx + (ax - mx) * cos - (ay - my) * sin, ty = my + (ax - mx) * sin + (ay - my) * cos;
    const k = 0.5, gx = (bx + cx + tx) / 3, gy = (by + cy + ty) / 3 - 0.8;
    return {
      outer: polygon([bx, by, tx, ty, cx, cy]),
      inner: polygon([gx + (bx - gx) * k, gy + (by - gy) * k, gx + (tx - gx) * k, gy + (ty - gy) * k, gx + (cx - gx) * k, gy + (cy - gy) * k])
    };
  };
  function catgirl() {
    const { cols, rows } = meta;
    const out = new Array(cols * rows);
    const face = new Uint8Array(cols * rows);
    const head = ellipse(CX, 28.6, 12.6, 11.6);
    const faceRound = ellipse(CX, 25.4, 9.9, 9.2);
    const faceOval = (x, y) => faceRound(CX + (x - CX) / (0.72 + 0.28 * Math.max(0, Math.min(1, (y - 16.2) / 8))), y);
    const bangs = (x) => 31.8 - 2.8 * Math.abs((((x - CX) / 3 + 1) % 2 + 2) % 2 - 1);
    const locks = [capsule(CX - 11.8, 29, CX - 11.6, 15.4, 1.9), capsule(CX + 11.8, 29, CX + 11.6, 15.4, 1.9)];
    const dress = polygon([CX - 2.8, 15.4, CX + 2.8, 15.4, CX + 5.8, 4, CX - 5.8, 4]);
    const legs = [capsule(CX - 2.2, 4.2, CX - 2.4, 1.6, 0.7), capsule(CX + 2.2, 4.2, CX + 2.4, 1.6, 0.7)];
    const feet = [ellipse(CX - 2.8, 1.2, 1.6, 1), ellipse(CX + 2.8, 1.2, 1.6, 1)];
    const leftArm = capsule(CX - 3.2, 14, CX - 7, 9.4, 0.8);
    const leftPaw = ellipse(CX - 7.4, 8.8, 1.4, 1.3);
    const backLocks = [capsule(CX - 11.6, 20, CX - 10.8, 12.4, 2.3), capsule(CX + 11.6, 20, CX + 10.8, 12.4, 2.3)];
    const hairBack = (x, y) => Math.min(backLocks[0](x, y), backLocks[1](x, y)) + Math.max(0, 15 - y) * 0.15;
    const hair = (x, y) => Math.min(head(x, y), locks[0](x, y), locks[1](x, y));
    const inFace = (x, y) => faceOval(x, y) < 0 && y < bangs(x);
    const shade = (f, x, y, width) => {
      const h = (px, py) => {
        const q = Math.max(0, Math.min(1, -f(px, py) / width));
        return Math.sqrt(1 - (1 - q) * (1 - q));
      };
      const e = 0.4;
      const hx = (h(x + e, y) - h(x - e, y)) / (2 * e), hy = (h(x, y + e) - h(x, y - e)) / (2 * e);
      const m = Math.hypot(hx, hy, 1);
      return Math.max(0, (-hx * LIGHT[0] - hy * LIGHT[1] + LIGHT[2]) / m);
    };
    const ramp = (s, v, paper) => {
      const i = Math.round(Math.max(0, Math.min(1, v)) * (s.length - 1));
      return s[paper ? s.length - 1 - i : i];
    };
    const stroke = (ax, ay, bx, by) => {
      const a = (Math.atan2(by - ay, bx - ax) * 180 / Math.PI + 180) % 180;
      return a < 22.5 || a >= 157.5 ? "-" : a < 67.5 ? "/" : a < 112.5 ? "|" : "\\";
    };
    const edge = (f, x, y) => {
      const gx = f(x + 0.3, y) - f(x - 0.3, y), gy = f(x, y + 0.3) - f(x, y - 0.3);
      const a = (Math.atan2(gy, gx) * 180 / Math.PI + 180) % 180;
      if (a < 25 || a >= 155) return "|";
      if (a < 65) return "/";
      if (a < 115) return "_";
      return "\\";
    };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) face[r * cols + c] = inFace(c + 0.5, (rows - r - 0.5) * 2) ? 1 : 0;
    }
    const isFace = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols && face[r * cols + c] === 1;
    const still = (paper) => {
      const back = new Array(cols * rows).fill("");
      const body = new Array(cols * rows).fill("");
      const front = new Array(cols * rows).fill("");
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c + 0.5, y = (rows - r - 0.5) * 2;
          const k = r * cols + c;
          if (hairBack(x, y) < 0) back[k] = ramp(HAIR_BACK, 0.2 + 0.8 * shade(hairBack, x, y, 2.3), paper);
          for (const leg of legs) if (leg(x, y) < 0) body[k] = "|";
          for (const foot of feet) if (foot(x, y) < 0) body[k] = paper ? "\u2580" : "\u2584";
          if (dress(x, y) < 0) body[k] = ramp(DRESS, 0.15 + 0.85 * shade(dress, x, y, 2.6), paper);
          if (leftArm(x, y) < 0) body[k] = "/";
          if (leftPaw(x, y) < 0) body[k] = "@";
          if (face[k]) front[k] = " ";
          else if (hair(x, y) < 0) {
            if (isFace(r + 1, c)) front[k] = edge((qx, qy) => qy - bangs(qx), x, y);
            else if (isFace(r, c - 1) || isFace(r, c + 1)) front[k] = edge(faceOval, x, y);
            else front[k] = ramp(HAIR, (0.12 + 0.88 * shade(hair, x, y, 2.8)) * (0.88 + 0.12 * Math.sin(x * 1.9 + y * 0.35)), paper);
          } else if (isFace(r - 1, c) || isFace(r, c - 1) || isFace(r, c + 1)) {
            front[k] = edge(faceOval, x, y);
          }
        }
      }
      return { back, body, front };
    };
    const layers = { ink: still(false), paper: still(true) };
    return (t, { paper = false } = {}) => {
      const u = (t % LOOP + LOOP) % LOOP;
      const waving = u >= WAVE[0] && u < WAVE[1];
      const blink = within(u, BLINKS);
      const tw = TWITCH.find(([a, b]) => u >= a && u < b);
      const flick = tw ? Math.sin(Math.PI * (u - tw[0]) / (tw[1] - tw[0])) * 0.4 : 0;
      const ears = [
        ear(CX - 11.8, 33.6, CX - 4.2, 39.8, CX - 13.4, 47.4, tw && tw[2] < 0 ? flick : 0),
        ear(CX + 4.2, 39.8, CX + 11.8, 33.6, CX + 13.4, 47.4, tw && tw[2] > 0 ? -flick : 0)
      ];
      const lift2 = waving ? smooth(Math.min(1, (u - WAVE[0]) / 0.35, (WAVE[1] - u) / 0.35)) : 0;
      const swing = waving ? Math.sin((u - WAVE[0]) * 2 * Math.PI * 2.2) * 0.35 * lift2 : 0;
      const angle = -0.9 + lift2 * 1.75 + swing;
      const hx = CX + 3.2 + Math.cos(angle) * 6.2, hy = 14 + Math.sin(angle) * 6.2;
      const rightArm = capsule(CX + 3.2, 14, hx, hy, 0.8);
      const rightPaw = ellipse(hx, hy, 1.4, 1.3);
      const rightStroke = stroke(CX + 3.2, 14, hx, hy);
      const sway = Math.sin(t * 1.7) * 0.5;
      const tail = [];
      let px = CX - 4.6, py = 6.2, dir = Math.PI * 0.97;
      let x0 = px, x1 = px, y0 = py, y1 = py;
      for (let k = 0; k < 6; k++) {
        dir += -0.3 + sway * 0.3 + (k > 3 ? -0.55 : 0);
        const nx = px + Math.cos(dir) * 2.3, ny = py + Math.sin(dir) * 2.3;
        tail.push(capsule(px, py, nx, ny, 1.15 - k * 0.07));
        px = nx;
        py = ny;
        x0 = Math.min(x0, px), x1 = Math.max(x1, px), y0 = Math.min(y0, py), y1 = Math.max(y1, py);
      }
      const tailF = (x, y) => {
        let d = Infinity;
        for (let i = 0; i < tail.length; i++) d = Math.min(d, tail[i](x, y));
        return d;
      };
      const nearTail = (x, y) => x > x0 - 1.4 && x < x1 + 1.4 && y > y0 - 1.4 && y < y1 + 1.4;
      const nearArm = (x, y) => x > Math.min(CX + 3.2, hx) - 1.6 && x < Math.max(CX + 3.2, hx) + 1.6 && y > Math.min(14, hy) - 1.6 && y < Math.max(14, hy) + 1.6;
      const { back, body, front } = paper ? layers.paper : layers.ink;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c + 0.5, y = (rows - r - 0.5) * 2;
          const k = r * cols + c;
          let ch = back[k] || " ";
          if (nearTail(x, y) && tailF(x, y) < 0) ch = ramp(HAIR, 0.2 + 0.8 * shade(tailF, x, y, 1.15), paper);
          if (body[k]) ch = body[k];
          if (y > 32) {
            for (const e of ears) {
              if (e.outer(x, y) < 0) ch = e.inner(x, y) < 0 ? paper ? "=" : ":" : ramp(HAIR, 0.3 + 0.7 * shade(e.outer, x, y, 1.6), paper);
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
      const put = (c, r, s) => {
        [...s].forEach((chr, i) => {
          if (r >= 0 && r < rows && c + i >= 0 && c + i < cols) out[r * cols + c + i] = chr;
        });
      };
      const [left, right] = waving ? EYES.happy : blink ? EYES.shut : EYES.open;
      left.forEach((line, i) => put(12, 10 + i, line));
      right.forEach((line, i) => put(23, 10 + i, line));
      put(13, 13, "\u2591\u2591");
      put(26, 13, "\u2591\u2591");
      put(20, 13, "\u03C9");
      put(19, 17, ">o<");
      put(21, 1, "_");
      put(20, 2, "(");
      put(21, 3, ")");
      if (waving) put(cols - 5, 8, "nya~");
      for (const [n, s] of HEARTS.entries()) {
        const age = u - s;
        if (age < 0 || age > 2.4) continue;
        const hc = Math.round(35 + n * 1.2 + Math.sin(age * 3 + n) * 1.2);
        const hr = Math.round(14 - age * 6);
        if (hr >= 0) put(hc, hr, age < 1.8 ? "\u2665" : ".");
      }
      const lines = [];
      for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
      return lines.join("\n");
    };
  }

  // ascii/src/pieces/donut.ts
  var donut_exports = {};
  __export(donut_exports, {
    default: () => donut,
    meta: () => meta2
  });
  var meta2 = {
    name: "donut",
    category: "shapes",
    note: "a lit torus turning on two axes, after donut.c",
    cols: 40,
    rows: 22,
    fps: 30
  };
  var RAMP = ".,-~:;=!*#$@";
  function donut() {
    const { cols, rows } = meta2;
    const R1 = 1;
    const R2 = 2;
    const K2 = 6;
    const ASPECT = 0.5;
    const K1 = (cols - 2) / 2 / ((R1 + R2) / Math.sqrt(K2 * K2 - (R1 + R2) ** 2));
    const m = Math.hypot(-0.4, 1, -1);
    const [lx, ly, lz] = [-0.4 / m, 1 / m, -1 / m];
    const out = new Array(cols * rows);
    const depth = new Float32Array(cols * rows);
    return (t, { paper = false } = {}) => {
      const A = 1 + t * 0.8;
      const B = 1 + t * 0.35;
      out.fill(" ");
      depth.fill(0);
      const cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B);
      for (let th = 0; th < 6.283; th += 0.07) {
        const ct = Math.cos(th), st = Math.sin(th);
        for (let ph = 0; ph < 6.283; ph += 0.03) {
          const cp = Math.cos(ph), sp = Math.sin(ph);
          const h = R2 + R1 * ct;
          const x = h * (cB * cp + sA * sB * sp) - R1 * st * cA * sB;
          const y = h * (sB * cp - sA * cB * sp) + R1 * st * cA * cB;
          const ooz = 1 / (K2 + cA * h * sp + R1 * st * sA);
          const col = Math.floor(cols / 2 + K1 * ooz * x);
          const row = Math.floor(rows / 2 - K1 * ASPECT * ooz * y);
          if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
          const k = col + row * cols;
          if (ooz <= depth[k]) continue;
          depth[k] = ooz;
          const nx = ct * (cB * cp + sA * sB * sp) - st * cA * sB;
          const ny = ct * (sB * cp - sA * cB * sp) + st * cA * cB;
          const nz = cA * ct * sp + st * sA;
          const i = Math.round(Math.max(0, nx * lx + ny * ly + nz * lz) * (RAMP.length - 1));
          out[k] = RAMP[paper ? RAMP.length - 1 - i : i];
        }
      }
      const lines = [];
      for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
      return lines.join("\n");
    };
  }

  // ascii/src/pieces/heart.ts
  var heart_exports = {};
  __export(heart_exports, {
    default: () => heart,
    meta: () => meta3
  });
  var meta3 = {
    name: "heart",
    category: "shapes",
    note: "a glossy 3d heart swaying and beating lub-dub",
    cols: 52,
    rows: 24,
    fps: 30
  };
  var RAMP2 = ".,-~:;=+*#%@";
  var field = (x, y, z) => x * x + 2.25 * y * y + z * z - 1 - z * Math.cbrt(x * x + 0.1125 * y * y);
  function heart() {
    const { cols, rows } = meta3;
    const K = 18;
    const cx = cols / 2, cy = rows / 2 + 1.3;
    const out = new Array(cols * rows);
    const m = Math.hypot(-0.4, -1, 0.65);
    const light = [-0.4 / m, -1 / m, 0.65 / m];
    return (t, { paper = false } = {}) => {
      const p = t % 1;
      const s = 1 + 0.075 * Math.exp(-(((p - 0.1) / 0.055) ** 2)) + 0.045 * Math.exp(-(((p - 0.32) / 0.06) ** 2));
      const yaw = 0.62 * Math.sin(t / 8 * Math.PI * 2);
      const tilt = 0.18;
      const cyw = Math.cos(yaw), syw = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
      const toObj = (x, y, z) => {
        const y1 = ct * y - st * z, z1 = st * y + ct * z;
        return [cyw * x + syw * y1, -syw * x + cyw * y1, z1];
      };
      const [lx, ly, lz] = toObj(...light);
      const [dx, dy, dz] = toObj(0, 1, 0);
      let hx = lx - dx, hy = ly - dy, hz = lz - dz;
      const hm = Math.hypot(hx, hy, hz);
      hx /= hm, hy /= hm, hz /= hm;
      out.fill(" ");
      for (let r = 0; r < rows; r++) {
        const v = (cy - r - 0.5) * 2 / K / s;
        if (v < -1.15 || v > 1.4) continue;
        for (let c = 0; c < cols; c++) {
          const u = (c + 0.5 - cx) / K / s;
          if (u < -1.3 || u > 1.3) continue;
          const [ox, oy, oz] = toObj(u, -1.6, v);
          let d0 = 0, hit = -1;
          for (let d = 0.04; d <= 3.2; d += 0.04) {
            if (field(ox + d * dx, oy + d * dy, oz + d * dz) < 0) {
              let a = d0, b2 = d;
              for (let k = 0; k < 10; k++) {
                const mid = (a + b2) / 2;
                if (field(ox + mid * dx, oy + mid * dy, oz + mid * dz) < 0) b2 = mid;
                else a = mid;
              }
              hit = b2;
              break;
            }
            d0 = d;
          }
          if (hit < 0) continue;
          const x = ox + hit * dx, y = oy + hit * dy, z = oz + hit * dz;
          const q = x * x + 0.1125 * y * y + 1e-9;
          const w = z / (3 * Math.cbrt(q * q));
          let nx = 2 * x - w * 2 * x;
          let ny = 4.5 * y - w * 0.225 * y;
          let nz = 2 * z - Math.cbrt(q);
          const nm = Math.hypot(nx, ny, nz) || 1;
          nx /= nm, ny /= nm, nz /= nm;
          const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
          const spec = Math.max(0, nx * hx + ny * hy + nz * hz) ** 40;
          const b = Math.min(1, 0.1 + 0.62 * diff + 0.4 * spec);
          const i = Math.round(b * (RAMP2.length - 1));
          out[c + r * cols] = RAMP2[paper ? RAMP2.length - 1 - i : i];
        }
      }
      const lines = [];
      for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
      return lines.join("\n");
    };
  }

  // ascii/src/pieces/jellyfish.ts
  var jellyfish_exports = {};
  __export(jellyfish_exports, {
    default: () => jellyfish,
    meta: () => meta4
  });
  var meta4 = {
    name: "jellyfish",
    category: "creatures",
    note: "a jellyfish pulsing upward, its tentacles trailing late",
    cols: 44,
    rows: 26,
    fps: 24
  };
  var RAMP3 = " .::=+*#%@";
  var P = 2.2;
  var SQ = 0.28;
  var ease = (x) => x * x * (3 - 2 * x);
  var phase = (t) => (t % P + P) % P / P;
  var squeeze = (t) => {
    const p = phase(t);
    return p < SQ ? ease(p / SQ) : 1 - ease((p - SQ) / (1 - SQ));
  };
  var lift = (t) => {
    const p = phase(t);
    return p < 0.4 ? ease(p / 0.4) : 1 - ease((p - 0.4) / 0.6);
  };
  var rimAt = (t) => {
    const c = squeeze(t);
    const x = meta4.cols / 2 + 1.5 * Math.sin(2 * Math.PI * t / (5 * P));
    return { c, x, y: 11 - 0.8 * c - 1.4 * lift(t), half: (13 - 2.6 * c) * (1 - 0.3 * c) };
  };
  function jellyfish() {
    const { cols, rows } = meta4;
    let seed = 7;
    const rnd = () => {
      seed = seed + 1831565813 | 0;
      let z = Math.imul(seed ^ seed >>> 15, 1 | seed);
      z = z + Math.imul(z ^ z >>> 7, 61 | z) ^ z;
      return ((z ^ z >>> 14) >>> 0) / 4294967296;
    };
    const specks = Array.from({ length: 30 }, () => ({ x: rnd() * cols, y: rnd() * rows, z: 0.4 + rnd() * 0.6, w: rnd() * 6.3 }));
    const grid = new Array(cols * rows);
    const put = (x, y, ch) => {
      x = Math.round(x);
      y = Math.round(y);
      if (x >= 0 && x < cols && y >= 0 && y < rows) grid[y * cols + x] = ch;
    };
    const travel = (t) => {
      const k = Math.floor(t / P), p = phase(t);
      return 0.9 * t + 2.4 * (k + (p < SQ ? 0.8 * ease(p / SQ) : 0.8 + 0.2 * (p - SQ) / (1 - SQ)));
    };
    return (t) => {
      grid.fill(" ");
      const D2 = travel(t);
      for (const s of specks) {
        const y = Math.floor(((s.y + D2 * s.z) % rows + rows) % rows);
        put(s.x + 0.6 * Math.sin(t * 0.5 + s.w), y, s.z > 0.8 ? "\xB7" : ".");
      }
      const now = rimAt(t);
      const { c } = now;
      const a = 13 - 2.6 * c, b = 13 + 2 * c;
      const rim = Math.floor(now.y);
      const trail = (d, lagPer) => {
        const was = rimAt(t - d * lagPer);
        return { x: was.x, y: rim + d + Math.max(0, was.y - now.y) * 0.8, half: was.half };
      };
      const cx = now.x;
      const strand = (len, lag, xAt, mark) => {
        let d = 1, px = xAt(1, trail(1, lag)), pdx = 0;
        for (let y = rim + 1; y < rows; y++) {
          while (d < len && trail(d, lag).y < y) d += 0.25;
          if (d >= len) break;
          const x = xAt(d, trail(d, lag)), dx = x - px;
          mark(x, y, dx, dx - pdx, d, d / len);
          px = x, pdx = dx;
        }
      };
      for (let i = 0; i < 8; i++) {
        const u = -0.92 + 1.84 * i / 7;
        const wob = (d) => Math.sin(d * 0.5 - t * 3 + i * 1.9);
        const len = 8.5 + 3.2 * (1 - Math.abs(u)) + i * 3 % 5 * 0.8;
        strand(len, 0.06, (d, at) => at.x + u * at.half * (1 - 0.01 * d) + (0.05 + d * 0.013) * d * wob(d), (x, y, dx, bow, d, f) => {
          const ch = f > 0.9 ? "." : f > 0.8 ? ":" : dx > 0.6 ? "\\" : dx < -0.6 ? "/" : bow > 0.22 ? "(" : bow < -0.22 ? ")" : "|";
          put(x, y, ch);
        });
      }
      for (let i = 0; i < 2; i++) {
        const s = i ? 1 : -1;
        strand(10, 0.09, (d, at) => at.x + s * 2 * (1 - d * 0.06) * (at.half / 10) + 0.9 * Math.sin(d * 0.6 - t * 2.2 + i * 2.5), (x, y, dx, bow, d, f) => {
          const tw = Math.cos(d * 1.1 + i * 1.3 - t * 1.6);
          if (f > 0.8) return put(x, y, f > 0.9 ? "." : ":");
          if (Math.abs(tw) < 0.35) return put(x, y, ":");
          put(x, y, ";");
          if (tw > 0.5) put(x + s, y, s > 0 ? ")" : "(");
        });
      }
      const width = (s) => a * Math.sqrt(1 - s * s) * (1 - 0.3 * c * (1 - s) ** 2);
      const inside = (X, yy) => {
        const s = (now.y - yy) * 2 / b;
        return s >= 0 && s < 1 && Math.abs(X) < width(s);
      };
      for (let x = 0; x < cols; x++) {
        const u = (x + 0.5 - cx) / width(0);
        if (Math.abs(u) < 1) grid[rim * cols + x] = Math.abs(u) > 0.93 ? "'" : x & 1 ? "~" : "'";
      }
      for (let r = 0; r < rim; r++) {
        for (let x = 0; x < cols; x++) {
          let n = 0, sx = 0, sy = 0;
          for (let j = 0; j < 4; j++)
            for (let i = 0; i < 3; i++)
              if (inside(x + (i + 0.5) / 3 - cx, r + (j + 0.5) / 4)) n++, sx += i - 1, sy += (j - 1.5) / 1.5;
          if (!n) continue;
          const k = r * cols + x;
          if (n < 10) {
            const ux = sx / n, uy = sy / n;
            if (uy > Math.abs(ux) * 1.2) grid[k] = n < 5 ? "_" : "-";
            else if (Math.abs(ux) > uy * 1.5) grid[k] = ux > 0 ? "(" : ")";
            else grid[k] = n < 4 ? "." : ux > 0 ? "/" : "\\";
            continue;
          }
          const s = Math.max(0, (now.y - r - 0.5) * 2 / b);
          const u = Math.max(-0.999, Math.min(0.999, (x + 0.5 - cx) / width(s)));
          const nz = Math.sqrt(1 - u * u) * Math.sqrt(1 - s * s);
          const ph = Math.asin(u);
          const g = Math.min(Math.abs(ph - 0.6), Math.abs(ph + 0.6));
          const ring = Math.max(0, 1 - Math.abs(Math.hypot(g / 0.36, (s - 0.45) / 0.26) - 1) * 3.5);
          const crown = 1 - 0.6 * ease(Math.max(0, (s - 0.62) / 0.38));
          const v = Math.min(1, (0.16 + 0.07 * s + 0.6 * (1 - nz) ** 2) * crown + 0.55 * ring);
          grid[k] = RAMP3[Math.max(1, Math.round(v * (RAMP3.length - 1)))];
        }
      }
      const lines = [];
      for (let r = 0; r < rows; r++) lines.push(grid.slice(r * cols, (r + 1) * cols).join(""));
      return lines.join("\n");
    };
  }

  // ascii/src/pieces/campfire.ts
  var campfire_exports = {};
  __export(campfire_exports, {
    default: () => campfire,
    meta: () => meta5
  });
  var meta5 = {
    name: "campfire",
    category: "nature",
    note: "a log fire flickering, sparks rising; denser ink is hotter",
    cols: 52,
    rows: 22,
    fps: 20
  };
  var FIRE = " .,:;=+*#%@";
  var EMBER = ":;+*#%";
  var SURF = "_.-'";
  var BED = 18.4;
  var TONGUES = [
    [-7.4, 9.5, 3.4, 2.4],
    [-4.4, 12.5, 3.5, 0],
    [-1.4, 15, 3.5, 1.7],
    [1.7, 15.5, 3.5, 3.1],
    [4.7, 12.5, 3.5, 4.4],
    [7.6, 10, 3.4, 5.6]
  ];
  var MID = 16.8;
  var LOGS = [[1, 22, 0.115, 1.4], [-1, 22, 0.115, 1.4]];
  var SPARKS = 9;
  var hash = (x, y) => {
    let h = Math.imul(x, 668265261) ^ Math.imul(y, 374761393);
    h = Math.imul(h ^ h >>> 15, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return ((h ^ h >>> 16) >>> 0) / 4294967296;
  };
  var ease2 = (t) => t * t * (3 - 2 * t);
  function noise(x, y) {
    const i = Math.floor(x), j = Math.floor(y), u = ease2(x - i), v = ease2(y - j);
    const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function campfire() {
    const { cols, rows } = meta5;
    const cx = cols / 2;
    const logs = new Array(cols * rows).fill(null);
    const heat = new Float32Array(cols * rows);
    const near = new Uint8Array(cols * rows);
    for (const [side, half, k, R] of LOGS) {
      const seed = side > 0 ? 3 : 8;
      for (let c = Math.floor(cx - half); c < cx + half; c++) {
        const x = c + 0.5 - cx, y = MID + k * x * side;
        const front = x * side > 0 ? 1 : 0;
        const r0 = Math.floor(y - R), r1 = Math.floor(y + R);
        const warm = Math.exp(-((x / 13) ** 2));
        const set = (r, ch, h = 0) => {
          const i = c + r * cols;
          if (r < 0 || r >= rows || near[i] && !front) return;
          logs[i] = ch;
          heat[i] = h;
          near[i] = front;
        };
        const e = Math.min(c - Math.floor(cx - half), Math.ceil(cx + half) - 1 - c);
        set(r0, e === 0 || front && e === 1 ? " " : SURF[Math.min(3, Math.floor((1 - (y - R - r0)) * 4))], warm);
        set(r1, e === 0 || front && e < 3 ? " " : SURF[Math.min(3, Math.floor((1 - (y + R - r1)) * 4))]);
        for (let r = r0 + 1; r < r1; r++) {
          const upper = r === r0 + 1;
          const u = x * side + (upper ? 0 : 1.7) + 40, run = Math.floor(u / 2.6), h = hash(run, seed + (upper ? 0 : 5));
          let ch = run % 2 ? upper ? "=" : "-" : upper ? h < 0.6 ? "#" : ":" : h < 0.6 ? "=" : ".";
          if (e === 0) ch = front ? upper === x < 0 ? "/" : "\\" : x < 0 ? "(" : ")";
          else if (front && e === 1) ch = upper ? "@" : "_";
          else if (front && e === 2) ch = upper === x < 0 ? "\\" : "/";
          set(r, ch, warm * (upper ? 0.7 : 0.3));
        }
      }
    }
    const sparks = Array.from({ length: SPARKS }, (_, i) => ({
      x: (hash(i, 1) - 0.5) * 12,
      period: 2.6 + hash(i, 2) * 2.4,
      phase: (i + hash(i, 3) * 0.5) / SPARKS,
      rise: 7 + hash(i, 4) * 6,
      drift: (hash(i, 5) - 0.5) * 8
    }));
    const coals = [];
    for (let r = Math.ceil(BED) - 1; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = c + 0.5 - cx, k = c + r * cols;
        if (logs[k] || Math.abs(x) > 10) continue;
        coals.push([k, Math.exp(-((x / 6) ** 2)) * (1.3 - (r + 1 - BED) * 0.35), hash(c, r + 60) * 9]);
      }
    const fire = new Float32Array(cols * rows);
    const out = new Array(cols * rows);
    return (t) => {
      out.fill(" ");
      const glow = (k, ch) => {
        const c = k % cols, r = (k - c) / cols;
        const g = heat[k] * (0.45 + 0.75 * noise(c * 0.7 + 3, t * 2.2 + r * 3)) - 0.3;
        return g > 0 ? EMBER[Math.min(EMBER.length - 1, Math.floor(g * 1.6 * EMBER.length))] : ch;
      };
      const breath = 0.85 + 0.3 * noise(t * 3, 7.5);
      fire.fill(0);
      for (let r = 0; r < Math.ceil(BED); r++)
        for (let c = 0; c < cols; c++) {
          const x = c + 0.5 - cx;
          let v = 0;
          for (const sub of [0.25, 0.75]) {
            const h = BED - (r + sub);
            const low = h / (5.5 * breath);
            let m = low < 1 ? (1 - (x / (10.5 * Math.sqrt(1 - low) + 0.5)) ** 2) * (0.85 - low * 0.5) : 0;
            let top = low < 1 ? low * 0.5 : 0;
            for (const [x0, h0, w0, ph] of TONGUES) {
              const lift2 = h / (h0 * (0.72 + 0.5 * noise(t * 1.6 + ph * 3, ph * 5)) * breath);
              if (lift2 >= 1) continue;
              const sway = 1.4 * lift2 ** 1.4 * Math.sin(h * 0.55 - t * 5.5 + ph) + 0.5 * lift2 * Math.sin(t * 8.3 + ph * 2);
              const q = (x - x0 * (1 - 0.45 * lift2) - sway) / (w0 * (1 - lift2) ** 0.6 + 0.5);
              const f = (1 - q * q) * (1 - lift2 * 0.6);
              if (f > m) [m, top] = [f, lift2];
            }
            const n = noise(x * 0.45, (h - t * 6) * 0.35) * 0.6 + noise(x * 0.9 + 9, (h - t * 8) * 0.7) * 0.4;
            v += m - 0.55 * n * (0.35 + top * 0.65);
          }
          fire[c + r * cols] = v / 2;
        }
      const stack = [];
      for (let c = 0, r = Math.ceil(BED) - 1; c < cols; c++) if (fire[c + r * cols] > 0.03) stack.push(c + r * cols), fire[c + r * cols] += 2;
      while (stack.length) {
        const k = stack.pop(), c = k % cols;
        for (const d of [-cols - 1, -cols, -cols + 1, -1, 1]) {
          const j = k + d;
          if (j < 0 || Math.abs(j % cols - c) > 1 || !(fire[j] > 0.03 && fire[j] < 2)) continue;
          fire[j] += 2;
          stack.push(j);
        }
      }
      for (let k = 0; k < cols * rows; k++) {
        const v = fire[k] - 2;
        if (v > 0.03 && !(near[k] && v < 0.6)) out[k] = FIRE[Math.min(FIRE.length - 1, 1 + Math.floor((v - 0.03) / 0.85 * (FIRE.length - 1)))];
        else if (logs[k]) out[k] = glow(k, logs[k]);
      }
      for (const [k, w, ph] of coals) {
        const b = w * (0.35 + 0.8 * noise(ph + t * 1.3, ph * 3)) - 0.2;
        if (b > 0 && out[k] === " ") out[k] = EMBER[Math.min(EMBER.length - 1, Math.floor(b * EMBER.length))];
      }
      for (const s of sparks) {
        const u = (t / s.period + s.phase) % 1;
        if (u > 0.8) continue;
        const y = BED - 8 - u * s.rise;
        const x = cx + s.x + s.drift * u + Math.sin(u * 11 + s.phase * 6);
        const c = Math.floor(x), r = Math.floor(y), k = c + r * cols;
        if (r < 0 || c < 0 || c >= cols || out[k] !== " ") continue;
        out[k] = u < 0.25 ? "*" : u < 0.45 ? "+" : u < 0.65 ? "'" : ".";
      }
      const lines = [];
      for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
      return lines.join("\n");
    };
  }

  // ascii/src/pieces/galaxy.ts
  var galaxy_exports = {};
  __export(galaxy_exports, {
    default: () => galaxy,
    meta: () => meta6
  });
  var meta6 = {
    name: "galaxy",
    category: "space",
    note: "a tilted spiral galaxy turning, its inner stars the fastest",
    cols: 64,
    rows: 26,
    fps: 20
  };
  var RAMP4 = " .:-=+*#%@";
  var TAU = Math.PI * 2;
  var mulberry32 = (a) => () => {
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  function galaxy() {
    const { cols, rows } = meta6;
    const cx = cols / 2, cy = rows / 2;
    const R = 28;
    const INC = 0.78;
    const PA = -0.14;
    const cpa = Math.cos(PA), spa = Math.sin(PA);
    const WIND = 1 / Math.tan(0.5);
    const PATTERN = 0.1;
    const rand = mulberry32(11);
    const stars = Array.from({ length: 110 }, () => ({
      r: 0.3 + 0.62 * Math.sqrt(rand()),
      a: rand() * TAU,
      b: 0.2 + 0.2 * rand()
    }));
    const field2 = new Float32Array(cols * rows);
    const bg = [];
    for (let gy = 0; gy < 4; gy++)
      for (let gx = 0; gx < 6; gx++)
        for (let tries = 0; tries < 6; tries++) {
          const c = 1 + Math.floor((gx + rand()) / 6 * (cols - 2));
          const r = 1 + Math.floor((gy + rand()) / 4 * (rows - 2));
          const x = c - cx, y = (r - cy) * 2;
          const u = (x * cpa + y * spa) / R, v = (-x * spa + y * cpa) / (R * INC);
          if (u * u + v * v < 1.4) continue;
          bg.push([c + r * cols, rand() < 0.2 ? "+" : "."]);
          break;
        }
    const light = (x, y, turn) => {
      const u = (x * cpa + y * spa) / R;
      const v = (-x * spa + y * cpa) / (R * INC);
      const r = Math.hypot(u, v);
      if (r > 1.1) return 0;
      const phi = Math.atan2(v, u);
      const bulge = 1.6 * Math.exp(-((Math.hypot(u, v * INC * 1.4) / 0.17) ** 2));
      const disc = 0.15 * Math.exp(-r / 0.3);
      const w = 2 * (phi - turn - Math.log(r + 1e-6) * WIND);
      const arm = (0.5 + 0.5 * Math.cos(w)) ** 3.5;
      const dust = (0.5 + 0.5 * Math.cos(w - 1.3)) ** 8;
      const s = Math.min(1, Math.max(0, (r - 0.12) / 0.16));
      const reach = s * s * (3 - 2 * s) * (1.3 - 0.8 * r) * Math.exp(-((r / 0.8) ** 3));
      return (bulge + disc + arm * reach) * (1 - 0.75 * dust * reach * Math.min(1, r / 0.3));
    };
    return (t) => {
      const turn = -PATTERN * t;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const x = c + 0.5 - cx;
          const y = (r + 0.25 - cy) * 2, y2 = (r + 0.75 - cy) * 2;
          field2[c + r * cols] = (light(x, y, turn) + light(x, y2, turn)) / 2;
        }
      for (const s of stars) {
        const a = s.a - s.b * t / (s.r + 0.08);
        const u = s.r * Math.cos(a) * R, v = s.r * Math.sin(a) * R * INC;
        const x = u * cpa - v * spa, y = u * spa + v * cpa;
        const c = Math.floor(cx + x), r = Math.floor(cy + y / 2);
        if (c >= 0 && c < cols && r >= 0 && r < rows) field2[c + r * cols] *= 1.6;
      }
      const out = new Array(cols * rows);
      for (let k = 0; k < cols * rows; k++) {
        const b = 1 - Math.exp(-1.8 * field2[k]);
        out[k] = RAMP4[Math.min(RAMP4.length - 1, Math.floor(b * RAMP4.length))];
      }
      for (const [k, ch] of bg) if (out[k] === " ") out[k] = ch;
      const lines = [];
      for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
      return lines.join("\n");
    };
  }

  // ascii/src/pieces/earth.ts
  var earth_exports = {};
  __export(earth_exports, {
    default: () => earth,
    meta: () => meta7
  });
  var meta7 = {
    name: "earth",
    category: "space",
    note: "a lit globe turning, continents from a five-degree map",
    cols: 60,
    rows: 30,
    fps: 20
  };
  var MAP = [
    "                                                                        ",
    "                     ##   ######                                        ",
    "             ###################       #                #               ",
    "           ###########   #######                  ###########           ",
    "#  ##############   ###  #####         #################################",
    "   ##############    ##   ##    #    ### ############################## ",
    "    #    #########  ####           # ## ########################   ##   ",
    "          ###############         ## ###########################        ",
    "           #############           #############################        ",
    "           ###########            ### ####  ## ###############  #       ",
    "           ##########             ##     ################### #          ",
    "            ########              ##### #  #################  #         ",
    "             ####  #             ###########################            ",
    "               ##                ###############  #########             ",
    "                ###              ##############    ##  ###  #           ",
    "                  ##             #############     #    ##  #           ",
    "                    #####         ############          #   #           ",
    "                    ######            #######          ## ##            ",
    "                    ########          ######            # ### ##        ",
    "                    #########         ######             ##    ###      ",
    "                     ########          #####                  #         ",
    "                      ######          ###### #               ####       ",
    "                      ######           ####  #             #######      ",
    "                      ####             ####                ########     ",
    "                     ####              ###                 #######      ",
    "                     ###                                        ##      ",
    "                     ##                                               # ",
    "                     ##                                                 ",
    "                     #                                                  ",
    "                                                                        ",
    "                                                                        ",
    "                       #                       ##################       ",
    "                    ####        ######################################  ",
    "  ####################################################################  ",
    "########################################################################",
    "########################################################################"
  ];
  var MW = 72;
  var MH = 36;
  var LAND = ":+*#%@";
  var PAPER_LAND = "##%%%@";
  var DAY = 36;
  var START = 20;
  var TILT = 0.3;
  var SS = 2;
  function mulberry322(a) {
    return () => {
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function earth() {
    const { cols, rows } = meta7;
    const cx = cols / 2, cy = rows / 2;
    const R = rows / 2 - 1;
    const land = new Float32Array(MW * MH);
    for (let r = 0; r < MH; r++) for (let c = 0; c < MW; c++) land[r * MW + c] = MAP[r][c] === "#" ? 1 : 0;
    const at = (u, v) => {
      const x = u - 0.5, y = Math.min(MH - 1, Math.max(0, v - 0.5));
      const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, y1 = Math.min(MH - 1, y0 + 1);
      const a = (x0 % MW + MW) % MW, b = (a + 1) % MW;
      const top = land[y0 * MW + a] * (1 - fx) + land[y0 * MW + b] * fx;
      const bot = land[y1 * MW + a] * (1 - fx) + land[y1 * MW + b] * fx;
      return top * (1 - fy) + bot * fy;
    };
    const m = Math.hypot(-0.42, 0.28, 0.86);
    const [lx, ly, lz] = [-0.42 / m, 0.28 / m, 0.86 / m];
    const hm = Math.hypot(lx, ly, lz + 1);
    const [hx, hy, hz] = [lx / hm, ly / hm, (lz + 1) / hm];
    const cells = [];
    const cT = Math.cos(TILT), sT = Math.sin(TILT);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const s = [];
        for (let j = 0; j < SS; j++)
          for (let i = 0; i < SS; i++) {
            const x = (c + (i + 0.5) / SS - cx) / (2 * R), y = (cy - r - (j + 0.5) / SS) / R;
            const d = x * x + y * y;
            if (d >= 1) continue;
            const z = Math.sqrt(1 - d);
            const py = y * cT + z * sT, pz = z * cT - y * sT;
            const lat = Math.asin(py), lon = Math.atan2(x, pz);
            s.push(lon, (Math.PI / 2 - lat) / Math.PI * MH, Math.max(0, x * lx + y * ly + z * lz), Math.max(0, x * hx + y * hy + z * hz) ** 300);
          }
        cells.push(s);
      }
    const inside = (c, r) => c >= 0 && c < cols && r >= 0 && r < rows && cells[r * cols + c].length * 2 >= 4 * SS * SS;
    const limb = new Uint8Array(cols * rows);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (inside(c, r)) {
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (!inside(c + dc, r + dr)) limb[r * cols + c] = 1;
        }
    const rim = (c, r) => limb[r * cols + c] === 1;
    const rand = mulberry322(5);
    const stars = new Uint8Array(cols * rows);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (Math.hypot((c + 0.5 - cx) / (2 * R), (cy - r - 0.5) / R) > 1.1 && rand() < 0.03) stars[r * cols + c] = 1;
    const crest = (u, v) => {
      const h = Math.sin(Math.floor(u * 1.5) * 12.9898 + Math.floor(v * 1.5) * 78.233) * 43758.5453;
      return h - Math.floor(h) < 0.12;
    };
    return (t, { paper = false } = {}) => {
      const turn = (START - 360 * (t % DAY) / DAY) * Math.PI / 180;
      let out = "";
      for (let r = 0; r < rows; r++) {
        if (r) out += "\n";
        for (let c = 0; c < cols; c++) {
          if (!inside(c, r)) {
            out += stars[r * cols + c] ? "." : " ";
            continue;
          }
          const s = cells[r * cols + c];
          let v = 0, l = 0, g = 0, u0 = 0;
          for (let i = 0; i < s.length; i += 4) {
            let u = ((s[i] + turn) / (2 * Math.PI) + 0.5) * MW % MW;
            if (u < 0) u += MW;
            if (!i) u0 = u;
            l += at(u, s[i + 1]);
            v += s[i + 2];
            g += s[i + 3];
          }
          const k = s.length / 4;
          v /= k;
          l /= k;
          g /= k;
          if (l >= 0.5) {
            if (v < 0.03) out += rim(c, r) ? "." : "\xB7";
            else out += (paper ? PAPER_LAND : LAND)[Math.min(LAND.length - 1, Math.floor((paper ? 1 - v : v) * 1.15 * LAND.length))];
          } else if (v < 0.1) out += rim(c, r) ? "." : " ";
          else if (g > 0.4) out += "=";
          else if (v > 0.5 && (g > 0.08 || crest(u0, s[1]))) out += "~";
          else out += v > 0.5 ? "-" : ".";
        }
      }
      return out;
    };
  }

  // ascii/src/pieces/black-hole.ts
  var black_hole_exports = {};
  __export(black_hole_exports, {
    default: () => blackHole,
    meta: () => meta8
  });
  var meta8 = {
    name: "black hole",
    category: "space",
    note: "a black hole, its lensed disk turning, one side brighter",
    cols: 64,
    rows: 20,
    fps: 15
  };
  var RAMP5 = " .:-=+*#%@";
  var SX = 3;
  var SY = 4;
  var D = 30;
  var IN = 3;
  var OUT = 9;
  var TILT2 = 0.15;
  var SPAN = 0.34;
  var GAIN = 1.6;
  var FLOOR = 0.03;
  var LOOP2 = 60;
  var BANDS = 12;
  var SPIN = 7;
  var BMAX = 12;
  var NB = 1500;
  var H = 0.02;
  function mulberry323(a) {
    return () => {
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function paths() {
    const f = (u) => 1.5 * u * u - u;
    const table = [];
    for (let n = 0; n < NB; n++) {
      const b = (n + 0.5) / NB * BMAX;
      let u = 1 / D, w = Math.sqrt(1 - (b / D) ** 2) / b;
      const us = [u];
      while (u < 1 && (u > 1 / (OUT + 1) || w > 0)) {
        const k1 = w, l1 = f(u);
        const k2 = w + H / 2 * l1, l2 = f(u + H / 2 * k1);
        const k3 = w + H / 2 * l2, l3 = f(u + H / 2 * k2);
        const k4 = w + H * l3, l4 = f(u + H * k3);
        u += H / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
        w += H / 6 * (l1 + 2 * l2 + 2 * l3 + l4);
        us.push(u);
      }
      table.push(Float32Array.from(us));
    }
    return table;
  }
  function blackHole() {
    const { cols, rows } = meta8;
    const cw = 2 * SPAN / cols;
    const s = Math.sin(TILT2), c = Math.cos(TILT2);
    const table = paths();
    const rand = mulberry323(17);
    const TAB = 256;
    const band = [];
    for (let b = 0; b < BANDS; b++) {
      const r = IN + (OUT - IN) * b / (BANDS - 1);
      const turns = Math.max(1, Math.round(SPIN * (IN / r) ** 1.5));
      const waves = [2, 3, 5, 8, 13].map((k) => [k, rand() * 6.283, (0.5 + rand()) / Math.sqrt(k)]);
      const tab = new Float32Array(TAB);
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < TAB; i++) {
        for (const [k, p, a] of waves) tab[i] += a * Math.sin(k * 2 * Math.PI * i / TAB + p);
        lo = Math.min(lo, tab[i]);
        hi = Math.max(hi, tab[i]);
      }
      for (let i = 0; i < TAB; i++) tab[i] = 0.45 + 0.55 * (tab[i] - lo) / (hi - lo);
      band.push({ tab, turns });
    }
    const cells = Array.from({ length: cols * rows }, () => []);
    const empty = new Uint8Array(cols * rows).fill(1);
    for (let j = 0; j < rows * SY; j++) {
      const y = (rows / 2 + 0.5 - (j + 0.5) / SY) * 2 * cw;
      for (let i = 0; i < cols * SX; i++) {
        const x = ((i + 0.5) / SX - cols / 2) * cw;
        const k = Math.floor(j / SY) * cols + Math.floor(i / SX);
        const n = Math.hypot(x, y, 1);
        const d = [x / n, (y * c - s) / n, (y * s + c) / n];
        const out = d[1] * s - d[2] * c;
        const side = Math.sqrt(1 - out * out);
        const e2 = [d[0] / side, (d[1] - out * s) / side, (d[2] + out * c) / side];
        const us = table[Math.min(NB - 1, Math.floor(D * side * NB / BMAX))];
        if (us[us.length - 1] >= 1) empty[k] = 0;
        const end = Math.min((us.length - 1) * H, 5.6);
        let light = 1;
        for (let a = (Math.atan2(-s, e2[1]) + 2 * Math.PI) % Math.PI; a < end; a += Math.PI) {
          const p = a / H, q = Math.floor(p);
          const r = 1 / (us[q] + (us[q + 1] - us[q]) * (p - q));
          if (r <= IN || r >= OUT) continue;
          const phi = Math.atan2(Math.sin(a) * e2[2] - Math.cos(a) * c, Math.sin(a) * e2[0]);
          const edge = Math.min(1, (r - IN) / 0.7) * (1 - ((r - IN) / (OUT - IN)) ** 2);
          const doppler = 1 - 0.5 * Math.cos(phi);
          const pos = (r - IN) / (OUT - IN) * (BANDS - 1);
          const b0 = Math.min(BANDS - 2, Math.floor(pos));
          empty[k] = 0;
          cells[k].push(b0, pos - b0, phi, light * edge * doppler * (IN / r) ** 1.5 / (SX * SY));
          light *= 0.45;
        }
      }
    }
    const stars = new Uint8Array(cols * rows);
    for (let k = 0; k < cols * rows; k++) stars[k] = empty[k] && rand() < 0.03 ? 1 : 0;
    const at = (b, a) => {
      const i = Math.floor(a / (2 * Math.PI) * TAB) % TAB;
      return band[b].tab[i < 0 ? i + TAB : i];
    };
    return (t) => {
      const turn = 2 * Math.PI * (t % LOOP2) / LOOP2;
      let out = "";
      for (let r = 0; r < rows; r++) {
        if (r) out += "\n";
        for (let q = 0; q < cols; q++) {
          const k = r * cols + q;
          const h = cells[k];
          let sum = 0;
          for (let i = 0; i < h.length; i += 4) {
            const b = h[i], fr = h[i + 1], phi = h[i + 2];
            const g0 = at(b, phi - band[b].turns * turn), g1 = at(b + 1, phi - band[b + 1].turns * turn);
            sum += h[i + 3] * (g0 + (g1 - g0) * fr);
          }
          const v = Math.min(1, Math.max(0, sum * GAIN - FLOOR) / (1 - FLOOR)) ** 0.75;
          const ch = RAMP5[Math.round(v * (RAMP5.length - 1))];
          out += ch === " " && stars[k] ? "." : ch;
        }
      }
      return out;
    };
  }

  // ascii/src/pieces/torus-knot.ts
  var torus_knot_exports = {};
  __export(torus_knot_exports, {
    default: () => torusKnot,
    meta: () => meta9
  });
  var meta9 = {
    name: "torus knot",
    category: "shapes",
    note: "a trefoil knot drawn as a lit tube, turning slowly",
    cols: 60,
    rows: 28,
    fps: 30
  };
  var RAMP6 = ".:-=+*#%@";
  function torusKnot() {
    const { cols, rows } = meta9;
    const TUBE = 0.28;
    const NU = 720, NV = 32;
    const curve = (u, o) => {
      const r = 2 + Math.cos(3 * u);
      o[0] = r * Math.cos(2 * u);
      o[1] = r * Math.sin(2 * u);
      o[2] = -Math.sin(3 * u);
    };
    const px = new Float32Array(NU * NV), py = new Float32Array(NU * NV), pz = new Float32Array(NU * NV);
    const nx = new Float32Array(NU * NV), ny = new Float32Array(NU * NV), nz = new Float32Array(NU * NV);
    const c = [0, 0, 0], d = [0, 0, 0];
    for (let i = 0; i < NU; i++) {
      const u = i / NU * 6.2832;
      curve(u, c);
      curve(u + 1e-3, d);
      let tx = d[0] - c[0], ty = d[1] - c[1], tz = d[2] - c[2];
      const tl = Math.hypot(tx, ty, tz);
      tx /= tl;
      ty /= tl;
      tz /= tl;
      let ax = ty, ay = -tx;
      const al = Math.hypot(ax, ay);
      ax /= al;
      ay /= al;
      const bx = -tz * ay, by = tz * ax, bz = tx * ay - ty * ax;
      for (let j = 0; j < NV; j++) {
        const v = j / NV * 6.2832;
        const cv = Math.cos(v), sv = Math.sin(v);
        const k = i * NV + j;
        nx[k] = ax * cv + bx * sv;
        ny[k] = ay * cv + by * sv;
        nz[k] = bz * sv;
        px[k] = c[0] + TUBE * nx[k];
        py[k] = c[1] + TUBE * ny[k];
        pz[k] = c[2] + TUBE * nz[k];
      }
    }
    const D2 = 11;
    const ASPECT = 0.5;
    const view = (t) => [t * 0.3, 0.48 - 0.28 * Math.cos(t * 0.35)];
    let mx = 0, my = 0;
    for (let a = 0; a < 6.283; a += 0.1) {
      for (let T = 0.2; T <= 0.77; T += 0.07) {
        const cS = Math.cos(a), sS = Math.sin(a), cT = Math.cos(T), sT = Math.sin(T);
        for (let k = 0; k < NU * NV; k += 7) {
          const x = cS * px[k] - sS * py[k];
          const y = cT * (sS * px[k] + cS * py[k]) - sT * pz[k];
          const z = sT * (sS * px[k] + cS * py[k]) + cT * pz[k];
          mx = Math.max(mx, Math.abs(x) / (D2 - z));
          my = Math.max(my, Math.abs(y) / (D2 - z));
        }
      }
    }
    const K = Math.min((cols - 2) / 2 / mx, (rows - 2) / 2 / ASPECT / my);
    const GAP = TUBE * 0.9;
    const m = Math.hypot(-0.35, 0.45, 1);
    const [lx, ly, lz] = [-0.35 / m, 0.45 / m, 1 / m];
    const hm = Math.hypot(lx, ly, lz + 1);
    const [hx, hy, hz] = [lx / hm, ly / hm, (lz + 1) / hm];
    const n = cols * rows;
    const out = new Array(n);
    const depth = new Float32Array(n);
    const along = new Int16Array(n);
    const cut = new Uint8Array(n);
    const stack = new Int32Array(n), part = new Int32Array(n);
    const N = RAMP6.length - 1;
    return (t, { paper = false } = {}) => {
      const [S, T] = view(t);
      const cS = Math.cos(S), sS = Math.sin(S), cT = Math.cos(T), sT = Math.sin(T);
      const r00 = cS, r01 = -sS;
      const r10 = cT * sS, r11 = cT * cS, r12 = -sT;
      const r20 = sT * sS, r21 = sT * cS, r22 = cT;
      out.fill(" ");
      depth.fill(0);
      for (let k = 0; k < NU * NV; k++) {
        const wz = r20 * nx[k] + r21 * ny[k] + r22 * nz[k];
        if (wz < -0.15) continue;
        const x = r00 * px[k] + r01 * py[k];
        const y = r10 * px[k] + r11 * py[k] + r12 * pz[k];
        const z = r20 * px[k] + r21 * py[k] + r22 * pz[k];
        const ooz = 1 / (D2 - z);
        const col = Math.floor(cols / 2 + K * ooz * x);
        const row = Math.floor(rows / 2 - K * ASPECT * ooz * y);
        if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
        const q = col + row * cols;
        if (z + 20 <= depth[q]) continue;
        depth[q] = z + 20;
        along[q] = k / NV | 0;
        const wx = r00 * nx[k] + r01 * ny[k];
        const wy = r10 * nx[k] + r11 * ny[k] + r12 * nz[k];
        const diff = Math.max(0, wx * lx + wy * ly + wz * lz);
        const spec = Math.max(0, wx * hx + wy * hy + wz * hz) ** 24;
        const i = Math.round(Math.min(1, 0.08 + diff * 0.8 + spec * 0.5) * N);
        out[q] = RAMP6[paper ? N - i : i];
      }
      const over = (q, p) => {
        if (depth[p] <= depth[q] + GAP) return false;
        const s = Math.abs(along[p] - along[q]);
        return Math.min(s, NU - s) > NU / 16;
      };
      for (let q = 0; q < n; q++) {
        const c2 = q % cols;
        cut[q] = depth[q] > 0 && (c2 > 0 && over(q, q - 1) || c2 < cols - 1 && over(q, q + 1) || q >= cols && over(q, q - cols) || q < n - cols && over(q, q + cols)) ? 1 : 0;
      }
      for (let q = 0; q < n; q++) if (cut[q]) {
        out[q] = " ";
        depth[q] = 0;
      }
      part.fill(0);
      for (let q = 0; q < n; q++) {
        if (out[q] === " " || part[q]) continue;
        let top = 0, size = 0;
        stack[top++] = q;
        part[q] = 1;
        const seen = [];
        while (top) {
          const p = stack[--top], c2 = p % cols;
          seen.push(p);
          size++;
          for (const o of [c2 > 0 ? p - 1 : -1, c2 < cols - 1 ? p + 1 : -1, p - cols, p + cols]) {
            if (o >= 0 && o < n && !part[o] && out[o] !== " ") {
              part[o] = 1;
              stack[top++] = o;
            }
          }
        }
        if (size < 7) for (const p of seen) out[p] = " ";
      }
      const lines = [];
      for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
      return lines.join("\n");
    };
  }

  // ascii/src/pieces/butterfly.ts
  var butterfly_exports = {};
  __export(butterfly_exports, {
    default: () => butterfly,
    meta: () => meta10
  });
  var meta10 = {
    name: "butterfly",
    category: "creatures",
    note: "a butterfly flapping and gliding along a wandering path",
    cols: 64,
    rows: 24,
    fps: 30
  };
  var RAMP7 = " .:-=+*#%@";
  var LOOP3 = 16;
  var BEAT = 2.5;
  var EYE = 120;
  var FORE = { x: 9.6, y: 5.6, a: 11.6, b: 7.2, r: 0.5 };
  var HIND = { x: 7, y: -4.6, a: 8.8, b: 7.4, r: -0.62 };
  var drop = (w, x, y) => {
    const dx = x - w.x, dy = y - w.y, c = Math.cos(w.r), s = Math.sin(w.r);
    const p = (dx * c + dy * s) / w.a;
    const q = (dy * c - dx * s) / (w.b * (0.58 + 0.42 * Math.min(1, Math.max(0, (p + 1) / 2))));
    return [p, q, p * p + q * q];
  };
  function wing(x, y) {
    const root = Math.hypot(x, y * 0.8) < 3.6;
    let [p, q, r] = drop(FORE, x, y);
    if (r < 1) {
      const rho = Math.sqrt(r), be = Math.atan2(q, p);
      if (rho > 0.76 + 0.2 * Math.min(1, Math.max(0, (0.5 - p) / 0.8)))
        return rho > 0.8 && rho < 0.95 && p > 0.3 && Math.cos(be * 7 + 0.3) > 0.45 ? 0.9 : 0.24;
      if (Math.abs(p * 0.85 + q * 0.5 - 0.02) < 0.17) return 0.9;
      return root ? 0.3 : 0.55;
    }
    [p, q, r] = drop(HIND, x, y);
    if (r >= 1) return -1;
    const e = Math.hypot(x - 9.4, (y + 6.4) * 0.8);
    if (e < 1) return 1;
    if (e < 2.3) return 0.1;
    if (e < 3.8) return 0.9;
    if (Math.sqrt(r) > 0.8 && p > -0.3) return 0.24;
    return root ? 0.3 : 0.55;
  }
  function butterfly() {
    const { cols, rows } = meta10;
    const out = new Array(cols * rows);
    const put = (x, y, ch) => {
      x = Math.round(x);
      y = Math.round(y);
      if (x >= 0 && x < cols && y >= 0 && y < rows) out[y * cols + x] = ch;
    };
    return (t, { paper = false } = {}) => {
      const u = (t % LOOP3 + LOOP3) % LOOP3;
      const w = 2 * Math.PI / LOOP3;
      const g = u % 8, flap = g < 4 ? 1 : g < 4.4 ? 1 - (g - 4) / 0.4 : g > 7.6 ? (g - 7.6) / 0.4 : 0;
      const beat = Math.cos(2 * Math.PI * BEAT * u);
      const th = flap * (0.6 - 0.72 * beat) - 0.06 * (1 - flap);
      const bx = Math.round(cols / 2 + 9 * Math.sin(w * u) + 2 * Math.sin(3 * w * u + 0.6)) - 0.5;
      const by = rows / 2 + 0.6 + 1.4 * Math.sin(2 * w * u + 1) + 0.35 * flap * Math.sin(2 * Math.PI * BEAT * u);
      const bank = (0.16 - 0.1 * flap) * (Math.cos(w * u) + 0.67 * Math.cos(3 * w * u + 0.6)) / 1.67;
      const tilt = [th - bank, th + bank].map((a) => [Math.cos(a), Math.sin(a)]);
      const dim = 0.82 + 0.18 * Math.cos(th);
      const sample = (X, Y) => {
        const [ct, st] = tilt[X < 0 ? 0 : 1];
        const ax = Math.abs(X), den = EYE * ct + ax * st;
        if (den <= 0) return -1;
        const x = ax * EYE / den, k = EYE / (EYE - x * st);
        return wing(x, Y / k);
      };
      out.fill(" ");
      const col = bx - 0.5;
      const sway = 0.4 * Math.sin(2 * Math.PI * 0.5 * u);
      for (const side of [-1, 1]) {
        for (let k = 1; k <= 5; k++) {
          const f = k / 5;
          put(col + side * (0.5 + 2.6 * f + sway * f * f), by - 2 - 5 * f, k === 5 ? "o" : side > 0 ? "/" : "\\");
        }
      }
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let n = 0, sx = 0, sy = 0;
          for (let j = 0; j < 3; j++)
            for (let i2 = 0; i2 < 2; i2++)
              if (sample(c + 0.25 + i2 * 0.5 - bx, (by - r - (j + 0.5) / 3) * 2) >= 0) n++, sx += i2 - 0.5, sy += 1 - j;
          if (!n) continue;
          const at = r * cols + c;
          if (n < 5) {
            const ux = sx / n, uy = sy / n;
            if (Math.abs(uy) > Math.abs(ux) * 2) out[at] = uy < 0 ? n < 3 ? "." : "_" : n < 3 ? "'" : "-";
            else if (Math.abs(ux) > Math.abs(uy) * 2) out[at] = ux > 0 ? "(" : ")";
            else out[at] = ux * uy < 0 ? "/" : "\\";
            continue;
          }
          const v = sample(c + 0.5 - bx, (by - r - 0.5) * 2);
          const i = Math.max(1, Math.round(Math.max(0, v) * dim * (RAMP7.length - 1)));
          out[at] = RAMP7[paper ? RAMP7.length - i : i];
        }
      }
      for (let y = 3; y >= -9; y--) put(col, by - y / 2, y > 1 ? "O" : y > -2 ? "#" : y > -8 ? "|" : "'");
      const lines = [];
      for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
      return lines.join("\n");
    };
  }

  // ascii/src/pieces/cat.ts
  var cat_exports = {};
  __export(cat_exports, {
    default: () => cat,
    meta: () => meta11
  });
  var meta11 = {
    name: "cat",
    category: "creatures",
    note: "a tabby asleep on its paws, breathing slowly",
    cols: 56,
    rows: 15,
    fps: 15
  };
  var CAT = [
    "",
    "",
    "",
    "                                    /\\      /\\",
    "                                   /  `----'  \\",
    "                                  /            \\",
    "                                 |  `-'    `-'  |",
    "                                 |       v      |",
    "                                  \\    `-'-'   /",
    "       |          _.--._           `-._____.-'",
    "        \\       .'      `.         _(__)  (__)_",
    "         `.   /          \\_______.'            `.",
    "      `-._ `-(______.---.___________________________)",
    "          `---'"
  ];
  var BACK = [
    [
      "",
      "               _..-------.._",
      "           _.-'   )   )   ) `-.",
      "         .'     )   )   )   )  `-",
      "        /      )   )   )   )",
      "       |"
    ],
    [
      "               ____________",
      "            _.-'            `-._",
      "          .'      )   )   )     `-",
      "         /      )   )   )   )",
      "        |      )   )   )   )",
      "       |"
    ],
    [
      "              _..--------.._",
      "          _.-'    )   )   ) `-._",
      "        .'      )   )   )   )   `-",
      "       /       )   )   )   )",
      "       |",
      "       |"
    ]
  ];
  var TIP = [
    [[10, 3, "_"], [11, 2, "( `."], [12, 3, "`."], [13, 5, "`-.__"]],
    [[9, 2, ".-."], [10, 1, "( ,'"], [11, 2, "\\ `."], [12, 3, "`."], [13, 5, "`-.__"]],
    [[7, 2, ".-."], [8, 1, "/ ,'"], [9, 1, "| |"], [10, 1, "\\ \\"], [11, 2, "\\ `."], [12, 3, "`."], [13, 5, "`-.__"]]
  ];
  var EAR_BACK = [[3, 44, "  _"], [4, 43, ".-' \\"]];
  var LOOP4 = 16;
  var BREATH = 4;
  var FLICK = [[1.9, 3.4], [10.4, 11.6]];
  var TWITCH2 = [[4.5, 4.8], [4.95, 5.3], [12.8, 13.1]];
  var Z_EVERY = 1.6;
  var Z_LIFE = 3.2;
  function cat() {
    const { cols, rows } = meta11;
    const art = Array.from({ length: rows }, (_, r) => (CAT[r] || "").padEnd(cols).split(""));
    const within2 = (u, spans) => spans.some(([a, b]) => u >= a && u < b);
    return (t) => {
      const u = (t % LOOP4 + LOOP4) % LOOP4;
      const g = art.map((row) => row.slice());
      const put = (r, c, s) => [...s].forEach((ch, i) => ch !== " " && c + i < cols && (g[r][c + i] = ch));
      const p = (u + 0.4) % BREATH / BREATH;
      const rise = p < 0.35 ? Math.sin(Math.PI / 2 * (p / 0.35)) ** 2 : p < 0.8 ? Math.cos(Math.PI / 2 * ((p - 0.35) / 0.45)) ** 2 : 0;
      BACK[rise < 0.3 ? 0 : rise < 0.75 ? 1 : 2].forEach((line, i) => put(3 + i, 0, line));
      const fl = FLICK.find(([a, b]) => u >= a && u < b);
      const up = fl ? Math.sin(Math.PI * (u - fl[0]) / (fl[1] - fl[0])) : 0;
      TIP[up > 0.7 ? 2 : up > 0.25 ? 1 : 0].forEach(([r, c, s]) => put(r, c, s));
      if (within2(u, TWITCH2)) EAR_BACK.forEach(([r, c, s]) => [...s].forEach((ch, i) => g[r][c + i] = ch));
      for (let k = -2; k <= LOOP4 / Z_EVERY; k++) {
        const age = u - k * Z_EVERY;
        if (age < 0 || age >= Z_LIFE || within2((k * Z_EVERY % LOOP4 + LOOP4) % LOOP4, TWITCH2)) continue;
        const f = age / Z_LIFE;
        const c = Math.floor(48.5 + f * 4 + Math.sin(age * 2.6 + k) * 0.7), r = Math.floor(3.7 - f * 3.7);
        if (r >= 0 && c < cols && g[r][c] === " ") g[r][c] = f < 0.5 ? "z" : "Z";
      }
      return g.map((row) => row.join("")).join("\n");
    };
  }

  // entry.ts
  Object.assign(globalThis.ASCII_PIECES ?? (globalThis.ASCII_PIECES = {}), {
    "catgirl": catgirl_exports,
    "donut": donut_exports,
    "heart": heart_exports,
    "jellyfish": jellyfish_exports,
    "campfire": campfire_exports,
    "galaxy": galaxy_exports,
    "earth": earth_exports,
    "black-hole": black_hole_exports,
    "torus-knot": torus_knot_exports,
    "butterfly": butterfly_exports,
    "cat": cat_exports
  });
})();
