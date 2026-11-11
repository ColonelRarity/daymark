/* The account is the person's. The diary copy, when it leaves the phone, goes to their iCloud or Google Drive. */
function accountCard() {
  return '<section class="panel account-card"><h2>Мій акаунт</h2><p class="section-sub" id="accountStatus">Щоденник пишеться на цей телефон одразу. Daymark копію собі не забирає і на дані акаунта не претендує. Вхід через Apple і копія в iCloud на цьому Apple ID не підписуються: особистий акаунт розробника їх не дозволяє. Google покладе копію на твій Диск, коли в збірку додадуть клієнт OAuth.</p><div class="account-actions"><button class="btn ghost small-btn" type="button" data-action="account-google">Увійти з Google</button><button class="text-btn" type="button" data-action="account-out">Вийти</button></div></section>';
}

const accountProfile = profileView;
profileView = function () {
  return accountProfile().replace("<h2>Мої дані</h2>", accountCard() + "<h2>Мої дані</h2>").replace("Живуть лише на цьому пристрої. Між телефонами не синхронізуються. Копія — це файл, який можна відновити тут.", "На телефоні запис лягає у файл одразу. Копія на Google Диск з’явиться після входу, коли в збірці буде клієнт OAuth.");
};

async function accountCall(path) {
  if (location.port !== "14711") { toast("Вхід працює в застосунку на iPhone."); return null; }
  try {
    const response = await fetch(path, { method: "POST" });
    return await response.json();
  } catch (error) {
    toast("Не вдалося зв’язатися з акаунтом.");
    return null;
  }
}

function accountTell(data) {
  if (!data) return;
  if (data.ok && data.provider) toast(data.provider === "apple" ? "Увійшов через Apple. Копія — у твоєму iCloud, якщо він увімкнений." : "Увійшов через Google. Копія — на твоєму Диску.");
  else if (data.reason === "google-client") toast("Вхід Google у цій збірці ще без клієнта OAuth. Записи лишаються на телефоні.");
  else if (data.reason === "cancelled") toast("Вхід скасовано. Дані на телефоні лишилися.");
  else toast("Не вдалося увійти. Записи на телефоні на місці.");
  const status = document.getElementById("accountStatus");
  if (status && data.name) status.textContent = "Акаунт: " + data.name + ". Дані лишаються твоїми.";
}

actions["account-apple"] = () => accountCall("/account/apple").then(accountTell);
actions["account-google"] = () => accountCall("/account/google").then(accountTell);
actions["account-out"] = () => accountCall("/account/signout").then(data => { if (data && data.ok) toast("Вийшов з акаунта. Щоденник на телефоні не стерто."); });

if (location.port === "14711") {
  fetch("/account").then(response => response.json()).then(data => {
    if (!data || !data.signedIn) return;
    const status = document.getElementById("accountStatus");
    if (status) status.textContent = "Ти в акаунті " + (data.provider === "google" ? "Google" : "Apple") + ". Хмарна копія належить тобі, не Daymark.";
  }).catch(() => {});
}
try { render(); } catch (error) {}
