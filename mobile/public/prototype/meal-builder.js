/* A meal is assembled locally before a single diary commit. */
let mealDraft=null;
const originalMealModal=mealModal, originalCatalogue=catalogueSearch, originalFoodView=foodView, originalHome=homeApp;
function startMeal(type='breakfast'){
  if(!mealDraft)mealDraft={type,date:selectedDate,items:[]};
  mealBuilder();
}
function draftTotals(){return ['kcal','p','f','c'].map(k=>mealDraft.items.reduce((s,m)=>s+(m[k]||0),0));}
function mealBuilder(){
  if(!mealDraft)return startMeal();
  modalData={mode:'builder'};
  const [k,p,f,c]=draftTotals(),unknown=mealDraft.items.some(m=>m.kcal===null);
  openModal('МІЙ ПРИЙОМ ЇЖІ / '+fdate(mealDraft.date,true),`<div class="builder-heading"><span class="builder-stamp">🍽️</span><h2 class="modal-title">Збери свою<br>тарілку.</h2></div><div class="meal-tabs">${Object.entries(TYPE_NAMES).filter(([t])=>t!=='drink').map(([t,n])=>`<button class="${mealDraft.type===t?'selected':''}" data-action="draft-type" data-id="${t}" aria-pressed="${mealDraft.type===t}">${n}</button>`).join('')}</div><p class="field-help">Додай усе, що їси й п’єш. Збережи разом, коли тарілка готова.</p><section class="builder-total" aria-live="polite"><span>${TYPE_NAMES[mealDraft.type]} · ${mealDraft.items.length} продуктів</span><strong>${num(k)} <small>ккал${unknown?' + невідомі':''}</small></strong><div>Б ${num(p,1)} г <i>·</i> Ж ${num(f,1)} г <i>·</i> В ${num(c,1)} г</div></section><div class="builder-items">${mealDraft.items.map((m,i)=>`<div class="builder-item"><span class="builder-check">✓</span><button data-action="draft-edit" data-value="${i}"><b>${esc(m.name)}</b><small>${num(m.grams)} ${m.unit==='ml'?'мл':'г'} · ${m.kcal===null?'без оцінки':num(m.kcal)+' ккал'}</small></button><button class="builder-remove" aria-label="Видалити ${esc(m.name)}" data-action="draft-remove" data-value="${i}">×</button></div>`).join('')||'<div class="builder-empty">Тут буде твій сніданок, обід або вечеря.<br>Почни з першого продукту ↓</div>'}</div><div class="builder-methods"><button data-action="draft-search"><span>＋</span><b>Додати продукт</b><small>Знайди й укажи вагу</small></button><button data-action="draft-label"><span>▤</span><b>За етикеткою</b><small>Вага + дані упаковки</small></button></div><p class="field-help">Зважування та правильна етикетка уточнюють розрахунок. Довідкові страви залишаються приблизними.</p><button class="builder-oil" data-action="draft-oil"><span>◉</span><span><b>Була олія чи масло?</b><small>Оливкова, вершкове, гхі та інші · додати грами</small></span><b>＋</b></button><p class="field-help">Додай лише те, що ще не враховано у продукті чи рецепті.</p><button class="builder-photo" data-action="draft-photo"><span>◎</span><span><b>Фото — швидко, але приблизно</b><small>Розпізнавач пропонує страву, але не бачить точну вагу й приховану олію. Вагу уточнюєш ти.</small></span><b>↗</b></button><button class="text-btn" data-action="draft-manual">Внести назву та калорії вручну</button><div class="builder-footer"><button class="btn blue full" data-action="draft-save" ${mealDraft.items.length?'':'disabled'}>✓ Зберегти ${TYPE_NAMES[mealDraft.type].toLowerCase()}</button><small>До збереження продукти залишаються в чернетці.</small></div>`);
}
function draftBack(){const b=document.createElement('button');b.type='button';b.className='draft-back';b.dataset.action='draft-back';b.textContent='← '+TYPE_NAMES[mealDraft.type]+' · '+mealDraft.items.length+' продуктів';$('modalBody').prepend(b);}
catalogueSearch=function(q=''){originalCatalogue(q);if(mealDraft)draftBack();};
mealModal=function(mode='manual',product=null,existing=null){
 originalMealModal(mode,product,existing);
 if(!mealDraft||existing&&log().meals.some(m=>m.id===existing.id))return;
 modalData.inDraft=true;
 modalData.meal.type=mealDraft.type;
 const form=$('mealForm');form.elements.type.value=mealDraft.type;form.elements.type.closest('label').hidden=true;
 form.querySelector('[type="submit"]').textContent='✓ Додати до '+TYPE_NAMES[mealDraft.type].toLowerCase();
 const fav=form.elements.favorite;if(fav)fav.closest('label').hidden=true;
 const del=form.querySelector('[data-action="delete-meal"]');if(del)del.remove();
 if(product){const details=document.createElement('details');details.className='nutrition-details';details.innerHTML='<summary>Перевірити калорії та БЖВ</summary>';const checkbox=$('per100').closest('.soft-check');checkbox.before(details);details.append(checkbox,form.elements.kcal.closest('.form-pair'),form.elements.f.closest('.form-pair'));}
 const fat=form.querySelector('.fat-addon');fat.open=!!existing?.fatAddon;
 const note=document.createElement('p');note.className='field-help';note.textContent='Не додавай масло повторно, якщо воно вже враховане в обраній страві.';fat.append(note);
 draftBack();
};
function stageMeal(form){
 const v=Object.fromEntries(new FormData(form)),factor=$('per100').checked?Number(v.grams)/100:1;
 const m={...modalData.meal,type:mealDraft.type,name:v.name.trim(),grams:Number(v.grams)};
 const base={};for(const k of ['kcal','p','f','c'])base[k]=v[k]===''?null:round(foodFormNumber(k,v[k])*factor);
 Object.assign(m,base);delete m.baseNutrition;delete m.fatAddon;
 const fat=FAT_ADDONS[v.fatType],grams=Number(v.fatGrams||0);
 if(v.fatEnabled==='on'&&fat&&grams>0){m.baseNutrition=base;m.fatAddon={type:v.fatType,method:v.fatMethod,grams,kcal:round(fat.kcal*grams/100),f:round(fat.f*grams/100)};if(m.kcal!==null)m.kcal=round(m.kcal+m.fatAddon.kcal);if(m.f!==null)m.f=round(m.f+m.fatAddon.f);}
 const i=mealDraft.items.findIndex(x=>x.id===m.id);if(i>=0)mealDraft.items[i]=m;else mealDraft.items.push(m);
 mealBuilder();toast('✓ Продукт у твоїй тарілці');
}
document.addEventListener('submit',e=>{if(!mealDraft||!modalData.inDraft||e.target.id!=='mealForm')return;e.preventDefault();e.stopImmediatePropagation();if(e.target.reportValidity())stageMeal(e.target);},true);
function saveMealDraft(){
 if(!mealDraft?.items.length)return;
 if(selectedDate!==mealDraft.date){toast('Повернися до '+fdate(mealDraft.date,true)+' для збереження чернетки');return;}
 if(log().meals.length+mealDraft.items.length>100){toast('Ліміт — 100 продуктів на день');return;}
 const name=TYPE_NAMES[mealDraft.type];log().meals.push(...mealDraft.items.map(m=>({...m,type:mealDraft.type})));log().habits.food=true;log().nutritionComplete=false;persist();mealDraft=null;closeModal();navigate('food');celebrate(name+' збережено ✓');toast('✓ '+name+' у щоденнику');
}
Object.assign(actions,{
 'food-add':()=>startMeal(),'search':()=>startMeal(),'label':()=>{startMeal();mealModal('label');},'manual':()=>{startMeal();mealModal();},
 'draft-type':b=>{mealDraft.type=b.dataset.id;mealBuilder();},'draft-back':mealBuilder,
 'draft-search':()=>catalogueSearch(),'draft-label':()=>mealModal('label'),'draft-manual':()=>mealModal(),
 'draft-photo':()=>{photoModal();draftBack();},'draft-remove':b=>{mealDraft.items.splice(Number(b.dataset.value),1);mealBuilder();},
 'draft-edit':b=>mealModal('manual',null,mealDraft.items[Number(b.dataset.value)]),'draft-save':saveMealDraft,
 'draft-oil':()=>{mealModal('manual',{name:'Оливкова олія',kcal:900,p:0,f:100,c:0,serving:5,unit:'g',emoji:'◉'});const form=$('mealForm');form.querySelector('.fat-addon').hidden=true;const select=document.createElement('select');select.setAttribute('aria-label','Вид олії або масла');select.innerHTML=Object.entries(FAT_ADDONS).map(([k,x])=>`<option value="${k}" ${k==='olive'?'selected':''}>${x.name}</option>`).join('');select.onchange=()=>{const x=FAT_ADDONS[select.value];form.elements.name.value=x.name;form.elements.kcal.value=x.kcal;form.elements.f.value=x.f;portionResult();};form.prepend(select);},
 'draft-start':b=>startMeal(b.dataset.id||'breakfast')
});
function mealEntry(){return `<section class="meal-entry"><div><span class="tiny-cap">ОДИН ПРИЙОМ · ОДНА ТАРІЛКА</span><h2>Що сьогодні на тарілці?</h2><p>Продукти, напій і масло — зберігай разом.</p></div><div class="meal-entry-buttons">${[['breakfast','☀','Сніданок'],['lunch','◒','Обід'],['dinner','☾','Вечеря'],['snack','🍎','Перекус']].map(([t,i,n])=>`<button data-action="draft-start" data-id="${t}"><span>${i}</span><b>${n}</b><small>＋ Зібрати</small></button>`).join('')}</div>${mealDraft?'<button class="text-btn" data-action="food-add">Продовжити чернетку →</button>':''}</section>`;}
foodView=function(){return mealEntry()+originalFoodView();};
homeApp=function(){return originalHome().replace('<div class="home-quick-heading">',mealEntry()+'<div class="home-quick-heading">');};
render();
