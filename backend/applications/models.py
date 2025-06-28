# CreditoSys/backend/applications/models.py
from django.db import models
from django.conf import settings # Para importar el AUTH_USER_MODEL
import os # Para la ruta de los archivos

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

    def __str__(self):
        return f"{self.document_type} para Solicitud #{self.application.id}"

    def filename(self):
        return os.path.basename(self.file.name) 