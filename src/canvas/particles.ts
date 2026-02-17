import type { Particle } from '../types';

/**
 * Advance particle positions, apply drag, decay life.
 * Returns only particles still alive (life > 0).
 */
export function updateParticles(particles: Particle[]): Particle[] {
  const alive: Particle[] = [];

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life -= 0.01;

    if (p.life > 0) {
      alive.push(p);
    }
  }

  return alive;
}

/**
 * Draw all living particles (no shadowBlur for less visual noise).
 */
export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
): void {
  if (particles.length === 0) return;

  const prevAlpha = ctx.globalAlpha;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    ctx.globalAlpha = p.life * 0.5;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = prevAlpha;
}

/**
 * Create a burst of particles radiating outward from a point.
 * Calmer: fewer, slower, smaller particles.
 */
export function spawnBurst(
  x: number,
  y: number,
  color: string,
  count = 8,
): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const speed = 0.5 + Math.random() * 1.0;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      color,
      radius: 1.0 + Math.random() * 1.0,
    });
  }

  return particles;
}
