# CreditoSys/backend/users/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password # Para validar la fortaleza de la contraseña
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

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