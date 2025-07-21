@echo off
echo Activando entorno virtual del backend...
cd backend
call backend_env\Scripts\activate.bat
echo Entorno virtual activado.
echo Para ejecutar el servidor Django, usa: python manage.py runserver
pause 