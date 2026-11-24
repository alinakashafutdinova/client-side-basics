import { MemoryExperiments, TYPES } from './scenarios.js';

const experiments = new MemoryExperiments();

const notifications = {
  events: {
    created: 'Карточки добавлены. У каждой есть обработчик события resize на window.',
    removed: 'Карточки удалены из DOM, но обработчики window продолжают хранить ссылки.',
    repaired: 'Обработчики удалены через removeEventListener. Удерживающие ссылки сняты.'
  },
  cache: {
    created: 'Карточки добавлены в DOM и в глобальный Map.',
    removed: 'Карточки удалены из DOM, но глобальный Map всё ещё хранит их.',
    repaired: 'Глобальный Map очищен. Удерживающие ссылки сняты.'
  },
  timers: {
    created: 'Для каждой карточки запущен интервал, который обращается к ней.',
    removed: 'Карточки удалены из DOM, но таймеры продолжают работать.',
    repaired: 'Все интервалы остановлены через clearInterval. Удерживающие ссылки сняты.'
  }
};

function updateInterface(type, status, message) {
  const section = document.querySelector(`[data-scenario="${type}"]`);
  section.querySelector('[data-counter="dom"]').textContent = String(status.dom);
  section.querySelector('[data-counter="retained"]').textContent = String(status.retained);
  section.querySelector('[data-counter="cycles"]').textContent = String(status.cycles);
  section.querySelector('[data-action="create"]').disabled = status.dom > 0;
  section.querySelector('[data-action="remove"]').disabled = status.dom === 0;
  section.querySelector('[data-action="repair"]').disabled = status.dom === 0 && status.retained === 0;
  section.querySelector('[data-message]').textContent = message;

  const stage = section.querySelector('[data-stage]');
  if (!status.dom) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = status.retained
      ? 'На странице карточек уже нет, но ссылки на них остались в памяти.'
      : 'Карточки удалены. Можно начать новый цикл.';
    stage.replaceChildren(empty);
  }
}

function handleExperimentClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }
  const section = button.closest('[data-scenario]');
  if (!section) {
    return;
  }
  const type = section.dataset.scenario;
  const stage = section.querySelector('[data-stage]');
  const action = button.dataset.action;
  let stats;
  let message;

  try {
    if (action === 'create') {
      stats = experiments.create(type, stage);
      message = notifications[type].created;
    } else if (action === 'remove') {
      stats = experiments.remove(type, stage);
      message = notifications[type].removed;
    } else if (action === 'repair') {
      stats = experiments.repair(type, stage);
      message = notifications[type].repaired;
    } else {
      return;
    }
    updateInterface(type, stats, message);
  } catch (error) {
    section.querySelector('[data-message]').textContent = error.message;
  }
}

function handlePageUnload() {
  // Очищаю всё при уходе со страницы, чтобы демонстрационные таймеры не мешали позже.
  experiments.repairAll();
}

TYPES.forEach((type) => {
  const section = document.querySelector(`[data-scenario="${type}"]`);
  section.addEventListener('click', handleExperimentClick);
  updateInterface(type, experiments.getStats(type, section.querySelector('[data-stage]')), 'Нажмите «Создать элементы», чтобы начать эксперимент.');
});
window.addEventListener('pagehide', handlePageUnload);
