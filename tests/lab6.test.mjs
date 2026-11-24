import test from 'node:test';
import assert from 'node:assert/strict';
import { VersionManager } from '../js/version-manager.mjs';
import { Rectangle, Square } from '../js/geometry.mjs';
import { Temperature } from '../js/temperature.mjs';
import { createSignal, effect } from '../js/signals.mjs';
import { winnerOf, readRound, summarizeRounds } from '../js/game.mjs';

test('VersionManager изменяет версию и откатывает шаги', () => {
  const version = new VersionManager('1.2.3');
  version.patch().minor().major();
  assert.equal(version.release(), '2.0.0');
  version.rollback();
  assert.equal(version.release(), '1.3.0');
  version.rollback();
  assert.equal(version.release(), '1.2.4');
  assert.equal(new VersionManager().release(), '0.0.1');
  assert.throws(() => new VersionManager('1.x.3'));
});

test('Rectangle и Square правильно вычисляют площадь и периметр', () => {
  const r = new Rectangle(3, 5);
  assert.equal(r.getArea(), 15);
  assert.equal(r.getPerimeter(), 16);
  const s = new Square(4);
  assert.ok(s instanceof Rectangle);
  assert.equal(s.getArea(), 16);
  assert.equal(s.getPerimeter(), 16);
  assert.throws(() => new Square(-1));
});

test('Temperature переводит градусы и контролирует абсолютный ноль', () => {
  assert.equal(new Temperature(0).fahrenheit, 32);
  assert.equal(new Temperature(0).kelvin, 273.15);
  assert.equal(Temperature.fromKelvin(0).celsius, -273.15);
  assert.ok(Math.abs(Temperature.fromFahrenheit(212).celsius - 100) < 1e-9);
  assert.equal(Temperature.add(new Temperature(10), new Temperature(20)).celsius, 30);
  assert.equal(Temperature.subtract(new Temperature(20), new Temperature(10)).celsius, 10);
  assert.throws(() => new Temperature(-274));
});

test('Сигналы запускают эффект после изменения значения', () => {
  const [read, write] = createSignal(1);
  const values = [];
  const stop = effect(() => values.push(read()));
  write(2);
  write(2);
  write(3);
  assert.deepEqual(values, [1, 2, 3]);
  stop();
  write(4);
  assert.deepEqual(values, [1, 2, 3]);
});

test('Игра определяет победителя каждого варианта', () => {
  assert.equal(winnerOf('rock', 'scissors'), 'player1');
  assert.equal(winnerOf('paper', 'scissors'), 'player2');
  assert.equal(winnerOf('paper', 'paper'), 'draw');
  assert.throws(() => winnerOf('banana', 'paper'));
});

test('Раунды подсчитываются вместе со статистикой', () => {
  const input = [
    readRound({ player1: 'rock', player2: 'scissors' }),
    readRound({ player1: 'paper', player2: 'paper' }),
    readRound({ player1: 'rock', player2: 'paper' })
  ];
  const summary = summarizeRounds(input);
  assert.equal(summary.wins1, 1);
  assert.equal(summary.wins2, 1);
  assert.equal(summary.draws, 1);
  assert.equal(summary.player1.rock, 2);
  assert.equal(summary.player2.paper, 2);
});
