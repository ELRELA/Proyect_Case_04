// OBTENER SESIÓN
async function getSession() {
    try {
        const res = await fetch('/api/session');
        if(res.ok) return (await res.json()).user;
        return null;
    } catch { return null; }
}

// PROTEGER RUTA
async function protectRoute(role) {
    const user = await getSession();
    if(!user) { window.location.href = 'index.html'; return null; }
    if(role && !user.roles.includes(role)) { 
        showToast('⛔ Acceso denegado', 'error');
        setTimeout(() => window.location.href = 'index.html', 1000);
        return null; 
    }
    return user;
}

// LOGOUT
async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = 'index.html';
}

// UI: NOTIFICACIONES MODERNAS (TOAST)
function showToast(msg, type = 'info') {
    const div = document.createElement('div');
    div.className = `toast ${type}`;
    div.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info'}"></i> ${msg}`;
    document.body.appendChild(div);
    setTimeout(() => {
        div.style.opacity = '0';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}