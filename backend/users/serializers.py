# CreditoSys/backend/users/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password # Para validar la fortaleza de la contraseña
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from users.models import AdminLog
from users.models import AuditLog # Added for AuditLogSerializer

User = get_user_model()

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True) # Para confirmar la contraseña

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2', 'dni', 'phone_number', 'role') # Incluye los nuevos campos
        extra_kwargs = {'role': {'required': False}} # El rol puede ser opcional al registrar, por defecto 'cliente'

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2') # Eliminar la confirmación de contraseña antes de crear el usuario
        # Asignar rol por defecto si no se proporciona (ej. 'cliente' para registros públicos)
        role = validated_data.pop('role', 'cliente')
        user = User.objects.create_user(role=role, **validated_data)
        # Registrar evento en AdminLog
        AdminLog.objects.create(
            tipo='usuario_creado',
            titulo='Usuario Creado',
            detalle=f"{user.username} - {user.role}"
        )
        return user

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Añadir información personalizada al token
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = user.role
        # Puedes añadir más campos aquí, pero no datos sensibles

        return token

class AuditLogSerializer(serializers.ModelSerializer):
    usuario_email = serializers.CharField(source='usuario.email', read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.username', read_only=True)
    tipo_accion_display = serializers.CharField(source='get_tipo_accion_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    timestamp_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'timestamp', 'timestamp_formatted', 'tipo_accion', 'tipo_accion_display',
            'descripcion', 'usuario_email', 'usuario_nombre', 'recurso', 'ip_address',
            'estado', 'estado_display', 'detalles', 'duracion_ms', 'metodo_http'
        ]
        read_only_fields = ['timestamp', 'usuario', 'ip_address', 'user_agent']
    
    def get_timestamp_formatted(self, obj):
        """Formatear timestamp para mostrar en español"""
        return obj.timestamp.strftime('%d/%m/%Y %H:%M:%S')