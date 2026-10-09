# Sistema de Optimización Automática de Horarios y Aulas — Frontend

Aplicación Angular para generar, revisar y ajustar horarios universitarios sin cruces. Consume la API del backend (FastAPI), que resuelve la asignación como un problema de satisfacción de restricciones (CSP).

Proyecto final de Programación Orientada a la Web — Universidad Cooperativa de Colombia.

- **Backend:** https://github.com/DeividJulian/sistema-horarios-backend
- **Aplicación desplegada:** https://sistema-horarios-frontend.vercel.app
- **API:** https://sistema-horarios-backend.onrender.com

## Qué permite hacer

| Página | Ruta | Funciones |
|---|---|---|
| Inicio de sesión | `/login` | Correo y contraseña, indicador de conexión con el servidor y cuentas de prueba |
| Horario | `/horario` | Calendario semanal, generación automática, arrastrar y soltar bloques, filtros por profesor/grupo/aula, detalle de cada bloque, mover por teclado, eliminar bloques, conflictos resaltados en rojo |
| Gestión | `/gestion/...` | CRUD de profesores (con su disponibilidad), aulas, grupos, materias y usuarios, con las mismas validaciones que el backend. Solo administradores. |
| Análisis | `/analisis` | Totales, cumplimiento de horas, ocupación de aulas, bloques por día, carga de profesores, lista de conflictos y carga de datos de demostración |

## Inicio de sesión y roles

Toda la aplicación exige iniciar sesión. El backend devuelve un token JWT que se guarda en el navegador y un interceptor lo envía en cada petición; si expira, la aplicación vuelve al login.

| Rol | Qué ve y qué puede hacer |
|---|---|
| **Administrador** | Todo: Gestión (incluidos los usuarios), generar el horario, arrastrar, mover y eliminar bloques, cargar datos de demostración. |
| **Usuario** | Solo consulta: el horario con sus filtros, el detalle de cada bloque y el análisis. No ve Gestión ni los botones que modifican datos. |

Cuentas de prueba (también aparecen como botones en el login):

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@horarios.edu.co` | `Admin2026*` |
| Usuario | `usuario@horarios.edu.co` | `Usuario2026*` |

Las rutas están protegidas con *guards* (`core/auth/auth.guards.ts`), pero la seguridad real está en el backend, que responde `401` sin sesión y `403` si el rol no alcanza.

> El backend está en el plan gratuito de Render, que se apaga tras un rato sin uso. Por eso el login "despierta" al servidor apenas se abre y muestra su estado; la primera entrada puede tardar hasta un minuto.

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

43 pruebas unitarias que cubren las validaciones, los mensajes de error, la lógica del Web Worker, los filtros, las notificaciones, el diálogo de confirmación, el estado compartido (incluida la actualización optimista con reversión), los interceptores y el inicio de sesión con sus guards por rol.
