# CreditoSys/backend/applications/models.py
from django.db import models
from django.conf import settings # Para importar el AUTH_USER_MODEL
import os # Para la ruta de los archivos
from django.contrib.auth import get_user_model # Para el modelo User

User = get_user_model() # Obtener el modelo User

class Application(models.Model):
    # Relación con el usuario (cliente) que realiza la solicitud
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='applications')

    # Información básica de la solicitud
    amount = models.DecimalField(max_digits=10, decimal_places=2) # Monto solicitado
    term_months = models.IntegerField() # Plazo en meses
    purpose = models.CharField(max_length=255) # Propósito del crédito

    # Estado de la solicitud
    STATUS_CHOICES = (
        ('pendiente', 'Pendiente de Revisión'),
        ('en_revision', 'En Revisión'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
        ('desembolsada', 'Desembolsada'),
        ('cancelada', 'Cancelada por Cliente'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendiente')

    # Fechas
    application_date = models.DateTimeField(auto_now_add=True) # Fecha de creación
    last_updated = models.DateTimeField(auto_now=True) # Última actualización

    # Información de evaluación (se llenará por evaluadores/admin)
    credit_score = models.IntegerField(null=True, blank=True) # Score crediticio (0-1000)
    evaluator_comments = models.TextField(null=True, blank=True) # Comentarios del evaluador

    class Meta:
        ordering = ['-application_date'] # Ordenar por fecha descendente

    def __str__(self):
        return f"Solicitud #{self.id} de {self.client.username} - Estado: {self.status}"


def application_document_upload_to(instance, filename):
    # Genera la ruta para guardar los documentos: media/applications/<app_id>/<filename>
    return os.path.join('applications', str(instance.application.id), filename)

class ApplicationDocument(models.Model):
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=100) # Ej: "DNI", "Recibo de Servicios", "Estados de Cuenta"
    file = models.FileField(upload_to=application_document_upload_to) # Campo para el archivo
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    # Estado del documento
    STATUS_CHOICES = (
        ('pendiente', 'Pendiente'),
        ('en_revision', 'En Revisión'),
        ('valido', 'Válido'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendiente')

    def __str__(self):
        return f"{self.document_type} para Solicitud #{self.application.id}"

    def filename(self):
        return os.path.basename(self.file.name) 

class PolicyConfig(models.Model):
    """Configuración de políticas crediticias"""
    # Umbrales de aprobación
    score_minimo_aprobacion = models.IntegerField(default=70, help_text="Score mínimo para aprobación automática")
    score_minimo_revision = models.IntegerField(default=50, help_text="Score mínimo para revisión manual")
    monto_maximo_aprobacion = models.DecimalField(max_digits=12, decimal_places=2, default=100000, help_text="Monto máximo para aprobación automática")
    
    # Ponderaciones del score
    peso_historial_crediticio = models.IntegerField(default=40, help_text="Peso del historial crediticio (%)")
    peso_ingresos_deuda = models.IntegerField(default=30, help_text="Peso de ingresos vs deuda (%)")
    peso_activos = models.IntegerField(default=20, help_text="Peso de activos (%)")
    peso_comportamiento = models.IntegerField(default=10, help_text="Peso de comportamiento (%)")
    
    # Documentos requeridos
    requiere_recibos_sueldo = models.BooleanField(default=True)
    requiere_historial_crediticio = models.BooleanField(default=True)
    requiere_declaracion_renta = models.BooleanField(default=False)
    requiere_estados_cuenta = models.BooleanField(default=False)
    requiere_escrituras_propiedad = models.BooleanField(default=False)
    
    # Configuración de validación
    tiempo_maximo_validacion = models.IntegerField(default=3, help_text="Tiempo máximo de validación en días")
    tamano_maximo_archivo = models.IntegerField(default=50, help_text="Tamaño máximo de archivo en MB")
    
    # Metadatos
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "Configuración de Política"
        verbose_name_plural = "Configuraciones de Políticas"
    
    def __str__(self):
        return f"Política {self.id} - {self.fecha_actualizacion.strftime('%d/%m/%Y')}"
    
    def get_config_dict(self):
        """Retorna la configuración como diccionario"""
        return {
            'umbrales': {
                'score_minimo_aprobacion': self.score_minimo_aprobacion,
                'score_minimo_revision': self.score_minimo_revision,
                'monto_maximo_aprobacion': float(self.monto_maximo_aprobacion)
            },
            'ponderaciones': {
                'historial_crediticio': self.peso_historial_crediticio,
                'ingresos_deuda': self.peso_ingresos_deuda,
                'activos': self.peso_activos,
                'comportamiento': self.peso_comportamiento
            },
            'documentos': {
                'requiere_recibos_sueldo': self.requiere_recibos_sueldo,
                'requiere_historial_crediticio': self.requiere_historial_crediticio,
                'requiere_declaracion_renta': self.requiere_declaracion_renta,
                'requiere_estados_cuenta': self.requiere_estados_cuenta,
                'requiere_escrituras_propiedad': self.requiere_escrituras_propiedad
            },
            'validacion': {
                'tiempo_maximo_validacion': self.tiempo_maximo_validacion,
                'tamano_maximo_archivo': self.tamano_maximo_archivo
            }
        }

# tu_app/models.py

from django.db import models

class SolicitudCredito(models.Model):
    # ... otros campos ...
    dni_documento = models.FileField(upload_to='documentos_dni/') # Se guardará en media/documentos_dni/
    ingresos_documento = models.FileField(upload_to='documentos_ingresos/') # Se guardará en media/documentos_ingresos/
    # ...