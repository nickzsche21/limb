/**
 * Where the Sun and Moon are, which way the Moon's bright limb points, and the
 * angle that makes the whole thing look wrong.
 *
 * Low-precision series from Meeus, *Astronomical Algorithms*: the Sun to about
 * an arcminute, the Moon to a few arcminutes. That is far finer than the effect
 * being demonstrated, which is measured in whole degrees, and the page says so
 * rather than implying observatory accuracy.
 */

export const RAD = Math.PI / 180;
export const DEG = 180 / Math.PI;

const sin = (d: number) => Math.sin(d * RAD);
const cos = (d: number) => Math.cos(d * RAD);
export const norm360 = (d: number) => ((d % 360) + 360) % 360;
/** Wrap to (-180, 180]. Used for every angle difference on this page. */
export const norm180 = (d: number) => {
  const x = norm360(d);
  return x > 180 ? x - 360 : x;
};

/** Julian Day from a JS timestamp. */
export const toJD = (ms: number) => ms / 86400000 + 2440587.5;
/** Days since J2000.0. */
export const daysSinceJ2000 = (ms: number) => toJD(ms) - 2451545.0;

export type Equatorial = { ra: number; dec: number; dist: number };

/** Obliquity of the ecliptic. */
const obliquity = (d: number) => 23.4392911 - 3.563e-7 * d;

function eclipticToEquatorial(lon: number, lat: number, dist: number, d: number): Equatorial {
  const e = obliquity(d);
  const x = cos(lat) * cos(lon);
  const y = cos(e) * cos(lat) * sin(lon) - sin(e) * sin(lat);
  const z = sin(e) * cos(lat) * sin(lon) + cos(e) * sin(lat);
  return { ra: norm360(Math.atan2(y, x) * DEG), dec: Math.asin(z) * DEG, dist };
}

/** Sun, geometric. Distance in km. */
export function sun(ms: number): Equatorial {
  const d = daysSinceJ2000(ms);
  const L = norm360(280.46646 + 0.9856474 * d);
  const g = norm360(357.52911 + 0.9856003 * d);
  const lon = L + 1.914602 * sin(g) + 0.019993 * sin(2 * g) + 0.000289 * sin(3 * g);
  const r = 1.000001018 * (1 - 0.01671123 * 0.01671123) / (1 + 0.01671123 * cos(g + 1.914602 * sin(g)));
  return eclipticToEquatorial(norm360(lon), 0, r * 149597870.7, d);
}

/**
 * Moon. The principal periodic terms only — evection, variation, annual
 * equation and the main latitude terms — which is what gives a few arcminutes.
 */
export function moon(ms: number): Equatorial {
  const d = daysSinceJ2000(ms);
  const L = norm360(218.3164477 + 13.17639648 * d); // mean longitude
  const M = norm360(134.9633964 + 13.06499295 * d); // moon's mean anomaly
  const Ms = norm360(357.5291092 + 0.98560028 * d); // sun's mean anomaly
  const D = norm360(297.8501921 + 12.19074912 * d); // mean elongation
  const F = norm360(93.2720950 + 13.22935024 * d);  // argument of latitude

  const lon =
    L +
    6.288774 * sin(M) +
    1.274027 * sin(2 * D - M) +
    0.658314 * sin(2 * D) +
    0.213618 * sin(2 * M) -
    0.185116 * sin(Ms) -
    0.114332 * sin(2 * F) +
    0.058793 * sin(2 * D - 2 * M) +
    0.057066 * sin(2 * D - Ms - M) +
    0.053322 * sin(2 * D + M) +
    0.045758 * sin(2 * D - Ms) -
    0.040923 * sin(Ms - M) -
    0.034720 * sin(D) -
    0.030383 * sin(Ms + M);

  const lat =
    5.128122 * sin(F) +
    0.280602 * sin(M + F) +
    0.277693 * sin(M - F) +
    0.173237 * sin(2 * D - F) +
    0.055413 * sin(2 * D - M + F) +
    0.046271 * sin(2 * D - M - F) +
    0.032573 * sin(2 * D + F) +
    0.017198 * sin(2 * M + F);

  const dist =
    385000.56 -
    20905.355 * cos(M) -
    3699.111 * cos(2 * D - M) -
    2955.968 * cos(2 * D) -
    569.925 * cos(2 * M);

  return eclipticToEquatorial(norm360(lon), lat, dist, d);
}

/* ── the observer ─────────────────────────────────────────────────────────── */

export type Site = { lat: number; lon: number };
/** Altitude above the horizon and azimuth measured from north, through east. */
export type Horizontal = { alt: number; az: number };

