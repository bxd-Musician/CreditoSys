# CreditoSys/backend/applications/urls.py
from django.urls import path
from .views import ApplicationListCreateView, ApplicationDetailView, ApplicationDocumentUploadView, ApplicationDocumentListView, UserStatsView, PolicyConfigView

urlpatterns = [
    path('applications/', ApplicationListCreateView.as_view(), name='application-list-create'),
    path('applications/<int:pk>/', ApplicationDetailView.as_view(), name='application-detail'),
    path('applications/<int:application_pk>/documents/', ApplicationDocumentListView.as_view(), name='application-documents-list'),
    path('applications/<int:application_pk>/documents/upload/', ApplicationDocumentUploadView.as_view(), name='application-document-upload'),
    path('applications/user-stats/', UserStatsView.as_view(), name='user-stats'),
    path('policy-config/', PolicyConfigView.as_view(), name='policy-config'),
]