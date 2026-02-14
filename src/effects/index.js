/**
 * Effects manager.
 * Each effect module exports { init(), destroy() }.
 * Register effects here, then activate one by name.
 *
 * To add a new effect:
 *   1. Create src/effects/myeffect.js with init() and destroy() exports
 *   2. Import and register it in the `effects` map below
 *   3. Set ACTIVE_EFFECT to its key (or change it at runtime via setEffect)
 */

import { initPetals, destroyPetals } from './petals.js';
import { initWater, destroyWater } from './water.js';

const effects = {
  petals: { init: initPetals, destroy: destroyPetals },
  water: { init: initWater, destroy: destroyWater },
};

let activeEffect = null;

export function startEffect(name) {
  // Tear down current effect if one is running
  stopEffect();

  const effect = effects[name];
  if (!effect) return;

  effect.init();
  activeEffect = name;
}

export function stopEffect() {
  if (activeEffect && effects[activeEffect]) {
    effects[activeEffect].destroy();
  }
  activeEffect = null;
}

export function getActiveEffect() {
  return activeEffect;
}

export function getAvailableEffects() {
  return Object.keys(effects);
}
