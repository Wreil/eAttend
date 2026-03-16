from django.urls import path
from . import views

urlpatterns = [
    path('my/', views.MyLeaveListView.as_view(), name='my-leaves'),
    path('my/<int:pk>/', views.MyLeaveDetailView.as_view(), name='my-leave-detail'),
    path('all/', views.AllLeaveListView.as_view(), name='all-leaves'),
    path('<int:pk>/review/', views.LeaveReviewView.as_view(), name='leave-review'),
    path('summary/', views.LeaveSummaryView.as_view(), name='leave-summary'),
    path('dashboard/', views.AdminDashboardSummaryView.as_view(), name='dashboard-summary'),
]
