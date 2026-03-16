from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_EMPLOYEE = 'employee'
    ROLE_MANAGER = 'manager'
    ROLE_CHOICES = [
        (ROLE_EMPLOYEE, 'Employee'),
        (ROLE_MANAGER, 'Manager/Admin'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_EMPLOYEE)
    department = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    profile_picture = models.FileField(upload_to='profiles/', null=True, blank=True)
    date_hired = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    @property
    def is_manager(self):
        return self.role == self.ROLE_MANAGER or self.is_staff or self.is_superuser
