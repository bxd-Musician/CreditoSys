# CreditoSys/backend/users/models.py
from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models

class CustomUserManager(UserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return super().create_superuser(username, email, password, **extra_fields)

class User(AbstractUser):
    # Define tus roles aquí
    ROLE_CHOICES = (
        ('cliente', 'Cliente'),
        ('evaluador', 'Evaluador'),
        ('admin', 'Administrador'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='cliente')

    # Añadir campos adicionales si los necesitas (DNI, teléfono, etc.)
    dni = models.CharField(max_length=10, unique=True, null=True, blank=True)
    phone_number = models.CharField(max_length=15, null=True, blank=True)

    objects = CustomUserManager()

    def save(self, *args, **kwargs):
        if self.is_superuser:
            self.role = 'admin'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username

class AdminLog(models.Model):
    EVENT_CHOICES = [
        ('usuario_creado', 'Usuario Creado'),
        ('politica_actualizada', 'Política Actualizada'),
        ('backup_completado', 'Backup Completado'),
    ]
    tipo = models.CharField(max_length=50, choices=EVENT_CHOICES)
    titulo = models.CharField(max_length=100)
    detalle = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)

    def hace(self):
        from django.utils.timesince import timesince
        return f"Hace {timesince(self.timestamp).split(',')[0]}"

    def as_dict(self):
        return {
            "tipo": self.tipo,
            "titulo": self.titulo,
            "detalle": self.detalle,
            "hace": self.hace()
        }

class AuditLog(models.Model):
    """Logs de auditoría del sistema"""
    TIPO_ACCION_CHOICES = [
        ('login', 'Inicio de Sesión'),
        ('logout', 'Cierre de Sesión'),
        ('solicitud_creada', 'Solicitud Creada'),
        ('solicitud_actualizada', 'Solicitud Actualizada'),
        ('solicitud_aprobada', 'Solicitud Aprobada'),
        ('solicitud_rechazada', 'Solicitud Rechazada'),
        ('documento_subido', 'Documento Subido'),
        ('politica_actualizada', 'Política Actualizada'),
        ('usuario_creado', 'Usuario Creado'),
        ('usuario_actualizado', 'Usuario Actualizado'),
        ('usuario_eliminado', 'Usuario Eliminado'),
        ('rol_cambiado', 'Rol Cambiado'),
        ('sistema_backup', 'Backup del Sistema'),
        ('sistema_restaurado', 'Sistema Restaurado'),
        ('configuracion_cambiada', 'Configuración Cambiada'),
        ('acceso_denegado', 'Acceso Denegado'),
    ]
    
    ESTADO_CHOICES = [
        ('exitoso', 'Exitoso'),
        ('fallido', 'Fallido'),
        ('pendiente', 'Pendiente'),
    ]
    
    # Información del evento
    timestamp = models.DateTimeField(auto_now_add=True)
    tipo_accion = models.CharField(max_length=50, choices=TIPO_ACCION_CHOICES)
    descripcion = models.TextField()
    
    # Usuario que realizó la acción
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='audit_logs')
    
    # Información del recurso
    recurso = models.CharField(max_length=255, blank=True, null=True)
    metodo_http = models.CharField(max_length=10, blank=True, null=True)
    
    # Información de red
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    
    # Estado del evento
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='exitoso')
    
    # Detalles adicionales
    detalles = models.JSONField(default=dict, blank=True)
    duracion_ms = models.IntegerField(blank=True, null=True)  # Duración en milisegundos
    
    # Metadatos
    session_id = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        verbose_name = "Log de Auditoría"
        verbose_name_plural = "Logs de Auditoría"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['tipo_accion']),
            models.Index(fields=['usuario']),
            models.Index(fields=['estado']),
        ]
    
    def __str__(self):
        return f"{self.timestamp.strftime('%d/%m/%Y %H:%M:%S')} - {self.usuario.username} - {self.get_tipo_accion_display()}"
    
    @classmethod
    def registrar_evento(cls, usuario, tipo_accion, descripcion, recurso=None, 
                        ip_address=None, estado='exitoso', detalles=None, 
                        metodo_http=None, user_agent=None, session_id=None):
        """Método de clase para registrar eventos de auditoría"""
        try:
            return cls.objects.create(
                usuario=usuario,
                tipo_accion=tipo_accion,
                descripcion=descripcion,
                recurso=recurso,
                ip_address=ip_address,
                estado=estado,
                detalles=detalles or {},
                metodo_http=metodo_http,
                user_agent=user_agent,
                session_id=session_id
            )
        except Exception as e:
            # Log del error para debugging
            print(f"Error registrando evento de auditoría: {e}")
            return None

class AlertasConfiguracion(models.Model):
    """Modelo para almacenar configuración de alertas del sistema"""
    alerta_morosidad = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=5.0,
        help_text="Porcentaje de morosidad para activar alerta"
    )
    alerta_rendimiento = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=85.0,
        help_text="Porcentaje mínimo de rendimiento"
    )
    alerta_cpu = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=80.0,
        help_text="Porcentaje máximo de uso de CPU"
    )
    email_alertas = models.EmailField(
        default="admin@empresa.com",
        help_text="Email para recibir notificaciones de alertas"
    )
    alertas_activas = models.BooleanField(
        default=True,
        help_text="Si las alertas están habilitadas"
    )
    ultima_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Configuración de Alertas"
        verbose_name_plural = "Configuraciones de Alertas"
    
    def __str__(self):
        return f"Configuración de Alertas - {self.ultima_actualizacion}"
    
    @classmethod
    def obtener_configuracion(cls):
        """Obtener la configuración actual de alertas"""
        config, created = cls.objects.get_or_create(
            id=1,
            defaults={
                'alerta_morosidad': 5.0,
                'alerta_rendimiento': 85.0,
                'alerta_cpu': 80.0,
                'email_alertas': 'admin@empresa.com',
                'alertas_activas': True
            }
        )
        return config

class AlertaEnviada(models.Model):
    """Modelo para registrar alertas enviadas por email"""
    TIPOS_ALERTA = [
        ('morosidad', 'Alta Morosidad'),
        ('rendimiento', 'Bajo Rendimiento'),
        ('cpu', 'Uso de CPU Alto'),
        ('sistema', 'Problema del Sistema'),
    ]
    
    SEVERIDAD_CHOICES = [
        ('baja', 'Baja'),
        ('media', 'Media'),
        ('alta', 'Alta'),
        ('critica', 'Crítica'),
    ]
    
    tipo_alerta = models.CharField(max_length=20, choices=TIPOS_ALERTA)
    severidad = models.CharField(max_length=10, choices=SEVERIDAD_CHOICES, default='media')
    mensaje = models.TextField()
    valor_actual = models.DecimalField(max_digits=10, decimal_places=2)
    umbral = models.DecimalField(max_digits=10, decimal_places=2)
    email_destinatario = models.EmailField()
    enviado_exitosamente = models.BooleanField(default=False)
    fecha_envio = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Alerta Enviada"
        verbose_name_plural = "Alertas Enviadas"
        ordering = ['-fecha_envio']
    
    def __str__(self):
        return f"{self.get_tipo_alerta_display()} - {self.fecha_envio}"