import {
  makeProjection, alongGreatCircle, findMoment, sun, moon, phase, separation, toHorizontal, parallactic, hourAngle, gmst,
  greatCircle, bearing, toVec, fromVec, read, paradox, PROJECTIONS, upDirectionAt,
  norm180, norm360, type Site,
} from "./sky";

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean) => { if (c) pass++; else fails.push(n); };
const near = (n: string, a: number, b: number, tol: number) =>
  ok(`${n} (got ${a.toFixed(4)}, want ${b} ±${tol})`, Math.abs(a - b) <= tol);

const T = (iso: string) => Date.parse(iso + "Z");
const DAY = 86400000;

/* ── the Sun, checked against the seasons rather than a table ───────────── */
{
  let maxDec = -99, minDec = 99, maxAt = 0, minAt = 0;
  const crossings: number[] = [];
  let prev = sun(T("2026-01-01T00:00:00")).dec;
  for (let i = 1; i <= 365 * 4; i++) {
    const t = T("2026-01-01T00:00:00") + i * DAY / 4;
    const dec = sun(t).dec;
    if (dec > maxDec) { maxDec = dec; maxAt = t; }
    if (dec < minDec) { minDec = dec; minAt = t; }
    if (prev < 0 && dec >= 0) crossings.push(t);
    prev = dec;
  }
  // The obliquity of the ecliptic is a measured constant; the solstices must hit it.
  near("solstice declination equals the obliquity", maxDec, 23.44, 0.05);
  near("and the southern one mirrors it", minDec, -23.44, 0.05);

  const jun = new Date(maxAt).toISOString().slice(0, 10);
  const dec = new Date(minAt).toISOString().slice(0, 10);
  ok(`June solstice lands on the right day (got ${jun})`, jun >= "2026-06-20" && jun <= "2026-06-22");
  ok(`December solstice lands on the right day (got ${dec})`, dec >= "2026-12-20" && dec <= "2026-12-22");
  const mar = new Date(crossings[0]).toISOString().slice(0, 10);
  ok(`March equinox lands on the right day (got ${mar})`, mar >= "2026-03-19" && mar <= "2026-03-21");

  // Earth's orbit is slightly eccentric: perihelion in early January.
  const jan = sun(T("2026-01-04T00:00:00")).dist;
  const jul = sun(T("2026-07-05T00:00:00")).dist;
  ok("the Sun is nearer in January than in July", jan < jul);
  near("perihelion distance", jan / 1.496e8, 0.983, 0.002);
}

/* ── the Moon, checked against the synodic month ────────────────────────── */
{
  // Find successive conjunctions by watching the elongation bottom out.
  const news: number[] = [];
  let prevElong = separation(sun(T("2026-01-01T00:00:00")), moon(T("2026-01-01T00:00:00")));
  let rising = false;
  for (let i = 1; i < 24 * 400; i++) {
    const t = T("2026-01-01T00:00:00") + i * 3600000;
    const e = separation(sun(t), moon(t));
    if (e > prevElong) rising = true;
    else if (rising) { news.push(t); rising = false; }
    prevElong = e;
  }
  ok(`found a year of new moons (got ${news.length})`, news.length >= 12);
  const gaps = news.slice(1).map((t, i) => (t - news[i]) / DAY);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  // The synodic month is 29.530588 days. This is the strongest check available
  // without an ephemeris: the series has to reproduce it from scratch.
  near("mean synodic month", mean, 29.530588, 0.05);

  let dmin = 1e9, dmax = 0;
  for (let i = 0; i < 24 * 400; i++) {
    const d = moon(T("2026-01-01T00:00:00") + i * 3600000).dist;
    dmin = Math.min(dmin, d); dmax = Math.max(dmax, d);
  }
  ok(`perigee is in range (got ${dmin.toFixed(0)} km)`, dmin > 355000 && dmin < 363000);
  ok(`apogee is in range (got ${dmax.toFixed(0)} km)`, dmax > 404000 && dmax < 407000);
}

