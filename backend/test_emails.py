#!/usr/bin/env python
"""
Script para probar el envío de emails de alertas
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from users.models import AlertasConfiguracion, AlertaEnviada
from users.views import enviar_alerta_email
from django.utils import timezone

def probar_envio_emails():
    """Función para probar el envío de emails de alertas"""
    print("🚀 Iniciando prueba de envío de emails...")
    
    # Obtener configuración
    config = AlertasConfiguracion.obtener_configuracion()
    print(f"📧 Email configurado: {config.email_alertas}")
    print(f"🔔 Alertas activas: {config.alertas_activas}")
    
    # Probar diferentes tipos de alertas
    alertas_prueba = [
        {
            'tipo': 'morosidad',
            'severidad': 'alta',
            'mensaje': 'Tasa de morosidad alta detectada: 8.5%',
            'valor_actual': 8.5,
            'umbral': 5.0
        },
        {
            'tipo': 'cpu',
            'severidad': 'alta',
            'mensaje': 'Uso de CPU crítico: 92.3%',
            'valor_actual': 92.3,
            'umbral': 80.0
        },
        {
            'tipo': 'rendimiento',
            'severidad': 'media',
            'mensaje': 'Rendimiento del sistema bajo: 65.2%',
            'valor_actual': 65.2,
            'umbral': 85.0
        }
    ]
    
    for i, alerta in enumerate(alertas_prueba, 1):
        print(f"\n📨 Enviando alerta {i}: {alerta['tipo']}")
        
        resultado = enviar_alerta_email(
            tipo_alerta=alerta['tipo'],
            severidad=alerta['severidad'],
            mensaje=alerta['mensaje'],
            valor_actual=alerta['valor_actual'],
            umbral=alerta['umbral'],
            email_destinatario=config.email_alertas
        )
        
        if resultado:
            print(f"✅ Email enviado exitosamente: {alerta['tipo']}")
        else:
            print(f"❌ Error enviando email: {alerta['tipo']}")
    
    # Mostrar historial de alertas enviadas
    print(f"\n📊 Historial de alertas enviadas:")
    alertas_enviadas = AlertaEnviada.objects.all().order_by('-fecha_envio')[:5]
    
    for alerta in alertas_enviadas:
        estado = "✅ Enviado" if alerta.enviado_exitosamente else "❌ Fallido"
        print(f"  - {alerta.get_tipo_alerta_display()}: {alerta.mensaje} ({estado})")
    
    print("\n🎉 Prueba completada. Revisa la consola para ver los emails.")

if __name__ == "__main__":
    probar_envio_emails() 