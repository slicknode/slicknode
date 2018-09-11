/**
 * Created by Ivo Meißner on 06.10.17.
 *
 * @flow
 */

import _ from 'lodash';

const adjectives = [
  'Awesome', 'Red', 'Green', 'Blue', 'Purple', 'Misty', 'Gray', 'Pink', 'Blue', 'White', 'Black', 'Great',
  'Slick', 'Windy', 'Crimson', 'ace', 'amazing', 'awesome', 'badass', 'classy', 'cool', 'dandy',
  'dazzling', 'divine', 'epic', 'fine', 'funky', 'jazzy', 'hip', 'glorious', 'gnarly', 'metric',
  'good', 'grand', 'great', 'groovy', 'kickass', 'legendary', 'lovely', 'luminous', 'majestic',
  'neat', 'peachy', 'perfect', 'posh', 'premium', 'prime', 'primo', 'rad', 'shining', 'smashing',
  'solid', 'splendid', 'stellar', 'striking', 'stunning', 'stupendous', 'stylish', 'sublime',
  'super', 'superb', 'superior', 'supreme', 'sweet', 'swell', 'terrific', 'tiptop', 'ultimate',
  'unreal', 'wicked', 'wonderful', 'wondrous', 'steely', 'fancy', 'rich', 'uber', 'ginger', 'neon', 'fizzy',
  'velvet', 'united', 'giga', 'mega', 'ultra', 'retro', 'digital', 'analog', 'new', 'light', 'bright',
  'sharp',
];
const noun = [
  'head', 'fork', 'giant', 'minion', 'treasure', 'water', 'fire', 'atom', 'warp', 'axe', 'onion', 'dwarf',
  'tiger', 'lion', 'pluto', 'mars', 'moon', 'dam', 'horse', 'snake', 'cat', 'dog', 'beaver', 'badger',
  'coyote', 'saturn', 'neptun', 'venus', 'metal', 'iron', 'alloy', 'steel', 'apple', 'orange', 'melon',
  'knife', 'hammer', 'driver', 'car', 'rocket', 'spaceship', 'engine', 'knot', 'pickle', 'rhino',
  'giraffe', 'submarine', 'tank', 'locker', 'safe', 'elephant', 'garlic', 'taco', 'lens', 'fish', 'hoover',
  'mower', 'tractor', 'hubble', 'tower', 'bridge', 'scraper', 'provider', 'heater', 'ramp', 'pad', 'hive',
  'nexus', 'hub', 'gate', 'door', 'lock', 'wheel',
];

/**
 * Returns a random name to be used for project names
 * @returns {string}
 */
export function randomName(): string {
  return _.startCase(_.sample(adjectives)) + '-' + _.startCase(_.sample(noun) + _.sample(noun));
}

/**
 * Compares two semver versions
 *
 * Returns for:
 * a > b = 1
 * b > a = -1
 * a = b = 0
 *
 * @param a
 * @param b
 */
export function semverCompare(a: string, b: string): number {
  const partsA = a.split('.');
  const partsB = b.split('.');

  if (partsA.length !== 3 || partsB.length !== 3) {
    throw new Error('Invalid semver version provided');
  }

  for (let i = 0; i < partsA.length; i++) {
    const tmpA = Number(partsA[i]);
    const tmpB = Number(partsB[i]);
    if (tmpA > tmpB) {
      return 1;
    }
    if (tmpB > tmpA) {
      return -1;
    }
    if (!isNaN(tmpA) && isNaN(tmpB)) {
      return 1;
    }
    if (isNaN(tmpA) && !isNaN(tmpB)) {
      return -1;
    }
  }
  return 0;
}
