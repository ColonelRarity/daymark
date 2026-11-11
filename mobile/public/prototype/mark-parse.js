/* Pure reading of what a person says to Mark. No network and no diary writes. */
(function (root) {
  const MEAL = [
    [/сніданок|завтрак|breakfast/i, "breakfast"],
    [/ланч|обід|обед|lunch/i, "lunch"],
    [/вечеря|вечерю|ужин|dinner/i, "dinner"],
    [/перекус|snack/i, "snack"],
    [/напій|напой|drink/i, "drink"]
  ];
  const OFF = /погод|мод[ауие]|одяг|політик|футбол|кіно|серіал|крипт|акці|гороскоп|новин/;
  const ON = /їж|калор|снідан|обід|вечер|перекус|ланч|тренув|крок|сон|медитац|настр|голод|ваг|план|таріл|порці|з['’]ї/;

  function mealType(text) {
    for (const [pattern, type] of MEAL) if (pattern.test(text)) return type;
    return null;
  }

  function isOffTopic(text) {
    return OFF.test(String(text || "")) && !ON.test(String(text || ""));
  }

  function portion(text) {
    const grams = String(text || "").match(/(\d+(?:[.,]\d+)?)\s*(?:грам(?:ів|и)?|гр|г|g)\b/i);
    if (grams) return { grams: Number(grams[1].replace(",", ".")), unit: "g", fraction: null };
    const ml = String(text || "").match(/(\d+(?:[.,]\d+)?)\s*(?:мл|ml)\b/i);
    if (ml) return { grams: Number(ml[1].replace(",", ".")), unit: "ml", fraction: null };
    if (/повн/i.test(text) && /таріл/i.test(text)) return { grams: null, unit: "g", fraction: 1 };
    if (/половин/i.test(text)) return { grams: null, unit: "g", fraction: 0.5 };
    if (/третин/i.test(text)) return { grams: null, unit: "g", fraction: 0.33 };
    if (/чверт/i.test(text)) return { grams: null, unit: "g", fraction: 0.25 };
    return { grams: null, unit: "g", fraction: null };
  }

  function items(text) {
    let body = String(text || "");
    for (const [pattern] of MEAL) body = body.replace(pattern, " ");
    body = body.replace(/повн[а-яіїєґ'’]*\s+тарілк[а-яіїєґ'’]*|половин[а-яіїєґ'’]*(?:\s+тарілк[а-яіїєґ'’]*)?|третин[а-яіїєґ'’]*|чверт[а-яіїєґ'’]*|тарілк[а-яіїєґ'’]*/gi, " ");
    body = body.replace(/\d+(?:[.,]\d+)?\s*(?:грам(?:ів|и)?|гр|г|мл|ml|g)\b/gi, " ");
    return body.split(/,| і | та |\+|також|;/i).map(part => part.replace(/[^0-9A-Za-zА-Яа-яІіЇїЄєҐґ'’\s-]/g, " ").replace(/\s+/g, " ").trim()).filter(part => part.length > 1);
  }

  function intent(text) {
    if (isOffTopic(text)) return "off";
    if (/медитац|заспок|афірмац/i.test(text)) return "meditation";
    if (/тренув|прогулян|зал\b|розмин/i.test(text)) return "workout";
    if (/порадь|що з['’]?їсти|вкласт|доїсти|залишил/i.test(text)) return "advice";
    if (mealType(text) || items(text).length) return "log";
    if (/сумно|устал|злю|не можу|сором|молодец|тривог|настрій|важко/i.test(text)) return "emotion";
    return "chat";
  }

  function parseMealUtterance(text) {
    const raw = String(text || "").trim();
    const amount = portion(raw);
    return {
      text: raw,
      type: mealType(raw),
      intent: intent(raw),
      offTopic: isOffTopic(raw),
      items: items(raw),
      grams: amount.grams,
      unit: amount.unit,
      fraction: amount.fraction
    };
  }

  function toneFor(day) {
    const check = day && day.checkIn;
    if (check && (check.energy === "low" || check.hunger === "high")) return "support";
    if (day && day.over) return "steady";
    if (day && day.logged) return "praise";
    return "motivate";
  }

  const api = { parseMealUtterance: parseMealUtterance, isOffTopic: isOffTopic, toneFor: toneFor, mealType: mealType };
  root.MarkParse = api;
})(typeof window !== "undefined" ? window : globalThis);