/* ── phase ──────────────────────────────────────────────────────────────── */
{
  for (let i = 0; i < 24 * 60; i++) {
    const t = T("2026-01-01T00:00:00") + i * 3600000;
    const s = sun(t), m = moon(t), p = phase(s, m);
    if (p.elongation > 179) near("full moon is fully lit", p.illuminated, 1, 0.001);
    if (p.elongation < 1.5) ok("new moon is dark", p.illuminated < 0.001);
  }
  const anyT = T("2026-05-05T12:00:00");
  const p = phase(sun(anyT), moon(anyT));
  ok("illuminated fraction stays in range", p.illuminated >= 0 && p.illuminated <= 1);
  ok("elongation stays in range", p.elongation >= 0 && p.elongation <= 180);
}

/* ── the observer's frame ───────────────────────────────────────────────── */
{
  const site: Site = { lat: 51.48, lon: 0 };
  ok("sidereal time advances ~360.9856°/day",
    Math.abs(norm180(gmst(T("2026-03-01T00:00:00") + DAY) - gmst(T("2026-03-01T00:00:00"))) - 0.9856) < 0.01);

  // On the meridian the parallactic angle vanishes: the body's north is straight up.
  const t = T("2026-06-21T12:00:00");
  const s = sun(t);
  const lonForMeridian = norm180(s.ra - gmst(t));
  const q = parallactic(t, { lat: 40, lon: lonForMeridian }, s);
  near("parallactic angle is zero on the meridian", Math.abs(norm180(q)), 0, 0.01);
  near("hour angle is zero there too", Math.abs(hourAngle(t, { lat: 40, lon: lonForMeridian }, s)), 0, 0.01);

  // At the equator on an equinox the noon Sun is overhead.
  const eq = T("2026-03-20T12:00:00");
  const se = sun(eq);
  const h = toHorizontal(eq, { lat: 0, lon: norm180(se.ra - gmst(eq)) }, se);
  ok(`equinox noon Sun is near the zenith at the equator (got ${h.alt.toFixed(2)}°)`, h.alt > 89);

  // Round trip through the unit sphere.
  for (const p of [{ alt: 0, az: 0 }, { alt: 45, az: 123 }, { alt: -20, az: 300 }, { alt: 89, az: 45 }]) {
    const back = fromVec(toVec(p));
    near(`alt round trip ${p.az}`, back.alt, p.alt, 1e-9);
    near(`az round trip ${p.az}`, norm180(back.az - p.az), 0, 1e-9);
  }
}

/* ── great circles and bearings ─────────────────────────────────────────── */
{
  const a = { alt: 10, az: 0 }, b = { alt: 10, az: 90 };
  const arc = greatCircle(a, b, 64);
  near("arc starts at a", arc[0].alt, a.alt, 1e-9);
  near("arc ends at b", arc[arc.length - 1].alt, b.alt, 1e-9);
  // A great circle between two equal-altitude points bulges towards the zenith.
  const mid = arc[32];
  ok(`the arc rises above its endpoints (got ${mid.alt.toFixed(2)}°)`, mid.alt > a.alt + 1);

  // Two independent routes to the same physical direction: the classical
  // position-angle-minus-parallactic-angle, and a plain great-circle bearing.
  for (const site of [{ lat: 51, lon: 0 }, { lat: -34, lon: 151 }, { lat: 3, lon: 101 }]) {
    for (let d = 0; d < 120; d += 7) {
      const t = T("2026-02-01T00:00:00") + d * DAY + (d % 17) * 3600000;
      const r = read(t, site);
      if (r.separation < 5) continue;
      near(`limb bearing equals the great-circle bearing (lat ${site.lat}, day ${d})`,
        Math.abs(norm180(r.limbBearing - bearing(r.moonH, r.sunH))), 0, 0.02);
    }
  }

  near("bearing straight up is zero", bearing({ alt: 0, az: 0 }, { alt: 45, az: 0 }), 0, 1e-6);
  near("bearing along the horizon is 90", bearing({ alt: 0, az: 0 }, { alt: 0, az: 90 }), 90, 1e-6);
  near("bearing straight down is 180", norm360(bearing({ alt: 40, az: 0 }, { alt: 0, az: 0 })), 180, 1e-6);
}

