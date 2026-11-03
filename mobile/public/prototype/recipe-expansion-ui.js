// Keep the existing recipe interactions and local saved/shopping state intact.
const expandedCategories={breakfast:'Сніданки',lunch:'Обіди',dinner:'Вечері',soup:'Супи',salad:'Салати',snack:'Перекуси',dessert:'Десерти',drink:'Напої'};
for(const key of Object.keys(RECIPE_CATEGORIES))delete RECIPE_CATEGORIES[key];
Object.assign(RECIPE_CATEGORIES,expandedCategories);

const originalRecipeArt=recipeArt;
recipeArt=function(r,extra=''){
  const legacy=r.artSheet==null,index=RECIPES.indexOf(r),sheet=legacy?Math.floor(index/16):r.artSheet,cell=legacy?index%16:r.artCell;
  const tile=(legacy?'base-':'more-')+sheet+'-'+String(cell).padStart(2,'0')+'.webp';
  return '<div class="recipe-art '+(legacy?'recipe-art-legacy ':'recipe-art-expanded ')+extra+'" style="background-image:url(assets/recipe-tiles/'+tile+');background-size:cover;background-position:center" role="img" aria-label="Згенерована ілюстрація: '+esc(r.title)+'"></div>';
};

const originalRecipesView=recipesView;
recipesView=function(){return originalRecipesView()
  .replace('100 ІДЕЙ / ВИБИРАЙ ПІД СЕБЕ',RECIPES.length+' ІДЕЙ / ВИБИРАЙ ПІД СЕБЕ')
  .replace('>100<span>варіантів', '>'+RECIPES.length+'<span>варіантів')
  .replace('Кожна страва має власну згенеровану ілюстрацію; вигляд і подача можуть відрізнятися.', 'Ілюстрації показують ідею страви; вигляд, склад і подача можуть відрізнятися від твоїх продуктів.');};
const originalRecipeHomeFeature=recipeHomeFeature;
recipeHomeFeature=function(){return originalRecipeHomeFeature().replace('100 ІДЕЙ ДЛЯ ЇЖІ',RECIPES.length+' ІДЕЙ ДЛЯ ЇЖІ');};
const originalFoodView=foodView;
foodView=function(){return originalFoodView().replace('100 ідей під твій настрій',RECIPES.length+' ідей під твій настрій');};
const originalSpacesModal=spacesModal;
spacesModal=function(){originalSpacesModal();const modal=document.querySelector('#modalBody');if(modal)modal.innerHTML=modal.innerHTML.replace('100 ідей',RECIPES.length+' ідей');};
const originalRecipeModal=recipeModal;
recipeModal=function(id,servings){originalRecipeModal(id,servings);const caption=document.querySelector('.recipe-detail-image .image-caption');if(caption)caption.textContent='Ілюстрація · подача може відрізнятися';};
const originalRecipeToDiary=actions['recipe-to-diary'];
actions['recipe-to-diary']=function(button){
  const recipe=RECIPES.find(r=>r.id===button.dataset.id);
  if(!recipe)return originalRecipeToDiary(button);
  const originalCategory=recipe.category;
  // These are recipe browsing groups, not diary meal types. Default to lunch; the meal form remains editable.
  if(['soup','salad'].includes(originalCategory))recipe.category='lunch';
  try{originalRecipeToDiary(button);}finally{recipe.category=originalCategory;}
  if(recipe.ingredients.some(x=>['oil','butter'].includes(x.id))){
    const note=document.querySelector('#mealForm > .note');
    if(note)note.textContent+=' Олія або масло зі складу рецепта вже враховані. Окремо додавай лише те, що було понад рецепт.';
  }
};
const originalHomeApp=homeApp;
homeApp=function(){return originalHomeApp().replace('100 смачних ідей',RECIPES.length+' смачних ідей');};
render();
