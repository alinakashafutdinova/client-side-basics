const ABSOLUTE_ZERO = -273.15;

// Задание 3. Внутри храню градусы Цельсия, остальные шкалы вычисляю.
export class Temperature {
  constructor(celsius) {
    this.celsius = celsius;
  }

  get celsius() {
    return this._celsius;
  }

  set celsius(value) {
    if (!Number.isFinite(value) || value < ABSOLUTE_ZERO) {
      throw new RangeError('Температура должна быть не ниже −273,15 °C');
    }
    this._celsius = value;
  }

  get fahrenheit() {
    return this.celsius * 9 / 5 + 32;
  }

  set fahrenheit(value) {
    if (!Number.isFinite(value)) {
      throw new TypeError('Введите число');
    }
    this.celsius = (value - 32) * 5 / 9;
  }

  get kelvin() {
    return this.celsius + 273.15;
  }

  set kelvin(value) {
    if (!Number.isFinite(value)) {
      throw new TypeError('Введите число');
    }
    // Небольшая погрешность вычисления не должна опускать 0 K ниже нуля.
    this.celsius = value === 0 ? ABSOLUTE_ZERO : value - 273.15;
  }

  static add(first, second) {
    return new Temperature(first.celsius + second.celsius);
  }

  static subtract(first, second) {
    return new Temperature(first.celsius - second.celsius);
  }

  static fromFahrenheit(value) {
    const temperature = new Temperature(0);
    temperature.fahrenheit = value;
    return temperature;
  }

  static fromKelvin(value) {
    const temperature = new Temperature(0);
    temperature.kelvin = value;
    return temperature;
  }
}
