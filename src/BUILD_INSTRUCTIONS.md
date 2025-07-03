# Інструкцыі для зборкі SPA

## Development рэжым

Для развіцця з Next.js dev серверам:

```bash
npm run dev
```

Гэта запусьціць Next.js dev сервер на `http://localhost:3000` з праксіраваннем API запытаў на `http://localhost:5087`.

## Production зборка

Для генерацыі статычных файлаў для ASP.NET бэкэнда:

```bash
npm run build:static
```

Гэта згенеруе статычныя файлы ў папку `../wwwroot/` (адносна `src/`).

## Структура згенераваных файлаў

Пасля зборкі ў папцы `wwwroot/` будуць файлы:
- `index.html` - галоўная старонка
- `docs/[id]/index.html` - шаблон для дынамічных старонак дакумэнтаў
- `_next/` - статычныя файлы CSS, JS
- `404.html` - старонка памылкі

## Налаштоўка ASP.NET

1. Размясціце згенераваныя файлы ў папку `wwwroot` вашага ASP.NET праекта
2. Наладзьце маршрутызацыю для SPA ў `Program.cs`:

```csharp
app.UseStaticFiles();

app.MapFallbackToFile("index.html");
```

3. Упэўніцеся, што API endpoints працуюць на `/api/` шляху

## Як працуе SPA

- Усе маршруты, якія не адпавядаюць статычным файлам, будуць перанакіроўвацца на `index.html`
- React Router (Next.js) будзе апрацоўваць маршруты на кліенце
- API запыты будуць рабіцца на адносныя шляхі `/api/...`

## API запыты

SPA будзе рабіць запыты на адносныя шляхі `/api/...`, якія будуць апрацоўвацца ASP.NET бэкэндам.

## Пераход з App Router на Pages Router

Праект быў пераведзены з Next.js App Router на Pages Router для падтрымкі static export з дынамічнымі маршрутамі. 