# CreditoSys - Sistema de Gestión de Créditos willie


## 📋 Descripción General

CreditoSys es un sistema completo de gestión de créditos desarrollado con Django (backend) y HTML/CSS/JavaScript (frontend). El sistema permite a los usuarios solicitar créditos, a los evaluadores revisar y aprobar solicitudes, y a los administradores gestionar todo el proceso.

## 🏗️ Arquitectura del Sistema

### Backend (Django)
- **Framework**: Django 5.2.3 con Django REST Framework
- **Base de Datos**: PostgreSQL 17
- **Autenticación**: JWT (JSON Web Tokens)
- **API**: RESTful API con endpoints para todas las funcionalidades

### Frontend
- **Tecnologías**: HTML5, CSS3, JavaScript (Vanilla)
- **UI/UX**: Diseño moderno y responsivo
- **Iconografía**: Font Awesome
- **Comunicación**: Fetch API para comunicación con el backend

### Infraestructura
- **Contenedores**: Docker y Docker Compose
- **Base de Datos**: PostgreSQL con pgAdmin para administración
- **Puertos**:
  - Backend: 8000
  - Base de datos: 5432
  - pgAdmin: 5050

## 👥 Roles de Usuario

### 1. Cliente
- **Funcionalidades**:
  - Registro e inicio de sesión
  - Crear nuevas solicitudes de crédito
  - Ver historial de solicitudes
  - Subir documentos de respaldo
  - Ver estado de solicitudes en tiempo real
  - Dashboard con estadísticas personales

### 2. Evaluador
- **Funcionalidades**:
  - Todas las funcionalidades de cliente
  - Panel de evaluación de solicitudes
  - Asignar score crediticio
  - Aprobar/rechazar solicitudes
  - Agregar comentarios de evaluación
  - Ver reportes de evaluación

### 3. Administrador
- **Funcionalidades**:
  - Todas las funcionalidades de evaluador
  - Panel de administración completo
  - Gestión de usuarios
  - Configuración del sistema
  - Reportes avanzados
  - Supervisión de evaluadores

## 🗄️ Modelos de Datos

### Usuario (User)
```python
- username: Nombre de usuario único
- email: Correo electrónico
- role: Rol (cliente, evaluador, admin)
- dni: Número de identificación
- phone_number: Número telefónico
- password: Contraseña encriptada
```

### Solicitud (Application)
```python
- client: Usuario que solicita el crédito
- amount: Monto solicitado
- term_months: Plazo en meses
- purpose: Propósito del crédito
- status: Estado (pendiente, en_revision, aprobada, rechazada, desembolsada, cancelada)
- application_date: Fecha de solicitud
- credit_score: Score crediticio asignado
- evaluator_comments: Comentarios del evaluador
```

### Documento (ApplicationDocument)
```python
- application: Solicitud asociada
- document_type: Tipo de documento
- file: Archivo subido
- uploaded_at: Fecha de subida
```

## 🔧 Configuración e Instalación

