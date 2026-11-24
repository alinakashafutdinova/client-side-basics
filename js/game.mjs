export const MOVES = Object.freeze({
  rock: 'Камень',
  scissors: 'Ножницы',
  paper: 'Бумага'
});

const WINNING_PAIRS = new Set(['rock:scissors', 'scissors:paper', 'paper:rock']);

export function winnerOf(first, second) {
  if (!MOVES[first] || !MOVES[second]) {
    throw new Error('Неизвестный вариант игры');
  }
  if (first === second) {
    return 'draw';
  }
  return WINNING_PAIRS.has(`${first}:${second}`) ? 'player1' : 'player2';
}

export function readRound(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('Неверный формат сообщения сервера');
  }
  const first = value.player1 ?? value.player1Move ?? value.player1_move ?? value.p1;
  const second = value.player2 ?? value.player2Move ?? value.player2_move ?? value.p2;
  if (!MOVES[first] || !MOVES[second]) {
    throw new Error('В сообщении указан неизвестный вариант игры');
  }
  return { player1: first, player2: second, winner: winnerOf(first, second) };
}

export function summarizeRounds(rounds) {
  const stats = {
    wins1: 0, wins2: 0, draws: 0,
    player1: { rock: 0, scissors: 0, paper: 0 },
    player2: { rock: 0, scissors: 0, paper: 0 }
  };
  for (const round of rounds) {
    stats.player1[round.player1] += 1;
    stats.player2[round.player2] += 1;
    if (round.winner === 'player1') {
      stats.wins1 += 1;
    } else if (round.winner === 'player2') {
      stats.wins2 += 1;
    } else {
      stats.draws += 1;
    }
  }
  return stats;
}
