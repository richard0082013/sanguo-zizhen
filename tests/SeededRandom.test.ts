import { describe, it, expect } from 'vitest';
import { SeededRandom } from '../src/game/utils/SeededRandom';

describe('SeededRandom', () => {
  it('should produce deterministic results with the same seed', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);

    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('should produce different results with different seeds', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(54321);

    const results1: number[] = [];
    const results2: number[] = [];

    for (let i = 0; i < 10; i++) {
      results1.push(rng1.next());
      results2.push(rng2.next());
    }

    expect(results1).not.toEqual(results2);
  });

  it('should return values between 0 and 1', () => {
    const rng = new SeededRandom(42);

    for (let i = 0; i < 1000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('should return integers within the specified range', () => {
    const rng = new SeededRandom(42);

    for (let i = 0; i < 1000; i++) {
      const value = rng.nextInt(5, 10);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(10);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('should shuffle arrays deterministically', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);

    const arr1 = [1, 2, 3, 4, 5];
    const arr2 = [1, 2, 3, 4, 5];

    const shuffled1 = rng1.shuffle(arr1);
    const shuffled2 = rng2.shuffle(arr2);

    expect(shuffled1).toEqual(shuffled2);
    expect(shuffled1).not.toEqual([1, 2, 3, 4, 5]);
  });

  it('should pick elements from array', () => {
    const rng = new SeededRandom(42);
    const arr = ['a', 'b', 'c', 'd'];

    for (let i = 0; i < 100; i++) {
      const picked = rng.pick(arr);
      expect(arr).toContain(picked);
    }
  });
});
