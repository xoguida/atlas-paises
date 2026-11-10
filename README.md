# Atlas de países y ciudades

Miniaplicación web que consume la API pública **CountriesNow** con `fetch()` y `async/await` para explorar países y sus ciudades.

- **Demo:** https://xoguida.github.io/atlas-paises/
- **Repositorio:** https://github.com/xoguida/atlas-paises

## API utilizada
- Sitio: https://countriesnow.space (sin API key ni datos sensibles).
- Endpoint principal: `GET https://countriesnow.space/api/v0.1/countries`
  - Respuesta JSON: `{ "error": false, "msg": "...", "data": [ { "iso2", "iso3", "country", "cities": [...] } ] }`
- Endpoints de detalle (método `POST`, cuerpo `{ "country": "Mexico" }`):
  - `/countries/flag/images` (bandera)
  - `/countries/capital` (capital)
  - `/countries/currency` (moneda)
  - `/countries/population` (población por año)
- Errores contemplados: `400/404` sin datos, `429` demasiadas solicitudes, `5xx` fallo del servicio, `error: true` en el JSON, timeout (20 s) y falta de conexión.

## Funcionalidades
- Búsqueda por país **o por ciudad** (con debounce), filtro por cantidad de ciudades y ordenamiento.
- Paginación (12 países por página).
- Ficha de detalle en diálogo: 4 consultas POST en paralelo con `Promise.allSettled`; si alguna falla, se muestra "No disponible" sin romper la ficha.
- Lista de ciudades con filtro local dentro de la ficha.
- Estados de carga, resultado vacío y error con botón "Reintentar".
- Componentes creados dinámicamente en el DOM; diseño responsivo, modo oscuro y foco visible.

## Uso local
```bash
git clone https://github.com/xoguida/atlas-paises
cd atlas-paises
# abre index.html en el navegador, o:
python -m http.server 8000   # http://localhost:8000
```

## Estructura
```
index.html   estructura
styles.css   estilos
app.js       lógica: fetch, búsqueda, paginación, render, errores
```

## Capturas
Guarda tus capturas en `capturas/`:
- `![Listado](capturas/listado.png)`
- `![Búsqueda por ciudad](capturas/ciudad.png)`
- `![Detalle](capturas/detalle.png)`
- `![Error](capturas/error.png)`
- `![Sin resultados](capturas/vacio.png)`

## Reflexión técnica
Esta actividad me permitió integrar un servicio externo con JSON y programación asíncrona. El endpoint principal devuelve países con todas sus ciudades en una sola respuesta grande, así que la descargo una vez, muestro un estado de carga y hago búsqueda y filtros en el cliente para que la interacción sea inmediata. Los datos extra (bandera, capital, moneda, población) requieren peticiones POST por país; las lanzo en paralelo con `Promise.allSettled` para que el fallo de una no impida mostrar el resto. Aprendí que una API puede responder HTTP 200 con `error: true`, por lo que validé también el cuerpo. Usé `textContent` y `createElement` en lugar de `innerHTML` para evitar inyección de HTML, y un contador para ignorar respuestas de fichas que el usuario ya cerró. Como mejora futura agregaría caché en `sessionStorage` y favoritos.