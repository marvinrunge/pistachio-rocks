import type { Skill } from '../types';

export const PERMANENT_SKILL_POOL: Skill[] = [
  { id: 'shellFortification', title: 'Shell Fortification', description: 'Permanently increases your maximum Shell HP by 5.', color: 'text-green-400' },
  { id: 'increasedAgility', title: 'Increased Agility', description: 'Permanently increases your maximum movement speed.', color: 'text-blue-400' },
  { id: 'soothingRains', title: 'Soothing Rains', description: 'Permanently increases the frequency of healing water drops.', color: 'text-cyan-400' },
];

export const EVENT_SKILL_POOL: Skill[] = [
  { id: 'waterAffinity', title: 'Water Affinity', description: 'Permanently increases the healing from all water drops by 1. This effect stacks.', color: 'text-sky-400' },
  { id: 'blockChance', title: 'Stone Shell', description: 'Permanently increase your chance to block rock damage by 10%. This effect stacks.', color: 'text-purple-400' },
  { id: 'extraLife', title: 'Phoenix Kernel', description: 'Gain an extra life. If your shell breaks, you are instantly revived with full HP. This effect is permanent and stacks.', color: 'text-yellow-400' },
];

export const YEARLY_SKILL_POOL: Skill[] = [
    { id: 'photosynthesis', title: 'Photosynthesis', description: 'Regenerate 1 HP for every second you stand still. Stacks increase this amount.', color: 'text-emerald-400' },
    { id: 'goldenTouch', title: 'Golden Touch', description: 'Gain a 5% chance for destroyed rocks to grant 10x score. Stacks increase chance.', color: 'text-amber-400' },
];
