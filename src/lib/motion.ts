/**
 * Motion vocabulary. Material "authentic motion": things enter on a decelerating
 * curve (easeOutQuint), move on easeInOutCubic, and leave quickly on an
 * accelerating curve. Elements in a group arrive in a short stagger so the eye can
 * follow the hierarchy. Everything collapses to instant when the OS asks for
 * reduced motion.
 */
import { fade, fly, scale } from 'svelte/transition';
import { cubicIn, cubicInOut, quintOut } from 'svelte/easing';
import { prefersReducedMotion } from 'svelte/motion';

const still = () => prefersReducedMotion.current;

export const STAGGER_MS = 45;
export const stagger = (i: number, step = STAGGER_MS) => (still() ? 0 : Math.min(i, 14) * step);

/** Entrance: rise a few px while fading in. */
export function rise(node: Element, { delay = 0, y = 14, duration = 560 } = {}) {
  return fly(node, { y: still() ? 0 : y, delay: still() ? 0 : delay, duration: still() ? 0 : duration, easing: quintOut });
}

/** Tab content: slide in from the direction of travel. */
export function slide(node: Element, { dir = 1, duration = 420 } = {}) {
  return fly(node, { x: still() ? 0 : 24 * dir, duration: still() ? 0 : duration, easing: quintOut, opacity: 0 });
}

export function exit(node: Element, { duration = 140 } = {}) {
  return fade(node, { duration: still() ? 0 : duration, easing: cubicIn });
}

export function pop(node: Element, { delay = 0, duration = 320 } = {}) {
  return scale(node, { start: 0.94, delay: still() ? 0 : delay, duration: still() ? 0 : duration, easing: quintOut });
}

export { cubicInOut, quintOut };
