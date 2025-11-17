// This file will handle the creation and updating of all visual particles.
// This includes particles from rock smashes, water splashes, dust clouds, etc.
import type { ParticleState, Season } from '../types';
import { GRAVITY } from '../constants';

// --- Particle Creation Functions ---

export function createRockParticles(
  rock: { x: number; y: number; size: number; id: number },
  isGolden: boolean = false
): ParticleState[] {
  const particlesToCreate: ParticleState[] = [];
  const numParticles = 8 + Math.floor(rock.size / 4);
  const random = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  const rockColor = isGolden
    ? `rgb(255, 215, 0)`
    : `rgb(${100 + random(rock.id) * 20}, ${100 + random(rock.id + 1) * 20}, ${
        100 + random(rock.id + 2) * 20
      })`;

  for (let i = 0; i < numParticles; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = 100 + Math.random() * 180;
    particlesToCreate.push({
      id: Math.random(),
      x: rock.x + rock.size / 2,
      y: rock.y + rock.size / 2,
      xVelocity: Math.cos(angle) * speed,
      yVelocity: Math.sin(angle) * speed - 200,
      size: 2 + Math.random() * 4,
      color: rockColor,
      lifespan: 0.8 + Math.random() * 0.7,
      type: 'rock',
    });
  }
  return particlesToCreate;
}

export function createWaterSplashParticles(splash: {
  x: number;
  y: number;
  size: number;
}): ParticleState[] {
  const particlesToCreate: ParticleState[] = [];
  const numParticles = 10 + Math.floor(splash.size / 2);
  for (let i = 0; i < numParticles; i++) {
    const angle = Math.PI + Math.random() * Math.PI;
    const speed = 60 + Math.random() * 100;
    particlesToCreate.push({
      id: Math.random(),
      x: splash.x + splash.size / 2,
      y: splash.y,
      xVelocity: Math.cos(angle) * speed,
      yVelocity: -Math.sin(angle) * speed * 2.2,
      size: 1 + Math.random() * 2,
      color: 'rgba(255, 255, 255, 0.8)',
      lifespan: 0.5 + Math.random() * 0.5,
      type: 'water',
    });
  }
  return particlesToCreate;
}

export function createDustParticles(dust: {
  x: number;
  y: number;
  count: number;
  intensity: number;
}): ParticleState[] {
  const particlesToCreate: ParticleState[] = [];
  for (let i = 0; i < dust.count; i++) {
    const angle = Math.PI + Math.random() * Math.PI;
    const speed = dust.intensity * (0.5 + Math.random());
    particlesToCreate.push({
      id: Math.random(),
      x: dust.x,
      y: dust.y,
      xVelocity: Math.cos(angle) * speed,
      yVelocity: -Math.sin(angle) * speed * 0.6,
      size: 2 + Math.random() * 3,
      color: 'rgba(139, 115, 85, 0.7)',
      lifespan: 0.4 + Math.random() * 0.4,
      type: 'dust',
    });
  }
  return particlesToCreate;
}

export function createSeasonalParticles(season: Season, gameWidth: number, deltaTime: number): ParticleState[] {
    const particlesToCreate: ParticleState[] = [];
    if (season === 'autumn' && Math.random() < deltaTime * 10) {
        particlesToCreate.push({
            id: Math.random(),
            x: Math.random() * gameWidth,
            y: -10,
            xVelocity: 20 - Math.random() * 40,
            yVelocity: 50 + Math.random() * 20,
            size: 8 + Math.random() * 4,
            color: ['#d97706', '#f59e0b', '#b45309'][Math.floor(Math.random() * 3)],
            lifespan: 10,
            type: 'leaf',
        });
    }
    return particlesToCreate;
}


// --- Particle Update Function ---

export function updateParticles(
  currentParticles: ParticleState[],
  deltaTime: number
): ParticleState[] {
  // Update existing particles and filter out the dead ones
  return currentParticles
    .map((p) => ({
      ...p,
      x: p.x + p.xVelocity * deltaTime,
      y: p.y + p.yVelocity * deltaTime,
      // Apply gravity only to rock and dust particles
      yVelocity: p.yVelocity + (p.type === 'rock' || p.type === 'dust' ? GRAVITY * 0.8 * deltaTime : 0),
      lifespan: p.lifespan - deltaTime,
    }))
    .filter((p) => p.lifespan > 0);
}