// Задание 2. Square наследуется от Rectangle и использует его методы.
export class Rectangle {
  constructor(width, height) {
    if (![width, height].every(value => Number.isFinite(value) && value > 0)) {
      throw new RangeError('Ширина и высота должны быть положительными числами');
    }
    this.width = width;
    this.height = height;
  }

  getArea() {
    return this.width * this.height;
  }

  getPerimeter() {
    return 2 * (this.width + this.height);
  }
}

export class Square extends Rectangle {
  constructor(side) {
    super(side, side);
  }
}
