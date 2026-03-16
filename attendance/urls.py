from django.urls import path
from . import views

urlpatterns = [
    path('time-in/', views.TimeInView.as_view(), name='time-in'),
    path('time-out/', views.TimeOutView.as_view(), name='time-out'),
    path('today/', views.TodayAttendanceView.as_view(), name='today-attendance'),
    path('my/', views.MyAttendanceListView.as_view(), name='my-attendance'),
    path('my/summary/', views.MyAttendanceSummaryView.as_view(), name='my-summary'),
    path('all/', views.AllAttendanceListView.as_view(), name='all-attendance'),
    path('<int:pk>/', views.AttendanceDetailView.as_view(), name='attendance-detail'),
]
