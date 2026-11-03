/* DAYMARK / an explainable seven-day prototype, not clinical meal or exercise prescription. */
const WEEK_STUDIO_KEY='daymark-week-studio-v1';
const WEEK_PANTRY=['chicken','turkey','beef','pork','mince','salmon','whitefish','tuna','shrimp','egg','curd','yogurt','milk','cheese','softcheese','feta','mozzarella','kefir','rice','buckwheat','bulgur','couscous','oats','pasta','bread','lavash','potato','beans','chickpeas','lentils','tofu','hummus','tomato','cucumber','greens','cabbage','broccoli','carrot','beet','zucchini','pepper','mushroom','pumpkin','avocado','frozenveg','banana','apple','berries','nuts','seeds','peanut'];
const WEEK_AVOID={fish:'Риба й морепродукти',dairy:'Молочне',egg:'Яйця',nuts:'Горіхи',gluten:'Пшениця / глютен',meat:'М’ясо й птиця',soy:'Соя',sesame:'Кунжут',peanut:'Арахіс',pork:'Свинина',beef:'Яловичина',chicken:'Курка',mushroom:'Гриби',oats:'Вівсянка',banana:'Банани',tofu:'Тофу',pasta:'Макарони',rice:'Рис',tomato:'Помідори',onion:'Цибуля'};
const WEEK_MEAL_LAYOUT={2:{slots:['lunch','dinner'],fractions:[.5,.5],names:['ПЕРШИЙ ПРИЙОМ','ДРУГИЙ ПРИЙОМ']},3:{slots:['breakfast','lunch','dinner'],fractions:[.29,.36,.35],names:['СНІДАНОК','ОБІД','ВЕЧЕРЯ']},4:{slots:['breakfast','lunch','dinner','snack'],fractions:[.25,.32,.31,.12],names:['СНІДАНОК','ОБІД','ВЕЧЕРЯ','ПЕРЕКУС']},5:{slots:['breakfast','snack','lunch','snack','dinner'],fractions:[.22,.1,.3,.1,.28],names:['СНІДАНОК','ПЕРЕКУС','ОБІД','ЩЕ ПЕРЕКУС','ВЕЧЕРЯ']}};
const WEEK_DAYS=['Нд','Пн','Вт','Ср','Чт','Пт','Сб'];
let weekStudio=null,weekMessage='',weekActiveDay=today();
try{weekStudio=JSON.parse(localStorage.getItem(WEEK_STUDIO_KEY));}catch{}
function weekValid(p){return p&&p.version===2&&Array.isArray(p.days)&&p.days.length===7&&validDate(p.start)&&p.days.every((d,i)=>d.date===offset(p.start,i)&&Array.isArray(d.meals)&&d.meals.every(m=>RECIPES.some(r=>r.id===m.id)&&[1,1.5,2].includes(m.servings)));}
if(!weekValid(weekStudio))weekStudio=null;
state.weekStudio=weekStudio;
const originalWeekValidation=validateState;
validateState=function(data){const out=originalWeekValidation(data);out.weekStudio=weekValid(data.weekStudio)?data.weekStudio:null;return out;};

