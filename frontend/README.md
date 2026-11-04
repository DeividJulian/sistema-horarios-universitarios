# Sistema de Optimización Automática de Horarios y Aulas — Frontend

Aplicación Angular para generar, revisar y ajustar horarios universitarios sin cruces. Consume la API del backend (FastAPI), que resuelve la asignación como un problema de satisfacción de restricciones (CSP).

Proyecto final de Programación Orientada a la Web — Universidad Cooperativa de Colombia.

- **Backend:** https://github.com/DeividJulian/sistema-horarios-backend
- **Aplicación desplegada:** https://sistema-horarios-frontend.vercel.app
- **API:** https://sistema-horarios-backend.onrender.com

## Qué permite hacer

| Página | Ruta | Funciones |
|---|---|---|
| Registro | `/registro` | El estudiante crea su cuenta con nombre, correo y grupo, y la activa con el código que le llega al correo |
| Inicio de sesión | `/login` | Sin contraseña: correo → código de 6 dígitos por correo, con «Reenviar código» y cuenta regresiva; indicador de conexión con el servidor y mensajes claros si el servidor está despertando |
| Horario | `/horario` | Calendario semanal, generación automática (CSP + recocido simulado, con las horas muertas antes → después), arrastrar y soltar bloques, filtros por profesor/grupo/aula, detalle de cada bloque, mover por teclado, eliminar bloques y conflictos resaltados en rojo |
| Gestión | `/gestion/...` | CRUD de profesores (con su disponibilidad), aulas, grupos, materias y usuarios, con las mismas validaciones que el backend. Solo administradores. |
| Avisos | `/avisos` | Cancelaciones y cambios de aula u horario de las clases (cada rol ve los suyos) |
| Análisis | `/analisis` | Totales, cumplimiento de horas, ocupación de aulas, bloques por día, carga de profesores, lista de conflictos y carga de datos de demostración |

## Diseño

Sistema de diseño **«Plano»**, hecho en Claude Design, aplicado en toda la aplicación.
- **Paleta:** papel cálido (`#F3F1EA`), tinta (`#15171C`) y un solo acento «señal» naranja quemado (`#B93C0B`) para la acción principal, la IA y el «ahora».
- **Tipografía:** Bricolage Grotesque en los títulos, Geist en el texto y Geist Mono en las cifras.
- **Tokens:** están en `src/styles.css`.

- **Inicio de sesión y registro:** panel de marca en tinta, con cuadrícula de plano, una semana ilustrada y el titular; el formulario va sobre papel. En celular solo queda el formulario.
- **Barra lateral en tinta (248 px):** la opción activa se ve invertida. Abajo está la tarjeta de estado: Optimizado / Con conflictos, eficiencia con medidor y el botón «Re-optimizar horario». En celular se abre con el botón de menú.
- **Barra superior:** fecha y título grande, pestañas sincronizadas, Tutorial, campana con contador y cuenta con su rol.
- **Tarjetas de resumen:**
  - anillo de eficiencia;
  - restricciones resueltas;
  - optimización con las horas muertas antes → después del recocido simulado;
  - franja de totales.
- **Calendario:**
  - días con número grande y la píldora «Hoy», y la línea roja del «ahora»;
  - tarjetas con el color de la materia, la hora, el grupo y el aula;
  - **varias clases por casilla**, cuando varios grupos coinciden en la misma hora;
  - estados *Conflicto* (rojo) y *Cancelada* (rayada, con el nombre tachado).
- **Celular:** franja de días con la agenda del día elegido, y el inspector como hoja inferior.
- **Inspector**, tablas, pestañas, avisos y diálogos con los mismos componentes. Las notificaciones van en tinta.
- **Esqueletos de carga** con efecto shimmer en lugar de ruedas de carga.

La eficiencia es el porcentaje de clases programadas sin conflictos sobre las horas que requieren las materias (`core/state/optimization.store.ts`).

## Inicio de sesión y roles

Toda la aplicación exige iniciar sesión, **sin contraseñas**:
1. La persona escribe su correo.
2. El backend le envía un código de 6 dígitos (Brevo en producción).
3. Al escribirlo o pegarlo, la aplicación entra sola.

El token JWT se guarda en `localStorage`, con `try/catch` por si el navegador lo bloquea, y se descarta si ya venció. Al abrir la app se confirma con `GET /auth/me`. El rol no se elige en el login: lo decide el backend y cada persona llega a su vista.

