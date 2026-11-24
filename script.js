'use strict';

// Все данные игры храню внутри функции, чтобы не создавать лишние глобальные переменные.
(function startTamagotchi() {
  const DEFAULT_SETTINGS = Object.freeze({
    duration: 2400,
    jitter: 400,
    steps: 8,
    decayEvery: 4500,
    wanderEvery: 12000,
    catchTime: 3000,
    decayLoss: 3,
    feedGain: 28,
    playGain: 25,
    playCost: 12,
    sleepGain: 38,
    trainGain: 24,
    wanderChance: 35,
    wanderPenalty: 18
  });

  const ACTION_LABELS = Object.freeze({
    feed: 'Кормление',
    play: 'Игра',
    sleep: 'Сон',
    train: 'Дрессировка'
  });

  const ACTION_EMOJIS = Object.freeze({
    feed: '🍓', play: '🧶', sleep: '💤', train: '🏅'
  });

  const elements = {
    stage: document.querySelector('#pet-stage'),
    illustration: document.querySelector('#pet-illustration'),
    item: document.querySelector('#pet-item'),
    speech: document.querySelector('#pet-speech'),
    hint: document.querySelector('#pet-hint'),
    petState: document.querySelector('#pet-state'),
    hungerValue: document.querySelector('#hunger-value'),
    happyValue: document.querySelector('#happy-value'),
    energyValue: document.querySelector('#energy-value'),
    hungerProgress: document.querySelector('#hunger-progress'),
    happyProgress: document.querySelector('#happy-progress'),
    energyProgress: document.querySelector('#energy-progress'),
    queueAmount: document.querySelector('#queue-amount'),
    queueList: document.querySelector('#queue-list'),
    log: document.querySelector('#event-log'),
    wanderOverlay: document.querySelector('#wander-overlay'),
    wanderSeconds: document.querySelector('#wander-seconds'),
    catchButton: document.querySelector('#catch-button'),
    lostOverlay: document.querySelector('#lost-overlay'),
    debugForm: document.querySelector('#debug-form'),
    debugFeedback: document.querySelector('#debug-feedback')
  };

  let settings = { ...DEFAULT_SETTINGS };
  let pet = createPet();
  let waitingActions = [];
  let currentAction = null;
  let wandering = false;
  let resolveCatch = null;
  let round = 1;
  let wanderSequence = 0;

  function createPet() {
    return { hunger: 65, happiness: 70, energy: 60, alive: true };
  }

  function clamp(value) {
    return Math.max(0, Math.min(100, value));
  }

  // Все задержки сделаны через Promise с setTimeout — без async/await.
  function wait(milliseconds) {
    return new Promise(resolve => {
      window.setTimeout(resolve, milliseconds);
    });
  }

  function getDuration() {
    const difference = (Math.random() * 2 - 1) * settings.jitter;
    return Math.max(100, settings.duration + difference);
  }

  function writeMessage(message) {
    elements.hint.textContent = message;
  }

  function writeLog(message) {
    const entry = document.createElement('li');
    entry.textContent = message;
    elements.log.prepend(entry);
    while (elements.log.children.length > 5) {
      elements.log.lastElementChild.remove();
    }
  }

  function renderIndicator(value, output, bar, name) {
    const roundedValue = Math.round(clamp(value));
    output.textContent = String(roundedValue);
    bar.style.width = `${clamp(value)}%`;
    bar.classList.toggle('critical', value <= 20);
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', name);
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', String(roundedValue));
  }

  function renderPet() {
    renderIndicator(pet.hunger, elements.hungerValue, elements.hungerProgress, 'Сытость');
    renderIndicator(pet.happiness, elements.happyValue, elements.happyProgress, 'Счастье');
    renderIndicator(pet.energy, elements.energyValue, elements.energyProgress, 'Энергия');

    const critical = Math.min(pet.hunger, pet.happiness, pet.energy) < 25;
    const label = pet.alive
      ? critical ? 'Нуждается в заботе' : 'Чувствует себя хорошо'
      : 'Питомец ушёл';
    elements.petState.textContent = label;
    elements.petState.classList.toggle('danger', critical || !pet.alive);
    elements.lostOverlay.hidden = pet.alive;

    document.querySelectorAll('[data-action]').forEach(button => {
      button.disabled = !pet.alive;
    });
    document.querySelector('#force-wander').disabled = !pet.alive || wandering;
  }

  function renderQueue() {
    elements.queueAmount.textContent = `${waitingActions.length} из 3`;
    elements.queueList.replaceChildren();
    if (waitingActions.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'queue-empty';
      empty.textContent = 'Пока очередь пуста';
      elements.queueList.append(empty);
      return;
    }
    waitingActions.forEach((action, index) => {
      const chip = document.createElement('span');
      chip.className = 'queue-chip';
      chip.textContent = `${index + 1}. ${ACTION_LABELS[action]}`;
      elements.queueList.append(chip);
    });
  }

  function renderActivity() {
    elements.stage.classList.remove('is-feeding', 'is-playing', 'is-sleeping', 'is-training');
    if (currentAction && pet.alive) {
      const cssClass = {
        feed: 'is-feeding', play: 'is-playing', sleep: 'is-sleeping', train: 'is-training'
      }[currentAction];
      elements.stage.classList.add(cssClass);
      elements.item.textContent = ACTION_EMOJIS[currentAction];
    }
    elements.speech.textContent = !pet.alive ? 'До встречи!' : wandering
      ? 'Помогите!' : currentAction ? `${ACTION_LABELS[currentAction]}…` : 'Рад вас видеть!';
  }

  function render() {
    renderPet();
    renderQueue();
    renderActivity();
  }

  function showRejection(error) {
    if (!pet.alive) {
      return;
    }
    writeMessage(error.message);
    writeLog(`Не получилось: ${error.message}`);
    elements.stage.classList.remove('is-rejected');
    // Повторно запускаю анимацию при каждом новом отказе.
    elements.stage.getBoundingClientRect();
    elements.stage.classList.add('is-rejected');
    wait(850).then(() => {
      elements.stage.classList.remove('is-rejected');
    });
  }

  function finishGame() {
    if (!pet.alive) {
      return;
    }
    pet.alive = false;
    round += 1;
    wanderSequence += 1;
    wandering = false;
    resolveCatch = null;
    waitingActions = [];
    currentAction = null;
    elements.wanderOverlay.hidden = true;
    writeMessage('Один из показателей достиг нуля. Начните игру заново.');
    writeLog('Один из показателей достиг нуля. Персик ушёл.');
    render();
  }

  function applyChanges(differences) {
    pet.hunger = clamp(pet.hunger + (differences.hunger || 0));
    pet.happiness = clamp(pet.happiness + (differences.happiness || 0));
    pet.energy = clamp(pet.energy + (differences.energy || 0));
    if (pet.hunger <= 0 || pet.happiness <= 0 || pet.energy <= 0) {
      finishGame();
    }
    renderPet();
  }

  // Таймеры снижения показателей не блокируют работу кнопок.
  function scheduleDecay(gameRound) {
    return wait(settings.decayEvery).then(() => {
      if (gameRound !== round || !pet.alive) {
        return;
      }
      applyChanges({
        hunger: -settings.decayLoss,
        happiness: -settings.decayLoss,
        energy: -settings.decayLoss
      });
      if (pet.alive) {
        scheduleDecay(gameRound);
      }
    });
  }

  function ensureActive(gameRound) {
    if (gameRound !== round || !pet.alive) {
      throw new Error('Действие прервано.');
    }
  }

  // Показатели меняются понемногу, а не в один момент после окончания таймера.
  function changeGradually(differences, duration, gameRound, steps) {
    let completed = 0;
    const interval = Math.max(1, Math.round(duration / steps));
    function nextStep() {
      ensureActive(gameRound);
      if (completed >= steps) {
        return Promise.resolve();
      }
      return wait(interval).then(() => {
        ensureActive(gameRound);
        applyChanges({
          hunger: (differences.hunger || 0) / steps,
          happiness: (differences.happiness || 0) / steps,
          energy: (differences.energy || 0) / steps
        });
        completed += 1;
        ensureActive(gameRound);
        return nextStep();
      });
    }
    return nextStep();
  }

  function refusalIfTooMuch(value, increase, message) {
    if (value + increase > 100.000001) {
      return Promise.reject(new Error(message));
    }
    return null;
  }

  function executeAction(action, gameRound) {
    const duration = getDuration();
    const steps = settings.steps;
    if (action === 'feed') {
      const refusal = refusalIfTooMuch(pet.hunger, settings.feedGain, 'Персик уже сыт и отказывается есть.');
      return refusal || changeGradually({ hunger: settings.feedGain }, duration, gameRound, steps);
    }
    if (action === 'play') {
      const refusal = refusalIfTooMuch(pet.happiness, settings.playGain, 'Персик сейчас не хочет играть.');
      return refusal || changeGradually({ happiness: settings.playGain, energy: -settings.playCost }, duration, gameRound, steps);
    }
    if (action === 'sleep') {
      if (pet.energy >= 100) {
        return Promise.reject(new Error('Персик выспался и пока не хочет спать.'));
      }
      // Если прибавка больше остатка до 100, сон заканчивается на отметке 100.
      const recovered = Math.min(settings.sleepGain, 100 - pet.energy);
      return changeGradually({ energy: recovered }, duration, gameRound, steps);
    }
    if (action === 'train') {
      // Проверяю по очереди, чтобы при отказе не создавать лишние отклонённые Promise.
      if (pet.hunger + settings.feedGain > 100) {
        return Promise.reject(new Error('Дрессировка не началась: Персик слишком сыт.'));
      }
      if (pet.happiness + settings.playGain > 100) {
        return Promise.reject(new Error('Дрессировка не началась: Персик не хочет играть.'));
      }
      const netEnergy = settings.trainGain - settings.playCost;
      if (pet.energy + netEnergy > 100) {
        return Promise.reject(new Error('Дрессировка не началась: энергии уже достаточно.'));
      }
      // Кормление и игра идут одновременно. Общий результат — Promise.all.
      return Promise.all([
        changeGradually({ hunger: settings.feedGain }, duration, gameRound, steps),
        changeGradually({ happiness: settings.playGain, energy: -settings.playCost }, duration, gameRound, steps),
        changeGradually({ energy: settings.trainGain }, duration, gameRound, steps)
      ]);
    }
    return Promise.reject(new Error('Неизвестное действие.'));
  }

  // Действие выполняется одно. Остальные ждут своей очереди (не более трёх).
  function startNextAction() {
    if (!pet.alive || currentAction || wandering || waitingActions.length === 0) {
      return;
    }
    const action = waitingActions.shift();
    const gameRound = round;
    currentAction = action;
    writeLog(`Началось: ${ACTION_LABELS[action].toLowerCase()}.`);
    writeMessage(`Персик занят: ${ACTION_LABELS[action].toLowerCase()}.`);
    render();
    executeAction(action, gameRound)
      .then(() => {
        if (gameRound === round && pet.alive) {
          writeMessage(`Действие «${ACTION_LABELS[action]}» завершено. Персик доволен!`);
          writeLog(`Действие «${ACTION_LABELS[action]}» завершено.`);
        }
      })
      .catch(error => {
        if (gameRound === round) {
          showRejection(error);
        }
      })
      .finally(() => {
        if (gameRound !== round) {
          return;
        }
        currentAction = null;
        render();
        startNextAction();
      });
  }

  function queueAction(action) {
    if (!pet.alive) {
      writeMessage('Сначала начните новую игру.');
      return;
    }
    if (waitingActions.length >= 3) {
      writeMessage('Очередь заполнена. Дождитесь окончания одного из действий.');
      return;
    }
    waitingActions.push(action);
    if (currentAction || wandering) {
      writeMessage(`${ACTION_LABELS[action]} добавлено в очередь.`);
    }
    renderQueue();
    startNextAction();
  }

  function onActionClick(event) {
    const action = event.currentTarget.dataset.action;
    if (Object.hasOwn(ACTION_LABELS, action)) {
      queueAction(action);
    }
  }

  function updateWanderCountdown(deadline, gameRound, sequence) {
    if (!pet.alive || !wandering || gameRound !== round || sequence !== wanderSequence) {
      return;
    }
    const remaining = Math.max(0, (deadline - Date.now()) / 1000);
    elements.wanderSeconds.textContent = remaining.toFixed(1);
    if (remaining > 0) {
      wait(100).then(() => updateWanderCountdown(deadline, gameRound, sequence));
    }
  }

  function startWandering() {
    if (!pet.alive || wandering || currentAction || waitingActions.length > 0) {
      return Promise.resolve();
    }
    const gameRound = round;
    const sequence = ++wanderSequence;
    const catchDuration = settings.catchTime;
    wandering = true;
    elements.wanderOverlay.hidden = false;
    elements.catchButton.focus();
    writeMessage('Персик убежал! Поймайте его до окончания отсчёта.');
    writeLog('Персик отправился на блуждание.');
    render();
    updateWanderCountdown(Date.now() + catchDuration, gameRound, sequence);

    const clickPromise = new Promise(resolve => {
      resolveCatch = resolve;
    });
    const timeoutPromise = new Promise((unused, reject) => {
      window.setTimeout(() => reject(new Error('Персик не дождался, пока его поймают.')), catchDuration);
    });

    // Кто завершится первым: нажатие кнопки или трёхсекундный таймер?
    return Promise.race([clickPromise, timeoutPromise])
      .then(() => {
        if (round === gameRound && pet.alive) {
          writeMessage('Вы успели поймать Персика. Отличная работа!');
          writeLog('Персик благополучно вернулся.');
        }
      })
      .catch(error => {
        if (round === gameRound && pet.alive) {
          applyChanges({ happiness: -settings.wanderPenalty });
          if (pet.alive) {
            writeMessage('Вы не успели поймать Персика. Счастье уменьшилось.');
            writeLog(error.message);
            showShake();
          }
        }
      })
      .finally(() => {
        if (round !== gameRound) {
          return;
        }
        resolveCatch = null;
        wandering = false;
        wanderSequence += 1;
        elements.wanderOverlay.hidden = true;
        render();
        startNextAction();
      });
  }

  function showShake() {
    elements.stage.classList.remove('is-rejected');
    elements.stage.getBoundingClientRect();
    elements.stage.classList.add('is-rejected');
    wait(850).then(() => {
      elements.stage.classList.remove('is-rejected');
    });
  }

  function onCatchClick() {
    if (wandering && resolveCatch) {
      const finish = resolveCatch;
      resolveCatch = null;
      finish();
    }
  }

  // Случайное событие появляется, только если питомец сейчас ничем не занят.
  function scheduleWander(gameRound) {
    return wait(settings.wanderEvery).then(() => {
      if (gameRound !== round || !pet.alive) {
        return;
      }
      if (!wandering && !currentAction && waitingActions.length === 0 && Math.random() * 100 < settings.wanderChance) {
        startWandering().finally(() => scheduleWander(gameRound));
      } else {
        scheduleWander(gameRound);
      }
    });
  }

  function resetGame() {
    round += 1;
    wanderSequence += 1;
    pet = createPet();
    currentAction = null;
    waitingActions = [];
    wandering = false;
    resolveCatch = null;
    elements.wanderOverlay.hidden = true;
    elements.stage.classList.remove('is-rejected');
    elements.log.replaceChildren();
    writeLog('Новая игра началась. Персик ждёт вас!');
    writeMessage('Персик снова дома. Выберите действие.');
    render();
    scheduleDecay(round);
    scheduleWander(round);
  }

  function onRestartClick() {
    resetGame();
  }

  function onClearLogClick() {
    elements.log.replaceChildren();
  }

  function onForceWanderClick() {
    if (!pet.alive) {
      writeMessage('Сначала начните новую игру.');
    } else if (currentAction || waitingActions.length > 0 || wandering) {
      writeMessage('Дождитесь окончания текущего действия и освободите очередь.');
    } else {
      startWandering();
    }
  }

  function onDebugSubmit(event) {
    event.preventDefault();
    if (!elements.debugForm.reportValidity()) {
      return;
    }
    const data = new FormData(elements.debugForm);
    const updated = {};
    Object.keys(DEFAULT_SETTINGS).forEach(name => {
      updated[name] = Number(data.get(name));
    });
    if (updated.trainGain <= updated.playCost) {
      elements.debugFeedback.textContent = 'Энергия от дрессировки должна быть больше расхода энергии на игру.';
      return;
    }
    settings = updated;
    elements.debugFeedback.textContent = 'Настройки сохранены. Они применятся к следующим действиям и срабатываниям таймеров.';
    writeLog('Настройки игры изменены.');
  }

  function onRestoreDefaultsClick() {
    elements.debugForm.reset();
    settings = { ...DEFAULT_SETTINGS };
    elements.debugFeedback.textContent = 'Стандартные настройки восстановлены.';
    writeLog('Настройки возвращены к исходным.');
  }

  document.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', onActionClick);
  });
  elements.catchButton.addEventListener('click', onCatchClick);
  document.querySelector('#new-pet-button').addEventListener('click', onRestartClick);
  document.querySelector('#reset-button').addEventListener('click', onRestartClick);
  document.querySelector('#clear-log').addEventListener('click', onClearLogClick);
  document.querySelector('#force-wander').addEventListener('click', onForceWanderClick);
  document.querySelector('#restore-settings').addEventListener('click', onRestoreDefaultsClick);
  elements.debugForm.addEventListener('submit', onDebugSubmit);

  render();
  scheduleDecay(round);
  scheduleWander(round);
}());