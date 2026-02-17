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
    p.life -= 0.02;

    if (p.life > 0) {
      alive.push(p);
    }
  }

  return alive;
}

/**
 * Draw all living particles with a soft glow.
 */
export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
): void {
  if (particles.length === 0) return;

  const prevAlpha = ctx.globalAlpha;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    ctx.globalAlpha = p.life * 0.8;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = prevAlpha;
}

/**
 * Create a burst of particles radiating outward from a point.
 */
export function spawnBurst(
  x: number,
  y: number,
  color: string,
  count = 16,
): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const speed = 1.5 + Math.random() * 2.5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      color,
      radius: 1.5 + Math.random() * 2,
    });
  }

  return particles;
}
