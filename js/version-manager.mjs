// Задание 1. Для версии храню три числа и историю изменений.
export function VersionManager(version = '0.0.1') {
  if (!(this instanceof VersionManager)) {
    throw new TypeError('Используйте new VersionManager()');
  }
  const parts = String(version).trim().split('.');
  if (parts.length !== 3 || parts.some(part => !/^(0|[1-9]\d*)$/.test(part))) {
    throw new Error('Введите версию в формате 1.2.3');
  }
  const numbers = parts.map(Number);
  if (!numbers.every(Number.isSafeInteger)) {
    throw new Error('Числа версии слишком большие');
  }
  [this.majorNumber, this.minorNumber, this.patchNumber] = numbers;
  this.history = [];
}

VersionManager.prototype.release = function release() {
  return `${this.majorNumber}.${this.minorNumber}.${this.patchNumber}`;
};

VersionManager.prototype.save = function save() {
  this.history.push([this.majorNumber, this.minorNumber, this.patchNumber]);
};

VersionManager.prototype.major = function major() {
  if (!Number.isSafeInteger(this.majorNumber + 1)) {
    throw new RangeError('Превышено допустимое значение версии');
  }
  this.save();
  this.majorNumber += 1;
  this.minorNumber = 0;
  this.patchNumber = 0;
  return this;
};

VersionManager.prototype.minor = function minor() {
  if (!Number.isSafeInteger(this.minorNumber + 1)) {
    throw new RangeError('Превышено допустимое значение версии');
  }
  this.save();
  this.minorNumber += 1;
  this.patchNumber = 0;
  return this;
};

VersionManager.prototype.patch = function patch() {
  if (!Number.isSafeInteger(this.patchNumber + 1)) {
    throw new RangeError('Превышено допустимое значение версии');
  }
  this.save();
  this.patchNumber += 1;
  return this;
};

VersionManager.prototype.rollback = function rollback() {
  const previous = this.history.pop();
  if (!previous) {
    throw new Error('Пока нет изменений для отката');
  }
  [this.majorNumber, this.minorNumber, this.patchNumber] = previous;
  return this;
};
