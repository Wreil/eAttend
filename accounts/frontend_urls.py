from django.urls import path
from django.shortcuts import render


def landing(request):
    return render(request, 'landing.html')


def index(request):
    return render(request, 'index.html')


def login_page(request):
    return render(request, 'login.html')


urlpatterns = [
    path('', landing, name='landing'),
    path('login/', login_page, name='login'),
    path('dashboard/', index, name='dashboard'),
    path('attendance/', index, name='attendance'),
    path('leaves/', index, name='leaves'),
    path('employees/', index, name='employees'),
    path('profile/', index, name='profile'),
]
