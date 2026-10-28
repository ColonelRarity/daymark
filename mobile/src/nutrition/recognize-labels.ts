export type DishGuess = {
  query: string;
  label: string;
  score: number;
};

export const DISH_CANDIDATES: [string, string][] = [
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
  ["french fries", "картопля фрі"],
];
