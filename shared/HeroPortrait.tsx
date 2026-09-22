import { HERO_FRAMES, HERO_ATLAS_SIZE } from '@/merged/frames';
import { animations, poseClip } from './hero-animation';
export default function HeroPortrait({
  hero,
  height = 50,
}: {
  hero: number;
  height?: number;
}) {
  if (hero < 0) return <span>＋</span>;
  const lib = animations[hero],
    clip = hero <= 2 ? 'idle' : hero === 3 ? 'slash' : 'crouch',
    pose = lib ? poseClip(hero, clip)! : null,
    f = pose ? pose.frames[0] : HERO_FRAMES[hero],
    starter = hero <= 2 ? pose?.frames[0] : undefined,
    s = height / (starter?.visibleHeight ?? f.h),
    trimTop = starter ? starter.anchorY - starter.visibleHeight : 0;
  return (
    <span className="merged-portrait" style={{ width: f.w * s, height }}>
      <img
        alt=""
        draggable={false}
        src={
          lib
            ? `/assets/animations/${lib.folder}/${clip}.png`
            : '/assets/merged/heroes.png'
        }
        style={{
          width: (lib ? (pose?.sheetWidth ?? 1774) : HERO_ATLAS_SIZE[0]) * s,
          height: (lib ? (pose?.sheetHeight ?? 887) : HERO_ATLAS_SIZE[1]) * s,
          left: -f.x * s,
          top: -(f.y + trimTop) * s,
        }}
      />
    </span>
  );
}