/** Greenwich mean sidereal time, degrees. */
export function gmst(ms: number): number {
  const d = daysSinceJ2000(ms);
  return norm360(280.46061837 + 360.98564736629 * d);
}

/** Local hour angle of a body, degrees, positive west of the meridian. */
export const hourAngle = (ms: number, site: Site, eq: Equatorial) =>
  norm180(gmst(ms) + site.lon - eq.ra);

export function toHorizontal(ms: number, site: Site, eq: Equatorial): Horizontal {
  const H = hourAngle(ms, site, eq);
  const alt = Math.asin(sin(site.lat) * sin(eq.dec) + cos(site.lat) * cos(eq.dec) * cos(H)) * DEG;
  const az = norm360(
    Math.atan2(sin(H), cos(H) * sin(site.lat) - Math.tan(eq.dec * RAD) * cos(site.lat)) * DEG + 180
  );
  return { alt, az };
}

/**
 * Parallactic angle: how much the equatorial frame is rotated relative to the
 * observer's up. This is the term that makes the effect depend on latitude,
 * which is the part the HN thread kept getting stuck on.
 */
export function parallactic(ms: number, site: Site, eq: Equatorial): number {
  const H = hourAngle(ms, site, eq);
  return Math.atan2(sin(H), Math.tan(site.lat * RAD) * cos(eq.dec) - sin(eq.dec) * cos(H)) * DEG;
}

/* ── the bright limb ──────────────────────────────────────────────────────── */

/** Angular separation between two points on the sphere, degrees. */
export function separation(a: Equatorial, b: Equatorial): number {
  const c = sin(a.dec) * sin(b.dec) + cos(a.dec) * cos(b.dec) * cos(a.ra - b.ra);
  return Math.acos(Math.min(1, Math.max(-1, c))) * DEG;
}

/** Position angle of the Moon's bright limb, measured from celestial north. */
export function brightLimbPA(s: Equatorial, m: Equatorial): number {
  const dRa = s.ra - m.ra;
  return norm360(
    Math.atan2(cos(s.dec) * sin(dRa), sin(s.dec) * cos(m.dec) - cos(s.dec) * sin(m.dec) * cos(dRa)) * DEG
  );
}

export type Phase = { elongation: number; phaseAngle: number; illuminated: number; waxing: boolean };

export function phase(s: Equatorial, m: Equatorial): Phase {
  const psi = separation(s, m);
  // Meeus 48.3 — the Sun is far but not infinitely far.
  const i = Math.atan2(s.dist * sin(psi), m.dist - s.dist * cos(psi)) * DEG;
  return {
    elongation: psi,
    phaseAngle: i,
    illuminated: (1 + cos(i)) / 2,
    waxing: norm180(m.ra - s.ra) > 0,
  };
}

/* ── the sky as seen ──────────────────────────────────────────────────────── */

/** A unit vector in the observer's frame: x east, y north, z up. */
export type Vec = [number, number, number];

export const toVec = (h: Horizontal): Vec => [
  cos(h.alt) * sin(h.az),
  cos(h.alt) * cos(h.az),
  sin(h.alt),
];

export const fromVec = (v: Vec): Horizontal => ({
  alt: Math.asin(Math.min(1, Math.max(-1, v[2]))) * DEG,
  az: norm360(Math.atan2(v[0], v[1]) * DEG),
});

/** The point `deg` degrees along the great circle from a towards b. */
export function alongGreatCircle(a: Horizontal, b: Horizontal, deg: number): Horizontal {
  const va = toVec(a), vb = toVec(b);
  const dot = Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const omega = Math.acos(dot);
  if (omega < 1e-9) return a;
  const t = Math.min(1, (deg * RAD) / omega);
  const s1 = Math.sin((1 - t) * omega) / Math.sin(omega);
  const s2 = Math.sin(t * omega) / Math.sin(omega);
  return fromVec([
    s1 * va[0] + s2 * vb[0],
    s1 * va[1] + s2 * vb[1],
    s1 * va[2] + s2 * vb[2],
  ]);
}

/** Points along the great circle from a to b — the actual path across the sky. */
export function greatCircle(a: Horizontal, b: Horizontal, steps = 96): Horizontal[] {
  const va = toVec(a), vb = toVec(b);
  const dot = Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const omega = Math.acos(dot);
  const out: Horizontal[] = [];
  if (omega < 1e-9) return [a, b];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const s1 = Math.sin((1 - t) * omega) / Math.sin(omega);
    const s2 = Math.sin(t * omega) / Math.sin(omega);
    out.push(fromVec([
      s1 * va[0] + s2 * vb[0],
      s1 * va[1] + s2 * vb[1],
      s1 * va[2] + s2 * vb[2],
    ]));
  }
  return out;
}

