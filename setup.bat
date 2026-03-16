@echo off
echo ============================================
echo  eAttend - Setup Script
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

echo [1/5] Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment.
    pause
    exit /b 1
)

echo [2/5] Activating virtual environment...
call venv\Scripts\activate.bat

echo [3/5] Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)

echo [4/5] Running database migrations...
python manage.py makemigrations accounts attendance leaves
python manage.py migrate
if errorlevel 1 (
    echo ERROR: Migration failed.
    pause
    exit /b 1
)

echo [5/5] Seeding demo data...
python manage.py seed_demo

echo.
echo ============================================
echo  Setup complete!
echo ============================================
echo.
echo To start the server, run:
echo   venv\Scripts\activate
echo   python manage.py runserver
echo.
echo Then open: http://127.0.0.1:8000
echo.
echo Demo Credentials:
echo   Manager:  manager / manager123
echo   Employee: jdelacruz / employee123
echo ============================================
pause
