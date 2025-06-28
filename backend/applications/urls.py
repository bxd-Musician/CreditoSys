# CreditoSys/backend/applications/urls.py
from django.urls import path
from .views import ApplicationListCreateView, ApplicationDetailView, ApplicationDocumentUploadView

urlpatterns = [
    path('', ApplicationListCreateView.as_view(), name='application-list-create'),
    path('<int:pk>/', ApplicationDetailView.as_view(), name='application-detail'),
    path('<int:application_pk>/documents/upload/', ApplicationDocumentUploadView.as_view(), name='application-document-upload'),
]