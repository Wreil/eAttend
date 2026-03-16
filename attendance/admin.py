from django.contrib import admin
from .models import Attendance


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['employee', 'date', 'time_in', 'time_out', 'total_hours', 'status']
    list_filter = ['status', 'date', 'employee__department']
    search_fields = ['employee__username', 'employee__first_name', 'employee__last_name']
    date_hierarchy = 'date'
    ordering = ['-date']