### Prerrequisitos
- Docker y Docker Compose
- Git

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd CreditoSys-main
   ```

2. **Configurar variables de entorno**
   Crear archivo `.env.backend` en la raíz del proyecto:
   ```env
   DB_NAME=creditosys_db
   DB_USER=creditosys_user
   DB_PASSWORD=DiscJockey001
   DB_HOST=db
   DB_PORT=5432
   SECRET_KEY=tu_clave_secreta_aqui
   ```

3. **Ejecutar con Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Ejecutar migraciones (en contenedor backend)**
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

5. **Crear superusuario (opcional)**
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

### Acceso al Sistema
- **Frontend**: http://localhost:8000
- **Backend API**: http://localhost:8000/api/
- **Admin Django**: http://localhost:8000/admin/
- **pgAdmin**: http://localhost:5050

## 🚀 Funcionalidades Principales

### Sistema de Autenticación
- **Registro**: Formulario completo con validaciones
- **Login**: Autenticación con JWT
- **Roles**: Sistema de permisos basado en roles
- **Sesiones**: Gestión automática de tokens

### Gestión de Solicitudes
- **Crear**: Formulario intuitivo para nuevas solicitudes
- **Listar**: Vista paginada con filtros y búsqueda
- **Detalles**: Información completa de cada solicitud
- **Estados**: Flujo de estados automático
- **Documentos**: Subida y gestión de archivos

### Panel de Evaluación
- **Dashboard**: Estadísticas en tiempo real
- **Evaluación**: Interfaz para evaluadores
- **Score**: Sistema de puntuación crediticia
- **Comentarios**: Sistema de feedback

### Administración
- **Usuarios**: Gestión completa de usuarios
- **Reportes**: Estadísticas avanzadas
- **Configuración**: Ajustes del sistema

## 📡 API Endpoints

### Autenticación
```
POST /api/auth/register/ - Registro de usuarios
POST /api/auth/login/ - Inicio de sesión
POST /api/auth/token/refresh/ - Renovar token
```

### Solicitudes
```
GET /api/applications/ - Listar solicitudes
POST /api/applications/ - Crear solicitud
GET /api/applications/{id}/ - Ver solicitud
PUT /api/applications/{id}/ - Actualizar solicitud
DELETE /api/applications/{id}/ - Eliminar solicitud
```

### Documentos
```
POST /api/applications/{id}/documents/upload/ - Subir documento
```

## 🎨 Interfaz de Usuario

### Características del Frontend
- **Responsive**: Adaptable a todos los dispositivos
- **Moderno**: Diseño con gradientes y efectos visuales
- **Intuitivo**: Navegación clara y accesible
- **Notificaciones**: Sistema de alertas en tiempo real
- **Loading States**: Indicadores de carga
- **Validaciones**: Validación en tiempo real de formularios

### Páginas Principales
1. **Login** (`login.html`): Autenticación de usuarios
2. **Dashboard** (`dashboard.html`): Panel principal
3. **Solicitudes** (`solicitudes.html`): Gestión de solicitudes
4. **Nueva Solicitud** (`nueva_solicitud.html`): Crear solicitudes
5. **Evaluación** (`evaluacion.html`): Panel de evaluadores
6. **Administración** (`admin.html`): Panel de administradores

## 🔒 Seguridad

### Autenticación y Autorización
- **JWT**: Tokens seguros con expiración
- **Roles**: Sistema de permisos granular
- **Validación**: Validación de datos en frontend y backend
- **CORS**: Configuración de Cross-Origin Resource Sharing

### Base de Datos
- **PostgreSQL**: Base de datos robusta y segura
- **Encriptación**: Contraseñas hasheadas
- **Backup**: Volúmenes persistentes en Docker

## 📊 Flujo de Trabajo

### Para Clientes
1. Registro en el sistema
2. Inicio de sesión
3. Crear nueva solicitud de crédito
4. Subir documentos requeridos
5. Seguimiento del estado de la solicitud
6. Notificaciones de cambios de estado

### Para Evaluadores
1. Acceso al panel de evaluación
2. Revisión de solicitudes pendientes
3. Evaluación de documentos
4. Asignación de score crediticio
5. Aprobación/rechazo de solicitudes
6. Generación de reportes

### Para Administradores
1. Gestión completa del sistema
2. Supervisión de evaluadores
3. Configuración de parámetros
4. Generación de reportes avanzados
5. Gestión de usuarios y roles

## 🛠️ Desarrollo

### Estructura del Proyecto
```
CreditoSys-main/
├── backend/                 # Backend Django
│   ├── applications/        # App de solicitudes
│   ├── users/              # App de usuarios
│   ├── core/               # Configuración principal
│   ├── requirements.txt    # Dependencias Python
│   └── Dockerfile         # Configuración Docker
├── frontend/               # Frontend HTML/CSS/JS
│   ├── *.html             # Páginas del sistema
│   ├── styles.css         # Estilos CSS
│   └── script.js          # JavaScript principal
├── docker-compose.yml     # Configuración Docker Compose
└── README.md              # Documentación
```

### Tecnologías Utilizadas
- **Backend**: Django 5.2.3, Django REST Framework 3.16.0
- **Base de Datos**: PostgreSQL 17
- **Autenticación**: JWT (djangorestframework-simplejwt)
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Contenedores**: Docker, Docker Compose
- **Herramientas**: pgAdmin, Git

## 📈 Escalabilidad

### Características de Escalabilidad
- **Arquitectura Modular**: Separación clara de responsabilidades
- **API RESTful**: Interfaz estándar para integraciones
- **Contenedores**: Fácil despliegue y escalado
- **Base de Datos**: PostgreSQL para alta concurrencia
- **Caché**: Preparado para implementar Redis

### Posibles Mejoras
- Implementar Redis para caché
- Añadir sistema de notificaciones push
- Integrar con servicios de verificación de identidad
- Implementar análisis de riesgo con IA
- Añadir sistema de pagos integrado

## 🐛 Solución de Problemas

### Problemas Comunes
1. **Error de conexión a base de datos**: Verificar variables de entorno
2. **Puertos ocupados**: Cambiar puertos en docker-compose.yml
3. **Migraciones fallidas**: Ejecutar `python manage.py migrate --run-syncdb`
4. **Permisos de archivos**: Verificar permisos en volúmenes Docker

### Logs y Debugging
```bash
# Ver logs de todos los servicios
docker-compose logs

# Ver logs de un servicio específico
docker-compose logs backend

# Acceder al shell del backend
docker-compose exec backend python manage.py shell
```

## 📞 Soporte

Para soporte técnico o consultas sobre el sistema:
- Revisar la documentación de Django
- Consultar logs del sistema
- Verificar configuración de Docker
- Contactar al equipo de desarrollo

## 📄 Licencia

Este proyecto está bajo licencia MIT. Ver archivo LICENSE para más detalles.

---

**CreditoSys** - Sistema inteligente de gestión de créditos diseñado para facilitar tus solicitudes y optimizar tus oportunidades financieras.
