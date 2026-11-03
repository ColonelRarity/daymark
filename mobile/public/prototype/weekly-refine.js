/* Clearer weekly preferences and a useful, honest rhythm overview. */
const originalRefineForm=weekFormView;
function weekVariantCount(n){return n+' '+(n%10===1&&n%100!==11?'варіант':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'варіанти':'варіантів');}
weekFormView=function(){
  const p=weekStudio?.prefs||{},html=originalRefineForm(),groups=[...new Set(WEEK_PANTRY.map(id=>RECIPE_INGREDIENTS[id].aisle))];
  const preferenceGroups='<div class="week-preference-groups">'+groups.map((name,i)=>{
    const ids=WEEK_PANTRY.filter(id=>RECIPE_INGREDIENTS[id].aisle===name),count=ids.filter(id=>(p.pantry||[]).includes(id)).length;
    return '<details class="week-chip-group" '+(count||i===0?'open':'')+'><summary><span>'+esc(name)+'</span><small>'+(count?count+' обрано':weekVariantCount(ids.length))+' ⌄</small></summary><div class="week-chips">'+ids.map(id=>'<label><input type="checkbox" name="pantry" value="'+id+'" '+((p.pantry||[]).includes(id)?'checked':'')+'><span>'+esc(RECIPE_INGREDIENTS[id].name)+'</span></label>').join('')+'</div></details>';
  }).join('')+'</div>';
  return html
    .replace(/<div class="week-chips">.*?<\/div>(?=<div class="week-chip-heading">Чого не пропонувати)/,preferenceGroups)
    .replace(/<select name="meals">.*?<\/select>/,'<select name="meals">'+weekOptions([[2,'2 прийоми'],[3,'3 прийоми'],[4,'3 прийоми + перекус'],[5,'3 прийоми + 2 перекуси']],p.meals||3)+'</select>')
    .replace(/<select name="trainingFrequency">.*?<\/select>/,'<select name="trainingFrequency">'+weekOptions([[0,'Без плану тренувань'],[1,'1 раз на тиждень'],[2,'2 рази на тиждень'],[3,'3 рази на тиждень'],[4,'4 рази на тиждень'],[5,'5 разів на тиждень']],p.trainingFrequency??trainingPrefs.frequency??3)+'</select>')
    .replace('Що вже є вдома? <small>Обери кілька</small>','Які продукти хочеш бачити в меню? <small>Можна купити пізніше · обери кілька</small>')
    .replace('Обери знайомі продукти — вони отримають пріоритет. Це не обмежує меню лише ними.','Обери кількість прийомів і продукти, які хочеш їсти цього тижня. Їх не обов’язково мати вдома — список покупок складемо після вибору меню.')
    .replace('Чого не пропонувати?','Що не любиш або не хочеш цього тижня?')
    .replace('Це фільтр уподобань, не перевірка алергенів.','Виключені продукти мають пріоритет над побажаннями. Це фільтр уподобань, не перевірка алергенів.')
    .replace('Звичайна активність<select','Рух у звичайний тиждень<select')
    .replace(/(<label>Рух у звичайний тиждень<select.*?<\/select>)(<\/label>)/,'$1<small class="week-activity-note">Обери типовий минулий тиждень, а не найактивніший день. Тренування вже враховані в цьому виборі; вдруге їхні калорії не додаємо.</small>$2')
    .replace('Ми підберемо програми з бібліотеки. Ти можеш змінити формат або не складати тренування автоматично.','Обери, скільки тренувань реально вписується у твій тиждень. Нуль — теж вибір: меню залишиться, а рух можна записувати вручну.')
    .replace('Разів на тиждень<select','Тренувань на тиждень<select')
    .replace('Ми зберемо сім днів','Ми зберемо сім днів');
};
const originalRefineWeekView=weekView;
weekView=function(){return originalRefineWeekView().replace('Скажи, що любиш, що вже є вдома і коли тобі зручно займатися.','Скажи, що любиш їсти, що готова купити і коли тобі зручно рухатися.');};
const originalRefineResult=weekResult;
weekResult=function(){let html=originalRefineResult();if(weekStudio?.prefs.trainingFrequency===0&&!weekStudio?.prefs.medical){html=html.replace('Для цих побажань не знайшли безпечної комбінації готових програм. Зміни інвентар або місце занять.','Ти обрала меню без тренувального плану. Рух можна додати до щоденника в будь-який день.').replace('0 сесії на тиждень','Без запланованих тренувань');}else if(weekStudio?.training?.length){const n=weekStudio.training.length;html=html.replace(n+' сесії на тиждень',n+' '+(n===1?'тренування':n<5?'тренування':'тренувань')+' на тиждень');}return html;};

