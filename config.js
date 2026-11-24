'use strict';

// Адреса API вынесены отдельно, чтобы при необходимости их можно было заменить.
// В локальном примере запросы обрабатывает server.py.
window.LAB5_CONFIG = Object.freeze({
  galleryUrl: '/api/images',
  temperatureUrl: '/api/temperature',
  // В официальном API преподавателя названия полей могут отличаться.
  roomField: 'room',
  temperatureField: 'temperature'
});
