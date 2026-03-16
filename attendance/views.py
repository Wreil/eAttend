from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Sum, Avg, Count, Q
from decimal import Decimal
from .models import Attendance
from .serializers import (
    AttendanceSerializer, TimeInSerializer,
    TimeOutSerializer, AttendanceSummarySerializer
)
from accounts.permissions import IsManagerOrAdmin, IsOwnerOrManager

User = get_user_model()


class TimeInView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TimeInSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            attendance = serializer.save()
            return Response(
                AttendanceSerializer(attendance).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TimeOutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        today = timezone.localdate()
        try:
            attendance = Attendance.objects.get(employee=request.user, date=today)
        except Attendance.DoesNotExist:
            return Response(
                {'error': 'No time-in record found for today.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = TimeOutSerializer(attendance, data=request.data, context={'request': request})
        if serializer.is_valid():
            attendance = serializer.save()
            return Response(AttendanceSerializer(attendance).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TodayAttendanceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        try:
            attendance = Attendance.objects.get(employee=request.user, date=today)
            return Response(AttendanceSerializer(attendance).data)
        except Attendance.DoesNotExist:
            return Response(None, status=status.HTTP_200_OK)


class MyAttendanceListView(generics.ListAPIView):
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Attendance.objects.filter(employee=self.request.user)
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        if month and year:
            qs = qs.filter(date__month=month, date__year=year)
        elif year:
            qs = qs.filter(date__year=year)
        return qs.order_by('-date')


class MyAttendanceSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Attendance.objects.filter(employee=request.user)
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        if month and year:
            qs = qs.filter(date__month=month, date__year=year)
        counts = qs.aggregate(
            total=Count('id'),
            present=Count('id', filter=Q(status='present')),
            late=Count('id', filter=Q(status='late')),
            absent=Count('id', filter=Q(status='absent')),
            hours=Sum('total_hours'),
            overtime=Sum('overtime_hours'),
        )
        total = counts['total'] or 0
        total_hours = counts['hours'] or Decimal('0')
        overtime_hours = counts['overtime'] or Decimal('0')
        avg_hours = (total_hours / total).quantize(Decimal('0.01')) if total > 0 else Decimal('0')
        data = {
            'total_records': total,
            'present_count': counts['present'] or 0,
            'late_count': counts['late'] or 0,
            'absent_count': counts['absent'] or 0,
            'total_hours': total_hours,
            'overtime_hours': overtime_hours,
            'average_hours': avg_hours,
        }
        serializer = AttendanceSummarySerializer(data)
        return Response(serializer.data)


class AllAttendanceListView(generics.ListAPIView):
    serializer_class = AttendanceSerializer
    permission_classes = [IsManagerOrAdmin]

    def get_queryset(self):
        qs = Attendance.objects.all().select_related('employee')
        employee_id = self.request.query_params.get('employee')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        date = self.request.query_params.get('date')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if date:
            qs = qs.filter(date=date)
        elif month and year:
            qs = qs.filter(date__month=month, date__year=year)
        elif year:
            qs = qs.filter(date__year=year)
        return qs.order_by('-date', 'employee__last_name')


class AttendanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AttendanceSerializer
    permission_classes = [IsManagerOrAdmin]
    queryset = Attendance.objects.all().select_related('employee')
