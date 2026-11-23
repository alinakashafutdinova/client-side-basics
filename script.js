'use strict';

const dialog = document.querySelector('#register-dialog');
const form = document.querySelector('#registration-form');
const inputs = [...form.querySelectorAll('input')];
const passwordInput = document.querySelector('#password');
const passwordButton = document.querySelector('#show-password');
const githubInput = document.querySelector('#github-url');
const githubDateInput = document.querySelector('#github-date');
const resultEmpty = document.querySelector('#result-empty');
const resultContent = document.querySelector('#result-content');
const resultSection = document.querySelector('#result-section');

// Указываю сегодняшний день как последнюю допустимую дату регистрации.
function getLocalToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

githubDateInput.max = getLocalToday();

function openDialog() {
  githubDateInput.max = getLocalToday();
  dialog.showModal();
  document.querySelector('#full-name').focus();
}

function closeDialog() {
  passwordInput.type = 'password';
  dialog.close();
}

// Если нажать на затемнённую область, окно тоже закрывается.
function handleBackdropClick(event) {
  if (event.target === dialog) {
    closeDialog();
  }
}

function handleDialogClose() {
  passwordInput.type = 'password';
}

// Телефон можно написать как с кодом страны, так и без него.
function normalizePhone(value) {
  const digits = value.replace(/\D/g, '');

  if (digits.length === 10) {
    return `7${digits}`;
  }
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `7${digits.slice(1)}`;
  }
  return null;
}

function formatPhone(value) {
  const digits = normalizePhone(value);
  if (digits === null) {
    return 'Не указан';
  }
  return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
}

// Проверяю именно ссылку на профиль, а не любую страницу в интернете.
function isGithubProfile(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const profile = /^\/[A-Za-z0-9-]+\/?$/.test(url.pathname);
    return url.protocol === 'https:' && (host === 'github.com' || host === 'www.github.com') && profile && !url.search && !url.hash;
  } catch {
    return false;
  }
}

function getErrorText(field) {
  const validity = field.validity;

  if (validity.customError) {
    return field.validationMessage;
  }
  if (validity.valueMissing) {
    return field.id === 'full-name' ? 'Введите имя — это обязательное поле.' : 'Введите электронную почту — это обязательное поле.';
  }
  if (validity.typeMismatch) {
    return field.id === 'email' ? 'Проверьте адрес почты. Например: alina@mail.ru.' : 'Введите полную ссылку, начиная с https://';
  }
  if (validity.badInput) {
    return 'Введите число, например 21.';
  }
  if (validity.tooShort) {
    return field.id === 'password' ? 'Пароль должен содержать не меньше 6 символов.' : 'Имя должно быть длиннее одного символа.';
  }
  if (validity.patternMismatch) {
    return field.id === 'phone' ? 'В номере можно использовать только цифры, пробелы, скобки и знак +.' : 'В имени не должно быть цифр.';
  }
  if (validity.rangeOverflow) {
    return field.id === 'age' ? 'Возраст не может быть больше 99 лет.' : 'Дата регистрации не может быть в будущем.';
  }
  if (validity.rangeUnderflow) {
    return 'Возраст не может быть отрицательным.';
  }
  if (validity.stepMismatch) {
    return 'Введите возраст целым числом.';
  }
  return 'Проверьте правильность заполнения поля.';
}

function checkField(field) {
  const value = field.value.trim();
  field.setCustomValidity('');

  // Сначала проверяю обычные HTML-ограничения, затем дополнительные условия.
  if (field.id === 'full-name' && value && value.length < 2) {
    field.setCustomValidity('Имя должно быть длиннее одного символа.');
  } else if (field.id === 'full-name' && value && /\d/.test(value)) {
    field.setCustomValidity('В имени не должно быть цифр.');
  } else if (field.id === 'phone' && value && field.validity.patternMismatch) {
    field.setCustomValidity('В номере можно использовать только цифры, пробелы, скобки и знак +.');
  } else if (field.id === 'phone' && value && normalizePhone(value) === null) {
    field.setCustomValidity('Укажите 10 цифр номера или 11 цифр с кодом 7/8.');
  } else if (field.id === 'password' && value && value.length < 6) {
    field.setCustomValidity('Пароль должен содержать не меньше 6 символов.');
  } else if (field.id === 'github-url' && value && field.validity.valid && !isGithubProfile(value)) {
    field.setCustomValidity('Укажите ссылку на профиль, например https://github.com/username.');
  } else if (field.id === 'github-url' && value && !githubDateInput.value) {
    field.setCustomValidity('Если указана ссылка на GitHub, нужно добавить и дату регистрации.');
  } else if (field.id === 'github-url' && !value && githubDateInput.value) {
    field.setCustomValidity('Добавьте ссылку на GitHub к указанной дате регистрации.');
  } else if (field.id === 'github-date' && value && !githubInput.value.trim()) {
    field.setCustomValidity('Если указана дата регистрации, добавьте и ссылку на GitHub.');
  } else if (field.id === 'github-date' && !value && githubInput.value.trim()) {
    field.setCustomValidity('Добавьте дату регистрации к ссылке на GitHub.');
  }

  const isValid = field.checkValidity();
  const error = document.getElementById(`${field.id}-error`);

  if (isValid) {
    field.removeAttribute('aria-invalid');
    error.textContent = '';
    error.hidden = true;
  } else {
    field.setAttribute('aria-invalid', 'true');
    error.textContent = getErrorText(field);
    error.hidden = false;
  }
  return isValid;
}

