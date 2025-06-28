# CreditoSys/backend/applications/permissions.py
from rest_framework import permissions

class IsClientOrAdminOrEvaluator(permissions.BasePermission):
    """
    Permite el acceso si el usuario es un cliente, un administrador o un evaluador.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        return user.role in ['cliente', 'admin', 'evaluador'] or user.is_staff


class IsOwnerOrAdminOrEvaluator(permissions.BasePermission):
    """
    Permite el acceso a un objeto solo si es el propietario, o si el usuario es un administrador o evaluador.
    """
    def has_object_permission(self, request, view, obj):
        # Permiso de lectura siempre si el usuario está autenticado
        if request.method in permissions.SAFE_METHODS:
            return True

        user = request.user
        # Si es el propietario de la solicitud
        if obj.client == user:
            return True
        # Si es un administrador o evaluador, tiene acceso completo
        if user.role in ['admin', 'evaluador'] or user.is_staff:
            return True
        return False