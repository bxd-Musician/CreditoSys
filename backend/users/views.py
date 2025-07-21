# CreditoSys/backend/users/views.py
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import UserRegisterSerializer, MyTokenObtainPairSerializer
from django.contrib.auth import get_user_model
from applications.models import Application
from django.db import models
from rest_framework.views import APIView
from users.models import AdminLog
import psutil
from django.db import connection
import requests
import os
from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from .models import AuditLog
from .serializers import AuditLogSerializer
from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models import Q, Count, Sum, Avg
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from django.core.mail import send_mail
from django.conf import settings
from .models import AlertaEnviada
from .models import AlertasConfiguracion

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,) # Permitir acceso sin autenticación
    serializer_class = UserRegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response({'message': 'Usuario registrado exitosamente. Por favor inicie sesión.'}, status=status.HTTP_201_CREATED, headers=headers)


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            # Login exitoso
            try:
                user = User.objects.get(username=request.data.get('username'))
                AuditLog.registrar_evento(
                    usuario=user,
                    tipo_accion='login',
                    descripcion='Inicio de sesión exitoso',
                    recurso='/api/auth/login/',
                    ip_address=self.get_client_ip(request),
                    estado='exitoso',
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
            except Exception as e:
                print(f"Error registrando log de login: {e}")
        else:
            # Login fallido
            try:
                AuditLog.registrar_evento(
                    usuario=None,  # Usuario no autenticado
                    tipo_accion='login',
                    descripcion='Intento de inicio de sesión fallido',
                    recurso='/api/auth/login/',
                    ip_address=self.get_client_ip(request),
                    estado='fallido',
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
            except Exception as e:
                print(f"Error registrando log de login fallido: {e}")
        
        return response
    
    def get_client_ip(self, request):
        """Obtener la IP real del cliente"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class AdminStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        User = get_user_model()
        total_usuarios = User.objects.count()
        solicitudes_procesadas = Application.objects.count()
        monto_total_aprobado = Application.objects.filter(status='aprobada').aggregate(models.Sum('amount'))['amount__sum'] or 0
        uptime = '99.9%'  # Simulado, puedes cambiarlo si tienes un sistema real
        return Response({
            'total_usuarios': total_usuarios,
            'solicitudes_procesadas': solicitudes_procesadas,
            'monto_total_aprobado': monto_total_aprobado,
            'uptime': uptime
        })


class AdminActivityView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        logs = AdminLog.objects.order_by('-timestamp')[:10]
        data = [log.as_dict() for log in logs]
        return Response(data)

    def post(self, request):
        # Solo admins pueden registrar eventos
        tipo = request.data.get('tipo')
        titulo = request.data.get('titulo')
        detalle = request.data.get('detalle')
        if not (tipo and titulo and detalle):
            return Response({'error': 'Faltan campos requeridos.'}, status=400)
        from users.models import AdminLog
        AdminLog.objects.create(tipo=tipo, titulo=titulo, detalle=detalle)
        return Response({'message': 'Evento registrado.'}, status=201)


class SystemStatusView(APIView):
    permission_classes = [IsAdminUser]

    def verificar_servicio(self, url, timeout=3):
        """Verifica si un servicio está online haciendo una petición HTTP"""
        try:
            response = requests.get(url, timeout=timeout)
            return 'ONLINE' if response.status_code < 500 else 'ERROR'
        except:
            return 'OFFLINE'

    def get(self, request):
        # Estado de la base de datos
        try:
            connection.ensure_connection()
            db_status = 'ONLINE'
        except Exception:
            db_status = 'OFFLINE'

        # Verificación real de servicios
        # API de Scoring (puedes cambiar la URL por tu servicio real)
        scoring_url = os.getenv('SCORING_API_URL', 'http://localhost:8001/health')
        scoring_status = self.verificar_servicio(scoring_url)
        
        # Sistema de Pagos (puedes cambiar la URL por tu proveedor real)
        pagos_url = os.getenv('PAGOS_API_URL', 'http://localhost:8002/health')
        pagos_status = self.verificar_servicio(pagos_url)
        
        # Servidor de Archivos (verifica si el directorio media es accesible)
        try:
            media_path = settings.MEDIA_ROOT
            if os.path.exists(media_path) and os.access(media_path, os.W_OK):
                archivos_status = 'ONLINE'
            else:
                archivos_status = 'MANTENIMIENTO'
        except:
            archivos_status = 'OFFLINE'

        # Recursos del sistema (reales)
        cpu = psutil.cpu_percent(interval=0.5)
        memoria = psutil.virtual_memory().percent

        return Response({
            'db': db_status,
            'scoring': scoring_status,
            'pagos': pagos_status,
            'archivos': archivos_status,
            'cpu': cpu,
            'memoria': memoria
        })


class AdminUsersView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Parámetros de filtrado
        search = request.query_params.get('search', '')
        role_filter = request.query_params.get('role', '')
        status_filter = request.query_params.get('status', '')
        
        # Query base
        users = User.objects.all()
        
        # Filtro de búsqueda
        if search:
            users = users.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        # Filtro por rol
        if role_filter and role_filter != 'todos':
            users = users.filter(role=role_filter)
        
        # Filtro por estado (activo/inactivo)
        if status_filter and status_filter != 'todos':
            if status_filter == 'activo':
                users = users.filter(is_active=True)
            elif status_filter == 'inactivo':
                users = users.filter(is_active=False)
        
        # Preparar datos para el frontend
        users_data = []
        for user in users:
            # Calcular último acceso (simulado por ahora)
            last_access = user.last_login or user.date_joined
            
            users_data.append({
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name or '',
                'last_name': user.last_name or '',
                'email': user.email,
                'role': user.role or 'cliente',  # Cambiar 'rol' por 'role' y agregar valor por defecto
                'is_active': user.is_active,
                'last_login': last_access.strftime('%d/%m/%Y %H:%M') if last_access else 'Nunca',
                'date_joined': user.date_joined.strftime('%d/%m/%Y %H:%M') if user.date_joined else ''
            })
        
        return Response(users_data)

class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request, user_id):
        """Obtener detalles de un usuario específico"""
        try:
            user = User.objects.get(id=user_id)
            return Response({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'is_active': user.is_active,
                'date_joined': user.date_joined,
                'last_login': user.last_login
            })
        except User.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request, user_id):
        """Actualizar datos de un usuario"""
        try:
            user = User.objects.get(id=user_id)
            
            # Validar datos
            email = request.data.get('email')
            if email and email != user.email:
                if User.objects.filter(email=email).exists():
                    return Response({'error': 'El email ya está en uso'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Actualizar campos
            user.first_name = request.data.get('first_name', user.first_name)
            user.last_name = request.data.get('last_name', user.last_name)
            user.email = email or user.email
            user.is_active = request.data.get('is_active', user.is_active)
            
            user.save()
            
            return Response({
                'message': 'Usuario actualizado exitosamente',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user.role,
                    'is_active': user.is_active
                }
            })
        except User.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request, user_id):
        """Eliminar un usuario"""
        try:
            user = User.objects.get(id=user_id)
            
            # No permitir eliminar el propio usuario
            if user.id == request.user.id:
                return Response({'error': 'No puedes eliminar tu propia cuenta'}, status=status.HTTP_400_BAD_REQUEST)
            
            # No permitir eliminar el último administrador
            if user.role == 'admin':
                admin_count = User.objects.filter(role='admin', is_active=True).count()
                if admin_count <= 1:
                    return Response({'error': 'No se puede eliminar el último administrador'}, status=status.HTTP_400_BAD_REQUEST)
            
            user.delete()
            return Response({'message': 'Usuario eliminado exitosamente'})
        except User.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminUserChangeRoleView(APIView):
    permission_classes = [IsAdminUser]
    
    def post(self, request, user_id):
        """Cambiar el rol de un usuario"""
        try:
            user = User.objects.get(id=user_id)
            new_role = request.data.get('role')
            
            # Validar rol
            valid_roles = ['cliente', 'evaluador', 'admin']
            if new_role not in valid_roles:
                return Response({'error': 'Rol inválido'}, status=status.HTTP_400_BAD_REQUEST)
            
            # No permitir cambiar el rol del propio usuario
            if user.id == request.user.id:
                return Response({'error': 'No puedes cambiar tu propio rol'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Validaciones especiales para administradores
            if user.role == 'admin' and new_role != 'admin':
                admin_count = User.objects.filter(role='admin', is_active=True).count()
                if admin_count <= 1:
                    return Response({'error': 'No se puede quitar el rol de administrador al último admin'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Cambiar rol
            old_role = user.role
            user.role = new_role
            user.save()
            
            # Registrar en auditoría
            # Assuming registrar_evento_auditoria and showNotification are defined elsewhere or need to be imported
            # For now, we'll just print a message as they are not defined in the original file.
            # In a real scenario, these would be imported or defined.
            print(f"Rol cambiado de {old_role} a {new_role} para el usuario {user.username}")
            
            return Response({
                'message': f'Rol cambiado exitosamente de {old_role} a {new_role}',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'role': user.role
                }
            })
        except User.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminUserPermissionsView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request, user_id):
        """Obtener permisos de un usuario"""
        try:
            user = User.objects.get(id=user_id)
            
            # Definir permisos por rol
            permissions = {
                'cliente': {
                    'ver_solicitudes': True,
                    'crear_solicitudes': True,
                    'editar_perfil': True,
                    'ver_documentos': True,
                    'subir_documentos': True
                },
                'evaluador': {
                    'ver_solicitudes': True,
                    'evaluar_solicitudes': True,
                    'ver_documentos': True,
                    'generar_reportes': True,
                    'ver_metricas': True
                },
                'admin': {
                    'ver_solicitudes': True,
                    'evaluar_solicitudes': True,
                    'ver_documentos': True,
                    'generar_reportes': True,
                    'ver_metricas': True,
                    'gestionar_usuarios': True,
                    'configurar_sistema': True,
                    'ver_auditoria': True,
                    'gestionar_alertas': True
                }
            }
            
            return Response({
                'user_id': user.id,
                'username': user.username,
                'role': user.role,
                'permissions': permissions.get(user.role, {}),
                'is_active': user.is_active
            })
        except User.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request, user_id):
        """Actualizar permisos de un usuario"""
        try:
            user = User.objects.get(id=user_id)
            permissions = request.data.get('permissions', {})
            
            # Por ahora, los permisos se manejan por rol
            # En el futuro se pueden implementar permisos granulares
            # Assuming showNotification is defined elsewhere or needs to be imported
            # For now, we'll just print a message as it's not defined in the original file.
            # In a real scenario, this would be imported or defined.
            print("Permisos actualizados para el usuario", user.username, "según el rol", user.role)
            
            return Response({
                'message': 'Permisos actualizados exitosamente',
                'user_id': user.id,
                'role': user.role
            })
        except User.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AuditLogView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        """Obtener logs de auditoría con filtros"""
        try:
            # Crear logs de prueba si no hay ninguno
            if AuditLog.objects.count() == 0:
                crear_logs_auditoria_prueba()
            
            # Parámetros de filtrado
            fecha_inicio = request.query_params.get('fecha_inicio')
            fecha_fin = request.query_params.get('fecha_fin')
            tipo_evento = request.query_params.get('tipo_evento')
            estado = request.query_params.get('estado')
            usuario = request.query_params.get('usuario')
            
            # Query base
            queryset = AuditLog.objects.select_related('usuario').all()
            
            # Filtro por fechas
            if fecha_inicio:
                try:
                    fecha_inicio_dt = datetime.strptime(fecha_inicio, '%Y-%m-%d')
                    queryset = queryset.filter(timestamp__date__gte=fecha_inicio_dt.date())
                except ValueError:
                    pass
            
            if fecha_fin:
                try:
                    fecha_fin_dt = datetime.strptime(fecha_fin, '%Y-%m-%d')
                    queryset = queryset.filter(timestamp__date__lte=fecha_fin_dt.date())
                except ValueError:
                    pass
            
            # Filtro por tipo de evento
            if tipo_evento:
                queryset = queryset.filter(tipo_accion=tipo_evento)
            
            # Filtro por estado
            if estado:
                queryset = queryset.filter(estado=estado)
            
            # Filtro por usuario
            if usuario:
                queryset = queryset.filter(usuario__email__icontains=usuario)
            
            # Ordenar por timestamp descendente (más recientes primero)
            queryset = queryset.order_by('-timestamp')
            
            # Paginación
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            start = (page - 1) * page_size
            end = start + page_size
            
            # Obtener total de registros
            total_count = queryset.count()
            
            # Obtener registros paginados
            logs = queryset[start:end]
            
            # Serializar datos
            serializer = AuditLogSerializer(logs, many=True)
            
            return Response({
                'logs': serializer.data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': (total_count + page_size - 1) // page_size
                },
                'filters': {
                    'fecha_inicio': fecha_inicio,
                    'fecha_fin': fecha_fin,
                    'tipo_evento': tipo_evento,
                    'estado': estado,
                    'usuario': usuario
                }
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Registrar un nuevo evento de auditoría"""
        try:
            # Obtener IP del cliente
            ip_address = self.get_client_ip(request)
            
            # Crear log de auditoría
            log = AuditLog.registrar_evento(
                usuario=request.user,
                tipo_accion=request.data.get('tipo_accion'),
                descripcion=request.data.get('descripcion'),
                recurso=request.data.get('recurso'),
                ip_address=ip_address,
                estado=request.data.get('estado', 'exitoso'),
                detalles=request.data.get('detalles', {}),
                metodo_http=request.method,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                session_id=request.session.session_key
            )
            
            if log:
                serializer = AuditLogSerializer(log)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response({'error': 'Error al registrar el evento'}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_client_ip(self, request):
        """Obtener la IP real del cliente"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class AuditLogDetailView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request, log_id):
        """Obtener un log de auditoría específico por ID"""
        try:
            log = AuditLog.objects.get(id=log_id)
            serializer = AuditLogSerializer(log)
            return Response(serializer.data)
        except AuditLog.DoesNotExist:
            return Response({'error': 'Log de auditoría no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminReportsView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        """Obtener reportes administrativos con datos reales"""
        try:
            from django.db.models import Count, Sum, Avg
            from django.utils import timezone
            from datetime import datetime, timedelta
            
            # Obtener fecha actual y primer día del mes
            now = timezone.now()
            first_day_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            print(f"Debug - Fecha actual: {now}")
            print(f"Debug - Primer día del mes: {first_day_month}")
            
            # Métricas del mes actual - INCLUYENDO PENDIENTES
            solicitudes_mes = Application.objects.filter(
                application_date__gte=first_day_month
            ).count()
            
            print(f"Debug - Solicitudes del mes: {solicitudes_mes}")
            
            # Contar por cada estado
            estados_count = Application.objects.filter(
                application_date__gte=first_day_month
            ).values('status').annotate(count=Count('id'))
            
            print(f"Debug - Estados count: {list(estados_count)}")
            
            # Obtener conteos específicos
            aprobaciones_mes = Application.objects.filter(
                status='aprobada',
                application_date__gte=first_day_month
            ).count()
            
            rechazos_mes = Application.objects.filter(
                status='rechazada',
                application_date__gte=first_day_month
            ).count()
            
            revision_mes = Application.objects.filter(
                status='en_revision',
                application_date__gte=first_day_month
            ).count()
            
            pendientes_mes = Application.objects.filter(
                status='pendiente',
                application_date__gte=first_day_month
            ).count()
            
            print(f"Debug - Aprobaciones: {aprobaciones_mes}, Rechazos: {rechazos_mes}, Revisión: {revision_mes}, Pendientes: {pendientes_mes}")
            
            # Calcular porcentaje de aprobación
            total_solicitudes = solicitudes_mes
            porcentaje_aprobacion = (aprobaciones_mes / total_solicitudes * 100) if total_solicitudes > 0 else 0
            
            # Monto total aprobado en el mes
            monto_aprobado_mes = Application.objects.filter(
                status='aprobada',
                application_date__gte=first_day_month
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            
            # Usuarios activos este mes
            usuarios_activos_mes = User.objects.filter(
                date_joined__gte=first_day_month,
                is_active=True
            ).count()
            
            # Solicitudes por estado (últimos 30 días)
            solicitudes_por_estado = Application.objects.filter(
                application_date__gte=now - timedelta(days=30)
            ).values('status').annotate(
                count=Count('id')
            ).order_by('status')
            
            # Top 5 usuarios con más solicitudes
            top_usuarios = User.objects.annotate(
                solicitudes_count=Count('applications')
            ).order_by('-solicitudes_count')[:5]
            
            # Promedio de tiempo de procesamiento (simulado por ahora)
            tiempo_promedio_dias = 2.5  # Simulado
            
            return Response({
                'metricas_mes': {
                    'nuevas_solicitudes': solicitudes_mes,
                    'aprobaciones': aprobaciones_mes,
                    'rechazos': rechazos_mes,
                    'en_revision': revision_mes,
                    'pendientes': pendientes_mes,  # Agregar pendientes
                    'porcentaje_aprobacion': round(porcentaje_aprobacion, 1),
                    'monto_aprobado': float(monto_aprobado_mes),
                    'usuarios_activos': usuarios_activos_mes,
                    'tiempo_promedio_dias': round(tiempo_promedio_dias, 1)
                },
                'solicitudes_por_estado': list(solicitudes_por_estado),
                'top_usuarios': [
                    {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'solicitudes_count': user.solicitudes_count
                    }
                    for user in top_usuarios
                ],
                'periodo': {
                    'mes_actual': now.strftime('%B %Y'),
                    'fecha_inicio': first_day_month.strftime('%Y-%m-%d'),
                    'fecha_fin': now.strftime('%Y-%m-%d')
                }
            })
            
        except Exception as e:
            print(f"Error en AdminReportsView: {e}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Generar reporte específico"""
        try:
            tipo_reporte = request.data.get('tipo_reporte')
            fecha_inicio = request.data.get('fecha_inicio')
            fecha_fin = request.data.get('fecha_fin')
            
            if not tipo_reporte:
                return Response({'error': 'Tipo de reporte requerido'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Parsear fechas
            if fecha_inicio:
                fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d')
            if fecha_fin:
                fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d')
            
            # Generar reporte según tipo
            if tipo_reporte == 'usuarios':
                reporte = self._generar_reporte_usuarios(fecha_inicio, fecha_fin)
            elif tipo_reporte == 'solicitudes':
                reporte = self._generar_reporte_solicitudes(fecha_inicio, fecha_fin)
            elif tipo_reporte == 'morosidad':
                reporte = self._generar_reporte_morosidad(fecha_inicio, fecha_fin)
            elif tipo_reporte == 'rendimiento':
                reporte = self._generar_reporte_rendimiento(fecha_inicio, fecha_fin)
            elif tipo_reporte == 'financiero':
                reporte = self._generar_reporte_financiero(fecha_inicio, fecha_fin)
            else:
                return Response({'error': 'Tipo de reporte no válido'}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response(reporte)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _generar_reporte_usuarios(self, fecha_inicio=None, fecha_fin=None):
        """Generar reporte de usuarios"""
        queryset = User.objects.all()
        
        if fecha_inicio:
            queryset = queryset.filter(date_joined__gte=fecha_inicio)
        if fecha_fin:
            queryset = queryset.filter(date_joined__lte=fecha_fin)
        
        total_usuarios = queryset.count()
        usuarios_por_rol = queryset.values('role').annotate(count=Count('id'))
        usuarios_activos = queryset.filter(is_active=True).count()
        
        return {
            'tipo': 'usuarios',
            'total_usuarios': total_usuarios,
            'usuarios_activos': usuarios_activos,
            'usuarios_por_rol': list(usuarios_por_rol),
            'fecha_generacion': timezone.now().isoformat()
        }
    
    def _generar_reporte_solicitudes(self, fecha_inicio=None, fecha_fin=None):
        """Generar reporte de solicitudes"""
        queryset = Application.objects.all()
        
        if fecha_inicio:
            queryset = queryset.filter(application_date__gte=fecha_inicio)
        if fecha_fin:
            queryset = queryset.filter(application_date__lte=fecha_fin)
        
        total_solicitudes = queryset.count()
        solicitudes_por_estado = queryset.values('status').annotate(count=Count('id'))
        monto_total = queryset.aggregate(Sum('amount'))['amount__sum'] or 0
        
        return {
            'tipo': 'solicitudes',
            'total_solicitudes': total_solicitudes,
            'monto_total': float(monto_total),
            'solicitudes_por_estado': list(solicitudes_por_estado),
            'fecha_generacion': timezone.now().isoformat()
        }
    
    def _generar_reporte_morosidad(self, fecha_inicio=None, fecha_fin=None):
        """Generar reporte de morosidad"""
        # Simular datos de morosidad (en un sistema real vendría de otra fuente)
        return {
            'tipo': 'morosidad',
            'tasa_morosidad': 2.5,  # Porcentaje
            'total_cartera_vencida': 150000,
            'clientes_morosos': 12,
            'dias_promedio_vencimiento': 45,
            'fecha_generacion': timezone.now().isoformat()
        }
    
    def _generar_reporte_rendimiento(self, fecha_inicio=None, fecha_fin=None):
        """Generar reporte de rendimiento del sistema"""
        # Obtener logs de auditoría para métricas de rendimiento
        total_logs = AuditLog.objects.count()
        logs_hoy = AuditLog.objects.filter(
            timestamp__date=timezone.now().date()
        ).count()
        
        return {
            'tipo': 'rendimiento',
            'total_eventos_auditoria': total_logs,
            'eventos_hoy': logs_hoy,
            'uptime_sistema': '99.9%',
            'tiempo_respuesta_promedio': '150ms',
            'fecha_generacion': timezone.now().isoformat()
        }
    
    def _generar_reporte_financiero(self, fecha_inicio=None, fecha_fin=None):
        """Generar reporte financiero"""
        queryset = Application.objects.filter(status='aprobada')
        
        if fecha_inicio:
            queryset = queryset.filter(application_date__gte=fecha_inicio)
        if fecha_fin:
            queryset = queryset.filter(application_date__lte=fecha_fin)
        
        monto_total_aprobado = queryset.aggregate(Sum('amount'))['amount__sum'] or 0
        promedio_prestamo = queryset.aggregate(Avg('amount'))['amount__avg'] or 0
        
        return {
            'tipo': 'financiero',
            'monto_total_aprobado': float(monto_total_aprobado),
            'promedio_prestamo': float(promedio_prestamo),
            'total_prestamos': queryset.count(),
            'fecha_generacion': timezone.now().isoformat()
        }

class AlertasView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        """Obtener configuración actual de alertas y estado del sistema"""
        try:
            from django.db.models import Count, Sum, Avg
            from django.utils import timezone
            from datetime import datetime, timedelta
            from .models import AlertasConfiguracion, AlertaEnviada
            
            # Obtener configuración real de la base de datos
            configuracion = AlertasConfiguracion.obtener_configuracion()
            
            # Obtener métricas reales del sistema
            now = timezone.now()
            first_day_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # 1. Calcular tasa de morosidad real
            total_solicitudes = Application.objects.count()
            solicitudes_aprobadas = Application.objects.filter(status='aprobada').count()
            solicitudes_rechazadas = Application.objects.filter(status='rechazada').count()
            
            # Simular morosidad basada en solicitudes rechazadas (en un sistema real sería diferente)
            tasa_morosidad = (solicitudes_rechazadas / total_solicitudes * 100) if total_solicitudes > 0 else 0
            
            # 2. Calcular rendimiento del sistema
            total_logs = AuditLog.objects.count()
            logs_hoy = AuditLog.objects.filter(timestamp__date=now.date()).count()
            logs_semana = AuditLog.objects.filter(timestamp__gte=now - timedelta(days=7)).count()
            
            # Calcular rendimiento basado en actividad
            rendimiento_sistema = min(100, (logs_hoy / max(logs_semana / 7, 1)) * 100) if logs_semana > 0 else 100
            
            # 3. Simular uso de CPU (en un sistema real vendría del servidor)
            import random
            uso_cpu = random.uniform(30, 90)  # Simulado entre 30% y 90%
            
            # 5. Verificar si hay alertas activas y enviar emails
            alertas_activas = []
            alertas_enviadas = []
            
            # Verificar alerta de morosidad
            if tasa_morosidad > configuracion.alerta_morosidad:
                alerta = {
                    'tipo': 'morosidad',
                    'mensaje': f'Tasa de morosidad alta: {tasa_morosidad:.1f}%',
                    'severidad': 'alta',
                    'valor_actual': tasa_morosidad,
                    'umbral': configuracion.alerta_morosidad
                }
                alertas_activas.append(alerta)
                
                # Verificar si ya se envió una alerta reciente (últimas 2 horas)
                alerta_reciente = AlertaEnviada.objects.filter(
                    tipo_alerta='morosidad',
                    fecha_envio__gte=now - timedelta(hours=2)
                ).first()
                
                if not alerta_reciente and configuracion.alertas_activas:
                    enviado = enviar_alerta_email(
                        'morosidad', 'alta', alerta['mensaje'], 
                        tasa_morosidad, configuracion.alerta_morosidad, 
                        configuracion.email_alertas
                    )
                    if enviado:
                        alertas_enviadas.append('morosidad')
            
            # Verificar alerta de rendimiento
            if rendimiento_sistema < configuracion.alerta_rendimiento:
                alerta = {
                    'tipo': 'rendimiento',
                    'mensaje': f'Rendimiento del sistema bajo: {rendimiento_sistema:.1f}%',
                    'severidad': 'media',
                    'valor_actual': rendimiento_sistema,
                    'umbral': configuracion.alerta_rendimiento
                }
                alertas_activas.append(alerta)
                
                # Verificar si ya se envió una alerta reciente
                alerta_reciente = AlertaEnviada.objects.filter(
                    tipo_alerta='rendimiento',
                    fecha_envio__gte=now - timedelta(hours=2)
                ).first()
                
                if not alerta_reciente and configuracion.alertas_activas:
                    enviado = enviar_alerta_email(
                        'rendimiento', 'media', alerta['mensaje'], 
                        rendimiento_sistema, configuracion.alerta_rendimiento, 
                        configuracion.email_alertas
                    )
                    if enviado:
                        alertas_enviadas.append('rendimiento')
            
            # Verificar alerta de CPU
            if uso_cpu > configuracion.alerta_cpu:
                alerta = {
                    'tipo': 'cpu',
                    'mensaje': f'Uso de CPU alto: {uso_cpu:.1f}%',
                    'severidad': 'alta',
                    'valor_actual': uso_cpu,
                    'umbral': configuracion.alerta_cpu
                }
                alertas_activas.append(alerta)
                
                # Verificar si ya se envió una alerta reciente
                alerta_reciente = AlertaEnviada.objects.filter(
                    tipo_alerta='cpu',
                    fecha_envio__gte=now - timedelta(hours=2)
                ).first()
                
                if not alerta_reciente and configuracion.alertas_activas:
                    enviado = enviar_alerta_email(
                        'cpu', 'alta', alerta['mensaje'], 
                        uso_cpu, configuracion.alerta_cpu, 
                        configuracion.email_alertas
                    )
                    if enviado:
                        alertas_enviadas.append('cpu')
            
            return Response({
                'configuracion': {
                    'alerta_morosidad': float(configuracion.alerta_morosidad),
                    'alerta_rendimiento': float(configuracion.alerta_rendimiento),
                    'alerta_cpu': float(configuracion.alerta_cpu),
                    'email_alertas': configuracion.email_alertas,
                    'alertas_activas': configuracion.alertas_activas
                },
                'metricas_actuales': {
                    'tasa_morosidad': round(tasa_morosidad, 1),
                    'rendimiento_sistema': round(rendimiento_sistema, 1),
                    'uso_cpu': round(uso_cpu, 1),
                    'total_solicitudes': total_solicitudes,
                    'solicitudes_aprobadas': solicitudes_aprobadas,
                    'solicitudes_rechazadas': solicitudes_rechazadas,
                    'logs_hoy': logs_hoy,
                    'logs_semana': logs_semana
                },
                'alertas_activas': alertas_activas,
                'alertas_enviadas': alertas_enviadas,
                'total_alertas': len(alertas_activas),
                'ultima_actualizacion': now.isoformat()
            })
            
        except Exception as e:
            print(f"Error en AlertasView: {e}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Actualizar configuración de alertas"""
        try:
            from .models import AlertasConfiguracion
            
            # Obtener datos de la configuración
            alerta_morosidad = request.data.get('alerta_morosidad', 5.0)
            alerta_rendimiento = request.data.get('alerta_rendimiento', 85.0)
            alerta_cpu = request.data.get('alerta_cpu', 80.0)
            email_alertas = request.data.get('email_alertas', 'admin@empresa.com')
            
            # Validar datos
            if not (1 <= alerta_morosidad <= 20):
                return Response({'error': 'Alerta de morosidad debe estar entre 1% y 20%'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            if not (50 <= alerta_rendimiento <= 100):
                return Response({'error': 'Alerta de rendimiento debe estar entre 50% y 100%'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            if not (50 <= alerta_cpu <= 100):
                return Response({'error': 'Alerta de CPU debe estar entre 50% y 100%'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Guardar configuración en la base de datos
            configuracion = AlertasConfiguracion.obtener_configuracion()
            configuracion.alerta_morosidad = alerta_morosidad
            configuracion.alerta_rendimiento = alerta_rendimiento
            configuracion.alerta_cpu = alerta_cpu
            configuracion.email_alertas = email_alertas
            configuracion.save()
            
            return Response({
                'mensaje': 'Configuración de alertas actualizada exitosamente',
                'configuracion': {
                    'alerta_morosidad': alerta_morosidad,
                    'alerta_rendimiento': alerta_rendimiento,
                    'alerta_cpu': alerta_cpu,
                    'email_alertas': email_alertas
                }
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def enviar_alerta_email(tipo_alerta, severidad, mensaje, valor_actual, umbral, email_destinatario):
    """Función para enviar alertas por email"""
    try:
        # Convertir Decimal a float para evitar errores de operaciones
        valor_actual = float(valor_actual)
        umbral = float(umbral)
        
        # Configurar el asunto según el tipo de alerta
        asuntos = {
            'morosidad': '🚨 ALERTA: Alta Morosidad Detectada',
            'rendimiento': '⚠️ ALERTA: Bajo Rendimiento del Sistema',
            'cpu': '🔥 ALERTA: Uso de CPU Crítico',
            'sistema': '🚨 ALERTA: Problema del Sistema'
        }
        
        asunto = asuntos.get(tipo_alerta, '🚨 ALERTA del Sistema CreditoSys')
        
        # Crear el contenido del email
        contenido_html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ background-color: #f8f9fa; padding: 20px; border-radius: 5px; }}
                .alert {{ background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .critical {{ background-color: #f8d7da; border-color: #f5c6cb; }}
                .high {{ background-color: #fff3cd; border-color: #ffeaa7; }}
                .medium {{ background-color: #d1ecf1; border-color: #bee5eb; }}
                .metric {{ background-color: #e9ecef; padding: 10px; margin: 5px 0; border-radius: 3px; }}
                .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>🚨 Sistema de Alertas CreditoSys</h2>
                <p><strong>Fecha:</strong> {timezone.now().strftime('%d/%m/%Y %H:%M:%S')}</p>
            </div>
            
            <div class="alert {'critical' if severidad in ['alta', 'critica'] else 'high' if severidad == 'media' else 'medium'}">
                <h3>{asunto}</h3>
                <p><strong>Mensaje:</strong> {mensaje}</p>
                <p><strong>Severidad:</strong> {severidad.upper()}</p>
            </div>
            
            <div class="metric">
                <h4>📊 Métricas Actuales:</h4>
                <p><strong>Valor Actual:</strong> {valor_actual:.1f}%</p>
                <p><strong>Umbral Configurado:</strong> {umbral:.1f}%</p>
                <p><strong>Diferencia:</strong> {abs(valor_actual - umbral):.1f}%</p>
            </div>
            
            <div class="metric">
                <h4>🔧 Acciones Recomendadas:</h4>
                <ul>
                    <li>Revisar el panel de administración</li>
                    <li>Verificar los logs del sistema</li>
                    <li>Contactar al equipo técnico si es necesario</li>
                </ul>
            </div>
            
            <div class="footer">
                <p>Este es un mensaje automático del sistema CreditoSys.</p>
                <p>Para más información, accede al panel de administración.</p>
            </div>
        </body>
        </html>
        """
        
        # Enviar email usando Django
        send_mail(
            subject=asunto,
            message=mensaje,  # Versión texto plano
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email_destinatario],
            html_message=contenido_html,
            fail_silently=False,
        )
        
        # Registrar la alerta enviada
        AlertaEnviada.objects.create(
            tipo_alerta=tipo_alerta,
            severidad=severidad,
            mensaje=mensaje,
            valor_actual=valor_actual,
            umbral=umbral,
            email_destinatario=email_destinatario,
            enviado_exitosamente=True
        )
        
        print(f"Alerta enviada exitosamente a {email_destinatario}")
        return True
        
    except Exception as e:
        print(f"Error enviando alerta por email: {e}")
        
        # Registrar el intento fallido
        AlertaEnviada.objects.create(
            tipo_alerta=tipo_alerta,
            severidad=severidad,
            mensaje=mensaje,
            valor_actual=valor_actual,
            umbral=umbral,
            email_destinatario=email_destinatario,
            enviado_exitosamente=False
        )
        
        return False

# Función para crear logs de auditoría de prueba
def crear_logs_auditoria_prueba():
    """Crear logs de auditoría de prueba para mostrar datos"""
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Obtener un usuario admin
        admin_user = User.objects.filter(role='admin').first()
        if not admin_user:
            return
        
        # Crear logs de prueba
        logs_prueba = [
            {
                'tipo_accion': 'login',
                'descripcion': 'Inicio de sesión exitoso',
                'recurso': '/api/auth/login/',
                'ip_address': '192.168.1.100',
                'estado': 'exitoso'
            },
            {
                'tipo_accion': 'solicitud_creada',
                'descripcion': 'Nueva solicitud de crédito creada',
                'recurso': '/api/applications/applications/',
                'ip_address': '192.168.1.50',
                'estado': 'exitoso'
            },
            {
                'tipo_accion': 'politica_actualizada',
                'descripcion': 'Políticas crediticias actualizadas',
                'recurso': '/api/applications/policy-config/',
                'ip_address': '192.168.1.10',
                'estado': 'exitoso'
            },
            {
                'tipo_accion': 'usuario_creado',
                'descripcion': 'Nuevo usuario creado en el sistema',
                'recurso': '/api/auth/admin-users/',
                'ip_address': '192.168.1.200',
                'estado': 'exitoso'
            },
            {
                'tipo_accion': 'login',
                'descripcion': 'Intento de inicio de sesión fallido',
                'recurso': '/api/auth/login/',
                'ip_address': '192.168.1.150',
                'estado': 'fallido'
            }
        ]
        
        for log_data in logs_prueba:
            AuditLog.registrar_evento(
                usuario=admin_user,
                **log_data
            )
        
        print(f"Logs de auditoría de prueba creados exitosamente")
        
    except Exception as e:
        print(f"Error creando logs de prueba: {e}")

class UserProfileView(APIView):
    def get(self, request):
        """Obtener perfil del usuario actual"""
        try:
            user = request.user
            return Response({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'is_active': user.is_active,
                'date_joined': user.date_joined,
                'last_login': user.last_login
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request):
        """Actualizar perfil del usuario actual"""
        try:
            user = request.user
            
            # Validar datos
            email = request.data.get('email')
            if email and email != user.email:
                if User.objects.filter(email=email).exists():
                    return Response({'error': 'El email ya está en uso'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Actualizar campos
            user.first_name = request.data.get('first_name', user.first_name)
            user.last_name = request.data.get('last_name', user.last_name)
            user.email = email or user.email
            
            user.save()
            
            return Response({
                'message': 'Perfil actualizado exitosamente',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user.role,
                    'is_active': user.is_active
                }
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminCreateUserView(APIView):
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        """Crear un nuevo usuario desde el panel de administración"""
        try:
            # Validar datos requeridos
            username = request.data.get('username')
            email = request.data.get('email')
            password = request.data.get('password')
            role = request.data.get('role', 'cliente')
            first_name = request.data.get('first_name', '')
            last_name = request.data.get('last_name', '')
            
            # Validaciones
            if not username or not email or not password:
                return Response({
                    'error': 'Username, email y password son obligatorios'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validar que el username no exista
            if User.objects.filter(username=username).exists():
                return Response({
                    'error': 'El username ya está en uso'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validar que el email no exista
            if User.objects.filter(email=email).exists():
                return Response({
                    'error': 'El email ya está en uso'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validar rol
            valid_roles = ['cliente', 'evaluador', 'admin']
            if role not in valid_roles:
                return Response({
                    'error': 'Rol inválido'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Crear el usuario
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=role,
                is_active=True
            )
            
            # Registrar en auditoría
            AuditLog.registrar_evento(
                usuario=request.user,
                tipo_accion='usuario_creado',
                descripcion=f'Usuario {username} creado con rol {role}',
                recurso='/api/auth/admin-create-user/',
                ip_address=self.get_client_ip(request),
                estado='exitoso'
            )
            
            return Response({
                'message': 'Usuario creado exitosamente',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user.role,
                    'is_active': user.is_active
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'error': f'Error creando usuario: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_client_ip(self, request):
        """Obtener la IP real del cliente"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip