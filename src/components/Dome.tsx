"use client";

import { useEffect, useMemo, useState } from "react";
import {
  read, paradox, greatCircle, findMoment, makeProjection, alongGreatCircle, PROJECTIONS,
  type Horizontal, type Projection, type ProjectionId, type Site,
} from "@/lib/sky";

/** A ring of constant altitude, as this projection happens to draw it. */
const ring = (alt: number): Horizontal[] =>
  Array.from({ length: 145 }, (_, i) => ({ alt, az: (i * 360) / 144 }));

const TRUE_MOON_DEG = 0.52;

/** The lit crescent or gibbous, drawn with the bright limb towards +x. */
function phasePath(R: number, phaseAngleDeg: number): string {
  const c = Math.cos((phaseAngleDeg * Math.PI) / 180);
  const rx = R * Math.abs(c);
  const sweep = c >= 0 ? 1 : 0;
  return `M 0 ${-R} A ${R} ${R} 0 0 1 0 ${R} A ${rx.toFixed(5)} ${R} 0 0 ${sweep} 0 ${-R} Z`;
}

/** Projected polylines, split wherever the path leaves the picture. */
function runs(points: Horizontal[], p: Projection): string[] {
  const out: string[] = [];
  let cur: string[] = [];
  for (const h of points) {
    const xy = p.project(h);
    if (!xy) { if (cur.length > 1) out.push(cur.join(" ")); cur = []; continue; }
    cur.push(`${xy[0].toFixed(5)},${xy[1].toFixed(5)}`);
  }
  if (cur.length > 1) out.push(cur.join(" "));
  return out;
}

