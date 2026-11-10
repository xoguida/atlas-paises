# Atlas de países

Miniaplicación web que consume la API pública **REST Countries** con `fetch()` y `async/await` para buscar, filtrar y explorar países.

- **Demo:** https://xoguida.github.io/~atlas-paises~/
- **Repositorio:** https://github.com/xoguida/atlas-paises

## API utilizada
- Documentación: https://restcountries.com
- Sin API key ni datos sensibles.
- Endpoints:
  - `GET https://restcountries.com/v3.1/all?fields=name,cca3,flags,region,population,capital` (listado)
  - `GET https://restcountries.com/v3.1/alpha/{codigo}?fields=...` (detalle)
- Formato: JSON (arreglo de objetos país).
- Códigos de error: `404` no encontrado, `429` demasiadas solicitudes, `5xx` fallo del servicio. La app también maneja timeout (10 s) y falta de conexión.

## Funcionalidades
- Búsqueda por nombre (con debounce), filtro por región y ordenamiento.
- Paginación (12 países por página).
- Ficha de detalle en diálogo con segunda llamada a la API.
- Estados de carga, resultado vacío y error con botón "Reintentar".
- Componentes creados dinámicamente en el DOM; diseño responsivo, modo oscuro, foco visible y textos alternativos.

## Uso local
```bash
git clone https://github.com/xoguida/atlas-paises
cd atlas-paises
# abre index.html en el navegador, o:
python3 -m http.server 8000   # http://localhost:8000
```

## Estructura
```
index.html   estructura
styles.css   estilos
app.js       lógica: fetch, filtros, paginación, render, errores
```

## Capturas
Agrega aquí tus capturas en la carpeta `capturas/`:
- `![Listado](capturas/listado.png)`
- `![Detalle](capturas/detalle.png)`
- `![Error](capturas/error.png)`
- `![Sin resultados](capturas/vacio.png)`

## Reflexión técnica
Esta actividad me permitió integrar un servicio externo con JSON y programación asíncrona. Lo más importante fue no asumir que la petición siempre funciona: envolví `fetch` en una función que usa `AbortController` para el timeout y traduce los códigos HTTP a mensajes claros para el usuario. Descargar el listado una sola vez y filtrar en el cliente hace la interacción inmediata y reduce llamadas a la API; el detalle se pide bajo demanda. Usé `textContent` y `createElement` en lugar de `innerHTML` para evitar inyección de HTML. La API exige el parámetro `fields` en `/all`, lo cual descubrí al leer su documentación y me ayudó a pedir solo lo necesario. Como mejora futura agregaría caché en `sessionStorage`, favoritos y pruebas automáticas.
