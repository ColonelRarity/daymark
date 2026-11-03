/* A clearer daily nutrition summary. Keep the existing diary and add actions. */
energyPanel = function () {
  const t = totals();
  const energy = typeof dayEnergy === "function" ? dayEnergy() : null;
  const target = energy ? energy.target : ((typeof dayCalorieTarget === "function" ? dayCalorieTarget() : Number(state.settings.calories)) || 0);
  const ratio = target ? Math.round(t.kcal / target * 100) : null;
  const progress = Math.max(0, Math.min(100, ratio || 0));
  const remaining = target ? Math.max(0, target - t.kcal) : null;
  const macroGoals = state.settings.macros || {};
  const macroCards = [
    ['Білки', 'p', 'protein'],
    ['Жири', 'f', 'fat'],
    ['Вуглеводи', 'c', 'carb']
  ].map(([label, key, tone]) => {
    const grams = Number(t[key] || 0);
    const goal = Number(macroGoals[key]) || 0;
    const fill = goal ? Math.max(0, Math.min(100, grams / goal * 100)) : 0;
    return '<div class="energy-macro ' + tone + '"><span class="energy-macro-name"><i aria-hidden="true"></i>' + label + '</span>' +
      '<strong>' + num(grams, 1) + '<small> г</small></strong>' +
      (goal ? '<div class="energy-macro-track" role="img" aria-label="' + label + ': ' + num(grams, 1) + ' із ' + num(goal) + ' грамів"><i style="width:' + fill + '%"></i></div><small class="energy-macro-goal">із ' + num(goal) + ' г</small>' : grams > 0 ? '<span class="energy-macro-accent" aria-hidden="true"></span>' : '') + '</div>';
  }).join('');

  return '<section class="energy-card energy-card-v2" aria-label="Енергія сьогодні">' +
    '<div class="energy-heading"><button class="energy-label" data-view="food">Мій щоденник їжі ↗</button><span class="energy-spark" aria-hidden="true">🥗</span></div>' +
    '<div class="energy-overview"><div class="energy-main-number"><span>ВНЕСЕНО СЬОГОДНІ</span><div><strong>' + num(t.kcal) + '</strong><small>ккал</small></div><p>' +
      (target ? (t.kcal > target ? 'На ' + num(t.kcal - target) + ' ккал більше за орієнтир' : t.kcal ? 'Ще ' + num(remaining) + ' ккал до орієнтира' : 'Додай перший прийом їжі') : 'Без заданого орієнтира') +
      '</p></div><div class="energy-ring" style="--progress:' + progress + '%" role="img" aria-label="' +
      (target ? ratio + '% від денного орієнтира' : 'Денний орієнтир не задано') + '"><div><b>' + (target ? ratio + '%' : '—') + '</b><small>' + (target ? 'від орієнтира' : 'свій темп') + '</small></div></div></div>' +
    '<div class="energy-target-row"><span>' + (energy && energy.extra ? 'Сьогодні з урахуванням руху <small>+' + num(energy.extra) + ' ккал</small>' : 'Орієнтир на день <small>не жорсткий ліміт</small>') + '</span><button data-action="plan">' + (target ? num(target) + ' ккал' : 'Порахувати') + ' <b>↗</b></button></div>' +
    '<div class="energy-macro-header"><b>Білки · жири · вуглеводи</b><span>за внесеними стравами</span></div><div class="energy-macros">' + macroCards + '</div>' +
    (t.missing ? '<p class="energy-incomplete">Без оцінки: ' + t.missing + ' записів. Підсумок неповний.</p>' : '') +
    '<div class="energy-tools"><button class="snap-button" data-action="photo"><span class="snap-icon">' + icon('camera') + '</span><span><b>Сфоткай</b><small>Їжу, напій чи етикетку</small></span><i>↗</i></button>' +
    '<button class="manual-button" data-action="food-add" aria-label="Внести їжу вручну"><span>＋</span><b>Внести</b></button></div></section>';
};

// The existing home composition places its goal banner before the original
// energy-card markup. Preserve that placement for this new card class too.
const homeBeforeEnergyPass = homeApp;
homeApp = function () {
  const html = homeBeforeEnergyPass();
  const marker = '<section class="energy-card energy-card-v2"';
  return html.includes('class="home-cover"') ? html : html.replace(marker, homeDayCover() + marker);
};
