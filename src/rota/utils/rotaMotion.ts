import type { Transition, Variants } from 'motion/react';

/** Restrained spring — smooth settle without bounce */
export const rotaSpring: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 34,
  mass: 0.9,
};

/** Crisp hover / tap feedback */
export const rotaEaseOut: Transition = {
  type: 'tween',
  duration: 0.2,
  ease: [0.25, 0.46, 0.45, 0.94],
};

/** Sidebar chip entrance */
export const rotaEnter: Transition = {
  type: 'tween',
  duration: 0.32,
  ease: [0.16, 1, 0.3, 1],
};

export const chipRest = {
  opacity: 1,
  scale: 1,
  y: 0,
  x: 0,
  boxShadow: '0 0 0 rgba(0,0,0,0)',
};

export const chipHover = {
  scale: 1.02,
  y: -1,
  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.09)',
};

export const chipTap = { scale: 0.985 };

export const chipDragging = {
  scale: 0.96,
  opacity: 0.5,
};

export const chipMotionVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  idle: { ...chipRest, transition: rotaEnter },
  hover: { ...chipHover, transition: rotaEaseOut },
  tap: { ...chipTap, transition: { ...rotaEaseOut, duration: 0.12 } },
  dragging: { ...chipDragging, transition: rotaSpring },
};

export const chipEnterFromLeft: Variants = {
  initial: { opacity: 0, x: -6 },
  idle: { ...chipRest, transition: rotaEnter },
  hover: { ...chipHover, transition: rotaEaseOut },
  tap: { ...chipTap, transition: { ...rotaEaseOut, duration: 0.12 } },
  dragging: { ...chipDragging, transition: rotaSpring },
};

export const badgeMotionVariants: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  idle: { opacity: 1, scale: 1, boxShadow: '0 0 0 rgba(0,0,0,0)', transition: rotaEnter },
  hover: { ...chipHover, transition: rotaEaseOut },
  tap: { ...chipTap, transition: { ...rotaEaseOut, duration: 0.12 } },
  dragging: { ...chipDragging, transition: rotaSpring },
};

export const dragOverlayVariants: Variants = {
  initial: { scale: 0.96, opacity: 0, y: 4 },
  animate: {
    scale: 1,
    opacity: 1,
    y: -3,
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
    transition: rotaSpring,
  },
  exit: {
    scale: 0.98,
    opacity: 0,
    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
  },
};

export const dropHintVariants: Variants = {
  initial: { opacity: 0, y: 3 },
  animate: { opacity: 1, y: 0, transition: rotaEaseOut },
  exit: { opacity: 0, y: 2, transition: { duration: 0.15, ease: 'easeIn' } },
};

export const swapOverlayVariants: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: rotaEaseOut },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.15, ease: 'easeIn' } },
};

export const dropRingVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: rotaEaseOut },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
};

export function staggerDelay(index: number, step = 0.022) {
  return index * step;
}

/** Subtle snap-back when a drag is released over a cell */
export const dndDropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  keyframes: ({
    transform,
  }: {
    transform: { initial: Record<string, unknown>; final: Record<string, unknown> };
  }) => [
    { ...transform.initial, opacity: 1 },
    { ...transform.final, opacity: 0.9, scale: 0.97 },
  ],
};
