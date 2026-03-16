from rest_framework import serializers
from django.utils import timezone
from .models import LeaveRequest


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_username = serializers.SerializerMethodField()
    employee_department = serializers.SerializerMethodField()
    leave_type_display = serializers.CharField(source='get_leave_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LeaveRequest
        fields = [
            'id', 'employee', 'employee_name', 'employee_username', 'employee_department',
            'leave_type', 'leave_type_display',
            'start_date', 'end_date', 'total_days',
            'reason', 'status', 'status_display',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'review_comment',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'employee', 'total_days', 'status',
            'reviewed_by', 'reviewed_at', 'created_at', 'updated_at',
        ]

    def get_employee_name(self, obj):
        return obj.employee.get_full_name() or obj.employee.username

    def get_employee_username(self, obj):
        return obj.employee.username

    def get_employee_department(self, obj):
        return obj.employee.department

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username
        return None

    def validate(self, attrs):
        start = attrs.get('start_date')
        end = attrs.get('end_date')
        if start and end and end < start:
            raise serializers.ValidationError({'end_date': 'End date must be on or after start date.'})
        if start and start < timezone.localdate():
            raise serializers.ValidationError({'start_date': 'Start date cannot be in the past.'})
        return attrs

    def create(self, validated_data):
        validated_data['employee'] = self.context['request'].user
        return super().create(validated_data)


class LeaveReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveRequest
        fields = ['status', 'review_comment']

    def validate_status(self, value):
        if value not in [LeaveRequest.STATUS_APPROVED, LeaveRequest.STATUS_REJECTED]:
            raise serializers.ValidationError('Status must be approved or rejected.')
        return value

    def validate(self, attrs):
        if attrs.get('status') == LeaveRequest.STATUS_REJECTED and not attrs.get('review_comment'):
            raise serializers.ValidationError({'review_comment': 'A comment is required when rejecting a request.'})
        return attrs

    def update(self, instance, validated_data):
        if instance.status != LeaveRequest.STATUS_PENDING:
            raise serializers.ValidationError('Only pending requests can be reviewed.')
        from django.utils import timezone
        instance.status = validated_data['status']
        instance.review_comment = validated_data.get('review_comment', '')
        instance.reviewed_by = self.context['request'].user
        instance.reviewed_at = timezone.now()
        instance.save()
        return instance
