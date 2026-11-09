/** UI presentation only. Never imports or mutates the game, world, audio or saves. */
const labels = {
  tr: { order: 'Siparişim', stages: 'Mekânlar', done: 'Tamam', close: 'Kapat', settings: 'Seçenekler', tricks: 'Ustanın numaraları' },
  en: { order: 'My order', stages: 'Places', done: 'Done', close: 'Close', settings: 'Options', tricks: 'Vendor tricks' },
  ar: { order: 'طلبي', stages: 'الأماكن', done: 'تم', close: 'إغلاق', settings: 'الإعدادات', tricks: 'حيل البائع' },
  ru: { order: 'Мой заказ', stages: 'Места', done: 'Готово', close: 'Закрыть', settings: 'Настройки', tricks: 'Трюки мастера' },
  de: { order: 'Meine Bestellung', stages: 'Orte', done: 'Fertig', close: 'Schließen', settings: 'Einstellungen', tricks: 'Tricks des Meisters' },
  ja: { order: '注文', stages: '場所', done: '完了', close: '閉じる', settings: '設定', tricks: '職人の技' },
};
const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const start = $('start-overlay');

function closePanel(dialog) {
  if (!dialog.open || dialog.dataset.closing !== undefined) return;
  dialog.dataset.closing = '';
  setTimeout(() => {
    dialog.close();
    delete dialog.dataset.closing;
  }, reducedMotion.matches ? 0 : 180);
}
for (const [trigger, panel] of [['btn-stages-panel', 'dialog-stages']]) {
  $(trigger).addEventListener('click', () => { $('dialog-settings')?.close(); delete $(panel).dataset.closing; $(panel).showModal(); });
}
document.querySelectorAll('[data-dismiss]').forEach(button => {
  button.addEventListener('click', () => closePanel($(button.dataset.dismiss)));
});

function localize() {
  const text = labels[document.documentElement.lang] || labels.en;
  document.querySelectorAll('[data-ui-label]').forEach(el => { el.textContent = text[el.dataset.uiLabel]; });
  document.querySelectorAll('.panel-dismiss').forEach(el => el.setAttribute('aria-label', text.close));
  $('btn-lang').setAttribute('aria-label', text.settings);
  $('btn-lang').title = text.settings;
}
new MutationObserver(localize).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
localize();

// Menu exit and HUD entry are visual transitions; the existing launch timing is unchanged.
function syncMenu() {
  const home = !start.classList.contains('hidden');
  document.body.classList.toggle('interface-home', home);
  start.inert = !home;
  document.querySelector(".hud-bottom").setAttribute("aria-hidden", String(home || document.body.classList.contains('ordering')));
}
new MutationObserver(syncMenu).observe(start, { attributes: true, attributeFilter: ['class'] });
syncMenu();

function syncSelections() {
  document.querySelectorAll('.scoop-cnt-btn,.flavor-orb-btn[data-flavor],.lang-card-btn').forEach(button => {
    button.setAttribute('aria-pressed', String(button.classList.contains('active') || button.classList.contains('selected')));
  });
  document.querySelectorAll('.stage-chip').forEach(button => {
    button.setAttribute('aria-pressed', String(button.classList.contains('active')));
    button.setAttribute('aria-disabled', String(button.classList.contains('locked')));
  });
}
const selectionObserver = new MutationObserver(syncSelections);
for (const id of ['stage-selector', 'lang-grid']) {
  selectionObserver.observe($(id), { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
}
syncSelections();

// React once to each changed instruction, rather than pulsing continuously.
new MutationObserver(() => {
  if (reducedMotion.matches || document.body.classList.contains('interface-home')) return;
  $('hud-card').animate([
    { opacity: 0.65, transform: 'translateY(5px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ], { duration: 190, easing: 'ease-out' });
}).observe($('hud-action-badge'), { childList: true, characterData: true, subtree: true });