export default function Dome() {
  const [site, setSite] = useState<Site>({ lat: 19.08, lon: 72.88 });
  const [base, setBase] = useState<number | null>(null);
  const [offsetH, setOffsetH] = useState(0);
  const [projId, setProjId] = useState<ProjectionId>("stereographic");
  const [exagg, setExagg] = useState(42);

  // Open on a moment when both are actually up; an empty sky teaches nothing.
  useEffect(() => {
    if (base !== null) return;
    setBase(findMoment(Date.now(), site) ?? Date.now());
  }, [base, site]);

  const ms = base === null ? null : base + offsetH * 3600000;

  const r = useMemo(() => (ms === null ? null : read(ms, site)), [ms, site]);

  /* The all-sky views look straight up. A gnomonic picture is a camera, and a
     camera gets pointed midway between the two things you want in frame — which
     is also the only way both fit inside a rectilinear field at all. */
  const proj = useMemo<Projection>(() => {
    if (projId !== "gnomonic" || !r || !r.bothUp) return makeProjection(projId);
    return makeProjection("gnomonic", alongGreatCircle(r.moonH, r.sunH, r.separation / 2));
  }, [projId, r]);
  const px = useMemo(() => (r ? paradox(r, proj) : null), [r, proj]);
  const arc = useMemo(
    () => (r && r.bothUp ? runs(greatCircle(r.moonH, r.sunH, 180), proj) : []),
    [r, proj]
  );

  const gapMag = px?.gap === null || px?.gap === undefined ? 0 : Math.abs(px.gap);
  useEffect(() => {
    const c = gapMag < 1 ? "var(--ink-dim)" : gapMag < 6 ? "var(--arc)" : "var(--chord)";
    document.documentElement.style.setProperty("--gap", c);
  }, [gapMag]);

  if (!r || ms === null || base === null) {
    return <div className="flex h-screen items-center justify-center tag">finding a moment when both are up…</div>;
  }

  const m = proj.project(r.moonH);
  const s = proj.project(r.sunH);
  const allSky = proj.centre.alt > 89.9;
  const horizon = runs(ring(0), proj);
  const grid = [30, 60].map((a) => runs(ring(a), proj));
  const moonR = (TRUE_MOON_DEG / 180) * exagg;
  const limbAngle = px?.limbVec ? (Math.atan2(px.limbVec[1], px.limbVec[0]) * 180) / Math.PI : 0;

  const when = new Date(ms);
  const stamp = when.toISOString().replace("T", " ").slice(0, 16) + " UTC";

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* ── the sky ────────────────────────────────────────────────────── */}
      <svg viewBox="-1.28 -1.28 2.56 2.56" className="h-[100svh] w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="sky" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--dome)" />
            <stop offset="100%" stopColor="var(--dome-edge)" />
          </radialGradient>
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--sun)" stopOpacity="0.75" />
            <stop offset="100%" stopColor="var(--sun)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {allSky ? (
          <circle cx="0" cy="0" r="1" fill="url(#sky)" stroke="var(--rim)" strokeWidth="0.004" />
        ) : (
          <rect x="-1.06" y="-0.72" width="2.12" height="1.44" fill="url(#sky)"
            stroke="var(--rim)" strokeWidth="0.006" />
        )}
        {grid.map((rs, i) =>
          rs.map((pts, j) => (
            <polyline key={`g${i}-${j}`} points={pts} fill="none" stroke="var(--grid)" strokeWidth="0.003" />
          ))
        )}
        {horizon.map((pts, i) => (
          <polyline key={`h${i}`} points={pts} fill="none" stroke="var(--rim)" strokeWidth="0.005" />
        ))}

        {/* Looking up, east falls on the left; through a camera aimed at the
            horizon it falls on the right. Both come out of the projection
            rather than being written in by hand. */}
        {([["N", 0], ["E", 90], ["S", 180], ["W", 270]] as const).map(([l, az]) => {
          const at = proj.project({ alt: 0, az });
          if (!at) return null;
          const k = allSky ? 1.075 : 1;
          return (
            <text key={l} x={at[0] * k} y={at[1] * k - (allSky ? 0 : 0.03)} fill="var(--ink-dim)"
              fontSize="0.055" textAnchor="middle" dominantBaseline="middle"
              fontFamily="var(--font-sans)">{l}</text>
          );
        })}

        {r.bothUp && m && s && (
          <>
            {/* The straight line you would draw on the photograph. */}
            <line x1={m[0]} y1={m[1]} x2={s[0]} y2={s[1]}
              stroke="var(--chord)" strokeWidth="0.007" strokeDasharray="0.026 0.018" opacity="1" />
            {/* The path the light actually takes across the sky. */}
            {arc.map((pts, i) => (
              <polyline key={i} points={pts} fill="none" stroke="var(--arc)" strokeWidth="0.006" opacity="0.95" />
            ))}
            {/* Where the lit edge is genuinely facing, drawn from the Moon so the
                two directions can be seen parting company at their origin. */}
            {px?.limbVec && (
              <line x1={m[0]} y1={m[1]}
                x2={m[0] + px.limbVec[0] * 0.3} y2={m[1] + px.limbVec[1] * 0.3}
                stroke="var(--arc)" strokeWidth="0.009" opacity="0.95" strokeLinecap="round" />
            )}
          </>
        )}

        {s && (
          <g>
            <circle cx={s[0]} cy={s[1]} r={moonR * 3.2} fill="url(#sunGlow)" />
            <circle cx={s[0]} cy={s[1]} r={Math.max(0.012, moonR * 0.85)} fill="var(--sun)" />
          </g>
        )}

        {m && (
          <g transform={`translate(${m[0]} ${m[1]}) rotate(${limbAngle})`}>
            <circle cx="0" cy="0" r={moonR} fill="#1a1d2b" stroke="#2b3145" strokeWidth="0.0035" />
            <path d={phasePath(moonR, r.phase.phaseAngle)} fill="var(--moon)" />
          </g>
        )}
      </svg>

      {/* ── corners ────────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 p-3 sm:p-5">
        <div className="flex h-full flex-col justify-between gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="corner pointer-events-auto px-3 py-2">
              <div className="text-[14px] font-bold tracking-[0.2em]">LIMB</div>
              <div className="tag mt-0.5">why the moon doesn’t point at the sun</div>
            </div>

            <div className="corner pointer-events-auto px-3 py-2 text-right">
              <div className="tag">the lit edge misses the sun by</div>
              <div className="readout mt-1 text-[clamp(30px,7vw,60px)]" style={{ color: "var(--gap)" }}>
                {px?.gap === null || px?.gap === undefined ? "—" : `${Math.abs(px.gap).toFixed(1)}°`}
              </div>
              <div className="tag mt-1">
                {!r.bothUp ? "not both above the horizon" : gapMag < 1 ? "the picture is honest here" : "of arc, in this projection"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="corner pointer-events-auto w-full max-w-[330px] px-3 py-2.5">
              <Row label="latitude" value={`${site.lat.toFixed(1)}°`}>
                <input type="range" min={-66} max={66} step={0.5} value={site.lat}
                  onChange={(e) => setSite((v) => ({ ...v, lat: +e.target.value }))} />
              </Row>
              <Row label="when" value={stamp}>
                <input type="range" min={-72} max={72} step={0.25} value={offsetH}
                  onChange={(e) => setOffsetH(+e.target.value)} />
              </Row>
              <Row label="moon drawn at" value={`${exagg}× actual size`}>
                <input type="range" min={1} max={60} step={1} value={exagg}
                  onChange={(e) => setExagg(+e.target.value)} />
              </Row>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="text-dim">phase</span>
                <span className="text-ink">{(r.phase.illuminated * 100).toFixed(0)}% lit</span>
                <span className="text-dim">·</span>
                <span className="text-dim">separation</span>
                <span className="text-ink">{r.separation.toFixed(0)}°</span>
                <button className="ml-auto underline decoration-rim underline-offset-4 hover:text-ink"
                  onClick={() => { setOffsetH(0); setBase(findMoment(Date.now(), site) ?? Date.now()); }}>
                  jump to a good moment
                </button>
              </div>
            </div>

            <div className="corner pointer-events-auto w-full max-w-[330px] px-3 py-2.5">
              <div className="tag">projection</div>
              <div className="mt-1.5 flex gap-1">
                {PROJECTIONS.map((p) => (
                  <button key={p.id} onClick={() => setProjId(p.id)}
                    className="border px-2 py-1 text-[11px] transition-colors"
                    style={{
                      borderColor: projId === p.id ? "var(--arc)" : "var(--rim)",
                      color: projId === p.id ? "var(--ink)" : "var(--ink-mid)",
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-mid">{proj.note}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                <span style={{ color: "var(--arc)" }}>— where the light goes</span>
                <span style={{ color: "var(--chord)" }}>-- the line you draw</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="tag">{label}</span>
        <span className="text-[11px] text-ink">{value}</span>
      </div>
      {children}
    </div>
  );
}
