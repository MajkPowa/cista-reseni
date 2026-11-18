'use strict';
(() => {
  const explorer = document.querySelector('.system-explorer');
  if (!explorer) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const modes = {
    rain: { number: '01 / Esővíz', description: 'A tetőről a tartályba. A tartályból vissza a kertbe.' },
    clean: { number: '02 / Szennyvíztisztítás', description: 'A háztartásból a szennyvíztisztítóba. Minden lépésre odafigyelve.' },
    pump: { number: '03 / Szivattyútechnika', description: 'A víz továbbhalad. Ott is, ahol a gravitáció nem elég.' },
    care: { number: '04 / Szerviz és felújítás', description: 'Az egész rendszer összefüggéseiben. Az ellenőrzéstől a felújításig.' }
  };
  let flowTimer;
  const replay = document.querySelector('.flow-replay');
  function playFlow() {
    clearTimeout(flowTimer);
    explorer.classList.remove('is-flowing');
    if (reducedMotion.matches || document.hidden) return;
    // Restart a finite demonstration; water never runs continuously in the background.
    void explorer.offsetWidth;
    explorer.classList.add('is-flowing');
    flowTimer = setTimeout(() => explorer.classList.remove('is-flowing'), 2700);
  }
  function feedback(panel) {
    panel.classList.remove('is-changing');
    if (reducedMotion.matches) return;
    void panel.offsetWidth;
    panel.classList.add('is-changing');
  }
  function chooseSolution(key, announce = true) {
    if (!Object.hasOwn(modes, key)) return;
    explorer.dataset.mode = key;
    document.querySelectorAll('[data-solution]').forEach(button => {
      const active = button.dataset.solution === key;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('[data-select-solution]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.selectSolution === key));
    });
    document.querySelectorAll('.solution-panel').forEach(panel => { panel.hidden = panel.id !== `solution-panel-${key}`; });
    document.getElementById('scene-number').textContent = modes[key].number;
    document.getElementById('scene-description').textContent = modes[key].description;
    if (announce) document.getElementById('solution-status').textContent = `Kiválasztva: ${modes[key].number.slice(5)}. Az ábra alatt találja a részleteket és egy megvalósított projektet.`;
    feedback(document.getElementById(`solution-panel-${key}`));
    playFlow();
  }
  function wireTabs(selector, activate) {
    const buttons = [...document.querySelectorAll(selector)];
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => activate(button));
      button.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
        else if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else return;
        event.preventDefault();
        activate(buttons[next]);
        buttons[next].focus({ preventScroll: true });
      });
    });
  }
  wireTabs('[data-solution]', button => chooseSolution(button.dataset.solution));
  document.querySelectorAll('[data-select-solution]').forEach(button => {
    button.addEventListener('click', () => chooseSolution(button.dataset.selectSolution));
  });
  wireTabs('[data-journey]', selected => {
    document.querySelectorAll('[data-journey]').forEach(button => {
      const active = button === selected;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('.journey-panel').forEach(panel => { panel.hidden = panel.id !== `journey-panel-${selected.dataset.journey}`; });
    feedback(document.getElementById(`journey-panel-${selected.dataset.journey}`));
  });
  replay.addEventListener('click', playFlow);
  function respectMotion() {
    replay.querySelector('span').textContent = reducedMotion.matches ? 'A víz útvonala kiemelve' : 'Vízáramlás lejátszása';
    replay.disabled = reducedMotion.matches;
    if (reducedMotion.matches) {
      clearTimeout(flowTimer);
      explorer.classList.remove('is-flowing', 'is-entering');
      document.querySelectorAll('.is-changing').forEach(panel => panel.classList.remove('is-changing'));
    }
  }
  reducedMotion.addEventListener('change', respectMotion);
  respectMotion();
  if ('IntersectionObserver' in window) {
    const entrance = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        if (!reducedMotion.matches) explorer.classList.add('is-entering');
        playFlow();
        entrance.disconnect();
      }
    }, { threshold: 0.3 });
    entrance.observe(document.querySelector('.model-canvas'));
    const visibility = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) {
        clearTimeout(flowTimer);
        explorer.classList.remove('is-flowing');
      }
    });
    visibility.observe(explorer);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearTimeout(flowTimer); explorer.classList.remove('is-flowing'); }
  });
})();
