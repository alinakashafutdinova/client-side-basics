import assert from 'node:assert/strict';
import test from 'node:test';

class FakeElement {
  constructor(tag = 'div') {
    this.tagName = tag;
    this.children = [];
    this.dataset = {};
    this.className = '';
    this.textContent = '';
  }
  append(...elements) {
    this.children.push(...elements);
  }
  replaceChildren(...elements) {
    this.children = [...elements];
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
  querySelectorAll(selector) {
    const found = [];
    for (const child of this.children) {
      if (selector === '.demo-card' && child.className === 'demo-card') {
        found.push(child);
      }
      found.push(...child.querySelectorAll(selector));
    }
    return found;
  }
}

const activeListeners = new Set();
const activeTimers = new Set();
let nextTimerId = 1;

globalThis.document = {
  createElement: (tag) => new FakeElement(tag),
  createDocumentFragment: () => new FakeElement('#fragment')
};
globalThis.window = {
  innerWidth: 1200,
  addEventListener: (_type, fn) => activeListeners.add(fn),
  removeEventListener: (_type, fn) => activeListeners.delete(fn),
  setInterval: () => {
    const id = nextTimerId;
    nextTimerId += 1;
    activeTimers.add(id);
    return id;
  },
  clearInterval: (id) => activeTimers.delete(id)
};

// В тесте DocumentFragment должен переносить дочерние элементы, как в браузере.
const originalReplace = FakeElement.prototype.replaceChildren;
FakeElement.prototype.replaceChildren = function replaceChildren(...nodes) {
  originalReplace.call(this, ...nodes.flatMap((node) => node.tagName === '#fragment' ? node.children : [node]));
};

const { MemoryExperiments, ELEMENTS_PER_CYCLE } = await import('../src/scenarios.js');

test('обработчики остаются после удаления и снимаются при исправлении', () => {
  const model = new MemoryExperiments();
  const container = new FakeElement();
  model.create('events', container);
  assert.equal(activeListeners.size, ELEMENTS_PER_CYCLE);
  model.remove('events', container);
  assert.deepEqual(model.getStats('events', container), {dom: 0, retained: 80, cycles: 1});
  model.create('events', container);
  model.remove('events', container);
  assert.equal(activeListeners.size, 160);
  model.repair('events', container);
  assert.equal(activeListeners.size, 0);
  assert.equal(model.getStats('events', container).retained, 0);
});

test('глобальный Map хранит удалённые DOM-узлы и очищается', () => {
  const model = new MemoryExperiments();
  const container = new FakeElement();
  model.create('cache', container);
  model.remove('cache', container);
  assert.equal(window.memoryLabCache.size, 80);
  model.create('cache', container);
  model.remove('cache', container);
  assert.equal(window.memoryLabCache.size, 160);
  model.repair('cache', container);
  assert.equal(window.memoryLabCache.size, 0);
});

test('замыкания таймеров удерживаются до clearInterval', () => {
  const model = new MemoryExperiments();
  const container = new FakeElement();
  model.create('timers', container);
  model.remove('timers', container);
  assert.equal(activeTimers.size, 80);
  model.create('timers', container);
  model.remove('timers', container);
  assert.equal(activeTimers.size, 160);
  model.repair('timers', container);
  assert.equal(activeTimers.size, 0);
});

test('нельзя создавать новую партию до удаления предыдущей', () => {
  const model = new MemoryExperiments();
  const container = new FakeElement();
  model.create('cache', container);
  assert.throws(() => model.create('cache', container), /Сначала удалите/);
  model.repair('cache', container);
});

test('неизвестный сценарий не выполняется', () => {
  const model = new MemoryExperiments();
  assert.throws(() => model.create('unknown', new FakeElement()), /Неизвестный/);
});
