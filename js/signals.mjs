// Минимальная реализация сигналов: эффект запоминает, какие данные читает.
let activeEffect = null;

export function createSignal(initialValue) {
  let value = initialValue;
  const subscribers = new Set();

  function get() {
    if (activeEffect) {
      subscribers.add(activeEffect);
      activeEffect.dependencies.add(subscribers);
    }
    return value;
  }

  function set(nextValue) {
    if (Object.is(nextValue, value)) {
      return;
    }
    value = nextValue;
    // Копия нужна, чтобы изменение подписок не влияло на текущий обход.
    for (const subscriber of [...subscribers]) {
      subscriber.run();
    }
  }

  return [get, set];
}

export function effect(callback) {
  const subscriber = {
    dependencies: new Set(),
    run() {
      for (const dependency of this.dependencies) {
        dependency.delete(this);
      }
      this.dependencies.clear();
      const previous = activeEffect;
      activeEffect = this;
      try {
        callback();
      } finally {
        activeEffect = previous;
      }
    }
  };
  subscriber.run();
  return function stopEffect() {
    for (const dependency of subscriber.dependencies) {
      dependency.delete(subscriber);
    }
    subscriber.dependencies.clear();
  };
}
