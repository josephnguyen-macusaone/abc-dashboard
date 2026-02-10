/**
 * Circular Buffer implementation for efficient memory management
 * Automatically overwrites oldest entries when full
 */
export class CircularBuffer<T> {
  private buffer: T[];
  private size: number;
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;

  constructor(size: number) {
    this.size = size;
    this.buffer = new Array(size);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.size;

    if (this.count < this.size) {
      this.count++;
    } else {
      // Buffer is full, overwrite oldest entry
      this.head = (this.head + 1) % this.size;
    }
  }

  get(index: number): T | undefined {
    if (index < 0 || index >= this.count) return undefined;
    const actualIndex = (this.head + index) % this.size;
    return this.buffer[actualIndex];
  }

  getAll(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const item = this.get(i);
      if (item !== undefined) {
        result.push(item);
      }
    }
    return result;
  }

  clear(): void {
    this.buffer = new Array(this.size);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  get length(): number {
    return this.count;
  }

  get capacity(): number {
    return this.size;
  }

  isFull(): boolean {
    return this.count === this.size;
  }
}
