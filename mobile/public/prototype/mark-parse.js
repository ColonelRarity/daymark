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

  const FILLER = /^(?:алло|ало|алё|точка|крапка|привіт|привет|доброго|добрий|день|це|ну|от|так|марк|слухай|запиши|запишіть|будь|ласка)[\s,.:;!-]*/i;
  const NOISE = "(?:алло|ало|точка|крапка|привіт|привет|це|кучі|куча|відсотків|відсоток|відсотки|процентів|біло)";

  function stripNoise(value) {
    return String(value || "").replace(new RegExp("(^|[^A-Za-zА-Яа-яІіЇїЄєҐґ])" + NOISE + "(?=$|[^A-Za-zА-Яа-яІіЇїЄєҐґ])", "gi"), "$1 ");
  }

  function dedupeWords(value) {
    const words = String(value || "").split(/\s+/).filter(Boolean);
    for (let size = 3; size >= 1; size -= 1) {
      for (let index = 0; index + size * 2 <= words.length; index += 1) {
        const left = words.slice(index, index + size).join(" ").toLocaleLowerCase("uk");
        const right = words.slice(index + size, index + size * 2).join(" ").toLocaleLowerCase("uk");
        if (left === right) {
          words.splice(index + size, size);
          index -= 1;
        }
      }
    }
    return words.join(" ");
  }

  function cleanSpeech(text) {
    let body = String(text || "").replace(/[«»"“”]/g, " ");
    let guard = 0;
    while (FILLER.test(body) && guard < 8) {
      body = body.replace(FILLER, "");
      guard += 1;
    }
    return stripNoise(dedupeWords(body)).replace(/\s+/g, " ").trim();
  }

  function items(text) {
    let body = cleanSpeech(text);
    for (const [pattern] of MEAL) body = body.replace(pattern, " ");
    body = body.replace(/повн[а-яіїєґ'’]*\s+тарілк[а-яіїєґ'’]*|половин[а-яіїєґ'’]*(?:\s+тарілк[а-яіїєґ'’]*)?|третин[а-яіїєґ'’]*|чверт[а-яіїєґ'’]*|тарілк[а-яіїєґ'’]*/gi, " ");
    body = body.replace(/\d+(?:[.,]\d+)?\s*(?:грам(?:ів|и)?|гр|г|мл|ml|g|%)/gi, " ");
    body = stripNoise(body);
    return body.split(/,| і | та | з |\+|також|;/i).map(part => stripNoise(part).replace(/\d+/g, " ").replace(/[^0-9A-Za-zА-Яа-яІіЇїЄєҐґ'’\s-]/g, " ").replace(/\s+/g, " ").trim()).filter(part => part.length > 1 && !/^(алло|ало|точка|привіт|це|біло|відсотків)$/i.test(part));
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

  const api = { parseMealUtterance: parseMealUtterance, isOffTopic: isOffTopic, toneFor: toneFor, mealType: mealType, cleanSpeech: cleanSpeech };
  root.MarkParse = api;
})(typeof window !== "undefined" ? window : globalThis);