/**
 * Initial bearing of the great circle from a to b, measured clockwise from up.
 *
 * This is the direction the bright limb genuinely faces. Everything about the
 * illusion is the difference between this and the direction a straight line
 * drawn on a flat picture seems to go.
 */
export function bearing(a: Horizontal, b: Horizontal): number {
  const dAz = (b.az - a.az) * RAD;
  const y = Math.sin(dAz) * cos(b.alt);
  const x = cos(a.alt) * sin(b.alt) - sin(a.alt) * cos(b.alt) * Math.cos(dAz);
  return norm360(Math.atan2(y, x) * DEG);
}

/* ── projections ──────────────────────────────────────────────────────────── */

export type ProjectionId = "stereographic" | "orthographic" | "gnomonic";

export type Projection = {
  id: ProjectionId;
  label: string;
  note: string;
  /** The point the picture is centred on. */
  centre: Horizontal;
  /** Sky point to unit-disc coordinates, y down. Null when it cannot be shown. */
  project: (h: Horizontal) => [number, number] | null;
};

export const ZENITH: Horizontal = { alt: 90, az: 0 };

type Spec = { label: string; note: string; maxZ: number; radial: (zDeg: number) => number };

const SPECS: Record<ProjectionId, Spec> = {
  stereographic: {
    label: "stereographic",
    note: "what a fisheye lens does, and roughly what your memory of the sky does. Great circles bend.",
    maxZ: 95,
    radial: (z) => Math.tan((z * RAD) / 2) / Math.tan(45 * RAD),
  },
  orthographic: {
    label: "orthographic",
    note: "the sky as a dome seen from outside. Everything crowds towards the horizon.",
    maxZ: 90,
    radial: (z) => sin(z),
  },
  gnomonic: {
    label: "gnomonic",
    note: "an ordinary flat camera, pointed midway between the two. Great circles come out straight — and the gap collapses to nothing.",
    maxZ: 62,
    radial: (z) => Math.tan(z * RAD) / Math.tan(62 * RAD),
  },
};

const dot3 = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (v: Vec): Vec => {
  const n = Math.hypot(v[0], v[1], v[2]);
  return n < 1e-12 ? v : [v[0] / n, v[1] / n, v[2] / n];
};

/**
 * An azimuthal projection about any centre.
 *
 * Screen "up" is the direction towards the zenith as seen from the centre — or
 * north, when the centre *is* the zenith and that direction is degenerate. The
 * handedness then follows the observer automatically: looking up with north at
 * the top puts east on the left, while a camera aimed at the horizon puts it on
 * the right, which is what each of those actually looks like.
 */
export function makeProjection(id: ProjectionId, centre: Horizontal = ZENITH): Projection {
  const spec = SPECS[id];
  const c = toVec(centre);
  const atZenith = centre.alt > 89.9;
  const refT = atZenith ? ([0, 1, 0] as Vec) : unit([-c[0] * c[2], -c[1] * c[2], 1 - c[2] * c[2]]);
  const eastT = unit(cross3(refT, c));

  return {
    id, label: spec.label, note: spec.note, centre,
    project(h) {
      const v = toVec(h);
      const d = Math.min(1, Math.max(-1, dot3(v, c)));
      const z = Math.acos(d) * DEG;
      if (z > spec.maxZ) return null;
      const t = unit([v[0] - d * c[0], v[1] - d * c[1], v[2] - d * c[2]]);
      if (z < 1e-9) return [0, 0];
      const r = spec.radial(z);
      return [-r * dot3(t, eastT), -r * dot3(t, refT)];
    },
  };
}

/** The three, centred on the zenith — the all-sky default. */
export const PROJECTIONS: Projection[] = (
  ["stereographic", "orthographic", "gnomonic"] as ProjectionId[]
).map((id) => makeProjection(id));

/* ── the measurement ──────────────────────────────────────────────────────── */

export type Reading = {
  sun: Equatorial;
  moon: Equatorial;
  sunH: Horizontal;
  moonH: Horizontal;
  phase: Phase;
  /** Bright limb direction in the sky, clockwise from up. Where it really points. */
  limbBearing: number;
  /** Bright limb position angle from celestial north, before the observer's tilt. */
  limbPA: number;
  parallactic: number;
  separation: number;
  bothUp: boolean;
};

