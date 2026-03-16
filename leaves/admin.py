from django.contrib import admin
from .models import LeaveRequest


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ['employee', 'leave_type', 'start_date', 'end_date', 'total_days', 'status', 'reviewed_by']
    list_filter = ['status', 'leave_type', 'start_date']
    search_fields = ['employee__username', 'employee__first_name', 'employee__last_name']
    date_hierarchy = 'start_date'
    ordering = ['-created_at']
    readonly_fields = ['total_days', 'reviewed_at', 'created_at', 'updated_at']
