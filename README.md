# eAttend — Employee Attendance & Leave Management System

A full-stack web application built with **Django**, **Django REST Framework**, and a responsive **HTML/CSS/JavaScript** frontend.

---

## Features

### Employee
- **Time In / Time Out** — Record attendance with automatic hour calculation
- **Attendance History** — View monthly attendance records with summary stats
- **Leave Requests** — Submit, view, and cancel leave applications
- **Profile Management** — Update personal info and change password

### Manager / Admin
- **Dashboard Overview** — Real-time stats: employees, attendance, leave metrics
- **Monitor All Attendance** — Filter by month/year across all employees
- **Manage Leave Requests** — Approve or reject with comments
- **Employee Management** — Create and view employee accounts

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Backend     | Python 3.10+, Django 4.2, DRF 3.14  |
| Auth        | JWT (djangorestframework-simplejwt) |
| Database    | SQLite (default) / PostgreSQL       |
| Frontend    | HTML5, CSS3, Vanilla JavaScript     |
| Icons       | Font Awesome 6.4                    |

---

## Quick Start

### Option 1: Automated Setup (Windows)

```bat
setup.bat
```

### Option 2: Manual Setup

```bash
# 1. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run migrations
python manage.py makemigrations accounts attendance leaves
python manage.py migrate

# 4. Seed demo data
python manage.py seed_demo

# 5. Start the server
python manage.py runserver
```

Open **http://127.0.0.1:8000** in your browser.

---

## Demo Credentials

| Role     | Username    | Password      |
|----------|-------------|---------------|
| Manager  | `manager`   | `manager123`  |
| Employee | `jdelacruz` | `employee123` |
| Employee | `mreyes`    | `employee123` |
| Employee | `pgarcia`   | `employee123` |
| Employee | `acabrera`  | `employee123` |

---

## Project Structure

```
eAttend/
├── eattend/               # Django project config
│   ├── settings.py
│   └── urls.py
├── accounts/              # User auth & management app
│   ├── models.py          # Custom User model
│   ├── serializers.py
│   ├── views.py
│   ├── permissions.py
│   └── management/commands/seed_demo.py
├── attendance/            # Attendance tracking app
│   ├── models.py
│   ├── serializers.py
│   └── views.py
├── leaves/                # Leave management app
│   ├── models.py
│   ├── serializers.py
│   └── views.py
├── templates/
│   ├── index.html         # Main SPA shell
│   └── login.html         # Login page
├── static/
│   ├── css/main.css       # Responsive stylesheet
│   └── js/
│       ├── api.js         # API client layer
│       ├── auth.js        # Login page logic
│       └── app.js         # Main SPA application
├── manage.py
├── requirements.txt
└── setup.bat              # Windows quick-setup script
```

---

## REST API Endpoints

### Authentication
| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| POST   | `/api/auth/login/`          | Login (returns JWT)      |
| POST   | `/api/auth/logout/`         | Logout (blacklist token) |
| POST   | `/api/auth/token/refresh/`  | Refresh access token     |
| GET    | `/api/auth/me/`             | Get current user         |
| PATCH  | `/api/auth/me/`             | Update profile           |
| POST   | `/api/auth/change-password/`| Change password          |
| GET    | `/api/auth/users/`          | List employees (manager) |
| POST   | `/api/auth/users/`          | Create employee (manager)|

### Attendance
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | `/api/attendance/time-in/`      | Record time-in           |
| POST   | `/api/attendance/time-out/`     | Record time-out          |
| GET    | `/api/attendance/today/`        | Today's attendance       |
| GET    | `/api/attendance/my/`           | My attendance history    |
| GET    | `/api/attendance/my/summary/`   | My attendance summary    |
| GET    | `/api/attendance/all/`          | All records (manager)    |

### Leaves
| Method | Endpoint                    | Description               |
|--------|-----------------------------|---------------------------|
| GET    | `/api/leaves/my/`           | My leave requests         |
| POST   | `/api/leaves/my/`           | Submit leave request      |
| DELETE | `/api/leaves/my/{id}/`      | Cancel leave request      |
| GET    | `/api/leaves/all/`          | All leave requests (mgr)  |
| POST   | `/api/leaves/{id}/review/`  | Approve/reject (manager)  |
| GET    | `/api/leaves/dashboard/`    | Dashboard stats (manager) |

---

## Security

- JWT authentication required on all API endpoints
- Role-based access control (Employee vs Manager/Admin)
- All user inputs validated server-side via DRF serializers
- HTML is escaped in all frontend-rendered content
- Passwords validated via Django's built-in validators
