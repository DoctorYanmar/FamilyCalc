import { tweened } from 'svelte/motion';
import { cubicOut } from 'svelte/easing';

export function tweenedNumber(initial = 0, duration = 400) {
  return tweened(initial, { duration, easing: cubicOut });
}
