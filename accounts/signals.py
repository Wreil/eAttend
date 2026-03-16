import os
from django.apps import apps
from django.contrib.auth import get_user_model
from django.db.models.signals import post_migrate
from django.dispatch import receiver


@receiver(post_migrate)
def ensure_deploy_admin(sender, **kwargs):
    # Run only for this project's apps to avoid duplicate work.
    if sender.name not in {'accounts', 'attendance', 'leaves'}:
        return

    User = get_user_model()

    username = os.getenv('ADMIN_USERNAME', 'manager')
    password = os.getenv('ADMIN_PASSWORD', 'manager123')
    email = os.getenv('ADMIN_EMAIL', 'manager@eattend.com')

    user, _ = User.objects.get_or_create(
        username=username,
        defaults={
            'email': email,
            'first_name': 'Maria',
            'last_name': 'Santos',
            'role': 'manager',
            'is_staff': True,
            'is_superuser': True,
            'is_active': True,
        },
    )

    # Keep a known credential on deploy so login is always possible.
    user.email = email
    user.first_name = user.first_name or 'Maria'
    user.last_name = user.last_name or 'Santos'
    user.role = 'manager'
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.set_password(password)
    user.save()
