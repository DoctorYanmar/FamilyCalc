// Vitest setup file: replace Node.js 25's native localStorage stub with a
// fully-functional in-memory implementation so tests can use clear(), etc.
// Node.js 25 added a native `localStorage` global that lacks clear() and other
// standard methods; this shim ensures the Storage API is complete.

class InMemoryStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }

  getItem(k: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, k)
      ? this.store[k]
      : null;
  }

  setItem(k: string, v: string): void {
    this.store[k] = String(v);
  }

  removeItem(k: string): void {
    delete this.store[k];
  }

  clear(): void {
    this.store = {};
  }
}

// Override both localStorage and sessionStorage with shims.
Object.defineProperty(globalThis, 'localStorage', {
  value: new InMemoryStorage(),
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: new InMemoryStorage(),
  writable: true,
  configurable: true,
});
