from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'department', 'is_active']
    list_filter = ['role', 'department', 'is_active', 'is_staff']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Profile', {'fields': ('role', 'department', 'phone', 'date_hired', 'profile_picture')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Profile', {'fields': ('role', 'department', 'phone', 'date_hired')}),
    )
