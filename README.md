# Sistema de Optimización Automática de Horarios y Aulas

Proyecto final de Programación Orientada a la Web — Universidad Cooperativa de Colombia.

Genera automáticamente horarios universitarios sin cruces de profesores, aulas ni grupos (algoritmo CSP con backtracking), con un calendario interactivo, análisis del horario e inicio de sesión con roles.

| | Enlace |
|---|---|
| Aplicación web | https://sistema-horarios-frontend.vercel.app |
| API (documentación en `/docs`) | https://sistema-horarios-backend.onrender.com |

## Estructura del repositorio

```
├── backend/    # API REST: Python, FastAPI, SQLAlchemy, PostgreSQL (Supabase), JWT
└── frontend/   # Aplicación web: Angular 22, signals, CDK drag & drop, Web/Shared/Service Workers
```

Cada carpeta tiene su propio README con la instalación, los endpoints y las pruebas:

- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)

## Cuentas de prueba

| Rol | Correo | Contraseña | Puede |
|---|---|---|---|
| Administrador | `admin@horarios.edu.co` | `Admin2026*` | Todo: gestionar datos y usuarios, generar y ajustar el horario |
| Usuario | `usuario@horarios.edu.co` | `Usuario2026*` | Solo consultar el horario y el análisis |

## Ejecución local

```
# Backend (http://127.0.0.1:8000)
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (http://localhost:4200), en otra terminal
cd frontend
npm install
npm start
```

El backend necesita un archivo `backend/.env` con `DATABASE_URL` (ver `backend/.env.example`).
