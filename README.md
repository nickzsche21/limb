# LIMB

**Why the Moon doesn't point at the Sun.**

The Moon is lit by the Sun, so its bright edge must face the Sun. Photograph both at once and it
plainly doesn't — the lit side points somewhere above. Pick a place, a time and a projection, and
watch the great circle bend away from the line you would have drawn.

---

## Why

The “Lunar Terminator Paradox” reached the HN front page and the thread underneath filled up with
people who couldn't follow the explanation:

> “I was also confused by the article, but I've noticed that I'm not the only one… the angle
> depends on the latitude of the viewer. It's not super intuitive.”

Others reached for ping-pong balls and basketballs, and one linked an eleven-year-old video. Then
somebody asked for the obvious thing:

> “Perhaps the render should use the real sizes and positions for all three objects, at a time
> given by the user.”

So here it is.

## The answer, and how to check it

Nothing is wrong with the Moon. The lit edge *does* face the Sun — along the **great circle**, which
is the real path across the sky. The **straight line** your eye draws between two points on a curved
sky is a different line, and the angle between them is the whole illusion.

Which means the effect belongs to the *picture*, not the sky. Switch to **gnomonic** — an ordinary
flat camera, the one projection that keeps great circles straight — and the gap collapses to zero.
That is the test: if the explanation were wrong, it wouldn't.

A test asserts exactly that across hundreds of dates and three latitudes: under gnomonic the gap
stays below **0.05°**, under stereographic it exceeds **3°**.

## Two mistakes worth recording

**Measuring the gap as two angles from “up” was wrong.** Only stereographic is conformal. On any
other projection, comparing an angle on the sphere with an angle on the screen smuggles in the
projection's own shear — which showed up as a 22° error under gnomonic, where the answer has to be
zero. The gap is measured *in the picture*, between the limb's projected tangent and the drawn
chord, because that is what a person measures on a photograph.

**The classical route came out backwards.** Position angle minus parallactic angle gave the exact
negative of the great-circle bearing, because position angles run north-through-east and this page's
bearings turn the other way. Two independent derivations of the same physical direction now agree to
0.02°, and that agreement is asserted rather than assumed.

## How accurate this is

Low-precision series from Meeus: the Sun to about an arcminute, the Moon to a few. Refraction and
topocentric parallax are ignored. Far finer than an effect measured in whole degrees — but this is
not an ephemeris, so don't plan an occultation with it.

The positions are checked against physics rather than against a table. The solstice declination has
to come out at the obliquity, the equinoxes have to land on the right days, perigee and apogee have
to fall in range, and the mean synodic month has to reproduce **29.5306 days** from the series alone.

The Moon is drawn far larger than it is, or you could not see the phase at all. Its *orientation* and
phase are real; only the size is a lie, and the slider says by how much.

```bash
npm install
npm test      # 118 assertions
npm run dev
```

Runs entirely in your browser. MIT.
