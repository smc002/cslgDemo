/* eslint-disable next/no-img-element -- Pixel-exact sprite crop uses the shared PNG source. */
import { HERO_ART, TOY_META, heroImage } from './toy-art';
export default function HeroPortrait({
  hero,
  height = 50,
}: {
  hero: number;
  height?: number;
}) {
  if (hero < 0) return <span>＋</span>;
  const id = HERO_ART[hero][0],
    m = TOY_META[id],
    b = m.bounds,
    s = height / (b[3] - b[1]);
  return (
    <span
      className="merged-portrait"
      style={{
        width: (b[2] - b[0]) * s,
        height,
        display: 'inline-block',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <img
        alt={HERO_ART[hero][1]}
        draggable={false}
        src={heroImage(hero)}
        style={{
          position: 'absolute',
          width: m.width * s,
          height: m.height * s,
          maxWidth: 'none',
          left: -b[0] * s,
          top: -b[1] * s,
        }}
      />
    </span>
  );
}
