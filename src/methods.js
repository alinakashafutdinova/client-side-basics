// Все методы создают одинаковые элементы: <li>Элемент N</li>.
// В замер добавления входит создание или разбор разметки, но не подготовка данных.

export const SIZES = [1000, 10000];
export const ITERATIONS = 30;
export const WARMUPS = 5;

function makeItem(index) {
  const item = document.createElement('li');
  item.textContent = `Элемент ${index + 1}`;
  return item;
}

function createMarkup(count) {
  let result = '';
  for (let index = 0; index < count; index += 1) {
    result += `<li>Элемент ${index + 1}</li>`;
  }
  return result;
}

function addWithAppendChild(container, count) {
  for (let index = 0; index < count; index += 1) {
    container.appendChild(makeItem(index));
  }
}

function addWithFragment(container, count) {
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < count; index += 1) {
    fragment.appendChild(makeItem(index));
  }
  container.appendChild(fragment);
}

function addWithInnerHTML(container, count) {
  container.innerHTML = createMarkup(count);
}

function addWithAdjacentHTML(container, count) {
  container.insertAdjacentHTML('beforeend', createMarkup(count));
}

function removeWithRemoveChild(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function removeWithInnerHTML(container) {
  container.innerHTML = '';
}

function removeWithReplaceChildren(container) {
  container.replaceChildren();
}

function removeWithRange(container) {
  const range = document.createRange();
  range.selectNodeContents(container);
  range.deleteContents();
  range.detach();
}

export const METHODS = [
  { id: 'appendChild', label: 'appendChild()', operation: 'Добавление', kind: 'add', execute: addWithAppendChild },
  { id: 'fragment', label: 'DocumentFragment', operation: 'Добавление', kind: 'add', execute: addWithFragment },
  { id: 'innerHTML-add', label: 'innerHTML', operation: 'Добавление', kind: 'add', execute: addWithInnerHTML },
  { id: 'adjacent', label: 'insertAdjacentHTML()', operation: 'Добавление', kind: 'add', execute: addWithAdjacentHTML },
  { id: 'removeChild', label: 'removeChild()', operation: 'Удаление', kind: 'remove', execute: removeWithRemoveChild },
  { id: 'innerHTML-remove', label: "innerHTML = ''", operation: 'Удаление', kind: 'remove', execute: removeWithInnerHTML },
  { id: 'replaceChildren', label: 'replaceChildren()', operation: 'Удаление', kind: 'remove', execute: removeWithReplaceChildren },
  { id: 'range', label: 'Range.deleteContents()', operation: 'Удаление', kind: 'remove', execute: removeWithRange }
];

// Разметку для удаления готовлю заранее. Время подготовки не учитываю.
export function prepareContainer(container, method, count, markup) {
  container.replaceChildren();
  if (method.kind === 'remove') {
    container.innerHTML = markup;
  }
}

export function getMarkup(count) {
  return createMarkup(count);
}

export function checkResult(container, method, count) {
  const expected = method.kind === 'add' ? count : 0;
  if (container.childElementCount !== expected) {
    throw new Error(`Метод ${method.label}: ожидалось ${expected} элементов, получено ${container.childElementCount}`);
  }
}
