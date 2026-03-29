export type LearningObjectKind = "apple" | "fish" | "bird" | "flower" | "car";

export interface LearningObjectItem {
  id: string;
  kind: LearningObjectKind;
}

const OBJECT_KINDS: LearningObjectKind[] = [
  "apple",
  "fish",
  "bird",
  "flower",
  "car",
];

export function createLearningObjects(
  count: number,
  prefix: string,
): LearningObjectItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    kind: OBJECT_KINDS[randomInt(0, OBJECT_KINDS.length - 1)],
  }));
}

export function shuffleArray<T>(items: readonly T[]): T[] {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    const temp = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = temp;
  }

  return next;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
