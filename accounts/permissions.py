from rest_framework.permissions import BasePermission


class IsManagerOrAdmin(BasePermission):
    """Allow access only to managers and admins."""

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_manager or request.user.is_staff)
        )


class IsOwnerOrManager(BasePermission):
    """Allow access to the owner of the object or managers/admins."""

    def has_object_permission(self, request, view, obj):
        if request.user.is_manager:
            return True
        # Support objects with 'employee' or 'user' foreign keys
        owner = getattr(obj, 'employee', None) or getattr(obj, 'user', None)
        return owner == request.user
