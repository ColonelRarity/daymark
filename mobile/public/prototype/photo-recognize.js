/* Same zero-shot plate recognizer as the web nutrition module, wired into the photo sheet. */
const PLATE_DISHES = [
  ["pizza", "піца"],
  ["cheeseburger", "бургер"],
  ["sushi", "суші"],
  ["a bowl of red borscht", "борщ"],
  ["beetroot soup with sour cream", "борщ"],
  ["pasta", "паста"],
  ["cake", "торт"],
  ["fruit tart", "тарт"],
  ["a bowl of soup", "суп"],
  ["roast chicken", "курка"],
  ["rice dish", "рис"],
  ["bread", "хліб"],
  ["coffee", "кава"],
  ["ice cream", "морозиво"],
  ["croissant", "круасан"],
  ["shawarma", "шаурма"],
  ["ramen", "рамен"],
  ["hummus", "хумус"],
  ["falafel", "фалафель"],
  ["omelette", "омлет"],
  ["green salad", "салат"],
  ["beef steak", "стейк"],
  ["grilled fish", "риба"],
  ["potatoes", "картопля"],
  ["apple", "яблуко"],
  ["banana", "банан"],
  ["yogurt", "йогурт"],
  ["cheese", "сир"],
  ["chocolate dessert", "шоколад"],
  ["cookie", "печиво"],
  ["spring roll", "спрінг-рол"],
  ["dumpling", "пельмені"],
  ["french fries", "картопля фрі"]
];

let plateModel = null;

function plateClassifier() {
  if (!plateModel) {
    plateModel = import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1").then(async ({pipeline, env}) => {
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      return pipeline("zero-shot-image-classification", "Xenova/clip-vit-base-patch32", {dtype: "q8"});
    }).catch(error => {
      plateModel = null;
      throw error;
    });
  }
  return plateModel;
}

function focusPlate(uri) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const side = Math.min(image.width, image.height) * 0.62;
      const canvas = document.createElement("canvas");
      canvas.width = 224;
      canvas.height = 224;
      canvas.getContext("2d").drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 224, 224);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    image.onerror = () => resolve(uri);
    image.src = uri;
  });
}

async function recognizePlate(uri) {
  const run = await plateClassifier();
  const focused = await focusPlate(uri);
  const ranked = await run(focused, PLATE_DISHES.map(item => item[0]), {hypothesis_template: "a photo of {}"});
  const byLabel = new Map(PLATE_DISHES);
  const guesses = [];
  for (const item of ranked) {
    const query = byLabel.get(item.label) || item.label;
    if (guesses.some(guess => guess.query === query)) continue;
    guesses.push({query, score: item.score});
    if (guesses.length === 3) break;
  }
  return guesses;
}

const basePhotoModal = photoModal;
photoModal = function () {
  basePhotoModal();
  const sub = document.querySelector("#modalBody .modal-sub");
  if (sub) sub.textContent = "Завантаж фото тарілки. Розпізнавач запропонує страву, а вагу й калорії уточниш ти.";
  const help = document.querySelector("#modalBody .field-help");
  if (help) help.textContent = "Кнопка прикладу показує фіксований боул і не дивиться на твоє фото. Підказка з’являється після завантаження знімка.";
};

const baseUploadPlate = uploadPlate;
uploadPlate = async function (event) {
  await baseUploadPlate(event);
  if (!modalData.photo || !$("photoFeedback")) return;
  const stale = $("photoFeedback").querySelector(".note");
  if (stale) stale.remove();
  const box = document.createElement("div");
  box.id = "photoGuesses";
  box.innerHTML = "<p class=\"note\">Дивлюсь на фото…</p>";
  const preview = $("photoFeedback").querySelector(".upload-preview");
  if (preview) preview.insertAdjacentElement("afterend", box);
  else $("photoFeedback").appendChild(box);
  try {
    const guesses = await recognizePlate(modalData.photo);
    if (!$("photoGuesses")) return;
    box.innerHTML = "<p class=\"note\">Схоже на це. Обери страву й уточни вагу: розпізнавач не бачить грами.</p><div class=\"catalog-ideas\">" + guesses.map(guess => "<button type=\"button\" data-query=\"" + esc(guess.query) + "\">" + esc(guess.query) + " · " + Math.round(guess.score * 100) + "%</button>").join("") + "</div>";
    box.querySelectorAll("button").forEach(button => {
      button.addEventListener("click", () => catalogueSearch(button.dataset.query));
    });
  } catch (error) {
    box.innerHTML = "<p class=\"note\">Не вдалося розпізнати це фото. Знайди страву в базі або внеси калорії вручну.</p>";
  }
};
