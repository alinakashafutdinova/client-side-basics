// В этом файле специально оставлены три способа удержания удалённых узлов.
// Исправление у каждого сценария отдельно, чтобы было удобно сравнить снимки памяти.
const ELEMENTS_PER_CYCLE = 80;
const TEXT_PARTS = 16;
const INTERVAL_MS = 10_000;
const TYPES = ['events', 'cache', 'timers'];

// Глобальная коллекция нужна именно для второго эксперимента.
window.memoryLabCache = new Map();

function makeCard(type, cycle, index) {
  const card = document.createElement('article');
  card.className = 'demo-card';
  card.dataset.memoryScenario = type;
  card.dataset.memoryCycle = String(cycle);
  card.dataset.memoryItem = String(index);

  const heading = document.createElement('strong');
  heading.textContent = `Карточка ${index + 1}`;
  card.append(heading);

  // Создаю вложенные узлы и объём текста, чтобы объекты было видно в Heap Snapshot.
  const description = document.createElement('div');
  description.className = 'demo-details';
  for (let part = 0; part < TEXT_PARTS; part += 1) {
    const span = document.createElement('span');
    const unique = `${type}:${cycle}:${index}:${part}`;
    span.textContent = `${unique} · ${'Проверка памяти браузера. '.repeat(14)}`;
    description.append(span);
  }
  card.append(description);
  return card;
}

function createResizeListener(card) {
  function onResize() {
    // Ссылка на card остаётся внутри обработчика, даже после удаления элемента.
    card.dataset.lastMeasuredWidth = String(window.innerWidth);
  }
  window.addEventListener('resize', onResize);
  return onResize;
}

function createActiveTimer(card) {
  function updateDetachedCard() {
    // Именно это обращение удерживает card через замыкание таймера.
    card.dataset.lastBackgroundTick = String(Date.now());
  }
  return window.setInterval(updateDetachedCard, INTERVAL_MS);
}

class MemoryExperiments {
  constructor() {
    this.entries = {
      events: { cycle: 0, listeners: [] },
      cache: { cycle: 0 },
      timers: { cycle: 0, timers: [] }
    };
  }

  isValidType(type) {
    return TYPES.includes(type);
  }

  create(type, container) {
    if (!this.isValidType(type)) {
      throw new Error('Неизвестный сценарий');
    }
    if (container.querySelector('.demo-card')) {
      throw new Error('Сначала удалите карточки из DOM');
    }

    const state = this.entries[type];
    state.cycle += 1;
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < ELEMENTS_PER_CYCLE; index += 1) {
      const card = makeCard(type, state.cycle, index);
      const key = `${type}-${state.cycle}-${index}`;
      if (type === 'events') {
        state.listeners.push(createResizeListener(card));
      } else if (type === 'cache') {
        window.memoryLabCache.set(key, card);
      } else {
        state.timers.push(createActiveTimer(card));
      }
      fragment.append(card);
    }
    container.replaceChildren(fragment);
    return this.getStats(type, container);
  }

  remove(type, container) {
    if (!this.isValidType(type)) {
      throw new Error('Неизвестный сценарий');
    }
    // Удаляю только DOM-узлы. Удерживающие ссылки специально не трогаю.
    container.replaceChildren();
    return this.getStats(type, container);
  }

  repair(type, container) {
    if (!this.isValidType(type)) {
      throw new Error('Неизвестный сценарий');
    }
    this.remove(type, container);
    const state = this.entries[type];
    if (type === 'events') {
      state.listeners.forEach((listener) => {
        window.removeEventListener('resize', listener);
      });
      state.listeners.length = 0;
    } else if (type === 'cache') {
      window.memoryLabCache.clear();
    } else {
      state.timers.forEach((timer) => {
        window.clearInterval(timer);
      });
      state.timers.length = 0;
    }
    return this.getStats(type, container);
  }

  getStats(type, container) {
    if (!this.isValidType(type)) {
      throw new Error('Неизвестный сценарий');
    }
    const state = this.entries[type];
    let retained = 0;
    if (type === 'events') {
      retained = state.listeners.length;
    } else if (type === 'cache') {
      retained = window.memoryLabCache.size;
    } else {
      retained = state.timers.length;
    }
    return { dom: container.querySelectorAll('.demo-card').length, retained, cycles: state.cycle };
  }

  repairAll() {
    TYPES.forEach((type) => {
      const container = document.querySelector(`[data-stage="${type}"]`);
      if (container) {
        this.repair(type, container);
      }
    });
  }
}

export { ELEMENTS_PER_CYCLE, MemoryExperiments, TYPES };
