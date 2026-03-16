web: python manage.py migrate --run-syncdb && python manage.py collectstatic --no-input && gunicorn eattend.wsgi --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120
