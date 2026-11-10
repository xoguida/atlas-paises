"use strict";
const API = "https://countriesnow.space/api/v0.1/countries";
const LIST_FIELDS = "name,cca3,flags,region,population,capital";
const DETAIL_FIELDS = "name,flags,capital,region,subregion,population,area,languages,currencies,timezones,maps";
const PER_PAGE = 12;

const state = { all: [], view: [], page: 1 };
const $ = (id) => document.getElementById(id);
const fmt = new Intl.NumberFormat("es-MX");

/** Fetch con timeout y errores HTTP traducidos a mensajes comprensibles. */
async function getJSON(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (res.status === 404) throw new Error("No se encontró el recurso solicitado (404).");
    if (res.status === 429) throw new Error("Demasiadas solicitudes (429). Espera un momento e inténtalo de nuevo.");
    if (res.status >= 500) throw new Error(`El servicio tiene problemas (${res.status}). Inténtalo más tarde.`);
    if (!res.ok) throw new Error(`Error inesperado (${res.status}).`);
    return await res.json();
  } catch (e) {
    if (e.name === "AbortError") throw new Error("La solicitud tardó demasiado. Revisa tu conexión.");
    if (e instanceof TypeError) throw new Error("No hay conexión con el servicio. Revisa tu internet.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- Estados de la interfaz ---------- */
function showLoading(text = "Cargando países…") {
  const s = $("status");
  s.replaceChildren();
  const box = el("div", "msg");
  box.append(el("div", "spinner"), text);
  s.append(box);
}
function showMessage(text, isError = false, retry = null) {
  const s = $("status");
  s.replaceChildren();
  const box = el("div", "msg" + (isError ? " error" : ""), text);
  if (retry) {
    const b = el("button", "btn", "Reintentar");
    b.style.marginLeft = "1rem";
    b.onclick = retry;
    box.append(b);
  }
  s.append(box);
}
const clearStatus = () => $("status").replaceChildren();

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/* ---------- Carga de datos ---------- */
async function loadCountries() {
  showLoading();
  $("grid").replaceChildren();
  $("pager").replaceChildren();
  try {
    state.all = await getJSON(`${API}/all?fields=${LIST_FIELDS}`);
    applyFilters();
  } catch (e) {
    $("count").textContent = "";
    showMessage(e.message, true, loadCountries);
  }
}

/* ---------- Filtro, orden y paginación ---------- */
function applyFilters() {
  const q = $("search").value.trim().toLowerCase();
  const region = $("region").value;
  const sort = $("sort").value;

  let list = state.all.filter((c) =>
    (!region || c.region === region) &&
    (!q || c.name.common.toLowerCase().includes(q) || c.name.official.toLowerCase().includes(q))
  );
  list.sort((a, b) =>
    sort === "pop-desc" ? b.population - a.population :
    sort === "pop-asc" ? a.population - b.population :
    a.name.common.localeCompare(b.name.common)
  );
  state.view = list;
  state.page = 1;
  render();
}

function render() {
  const total = state.view.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const start = (state.page - 1) * PER_PAGE;
  const items = state.view.slice(start, start + PER_PAGE);

  $("count").textContent = `${fmt.format(total)} país(es) encontrado(s)`;
  const grid = $("grid");
  grid.replaceChildren();

  if (total === 0) {
    showMessage("Sin resultados. Prueba con otro nombre o cambia la región.");
    $("pager").replaceChildren();
    return;
  }
  clearStatus();

  for (const c of items) {
    const li = el("li");
    const btn = el("button", "card");
    const img = el("img");
    img.src = c.flags.svg || c.flags.png;
    img.alt = c.flags.alt || `Bandera de ${c.name.common}`;
    img.loading = "lazy";
    const info = el("div");
    info.append(
      el("h2", "", c.name.common),
      el("p", "", `Capital: ${(c.capital && c.capital[0]) || "—"}`),
      el("p", "", `Región: ${c.region || "—"}`),
      el("p", "", `Población: ${fmt.format(c.population)}`)
    );
    btn.append(img, info);
    btn.onclick = () => openDetail(c.cca3);
    li.append(btn);
    grid.append(li);
  }

  const pager = $("pager");
  pager.replaceChildren();
  const prev = el("button", "btn", "Anterior");
  const next = el("button", "btn", "Siguiente");
  prev.disabled = state.page === 1;
  next.disabled = state.page === pages;
  prev.onclick = () => { state.page--; render(); window.scrollTo({ top: 0 }); };
  next.onclick = () => { state.page++; render(); window.scrollTo({ top: 0 }); };
  pager.append(prev, el("span", "", `Página ${state.page} de ${pages}`), next);
}

/* ---------- Detalle en diálogo (segundo endpoint) ---------- */
async function openDetail(code) {
  const body = $("modal-body");
  body.replaceChildren(el("div", "msg", "Cargando ficha…"));
  $("modal").showModal();
  try {
    const data = await getJSON(`${API}/alpha/${code}?fields=${DETAIL_FIELDS}`);
    const c = Array.isArray(data) ? data[0] : data;
    const img = el("img");
    img.src = c.flags.svg || c.flags.png;
    img.alt = c.flags.alt || `Bandera de ${c.name.common}`;
    const title = el("h2", "", c.name.common);
    title.id = "m-title";
    const rows = [
      ["Nombre oficial", c.name.official],
      ["Capital", (c.capital || []).join(", ") || "—"],
      ["Región", [c.region, c.subregion].filter(Boolean).join(" / ") || "—"],
      ["Población", fmt.format(c.population)],
      ["Área", c.area ? `${fmt.format(c.area)} km²` : "—"],
      ["Idiomas", Object.values(c.languages || {}).join(", ") || "—"],
      ["Monedas", Object.values(c.currencies || {}).map((m) => `${m.name} (${m.symbol || "-"})`).join(", ") || "—"],
      ["Zonas horarias", (c.timezones || []).join(", ")],
    ];
    const dl = el("dl");
    for (const [k, v] of rows) dl.append(el("dt", "", k), el("dd", "", v));
    body.replaceChildren(img, title, dl);
    if (c.maps && c.maps.googleMaps) {
      const a = el("a", "", "Ver en el mapa");
      a.href = c.maps.googleMaps; a.target = "_blank"; a.rel = "noopener";
      body.append(a);
    }
  } catch (e) {
    body.replaceChildren(el("div", "msg error", e.message));
  }
}

/* ---------- Eventos ---------- */
let debounce;
$("search").addEventListener("input", () => { clearTimeout(debounce); debounce = setTimeout(applyFilters, 200); });
$("region").addEventListener("change", applyFilters);
$("sort").addEventListener("change", applyFilters);
$("close").addEventListener("click", () => $("modal").close());
$("modal").addEventListener("click", (e) => { if (e.target === $("modal")) $("modal").close(); });

loadCountries();