| Rol | Qué ve y qué puede hacer |
|---|---|
| **Administrador** | Todo: Gestión (incluidos los usuarios), generar el horario, arrastrar, mover, cancelar, cambiar de aula y eliminar bloques. |
| **Profesor** | «Mis clases»: solo sus clases de la semana. Puede cancelar una clase en una fecha (con motivo) o cambiarla a un aula libre; sus estudiantes reciben un aviso. Entra con el correo que el administrador le registró. |
| **Estudiante** | «Mi horario»: solo el horario de su grupo (su semestre), con las clases canceladas tachadas, y la página de Avisos con un contador de no leídos. |
| **Consulta** | Ve el horario de toda la facultad y el análisis, sin modificar nada. |

Piezas (`core/auth/` y `features/login/`):
- **`AuthService`:** con signals; tiene `register`, `requestCode`, `verify`, `refreshProfile` y `logout`.
- **Interceptor:**
  - pone el `Bearer` solo en las peticiones a nuestro backend;
  - ante un `401` cierra la sesión, salvo en las rutas `/auth/`, donde solo significa código incorrecto (`/auth/me` sí la cierra).
- **Guards:** `authGuard`, `guestGuard`, `adminGuard` y `roleGuard`.
- **`CodeStep`:** el paso del código, compartido por el login y el registro.
- **Al cerrar sesión:** también se borra la caché del API que guarda el Service Worker.

Las rutas están protegidas con *guards*, pero la seguridad real está en el backend, que responde `401` sin sesión y `403` si el rol no alcanza.

### Registro

En `/registro` (enlace «Regístrate» del login, o «Crear cuenta de estudiante con este correo» cuando el correo no tiene cuenta):

- **Estudiante:** nombre, correo y grupo; luego el código que le llega. Solo verá el horario de ese grupo.
- **Profesor:** no se registra. Entra con el correo con el que el administrador lo registró.
- **Administrador y consulta:** los crea un administrador en Gestión → Usuarios, solo con nombre y correo.

Al entrar aparece «Bienvenido, nombre. Entraste como …» con el rol, además del rol que muestra la barra.

> El backend está en el plan gratuito de Render, que se apaga tras un rato sin uso. Por eso el login "despierta" al servidor apenas se abre y muestra su estado; la primera entrada puede tardar hasta un minuto.

## Inteligencia artificial

La IA del backend (Groq por defecto) **solo aconseja**: nada cambia hasta que la persona lo confirma.

- **Resolver con IA** (administrador): aparece en el detalle de un bloque en rojo.
  - Muestra las franjas y aulas donde la clase cabe sin romper ninguna regla, con la recomendada resaltada y la explicación.
  - «Mover aquí» aplica la opción elegida, que puede incluir un cambio de aula.
- **Redactar aviso con IA** (profesor de la clase o administrador): está en «Cancelar una clase» y en «Cambiar de aula». Llena el campo «Aviso para los estudiantes», que se puede editar antes de enviarlo; si se deja vacío, el sistema escribe el aviso como antes.
- **Nombre del proveedor:** se muestra el que dice `GET /ai/status`, nunca uno escrito a mano. Sin clave en el servidor, los botones dicen «IA no configurada».
- **Código:** `core/api/ai.service.ts`, `core/models/ai.ts` y `features/schedule/conflict-advisor/`.

## Contrato de la API y tipado de extremo a extremo

La cadena completa tiene una sola fuente de verdad, el contrato OpenAPI del backend:

```
PostgreSQL → modelos SQLAlchemy → esquemas Pydantic → openapi.json → tipos TypeScript + esquemas Zod → servicios → componentes
```

- **`openapi/openapi.json`:** copia versionada del contrato del backend (`backend/openapi.json`). Gracias a ella el frontend compila solo, también en Vercel.
- **`npm run gen:api`:**
  - copia el contrato desde `../backend` si está;
  - genera `src/app/core/api/generated/`: `types.gen.ts` con los tipos y `zod.gen.ts` con los esquemas Zod.
  - **No se edita a mano.**
- **`npm run check:api`:** falla si el código generado o la copia del contrato están desactualizados. Corre dentro de `npm test`.
- **Modelos:** los de `core/models` son alias de los tipos generados (`type Teacher = TeacherOut`). Si el backend renombra un campo, el frontend **no compila**: al probar renombrando `TeacherOut.nombre` salieron 17 errores. Los literales con etiquetas propias (días, jornadas, tipos de aula) se comparan con el contrato en tiempo de compilación (`core/models/contract-checks.ts`).

