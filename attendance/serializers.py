from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Attendance

User = get_user_model()


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_username = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    can_time_out = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = [
            'id', 'employee', 'employee_name', 'employee_username',
            'date', 'time_in', 'time_out', 'total_hours', 'overtime_hours',
            'status', 'status_display', 'notes',
            'can_time_out', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'employee', 'total_hours', 'overtime_hours', 'created_at', 'updated_at']

    def get_employee_name(self, obj):
        return obj.employee.get_full_name() or obj.employee.username

    def get_employee_username(self, obj):
        return obj.employee.username

    def get_can_time_out(self, obj):
        return obj.time_in is not None and obj.time_out is None


class TimeInSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ['notes']

    def validate(self, attrs):
        user = self.context['request'].user
        from django.utils import timezone
        today = timezone.localdate()
        if Attendance.objects.filter(employee=user, date=today).exists():
            raise serializers.ValidationError('You have already timed in today.')
        return attrs

    def create(self, validated_data):
        from django.utils import timezone
        user = self.context['request'].user
        now = timezone.localtime()
        return Attendance.objects.create(
            employee=user,
            date=now.date(),
            time_in=now.time(),
            **validated_data
        )


class TimeOutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ['notes']

    def validate(self, attrs):
        instance = self.instance
        if instance.time_out is not None:
            raise serializers.ValidationError('You have already timed out.')
        if instance.time_in is None:
            raise serializers.ValidationError('No time-in record found.')
        return attrs

    def update(self, instance, validated_data):
        from django.utils import timezone
        now = timezone.localtime()
        instance.time_out = now.time()
        if validated_data.get('notes'):
            instance.notes = validated_data['notes']
        instance.save()
        return instance


class AttendanceSummarySerializer(serializers.Serializer):
    total_records = serializers.IntegerField()
    present_count = serializers.IntegerField()
    late_count = serializers.IntegerField()
    absent_count = serializers.IntegerField()
    total_hours = serializers.DecimalField(max_digits=8, decimal_places=2)
    overtime_hours = serializers.DecimalField(max_digits=8, decimal_places=2)
    average_hours = serializers.DecimalField(max_digits=5, decimal_places=2)
