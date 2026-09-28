import Dome from "@/components/Dome";

export default function Page() {
  return (
    <>
      <Dome />
      <section className="border-t border-rim px-4 py-8 sm:px-6">
        <div className="grid max-w-[1100px] gap-x-10 gap-y-7 md:grid-cols-3">
          <div>
            <h2 className="tag">the argument</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-mid">
              The Moon is lit by the Sun, so its bright edge must face the Sun. Photograph both at
              once and it often plainly doesn’t — the lit side points somewhere above. The “Lunar
              Terminator Paradox” reached the HN front page and the thread underneath it filled up
              with people saying they couldn’t follow the explanation:
            </p>
            <blockquote className="mt-3 border-l-2 border-rim pl-3 text-[12.5px] leading-relaxed text-ink">
              “I was also confused by the article, but I’ve noticed that I’m not the only one… the
              angle depends on the latitude of the viewer. It’s not super intuitive.”
            </blockquote>
            <p className="mt-3 text-[12.5px] leading-relaxed text-mid">
              Somebody asked for the obvious thing: “perhaps the render should use the real
              positions for all three objects, at a time given by the user.” So here it is.
            </p>
          </div>

          <div>
            <h2 className="tag">the answer, and how to check it</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-mid">
              Nothing is wrong with the Moon. The lit edge does face the Sun — along the{" "}
              <span style={{ color: "var(--arc)" }}>great circle</span>, which is the actual path
              across the sky. The{" "}
              <span style={{ color: "var(--chord)" }}>straight line</span> your eye draws between
              two points on a curved sky is a different line, and the angle between them is the
              whole illusion.
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-mid">
              Which means the effect belongs to the <em>picture</em>, not the sky. Switch to{" "}
              <span className="text-ink">gnomonic</span> — what an ordinary flat camera does, and
              the one projection that keeps great circles straight — and the gap collapses to zero.
              That is the test: if the explanation were wrong, it wouldn’t.
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-mid">
              A test in the repo asserts exactly that, across hundreds of dates and three latitudes:
              under gnomonic the gap stays below 0.05°, under stereographic it exceeds 3°.
            </p>
          </div>

          <div>
            <h2 className="tag">how accurate this is</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-mid">
              Low-precision series from Meeus: the Sun to about an arcminute, the Moon to a few.
              Refraction and topocentric parallax are ignored. That is far finer than an effect
              measured in whole degrees, but it is not an ephemeris — don’t plan an occultation
              with it.
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-mid">
              The positions are checked against physics rather than against a table: the solstice
              declination has to come out at the obliquity, the equinoxes have to land on the right
              days, perigee and apogee have to fall in range, and the mean synodic month has to
              reproduce 29.5306 days from the series alone.
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-mid">
              The Moon is drawn far larger than it is, or you could not see the phase at all. Its{" "}
              <em>orientation</em> and phase are real; only the size is a lie, and the slider says
              by how much.
            </p>
            <p className="mt-4 text-[12.5px] leading-relaxed text-mid">
              <a href="https://github.com/nickzsche21/limb" className="underline decoration-rim underline-offset-4 hover:text-ink">
                source
              </a>{" "}
              · 112 assertions · runs entirely in your browser
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
