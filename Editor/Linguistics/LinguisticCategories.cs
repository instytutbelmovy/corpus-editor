namespace Editor;

public record LinguisticCategories(
    string? PartOfSpeech = null,           // 1 - Часьціна мовы
    string? ProperName = null,             // 2 - Уласнасць: уласнае/агульнае
    string? Animacy = null,                // 3 - Адушаўлёнасць
    string? Personhood = null,             // 4 - Асабовасць
    string? Abbreviation = null,           // 5 - Скарачэньне
    string? Gender = null,                 // 6 - Род
    string? Declension = null,             // 7 - Скланеньне
    string? Case = null,                   // 8 - Склон
    string? Number = null,                 // 9 - Лік
    string? AdjectiveType = null,          // 10 - Тып прыметніка
    string? Degree = null,                 // 11 - Ступень параўнаньня
    string? AdverbFunction = null,         // 12 - Прыметнік у функцыі прыслоўя
    string? InflectionType = null,         // 13 - Словазмяненьне
    string? NumeralType = null,            // 14 - Значэньне
    string? NumeralStructure = null,       // 15 - Форма
    string? NumeralInflection = null,      // 16 - Нескланяльны
    string? PronounType = null,            // 17 - Разрад
    string? Person = null,                 // 18 - Асоба
    string? VerbTransitivity = null,       // 19 - Пераходнасць дзеяслова
    string? VerbAspect = null,             // 20 - Трываньне
    string? VerbReflexivity = null,        // 21 - зваротнасць дзеяслова
    string? VerbConjugation = null,        // 22 - Спражэньне дзеяслова
    string? VerbTense = null,              // 23 - Час дзеяслова
    string? VerbMood = null,               // 24 - Дзеепрыслоўе
    string? ParticipleType = null,         // 25 - Стан дзеепрыметніка
    string? ParticipleForm = null,         // 26 - Кароткая форма дзеепрыметніка
    string? AdverbOrigin = null,           // 27 - Спосаб утварэньня прыслоўя
    string? ConjunctionType = null         // 28 - Тып злучніка
); 