function rhythmOverview(){
  const l=state.logs[selectedDate]||{},meals=l.meals?.length||0,movement=movementTotals(selectedDate),sleep=sleepDuration(l.sleep),hasCheck=!!l.checkIn;
  const cards=[
    {icon:'🍽️',title:'Їжа',value:meals?meals+' '+(meals%10===1&&meals%100!==11?'запис':meals%10>=2&&meals%10<=4&&(meals%100<12||meals%100>14)?'записи':'записів'):'Ще не записана',caption:meals?'У щоденнику за цей день':'Можна додати страву або напій',view:'food'},
    {icon:'🚶',title:'Рух',value:movement.sessions?num(movement.minutes)+' хв':'Ще не записаний',caption:movement.sessions?movement.sessions+' сесій у щоденнику':'Внеси прогулянку чи тренування',view:'move'},
    {icon:'🌙',title:'Сон',value:sleep?hoursText(sleep):'Ще не записаний',caption:sleep?'За внесеним часом сну':'Запиши час і самопочуття',view:'sleep'}
  ];
  const next=!meals?{title:'Почни з того, що їла сьогодні',body:'Один запис уже дасть більше контексту для підказок.',view:'food',label:'Відкрити щоденник'}:!hasCheck?{title:'Як почуваєшся зараз?',body:'Відзнач голод і енергію — помічник врахує твоє відчуття, а не здогадуватиметься.',action:'check-in',label:'Відзначити стан'}:!sleep?{title:'Додай сон, якщо хочеш',body:'Після цього підказки зможуть врахувати й відновлення.',view:'sleep',label:'Записати сон'}:{title:'Твій день уже видно',body:'Нижче — підказки за записами. Вони оновляться, якщо ти щось додаси або зміниш.',view:'week',label:'Мій план на тиждень'};
  return '<section class="rhythm-hero"><span class="rhythm-eyebrow">ЗА ТВОЇМИ ЗАПИСАМИ · '+fdate(selectedDate).toUpperCase()+'</span><h2>Що вже є<br>в моєму дні?</h2><p>Їжа, рух і сон — разом. Тут видно, що внесено, і куди натиснути далі.</p><div class="rhythm-cards">'+cards.map(c=>'<button data-view="'+c.view+'"><span class="rhythm-icon">'+c.icon+'</span><span><small>'+c.title+'</small><strong>'+c.value+'</strong><em>'+c.caption+'</em></span><b>↗</b></button>').join('')+'</div></section><section class="rhythm-next"><span>НАСТУПНИЙ КРОК</span><h3>'+next.title+'</h3><p>'+next.body+'</p><button '+(next.action?'data-action="'+next.action+'"':'data-view="'+next.view+'"')+'>'+next.label+' ↗</button></section><p class="rhythm-honest">Помічник працює за внесеними даними та простими правилами. Це не AI-чат і не медичний висновок. Відсутній запис не означає, що ти нічого не їла чи не рухалася.</p>';
}
const originalRefineCoach=coachView;
coachView=function(){return originalRefineCoach().replace(/<div class="coach-intro">.*?<\/div><\/div>/,rhythmOverview()).replace('Помічник твого ритму.','Мій ритм.');};
const originalRefinePlanModal=planModal;
planModal=function(){originalRefinePlanModal();const body=$('modalBody');if(body)body.innerHTML=body.innerHTML.replace('Потім множимо на обраний PAL 1,4 / 1,6 / 1,8 / 2,0.','Потім множимо на обраний PAL у діапазоні 1,4–2,0. Проміжні рівні — приблизні категорії цього застосунку, а не точний вимір твоїх витрат.');};
render();
