'use strict';

const STORAGE_KEY = 'worldtime_data';

function getPhase(h) {
  if (h >= 6  && h < 9)  return 'dawn';
  if (h >= 9  && h < 19) return 'day';
  if (h >= 19 && h < 22) return 'dusk';
  return 'night';
}

const PHASE_LABEL = { dawn: 'Svítání', day: 'Den', dusk: 'Soumrak', night: 'Noc' };

function getSeason(tz, lat) {
  const m = parseInt(new Intl.DateTimeFormat('en', { month: '2-digit', timeZone: tz }).format(new Date()));
  const south = lat < -15;
  const map = south
    ? { 1:'☀ Léto', 2:'☀ Léto', 3:'⟡ Podzim', 4:'⟡ Podzim', 5:'⟡ Podzim', 6:'* Zima', 7:'* Zima', 8:'* Zima', 9:'↑ Jaro', 10:'↑ Jaro', 11:'↑ Jaro', 12:'☀ Léto' }
    : { 1:'* Zima', 2:'* Zima', 3:'↑ Jaro', 4:'↑ Jaro', 5:'↑ Jaro', 6:'☀ Léto', 7:'☀ Léto', 8:'☀ Léto', 9:'⟡ Podzim', 10:'⟡ Podzim', 11:'⟡ Podzim', 12:'* Zima' };
  return map[m];
}

function getOffsetStr(tz) {
  try {
    const s = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find(p => p.type === 'timeZoneName')?.value ?? '';
    return s;
  } catch { return ''; }
}

function getLocalOffsetMinutes() {
  return -new Date().getTimezoneOffset();
}

function getTzOffsetMinutes(tz) {
  try {
    const now = new Date();
    const local = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const utc   = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    return Math.round((local - utc) / 60000);
  } catch { return 0; }
}

function formatDiff(diffMin) {
  if (diffMin === 0) return 'stejná TZ';
  const sign = diffMin > 0 ? '+' : '−';
  const abs  = Math.abs(diffMin);
  const h    = Math.floor(abs / 60);
  const m    = abs % 60;
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h ${m}m`;
}

function isBusinessHours(h, m) {
  return (h * 60 + m) >= 9 * 60 && (h * 60 + m) < 18 * 60;
}

// ── Počasí (Open-Meteo) ─────────────────────────────

const WMO = {
  0:'Jasno', 1:'Převážně jasno', 2:'Polojasno', 3:'Oblačno',
  45:'Mlha', 48:'Mlha',
  51:'Mrholení', 53:'Mrholení', 55:'Silné mrholení',
  61:'Déšť', 63:'Déšť', 65:'Silný déšť',
  71:'Sněžení', 73:'Sněžení', 75:'Silné sněžení',
  77:'Sněhové krupky',
  80:'Přeháňky', 81:'Přeháňky', 82:'Silné přeháňky',
  85:'Sněhové přeháňky', 86:'Silné sněhové přeháňky',
  95:'Bouřka', 96:'Bouřka s krupobitím', 99:'Silná bouřka'
};

const WMO_ICON = {
  0:'○', 1:'◎', 2:'◑', 3:'●',
  45:'≋', 48:'≋',
  51:'·', 53:'·', 55:'·',
  61:'↓', 63:'↓', 65:'↓↓',
  71:'*', 73:'**', 75:'***',
  77:'*',
  80:'↓', 81:'↓↓', 82:'↓↓↓',
  85:'*↓', 86:'**↓',
  95:'⚡', 96:'⚡', 99:'⚡⚡'
};

const weatherCache = {};

async function fetchWeather(lat, lon, cardEl) {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (weatherCache[key]) {
    applyWeather(cardEl, weatherCache[key]);
    return;
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m&wind_speed_unit=kmh&timezone=auto`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const cur = data.current;
    const w = {
      temp:  Math.round(cur.temperature_2m),
      code:  cur.weathercode,
      wind:  Math.round(cur.windspeed_10m),
      desc:  WMO[cur.weathercode] ?? 'Neznámo',
      icon:  WMO_ICON[cur.weathercode] ?? '?'
    };
    weatherCache[key] = w;
    applyWeather(cardEl, w);
  } catch {
    const el = cardEl.querySelector('.weather-loading');
    if (el) el.textContent = 'Počasí nedostupné';
  }
}

function applyWeather(cardEl, w) {
  const wrap = cardEl.querySelector('.card-weather');
  if (!wrap) return;
  wrap.innerHTML = `
    <span class="weather-icon">${w.icon}</span>
    <div class="weather-main">
      <span class="weather-temp">${w.temp}°C · ${w.wind} km/h</span>
      <span class="weather-desc">${w.desc}</span>
    </div>`;
}

// ── Mapa ──────────────────────────────────────────────────────────────

const maps = {};

function initMap(cardEl, lat, lon, id) {
  if (maps[id]) return;
  const container = cardEl.querySelector('.card-map');
  if (!container) return;

  const map = L.map(container, {
    center: [lat, lon],
    zoom: 10,
    zoomControl: false,
    scrollWheelZoom: false,
    dragging: false,
    touchZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    attributionControl: false
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18
  }).addTo(map);

  const icon = L.divIcon({
    className: '',
    html: `<div style="width:8px;height:8px;border-radius:50%;background:#e8e8e8;border:1.5px solid rgba(255,255,255,0.4);box-shadow:0 0 0 3px rgba(255,255,255,0.1)"></div>`,
    iconAnchor: [4, 4]
  });

  L.marker([lat, lon], { icon }).addTo(map);
  maps[id] = map;
}

// ── Renderování času ───────────────────────────────────────────────────

