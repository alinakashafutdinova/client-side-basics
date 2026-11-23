'use strict';

// 1. Like — повторное нажатие снимает реакцию.
const likeButton = document.querySelector('#like-button');
const likeStatus = document.querySelector('#like-status');

function handleLikeClick() {
  const liked = likeButton.getAttribute('aria-pressed') === 'true';
  likeButton.setAttribute('aria-pressed', String(!liked));
  likeStatus.textContent = liked ? 'Отметка не поставлена' : 'Отметка «Нравится» поставлена';
}
likeButton.addEventListener('click', handleLikeClick);

// 2. Like / Dislike — обе реакции не могут быть активны одновременно.
const voteLike = document.querySelector('#vote-like');
const voteDislike = document.querySelector('#vote-dislike');
const voteStatus = document.querySelector('#vote-status');
let currentVote = null;

function renderVote() {
  voteLike.setAttribute('aria-pressed', String(currentVote === 'like'));
  voteDislike.setAttribute('aria-pressed', String(currentVote === 'dislike'));
  if (currentVote === 'like') {
    voteStatus.textContent = 'Вы выбрали «Нравится»';
  } else if (currentVote === 'dislike') {
    voteStatus.textContent = 'Вы выбрали «Не нравится»';
  } else {
    voteStatus.textContent = 'Реакция не выбрана';
  }
}
function handleVoteLikeClick() {
  currentVote = currentVote === 'like' ? null : 'like';
  renderVote();
}
function handleVoteDislikeClick() {
  currentVote = currentVote === 'dislike' ? null : 'dislike';
  renderVote();
}
voteLike.addEventListener('click', handleVoteLikeClick);
voteDislike.addEventListener('click', handleVoteDislikeClick);

// 3. Корзина — один обработчик для всех кнопок благодаря делегированию событий.
const products = document.querySelector('#products');
const cartCount = document.querySelector('#cart-count');
const cartStatus = document.querySelector('#cart-status');
let cartAmount = 0;

function handleAddToCart(event) {
  const button = event.target.closest('.add-to-cart');
  if (!button || !products.contains(button)) {
    return;
  }
  cartAmount += 1;
  cartCount.textContent = String(cartAmount);
  cartStatus.textContent = `Добавлено: ${button.dataset.product}. Всего товаров: ${cartAmount}`;
}
products.addEventListener('click', handleAddToCart);

// 4. Сортировка — исходный массив сохраняется без изменений.
const sourceNumbers = Array.from({ length: 12 }, () => Math.floor(Math.random() * 90) + 10);
const numberList = document.querySelector('#number-list');
const sortStatus = document.querySelector('#sort-status');

function renderNumbers(numbers) {
  const fragment = document.createDocumentFragment();
  for (const number of numbers) {
    const item = document.createElement('li');
    item.textContent = String(number);
    fragment.appendChild(item);
  }
  // Новые li создаются без innerHTML.
  numberList.replaceChildren(fragment);
}
function handleSortAscending() {
  renderNumbers([...sourceNumbers].sort((a, b) => a - b));
  sortStatus.textContent = 'Сортировка по возрастанию';
}
function handleSortDescending() {
  renderNumbers([...sourceNumbers].sort((a, b) => b - a));
  sortStatus.textContent = 'Сортировка по убыванию';
}
function handleSortReset() {
  renderNumbers(sourceNumbers);
  sortStatus.textContent = 'Исходный порядок';
}
document.querySelector('#sort-asc').addEventListener('click', handleSortAscending);
document.querySelector('#sort-desc').addEventListener('click', handleSortDescending);
document.querySelector('#sort-reset').addEventListener('click', handleSortReset);
renderNumbers(sourceNumbers);

// 5. Галерея: массив selectedPhotos задаёт порядок выбора фотографий.
// В нём сохраняются и относительные координаты места нажатия.
const originalGallery = document.querySelector('#photo-gallery');
const copiedGallery = document.querySelector('#copied-gallery');
const moveButton = document.querySelector('#move-selected');
const deleteButton = document.querySelector('#delete-selected');
const selectionCounter = document.querySelector('#selection-count');
const copiedCounter = document.querySelector('#copied-count');
const emptyCopied = document.querySelector('#empty-copied');
const galleryStatus = document.querySelector('#gallery-status');
const selectedPhotos = [];
let pressTimer = null;
let pressStart = null;
let lastLongPress = null;

function findPhotoButton(event) {
  const button = event.target.closest('.gallery-photo');
  return button && originalGallery.contains(button) ? button : null;
}

function findPosition(button, event) {
  const rectangle = button.getBoundingClientRect();
  // При выборе с клавиатуры ставлю номер по центру изображения.
  const x = event.detail === 0 ? rectangle.width / 2 : event.clientX - rectangle.left;
  const y = event.detail === 0 ? rectangle.height / 2 : event.clientY - rectangle.top;
  return {
    x: Math.min(95, Math.max(5, x / rectangle.width * 100)),
    y: Math.min(90, Math.max(10, y / rectangle.height * 100))
  };
}

