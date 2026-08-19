/**
 * OAuth-проксі для адмінпанелі Андріївської гімназії.
 *
 * НАВІЩО. Сайт лежить на GitHub Pages — це статика, без сервера. А щоб
 * записати зміну в репозиторій, адмінпанелі потрібен токен GitHub. Токен
 * можна отримати лише в обмін на «code», і цей обмін вимагає client_secret,
 * який не можна класти у браузер. Тому потрібен маленький посередник —
 * цей воркер. Він єдиний знає secret і віддає браузеру вже готовий токен.
 *
 * ДВА МАРШРУТИ.
 *   /auth      — приймає модератора й відправляє його на сторінку GitHub;
 *   /callback  — GitHub повертає сюди «code», воркер міняє його на токен
 *                і передає у вікно адмінпанелі через postMessage.
 *
 * НАЛАШТУВАННЯ — у README.md, розділ «Вхід модератора».
 * Потрібні змінні: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET (secret!),
 * ALLOWED_ORIGIN.
 */

const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN = "https://github.com/login/oauth/access_token";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") return handleAuth(url, env);
    if (url.pathname === "/callback") return handleCallback(request, url, env);

    return new Response("OAuth-проксі адмінпанелі. Доступні шляхи: /auth, /callback", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};

/** Крок 1: відправляємо модератора на GitHub. */
function handleAuth(url, env) {
  // state — випадковий рядок проти CSRF: GitHub поверне його незмінним,
  // і ми звіримо зі значенням у cookie.
  const state = crypto.randomUUID();

  const target = new URL(GITHUB_AUTHORIZE);
  target.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  target.searchParams.set("scope", url.searchParams.get("scope") || "repo,user");
  target.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      "Set-Cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    },
  });
}

/** Крок 2: міняємо code на токен і віддаємо його вікну адмінпанелі. */
async function handleCallback(request, url, env) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = readCookie(request, "oauth_state");

  if (!code) return renderResult(env, { error: "GitHub не повернув код авторизації" });
  if (!state || !expected || state !== expected) {
    return renderResult(env, { error: "Не збігається параметр state — спробуйте увійти ще раз" });
  }

  let payload;
  try {
    const res = await fetch(GITHUB_TOKEN, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    payload = await res.json();
  } catch (e) {
    return renderResult(env, { error: "Не вдалося звʼязатися з GitHub" });
  }

  if (!payload || !payload.access_token) {
    return renderResult(env, { error: payload?.error_description || "GitHub не видав токен" });
  }

  return renderResult(env, { token: payload.access_token, provider: "github" });
}

/** Дістаємо значення cookie із заголовка запиту. */
function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

/**
 * Сторінка-посередник. Decap відкриває /auth у popup-вікні й чекає на
 * повідомлення саме такого формату — спочатку рукостискання
 * "authorizing:github", потім результат. Формат задано самим Decap,
 * змінювати рядки не можна.
 */
function renderResult(env, result) {
  const origin = env.ALLOWED_ORIGIN || "*";
  const message = result.error
    ? `authorization:github:error:${JSON.stringify({ message: result.error })}`
    : `authorization:github:success:${JSON.stringify(result)}`;

  const html = `<!DOCTYPE html>
<html lang="uk"><head><meta charset="utf-8"><title>Вхід…</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;
       font:400 15px/1.6 system-ui,sans-serif;background:#F5F3EF;color:#443334}
  p{max-width:22rem;text-align:center;padding:1.5rem}
</style></head>
<body>
<p>${result.error ? "Не вдалося увійти: " + escapeHtml(result.error) : "Вхід виконано. Можна закрити це вікно."}</p>
<script>
  (function () {
    var message = ${JSON.stringify(message)};
    var origin = ${JSON.stringify(origin)};
    function send(e) {
      if (!window.opener) return;
      window.opener.postMessage(message, origin === "*" ? (e && e.origin) || "*" : origin);
      window.removeEventListener("message", send, false);
    }
    window.addEventListener("message", send, false);
    if (window.opener) window.opener.postMessage("authorizing:github", origin);
  })();
<\/script>
</body></html>`;

  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
