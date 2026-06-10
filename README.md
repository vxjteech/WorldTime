# WorldTime

Jednoduchá webová aplikace pro sledování aktuálního času ve městech po celém světě. U každého města zobrazuje čas, datum, počasí, mapu, časové pásmo a další užitečné informace.

## Funkce

- Přidávání a odebírání měst
- Vyhledávání v databázi měst
- Aktuální čas a datum v reálném čase
- Zobrazení časového rozdílu oproti uživateli
- Fáze dne (svítání, den, soumrak, noc)
- Automatické určení ročního období
- Aktuální počasí
- Mapa lokality
- Uložení měst pomocí localStorage
- PWA podpora (instalace a offline režim)

## Jak aplikace funguje

```text
Uživatel
   │
   ├── přidá město
   │     ├── vyhledá město
   │     ├── vytvoří se karta
   │     └── uloží se do localStorage
   │
   ├── sleduje informace
   │     ├── čas a datum
   │     ├── počasí
   │     ├── mapu
   │     ├── časový rozdíl
   │     └── roční období
   │
   └── odebere město
         └── uloží změnu
```

## Struktura projektu

```text
index.html     – struktura aplikace
style.css      – vzhled aplikace
app.js         – hlavní logika
cities.js      – databáze měst
manifest.json  – PWA manifest
sw.js          – service worker
README.md      – dokumentace
```

## Použité technologie

| Technologie | Účel |
|------------|------|
| JavaScript | Logika aplikace |
| Intl.DateTimeFormat | Výpočet času v časových pásmech |
| Open-Meteo API | Počasí |
| Leaflet.js | Mapy |
| OpenStreetMap | Mapové podklady |
| Nominatim | Reversní hledání lokace na mapě
| localStorage | Uložení dat |
| PWA | Offline režim a instalace |

## Ukládání dat

Přidaná města jsou ukládána do localStorage pod klíčem:

```text
worldtime_data
```

Po opětovném otevření aplikace se automaticky obnoví.

## Spuštění

```bash
npx serve .
```