/* ── THE CLAIM ──────────────────────────────────────────────────────────────
   A gnomonic projection maps great circles to straight lines. So if the bright
   limb really does point along the great circle to the Sun, then in a gnomonic
   picture the drawn line and the limb must agree — the paradox has to vanish.
   If this fails, the explanation on the page is wrong.                        */
{
  const stereo = PROJECTIONS.find((p) => p.id === "stereographic")!;
  let checked = 0, worstGnomonic = 0, bestStereo = 0;

  for (let d = 0; d < 300; d++) {
    for (const site of [{ lat: 51, lon: 0 }, { lat: 19, lon: 73 }, { lat: -34, lon: 151 }]) {
      const t = T("2026-01-01T00:00:00") + d * DAY + (d % 24) * 3600000;
      const r = read(t, site);
      if (!r.bothUp) continue;
      if (r.moonH.alt < 5 || r.sunH.alt < 5) continue;
      if (r.separation < 15 || r.separation > 110) continue; // must fit one camera frame
      // A real camera is aimed midway between them, not at the zenith.
      const mid = alongGreatCircle(r.moonH, r.sunH, r.separation / 2);
      const g = paradox(r, makeProjection("gnomonic", mid));
      if (g.gap === null) continue;
      checked++;
      worstGnomonic = Math.max(worstGnomonic, Math.abs(g.gap));
      const s = paradox(r, stereo);
      if (s.gap !== null) bestStereo = Math.max(bestStereo, Math.abs(s.gap));
    }
  }
  ok(`checked a useful number of configurations (got ${checked})`, checked > 40);
  // Gnomonic maps great circles to straight lines, so the tangent the limb
  // follows and the chord someone draws are the same line. If this fails, the
  // explanation this page gives is wrong.
  ok(`gnomonic makes the paradox vanish (worst gap ${worstGnomonic.toFixed(4)}°)`, worstGnomonic < 0.05);
  ok(`stereographic does not (largest gap ${bestStereo.toFixed(1)}°)`, bestStereo > 3);
}

/* ── projections behave ─────────────────────────────────────────────────── */
{
  for (const p of PROJECTIONS) {
    const zen = p.project({ alt: 90, az: 0 })!;
    near(`${p.id}: the zenith is the centre`, Math.hypot(zen[0], zen[1]), 0, 1e-9);
    const n = p.project({ alt: 30, az: 0 })!;
    ok(`${p.id}: north is towards the top`, n[1] < 0 && Math.abs(n[0]) < 1e-9);
    const e = p.project({ alt: 30, az: 90 })!;
    ok(`${p.id}: looking up, east is on the left`, e[0] < 0);
    const up = upDirectionAt({ alt: 30, az: 210 }, p)!;
    ok(`${p.id}: up is a unit vector`, Math.abs(Math.hypot(up[0], up[1]) - 1) < 1e-6);
  }
  ok("orthographic drops what is below the horizon", PROJECTIONS.find(p => p.id === "orthographic")!.project({ alt: -10, az: 0 }) === null);
}

/* ── the page has to open on something worth seeing ─────────────────────── */
{
  for (const site of [{ lat: 51, lon: 0 }, { lat: 19, lon: 73 }, { lat: -34, lon: 151 }]) {
    const t = findMoment(T("2026-09-28T00:00:00"), site);
    ok(`a visible moment exists at lat ${site.lat}`, t !== null);
    if (t !== null) {
      const r = read(t, site);
      ok(`and both bodies are actually up there (lat ${site.lat})`, r.sunH.alt > 5 && r.moonH.alt > 5);
      ok(`with a phase you can actually read (lat ${site.lat}, ${(r.phase.illuminated * 100).toFixed(0)}% lit)`,
        r.phase.illuminated > 0.1 && r.phase.illuminated < 0.9);
      const g = paradox(r, PROJECTIONS[0]).gap;
      ok(`and a gap worth showing (lat ${site.lat}, got ${g?.toFixed(1)}°)`, g !== null && Math.abs(g) > 4);
    }
  }
}

console.log(fails.length ? `✗ ${fails.length} failed of ${pass + fails.length}` : `✓ ${pass} assertions pass`);
for (const f of fails) console.log("  ✗", f);
process.exit(fails.length ? 1 : 0);
