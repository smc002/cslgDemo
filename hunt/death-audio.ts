import type { HuntGame } from './simulation';
import { bodyDeathPose } from './body-death-vfx';

/** Quiet grounded impacts; only unlocked by the player's own input. */
export class DeathAudio {
  private context?: AudioContext;
  private seen = new Set<string>();
  private last = -1;
  unlock() {
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
    } catch {
      /* Audio is optional on restricted browsers. */
    }
  }
  update(game: HuntGame) {
    if (!game.active || game.paused || document.hidden) return;
    const marks = game.effects
      .filter((e) => e.kind === 'kill' || e.kind === 'ammoReturn')
      .map((e) => ({
        id: `fx-${e.id}`,
        kind: e.species,
        age: e.age - (e.kind === 'ammoReturn' ? 0.5 : 0),
      }));
    if (game.courierVictory)
      marks.push({
        id: `courier-${game.save.courier.completed}`,
        kind: 9,
        age: game.courierVictory.age,
      });
    const live = new Set(marks.map((m) => m.id));
    for (const id of this.seen) if (!live.has(id)) this.seen.delete(id);
    for (const mark of marks) {
      const pose = bodyDeathPose(mark.kind, mark.age);
      if (!pose || mark.age < pose.landedAt || this.seen.has(mark.id)) continue;
      this.seen.add(mark.id);
      if (mark.age - pose.landedAt > 0.2) continue;
      const c = this.context;
      if (!c || c.state !== 'running' || c.currentTime - this.last < 0.14)
        continue;
      this.last = c.currentTime;
      const heavy = pose.style === 'heavy',
        oscillator = c.createOscillator(),
        gain = c.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(heavy ? 85 : 125, c.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        heavy ? 32 : 55,
        c.currentTime + 0.13,
      );
      gain.gain.setValueAtTime(0, c.currentTime);
      gain.gain.linearRampToValueAtTime(
        heavy ? 0.1 : 0.045,
        c.currentTime + 0.008,
      );
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
      oscillator.connect(gain);
      gain.connect(c.destination);
      oscillator.start();
      oscillator.stop(c.currentTime + 0.2);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    }
  }
  dispose() {
    void this.context?.close().catch(() => {});
    this.context = undefined;
    this.seen.clear();
  }
}