function weekOptions(opts,current){return opts.map(([v,t])=>'<option value="'+v+'" '+(String(current)===String(v)?'selected':'')+'>'+t+'</option>').join('');}
function weekGoalPurpose(){return GOAL_TEMPLATES[goal().kind]?.nutrition||'maintain';}
function weekEnergy(){
  const plan=state.dayPlan;
  if(plan&&plan.care)return{target:null,maintenance:null,notice:'Для цього плану автоматичну калорійність не ставимо. Меню можна зібрати без цифри.',fromProfile:false,rate:null};
  if(plan&&plan.calories)return{target:Number(plan.calories),maintenance:plan.maintenance||plan.calories,notice:'Порції зібрані під ту саму цифру, що на головній. У день із тренуванням меню щільніше.',fromProfile:true,rate:plan.weeklyKg||null};
  return{target:null,maintenance:null,notice:'Спочатку заповни план один раз — і меню отримає твою цифру. Зараз страви без персональної калорійності.',fromProfile:false,rate:null};
}
function weekBodyContext(){
  const plan=state.dayPlan;
  const goalLine='<div class="week-goal-context"><b>Твоя ціль: '+esc(goal().title)+'</b><span>'+fdate(goal().start,true)+' — '+fdate(goal().end,true)+' · '+num(total(goal()))+' днів</span><button type="button" data-view="goals">Змінити дату ↗</button></div>';
  if(plan&&plan.calories)return '<div class="week-form-intro"><span>01 / ТВІЙ ПЛАН</span><h2>Меню візьме вже відому цифру.</h2><p>Стать, вік, вага й активність живуть в одному плані. Тут лише смак і зручний рух.</p></div><div class="week-goal-context"><b>Звичайний день ≈ '+num(plan.calories)+' ккал</b><span>У день із тренуванням страви будуть щільніші. Змінити дані можна в плані, не тут.</span><button type="button" data-action="plan">Відкрити мій план ↗</button></div>'+goalLine;
  return '<div class="week-form-intro"><span>01 / ТВІЙ ПЛАН</span><h2>Спершу одна анкета.</h2><p>Без неї меню збереться, але без твоєї калорійності. Після плану щоденник, ідеї їжі й тиждень беруть одну цифру.</p></div><div class="week-goal-context"><b>Плану ще немає</b><span>Стать, вік, вага й активність вводяться один раз.</span><button type="button" data-action="plan">Заповнити мій план ↗</button></div>'+goalLine;
}
function weekCandidate(r,p,slot){
  const list=slot==='breakfast'?['breakfast']:slot==='lunch'?['lunch','soup','salad']:slot==='dinner'?['dinner','lunch','salad']:['snack','dessert','drink'];
  if(!list.includes(r.category))return false;
  if(p.maxTime&&r.minutes>p.maxTime)return false;
  const ids=r.ingredients.map(x=>x.id);
  if(p.avoid.includes('meat')&&ids.some(x=>['chicken','turkey','beef','pork','mince'].includes(x)))return false;
  if(p.avoid.includes('fish')&&ids.some(x=>['salmon','whitefish','tuna','shrimp'].includes(x)))return false;
  if(p.avoid.some(a=>ids.includes(a)))return false;
  if(p.avoid.some(a=>r.ingredients.some(x=>RECIPE_INGREDIENTS[x.id].allergens.includes(a)||(a==='nuts'&&x.id==='peanut'))))return false;
  return true;
}
function weekPick(p,slot,target,used,seed,exclude){
  const candidates=RECIPES.filter(r=>r.id!==exclude&&weekCandidate(r,p,slot));
  if(!candidates.length)return null;
  let scored=[];
  for(const r of candidates)for(const servings of [1,1.5,2]){
    const kcal=recipeEstimate(r,servings).kcal;
    const pantry=r.ingredients.filter(x=>p.pantry.includes(x.id)).length;
    const liked=p.likes==='soups'&&r.category==='soup'||p.likes==='salads'&&r.category==='salad'||p.likes==='pasta'&&r.ingredients.some(x=>x.id==='pasta')||p.likes==='meat'&&['meat','poultry'].includes(r.protein);
    const fit=typeof recipeGoalScore==='function'?recipeGoalScore(r,target):0;
    const score=(used.has(r.id)?-240:0)+(liked?28:0)+pantry*18-Math.abs(kcal-target)/12+fit-((seed+r.id.length*7)%17);
    scored.push({id:r.id,servings,score});
  }
  scored.sort((a,b)=>b.score-a.score);
  return{ id:scored[0].id,servings:scored[0].servings };
}
function weekBuild(p,energy){
  const start=today(),used=new Set(),layout=WEEK_MEAL_LAYOUT[p.meals]||WEEK_MEAL_LAYOUT[3],types=layout.slots;
  const fractions=layout.fractions;
  const days=Array.from({length:7},(_,i)=>{
    const date=offset(start,i);
    const live=energy.fromProfile&&typeof dayEnergy==='function'?dayEnergy(date).target:0;
    const target=live||energy.target||1800;
    return {date,target:energy.fromProfile?target:null,meals:types.map((slot,j)=>{
      const chosen=weekPick(p,slot,target*fractions[j],used,i*9+j);
      if(chosen)used.add(chosen.id);
      return chosen;
    }).filter(Boolean)};
  });
  return{version:2,start,created:today(),goalId:goal().id,purpose:weekGoalPurpose(),days,prefs:p,target:energy.fromProfile?energy.target:null,maintenance:energy.fromProfile?Math.round((energy.maintenance||0)/10)*10:null,rate:energy.rate||null,energyNotice:energy.notice,profile:{...state.profile},training:[]};
}
function weekSave(){state.weekStudio=weekStudio;try{localStorage.setItem(WEEK_STUDIO_KEY,JSON.stringify(weekStudio));}catch{}persist();}
function weekTrainingSync(p){
  Object.assign(trainingPrefs,{setup:true,goal:weekGoalPurpose()==='lose'?'lose':goal().kind==='muscle'?'muscle':'maintain',likes:p.trainingLikes,place:p.trainingPlace,gear:p.trainingGear,level:p.trainingLevel,time:p.trainingTime,frequency:p.trainingFrequency,limitations:p.medical?'medical':'none',energy:'okay'});
  if(trainingPrefs.place==='outdoor')trainingPrefs.gear='none';
  if(trainingPrefs.place==='gym'&&trainingPrefs.gear==='none')trainingPrefs.gear='machine';
  try{localStorage.setItem(TRAINING_PREF_KEY,JSON.stringify(trainingPrefs));localStorage.removeItem(TRAINING_WEEK_KEY);}catch{}
  return p.trainingFrequency===0?[]:trainingWeek().map(x=>({date:x.date,id:x.plan.id}));
}
function weekFormView(){
  const p=weekStudio?.prefs||{};
  return '<details class="week-settings" '+(!weekStudio?'open':'')+'><summary><span>НАЛАШТУВАННЯ ПЛАНУ</span><strong>'+(weekStudio?'Змінити меню й тренування':'Розкажи, що тобі підходить')+'</strong><b>⌄</b></summary><form id="weekForm">'+weekBodyContext()
  +'<div class="week-form-intro"><span>02 / ЇЖА ЦЬОГО ТИЖНЯ</span><h2>Що хочеться їсти?</h2><p>Обери знайомі продукти — вони отримають пріоритет. Це не обмежує меню лише ними.</p></div><div class="week-fields"><label>Прийомів їжі<select name="meals">'+weekOptions([[3,'3 прийоми'],[4,'3 прийоми + перекус / напій']],p.meals||3)+'</select></label><label>Час на одну страву<select name="maxTime">'+weekOptions([[0,'Будь-який'],[15,'До 15 хв'],[30,'До 30 хв'],[60,'До 60 хв']],p.maxTime??0)+'</select></label><label>Цього тижня більше хочеться<select name="likes">'+weekOptions([['mixed','Різне'],['soups','Супи'],['salads','Салати'],['pasta','Паста'],['meat','М’ясо / птиця']],p.likes||'mixed')+'</select></label></div><div class="week-chip-heading">Що вже є вдома? <small>Обери кілька</small></div><div class="week-chips">'+WEEK_PANTRY.map(id=>'<label><input type="checkbox" name="pantry" value="'+id+'" '+((p.pantry||[]).includes(id)?'checked':'')+'><span>'+esc(RECIPE_INGREDIENTS[id].name)+'</span></label>').join('')+'</div><div class="week-chip-heading">Чого не пропонувати?</div><div class="week-chips">'+Object.entries(WEEK_AVOID).map(([id,n])=>'<label><input type="checkbox" name="avoid" value="'+id+'" '+((p.avoid||[]).includes(id)?'checked':'')+'><span>'+n+'</span></label>').join('')+'</div><p class="week-fine">Це фільтр уподобань, не перевірка алергенів. При алергії завжди перевіряй склад і перехресний контакт.</p>'
  +'<div class="week-form-intro"><span>03 / РУХ</span><h2>Як тобі зручно?</h2><p>Ми підберемо програми з бібліотеки. Ти можеш змінити формат або не складати тренування автоматично.</p></div><div class="week-fields"><label>Де займатися<select name="trainingPlace">'+weekOptions([['home','Вдома'],['gym','У залі'],['outdoor','На вулиці']],p.trainingPlace||trainingPrefs.place||'home')+'</select></label><label>Що до душі<select name="trainingLikes">'+weekOptions([['mixed','Поєднувати'],['walking','Ходьба / легкий рух'],['strength','Силові'],['cardio','Кардіо']],p.trainingLikes||trainingPrefs.likes||'mixed')+'</select></label><label>Інвентар<select name="trainingGear">'+weekOptions([['none','Без інвентарю'],['band','Резинка'],['dumbbell','Гантелі'],['machine','Тренажери']],p.trainingGear||trainingPrefs.gear||'none')+'</select></label><label>Досвід<select name="trainingLevel">'+weekOptions([['beginner','Починаю'],['regular','Тренуюся регулярно']],p.trainingLevel||trainingPrefs.level||'beginner')+'</select></label><label>Разів на тиждень<select name="trainingFrequency">'+weekOptions([[2,'2'],[3,'3'],[4,'4']],p.trainingFrequency||trainingPrefs.frequency||3)+'</select></label><label>Час на тренування<select name="trainingTime">'+weekOptions([[15,'15 хв'],[20,'20 хв'],[30,'30 хв'],[45,'45 хв'],[60,'60 хв']],p.trainingTime||trainingPrefs.time||30)+'</select></label></div><label class="week-check"><input type="checkbox" name="medical" '+(p.medical?'checked':'')+'>Є обмеження або не знаю, яке навантаження дозволене — план тренувань автоматично не призначати</label><p class="week-fine">Це підбір із готових програм, не медична рекомендація. Якщо є біль, травма чи протипоказання, узгодь навантаження з фахівцем.</p><button class="week-generate" type="submit">'+(weekStudio?'Оновити мій тиждень':'Зібрати мій тиждень')+' <b>↗</b></button></form></details>';
}
function weekMealCard(m,date,index){
  const r=RECIPES.find(x=>x.id===m.id),done=state.logs[date]?.meals?.some(x=>x.name===r?.title);
  if(!r)return'';
  const names=(WEEK_MEAL_LAYOUT[weekStudio?.prefs?.meals]||WEEK_MEAL_LAYOUT[3]).names;
  return '<article class="week-meal"><button class="week-meal-main" data-action="week-recipe" data-id="'+r.id+'" data-servings="'+m.servings+'">'+recipeArt(r)+'<span><small>'+names[index]+' · '+r.minutes+' хв</small><strong>'+esc(r.title)+'</strong><em>≈ '+num(Math.round(recipeEstimate(r,m.servings).kcal/10)*10)+' ккал · '+num(m.servings,1)+' порц.</em></span><b>↗</b></button><div class="week-meal-actions"><button data-action="week-swap" data-date="'+date+'" data-index="'+index+'">Замінити страву ↻</button>'+(date<=today()?'<button data-action="week-log" data-date="'+date+'" data-id="'+r.id+'" data-servings="'+m.servings+'">'+(done?'✓ Є у щоденнику':'Внести після їжі +')+'</button>':'<span>Внести можна у день прийому</span>')+'</div></article>';
}
function weekResult(){
  if(!weekStudio)return'<div class="week-empty"><div>🥗</div><h2>Твоє меню ще не складено.</h2><p>Відповідай на кілька питань вище — побачиш сім днів із конкретними стравами та тренуваннями.</p></div>';
  const p=weekStudio,stale=p.start>today()||diff(p.start,today())>=7,otherGoal=p.goalId!==goal().id,drift=!!(state.dayPlan&&state.dayPlan.calories&&p.target&&Math.abs(state.dayPlan.calories-p.target)>=80);
  return '<div class="week-results"><div class="week-results-head"><span>ТВІЙ ТИЖДЕНЬ / '+fdate(p.start)+' — '+fdate(offset(p.start,6))+'</span><h2>Тепер є план.<br><em>І право його змінювати.</em></h2><p>'+(p.target?'Звичайний день ≈ '+num(p.target)+' ккал. День із тренуванням зібраний щільніше. ':'Без персональної цифри калорій. ')+esc(p.energyNotice)+'</p>'+(stale||otherGoal||drift?'<div class="week-alert">'+(drift?'Орієнтир плану тепер '+num(state.dayPlan.calories)+' ккал, а це меню зібрано під '+num(p.target)+'. Онови тиждень, щоб порції зійшлися. ':'')+(otherGoal?'Цей план складено для іншої цілі. ':'')+(stale?'Цей план складено на попередні сім днів. ':'')+(stale||otherGoal?'Онови його у налаштуваннях вище.':'')+'</div>':'')+'<div class="week-results-actions"><button data-action="week-shopping">🛒 Покупки на тиждень ↗</button><button data-view="recipes">Усі рецепти ↗</button></div></div><div class="week-strip"><span>01 / МЕНЮ</span><strong>7 днів · '+p.days.reduce((n,d)=>n+d.meals.length,0)+' страв</strong><small>Відкрий потрібний день. План не дорівнює з’їденому — запис у щоденник лише після їжі.</small></div><div class="week-days">'+p.days.map((d,i)=>{const totalKcal=d.meals.reduce((n,m)=>{const r=RECIPES.find(x=>x.id===m.id);return n+(r?recipeEstimate(r,m.servings).kcal:0);},0),shown=Math.round(totalKcal/10)*10,aim=typeof dayEnergy==='function'&&state.dayPlan&&state.dayPlan.calories?dayEnergy(d.date).target:(d.target||null);return '<details class="week-day '+(d.date===today()?'today':'')+'" data-date="'+d.date+'" '+(d.date===weekActiveDay?'open':'')+'><summary class="week-day-head"><span>'+WEEK_DAYS[dt(d.date).getUTCDay()]+' · '+fdate(d.date)+'</span><strong>≈ '+num(shown)+(aim&&Math.abs(aim-shown)>=40?' з '+num(aim):'')+' ккал <b>⌄</b></strong></summary>'+d.meals.map((m,j)=>weekMealCard(m,d.date,j)).join('')+'</details>';}).join('')+'</div><div class="week-strip movement"><span>02 / ТРЕНУВАННЯ</span><strong>'+(p.prefs.medical?'План руху не призначено':p.training.length+' сесії на тиждень')+'</strong><small>Час і програми можна змінити в налаштуваннях. Дні без сесій — відновлення або комфортний рух.</small></div>'+(p.prefs.medical?'<div class="week-alert">Ти відмітила обмеження. Автоматичного тренувального плану немає — спершу узгодь допустиме навантаження.</div>':p.training.length?'<div class="week-move-list">'+p.training.map((s,i)=>{const x=trainingPlan(s.id);if(!x)return'';const done=state.logs[s.date]?.workouts?.some(w=>w.programId===x.id);return '<button data-action="training-open" data-id="'+x.id+'"><span class="week-move-symbol">'+(x.place==='outdoor'?'🚶':x.place==='gym'?'🏋️':'💪')+'</span><span><small>'+WEEK_DAYS[dt(s.date).getUTCDay()]+' · '+fdate(s.date)+' · '+x.minutes+' хв</small><strong>'+esc(x.name)+'</strong><em>'+(done?'✓ Записано у щоденник':esc(x.tag))+'</em></span><b>↗</b></button>';}).join('')+'</div>':'<div class="week-alert">Для цих побажань не знайшли безпечної комбінації готових програм. Зміни інвентар або місце занять.</div>')+'<p class="week-disclaimer">Рецепти й порції — редагований приклад, а не лікувальний раціон. Калорії приблизні; приготування, олія та бренди змінюють результат. Для точнішого особистого плану потрібен фахівець. <a href="https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner" target="_blank" rel="noopener">NIH Body Weight Planner ↗</a></p></div>';
}
const originalWeekResult=weekResult;
weekResult=function(){const html=originalWeekResult();if(!weekStudio?.target)return html;return html.replace('<div class="week-results-actions">','<details class="week-math"><summary>Звідки цифра меню? ↗</summary><p>Порції зібрані під орієнтир плану: близько '+num(weekStudio.target)+' ккал у звичайний день. Заплановане тренування піднімає лише цей день, тією самою оцінкою, що й цифра на головній. Окремої формули для меню немає.</p></details><div class="week-results-actions">');};
function weekView(){return '<div class="week-page"><div class="week-hero"><span>DAYMARK / МІЙ ТИЖДЕНЬ</span><div class="week-hero-visual" aria-hidden="true"><i>🍽️</i><i>🏋️</i><i>📅</i></div><h1>Їжа й рух.<br><em>В одному плані.</em></h1><p>Скажи, що любиш, що вже є вдома і коли тобі зручно займатися. Ми зберемо сім днів — ти можеш змінити будь-який із них.</p><div class="week-hero-count"><b>07</b><span>днів, які можна<br>підлаштувати</span></div></div>'+weekFormView()+weekMessage+' '+weekResult()+'</div>';}
function weekError(form,message){let box=form.querySelector('.week-form-error');if(!box){box=document.createElement('p');box.className='week-form-error';box.setAttribute('role','alert');form.querySelector('.week-generate').before(box);}box.textContent=message;box.scrollIntoView({block:'center',behavior:'smooth'});}
function weekGenerate(form){
  const data=new FormData(form),v=Object.fromEntries(data.entries()),p={meals:WEEK_MEAL_LAYOUT[Number(v.meals)]?Number(v.meals):3,maxTime:Number(v.maxTime)||0,likes:v.likes||'mixed',pantry:data.getAll('pantry').filter(id=>WEEK_PANTRY.includes(id)),avoid:data.getAll('avoid').filter(id=>WEEK_AVOID[id]),individual:v.individual==='on',trainingPlace:v.trainingPlace,trainingLikes:v.trainingLikes,trainingGear:v.trainingGear,trainingLevel:v.trainingLevel,trainingFrequency:[0,1,2,3,4,5].includes(Number(v.trainingFrequency))?Number(v.trainingFrequency):3,trainingTime:Number(v.trainingTime)||30,medical:v.medical==='on'};
  if(!form.reportValidity())return;
  const energy=weekEnergy();
  const training=weekTrainingSync(p);
  const plan=weekBuild(p,energy);
  if(plan.days.some(d=>d.meals.length!==p.meals)){weekError(form,'Для цих обмежень поки замало рецептів. Послаб один фільтр або збільш час приготування.');return;}
  plan.training=training;plan.profile={...state.profile};plan.target=energy.fromProfile?energy.target:null;
  weekStudio=plan;weekActiveDay=today();weekMessage='';weekSave();render();$('view').scrollTop=0;toast('Меню й рух на 7 днів збережено. Можеш замінити будь-яку страву.');
}
function weekSwap(b){
  if(!weekStudio)return;const day=weekStudio.days.find(x=>x.date===b.dataset.date),index=Number(b.dataset.index);if(!day||!day.meals[index])return;
  const slot=(WEEK_MEAL_LAYOUT[weekStudio.prefs.meals]||WEEK_MEAL_LAYOUT[3]).slots[index],used=new Set(weekStudio.days.flatMap(d=>d.meals.map(x=>x.id))),previous=day.meals[index];
  const current=RECIPES.find(x=>x.id===previous.id),wanted=current?recipeEstimate(current,previous.servings).kcal:weekStudio.target/3||500;
  used.add(previous.id);const next=weekPick(weekStudio.prefs,slot,wanted,used,Date.now()%1000,previous.id);
  if(!next){toast('За цими побажаннями інших страв немає. Зміни фільтри вище.');return;}
  day.meals[index]=next;weekActiveDay=day.date;weekSave();render();toast('Страву замінено. Список покупок можна оновити.');
}
function weekShopping(){
  if(!weekStudio)return;
  const all=weekShoppingItems(),checked=weekStudio.checked||[];
  openModal('ПОКУПКИ / МІЙ ТИЖДЕНЬ','<h2 class="modal-title">Усе на цей тиждень.<br>Одним списком.</h2><p class="modal-sub">Інгредієнти складені для всіх '+weekStudio.days.flatMap(d=>d.meals).length+' запланованих страв. Після заміни меню цей список оновиться. Перевір, що вже є вдома, і звір кількості з рецептом та упаковками.</p>'+[...new Set(all.map(x=>x.aisle))].map(a=>'<section class="shopping-group"><h3>'+esc(a)+'</h3>'+all.filter(x=>x.aisle===a).map(x=>'<label class="shopping-item '+(checked.includes(x.id)?'checked':'')+'"><input type="checkbox" data-week-shop="'+x.id+'" '+(checked.includes(x.id)?'checked':'')+'><span>'+esc(x.name)+'</span><b>'+quantity(x.qty)+' '+esc(x.unit)+'</b></label>').join('')+'</section>').join('')+'<div class="form-actions"><button class="btn ghost" data-action="week-copy">Скопіювати</button><button class="btn blue" data-action="week-download">Завантажити список</button></div>');
  document.querySelectorAll('[data-week-shop]').forEach(el=>el.onchange=()=>{const id=el.dataset.weekShop;weekStudio.checked=weekStudio.checked||[];weekStudio.checked=el.checked?[...new Set([...weekStudio.checked,id])]:weekStudio.checked.filter(x=>x!==id);el.closest('.shopping-item').classList.toggle('checked',el.checked);weekSave();});
}
function weekShoppingItems(){const ingredients={};if(!weekStudio)return[];for(const m of weekStudio.days.flatMap(d=>d.meals)){const r=RECIPES.find(x=>x.id===m.id);if(!r)continue;for(const x of r.ingredients){if(!ingredients[x.id])ingredients[x.id]={...RECIPE_INGREDIENTS[x.id],id:x.id,qty:0};ingredients[x.id].qty+=x.qty*m.servings;}}return Object.values(ingredients);}
function weekShoppingText(){const all=weekShoppingItems();return 'DAYMARK · Покупки на 7 днів\n'+fdate(weekStudio.start)+' — '+fdate(offset(weekStudio.start,6))+'\n\n'+[...new Set(all.map(x=>x.aisle))].map(a=>a+'\n'+all.filter(x=>x.aisle===a).map(x=>((weekStudio.checked||[]).includes(x.id)?'✓ ':'□ ')+x.name+' — '+quantity(x.qty)+' '+x.unit).join('\n')).join('\n\n');}
VIEW_NAMES.week='Мій тиждень';
const originalWeekRender=render;
render=function(){originalWeekRender();if(currentView==='week'){$('view').innerHTML=weekView();$('breadcrumb').innerHTML='Мій тиждень <span>/</span> '+(state.demo?'Демонстрація':'Особистий простір');document.body.classList.remove('recipes-view');}};
const originalWeekHome=homeApp;
homeApp=function(){return originalWeekHome().replace('<button class="sport-home-card','<button class="week-home-entry" data-view="week"><span class="week-home-icon">📅</span><span><small>МЕНЮ + ТРЕНУВАННЯ</small><strong>Мій план на 7 днів</strong><em>'+(weekStudio?'Змінити страви й побачити свій тиждень':'Побажання, продукти, час — усе врахуємо')+'</em></span><b>↗</b></button><button class="sport-home-card');};
const originalWeekRecipes=recipesView;
recipesView=function(){return originalWeekRecipes().replace('<div class="recipe-categories"','<button class="week-recipe-entry" data-view="week">📅 Зібрати меню на 7 днів <span>↗</span></button><div class="recipe-categories"');};
const originalWeekSport=sportView;
sportView=function(){return originalWeekSport().replace('<section class="sport-hero"','<button class="week-sport-entry" data-view="week">📅 Тренування й меню на 7 днів <span>↗</span></button><section class="sport-hero"');};
const originalWeekOnboard=onboardSmartView;
onboardSmartView=function(){if(onboard.step!==1)return originalWeekOnboard();originalWeekOnboard();const row=document.querySelector('#onboardForm .pill-row');if(row)row.innerHTML='<button type="button" class="pill" data-action="period-days" data-value="7">1 тиж.</button><button type="button" class="pill" data-action="period-days" data-value="14">2 тиж.</button>'+[[1,'1 міс.'],[3,'3 міс.'],[6,'6 міс.'],[12,'1 рік']].map(([n,t])=>'<button type="button" class="pill" data-action="period" data-value="'+n+'">'+t+'</button>').join('');};
actions['period-days']=b=>{collectOnboard();onboard.end=offset(onboard.start,Number(b.dataset.value)-1);onboardView();};
actions['week-swap']=weekSwap;
actions['week-shopping']=weekShopping;
actions['week-copy']=async()=>{try{await navigator.clipboard.writeText(weekShoppingText());toast('Покупки на тиждень скопійовано');}catch{toast('Не вдалося скопіювати — завантаж список.');}};
actions['week-download']=()=>download(new Blob([weekShoppingText()],{type:'text/plain;charset=utf-8'}),'daymark-week-shopping.txt');
actions['week-recipe']=b=>recipeModal(b.dataset.id,Number(b.dataset.servings)||1);
actions['week-log']=b=>{if(b.dataset.date>today()){toast('Майбутній прийом ще не внесено.');return;}selectedDate=b.dataset.date;recipeModal(b.dataset.id,Number(b.dataset.servings)||1);};
document.addEventListener('submit',e=>{if(e.target.id==='weekForm'){e.preventDefault();weekGenerate(e.target);}});
document.addEventListener('toggle',e=>{if(e.target.matches?.('.week-day')&&e.target.open)weekActiveDay=e.target.dataset.date;},true);
render();
