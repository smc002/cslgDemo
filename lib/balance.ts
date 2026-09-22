// First playable tuning; approved rules, provisional amounts and timings.
export const BALANCE = {
  wavesPerStage: 3,
  ammoPerStage: 120,
  ammoStageStep: 15,
  corePerTicket: 200,
  maxStars: 3,
  cityUnlock: 2,
  secondLane: 2,
  thirdLane: 4,
  cityStarterMaterials: 100,
  workshopPeriod: 30,
  factoryPeriod: 45,
  storageCycles: 20,
  emergencyAmmo: 80,
  emergencyCooldown: 180000,
  emergencyUses: 3,
};
export const stageAmmo = (stage: number) =>
  BALANCE.ammoPerStage + Math.min(20, stage - 1) * BALANCE.ammoStageStep;
