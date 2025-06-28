# CreditoSys/backend/applications/serializers.py
from rest_framework import serializers
from .models import Application, ApplicationDocument
from django.contrib.auth import get_user_model

User = get_user_model()

class ApplicationDocumentSerializer(serializers.ModelSerializer):
    # La URL completa del archivo será generada por DRF
    file = serializers.FileField(use_url=True)

    class Meta:
        model = ApplicationDocument
        fields = ['id', 'document_type', 'file', 'uploaded_at']
        read_only_fields = ['uploaded_at']

class ApplicationSerializer(serializers.ModelSerializer):
    # Nested serializer para mostrar los documentos asociados a la solicitud
    documents = ApplicationDocumentSerializer(many=True, read_only=True)
    # Para mostrar el username del cliente en lugar de solo el ID
    client_username = serializers.CharField(source='client.username', read_only=True)
    client_email = serializers.CharField(source='client.email', read_only=True)

    class Meta:
        model = Application
        fields = [
            'id', 'client', 'client_username', 'client_email', 'amount', 'term_months', 'purpose',
            'status', 'application_date', 'last_updated', 'credit_score',
            'evaluator_comments', 'documents'
        ]
        read_only_fields = ['client', 'status', 'application_date', 'last_updated', 'credit_score', 'evaluator_comments', 'documents']

    def create(self, validated_data):
        # El cliente se asignará automáticamente desde el usuario autenticado en la vista
        return Application.objects.create(**validated_data)

class ApplicationUpdateSerializer(serializers.ModelSerializer):
    # Serializer para permitir a evaluadores/admins actualizar ciertos campos
    class Meta:
        model = Application
        fields = ['status', 'credit_score', 'evaluator_comments']