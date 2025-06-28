from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated # IsAdminUser no se usa directamente en este archivo, pero no hay problema si está
from django_filters.rest_framework import DjangoFilterBackend
from .models import Application, ApplicationDocument
from .serializers import ApplicationSerializer, ApplicationUpdateSerializer, ApplicationDocumentSerializer
from .permissions import IsClientOrAdminOrEvaluator, IsOwnerOrAdminOrEvaluator
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import Http404
from rest_framework.exceptions import PermissionDenied

class ApplicationListCreateView(generics.ListCreateAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsClientOrAdminOrEvaluator] # Permisos personalizados
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'application_date', 'client__username', 'client__email'] # Campos para filtrar
    search_fields = ['purpose', 'client__username', 'client__email'] # Campos para búsqueda
    ordering_fields = ['application_date', 'amount', 'status'] # Campos para ordenar

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == 'admin' or user.role == 'evaluador':
            # Admin/Evaluador/Staff pueden ver todas las solicitudes
            return Application.objects.all()
        # Clientes solo pueden ver sus propias solicitudes
        return Application.objects.filter(client=user)

    def perform_create(self, serializer):
        # Asignar el cliente automáticamente al usuario autenticado
        serializer.save(client=self.request.user, status='pendiente')

class ApplicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Application.objects.all()
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdminOrEvaluator] # Permisos personalizados

    def get_serializer_class(self):
        # Permitir que evaluadores/admins actualicen solo ciertos campos
        if self.request.method in ['PUT', 'PATCH'] and (self.request.user.role == 'admin' or self.request.user.role == 'evaluador'):
            return ApplicationUpdateSerializer
        return ApplicationSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(instance, data=request.data, partial=True) # Usar partial=True para PATCH

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Nota: No permitir DELETE por ahora para solicitudes de crédito, o con permisos muy restringidos.
    # Si quieres permitirlo:
    # def destroy(self, request, *args, **kwargs):
    #     instance = self.get_object()
    #     if request.user.role != 'admin': # Solo admins pueden eliminar
    #         return Response({"detail": "No tiene permiso para eliminar esta solicitud."}, status=status.HTTP_403_FORBIDDEN)
    #     self.perform_destroy(instance)
    #     return Response(status=status.HTTP_204_NO_CONTENT)


class ApplicationDocumentUploadView(generics.CreateAPIView):
    queryset = ApplicationDocument.objects.all()
    serializer_class = ApplicationDocumentSerializer
    parser_classes = (MultiPartParser, FormParser) # Para manejar subidas de archivos
    permission_classes = [IsAuthenticated, IsOwnerOrAdminOrEvaluator] # Solo el propietario o admin/evaluador

    def perform_create(self, serializer):
        # Asegurarse de que la solicitud exista y el usuario tenga permisos sobre ella
        application_id = self.kwargs.get('application_pk') # Obtener ID de la URL
        try:
            application = Application.objects.get(pk=application_id)
            # Verificar si el usuario es el propietario o admin/evaluador
            if self.request.user != application.client and not (self.request.user.role in ['admin', 'evaluador']):
                 raise PermissionDenied("No tiene permiso para añadir documentos a esta solicitud.")
            serializer.save(application=application)
        except Application.DoesNotExist:
            raise Http404("La solicitud no existe.")
        except PermissionDenied as e:
            raise e # Re-lanzar la excepción de permiso denegado