function updateCard(card) {
  try {
    const tz  = card.dataset.tz;
    const lat = parseFloat(card.dataset.lat);
    const now = new Date();

    const fmt = (opts) => new Intl.DateTimeFormat('cs-CZ', { timeZone: tz, ...opts }).formatToParts(now);

    const tp = fmt({ hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false });
    const dp = fmt({ weekday:'short', day:'numeric', month:'short', year:'numeric' });

    const get = (parts, t) => parts.find(p => p.type === t)?.value ?? '';

    const h = parseInt(get(tp, 'hour'));
    const m = parseInt(get(tp, 'minute'));
    const s = parseInt(get(tp, 'second'));
    const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    const dateStr = `${get(dp,'weekday')}, ${get(dp,'day')} ${get(dp,'month')} ${get(dp,'year')}`;

    const phase = getPhase(h);
    card.className = `card phase-${phase}`;

    card.querySelector('.card-time').textContent = timeStr;
    card.querySelector('.card-date').textContent = dateStr;

    // rozdíl
    const tzOff    = getTzOffsetMinutes(tz);
    const localOff = getLocalOffsetMinutes();
    const diff     = tzOff - localOff;
    card.querySelector('.card-diff').textContent = `(${formatDiff(diff)})`;

    // popisky
    card.querySelector('.pill-phase').textContent  = PHASE_LABEL[phase];
    card.querySelector('.pill-season').textContent = getSeason(tz, lat);
    card.querySelector('.pill-offset').textContent = getOffsetStr(tz);

  } catch {}
}

// ── uložení ────────────────────────────────────────────────────────────

let places = [];
try { places = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch {}

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(places)); }

// ── card ─────────────────────────────────────────────────────────

function createCard(place) {
  const { name, country, tz, lat, lon } = place;
  const id = `map-${tz.replace(/\//g,'-')}`;

  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.tz  = tz;
  card.dataset.lat = lat;
  card.dataset.lon = lon;
  card.dataset.mapId = id;

  card.innerHTML = `
    <div class="card-map" id="${id}">
      <div class="map-overlay">
        <div class="phase-dot"></div>
        <span class="map-city-label">${name}</span>
      </div>
    </div>
    <div class="card-body">
      <div class="card-row-top">
        <div>
          <div class="card-city-name">${name}</div>
          <div class="card-country">${country} · ${tz}</div>
        </div>
        <button class="card-remove" title="Odebrat">×</button>
      </div>
      <div class="card-time">–:–</div>
      <div class="card-row-sub">
        <span class="card-date">–</span>
        <span class="card-diff"></span>
      </div>
      <div class="card-pills">
        <span class="pill pill-phase">–</span>
        <span class="pill pill-season">–</span>
        <span class="pill pill-offset">–</span>
      </div>
      <div class="card-weather">
        <span class="weather-loading">načítám počasí…</span>
      </div>
    </div>`;

  card.querySelector('.card-remove').addEventListener('click', () => removePlace(tz));

  document.getElementById('grid').appendChild(card);
  document.getElementById('emptyState').style.display = 'none';

  updateCard(card);

  // Init map after short delay (Leaflet needs the el in DOM)
  setTimeout(() => initMap(card, lat, lon, id), 60);

  // Fetch weather
  fetchWeather(lat, lon, card);
}

function removePlace(tz) {
  places = places.filter(p => p.tz !== tz);
  save();
  document.querySelector(`.card[data-tz="${CSS.escape(tz)}"]`)?.remove();
  if (!places.length) document.getElementById('emptyState').style.display = 'flex';
}

// Restore saved places
places.forEach(createCard);
if (!places.length) document.getElementById('emptyState').style.display = 'flex';

// ── tick ─────────────────────────────────────────────────────────────

function tick() {
  const now = new Date();
  document.getElementById('localClock').textContent =
    now.toLocaleTimeString('cs-CZ') + '  ·  ' +
    now.toLocaleDateString('cs-CZ', { weekday:'long', day:'numeric', month:'long' });

  document.querySelectorAll('.card[data-tz]').forEach(updateCard);
}

tick();
setInterval(tick, 1000);

// ── vyhledávání ───────────────────────────────────────────────────────────

const addBtn       = document.getElementById('addBtn');
const overlay      = document.getElementById('searchOverlay');
const closeBtn     = document.getElementById('closeSearch');
const searchInput  = document.getElementById('citySearch');
const resultsEl    = document.getElementById('cityResults');

function openSearch() {
  overlay.classList.remove('hidden');
  searchInput.focus();
}

function closeSearch() {
  overlay.classList.add('hidden');
  searchInput.value = '';
  resultsEl.innerHTML = '';
}

addBtn.addEventListener('click', openSearch);
closeBtn.addEventListener('click', closeSearch);
overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSearch();
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
});

let debounce;
searchInput.addEventListener('input', () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    const q = searchInput.value.trim().toLowerCase();
    resultsEl.innerHTML = '';
    if (!q) return;

    const hits = CITIES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.tz.toLowerCase().includes(q)
    ).slice(0, 18);

    if (!hits.length) {
      resultsEl.innerHTML = `<div class="search-loading">Žádné výsledky</div>`;
      return;
    }

    hits.forEach(city => {
      const div = document.createElement('div');
      div.className = 'city-item';
      div.innerHTML = `
        <div class="city-item-left">
          <span class="city-item-name">${city.name}</span>
          <span class="city-item-country">${city.country}</span>
        </div>
        <span class="city-item-tz">${city.tz}</span>`;
      div.addEventListener('click', () => {
        if (!places.find(p => p.tz === city.tz)) {
          places.push(city);
          save();
          createCard(city);
        }
        closeSearch();
      });
      resultsEl.appendChild(div);
    });
  }, 180);
});