function refreshSelection() {
  const order = new Map(selectedPhotos.map((photo, index) => [
    photo.id, { ...photo, number: index + 1 }
  ]));
  for (const button of originalGallery.querySelectorAll('.gallery-photo')) {
    const photo = order.get(button.dataset.photoId);
    const existing = button.querySelector('.selection-marker');
    if (existing) {
      existing.remove();
    }
    button.setAttribute('aria-pressed', String(Boolean(photo)));
    if (photo) {
      const marker = document.createElement('span');
      marker.className = 'selection-marker';
      marker.textContent = String(photo.number);
      marker.style.left = `${photo.x}%`;
      marker.style.top = `${photo.y}%`;
      marker.setAttribute('aria-hidden', 'true');
      button.appendChild(marker);
    }
  }
  const amount = selectedPhotos.length;
  selectionCounter.textContent = amount ? `Выбрано фотографий: ${amount}` : 'Ничего не выбрано';
  moveButton.disabled = amount === 0;
  deleteButton.disabled = amount === 0;
}

function togglePhoto(button, position) {
  const id = button.dataset.photoId;
  const index = selectedPhotos.findIndex(photo => photo.id === id);
  if (index >= 0) {
    selectedPhotos.splice(index, 1);
  } else {
    selectedPhotos.push({ id, ...position });
  }
  refreshSelection();
}

function startSelection(button, position) {
  if (selectedPhotos.length === 0) {
    togglePhoto(button, position);
    galleryStatus.textContent = 'Режим выбора включён';
  }
}

function clearPressTimer() {
  if (pressTimer !== null) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}

function handlePointerDown(event) {
  const button = findPhotoButton(event);
  if (!button || selectedPhotos.length > 0 || event.button !== 0) {
    return;
  }
  clearPressTimer();
  pressStart = { button, id: event.pointerId, x: event.clientX, y: event.clientY };
  const rectangle = button.getBoundingClientRect();
  const position = {
    x: Math.min(95, Math.max(5, (event.clientX - rectangle.left) / rectangle.width * 100)),
    y: Math.min(90, Math.max(10, (event.clientY - rectangle.top) / rectangle.height * 100))
  };
  pressTimer = setTimeout(() => {
    startSelection(button, position);
    // click от отпускания кнопки не должен сразу снять первый номер.
    lastLongPress = { button, time: Date.now() };
    pressTimer = null;
  }, 1000);
}

function handlePointerMove(event) {
  if (!pressStart || pressStart.id !== event.pointerId) {
    return;
  }
  if (Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y) > 12) {
    clearPressTimer();
    pressStart = null;
  }
}

function handlePointerEnd() {
  clearPressTimer();
  pressStart = null;
}

function handlePhotoClick(event) {
  const button = findPhotoButton(event);
  if (!button) {
    return;
  }
  if (lastLongPress && lastLongPress.button === button && Date.now() - lastLongPress.time < 650) {
    lastLongPress = null;
    return;
  }
  if (selectedPhotos.length > 0) {
    togglePhoto(button, findPosition(button, event));
  }
}

function handlePhotoKeyDown(event) {
  if (event.key === 'Enter' && event.shiftKey && selectedPhotos.length === 0) {
    const button = findPhotoButton(event);
    if (button) {
      event.preventDefault();
      startSelection(button, { x: 50, y: 50 });
    }
  }
}

function handlePhotoContextMenu(event) {
  if (findPhotoButton(event)) {
    event.preventDefault();
  }
}

function findSelectedItem(photo) {
  return [...originalGallery.querySelectorAll('.photo-item')].find(item =>
    item.querySelector('.gallery-photo').dataset.photoId === photo.id
  );
}

function finishSelection(action) {
  const amount = selectedPhotos.length;
  for (const photo of selectedPhotos) {
    const item = findSelectedItem(photo);
    const button = item.querySelector('.gallery-photo');
    const marker = button.querySelector('.selection-marker');
    if (marker) {
      marker.remove();
    }
    button.setAttribute('aria-pressed', 'false');
    if (action === 'move') {
      // appendChild перемещает сам DOM-узел, сохраняя порядок выбора.
      button.disabled = true;
      copiedGallery.appendChild(item);
    } else {
      item.remove();
    }
  }
  selectedPhotos.length = 0;
  refreshSelection();
  copiedCounter.textContent = String(copiedGallery.children.length);
  emptyCopied.hidden = copiedGallery.children.length > 0;
  galleryStatus.textContent = action === 'move'
    ? `Перенесено фотографий: ${amount}`
    : `Удалено фотографий: ${amount}`;
}

function handleMoveClick() {
  if (selectedPhotos.length > 0) {
    finishSelection('move');
  }
}

function handleDeleteClick() {
  if (selectedPhotos.length > 0) {
    finishSelection('delete');
  }
}

originalGallery.addEventListener('pointerdown', handlePointerDown);
originalGallery.addEventListener('pointermove', handlePointerMove);
originalGallery.addEventListener('pointerup', handlePointerEnd);
originalGallery.addEventListener('pointercancel', handlePointerEnd);
originalGallery.addEventListener('pointerleave', handlePointerEnd);
originalGallery.addEventListener('click', handlePhotoClick);
originalGallery.addEventListener('keydown', handlePhotoKeyDown);
originalGallery.addEventListener('contextmenu', handlePhotoContextMenu);
moveButton.addEventListener('click', handleMoveClick);
deleteButton.addEventListener('click', handleDeleteClick);
