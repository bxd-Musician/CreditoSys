# CreditoSys/backend/users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

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

    def __str__(self):
        return self.username