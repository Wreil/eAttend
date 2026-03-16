from django.db import models
from django.conf import settings
from django.utils import timezone


class LeaveRequest(models.Model):
    TYPE_VACATION = 'vacation'
    TYPE_SICK = 'sick'
    TYPE_EMERGENCY = 'emergency'
    TYPE_MATERNITY = 'maternity'
    TYPE_PATERNITY = 'paternity'
    TYPE_BEREAVEMENT = 'bereavement'
    TYPE_UNPAID = 'unpaid'
    TYPE_OTHER = 'other'

    LEAVE_TYPE_CHOICES = [
        (TYPE_VACATION, 'Vacation Leave'),
        (TYPE_SICK, 'Sick Leave'),
        (TYPE_EMERGENCY, 'Emergency Leave'),
        (TYPE_MATERNITY, 'Maternity Leave'),
        (TYPE_PATERNITY, 'Paternity Leave'),
        (TYPE_BEREAVEMENT, 'Bereavement Leave'),
        (TYPE_UNPAID, 'Unpaid Leave'),
        (TYPE_OTHER, 'Other'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='leave_requests',
    )
    leave_type = models.CharField(max_length=30, choices=LEAVE_TYPE_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    total_days = models.PositiveIntegerField(default=1)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_leaves',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_comment = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Leave Request'
        verbose_name_plural = 'Leave Requests'

    def __str__(self):
        name = self.employee.get_full_name() or self.employee.username
        return f"{name} — {self.get_leave_type_display()} ({self.start_date} to {self.end_date})"

    def save(self, *args, **kwargs):
        if self.start_date and self.end_date:
            delta = (self.end_date - self.start_date).days + 1
            self.total_days = max(delta, 1)
        super().save(*args, **kwargs)