function handleFieldBlur(event) {
  const field = event.currentTarget;
  field.dataset.touched = 'true';
  checkField(field);

  // Ссылка и дата связаны: после изменения одной проверяю и вторую.
  if (field === githubInput || field === githubDateInput) {
    const partner = field === githubInput ? githubDateInput : githubInput;
    if (partner.dataset.touched === 'true') {
      checkField(partner);
    }
  }
}

function handleFieldInput(event) {
  const field = event.currentTarget;
  if (field.dataset.touched === 'true' || field.hasAttribute('aria-invalid')) {
    checkField(field);
  }
  if (field === githubInput || field === githubDateInput) {
    const partner = field === githubInput ? githubDateInput : githubInput;
    if (partner.dataset.touched === 'true' || partner.hasAttribute('aria-invalid')) {
      checkField(partner);
    }
  }
}

// Пароль виден только при удержании кнопки указателем или клавиатурой.
function handlePasswordPointerDown(event) {
  if (event.button !== 0) {
    return;
  }
  event.preventDefault();
  passwordInput.type = 'text';
  passwordButton.setPointerCapture(event.pointerId);
}

function hidePassword() {
  passwordInput.type = 'password';
}

function handlePasswordKeyDown(event) {
  if (event.key === ' ' || event.key === 'Enter') {
    passwordInput.type = 'text';
  }
}

function handlePasswordKeyUp(event) {
  if (event.key === ' ' || event.key === 'Enter') {
    hidePassword();
  }
}

// Создаю элементы карточки через DOM, чтобы введённый текст был безопасным.
function appendDetail(list, label, value, url = null) {
  const wrapper = document.createElement('div');
  const title = document.createElement('dt');
  const description = document.createElement('dd');
  title.textContent = label;

  if (url) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = value;
    description.appendChild(link);
  } else {
    description.textContent = value || 'Не указано';
  }

  wrapper.append(title, description);
  list.appendChild(wrapper);
}

function renderResult(data) {
  const card = document.createElement('article');
  card.className = 'result-card';

  const header = document.createElement('div');
  header.className = 'result-card-top';
  const avatar = document.createElement('span');
  avatar.className = 'result-avatar';
  avatar.textContent = String(data.get('fullName')).trim().charAt(0).toUpperCase();
  avatar.setAttribute('aria-hidden', 'true');

  const headerText = document.createElement('div');
  const nameHeading = document.createElement('h3');
  nameHeading.textContent = String(data.get('fullName')).trim();
  nameHeading.tabIndex = -1;
  const success = document.createElement('p');
  success.textContent = '✓ Анкета успешно заполнена';
  headerText.append(nameHeading, success);
  header.append(avatar, headerText);

  const details = document.createElement('dl');
  details.className = 'result-details';
  appendDetail(details, 'Электронная почта', String(data.get('email')).trim());
  appendDetail(details, 'Телефон', data.get('phone') ? formatPhone(String(data.get('phone'))) : 'Не указан');
  appendDetail(details, 'Возраст', String(data.get('age')));

  const githubUrl = String(data.get('githubUrl')).trim();
  appendDetail(details, 'Профиль GitHub', githubUrl, githubUrl || null);
  appendDetail(details, 'Дата регистрации на GitHub', String(data.get('githubDate')));
  // Пароль намеренно не показываю в открытой карточке.
  appendDetail(details, 'Пароль', data.get('password') ? 'Указан (скрыт)' : 'Не указан');

  card.append(header, details);
  resultContent.replaceChildren(card);
  resultEmpty.hidden = true;
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  nameHeading.focus({ preventScroll: true });
}

function clearErrors() {
  for (const field of inputs) {
    field.setCustomValidity('');
    field.removeAttribute('aria-invalid');
    delete field.dataset.touched;
    const message = document.getElementById(`${field.id}-error`);
    message.textContent = '';
    message.hidden = true;
  }
}

function handleSubmit(event) {
  event.preventDefault();
  let firstInvalid = null;

  for (const field of inputs) {
    field.dataset.touched = 'true';
    if (!checkField(field) && firstInvalid === null) {
      firstInvalid = field;
    }
  }

  if (firstInvalid !== null) {
    firstInvalid.focus();
    return;
  }

  // FormData читаю до очистки формы.
  const data = new FormData(form);
  closeDialog();
  renderResult(data);
  form.reset();
  clearErrors();
}

// Все обработчики вынесены в отдельные именованные функции.
document.querySelector('#open-dialog').addEventListener('click', openDialog);
document.querySelector('#hero-register').addEventListener('click', openDialog);
document.querySelector('#close-dialog').addEventListener('click', closeDialog);
document.querySelector('#top-close').addEventListener('click', closeDialog);
dialog.addEventListener('click', handleBackdropClick);
dialog.addEventListener('close', handleDialogClose);
form.addEventListener('submit', handleSubmit);

for (const field of inputs) {
  field.addEventListener('blur', handleFieldBlur);
  field.addEventListener('input', handleFieldInput);
}

passwordButton.addEventListener('pointerdown', handlePasswordPointerDown);
passwordButton.addEventListener('pointerup', hidePassword);
passwordButton.addEventListener('pointercancel', hidePassword);
passwordButton.addEventListener('lostpointercapture', hidePassword);
passwordButton.addEventListener('blur', hidePassword);
passwordButton.addEventListener('keydown', handlePasswordKeyDown);
passwordButton.addEventListener('keyup', handlePasswordKeyUp);
