document.addEventListener("DOMContentLoaded", () => {
    fetchDashboardStats();
    fetchCourses();
    fetchUsers();
});

async function fetchDashboardStats() {
    try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) {
            if(res.status === 401 || res.status === 403) {
                 window.location.href = "/login"; // Unauthorized
                 return;
            }
            throw new Error("Failed to fetch stats");
        }
        const data = await res.json();
        document.getElementById("totalUsersStat").innerText = data.totalUsers || 0;
        document.getElementById("totalCoursesStat").innerText = data.totalCourses || 0;
        document.getElementById("activeUsersStat").innerText = data.activeUsersCount || 0;
        
        // Let's also fetch health API
        const healthRes = await fetch("/api/admin/api/health");
        if (healthRes.ok) {
            const healthData = await healthRes.json();
            document.getElementById("apiQuotaStat").innerText = healthData.quotaUsed + " / " + healthData.quotaTotal;
        }

    } catch (error) {
        console.error(error);
    }
}

async function fetchCourses() {
    try {
        const res = await fetch("/api/admin/courses");
        if (!res.ok) throw new Error("Failed to fetch courses");
        const courses = await res.json();
        
        const tbodyMain = document.getElementById("courseTable");
        const tbodyRecent = document.getElementById("recentCourseTable");
        
        if (tbodyMain) tbodyMain.innerHTML = "";
        if (tbodyRecent) tbodyRecent.innerHTML = "";
        
        // Populate
        courses.forEach((course, index) => {
            const studentName = course.createdBy && course.createdBy.name ? course.createdBy.name : 'Unknown Student';
            const studentEmail = course.createdBy && course.createdBy.email ? course.createdBy.email : '';
            
            const htmlRow = `
                <td class="py-3 px-2 font-medium text-gray-800">
                   <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-md bg-violet-100 text-primary flex items-center justify-center text-xs">
                         <i class="${course.icon || 'fa-solid fa-folder'}"></i>
                      </div>
                      ${course.title || 'Untitled'}
                   </div>
                </td>
                <td class="py-3 px-2">
                   <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                         ${studentName.charAt(0).toUpperCase()}
                      </div>
                      <div class="flex flex-col">
                         <span class="text-sm font-medium text-gray-700">${studentName}</span>
                         ${studentEmail ? `<span class="text-[10px] text-gray-400">${studentEmail}</span>` : ''}
                      </div>
                   </div>
                </td>
                <td class="py-3 px-2">
                   <span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-semibold uppercase tracking-wider">${course.difficulty || 'Beginner'}</span>
                </td>
                <td class="py-3 px-2 text-center">
                    <button onclick="deleteCourseAdmin('${course._id}', this)" class="bg-red-50 hover:bg-red-500 hover:text-white text-red-500 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">
                        <i class="fa-solid fa-trash mr-1"></i> Delete
                    </button>
                </td>
            `;

            if (tbodyMain) {
                const trMap = document.createElement("tr");
                trMap.className = "border-b border-gray-100 hover:bg-gray-50 transition-colors";
                trMap.innerHTML = htmlRow;
                tbodyMain.appendChild(trMap);
            }

            if (tbodyRecent && index < 5) {
                const trRec = document.createElement("tr");
                trRec.className = "border-b border-gray-100 hover:bg-gray-50 transition-colors";
                trRec.innerHTML = htmlRow;
                tbodyRecent.appendChild(trRec);
            }
        });
    } catch(err) {
        console.error(err);
    }
}

async function deleteCourseAdmin(courseId, btn) {
    if(!confirm("Are you sure you want to delete this course?")) return;
    try {
        const res = await fetch(`/api/admin/courses/${courseId}`, { method: 'DELETE' });
        if(res.ok) {
            const row = btn.closest("tr");
            row.remove();
        } else {
            alert("Failed to delete course");
        }
    } catch(err) {
        console.error(err);
    }
}

async function fetchUsers() {
    try {
        const res = await fetch("/api/admin/users");
        if (!res.ok) throw new Error("Failed to fetch users");
        const users = await res.json();
        
        const tbody = document.getElementById("usersTable");
        tbody.innerHTML = "";
        
        users.forEach(user => {
            const tr = document.createElement("tr");
            tr.className = "border-b border-gray-100 hover:bg-gray-50 transition-colors";
            
            const isBlocked = user.isBlocked;
            let statusBadge = '';
            if (isBlocked) {
                statusBadge = '<span class="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-semibold uppercase tracking-wider">Blocked</span>';
            } else if (user.status === 'Active') {
                statusBadge = '<span class="px-2 py-1 bg-green-100 text-green-600 rounded text-xs font-semibold uppercase tracking-wider">Active</span>';
            } else {
                statusBadge = '<span class="px-2 py-1 bg-yellow-100 text-yellow-600 rounded text-xs font-semibold uppercase tracking-wider">Inactive</span>';
            }

            const isProtected = user.role === 'admin' || user.email.toLowerCase() === 'harsh@admin.com' || user.email.toLowerCase() === 'gaurav@admin.com';

            tr.innerHTML = `
                <td class="py-3 px-2">
                   <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                         ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div class="flex flex-col">
                         <span class="text-sm font-medium text-gray-800">${user.name}</span>
                         <span class="text-[10px] text-gray-400">${user.email}</span>
                      </div>
                   </div>
                </td>
                <td class="py-3 px-2 font-semibold text-gray-700">
                   ${user.totalAiGenerations || 0}
                </td>
                <td class="py-3 px-2">
                   ${statusBadge}
                </td>
                <td class="py-3 px-2 text-center">
                    ${isProtected ? '<span class="text-xs text-gray-400 font-semibold uppercase">Admin Protected</span>' : `
                    <button onclick="toggleBlockUser('${user._id}', ${isBlocked})" class="${isBlocked ? 'bg-green-50 text-green-500 border-green-200 hover:bg-green-500 hover:text-white' : 'bg-orange-50 text-orange-500 border-orange-200 hover:bg-orange-500 hover:text-white'} border px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">
                        <i class="fa-solid ${isBlocked ? 'fa-unlock' : 'fa-lock'} mr-1"></i> ${isBlocked ? 'Unblock' : 'Block'}
                    </button>
                    `}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch(err) {
        console.error(err);
    }
}

async function toggleBlockUser(userId, currentStatus) {
    const action = currentStatus ? 'unblock' : 'block';
    if(!confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
        const res = await fetch(`/api/admin/users/${userId}/block`, { method: 'PUT' });
        if(res.ok) {
            fetchUsers(); // refresh the list
            fetchDashboardStats();
        } else {
            const data = await res.json();
            alert(data.error || "Failed to toggle block status");
        }
    } catch(err) {
        console.error(err);
    }
}
