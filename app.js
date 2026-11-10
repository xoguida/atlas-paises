"use strict";
const BASE = "https://countriesnow.space/api/v0.1";
const PER_PAGE = 12;
const MAX_CITIES_SHOWN = 200;

const state = { all: [], view: [], hints: new Map(), page: 1 };
let detailToken = 0;
const $ = (id) => document.getElementById(id);
const fmt = new Intl.NumberFormat("es-MX");

/** fetch con timeout; traduce errores HTTP y el campo "error" de la API a mensajes claros. */
async function getJSON(url, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    if (res.status === 400 || res.status === 404) throw new Error("La API no tiene datos para esa consulta.");
    if (res.status === 429) throw new Error("Demasiadas solicitudes (429). Espera un momento e inténtalo de nuevo.");
    if (res.status >= 500) throw new Error(`El servicio tiene problemas (${res.status}). Inténtalo más tarde.`);
    if (!res.ok) throw new Error(`Error inesperado (${res.status}).`);
    const json = await res.json();
    if (json.error) throw new Error(json.msg || "La API devolvió un error.");
    return json.data;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("La solicitud tardó demasiado. Revisa tu conexión.");
    if (e instanceof TypeError) throw new Error("No hay conexión con el servicio. Revisa tu internet.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** POST con { country } para los endpoints de detalle. */
const postCountry = (path, country) =>
  getJSON(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country }),
  });

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/* ---------- Estados de la interfaz ---------- */
function showLoading(text = "Cargando países y ciudades… puede tardar unos segundos") {
  const box = el("div", "msg");
  box.append(el("div", "spinner"), text);
  $("status").replaceChildren(box);
}
function showMessage(text, isError = false, retry = null) {
  const box = el("div", "msg" + (isError ? " error" : ""), text);
  if (retry) {
    const b = el("button", "btn", "Reintentar");
    b.style.marginLeft = "1rem";
    b.onclick = retry;
    box.append(b);
  }
  $("status").replaceChildren(box);
}
const clearStatus = () => $("status").replaceChildren();

/* ---------- Carga de datos ---------- */
async function loadCountries() {
  showLoading();
  $("grid").replaceChildren();
  $("pager").replaceChildren();
  $("count").textContent = "";
  try {
    state.all = await getJSON(`${BASE}/countries`);
    applyFilters();
  } catch (e) {
    showMessage(e.message, true, loadCountries);
  }
}

/* ---------- Búsqueda, filtro, orden y paginación ---------- */
function applyFilters() {
  const q = $("search").value.trim().toLowerCase();
  const min = Number($("min").value);
  const sort = $("sort").value;
  state.hints.clear();

  const list = state.all.filter((c) => {
    if (c.cities.length < min) return false;
    if (!q) return true;
    if (c.country.toLowerCase().includes(q)) return true;
    const city = c.cities.find((x) => x.toLowerCase().includes(q));
    if (city) { state.hints.set(c.iso3, city); return true; }
    return false;
  });
  list.sort((a, b) =>
    sort === "cities-desc" ? b.cities.length - a.cities.length :
    sort === "cities-asc" ? a.cities.length - b.cities.length :
    a.country.localeCompare(b.country)
  );
  state.view = list;
  state.page = 1;
  render();
}

function render() {
  const total = state.view.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const items = state.view.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);
  const grid = $("grid");
  const pager = $("pager");
  grid.replaceChildren();
  pager.replaceChildren();
  $("count").textContent = `${fmt.format(total)} país(es) encontrado(s)`;

  if (total === 0) {
    showMessage("Sin resultados. Prueba con otro país o ciudad, o cambia el filtro de ciudades.");
    return;
  }
  clearStatus();

  for (const c of items) {
    const li = el("li");
    const btn = el("button", "card");
    const info = el("div");
    info.append(
      el("span", "badge", c.iso2),
      el("h2", "", c.country),
      el("p", "", `${fmt.format(c.cities.length)} ciudades registradas`)
    );
    if (state.hints.has(c.iso3)) info.append(el("p", "hint", `Coincide con la ciudad: ${state.hints.get(c.iso3)}`));
    btn.append(info);
    btn.onclick = () => openDetail(c);
    li.append(btn);
    grid.append(li);
  }

  const prev = el("button", "btn", "Anterior");
  const next = el("button", "btn", "Siguiente");
  prev.disabled = state.page === 1;
  next.disabled = state.page === pages;
  prev.onclick = () => { state.page--; render(); window.scrollTo({ top: 0 }); };
  next.onclick = () => { state.page++; render(); window.scrollTo({ top: 0 }); };
  pager.append(prev, el("span", "", `Página ${state.page} de ${pages}`), next);
}

