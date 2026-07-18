# Сайт Андріївської різнопрофільної гімназії

Статичний сайт на **Eleventy (11ty)**, готовий до розгортання на **GitHub Pages** з власним доменом.
Контент — прості markdown-файли, які може редагувати вчитель без техпідготовки (напряму або через Decap CMS).

## Швидкий старт

```bash
npm install     # встановити залежності (генерує package-lock.json за потреби)
npm run dev     # локальний сервер http://localhost:8080 з live-reload
npm run build   # продакшн-збірка в /_site
```

Потрібен Node.js 20+.

> **Примітка:** у репозиторії немає `package-lock.json` — він з'явиться після першого
> `npm install` і його варто закомітити в git. Якщо після цього захочете пришвидшити
> встановлення командою `npm ci` (детермінована збірка), вона працюватиме лише за
> наявності закомiченого lock-файлу.

## Структура

```
/src
  /_data          site.json (контакти, метрики, навігація), schedule.json (розклад)
  /_includes      layouts/ partials/ macros/ icons/
  /content        news/ teachers/ profiles/ documents/ gallery/   ← «база даних» сайту
  /assets         css/ js/ fonts/ img/ docs/
  /admin          Decap CMS (index.html + config.yml)
  *.njk           сторінки: головна, вступ, новини, розклад, прозорість…
  CNAME           власний домен для GitHub Pages
eleventy.config.js
.github/workflows/deploy.yml
```

## Як додати новину (для редактора)

Створіть файл `src/content/news/2026-02-01-nazva.md`:

```markdown
---
title: Заголовок новини
date: 2026-02-01
category: Оголошення
excerpt: Одне-два речення, які видно в картці новини.
---
Текст новини звичайною мовою. **Жирний**, списки — все працює.
```

Закомітьте в `main` — сайт перебудується й опублікується автоматично.
Категорії: `Оголошення`, `Вступ`, `Досягнення`, `Життя гімназії`.

Аналогічно працюють `teachers/`, `documents/`, `gallery/`, `profiles/` — поля описані
в `src/admin/config.yml`. Контакти, метрики та меню редагуються в `src/_data/site.json`.

## Розгортання на GitHub Pages

1. Запуште репозиторій на GitHub.
2. **Settings → Pages → Source: «GitHub Actions»**.
3. Кожен push у `main` запускає `.github/workflows/deploy.yml` → сайт оновлюється.

### Власний домен

1. Впишіть свій домен у `src/CNAME` (зараз: `andriivska-gymnasium.ua`).
2. У реєстратора домену створіть DNS-записи:
   - 4 записи `A` для кореневого домену → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` для `www` → `ЛОГІН.github.io`
3. У Settings → Pages вкажіть домен і увімкніть **Enforce HTTPS** (сертифікат GitHub видає безкоштовно).

## Що потрібно доробити перед запуском

- [ ] **Formspree**: зареєструйте форму на formspree.io та впишіть її ID у `src/_data/site.json` → `formspreeId`.
- [ ] **Шрифти**: покладіть `.woff2` (Onest 600/700/800, Inter 400/500, субсет із кирилицею) у `src/assets/fonts/` — див. `src/assets/fonts/README.md`. Без них сайт працює на системних шрифтах.
- [ ] **Мапа**: замініть заглушку в `src/_includes/partials/contacts-block.njk` на iframe Google Maps.
- [ ] **Фото**: у героя вже стоїть реальне фото школи (`src/assets/img/school.webp`). Плейсхолдери `[ФОТО: …]` у новинах і галереї замініть реальними зображеннями (`.webp`, з `width`/`height`).
- [ ] **Документи**: замініть PDF-заглушки в `src/assets/docs/` справжніми файлами.
- [ ] **Decap CMS** (опційно): вкажіть репозиторій та OAuth-проксі в `src/admin/config.yml`.
- [ ] **Дані**: перевірте адресу, телефони, ЄДРПОУ в `src/_data/site.json` — зараз там реалістичні плейсхолдери.

## Дизайн-система

Всі кольори, шрифти й відступи — у `src/assets/css/tokens.css` (єдине джерело істини).
Палітра: `--base #F5F3EF` (тепла кремова база), `--brand #74BE5C` (тільки заливки),
`--brand-strong #3F7A31` (зелений текст/посилання, WCAG AA), `--ink #443334`.

Версія для слабозорих: перемикач у хедері, клас `.a11y` на `<html>`, стан у `localStorage`,
inline-скрипт у `<head>` запобігає миготінню (FOUC).