export function read(ms: number, site: Site): Reading {
  const s = sun(ms);
  const m = moon(ms);
  const sunH = toHorizontal(ms, site, s);
  const moonH = toHorizontal(ms, site, m);
  const pa = brightLimbPA(s, m);
  const q = parallactic(ms, site, m);
  return {
    sun: s, moon: m, sunH, moonH,
    phase: phase(s, m),
    limbPA: pa,
    parallactic: q,
    // The limb points along the great circle towards the Sun; in the observer's
    // frame that is the equatorial position angle rotated by the parallactic
    // angle. Position angles run north-through-east, which is the opposite turn
    // to this page's bearings, hence the negation — and a test asserts the
    // result equals the great-circle bearing computed the other way entirely.
    limbBearing: norm360(q - pa),
    separation: separation(s, m),
    bothUp: sunH.alt > -1 && moonH.alt > -1,
  };
}

/**
 * The paradox, as a number.
 *
 * `trueBearing` is where the bright limb actually faces. `drawnBearing` is the
 * direction of a straight line drawn on the picture from Moon to Sun. They are
 * not the same, and the gap between them is what people photograph and argue
 * about. It is a property of the projection, not of the sky.
 */
export type Paradox = {
  trueBearing: number;
  drawnBearing: number | null;
  /** Signed, in degrees. Positive means the limb points anticlockwise of the drawn line. */
  gap: number | null;
  /** Unit direction of the bright limb *in the picture*, for drawing. */
  limbVec: [number, number] | null;
  /** Unit direction of the straight line drawn to the Sun, in the picture. */
  chordVec: [number, number] | null;
};

export function paradox(r: Reading, p: Projection): Paradox {
  const m = p.project(r.moonH);
  const su = p.project(r.sunH);
  const none = { trueBearing: r.limbBearing, drawnBearing: null, gap: null, limbVec: null, chordVec: null };
  if (!m || !su) return none;

  /* Both angles are measured *in the picture*, because that is where the
     argument happens — someone looks at a photograph, draws a line from the
     Moon to the Sun, and finds the lit edge is not square to it.

     Measuring them instead as angles-from-up on the sphere would be wrong:
     only stereographic preserves angles, so on any other projection the
     comparison would be contaminated by the projection's own shear rather
     than by the curvature this page is about. */
  const tangent = p.project(alongGreatCircle(r.moonH, r.sunH, 1));
  if (!tangent) return none;

  const lx = tangent[0] - m[0], ly = tangent[1] - m[1];
  const cx = su[0] - m[0], cy = su[1] - m[1];
  if (Math.hypot(lx, ly) < 1e-12 || Math.hypot(cx, cy) < 1e-12) return none;

  const angleOf = (x: number, y: number) => {
    const up = upDirectionAt(r.moonH, p);
    if (!up) return 0;
    return norm360(Math.atan2(up[1] * x - up[0] * y, up[0] * x + up[1] * y) * DEG);
  };

  const gap = norm180(Math.atan2(lx * cy - ly * cx, lx * cx + ly * cy) * -DEG);
  const ln = Math.hypot(lx, ly), cn = Math.hypot(cx, cy);
  return {
    trueBearing: angleOf(lx, ly),
    drawnBearing: angleOf(cx, cy),
    gap,
    limbVec: [lx / ln, ly / ln],
    chordVec: [cx / cn, cy / cn],
  };
}

/**
 * Which way is "up" on the picture, at a given point.
 *
 * Found by projecting a point slightly higher in altitude and taking the
 * difference, so it follows whatever the projection does rather than assuming
 * the screen's own up.
 */
export function upDirectionAt(h: Horizontal, p: Projection): [number, number] | null {
  const eps = 0.05;
  const here = p.project(h);
  const above = p.project({ alt: Math.min(89.999, h.alt + eps), az: h.az });
  if (!here || !above) return null;
  const dx = above[0] - here[0], dy = above[1] - here[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return null;
  return [dx / len, dy / len];
}

/**
 * The next moment worth looking at.
 *
 * Most of the time the Sun and Moon are not both up, and an empty sky teaches
 * nothing. Nor does a full Moon: when the disc is almost wholly lit there is
 * barely a terminator to point anywhere, so the effect is real but invisible.
 *
 * So this scores by the thing the page exists to show — the actual gap under
 * the given projection — and only among moments where the phase is clearly
 * directional and both bodies are comfortably up.
 */
export function findMoment(
  fromMs: number,
  site: Site,
  projection: Projection = PROJECTIONS[0],
  hours = 24 * 45
): number | null {
  let best: number | null = null;
  let bestScore = -1;
  for (let i = 0; i < hours * 2; i++) {
    const t = fromMs + i * 1800000;
    const r = read(t, site);
    if (r.sunH.alt < 6 || r.moonH.alt < 6) continue;
    // A crescent or a quarter reads; a nearly full or nearly new Moon does not.
    if (r.phase.illuminated < 0.12 || r.phase.illuminated > 0.62) continue;
    const g = paradox(r, projection).gap;
    if (g === null) continue;
    const score = Math.abs(g);
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best;
}
