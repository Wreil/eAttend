/**
 * eAttend Main Application
 * SPA routing, data loading, and event handling.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Redirect to login if not authenticated
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login/';
        return;
    }

    // ===== STATE =====
    let currentUser = Auth.getUser();
    let currentPage = 'dashboard';

    // ===== INIT =====
    await initApp();

    async function initApp() {
        try {
            // Fetch fresh user data
            currentUser = await API.getCurrentUser();
            Auth.setUser(currentUser);
        } catch {
            Auth.clearTokens();
            window.location.href = '/login/';
            return;
        }

        setupUI();
        setupNavigation();
        setupClock();
        setupEventListeners();
        navigateTo(getPageFromHash() || 'dashboard');
    }

    // ===== UI SETUP =====
    function setupUI() {
        const fullName = `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username;

        document.getElementById('sidebar-name').textContent = fullName;
        document.getElementById('topbar-name').textContent = fullName;

        const roleBadge = document.getElementById('sidebar-role');
        roleBadge.textContent = currentUser.is_manager ? 'Manager' : 'Employee';
        roleBadge.className = `user-role badge ${currentUser.is_manager ? 'badge-warning' : 'badge-info'}`;

        // Show/hide manager-only elements
        if (currentUser.is_manager) {
            document.querySelectorAll('.manager-only').forEach(el => el.classList.remove('d-none'));
            document.getElementById('manager-dashboard').classList.remove('d-none');
            document.getElementById('employee-dashboard').classList.add('d-none');
        } else {
            document.getElementById('employee-dashboard').classList.remove('d-none');
            document.getElementById('manager-dashboard').classList.add('d-none');
        }
    }

    function setupClock() {
        const el = document.getElementById('topbar-time');
        function tick() {
            const now = new Date();
            el.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        tick();
        setInterval(tick, 1000);
    }

    // ===== NAVIGATION =====
    function getPageFromHash() {
        const hash = window.location.hash.replace('#', '');
        return hash || 'dashboard';
    }

    function setupNavigation() {
        document.querySelectorAll('[data-page]').forEach(item => {
            item.querySelector('.nav-link').addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(item.dataset.page);
            });
        });

        // Handle browser back/forward
        window.addEventListener('hashchange', () => {
            navigateTo(getPageFromHash());
        });

        // Dashboard shortcut links
        document.getElementById('view-all-attendance')?.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('attendance');
        });
        document.getElementById('view-all-leaves')?.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('manage-leaves');
        });
    }

    function navigateTo(page) {
        currentPage = page;
        window.location.hash = page;

        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Show/hide pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) {
            pageEl.classList.add('active');
        } else {
            // fallback
            document.getElementById('page-dashboard').classList.add('active');
        }

        // Update page title
        const titles = {
            'dashboard': 'Dashboard',
            'attendance': 'My Attendance',
            'leaves': 'Leave Requests',
            'employees': 'Employees',
            'manage-attendance': 'All Attendance',
            'manage-leaves': 'Manage Leaves',
            'profile': 'Profile',
        };
        document.getElementById('page-title').textContent = titles[page] || 'eAttend';
        document.title = `eAttend — ${titles[page] || 'Dashboard'}`;

        // Close sidebar on mobile
        closeSidebar();

        // Load page data
        loadPageData(page);
    }

    function loadPageData(page) {
        switch (page) {
            case 'dashboard':
                if (currentUser.is_manager) {
                    loadManagerDashboard();
                } else {
                    loadEmployeeDashboard();
                }
                break;
            case 'attendance':
                loadMyAttendance();
                break;
            case 'leaves':
                loadMyLeaves();
                break;
            case 'employees':
                loadEmployees();
                break;
            case 'manage-attendance':
                loadAllAttendance();
                break;
            case 'manage-leaves':
                loadAllLeaves();
                break;
            case 'profile':
                loadProfile();
                break;
        }
    }

    // ===== SIDEBAR TOGGLE =====
    function openSidebar() {
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('sidebar-overlay').classList.add('show');
    }

    function closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('show');
    }

    // ===== EVENT LISTENERS =====
    function setupEventListeners() {
        // Sidebar
        document.getElementById('menu-toggle').addEventListener('click', openSidebar);
        document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
        document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

        // Logout
        document.getElementById('logout-btn').addEventListener('click', handleLogout);

        // Time In/Out
        document.getElementById('btn-time-in')?.addEventListener('click', handleTimeIn);
        document.getElementById('btn-time-out')?.addEventListener('click', handleTimeOut);
        document.getElementById('btn-att-time-in')?.addEventListener('click', handleAttendancePageTimeIn);
        document.getElementById('btn-att-time-out')?.addEventListener('click', handleAttendancePageTimeOut);

        // Attendance filter
        document.getElementById('btn-filter-att')?.addEventListener('click', loadMyAttendance);
        populateYearSelects();

        // Leave form
        document.getElementById('btn-new-leave')?.addEventListener('click', openLeaveModal);
        document.getElementById('close-leave-modal')?.addEventListener('click', closeLeaveModal);
        document.getElementById('cancel-leave-modal')?.addEventListener('click', closeLeaveModal);
        document.getElementById('leave-form')?.addEventListener('submit', handleLeaveSubmit);
        document.getElementById('leave-start')?.addEventListener('change', calculateLeaveDays);
        document.getElementById('leave-end')?.addEventListener('change', calculateLeaveDays);
        document.getElementById('btn-filter-leaves')?.addEventListener('click', loadMyLeaves);

        // Manager: All attendance filter
        document.getElementById('btn-filter-mgr-att')?.addEventListener('click', loadAllAttendance);

        // Manager: Leaves filter
        document.getElementById('btn-filter-mgr-leaves')?.addEventListener('click', loadAllLeaves);

        // Review modal
        document.getElementById('close-review-modal')?.addEventListener('click', closeReviewModal);
        document.getElementById('cancel-review-modal')?.addEventListener('click', closeReviewModal);
        document.getElementById('btn-approve-leave')?.addEventListener('click', () => submitReview('approved'));
        document.getElementById('btn-reject-leave')?.addEventListener('click', () => submitReview('rejected'));

        // Employee form
        document.getElementById('btn-add-employee')?.addEventListener('click', openEmpModal);
        document.getElementById('close-emp-modal')?.addEventListener('click', closeEmpModal);
        document.getElementById('cancel-emp-modal')?.addEventListener('click', closeEmpModal);
        document.getElementById('emp-form')?.addEventListener('submit', handleCreateEmployee);
        document.getElementById('btn-search-emp')?.addEventListener('click', loadEmployees);

        // Profile form
        document.getElementById('profile-form')?.addEventListener('submit', handleUpdateProfile);
        document.getElementById('change-pass-form')?.addEventListener('submit', handleChangePassword);

        // Close modals on overlay click
        document.getElementById('leave-modal-overlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeLeaveModal();
        });
        document.getElementById('review-modal-overlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeReviewModal();
        });
        document.getElementById('emp-modal-overlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeEmpModal();
        });
    }

    async function handleLogout() {
        try {
            await API.logout();
        } catch { /* ignore */ }
        Auth.clearTokens();
        window.location.href = '/login/';
    }

    // ===== EMPLOYEE DASHBOARD =====
    async function loadEmployeeDashboard() {
        const today = new Date();
        document.getElementById('dash-date').textContent = today.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        // Load today's attendance
        try {
            const att = await API.getTodayAttendance();
            updateTodayCard(att);
        } catch {
            updateTodayCard(null);
        }

        // Load this month's summary
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        try {
            const summary = await API.getMyAttendanceSummary({ month, year });
            document.getElementById('stat-present').textContent = summary.present_count;
            document.getElementById('stat-late').textContent = summary.late_count;
            document.getElementById('stat-hours').textContent = parseFloat(summary.total_hours || 0).toFixed(1);
            document.getElementById('stat-overtime').textContent = parseFloat(summary.overtime_hours || 0).toFixed(1);
        } catch { /* ignore */ }

        // Load pending leaves count
        try {
            const leaves = await API.getMyLeaves({ status: 'pending' });
            document.getElementById('stat-pending-leaves').textContent = leaves.length;
        } catch { /* ignore */ }

        // Load recent attendance
        try {
            const records = await API.getMyAttendance({ month, year });
            renderRecentAttendance(records.slice(0, 5));
        } catch { /* ignore */ }
    }

    function updateTodayCard(att) {
        const btnIn = document.getElementById('btn-time-in');
        const btnOut = document.getElementById('btn-time-out');
        const iconEl = document.getElementById('status-icon');
        const titleEl = document.getElementById('status-title');
        const subtitleEl = document.getElementById('status-subtitle');

        if (!att) {
            btnIn.classList.remove('d-none');
            btnOut.classList.add('d-none');
            iconEl.innerHTML = '<i class="fas fa-clock"></i>';
            titleEl.textContent = 'Not Yet Timed In';
            subtitleEl.textContent = 'Click the button below to start your workday.';
            document.getElementById('time-in-val').textContent = '--:--';
            document.getElementById('time-out-val').textContent = '--:--';
            document.getElementById('hours-val').textContent = '--';
        } else {
            document.getElementById('time-in-val').textContent = formatTime(att.time_in);
            document.getElementById('time-out-val').textContent = att.time_out ? formatTime(att.time_out) : 'Active';
            document.getElementById('hours-val').textContent = att.total_hours
                ? parseFloat(att.total_hours).toFixed(1) + 'h' : '--';

            if (!att.time_out) {
                btnIn.classList.add('d-none');
                btnOut.classList.remove('d-none');
                iconEl.innerHTML = '<i class="fas fa-play-circle"></i>';
                titleEl.textContent = 'Currently Working';
                subtitleEl.textContent = `Timed in at ${formatTime(att.time_in)}`;
            } else {
                btnIn.classList.add('d-none');
                btnOut.classList.add('d-none');
                iconEl.innerHTML = '<i class="fas fa-check-circle"></i>';
                titleEl.textContent = 'Work Day Complete';
                subtitleEl.textContent = `${parseFloat(att.total_hours || 0).toFixed(2)} hours logged, OT ${parseFloat(att.overtime_hours || 0).toFixed(2)}h — ${att.status_display}`;
            }
        }
    }

    async function handleTimeIn() {
        const btn = document.getElementById('btn-time-in');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Recording...';
        try {
            const att = await API.timeIn();
            updateTodayCard(att);
            showToast('Time-in recorded successfully!', 'success');
            loadEmployeeDashboard();
        } catch (err) {
            showToast(err.message, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-play"></i> Time In';
        }
    }

    async function handleTimeOut() {
        const btn = document.getElementById('btn-time-out');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Recording...';
        try {
            const att = await API.timeOut();
            updateTodayCard(att);
            showToast(`Time-out recorded. Total: ${parseFloat(att.total_hours).toFixed(2)} hours.`, 'success');
            loadEmployeeDashboard();
        } catch (err) {
            showToast(err.message, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-stop"></i> Time Out';
        }
    }

    function renderRecentAttendance(records) {
        const tbody = document.getElementById('recent-attendance-tbody');
        if (!records.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No attendance records yet.</td></tr>';
            return;
        }
        tbody.innerHTML = records.map(r => `
            <tr>
                <td>${formatDate(r.date)}</td>
                <td>${formatTime(r.time_in) || '—'}</td>
                <td>${formatTime(r.time_out) || '—'}</td>
                <td>${r.total_hours ? parseFloat(r.total_hours).toFixed(2) + 'h' : '—'}</td>
                <td>${r.overtime_hours ? parseFloat(r.overtime_hours).toFixed(2) + 'h' : '0.00h'}</td>
                <td>${statusBadge(r.status)}</td>
            </tr>
        `).join('');
    }

    // ===== MANAGER DASHBOARD =====
    async function loadManagerDashboard() {
        const today = new Date();
        document.getElementById('mgr-dash-date').textContent = today.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        try {
            const summary = await API.getDashboardSummary();
            const totalEmployees = Number(summary.total_employees ?? 0);
            const todayAttendance = Number(summary.today_attendance ?? 0);
            const pendingLeaves = Number(summary.pending_leaves ?? 0);
            const approvedLeaves = Number(summary.approved_leaves ?? 0);
            const rejectedLeaves = Number(summary.rejected_leaves ?? 0);
            const totalAttendance = Number(summary.total_attendance ?? 0);
            const totalOvertime = Number(summary.total_overtime_hours ?? 0);

            document.getElementById('mgr-total-employees').textContent = totalEmployees;
            document.getElementById('mgr-today-attendance').textContent = todayAttendance;
            document.getElementById('mgr-pending-leaves').textContent = pendingLeaves;
            document.getElementById('mgr-approved-leaves').textContent = approvedLeaves;
            document.getElementById('mgr-rejected-leaves').textContent = rejectedLeaves;
            document.getElementById('mgr-total-attendance').textContent = totalAttendance;
            document.getElementById('mgr-total-overtime').textContent = totalOvertime.toFixed(1);

            const navAttendanceCount = document.getElementById('nav-attendance-count');
            if (navAttendanceCount) {
                navAttendanceCount.textContent = String(totalAttendance);
            }
        } catch { /* ignore */ }

        // Pending leaves
        try {
            const leaves = await API.getAllLeaves({ status: 'pending' });
            renderManagerPendingLeaves(leaves.slice(0, 10));
        } catch { /* ignore */ }

        // Today's attendance
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const records = await API.getAllAttendance({ date: todayStr });
            renderTodayAttendance(records);
        } catch { /* ignore */ }
    }

    function renderManagerPendingLeaves(leaves) {
        const tbody = document.getElementById('pending-leaves-tbody');
        if (!leaves.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No pending leave requests.</td></tr>';
            return;
        }
        tbody.innerHTML = leaves.map(l => `
            <tr>
                <td>${escHtml(l.employee_name)}</td>
                <td>${l.leave_type_display}</td>
                <td>${formatDate(l.start_date)} — ${formatDate(l.end_date)}</td>
                <td>${l.total_days}d</td>
                <td class="text-muted" title="${escHtml(l.reason)}">${truncate(l.reason, 40)}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="openReviewModal(${l.id})">
                        <i class="fas fa-tasks"></i> Review
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function renderTodayAttendance(records) {
        const tbody = document.getElementById('today-attendance-tbody');
        if (!records.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No attendance recorded today.</td></tr>';
            return;
        }
        tbody.innerHTML = records.map(r => `
            <tr>
                <td>${escHtml(r.employee_name)}</td>
                <td>${formatTime(r.time_in) || '—'}</td>
                <td>${formatTime(r.time_out) || '—'}</td>
                <td>${r.total_hours ? parseFloat(r.total_hours).toFixed(2) + 'h' : '—'}</td>
                <td>${r.overtime_hours ? parseFloat(r.overtime_hours).toFixed(2) + 'h' : '0.00h'}</td>
                <td>${statusBadge(r.status)}</td>
            </tr>
        `).join('');
    }

    // ===== MY ATTENDANCE PAGE =====
    function populateYearSelects() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        ['att-year', 'mgr-att-year'].forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            for (let y = currentYear; y >= currentYear - 5; y--) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                if (y === currentYear) opt.selected = true;
                sel.appendChild(opt);
            }
        });

        // Set current month
        const attMonth = document.getElementById('att-month');
        const mgrAttMonth = document.getElementById('mgr-att-month');
        if (attMonth) attMonth.value = currentMonth;
        if (mgrAttMonth) mgrAttMonth.value = currentMonth;
    }

    async function loadMyAttendance() {
        const month = document.getElementById('att-month').value;
        const year = document.getElementById('att-year').value;
        const tbody = document.getElementById('att-history-tbody');

        syncAttendancePageActions();

        tbody.innerHTML = `<tr><td colspan="8" class="text-center"><span class="spinner"></span></td></tr>`;

        try {
            const [records, summary] = await Promise.all([
                API.getMyAttendance({ month, year }),
                API.getMyAttendanceSummary({ month, year }),
            ]);

            // Update summary cards
            document.getElementById('att-stat-present').textContent = summary.present_count;
            document.getElementById('att-stat-late').textContent = summary.late_count;
            document.getElementById('att-stat-absent').textContent = summary.absent_count;
            document.getElementById('att-stat-hours').textContent = parseFloat(summary.total_hours || 0).toFixed(1);
            document.getElementById('att-stat-avg').textContent = parseFloat(summary.average_hours || 0).toFixed(1);
            document.getElementById('att-stat-overtime').textContent = parseFloat(summary.overtime_hours || 0).toFixed(1);

            if (!records.length) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No attendance records for this period.</td></tr>';
                return;
            }

            tbody.innerHTML = records.map(r => `
                <tr>
                    <td>${formatDate(r.date)}</td>
                    <td>${getDayName(r.date)}</td>
                    <td>${formatTime(r.time_in) || '—'}</td>
                    <td>${formatTime(r.time_out) || '—'}</td>
                    <td>${r.total_hours ? parseFloat(r.total_hours).toFixed(2) + 'h' : '—'}</td>
                    <td>${r.overtime_hours ? parseFloat(r.overtime_hours).toFixed(2) + 'h' : '0.00h'}</td>
                    <td>${statusBadge(r.status)}</td>
                    <td class="text-muted">${escHtml(r.notes) || '—'}</td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${escHtml(err.message)}</td></tr>`;
        }
    }

    async function syncAttendancePageActions() {
        const btnIn = document.getElementById('btn-att-time-in');
        const btnOut = document.getElementById('btn-att-time-out');
        const statusEl = document.getElementById('att-today-status');
        if (!btnIn || !btnOut || !statusEl) return;

        try {
            const att = await API.getTodayAttendance();
            if (!att) {
                btnIn.classList.remove('d-none');
                btnOut.classList.add('d-none');
                statusEl.textContent = 'Today: Not timed in yet';
                return;
            }

            if (!att.time_out) {
                btnIn.classList.add('d-none');
                btnOut.classList.remove('d-none');
                statusEl.textContent = `Today: Timed in at ${formatTime(att.time_in)}`;
            } else {
                btnIn.classList.add('d-none');
                btnOut.classList.add('d-none');
                statusEl.textContent = `Today: Complete (${parseFloat(att.total_hours || 0).toFixed(2)}h, OT ${parseFloat(att.overtime_hours || 0).toFixed(2)}h)`;
            }
        } catch {
            btnIn.classList.remove('d-none');
            btnOut.classList.add('d-none');
            statusEl.textContent = 'Today: Unable to load status';
        }
    }

    async function handleAttendancePageTimeIn() {
        const btn = document.getElementById('btn-att-time-in');
        if (!btn) return;

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Recording...';
        try {
            await API.timeIn();
            showToast('Time-in recorded successfully!', 'success');
            await loadMyAttendance();
            if (!currentUser.is_manager) {
                await loadEmployeeDashboard();
            }
        } catch (err) {
            showToast(err.message, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-play"></i> Time In';
        }
    }

    async function handleAttendancePageTimeOut() {
        const btn = document.getElementById('btn-att-time-out');
        if (!btn) return;

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Recording...';
        try {
            const att = await API.timeOut();
            showToast(`Time-out recorded. Total: ${parseFloat(att.total_hours || 0).toFixed(2)}h, OT: ${parseFloat(att.overtime_hours || 0).toFixed(2)}h.`, 'success');
            await loadMyAttendance();
            if (!currentUser.is_manager) {
                await loadEmployeeDashboard();
            }
        } catch (err) {
            showToast(err.message, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-stop"></i> Time Out';
        }
    }

    // ===== MY LEAVES PAGE =====
    async function loadMyLeaves() {
        const status = document.getElementById('leave-status-filter').value;
        const tbody = document.getElementById('my-leaves-tbody');

        tbody.innerHTML = `<tr><td colspan="8" class="text-center"><span class="spinner"></span></td></tr>`;

        const params = {};
        if (status) params.status = status;

        try {
            const leaves = await API.getMyLeaves(params);

            if (!leaves.length) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No leave requests found.</td></tr>';
                return;
            }

            tbody.innerHTML = leaves.map(l => `
                <tr>
                    <td>${l.leave_type_display}</td>
                    <td>${formatDate(l.start_date)}</td>
                    <td>${formatDate(l.end_date)}</td>
                    <td>${l.total_days}d</td>
                    <td title="${escHtml(l.reason)}">${truncate(l.reason, 35)}</td>
                    <td>${leaveStatusBadge(l.status)}</td>
                    <td>${formatDateShort(l.created_at)}</td>
                    <td>
                        ${l.status === 'pending'
                            ? `<button class="btn btn-sm btn-danger" onclick="cancelLeave(${l.id})">
                                <i class="fas fa-times"></i> Cancel
                               </button>`
                            : `<span class="text-muted">—</span>`
                        }
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${escHtml(err.message)}</td></tr>`;
        }
    }

    // ===== LEAVE MODAL =====
    function openLeaveModal() {
        // Set min date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('leave-start').min = today;
        document.getElementById('leave-end').min = today;
        document.getElementById('leave-start').value = today;
        document.getElementById('leave-end').value = today;
        document.getElementById('leave-days-count').textContent = '1';
        document.getElementById('leave-form').reset();
        document.getElementById('leave-start').value = today;
        document.getElementById('leave-end').value = today;
        document.getElementById('leave-days-count').textContent = '1';
        document.getElementById('leave-form-alert').classList.add('d-none');
        document.getElementById('leave-modal-overlay').classList.remove('d-none');
    }

    function closeLeaveModal() {
        document.getElementById('leave-modal-overlay').classList.add('d-none');
    }

    function calculateLeaveDays() {
        const start = document.getElementById('leave-start').value;
        const end = document.getElementById('leave-end').value;
        if (start && end) {
            const diff = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
            document.getElementById('leave-days-count').textContent = diff > 0 ? diff : 0;
        }
    }

    async function handleLeaveSubmit(e) {
        e.preventDefault();
        const alertEl = document.getElementById('leave-form-alert');

        const data = {
            leave_type: document.getElementById('leave-type').value,
            start_date: document.getElementById('leave-start').value,
            end_date: document.getElementById('leave-end').value,
            reason: document.getElementById('leave-reason').value.trim(),
        };

        if (!data.leave_type || !data.start_date || !data.end_date || !data.reason) {
            showFormAlert(alertEl, 'Please fill in all required fields.', 'warning');
            return;
        }

        const submitBtn = e.target.querySelector('[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        try {
            await API.submitLeave(data);
            closeLeaveModal();
            showToast('Leave request submitted successfully!', 'success');
            loadMyLeaves();
        } catch (err) {
            showFormAlert(alertEl, err.message, 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request';
        }
    }

    // Cancel leave
    window.cancelLeave = async (id) => {
        if (!confirm('Cancel this leave request?')) return;
        try {
            await API.cancelLeave(id);
            showToast('Leave request cancelled.', 'success');
            loadMyLeaves();
        } catch (err) {
            showToast(err.message, 'danger');
        }
    };

    // ===== MANAGER: ALL ATTENDANCE =====
    async function loadAllAttendance() {
        const month = document.getElementById('mgr-att-month').value;
        const year = document.getElementById('mgr-att-year').value;
        const tbody = document.getElementById('all-attendance-tbody');

        tbody.innerHTML = `<tr><td colspan="8" class="text-center"><span class="spinner"></span></td></tr>`;

        try {
            const records = await API.getAllAttendance({ month, year });

            if (!records.length) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No attendance records for this period.</td></tr>';
                return;
            }

            tbody.innerHTML = records.map(r => `
                <tr>
                    <td><strong>${escHtml(r.employee_name)}</strong><br><small class="text-muted">${escHtml(r.employee_username)}</small></td>
                    <td>${formatDate(r.date)}</td>
                    <td>${formatTime(r.time_in) || '—'}</td>
                    <td>${formatTime(r.time_out) || '—'}</td>
                    <td>${r.total_hours ? parseFloat(r.total_hours).toFixed(2) + 'h' : '—'}</td>
                    <td>${r.overtime_hours ? parseFloat(r.overtime_hours).toFixed(2) + 'h' : '0.00h'}</td>
                    <td>${statusBadge(r.status)}</td>
                    <td class="text-muted">${escHtml(r.notes) || '—'}</td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${escHtml(err.message)}</td></tr>`;
        }
    }

    // ===== MANAGER: ALL LEAVES =====
    async function loadAllLeaves() {
        const status = document.getElementById('mgr-leave-status').value;
        const leaveType = document.getElementById('mgr-leave-type').value;
        const tbody = document.getElementById('all-leaves-tbody');

        tbody.innerHTML = `<tr><td colspan="9" class="text-center"><span class="spinner"></span></td></tr>`;

        const params = {};
        if (status) params.status = status;
        if (leaveType) params.leave_type = leaveType;

        try {
            const leaves = await API.getAllLeaves(params);

            if (!leaves.length) {
                tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No leave requests found.</td></tr>';
                return;
            }

            tbody.innerHTML = leaves.map(l => `
                <tr>
                    <td><strong>${escHtml(l.employee_name)}</strong><br><small class="text-muted">${escHtml(l.employee_department || '')}</small></td>
                    <td>${l.leave_type_display}</td>
                    <td>${formatDate(l.start_date)}</td>
                    <td>${formatDate(l.end_date)}</td>
                    <td>${l.total_days}d</td>
                    <td title="${escHtml(l.reason)}">${truncate(l.reason, 30)}</td>
                    <td>${leaveStatusBadge(l.status)}</td>
                    <td>${formatDateShort(l.created_at)}</td>
                    <td>
                        ${l.status === 'pending'
                            ? `<button class="btn btn-sm btn-primary" onclick="openReviewModal(${l.id})">
                                <i class="fas fa-tasks"></i> Review
                               </button>`
                            : `<span class="text-muted text-sm">${l.reviewed_by_name ? 'By ' + escHtml(l.reviewed_by_name) : '—'}</span>`
                        }
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">${escHtml(err.message)}</td></tr>`;
        }
    }

    // ===== REVIEW MODAL =====
    let allLeavesCache = {};

    window.openReviewModal = async (id) => {
        document.getElementById('review-leave-id').value = id;
        document.getElementById('review-comment').value = '';
        document.getElementById('review-form-alert').classList.add('d-none');

        try {
            const leaves = await API.getAllLeaves({ status: 'pending' });
            const leave = leaves.find(l => l.id === id);
            if (leave) {
                document.getElementById('review-leave-details').innerHTML = `
                    <p><strong>Employee:</strong> ${escHtml(leave.employee_name)}</p>
                    <p><strong>Leave Type:</strong> ${leave.leave_type_display}</p>
                    <p><strong>Date Range:</strong> ${formatDate(leave.start_date)} to ${formatDate(leave.end_date)} (${leave.total_days} day(s))</p>
                    <p><strong>Reason:</strong> ${escHtml(leave.reason)}</p>
                `;
            }
        } catch { /* ignore */ }

        document.getElementById('review-modal-overlay').classList.remove('d-none');
    };

    function closeReviewModal() {
        document.getElementById('review-modal-overlay').classList.add('d-none');
    }

    async function submitReview(status) {
        const id = document.getElementById('review-leave-id').value;
        const comment = document.getElementById('review-comment').value.trim();
        const alertEl = document.getElementById('review-form-alert');

        if (status === 'rejected' && !comment) {
            showFormAlert(alertEl, 'A comment is required when rejecting a request.', 'warning');
            return;
        }

        const btnApprove = document.getElementById('btn-approve-leave');
        const btnReject = document.getElementById('btn-reject-leave');
        btnApprove.disabled = true;
        btnReject.disabled = true;

        try {
            await API.reviewLeave(id, status, comment);
            closeReviewModal();
            showToast(`Leave request ${status}.`, status === 'approved' ? 'success' : 'danger');
            loadManagerDashboard();
            if (currentPage === 'manage-leaves') loadAllLeaves();
        } catch (err) {
            showFormAlert(alertEl, err.message, 'danger');
        } finally {
            btnApprove.disabled = false;
            btnReject.disabled = false;
        }
    }

    // ===== EMPLOYEES PAGE =====
    async function loadEmployees() {
        const search = document.getElementById('emp-search').value.trim();
        const role = document.getElementById('emp-role-filter').value;
        const tbody = document.getElementById('employees-tbody');

        tbody.innerHTML = `<tr><td colspan="7" class="text-center"><span class="spinner"></span></td></tr>`;

        const params = {};
        if (search) params.search = search;
        if (role) params.role = role;

        try {
            const users = await API.getUsers(params);

            if (!users.length) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No employees found.</td></tr>';
                return;
            }

            tbody.innerHTML = users.map(u => `
                <tr>
                    <td><strong>${escHtml(u.first_name + ' ' + u.last_name)}</strong></td>
                    <td>${escHtml(u.username)}</td>
                    <td>${escHtml(u.email) || '—'}</td>
                    <td>${escHtml(u.department) || '—'}</td>
                    <td>${u.is_manager
                        ? '<span class="badge badge-warning">Manager</span>'
                        : '<span class="badge badge-info">Employee</span>'
                    }</td>
                    <td>${u.is_active
                        ? '<span class="badge badge-success">Active</span>'
                        : '<span class="badge badge-secondary">Inactive</span>'
                    }</td>
                    <td><small class="text-muted">${escHtml(u.date_hired || '—')}</small></td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${escHtml(err.message)}</td></tr>`;
        }
    }

    function openEmpModal() {
        document.getElementById('emp-form').reset();
        document.getElementById('emp-form-alert').classList.add('d-none');
        document.getElementById('emp-modal-overlay').classList.remove('d-none');
    }

    function closeEmpModal() {
        document.getElementById('emp-modal-overlay').classList.add('d-none');
    }

    async function handleCreateEmployee(e) {
        e.preventDefault();
        const alertEl = document.getElementById('emp-form-alert');
        alertEl.classList.add('d-none');

        const password = document.getElementById('emp-password').value;
        const password2 = document.getElementById('emp-password2').value;

        if (password !== password2) {
            showFormAlert(alertEl, 'Passwords do not match.', 'danger');
            return;
        }

        const data = {
            username: document.getElementById('emp-username').value.trim(),
            first_name: document.getElementById('emp-first-name').value.trim(),
            last_name: document.getElementById('emp-last-name').value.trim(),
            email: document.getElementById('emp-email').value.trim(),
            department: document.getElementById('emp-department').value.trim(),
            role: document.getElementById('emp-role').value,
            date_hired: document.getElementById('emp-date-hired').value || null,
            password,
            password2,
        };

        const submitBtn = e.target.querySelector('[type="submit"]');
        submitBtn.disabled = true;

        try {
            await API.createUser(data);
            closeEmpModal();
            showToast('Employee created successfully!', 'success');
            loadEmployees();
        } catch (err) {
            showFormAlert(alertEl, err.message, 'danger');
        } finally {
            submitBtn.disabled = false;
        }
    }

    // ===== PROFILE PAGE =====
    async function loadProfile() {
        try {
            const user = await API.getCurrentUser();
            const fullName = `${user.first_name} ${user.last_name}`.trim() || user.username;

            document.getElementById('profile-full-name').textContent = fullName;
            document.getElementById('profile-email').textContent = user.email || 'Not set';
            document.getElementById('profile-department').textContent = user.department || 'Not set';
            document.getElementById('profile-phone').textContent = user.phone || 'Not set';
            document.getElementById('profile-date-hired').textContent = user.date_hired ? formatDate(user.date_hired) : 'Not set';

            const badge = document.getElementById('profile-role-badge');
            badge.textContent = user.is_manager ? 'Manager/Admin' : 'Employee';
            badge.className = `badge ${user.is_manager ? 'badge-warning' : 'badge-info'}`;

            // Pre-fill form
            document.getElementById('p-first-name').value = user.first_name;
            document.getElementById('p-last-name').value = user.last_name;
            document.getElementById('p-email').value = user.email;
            document.getElementById('p-department').value = user.department;
            document.getElementById('p-phone').value = user.phone;
        } catch { /* ignore */ }
    }

    async function handleUpdateProfile(e) {
        e.preventDefault();
        const alertEl = document.getElementById('profile-alert');

        const data = {
            first_name: document.getElementById('p-first-name').value.trim(),
            last_name: document.getElementById('p-last-name').value.trim(),
            email: document.getElementById('p-email').value.trim(),
            department: document.getElementById('p-department').value.trim(),
            phone: document.getElementById('p-phone').value.trim(),
        };

        try {
            const updated = await API.updateProfile(data);
            Auth.setUser({ ...Auth.getUser(), ...updated });
            showFormAlert(alertEl, 'Profile updated successfully!', 'success');
            showToast('Profile updated!', 'success');
            loadProfile();
            setupUI();
        } catch (err) {
            showFormAlert(alertEl, err.message, 'danger');
        }
    }

    async function handleChangePassword(e) {
        e.preventDefault();
        const alertEl = document.getElementById('pass-alert');

        const oldPassword = document.getElementById('old-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            showFormAlert(alertEl, 'New passwords do not match.', 'danger');
            return;
        }

        if (newPassword.length < 8) {
            showFormAlert(alertEl, 'Password must be at least 8 characters.', 'danger');
            return;
        }

        try {
            await API.changePassword(oldPassword, newPassword);
            document.getElementById('change-pass-form').reset();
            showFormAlert(alertEl, 'Password changed successfully!', 'success');
            showToast('Password changed!', 'success');
        } catch (err) {
            showFormAlert(alertEl, err.message, 'danger');
        }
    }

    // ===== HELPERS =====

    function formatTime(timeStr) {
        if (!timeStr) return null;
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${m} ${ampm}`;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function formatDateShort(dateStr) {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function getDayName(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'short' });
    }

    function statusBadge(status) {
        const map = {
            present: ['badge-success', 'Present'],
            late: ['badge-warning', 'Late'],
            absent: ['badge-danger', 'Absent'],
            half_day: ['badge-info', 'Half Day'],
        };
        const [cls, label] = map[status] || ['badge-secondary', status];
        return `<span class="badge ${cls}">${label}</span>`;
    }

    function leaveStatusBadge(status) {
        const map = {
            pending: ['badge-warning', 'Pending'],
            approved: ['badge-success', 'Approved'],
            rejected: ['badge-danger', 'Rejected'],
            cancelled: ['badge-secondary', 'Cancelled'],
        };
        const [cls, label] = map[status] || ['badge-secondary', status];
        return `<span class="badge ${cls}">${label}</span>`;
    }

    function escHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function truncate(str, len) {
        if (!str) return '';
        return str.length > len ? str.substring(0, len) + '...' : str;
    }

    function showFormAlert(el, message, type = 'danger') {
        el.className = `alert alert-${type}`;
        el.textContent = message;
        el.classList.remove('d-none');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ===== TOAST NOTIFICATIONS =====
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const icons = { success: 'fa-check-circle', danger: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${escHtml(message)}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // Make showToast globally accessible (used by manager dashboard reload)
    window.showToast = showToast;
    window.openReviewModal = window.openReviewModal;
    window.cancelLeave = window.cancelLeave;
});
