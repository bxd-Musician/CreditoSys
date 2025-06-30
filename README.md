# 💳 CreditoSys

Sistema web para la gestión de créditos, desarrollado con Django (backend) y HTML/CSS/JS (frontend), y ejecutado con Docker.

## 🚀 Tecnologías Utilizadas

- 🐍 Django 5.2.3
- 🐘 PostgreSQL
- 🐳 Docker y Docker Compose
- 🌐 HTML5, CSS3, JavaScript (Frontend)
- 🔐 JWT para autenticación
- 📁 Estructura modular: backend, frontend, core, users

## 📦 Estructura del Proyecto

```bash
CreditoSys/
├── backend/
│   ├── core/ (configuración de Django)
│   └── users/ (módulo de usuarios)
├── frontend/
│   ├── index.html, dashboard.html, ...
│   └── styles.css, script.js
├── docker-compose.yml
├── Dockerfile
├── .env.backend
├── manage.py
├── requirements.txt
└── README.md