**Herramienta elegida:** [`@hey-api/openapi-ts`](https://heyapi.dev), con versión fija porque está en 0.x.
- Declara soporte para TypeScript 6, el de este proyecto; `openapi-typescript` 7.x pide TypeScript 5.
- Genera, desde el mismo contrato, los tipos **y** los esquemas Zod, así que la validación en tiempo de ejecución no se escribe a mano.
- `ng-openapi-gen` genera servicios atados a Angular, pero no esquemas de validación, y habría reemplazado los servicios con estado optimista que ya existen. Por eso aquí la capa HTTP siguen siendo nuestros servicios, tipados y parseados con lo generado.

### Mocks tipados (trabajar sin backend)

`npm run start:mock` levanta la app con un interceptor (`core/api/mocks`) que responde la API con datos de ejemplo. El código de acceso es `123456`.
- Los datos se declaran con `satisfies TeacherOut[]`, etc., así que si el contrato cambia dejan de compilar.
- Una prueba los parsea además con los esquemas Zod generados.

## Parsear, no solo validar (Zod)

Los tipos de TypeScript se borran al compilar. `this.http.get<Teacher[]>(url)` no comprueba nada: solo le *promete* al compilador que llegará un `Teacher[]`. Si el backend cambia, el error aparece lejos de la causa, como un `undefined` en una plantilla.

- **Validar:** responder sí o no y seguir usando el dato original, sin tipo confiable.
- **Parsear:** convertir el dato desconocido (`unknown`) en un valor tipado **o** fallar en el borde, con un error que dice dónde y qué.

Ejemplo real de este proyecto: la lista de profesores. Antes:

```ts
list(): Observable<Teacher[]> {
  return this.http.get<Teacher[]>(this.url); // confía a ciegas
}
```

Ahora (`core/api/teacher.service.ts`):

```ts
list(): Observable<Teacher[]> {
  return this.http.get(this.url).pipe(parseResponse(z.array(zTeacherOut), 'GET /teachers'));
}
```

Si el backend respondiera `[{ "id": "1", "nombre_completo": "Ana" }]`:
- `parseResponse` lanza `ApiContractError` con el endpoint y los campos (`0.id`, `0.nombre`) y lo registra en la consola;
- los manejadores de error muestran *«El servidor respondió con datos que la aplicación no esperaba…»*;
- la pantalla no se rompe: el store queda con un error legible en vez de datos a medias.

Los campos que el contrato no conoce se descartan. Se parsean las **47** llamadas de los servicios, la sesión y la última optimización guardadas en `localStorage`, y el cuerpo de los errores (`{detail}`). Las pruebas están en `core/api/parse.spec.ts`.

Se usa **Zod Mini** con imports `import * as z`, que se puede podar (*tree-shaking*): el bundle inicial pasó de 360 kB a 393 kB. Con el Zod clásico y `import { z }` llegaba a 794 kB por las traducciones de decenas de idiomas.

## gRPC desde el navegador (Connect + Protobuf)

El backend expone el servicio RPC de `proto/horarios/v1/horarios.proto` en `/rpc` (ver el README del backend).
- **Contrato:** `proto/` es una copia de ese archivo.
- **Cliente:** `npm run gen:proto` genera `src/app/core/rpc/gen` con `protoc-gen-es` (vía `buf`), y `npm run check:proto`, incluido en `npm test`, verifica que esté al día.
- **Transporte:** el cliente (`core/rpc/schedule-rpc.service.ts`) usa `@connectrpc/connect-web` con Protobuf binario, que funciona sobre HTTP/1.1 y admite *streaming* del servidor.
- **Sesión:** envía el mismo JWT que REST.
- **Carga diferida:** se carga solo al usarlo, así que el bundle inicial no crece.

En la app:
- **Panel → tarjeta Optimización → interruptor «REST · JSON / gRPC · streaming»** (administrador). Con gRPC se ven en vivo las fases (Preparar, CSP, Recocido, Guardar), la barra de materias asignadas y las horas muertas, más el botón **Cancelar**. El servidor se detiene antes de guardar, así que el horario anterior se conserva.
- **Análisis → «REST (JSON) vs gRPC (Protobuf)»:** mide en el navegador, contra el servidor real, el tamaño del mensaje, el tamaño con gzip y la mediana de tiempo de `GET /schedules` frente a `ListSchedule`. Con la facultad de prueba (130 bloques): 14.013 B de JSON frente a 1.823 B de Protobuf, es decir, 7,7× menos.

## Tecnologías

- Angular 22 con componentes standalone, **signals** y detección de cambios sin Zone.js
- Angular CDK (arrastrar y soltar) y Router con carga diferida de páginas
- Formularios reactivos
- TypeScript en modo estricto
- Vitest para pruebas unitarias

## Estructura

```
src/app/
├── core/
│   ├── api/            # Un servicio HTTP por recurso (teacher, classroom, schedule, analysis, user, ...)
│   ├── auth/           # Sesión (AuthService), interceptor del token y guards por rol
│   ├── models/         # Interfaces de los datos de la API
│   ├── state/          # CatalogStore: estado compartido con signals
│   ├── services/       # Notificaciones, confirmación, conexión, sincronización entre pestañas
│   ├── interceptors/   # Conecta las peticiones HTTP con el Shared Worker y el Service Worker
│   └── http/           # Traducción de errores HTTP a mensajes claros
├── features/
│   ├── login/          # Página de inicio de sesión
│   ├── schedule/       # Página del horario (calendario, filtros, detalle, análisis del worker)
│   ├── management/     # Página de gestión (profesores, disponibilidad, aulas, grupos, materias, usuarios)
│   └── analysis/       # Página de análisis
├── shared/             # Componentes reutilizables (toasts, diálogo, barra de navegación, ...)
└── workers/            # Web Worker de análisis del horario
public/
├── shared-worker.js    # Shared Worker: sincroniza las pestañas abiertas
└── sw.js               # Service Worker: modo sin conexión
```

### Convención de idioma

- **Código en inglés:** clases, funciones, variables, archivos y comentarios.
- **Español en todo lo que ve el usuario:** textos, mensajes, títulos de pestaña y URLs.
- **Endpoints de la API en inglés** (`/teachers`, `/schedules/generate`) y **campos en español** (`nombre`, `aforo`, `dia_semana`), igual que en el backend.

## Instalación y ejecución

Requisitos: Node.js 20 o superior y el backend corriendo en `http://127.0.0.1:8000`.

```
npm install
npm start
```

La aplicación queda en `http://localhost:4200`. La URL del backend se configura en `src/environments/` (`environment.development.ts` para desarrollo y `environment.ts` para producción).

## Los tres tipos de worker

| Worker | Archivo | Para qué sirve |
|---|---|---|
| **Web Worker** | `src/app/workers/schedule-analysis.worker.ts` | "Analizar horario" calcula las franjas muertas y la ocupación en otro hilo, sin congelar la pantalla. |
| **Shared Worker** | `public/shared-worker.js` | Una sola instancia para todas las pestañas: si mueves un bloque en una, las demás se actualizan solas. Muestra cuántas pestañas están sincronizadas. |
| **Service Worker** | `public/sw.js` | Guarda la aplicación y las últimas respuestas de la API: sin internet se puede abrir y consultar el último horario (aviso "Sin conexión: solo lectura"). |

El Service Worker solo se registra en la versión de producción:

```
npm run build
npx serve -s dist/frontend/browser -l 8080
```

Abre `http://localhost:8080`, espera el aviso "Modo offline listo" y, en las herramientas de desarrollo (pestaña *Application* → *Service Workers*), marca *Offline* y recarga. El parámetro `-s` hace que rutas como `/gestion` funcionen al recargar.

## Accesibilidad

- Navegación completa con teclado: los bloques del calendario reciben foco y se abren con Enter; desde el detalle se pueden mover sin arrastrar.
- Diálogo de confirmación nativo (`<dialog>`): atrapa el foco y se cierra con Escape.
- Avisos con `aria-live`, enlace para saltar al contenido y etiquetas descriptivas en los bloques.
- Los conflictos y errores siempre llevan ícono y texto, nunca solo color.

## Pruebas

```
npm test -- --watch=false
```

58 pruebas unitarias que cubren las validaciones, los mensajes de error, la lógica del Web Worker, los filtros, las notificaciones, el diálogo de confirmación, el estado compartido (incluida la actualización optimista con reversión), los interceptores, el inicio de sesión con sus guards por rol el cálculo de las fechas de la semana los mensajes de error del login y del registro, y el cálculo de la eficiencia y las restricciones del panel.
