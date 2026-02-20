export type Unsubscribe = () => void;

export class StateBus<T> {
  private readonly listeners = new Set<(value: T) => void>();
  private currentValue: T;

  constructor(initialValue: T) {
    this.currentValue = initialValue;
  }

  getSnapshot(): T {
    return this.currentValue;
  }

  publish(nextValue: T): void {
    this.currentValue = nextValue;
    for (const listener of this.listeners) {
      listener(nextValue);
    }
  }

  subscribe(listener: (value: T) => void): Unsubscribe {
    this.listeners.add(listener);
    listener(this.currentValue);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
