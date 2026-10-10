import type { WeaponStateArt } from './weapon-state-vfx';

export type CombatArt = WeaponStateArt & {
  metal: (HTMLImageElement | undefined)[];
  body: (HTMLImageElement | undefined)[];
  core?: HTMLImageElement;
  ticket?: HTMLImageElement;
  specialPlaque?: HTMLImageElement;
  jackpotPlaque?: HTMLImageElement;
  courierDeath: (HTMLImageElement | undefined)[];
};
export async function loadCombatArt(
  load: (url: string) => Promise<HTMLImageElement>,
): Promise<CombatArt> {
  // Cosmetic assets fail independently; a missing decoration must not block combat.
  const asset = (name: string) =>
    load(`/assets/hunt/combat-v2/${name}.png`).catch(() => undefined);
  const [
    metal,
    body,
    core,
    ticket,
    specialPlaque,
    jackpotPlaque,
    leftPlate,
    rightPlate,
    amberCoil,
    cyanCoil,
    courierDeath,
  ] = await Promise.all([
    Promise.all([0, 1, 2, 3].map((i) => asset(`metal-hit-${i}`))),
    Promise.all([0, 1, 2, 3].map((i) => asset(`body-hit-${i}`))),
    asset('core'),
    asset('ticket'),
    asset('special-plaque'),
    asset('jackpot-plaque'),
    asset('left-plate'),
    asset('right-plate'),
    asset('amber-coil'),
    asset('cyan-coil'),
    Promise.all(
      [0, 1].map((i) =>
        load(`/assets/hunt/courier-death-v1/death-${i}.png`).catch(
          () => undefined,
        ),
      ),
    ),
  ]);
  return {
    metal,
    body,
    core,
    ticket,
    specialPlaque,
    jackpotPlaque,
    leftPlate,
    rightPlate,
    amberCoil,
    cyanCoil,
    courierDeath,
  };
}
