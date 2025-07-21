# CreditoSys/backend/backend/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings # Importar settings
from django.conf.urls.static import static # Importar static
from django.http import HttpResponse

urlpatterns = [
    path('', lambda request: HttpResponse("¡CreditoSys API está funcionando!".encode("utf-8"))),
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/applications/', include('applications.urls')), # ¡Añadir esta línea!
]

# Solo para servir archivos media en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)