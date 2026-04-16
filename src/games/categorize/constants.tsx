/**
 * Angry Sort — Game Constants
 */

export const GRAVITY = 0.35;
export const MAX_PULL = 120;       // Max slingshot pull distance in px
export const LAUNCH_POWER = 0.18;  // Multiplier: pull distance → velocity
export const FRICTION = 0.998;     // Air resistance
export const GROUND_Y_OFFSET = 160; // Ground level from bottom
export const TRAIL_LENGTH = 15;    // Number of trail dots
export const SLOWMO_DISTANCE = 90; // Distance to nest that triggers slow-mo
export const SLOWMO_FACTOR = 0.3;  // Slow-motion speed factor
export const NEST_HIT_RADIUS = 65; // Collision radius for nests

export const BIRD_IMAGES = [
  '/games/categorize/red_bird.png',
  '/games/categorize/yellow_bird.png',
  '/games/categorize/black_bird.png',
];

export const SLINGSHOT_IMG = '/games/categorize/slingshot.png';
export const NEST_IMG = '/games/categorize/nest.png';
