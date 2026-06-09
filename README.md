# WorldTime

Sledování aktuálního času na libovolných místech světa. Lze přidat vlastní seznam měst, který se ukládá.

## Účel aplikace

Jednoduchý osobní world clock. Lze zobrazit několik časových zón a měst ve světě najednou.

## Use-case diagram

```
Uživatel
   │
   ├── otevře aplikaci
   │     └── načte uložená místa (localStorage)
   │
   ├── přidá město
   │     ├── vyhledá název → filtruje lokální seznam (KNOWN_CITIES)
   │     └── uloží do localStorage
   │
   ├── sleduje čas
   │     ├── karty se aktualizují každou sekundu (setInterval)
   │     ├── barva karty = den / noc
   │
   └── odebere město
         └── uloží změnu do localStorage
```

## Struktura projektu

```
index.html    – HTML struktura
style.css     – styly
app.js        – logika: karty, čas, localStorage
manifest.json – PWA manifest
sw.js         – service worker
README.md     – dokumentace
```

## Použitá API / zdroje dat

| Endpoint | Popis |
|----------|-------|
| `GET https://worldtimeapi.org/api/timezone/{tz}` | Při přidání města – vrátí UTC offset, zkratku (např. CEST) a příznak letního času |
| `Intl.DateTimeFormat` (browser API) | Průběžný výpočet lokálního času každou sekundu |
| Lokální seznam `KNOWN_CITIES` |

WorldTime API se volá **jednou při přidání místa**. Výsledek (offset, zkratka, DST) se uloží do localStorage spolu s místem. Sekundové tikání pak běží čistě lokálně – API se nevolá zbytečně znovu.

## Jak to funguje

### Karty s časem
Každou sekundu se volá `Intl.DateTimeFormat` s IANA timezone daného města. Vrátí hodiny, minuty, sekundy, datum a den v týdnu v češtině. Barva karty se mění podle toho, zda je v daném místě 6:00–21:00 (den = zelená) nebo jinak (noc = modrá).

### Sunbar
Tenký proužek na vrchu stránky vizualizuje, kde na světě je právě den. Sluneční poledne je v té délce, kde je místní sluneční čas 12:00 – tedy na poledníku `(12 - UTC_hodiny) × 15°`. Den pokrývá ±90° od tohoto poledníku.

### localStorage
Uložená místa jsou serializovaná jako JSON pole v klíči `worldtime_places`. Při každém přidání nebo odebrání města se localStorage aktualizuje. Při načtení stránky se místa obnoví.

### PWA
Service worker cachuje statické soubory. Aplikace funguje offline – uložená místa jsou pořád vidět a čas se počítá lokálně bez přístupu k internetu.

## Spuštění lokálně

```bash
npx serve .
```
