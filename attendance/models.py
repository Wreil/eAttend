from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal


class Attendance(models.Model):
    STATUS_PRESENT = 'present'
    STATUS_ABSENT = 'absent'
    STATUS_LATE = 'late'
    STATUS_HALF_DAY = 'half_day'
    STATUS_CHOICES = [
        (STATUS_PRESENT, 'Present'),
        (STATUS_ABSENT, 'Absent'),
        (STATUS_LATE, 'Late'),
        (STATUS_HALF_DAY, 'Half Day'),
    ]

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attendances',
        limit_choices_to={'role': 'employee'},
    )
    date = models.DateField(default=timezone.localdate)
    time_in = models.TimeField(null=True, blank=True)
    time_out = models.TimeField(null=True, blank=True)
    total_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PRESENT)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('employee', 'date')
        ordering = ['-date', '-time_in']
        verbose_name = 'Attendance'
        verbose_name_plural = 'Attendance Records'

    def __str__(self):
        return f"{self.employee.get_full_name() or self.employee.username} — {self.date}"

    def calculate_hours(self):
        self.overtime_hours = Decimal('0.00')

        if self.time_in and self.time_out:
            from datetime import datetime, date as dt_date, time
            dt_in = datetime.combine(dt_date.today(), self.time_in)
            dt_out = datetime.combine(dt_date.today(), self.time_out)
            if dt_out > dt_in:
                delta = dt_out - dt_in
                self.total_hours = Decimal(str(round(delta.total_seconds() / 3600, 2)))

                overtime_start = datetime.combine(dt_date.today(), time(16, 0))
                if dt_out > overtime_start:
                    overtime_delta = dt_out - overtime_start
                    self.overtime_hours = Decimal(str(round(overtime_delta.total_seconds() / 3600, 2)))
            else:
                self.total_hours = Decimal('0.00')

    def save(self, *args, **kwargs):
        self.calculate_hours()
        # Auto-set status based on time_in
        if self.time_in:
            from datetime import time
            late_threshold = time(7, 30)  # 7:30 AM
            if self.time_in >= late_threshold:
                self.status = self.STATUS_LATE
            else:
                self.status = self.STATUS_PRESENT
        super().save(*args, **kwargs)
