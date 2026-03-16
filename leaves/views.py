from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Q, Sum
from decimal import Decimal
from .models import LeaveRequest
from .serializers import LeaveRequestSerializer, LeaveReviewSerializer
from accounts.permissions import IsManagerOrAdmin, IsOwnerOrManager


class MyLeaveListView(generics.ListCreateAPIView):
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = LeaveRequest.objects.filter(employee=self.request.user)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.order_by('-created_at')


class MyLeaveDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrManager]

    def get_queryset(self):
        return LeaveRequest.objects.filter(employee=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != LeaveRequest.STATUS_PENDING:
            return Response(
                {'error': 'Only pending requests can be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.status = LeaveRequest.STATUS_CANCELLED
        instance.save()
        return Response({'message': 'Leave request cancelled.'}, status=status.HTTP_200_OK)


class AllLeaveListView(generics.ListAPIView):
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsManagerOrAdmin]

    def get_queryset(self):
        qs = LeaveRequest.objects.all().select_related('employee', 'reviewed_by')
        status_filter = self.request.query_params.get('status')
        employee_id = self.request.query_params.get('employee')
        leave_type = self.request.query_params.get('leave_type')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if leave_type:
            qs = qs.filter(leave_type=leave_type)
        return qs.order_by('-created_at')


class LeaveReviewView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def post(self, request, pk):
        try:
            leave = LeaveRequest.objects.get(pk=pk)
        except LeaveRequest.DoesNotExist:
            return Response({'error': 'Leave request not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = LeaveReviewSerializer(leave, data=request.data, context={'request': request})
        if serializer.is_valid():
            leave = serializer.save()
            return Response(LeaveRequestSerializer(leave).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LeaveSummaryView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        counts = LeaveRequest.objects.aggregate(
            total=Count('id'),
            pending=Count('id', filter=Q(status='pending')),
            approved=Count('id', filter=Q(status='approved')),
            rejected=Count('id', filter=Q(status='rejected')),
            cancelled=Count('id', filter=Q(status='cancelled')),
        )
        return Response(counts)


class AdminDashboardSummaryView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        from attendance.models import Attendance
        from django.contrib.auth import get_user_model
        from django.utils import timezone

        User = get_user_model()
        today = timezone.localdate()

        data = {
            'total_employees': User.objects.filter(role='employee', is_active=True).count(),
            'total_attendance': Attendance.objects.count(),
            'today_attendance': Attendance.objects.filter(date=today).count(),
            'total_overtime_hours': Attendance.objects.aggregate(total=Sum('overtime_hours'))['total'] or Decimal('0'),
            'pending_leaves': LeaveRequest.objects.filter(status='pending').count(),
            'approved_leaves': LeaveRequest.objects.filter(status='approved').count(),
            'rejected_leaves': LeaveRequest.objects.filter(status='rejected').count(),
        }
        return Response(data)
