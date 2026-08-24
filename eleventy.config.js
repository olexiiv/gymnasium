/**
 * Конфігурація Eleventy (11ty) для сайту Андріївської різнопрофільної гімназії.
 * Джерело — /src, збірка — /_site. CSS збирається окремо через PostCSS (див. package.json).
 */
const fs = require("node:fs");
const path = require("node:path");
const MarkdownIt = require("markdown-it");

module.exports = function (eleventyConfig) {
  // ---------- Passthrough: файли, які копіюються в збірку без обробки ----------
  eleventyConfig.addPassthroughCopy({ "src/assets/js": "assets/js" });
  eleventyConfig.addPassthroughCopy({ "src/assets/img": "assets/img" });
  eleventyConfig.addPassthroughCopy({ "src/assets/fonts": "assets/fonts" });
  eleventyConfig.addPassthroughCopy({ "src/assets/docs": "assets/docs" });
  // Адмінпанель. Тека називається так само, як адреса, за якою вона
  // відкривається. Щоб змінити адресу — перейменуйте теку src/panel-8f2k
  // і виправте обидві назви в рядку нижче. Більше ніде шлях не згадується.
  eleventyConfig.addPassthroughCopy({ "src/panel-8f2k": "panel-8f2k" });
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });

  // CSS збирає PostCSS, але стежимо за змінами для live-reload у dev-режимі
  eleventyConfig.addWatchTarget("src/assets/css/");

  // ---------- Колекції (сумісні з Decap CMS: 1 папка = 1 колекція) ----------
  eleventyConfig.addCollection("news", (api) =>
    api.getFilteredByGlob("src/content/news/*.md").sort((a, b) => b.date - a.date)
  );
  eleventyConfig.addCollection("teachers", (api) =>
    api.getFilteredByGlob("src/content/teachers/*.md").sort((a, b) =>
      (a.data.order ?? 99) - (b.data.order ?? 99)
    )
  );
  // Документ потрапляє на сайт, лише якщо файл справді лежить у src/assets/docs.
  // Причина: у проєкті є плейсхолдери (PDF на ~90 байтів) і записи, для яких
  // файл ще не завантажили — без перевірки відвідувач отримував би 404 або
  // порожній PDF. Пропущені записи видно в логах збірки (у тому числі в GitHub
  // Actions), тож нічого не губиться мовчки.
  const DOC_MIN_BYTES = 1024;
  eleventyConfig.addCollection("documents", (api) => {
    const all = api.getFilteredByGlob("src/content/documents/*.md");
    const ready = [];

    for (const doc of all) {
      const file = doc.data.file;
      const label = doc.data.title || doc.inputPath;

      if (!file) {
        console.warn(`[документи] пропущено «${label}»: не вказано поле file`);
        continue;
      }

      const onDisk = path.join("src", file.replace(/^\//, ""));
      let size = -1;
      try { size = fs.statSync(onDisk).size; } catch { /* немає файлу */ }

      if (size < 0) {
        console.warn(`[документи] пропущено «${label}»: немає файлу ${onDisk}`);
        continue;
      }
      if (size < DOC_MIN_BYTES) {
        console.warn(`[документи] пропущено «${label}»: ${onDisk} схожий на плейсхолдер (${size} Б)`);
        continue;
      }

      // Друга, редаговна версія того самого документа (бланк заяви у DOCX поруч
      // із PDF). Необовʼязкова: якщо файлу немає — прибираємо поле, і шаблон
      // просто не малює зайву кнопку. Сам документ через це не зникає.
      if (doc.data.altFile) {
        const altOnDisk = path.join("src", doc.data.altFile.replace(/^\//, ""));
        let altSize = -1;
        try { altSize = fs.statSync(altOnDisk).size; } catch { /* немає файлу */ }

        if (altSize < DOC_MIN_BYTES) {
          console.warn(`[документи] «${label}»: додатковий файл ${altOnDisk} відсутній або порожній — кнопку не показуємо`);
          doc.data.altFile = null;
        }
      }

      ready.push(doc);
    }

    return ready.sort((a, b) => new Date(b.data.updatedAt) - new Date(a.data.updatedAt));
  });
  eleventyConfig.addCollection("gallery", (api) =>
    api.getFilteredByGlob("src/content/gallery/*.md").sort((a, b) =>
      (a.data.order ?? 99) - (b.data.order ?? 99)
    )
  );

  // ---------- Архів новин: /novyny/, сторінки та рубрики ----------
  // Одна колекція описує ВСІ сторінки стрічки одразу: і посторінкову
  // розбивку «Усіх новин», і рубрики (/novyny/tema/vstup/ тощо) з власною
  // розбивкою. Кожен елемент колекції — це готова сторінка: список постів,
  // номери, сусідні адреси, набір вкладок. Шаблон novyny.njk лише малює.
  //
  // Чому не вбудована пагінація Eleventy по collections.news: вона вміє
  // ділити один список на рівні шматки, а нам треба ще й розрізати той самий
  // список на рубрики й дати першій сторінці інший розмір (там велика картка).
  // Порахувати це в JS простіше, ніж викручуватися в шаблоні.

  const NEWS_FIRST_PAGE = 10; // 1 велика картка + 9 у сітці 3×3
  const NEWS_PAGE_SIZE = 9;   // далі — рівно три ряди по три

  // Транслітерація для адрес рубрик. Модератор може додати нову категорію
  // в адмінпанелі — slug порахується сам, правити конфіг не треба.
  const UA_TO_LATIN = {
    а: "a", б: "b", в: "v", г: "g", ґ: "g", д: "d", е: "e", є: "ie", ж: "zh",
    з: "z", и: "y", і: "i", ї: "yi", й: "i", к: "k", л: "l", м: "m", н: "n",
    о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
    ч: "ch", ш: "sh", щ: "shch", ь: "", ю: "yu", я: "ya",
    "'": "", "’": "", "ʼ": "",
  };

  const slugifyUA = (value) =>
    String(value)
      .toLowerCase()
      .split("")
      .map((ch) => (ch in UA_TO_LATIN ? UA_TO_LATIN[ch] : ch))
      .join("")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // Перша сторінка більша на одну новину — та, що стає великою карткою.
  const chunkNews = (posts) => {
    const chunks = [];
    let i = 0;
    while (i < posts.length) {
      const size = chunks.length === 0 ? NEWS_FIRST_PAGE : NEWS_PAGE_SIZE;
      chunks.push(posts.slice(i, i + size));
      i += size;
    }
    return chunks.length ? chunks : [[]];
  };

  // Номери сторінок для нижньої навігації. До семи показуємо всі, далі —
  // перша, вікно ±1 навколо поточної, остання; розриви позначаємо gap.
  const paginationLinks = (total, current, urlFor) => {
    const wanted = new Set([1, total, current - 1, current, current + 1]);
    if (total <= 7) for (let n = 1; n <= total; n++) wanted.add(n);

    const numbers = [...wanted].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    const links = [];
    let previous = 0;

    for (const n of numbers) {
      if (previous && n - previous > 1) links.push({ gap: true });
      links.push({ n, url: urlFor(n), isCurrent: n === current });
      previous = n;
    }
    return links;
  };

  eleventyConfig.addCollection("newsArchive", (api) => {
    const all = api
      .getFilteredByGlob("src/content/news/*.md")
      .sort((a, b) => b.date - a.date);

    // Рубрики — у порядку появи, тобто від найсвіжішої новини.
    const byCategory = new Map();
    for (const post of all) {
      const label = post.data.category;
      if (!label) continue;
      if (!byCategory.has(label)) byCategory.set(label, []);
      byCategory.get(label).push(post);
    }

    const groups = [{ slug: null, label: "Усі новини", posts: all }];
    for (const [label, posts] of byCategory) {
      groups.push({ slug: slugifyUA(label), label, posts });
    }

    const baseUrl = (slug) => (slug ? `/novyny/tema/${slug}/` : "/novyny/");
    const tabs = groups.map((g) => ({
      label: g.slug ? g.label : "Усі",
      url: baseUrl(g.slug),
      slug: g.slug,
      count: g.posts.length,
    }));

    const pages = [];

    for (const group of groups) {
      const chunks = chunkNews(group.posts);
      const urlFor = (n) => (n === 1 ? baseUrl(group.slug) : `${baseUrl(group.slug)}storinka-${n}/`);

      chunks.forEach((posts, index) => {
        const number = index + 1;
        const total = chunks.length;
        const isFirst = number === 1;

        pages.push({
          key: `${group.slug || "all"}-${number}`,
          categorySlug: group.slug,
          categoryLabel: group.slug ? group.label : null,
          permalink: urlFor(number),
          // На першій сторінці найсвіжіший матеріал іде великою карткою.
          lead: isFirst ? posts[0] || null : null,
          rest: isFirst ? posts.slice(1) : posts,
          total: group.posts.length,
          pageNumber: number,
          totalPages: total,
          prevUrl: number > 1 ? urlFor(number - 1) : null,
          nextUrl: number < total ? urlFor(number + 1) : null,
          links: total > 1 ? paginationLinks(total, number, urlFor) : [],
          tabs: tabs.map((tab) => ({ ...tab, isCurrent: tab.slug === group.slug })),
        });
      });
    }

    return pages;
  });

  // ---------- Фільтри ----------
  const MONTHS_UA = [
    "січня", "лютого", "березня", "квітня", "травня", "червня",
    "липня", "серпня", "вересня", "жовтня", "листопада", "грудня",
  ];

  // 12 березня 2026
  // Той самий slug, що й у адресах рубрик /novyny/tema/<slug>/ — потрібен
  // окремо для індексу пошуку, щоб JS міг звірити категорію новини
  // з категорією поточної сторінки без повторної транслітерації на клієнті.
  eleventyConfig.addFilter("slugUA", slugifyUA);

  eleventyConfig.addFilter("dateUA", (value) => {
    const d = new Date(value);
    return `${d.getDate()}\u00A0${MONTHS_UA[d.getMonth()]} ${d.getFullYear()}`;
  });

  // 2026-03-12 — для <time datetime> і sitemap
  eleventyConfig.addFilter("dateISO", (value) => {
    const d = new Date(value);
    return d.toISOString().split("T")[0];
  });

  // 2026-03-12T00:00:00.000Z — Atom вимагає повний RFC 3339
  eleventyConfig.addFilter("dateRFC3339", (value) => new Date(value).toISOString());

  // JSON-LD у <script>. Просто JSON.stringify небезпечний: якщо в заголовку
  // новини трапиться «</script>», браузер закриє тег посеред даних. Тому
  // < > & віддаємо юнікод-екранованими — JSON від цього лишається валідним.
  // Порожні значення (null) викидаємо: краще не мати поля, ніж мати пусте.
  eleventyConfig.addFilter("jsonld", (value) =>
    JSON.stringify(value, (key, val) => (val === null || val === "" ? undefined : val), 2)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
  );

  // Витягнути одне поле з масиву обʼєктів: site.social | pluck("url").
  // У Nunjucks немає фільтра map, а для sameAs потрібен саме масив адрес.
  eleventyConfig.addFilter("pluck", (items, key) =>
    (items || []).map((item) => item && item[key]).filter(Boolean)
  );

  // Звичайний JSON, без екранування < > & — на відміну від jsonld, цей вивід
  // не вставляється в <script> посеред HTML, а є самостійним файлом
  // (наприклад, індекс пошуку /assets/data/novyny.json), тож ризику
  // передчасного закриття тегу немає.
  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));

  // Відносні шляхи → абсолютні. Потрібно у стрічці: читалка показує статтю
  // на своєму домені, і «/assets/img/...» там веде в нікуди.
  eleventyConfig.addFilter("absolutizeHtml", (html, base) =>
    String(html || "").replace(/(src|href)="\/(?!\/)/g, (_m, attr) => `${attr}="${base.replace(/\/$/, "")}/`)
  );

  // Час читання: рахуємо слова у вже зібраному HTML статті.
  // 180 слів/хв — обережна оцінка для української мови.
  eleventyConfig.addFilter("readTime", (html) => {
    const words = String(html || "")
      .replace(/<[^>]+>/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return Math.max(1, Math.round(words / 180));
  });

  // ---------- Відео з YouTube ----------
  // Модератор вставляє посилання так, як його скопіював: із кнопки
  // «Поділитися» (youtu.be/ID?si=…), з адресного рядка (watch?v=ID&t=…),
  // з коду вставки (/embed/ID) або зі Shorts. Фільтр витягує з будь-якої
  // форми сам ідентифікатор — далі шаблон будує з нього адресу
  // youtube-nocookie.com. Порожній результат означає «блок не малюємо»:
  // краще не показати відео, ніж показати порожній плеєр.
  const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
  const badVideoUrls = new Set(); // щоб не дублювати попередження в логах

  eleventyConfig.addFilter("youtubeId", (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (YOUTUBE_ID.test(raw)) return raw; // вставили сам ідентифікатор

    let url;
    try {
      url = new URL(raw);
    } catch {
      url = null;
    }

    let candidate = "";
    if (url) {
      const host = url.hostname.replace(/^www\./, "");
      if (host === "youtu.be") {
        candidate = url.pathname.slice(1);
      } else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
        candidate =
          url.searchParams.get("v") ||
          (url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/) || [])[1] ||
          "";
      }
    }

    if (YOUTUBE_ID.test(candidate)) return candidate;

    if (!badVideoUrls.has(raw)) {
      badVideoUrls.add(raw);
      console.warn(`[відео] не розпізнав посилання на YouTube: ${raw}`);
    }
    return "";
  });

  // ---------- Прозорість / публічна інформація ----------

  // Документи одного розділу: {{ collections.documents | inSection("finansy") }}
  eleventyConfig.addFilter("inSection", (items, slug) =>
    (items || []).filter((item) => item.data.section === slug)
  );

  // Відбір за будь-яким полем front matter:
  // {{ collections.teachers | whereField("category", "спеціаліст вищої категорії") }}
  // Порожнє значення поля вважається «немає», а не збігом із порожнім рядком.
  eleventyConfig.addFilter("whereField", (items, key, value) =>
    (items || []).filter((item) => item.data[key] && item.data[key] === value)
  );


  // Українська множина: {{ 16 | plural("педагог", "педагоги", "педагогів") }}
  // Форми: 1 педагог / 2–4 педагоги / 5–20 педагогів, далі за останніми
  // цифрами. Раніше така логіка стояла просто в шаблоні «Прозорості» —
  // після другого разу винесена сюди.
  eleventyConfig.addFilter("plural", (value, one, few, many) => {
    const n = Math.abs(Number(value) || 0);
    const tens = n % 100;
    if (tens >= 11 && tens <= 14) return many;
    const ones = n % 10;
    if (ones === 1) return one;
    if (ones >= 2 && ones <= 4) return few;
    return many;
  });

  // Документи однієї категорії всередині розділу — потрібно окремій сторінці
  // (наприклад, «Атестація»), яка показує лише свою частину розділу «Кадри».
  eleventyConfig.addFilter("inCategory", (items, category) =>
    (items || []).filter((item) => item.data.category === category)
  );

  // Позначені як основні — для добірки на хаб-сторінці
  eleventyConfig.addFilter("featuredDocs", (items) =>
    (items || []).filter((item) => item.data.featured)
  );

  // Групування за категорією зі стабільним порядком.
  // Повертає масив [{ category, docs }] — порядок задає transparency.json,
  // усе, чого немає в списку, потрапляє в кінець за алфавітом.
  eleventyConfig.addFilter("groupByCategory", (items, order) => {
    const groups = new Map();
    for (const item of items || []) {
      const cat = item.data.category || "інше";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(item);
    }

    const known = (order || []).filter((cat) => groups.has(cat));
    const rest = [...groups.keys()]
      .filter((cat) => !known.includes(cat))
      .sort((a, b) => a.localeCompare(b, "uk"));

    return [...known, ...rest].map((category) => ({
      category,
      docs: groups.get(category),
    }));
  });

  // Найдовший день у розкладі класу: {{ cls.week | maxLessons }}
  // Кількість рядків таблиці має дорівнювати найдовшому дню, інакше уроки
  // з довших днів мовчки зникають (раніше бралася довжина понеділка).
  eleventyConfig.addFilter("maxLessons", (week) =>
    (week || []).reduce((max, day) => Math.max(max, (day.lessons || []).length), 0)
  );

  // ---------- Markdown у полях адмінпанелі ----------
  // Тексти сторінок лежать у JSON і редагуються модератором. Щоб він міг
  // поставити жирний шрифт або посилання, не знаючи HTML, поля проганяються
  // через markdown. `md` — з абзацами, `mdInline` — без обгортки <p>
  // (для заголовків, підписів, рядків усередині готової розмітки).
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false });

  eleventyConfig.addFilter("md", (value) => md.render(String(value || "")));
  eleventyConfig.addFilter("mdInline", (value) => md.renderInline(String(value || "")));

  // Обмеження масиву: {{ collections.news | limit(3) }}
  eleventyConfig.addFilter("limit", (arr, n) => (arr || []).slice(0, n));

  // Абсолютна адреса для sitemap/og
  eleventyConfig.addFilter("absoluteUrl", (path, base) => {
    try { return new URL(path, base).href; } catch { return path; }
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"],
  };
};
