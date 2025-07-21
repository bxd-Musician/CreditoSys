from django.urls import path
from .views import (
    RegisterView, MyTokenObtainPairView, UserProfileView, AdminStatsView, AdminActivityView, 
    SystemStatusView, AdminUsersView, AdminUserDetailView, AdminUserChangeRoleView,
    AdminUserPermissionsView, AuditLogView, AuditLogDetailView, AdminReportsView, AlertasView,
    AdminCreateUserView
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # Autenticación
    path('login/', MyTokenObtainPairView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Perfil de usuario
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    
    # Panel de administración
    path('admin-users/', AdminUsersView.as_view(), name='admin_users'),
    path('admin-users/create/', AdminCreateUserView.as_view(), name='admin_create_user'),
    path('admin-users/<int:user_id>/', AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('admin-users/<int:user_id>/change-role/', AdminUserChangeRoleView.as_view(), name='admin_user_change_role'),
    path('admin-users/<int:user_id>/permissions/', AdminUserPermissionsView.as_view(), name='admin_user_permissions'),
    path('admin-stats/', AdminStatsView.as_view(), name='admin_stats'),
    path('admin-activity/', AdminActivityView.as_view(), name='admin_activity'),
    path('system-status/', SystemStatusView.as_view(), name='system_status'),
    path('admin-reports/', AdminReportsView.as_view(), name='admin_reports'),
    
    # Auditoría
    path('audit-logs/', AuditLogView.as_view(), name='audit_logs'),
    path('audit-logs/<int:log_id>/', AuditLogDetailView.as_view(), name='audit_log_detail'),
    
    # Alertas
    path('alertas/', AlertasView.as_view(), name='alertas'),
]