/* ---------- Ficha de detalle: 4 consultas POST en paralelo ---------- */
async function openDetail(c) {
  const token = ++detailToken;
  const body = $("modal-body");
  body.replaceChildren(el("div", "msg", `Cargando ficha de ${c.country}…`));
  $("modal").showModal();

  const [flag, capital, currency, population] = await Promise.allSettled([
    postCountry("/countries/flag/images", c.country),
    postCountry("/countries/capital", c.country),
    postCountry("/countries/currency", c.country),
    postCountry("/countries/population", c.country),
  ]);
  if (token !== detailToken) return; // el usuario abrió otro país

  const val = (r, fn) => { try { return r.status === "fulfilled" ? fn(r.value) : null; } catch { return null; } };
  const flagUrl = val(flag, (d) => d.flag);
  const lastPop = val(population, (d) => d.populationCounts[d.populationCounts.length - 1]);

  const title = el("h2", "", c.country);
  title.id = "m-title";
  body.replaceChildren();
  if (flagUrl) {
    const img = el("img", "flag");
    img.src = flagUrl;
    img.alt = `Bandera de ${c.country}`;
    body.append(img);
  }
  body.append(title);

  const rows = [
    ["Códigos ISO", `${c.iso2} / ${c.iso3}`],
    ["Capital", val(capital, (d) => d.capital) || "No disponible"],
    ["Moneda", val(currency, (d) => d.currency) || "No disponible"],
    ["Población", lastPop ? `${fmt.format(lastPop.value)} (${lastPop.year})` : "No disponible"],
    ["Ciudades registradas", fmt.format(c.cities.length)],
  ];
  const dl = el("dl");
  for (const [k, v] of rows) dl.append(el("dt", "", k), el("dd", "", String(v)));
  body.append(dl);

  const failed = [flag, capital, currency, population].filter((r) => r.status === "rejected").length;
  if (failed === 4) body.append(el("div", "msg error", "No se pudieron cargar los datos adicionales. Se muestran solo los del listado."));

  // Lista de ciudades con filtro local
  const box = el("div", "cities-box");
  const input = el("input");
  input.type = "search";
  input.placeholder = "Filtrar ciudades";
  input.setAttribute("aria-label", `Filtrar ciudades de ${c.country}`);
  const ul = el("ul", "cities");
  const note = el("p", "small");
  const paint = () => {
    const f = input.value.trim().toLowerCase();
    const found = c.cities.filter((x) => !f || x.toLowerCase().includes(f));
    ul.replaceChildren(...found.slice(0, MAX_CITIES_SHOWN).map((x) => el("li", "", x)));
    note.textContent = found.length === 0 ? "Ninguna ciudad coincide."
      : found.length > MAX_CITIES_SHOWN ? `Mostrando ${MAX_CITIES_SHOWN} de ${fmt.format(found.length)}. Escribe para filtrar.`
      : `${fmt.format(found.length)} ciudad(es).`;
  };
  input.addEventListener("input", paint);
  paint();
  box.append(el("strong", "", "Ciudades"), input, ul, note);
  body.append(box);
}

/* ---------- Eventos ---------- */
let debounce;
$("search").addEventListener("input", () => { clearTimeout(debounce); debounce = setTimeout(applyFilters, 200); });
$("min").addEventListener("change", applyFilters);
$("sort").addEventListener("change", applyFilters);
$("close").addEventListener("click", () => $("modal").close());
$("modal").addEventListener("click", (e) => { if (e.target === $("modal")) $("modal").close(); });

loadCountries();