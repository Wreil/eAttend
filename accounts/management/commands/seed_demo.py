"""
Management command to seed demo data for the eAttend system.
Creates a manager account and several employee accounts with sample attendance
and leave records.

Usage:
    python manage.py seed_demo
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, timedelta, time
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Create demo users and sample data for eAttend.'

    def handle(self, *args, **options):
        self.stdout.write('Seeding demo data...')

        # Create manager
        manager, created = User.objects.get_or_create(
            username='manager',
            defaults={
                'first_name': 'Maria',
                'last_name': 'Santos',
                'email': 'manager@eattend.com',
                'role': 'manager',
                'department': 'Management',
                'is_staff': True,
                'date_hired': date(2020, 1, 15),
            }
        )
        if created:
            manager.set_password('manager123')
            manager.save()
            self.stdout.write(self.style.SUCCESS('  Created manager: manager / manager123'))
        else:
            self.stdout.write('  Manager already exists.')

        # Create employees
        employees_data = [
            ('jdelacruz', 'Juan', 'dela Cruz', 'IT', date(2022, 3, 1)),
            ('mreyes', 'Maria', 'Reyes', 'HR', date(2021, 7, 15)),
            ('pgarcia', 'Pedro', 'Garcia', 'Finance', date(2023, 1, 10)),
            ('acabrera', 'Ana', 'Cabrera', 'IT', date(2022, 9, 5)),
        ]

        employees = []
        for username, first, last, dept, hired in employees_data:
            emp, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'first_name': first,
                    'last_name': last,
                    'email': f'{username}@eattend.com',
                    'role': 'employee',
                    'department': dept,
                    'date_hired': hired,
                }
            )
            if created:
                emp.set_password('employee123')
                emp.save()
                self.stdout.write(self.style.SUCCESS(f'  Created employee: {username} / employee123'))
            else:
                self.stdout.write(f'  Employee {username} already exists.')
            employees.append(emp)

        # Create attendance records for the past 30 days
        from attendance.models import Attendance
        from leaves.models import LeaveRequest

        today = timezone.localdate()
        for emp in employees:
            for days_ago in range(1, 31):
                att_date = today - timedelta(days=days_ago)
                # Skip weekends
                if att_date.weekday() >= 5:
                    continue
                if Attendance.objects.filter(employee=emp, date=att_date).exists():
                    continue

                # Randomly generate time-in/out
                late = random.random() < 0.15  # 15% chance late
                absent = random.random() < 0.05  # 5% chance absent

                if absent:
                    continue

                hour_in = random.choice([8, 8, 8, 9]) if late else random.choice([7, 8, 8])
                min_in = random.randint(0, 59) if late else random.randint(0, 30)
                hour_out = random.choice([17, 18, 17])
                min_out = random.randint(0, 59)

                att = Attendance(
                    employee=emp,
                    date=att_date,
                    time_in=time(hour_in, min_in),
                    time_out=time(hour_out, min_out),
                )
                att.save()

        self.stdout.write(self.style.SUCCESS('  Attendance records created.'))

        # Create leave requests
        leave_types = ['vacation', 'sick', 'emergency']
        statuses = ['pending', 'approved', 'rejected', 'pending', 'approved']

        for emp in employees:
            for i in range(2):
                start = today + timedelta(days=random.randint(3, 20))
                end = start + timedelta(days=random.randint(0, 2))
                leave_type = random.choice(leave_types)
                status = random.choice(statuses)

                if LeaveRequest.objects.filter(employee=emp, start_date=start).exists():
                    continue

                lr = LeaveRequest(
                    employee=emp,
                    leave_type=leave_type,
                    start_date=start,
                    end_date=end,
                    reason=f'Sample {leave_type} leave request for {emp.get_full_name()}.',
                    status=status,
                )
                if status in ['approved', 'rejected']:
                    lr.reviewed_by = manager
                    lr.reviewed_at = timezone.now()
                    lr.review_comment = 'Reviewed by management.' if status == 'approved' else 'Request denied due to staffing.'
                lr.save()

        self.stdout.write(self.style.SUCCESS('  Leave requests created.'))
        self.stdout.write(self.style.SUCCESS('\nDemo data seeded successfully!'))
        self.stdout.write('\nLogin credentials:')
        self.stdout.write('  Manager:   username=manager   password=manager123')
        self.stdout.write('  Employees: username=jdelacruz password=employee123')
        self.stdout.write('             username=mreyes    password=employee123')
        self.stdout.write('             username=pgarcia   password=employee123')
        self.stdout.write('             username=acabrera  password=employee123')
