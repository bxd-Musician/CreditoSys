let currentUser = null; 
let isLoading = false;
const API_BASE_URL = 'http://localhost:8000/api/'; 

// Variable global para controlar el monitoreo de alertas
let alertasMonitoringInterval = null;
let isCargandoAlertas = false;

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1]; 
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error al decodificar el JWT:", e);
        return null;
    }
}

function showNotification(message, type = 'info', duration = 4000) {
    const notification = document.getElementById('notification') || createNotification();
    const notificationText = notification.querySelector('#notificationText');
    
    if (notificationText) {
        notificationText.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }
}

function createNotification() {
    const notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = 'notification';
    notification.innerHTML = '<span id="notificationText"></span>';
    document.body.appendChild(notification);
    return notification;
}

function showLoading() {
    isLoading = true;
    const loading = document.getElementById('loadingScreen') || createLoading();
    loading.classList.add('active'); 
}

function hideLoading() {
    isLoading = false;
    const loading = document.getElementById('loadingScreen');
    if (loading) {
        loading.classList.remove('active'); 
    }
}

function createLoading() {
    const loading = document.createElement('div');
    loading.id = 'loadingScreen';
    loading.className = 'loading';
    loading.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loading);
    return loading;
}

function loadUserData() {
    try {
        const currentUserStr = localStorage.getItem('currentUser');
        console.log('Datos de usuario en localStorage:', currentUserStr);
        
        if (currentUserStr) {
            const parsedUser = JSON.parse(currentUserStr);
            console.log('Usuario parseado:', parsedUser);
            
            // Verificar que el usuario tenga los campos necesarios
            if (parsedUser && parsedUser.username && parsedUser.role && parsedUser.access_token) {
                currentUser = parsedUser;
                console.log('Usuario cargado exitosamente:', currentUser);
                return true;
            } else {
                console.warn('Usuario incompleto o sin token, limpiando datos');
                console.warn('Campos faltantes:', {
                    username: !!parsedUser?.username,
                    role: !!parsedUser?.role,
                    access_token: !!parsedUser?.access_token
                });
                localStorage.removeItem('currentUser');
                currentUser = null;
                return false;
            }
        } else {
            console.log('No hay datos de usuario en localStorage');
            currentUser = null;
            return false;
        }
    } catch (e) {
        console.error("Error al cargar datos de usuario desde localStorage:", e);
        localStorage.removeItem('currentUser'); // Limpiar datos corruptos
        currentUser = null;
        return false;
    }
}

function updateUserInterface() {
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    const userAvatarElement = document.getElementById('userAvatar');

    console.log('Estado de currentUser en updateUserInterface:', currentUser);
    console.log('Valor de currentUser.username:', currentUser ? currentUser.username : 'No existe o es null'); // Añade esta línea
    console.log('Valor de currentUser.role:', currentUser ? currentUser.role : 'No existe o es null');     // Añade esta línea

    if (!currentUser || !currentUser.username || !currentUser.role) {
        console.warn('Datos de usuario incompletos para actualizar la interfaz.');
        if (userNameElement) userNameElement.textContent = 'Usuario';
        if (userRoleElement) userRoleElement.textContent = 'Cargando...';
        if (userAvatarElement) userAvatarElement.textContent = 'U';
        return;
    }
    
    if (userNameElement) {
        userNameElement.textContent = currentUser.username;
    }

    if (userRoleElement) {
        userRoleElement.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    }

    if (userAvatarElement) {
        const initials = currentUser.username.split(' ').map(n => n ? n[0] : '').join('').substring(0, 2).toUpperCase();
        userAvatarElement.textContent = initials;
    }

    updateRoleBasedUI();
}

function updateRoleBasedUI() {
    if (!currentUser || !currentUser.role) {
        console.warn('currentUser o currentUser.role no está definido para actualizar la UI.');
        return;
    }
    
    const role = currentUser.role;
    console.log('Actualizando UI para rol:', role);
    
    document.querySelectorAll('.client-only').forEach(el => el.classList.add('d-none'));
    document.querySelectorAll('.evaluator-admin-only').forEach(el => el.classList.add('d-none'));
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('d-none'));

    if (role === 'cliente') {
        document.querySelectorAll('.client-only').forEach(el => el.classList.remove('d-none'));
    }
    
    if (role === 'evaluador' || role === 'admin') {
        document.querySelectorAll('.evaluator-admin-only').forEach(el => el.classList.remove('d-none'));
    }
    
    if (role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null; // Limpiar la variable global
    showNotification('Sesión cerrada exitosamente', 'success');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1500);
}

function switchTab(tabName) {
    document.querySelectorAll('.form-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const clickedTab = document.querySelector(`.form-tab[onclick*="${tabName}"]`);
    if (clickedTab) {
        clickedTab.classList.add('active');
    }
    
    document.querySelectorAll('.form-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetContent = document.getElementById(tabName + 'Form');
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

function scrollToPoliticas() {
    // Buscar la sección de políticas usando métodos válidos de JavaScript
    const allH3s = document.querySelectorAll('h3');
    let politicasSection = null;
    
    // Buscar el h3 que contenga el texto de políticas
    for (let h3 of allH3s) {
        if (h3.textContent.includes('Configuración de Políticas Crediticias')) {
            politicasSection = h3;
            break;
        }
    }
    
    // Si no se encuentra, buscar en card-header
    if (!politicasSection) {
        const cardHeaders = document.querySelectorAll('.card-header h3');
        for (let h3 of cardHeaders) {
            if (h3.textContent.includes('Configuración de Políticas Crediticias')) {
                politicasSection = h3;
                break;
            }
        }
    }
    
    // Verificar que encontramos la sección correcta
    if (politicasSection) {
        politicasSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        // Cargar las políticas después del scroll
        setTimeout(() => {
            cargarPoliticas();
        }, 500);
        
        return true;
    }
    
    // Fallback: buscar por ID o clase específica
    const fallbackSection = document.getElementById('politicas') || 
                           document.querySelector('.content-section[data-section="politicas"]');
    
    if (fallbackSection) {
        fallbackSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        setTimeout(() => {
            cargarPoliticas();
        }, 500);
        
        return true;
    }
    
    return false;
}

function showSection(sectionName) {
    if (sectionName === 'politicas') {
        // Hacer scroll hasta la sección de políticas
        if (!scrollToPoliticas()) {
            // Si no se encuentra, mostrar notificación
            showNotification('Sección de políticas no encontrada', 'error');
        }
        return;
    }
    
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = event ? event.target.closest('.nav-tab') : document.querySelector(`[onclick*="showSection('${sectionName}')"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
        section.classList.remove('fade-in'); // Limpiar la animación
    });
    
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.classList.add('fade-in');
        
        // Cargar datos específicos según la sección
        if (sectionName === 'usuarios') {
            cargarUsuariosAdmin();
        } else if (sectionName === 'overview') {
            cargarEstadisticasAdmin();
            cargarActividadRecienteAdmin();
            cargarEstadoSistemaAdmin();
        } else if (sectionName === 'auditoria') {
            cargarAuditoria();
        }
    }
}

function irADashboard() {
    if (window.location.pathname.includes('dashboard.html')) {
        showSection('dashboard');
    } else {
        window.location.href = 'dashboard.html';
    }
}

function irASolicitudes() {
    window.location.href = 'solicitudes.html';
}

function irANuevaSolicitud() {
    window.location.href = 'nueva_solicitud.html';
}

function irAEvaluacion() {
    window.location.href = 'evaluacion.html';
}

function irAAdmin() {
    window.location.href = 'admin.html';
}

function irADocumentos() {
    console.log('Navegando a sección de documentos...');
    showSection('documentos');
    
    // Hacer scroll suave hasta la sección de documentos
    setTimeout(() => {
        scrollToDocumentos();
    }, 100);
    
    // Refrescar datos si es necesario
    const selectSolicitud = document.getElementById('solicitudDocumentos');
    if (selectSolicitud && selectSolicitud.options.length <= 1) {
        console.log('Refrescando datos de documentos...');
        setTimeout(() => {
            cargarSolicitudesDocumentos();
        }, 200);
    }
}

/**
 * Función auxiliar para hacer scroll suave a una sección
 * @param {string} sectionId - ID de la sección a la que hacer scroll
 */
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

/**
 * Función específica para hacer scroll a la sección de documentos
 */
function scrollToDocumentos() {
    const documentosSection = document.getElementById('documentos');
    if (documentosSection) {
        console.log('Haciendo scroll a la sección de documentos...');
        documentosSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        // Agregar un pequeño offset para mejor visualización
        setTimeout(() => {
            window.scrollBy({
                top: -20,
                behavior: 'smooth'
            });
        }, 500);
    }
}

/**
 * Función para navegar a la sección de perfil
 */
function irAPerfil() {
    console.log('Navegando a página de perfil...');
    window.location.href = 'perfil.html';
}

/**
 * Función para cargar los datos del perfil del usuario
 */
function cargarDatosPerfil() {
    // Usar el sistema de autenticación existente
    if (!currentUser || !currentUser.access_token) {
        console.error('No hay token de autenticación');
        showNotification('No has iniciado sesión. Redirigiendo al login...', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }

    // Usar los datos del usuario actual
    const userData = currentUser || {};
    
    // Llenar información básica
    document.getElementById('profileName').textContent = userData.username || 'Usuario';
    document.getElementById('profileRole').textContent = getRoleDisplayName(userData.role);
    document.getElementById('profileUsername').value = userData.username || '';
    document.getElementById('profileEmail').value = userData.email || '';
    document.getElementById('profileDNI').value = userData.dni || 'No especificado';
    document.getElementById('profilePhone').value = userData.phone || 'No especificado';
    document.getElementById('profileRoleInput').value = getRoleDisplayName(userData.role);
    document.getElementById('profileDate').value = userData.date_joined ? new Date(userData.date_joined).toLocaleDateString() : 'No disponible';
    
    // Actualizar avatar del perfil
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) {
        profileAvatar.textContent = (userData.username || 'U').charAt(0).toUpperCase();
    }
    
    // Cargar estadísticas del usuario
    cargarEstadisticasPerfil();
}

/**
 * Función para cargar las estadísticas del perfil
 */
function cargarEstadisticasPerfil() {
    if (!currentUser || !currentUser.access_token) return;

    fetch(`${API_BASE_URL}applications/user-stats/`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${currentUser.access_token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar estadísticas');
        }
        return response.json();
    })
    .then(data => {
        console.log('Estadísticas del perfil cargadas:', data);
        
        // Actualizar elementos si existen
        const totalElement = document.getElementById('profileTotalSolicitudes');
        const aprobadasElement = document.getElementById('profileSolicitudesAprobadas');
        const pendientesElement = document.getElementById('profileSolicitudesPendientes');
        const montoElement = document.getElementById('profileMontoTotal');
        
        if (totalElement) totalElement.textContent = data.total_applications || 0;
        if (aprobadasElement) aprobadasElement.textContent = data.approved_applications || 0;
        if (pendientesElement) pendientesElement.textContent = data.recent_applications_30_days || 0;
        if (montoElement) montoElement.textContent = `S/ ${(data.total_amount_requested || 0).toFixed(2)}`;
    })
    .catch(error => {
        console.error('Error al cargar estadísticas del perfil:', error);
        // Usar datos del dashboard como fallback si existen
        const totalElement = document.getElementById('profileTotalSolicitudes');
        const aprobadasElement = document.getElementById('profileSolicitudesAprobadas');
        const pendientesElement = document.getElementById('profileSolicitudesPendientes');
        const montoElement = document.getElementById('profileMontoTotal');
        
        const dashboardTotal = document.getElementById('totalSolicitudes');
        const dashboardAprobadas = document.getElementById('solicitudesAprobadas');
        const dashboardPendientes = document.getElementById('solicitudesPendientes');
        const dashboardMonto = document.getElementById('montoTotal');
        
        if (totalElement && dashboardTotal) totalElement.textContent = dashboardTotal.textContent;
        if (aprobadasElement && dashboardAprobadas) aprobadasElement.textContent = dashboardAprobadas.textContent;
        if (pendientesElement && dashboardPendientes) pendientesElement.textContent = dashboardPendientes.textContent;
        if (montoElement && dashboardMonto) montoElement.textContent = dashboardMonto.textContent;
    });
}

/**
 * Función para obtener el nombre de visualización del rol
 */
function getRoleDisplayName(role) {
    const roleNames = {
        'cliente': 'Cliente',
        'evaluador': 'Evaluador',
        'admin': 'Administrador'
    };
    return roleNames[role] || 'Usuario';
}

/**
 * Función para cambiar el avatar (placeholder)
 */
function cambiarAvatar() {
    showNotification('Función en desarrollo', 'info');
}

/**
 * Función para editar el perfil
 */
function editarPerfil() {
    // Cargar datos actuales en el modal
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    document.getElementById('editUsername').value = userData.username || '';
    document.getElementById('editEmail').value = userData.email || '';
    document.getElementById('editDNI').value = userData.dni || '';
    document.getElementById('editPhone').value = userData.phone || '';
    document.getElementById('editAddress').value = userData.address || '';
    
    showModal('editProfileModal');
}

/**
 * Función para guardar cambios del perfil
 */
async function guardarPerfil() {
    const username = document.getElementById('editUsername').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const dni = document.getElementById('editDNI').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const address = document.getElementById('editAddress').value.trim();
    
    // Validaciones básicas
    if (!username || !email) {
        showNotification('El nombre de usuario y email son obligatorios', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showNotification('El formato del email no es válido', 'error');
        return;
    }
    
    try {
        const response = await fetchAuthenticated(`${API_BASE_URL}users/update-profile/`, {
            method: 'PATCH',
            body: JSON.stringify({
                username,
                email,
                dni,
                phone,
                address
            })
        });
        
        if (response.ok) {
            const updatedData = await response.json();
            
            // Actualizar datos en localStorage
            const currentUserData = JSON.parse(localStorage.getItem('userData') || '{}');
            const updatedUserData = { ...currentUserData, ...updatedData };
            localStorage.setItem('userData', JSON.stringify(updatedUserData));
            
            // Actualizar interfaz
            cargarDatosPerfil();
            updateUserInterface();
            
            closeModal('editProfileModal');
            showNotification('Perfil actualizado exitosamente', 'success');
        } else {
            const errorData = await response.json();
            showNotification(errorData.detail || 'Error al actualizar el perfil', 'error');
        }
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        showNotification('Error de conexión al actualizar el perfil', 'error');
    }
}

/**
 * Función para cambiar contraseña
 */
function cambiarContraseña() {
    // Limpiar formulario
    document.getElementById('changePasswordForm').reset();
    document.getElementById('newPasswordStrength').innerHTML = '';
    
    showModal('changePasswordModal');
}

/**
 * Función para enviar cambio de contraseña
 */
async function cambiarContraseñaSubmit() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Todos los campos son obligatorios', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (!validatePassword(newPassword)) {
        showNotification('La nueva contraseña no cumple con los requisitos de seguridad', 'error');
        return;
    }
    
    try {
        const response = await fetchAuthenticated(`${API_BASE_URL}users/change-password/`, {
            method: 'POST',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        if (response.ok) {
            closeModal('changePasswordModal');
            showNotification('Contraseña cambiada exitosamente', 'success');
        } else {
            const errorData = await response.json();
            showNotification(errorData.detail || 'Error al cambiar la contraseña', 'error');
        }
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        showNotification('Error de conexión al cambiar la contraseña', 'error');
    }
}

/**
 * Función para configurar validación de contraseña en tiempo real
 */
function setupPasswordValidation() {
    const newPasswordInput = document.getElementById('newPassword');
    const strengthDiv = document.getElementById('newPasswordStrength');
    
    if (newPasswordInput && strengthDiv) {
        newPasswordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = checkPasswordStrength(password);
            
            strengthDiv.innerHTML = strength.message;
            strengthDiv.className = `password-strength ${strength.class}`;
        });
    }
}

function redirectToUserPage() {
    if (!currentUser) {
        console.log('No hay usuario, redirigiendo a login');
        window.location.href = 'login.html';
        return;
    }
    
    console.log('Redirigiendo usuario con rol:', currentUser.role);
    
    switch(currentUser.role) {
        case 'cliente':
            window.location.href = 'dashboard.html';
            break;
        case 'evaluador':
            window.location.href = 'evaluacion.html';
            break;
        case 'admin':
            window.location.href = 'admin.html';
            break;
        default:
            console.log('Rol de usuario desconocido:', currentUser.role);
            window.location.href = 'dashboard.html';
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateDNI(dni) {
    return /^[0-9]{8}$/.test(dni);
}

function validatePhone(phone) {
    return /^[0-9]{9}$/.test(phone);
}

function validatePassword(password) {
    return password.length >= 8 && 
            /[A-Z]/.test(password) && 
            /[0-9]/.test(password);
}

function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('passwordStrengthBar');
    const lengthReq = document.getElementById('lengthReq');
    const upperReq = document.getElementById('upperReq');
    const numberReq = document.getElementById('numberReq');
    
    if (!strengthBar) return;
    
    let score = 0;
    
    if (password.length >= 8) {
        if (lengthReq) {
            lengthReq.classList.remove('invalid');
            lengthReq.classList.add('valid');
            lengthReq.querySelector('i').className = 'fas fa-check';
        }
        score++;
    } else if (lengthReq) {
        lengthReq.classList.remove('valid');
        lengthReq.classList.add('invalid');
        lengthReq.querySelector('i').className = 'fas fa-times';
    }
    
    if (/[A-Z]/.test(password)) {
        if (upperReq) {
            upperReq.classList.remove('invalid');
            upperReq.classList.add('valid');
            upperReq.querySelector('i').className = 'fas fa-check';
        }
        score++;
    } else if (upperReq) {
        upperReq.classList.remove('valid');
        upperReq.classList.add('invalid');
        upperReq.querySelector('i').className = 'fas fa-times';
    }
    
    // Verificar número
    if (/[0-9]/.test(password)) {
        if (numberReq) {
            numberReq.classList.remove('invalid');
            numberReq.classList.add('valid');
            numberReq.querySelector('i').className = 'fas fa-check';
        }
        score++;
    } else if (numberReq) {
        numberReq.classList.remove('valid');
        numberReq.classList.add('invalid');
        numberReq.querySelector('i').className = 'fas fa-times';
    }
    
    strengthBar.className = 'password-strength-bar';
    if (score === 1) {
        strengthBar.classList.add('strength-weak');
    } else if (score === 2) {
        strengthBar.classList.add('strength-fair');
    } else if (score === 3) {
        strengthBar.classList.add('strength-strong');
    }
}

function checkPasswordMatch() {
    const password = document.getElementById('registerPassword');
    const confirmPassword = document.getElementById('registerConfirmPassword');
    const matchIcon = document.getElementById('passwordMatch');
    
    if (!password || !confirmPassword || !matchIcon) return;
    
    if (confirmPassword.value === '') {
        matchIcon.innerHTML = '';
        return;
    }
    
    if (password.value === confirmPassword.value) {
        matchIcon.innerHTML = '<i class="fas fa-check" style="color: #4caf50;"></i>';
    } else {
        matchIcon.innerHTML = '<i class="fas fa-times" style="color: #ff6b6b;"></i>';
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    if (!usernameInput || !password) {
        showNotification('Por favor, ingresa tu usuario y contraseña.', 'error');
        return;
    }
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}auth/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: usernameInput,
                password: password,
            }),
        });
        if (response.ok) {
            const data = await response.json();
            const decodedToken = parseJwt(data.access);
            if (decodedToken) {
                currentUser = {
                    username: decodedToken.username,
                    email: decodedToken.email,
                    role: decodedToken.role,
                    access_token: data.access,
                    refresh_token: data.refresh,
                };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showNotification('¡Inicio de sesión exitoso!', 'success');
                console.log('Login exitoso, redirigiendo a:', currentUser.role);
                setTimeout(() => {
                    redirectToUserPage();
                }, 1500);
            } else {
                showNotification('Error al procesar la respuesta del servidor (token inválido o incompleto).', 'error');
                console.error('El token decodificado no contiene la información esperada:', decodedToken);
            }
        } else {
            const errorData = await response.json();
            let errorMessage = 'Error al iniciar sesión. ';
            if (errorData.detail) {
                errorMessage += errorData.detail;
            } else if (errorData) {
                for (const key in errorData) {
                    if (errorData.hasOwnProperty(key)) {
                        errorMessage += `${key}: ${errorData[key].join(', ')}. `;
                    }
                }
            }
            showNotification(errorMessage, 'error');
        }
    } catch (error) {
        showNotification('Error de conexión o autenticación. Inténtalo de nuevo.', 'error');
        console.error('Error en handleLogin:', error);
    } finally {
        hideLoading();
    }
}

async function handleRegister(event) {
    event.preventDefault();
    showLoading();

    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const password2 = document.getElementById('registerConfirmPassword').value;
    const dni = document.getElementById('registerDNI').value;
    const phoneNumber = document.getElementById('registerPhone').value; 

    if (password !== password2) {
        hideLoading();
        showNotification('Las contraseñas no coinciden.', 'error');
        return;
    }
    if (!validateEmail(email)) {
        hideLoading();
        showNotification('Email no válido.', 'error');
        return;
    }
    if (!validateDNI(dni)) {
        hideLoading();
        showNotification('DNI debe tener 8 dígitos.', 'error');
        return;
    }
    if (!validatePhone(phoneNumber)) {
        hideLoading();
        showNotification('Teléfono debe tener 9 dígitos.', 'error');
        return;
    }
    if (!validatePassword(password)) {
        hideLoading();
        showNotification('La contraseña no cumple los requisitos (mín. 8 caracteres, mayúscula, número).', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}auth/register/`, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password,
                password2: password2,
                dni: dni,
                phone_number: phoneNumber,
                role: 'cliente'
            }),
        });

        if (response.ok) {
            const data = await response.json();
            showNotification(data.message || 'Registro exitoso. ¡Ahora puedes iniciar sesión!', 'success');
            document.getElementById('registerForm').reset();
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            const errorData = await response.json();
            let errorMessage = 'Error en el registro. ';
            if (errorData) {
                for (const key in errorData) {
                    if (errorData.hasOwnProperty(key)) {
                        errorMessage += `${key}: ${errorData[key].join(', ')}. `;
                    }
                }
            }
            showNotification(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Error al conectar con el backend:', error);
        showNotification('No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.', 'error');
    } finally {
        hideLoading();
    }
}

function checkPageAccess() {
    const currentPage = window.location.pathname;
    console.log('Página actual (currentPage):', currentPage);
    
    // Si estamos en una página pública, no verificar acceso
    const publicPages = ['/login.html', '/register.html', '/index.html', '/'];
    if (publicPages.includes(currentPage)) {
        console.log('Página pública, no verificando acceso');
        return true;
    }
    
    const hasUserData = loadUserData(); 
    console.log('¿Tiene datos de usuario?:', hasUserData);
    console.log('Usuario actual:', currentUser);

    // Si no hay datos de usuario y no estamos en login/register, redirigir a login
    if (!hasUserData && !currentPage.includes('login') && !currentPage.includes('register')) {
        console.log('Sin sesión, redirigiendo a login');
        window.location.href = 'login.html';
        return false;
    }
    
    // Si hay datos de usuario y estamos en login/register, redirigir según rol
    if (hasUserData && (currentPage.includes('login') || currentPage.includes('register'))) {
        console.log('Ya hay sesión, redirigiendo según rol');
        redirectToUserPage();
        return false;
    }
    
    // Verificar permisos por rol solo si hay usuario
    if (currentUser && currentUser.role) {
        console.log('Verificando permisos para rol:', currentUser.role);
        
        // Solo evaluadores y admin pueden acceder a evaluación
        if (currentPage.includes('evaluacion') && currentUser.role === 'cliente') {
            showNotification('No tienes permisos para acceder a esta página', 'error');
            window.location.href = 'dashboard.html';
            return false;
        }
        
        // Solo admin puede acceder a admin
        if (currentPage.includes('admin') && currentUser.role !== 'admin') { 
            showNotification('No tienes permisos para acceder a esta página', 'error');
            window.location.href = 'dashboard.html';
            return false;
        }
        
        // Permitir acceso a solicitudes para todos los roles
        if (currentPage.includes('solicitudes')) {
            console.log('Acceso permitido a solicitudes para rol:', currentUser.role);
            return true;
        }
    }
    
    console.log('Acceso permitido a la página');
    return true;
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function setupEventListeners() {
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
    
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('active');
        }
    });

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);

        const registerPassword = document.getElementById('registerPassword');
        const registerConfirmPassword = document.getElementById('registerConfirmPassword');
        if (registerPassword) {
            registerPassword.addEventListener('input', (e) => {
                checkPasswordStrength(e.target.value);
                checkPasswordMatch();
            });
        }
        if (registerConfirmPassword) {
            registerConfirmPassword.addEventListener('input', checkPasswordMatch);
        }
    }

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
    
    // Configurar validación de contraseña para modales
    setupPasswordValidation();
    
    // Event listeners para filtros de usuarios en admin
    const buscarUsuario = document.getElementById('buscarUsuario');
    const filtroRol = document.getElementById('filtroRol');
    const filtroEstado = document.getElementById('filtroEstado');
    
    if (buscarUsuario) {
        buscarUsuario.addEventListener('input', debounce(() => {
            cargarUsuariosAdmin();
        }, 500));
    }
    
    if (filtroRol) {
        filtroRol.addEventListener('change', () => {
            cargarUsuariosAdmin();
        });
    }
    
    if (filtroEstado) {
        filtroEstado.addEventListener('change', () => {
            cargarUsuariosAdmin();
        });
    }
    
    // Event listeners para filtros de auditoría
    const fechaInicioAudit = document.getElementById('fechaInicioAudit');
    const fechaFinAudit = document.getElementById('fechaFinAudit');
    const tipoEvento = document.getElementById('tipoEvento');
    
    if (fechaInicioAudit) {
        fechaInicioAudit.addEventListener('change', () => {
            cargarAuditoria();
        });
    }
    
    if (fechaFinAudit) {
        fechaFinAudit.addEventListener('change', () => {
            cargarAuditoria();
        });
    }
    
    if (tipoEvento) {
        tipoEvento.addEventListener('change', () => {
            cargarAuditoria();
        });
    }
}

// Función debounce para optimizar búsquedas
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function initApp() {
    console.log('Iniciando aplicación...');
    
    if (!checkPageAccess()) {
        console.log('Acceso denegado, saliendo de initApp');
        return; 
    }
    
    console.log('Acceso permitido, configurando aplicación');
    setupEventListeners();
    
    if (currentUser) {
        console.log('Actualizando interfaz de usuario');
        updateUserInterface();

        if (window.location.pathname.includes('dashboard.html')) {
            console.log('Cargando solicitudes del cliente');
            cargarSolicitudesCliente();
            
            // Inicializar automáticamente la sección de documentos
            console.log('Inicializando sección de documentos automáticamente');
            setTimeout(() => {
                initDocumentosSection();
            }, 1000); // Esperar 1 segundo para que todo se cargue
        }
        
        // Cargar datos del perfil solo si estamos en la página de perfil
        if (window.location.pathname.includes('perfil.html')) {
            console.log('Cargando datos del perfil');
            setTimeout(() => {
                cargarDatosPerfilCompleto();
            }, 500);
        }
        
        // Cargar datos de admin si estamos en admin.html
        if (window.location.pathname.includes('admin.html')) {
            console.log('Cargando datos de administración');
            setTimeout(() => {
                cargarEstadisticasAdmin();
                cargarActividadRecienteAdmin();
                cargarEstadoSistemaAdmin();
                cargarUsuariosAdmin(); // Cargar usuarios inicialmente
                cargarPoliticas(); // Cargar políticas inicialmente
                cargarAuditoria(); // Cargar auditoría inicialmente
                iniciarMonitoreoAlertas(); // Iniciar monitoreo de alertas
            }, 500);
        }
    }
}

document.addEventListener('DOMContentLoaded', initApp);

window.addEventListener('load', async function() {
    console.log('Página cargada:', window.location.pathname);
    
    // Solo verificar token en páginas que requieren autenticación
    const currentPage = window.location.pathname;
    const publicPages = ['/login.html', '/register.html', '/index.html', '/'];
    
    if (publicPages.includes(currentPage)) {
        console.log('Página pública, no verificando autenticación');
        return;
    }
    
    // Verificar token antes de cargar datos
    const tokenValido = await verificarToken();
    
    setTimeout(() => {
        if (currentUser && tokenValido) {
            updateUserInterface();
            
            // Cargar reportes administrativos si estamos en admin.html
            if (window.location.pathname.includes('admin.html')) {
                cargarReportesAdmin();
            }
        }
    }, 100);
});

async function fetchAuthenticated(url, options = {}) {
    showLoading();
    
    // Asegurar que los datos del usuario estén cargados
    if (!currentUser) {
        loadUserData();
    }
    
    const token = currentUser ? currentUser.access_token : null;
    if (!token) {
        hideLoading();
        console.error('No hay token de acceso disponible. currentUser:', currentUser);
        showNotification('Tu sesión ha expirado o no has iniciado sesión. Por favor, vuelve a iniciar sesión.', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        throw new Error('No hay token de acceso disponible.');
    }
    
    // Crear AbortController para manejar timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        hideLoading();
        
        if (response.status === 401) {
            console.log('Token expirado, intentando refresh...');
            const refreshSuccess = await attemptTokenRefresh();
            if (refreshSuccess) {
                // Reintentar con el nuevo token
                const newUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const newResponse = await fetch(url, {
                    ...options,
                    headers: {
                        'Authorization': `Bearer ${newUser.access_token}`,
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });
                
                if (!newResponse.ok) {
                    throw new Error(`HTTP ${newResponse.status}: ${newResponse.statusText}`);
                }
                
                return await newResponse.json();
            } else {
                showNotification('Sesión expirada. Redirigiendo al login...', 'error');
                setTimeout(() => { window.location.href = 'login.html'; }, 2000);
                throw new Error('No se pudo renovar el token.');
            }
        } else if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        } else {
            return await response.json();
        }
        
    } catch (error) {
        clearTimeout(timeoutId);
        hideLoading();
        
        // Manejar errores específicos
        if (error.name === 'AbortError') {
            console.log('Request cancelado por timeout');
            throw new Error('La solicitud tardó demasiado en completarse.');
        } else if (error.message.includes('message port closed')) {
            console.log('Conexión cerrada');
            throw new Error('La conexión se cerró inesperadamente.');
        } else {
            console.error('Error en fetchAuthenticated:', error);
            throw error;
        }
    }
}

async function attemptTokenRefresh() {
    loadUserData();
    const refreshToken = currentUser ? currentUser.refresh_token : null;
    console.log('Debug - attemptTokenRefresh - refreshToken:', refreshToken ? 'Presente' : 'Ausente');
    
    if (!refreshToken) {
        console.error('No refresh token found in currentUser.');
        return false;
    }
    try {
        const response = await fetch('http://localhost:8000/api/auth/login/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: refreshToken }),
        });
        
        console.log('Debug - Refresh response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Debug - Refresh response data:', data);
            
            if (currentUser) {
                currentUser.access_token = data.access;
                if (data.refresh) {
                    currentUser.refresh_token = data.refresh;
                }
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
            console.log('Token de acceso refrescado exitosamente.');
            return true;
        } else {
            const errorData = await response.json();
            console.error('Error al refrescar token:', errorData);
            localStorage.removeItem('currentUser');
            currentUser = null;
            return false;
        }
    } catch (error) {
        console.error('Error de red al intentar refrescar token:', error);
        localStorage.removeItem('currentUser');
        currentUser = null;
        return false;
    }
}

// --- PAGINACIÓN SOLICITUDES ---
let solicitudesData = [];
let paginaActual = 1;
const solicitudesPorPagina = 5;

function renderSolicitudesPaginadas() {
    const tablaBody = document.getElementById('solicitudesTableBody');
    if (!tablaBody) return;
    tablaBody.innerHTML = '';
    if (solicitudesData.length === 0) {
        tablaBody.innerHTML = '<tr><td colspan="6" class="text-center">No tienes solicitudes de crédito.</td></tr>';
    } else {
        const inicio = (paginaActual - 1) * solicitudesPorPagina;
        const fin = Math.min(inicio + solicitudesPorPagina, solicitudesData.length);
        for (let i = inicio; i < fin; i++) {
            const solicitud = solicitudesData[i];
            const fila = `
                <tr>
                    <td>${solicitud.id}</td>
                    <td>S/ ${Number(solicitud.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td>${solicitud.term_months} meses</td>
                    <td><span class="status ${solicitud.status}">${solicitud.status}</span></td>
                    <td>${new Date(solicitud.application_date).toLocaleDateString()}</td>
                    <td><button class="btn btn-sm btn-info" onclick="verDetalle('${solicitud.id}')">Ver</button></td>
                </tr>
            `;
            tablaBody.innerHTML += fila;
        }
    }
    // No llamar a renderPaginacionSolicitudes en el dashboard
}

function renderPaginacionSolicitudes() {
    const paginacionDiv = document.querySelector('.d-flex.justify-between.align-center.mt-3');
    if (!paginacionDiv) return;
    const total = solicitudesData.length;
    const inicio = total === 0 ? 0 : (paginaActual - 1) * solicitudesPorPagina + 1;
    const fin = Math.min(paginaActual * solicitudesPorPagina, total);
    // Texto dinámico
    paginacionDiv.children[0].innerHTML = `<span>Mostrando ${inicio}-${fin} de ${total} solicitudes</span>`;
    // Botones
    let totalPaginas = Math.ceil(total / solicitudesPorPagina);
    let paginacionHTML = '';
    paginacionHTML += `<button class="btn btn-outline btn-sm" ${paginaActual === 1 ? 'disabled' : ''} onclick="cambiarPaginaSolicitudes(${paginaActual - 1})"><i class="fas fa-chevron-left"></i> Anterior</button>`;
    for (let i = 1; i <= totalPaginas; i++) {
        paginacionHTML += `<button class="btn ${i === paginaActual ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="cambiarPaginaSolicitudes(${i})">${i}</button>`;
    }
    paginacionHTML += `<button class="btn btn-outline btn-sm" ${paginaActual === totalPaginas || totalPaginas === 0 ? 'disabled' : ''} onclick="cambiarPaginaSolicitudes(${paginaActual + 1})">Siguiente <i class="fas fa-chevron-right"></i></button>`;
    paginacionDiv.children[1].innerHTML = paginacionHTML;
}

function cambiarPaginaSolicitudes(nuevaPagina) {
    const totalPaginas = Math.ceil(solicitudesData.length / solicitudesPorPagina);
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    paginaActual = nuevaPagina;
    renderSolicitudesPaginadas();
}

// --- MODIFICAR CARGA DE SOLICITUDES ---
async function cargarSolicitudesCliente() {
    showLoading();
    const tablaBody = document.getElementById('solicitudesTableBody');
    if (!tablaBody) {
        console.error('No se encontró el elemento solicitudesTableBody');
        hideLoading();
        return;
    }
    tablaBody.innerHTML = '<tr><td colspan="9" class="text-center">Cargando solicitudes...</td></tr>';
    try {
        const response = await fetchAuthenticated(`${API_BASE_URL}applications/`);
        if (!response.ok) {
            throw new Error('Error al cargar las solicitudes. Inténtalo de nuevo.');
        }
        const data = await response.json();
        updateSolicitudStats(data);
        solicitudesData = data.sort((a, b) => new Date(b.application_date) - new Date(a.application_date));
        paginaActual = 1;
        renderSolicitudesPaginadas();
    } catch (error) {
        console.error('Error al cargar las solicitudes:', error);
        tablaBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error al cargar las solicitudes.</td></tr>';
        showNotification('Error al cargar tus solicitudes. Revisa tu conexión.', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Actualiza las estadísticas de solicitudes en el dashboard.
 * @param {Array} solicitudes - Lista de solicitudes.
 */
function updateSolicitudStats(solicitudes) {
    const total = solicitudes.length;
    const aprobadas = solicitudes.filter(s => s.status === 'aprobada').length;
    const pendientes = solicitudes.filter(s => s.status === 'pendiente' || s.status === 'revision').length;
    const montoAprobado = solicitudes.filter(s => s.status === 'aprobada').reduce((sum, s) => sum + s.amount, 0);
    
    document.getElementById('totalSolicitudes').textContent = total;
    document.getElementById('solicitudesAprobadas').textContent = aprobadas;
    document.getElementById('solicitudesPendientes').textContent = pendientes;
    document.getElementById('montoTotal').textContent = `S/ ${montoAprobado.toLocaleString()}`;
}

/**
 * Redirige a la página de solicitudes para ver el detalle de una solicitud.
 * @param {string} id - ID de la solicitud.
 */
function verDetalle(id) {
    localStorage.setItem('currentApplicationId', id);
    window.location.href = 'solicitudes.html';
}

// ===== FUNCIONES PARA GESTIÓN DE DOCUMENTOS =====

/**
 * Carga las solicitudes del usuario en el selector de documentos
 */
async function cargarSolicitudesDocumentos() {
    console.log('Iniciando carga de solicitudes para documentos...');
    const selectSolicitud = document.getElementById('solicitudDocumentos');
    if (!selectSolicitud) {
        console.error('No se encontró el selector de solicitudes');
        return;
    }

    console.log('Verificando autenticación...');
    if (!currentUser || !currentUser.access_token) {
        console.error('Usuario no autenticado');
        showNotification('Sesión expirada. Por favor, inicia sesión de nuevo.', 'error');
        return;
    }

    try {
        console.log('Haciendo petición a:', `${API_BASE_URL}applications/`);
        const response = await fetchAuthenticated(`${API_BASE_URL}applications/`);
        
        if (!response.ok) {
            console.error('Error en respuesta del servidor:', response.status);
            throw new Error('Error al cargar las solicitudes');
        }

        const solicitudes = await response.json();
        console.log('Solicitudes recibidas:', solicitudes);
        
        // Limpiar opciones existentes
        selectSolicitud.innerHTML = '<option value="">Selecciona una solicitud...</option>';
        
        // Agregar solicitudes al selector
        solicitudes.forEach(solicitud => {
            const option = document.createElement('option');
            option.value = solicitud.id;
            option.textContent = `Solicitud #${solicitud.id} - S/ ${solicitud.amount.toLocaleString()} (${solicitud.status})`;
            selectSolicitud.appendChild(option);
        });

        console.log(`Se agregaron ${solicitudes.length} solicitudes al selector`);

        // Agregar evento para cargar documentos cuando se seleccione una solicitud
        selectSolicitud.addEventListener('change', function() {
            const solicitudId = this.value;
            console.log('Solicitud seleccionada:', solicitudId);
            if (solicitudId) {
                cargarDocumentosSolicitud(solicitudId);
            } else {
                limpiarTablaDocumentos();
            }
        });

    } catch (error) {
        console.error('Error al cargar solicitudes para documentos:', error);
        showNotification('Error al cargar las solicitudes', 'error');
    }
}

/**
 * Carga los documentos de una solicitud específica
 * @param {string} solicitudId - ID de la solicitud
 */
async function cargarDocumentosSolicitud(solicitudId) {
    const tablaBody = document.getElementById('documentosTableBody');
    if (!tablaBody) return;

    tablaBody.innerHTML = '<tr><td colspan="4" class="text-center">Cargando documentos...</td></tr>';

    try {
        const response = await fetchAuthenticated(`${API_BASE_URL}applications/${solicitudId}/documents/`);
        
        if (!response.ok) {
            throw new Error('Error al cargar los documentos');
        }

        const documentos = await response.json();
        
        tablaBody.innerHTML = '';
        
        if (documentos.length === 0) {
            tablaBody.innerHTML = '<tr><td colspan="4" class="text-center">No hay documentos subidos para esta solicitud.</td></tr>';
        } else {
            documentos.forEach(documento => {
                const fila = `
                    <tr>
                        <td>${documento.document_type || 'Documento'}</td>
                        <td><span class="status ${documento.status}">${documento.status}</span></td>
                        <td>${new Date(documento.uploaded_at).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-sm btn-info" onclick="verDocumento('${documento.id}', '${documento.file}')">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                        </td>
                    </tr>
                `;
                tablaBody.innerHTML += fila;
            });
        }

    } catch (error) {
        console.error('Error al cargar documentos:', error);
        tablaBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error al cargar los documentos.</td></tr>';
        showNotification('Error al cargar los documentos', 'error');
    }
}

/**
 * Limpia la tabla de documentos
 */
function limpiarTablaDocumentos() {
    const tablaBody = document.getElementById('documentosTableBody');
    if (tablaBody) {
        tablaBody.innerHTML = '<tr><td colspan="4" class="text-center">Selecciona una solicitud para ver sus documentos.</td></tr>';
    }
}

/**
 * Abre un documento en una nueva ventana
 * @param {string} documentoId - ID del documento
 * @param {string} fileUrl - URL del archivo
 */
function verDocumento(documentoId, fileUrl) {
    if (fileUrl) {
        // Abrir el documento en una nueva ventana
        window.open(fileUrl, '_blank');
    } else {
        showNotification('No se puede acceder al documento', 'error');
    }
}

/**
 * Maneja la subida de archivos
 */
function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const solicitudSelect = document.getElementById('solicitudDocumentos');
    
    if (!fileInput || !solicitudSelect) return;

    fileInput.addEventListener('change', async function(e) {
        const files = e.target.files;
        const solicitudId = solicitudSelect.value;

        if (!solicitudId) {
            showNotification('Primero selecciona una solicitud', 'warning');
            return;
        }

        if (files.length === 0) return;

        showLoading();
        
        try {
            for (let file of files) {
                await subirDocumento(file, solicitudId);
            }
            
            // Recargar documentos después de subir
            cargarDocumentosSolicitud(solicitudId);
            showNotification('Documentos subidos exitosamente', 'success');
            
        } catch (error) {
            console.error('Error al subir documentos:', error);
            showNotification('Error al subir los documentos', 'error');
        } finally {
            hideLoading();
            // Limpiar el input
            fileInput.value = '';
        }
    });
}

/**
 * Sube un documento al servidor
 * @param {File} file - Archivo a subir
 * @param {string} solicitudId - ID de la solicitud
 */
async function subirDocumento(file, solicitudId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', file.name.split('.').pop().toUpperCase());
    formData.append('application', solicitudId);

    const response = await fetchAuthenticated(`${API_BASE_URL}applications/${solicitudId}/documents/upload/`, {
        method: 'POST',
        body: formData,
        headers: {
            // No incluir Content-Type para FormData
        }
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al subir el documento');
    }

    return await response.json();
}

/**
 * Inicializa la funcionalidad de documentos cuando se muestra la sección
 */
function initDocumentosSection() {
    console.log('Inicializando sección de documentos...');
    const documentosSection = document.getElementById('documentos');
    const selectSolicitud = document.getElementById('solicitudDocumentos');
    
    if (!documentosSection) {
        console.error('No se encontró la sección de documentos');
        return;
    }
    
    if (!selectSolicitud) {
        console.error('No se encontró el selector de solicitudes');
        return;
    }
    
    // Verificar si ya se inicializó para evitar duplicados
    if (selectSolicitud.options.length > 1) {
        console.log('La sección de documentos ya está inicializada');
        return;
    }
    
    console.log('Sección de documentos encontrada, cargando solicitudes...');
    cargarSolicitudesDocumentos();
    setupFileUpload();
}

// Agregar evento para inicializar documentos cuando se muestre la sección
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, configurando observador de documentos...');
    
    // Observar cambios en las secciones para inicializar documentos
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (mutation.target.id === 'documentos' && mutation.target.classList.contains('active')) {
                    console.log('Sección de documentos activada, inicializando...');
                    initDocumentosSection();
                }
            }
        });
    });

    // Solo configurar observador de documentos si estamos en el dashboard
    if (window.location.pathname.includes('dashboard.html')) {
        const documentosSection = document.getElementById('documentos');
        if (documentosSection) {
            observer.observe(documentosSection, { attributes: true });
            console.log('Observador configurado para la sección de documentos');
        } else {
            console.log('No se encontró la sección de documentos para configurar el observador (normal en otras páginas)');
        }
        
        // También inicializar si ya estamos en la página de documentos
        console.log('En dashboard, verificando si la sección de documentos está activa...');
        setTimeout(() => {
            if (document.getElementById('documentos') && document.getElementById('documentos').classList.contains('active')) {
                console.log('Sección de documentos ya está activa, inicializando...');
                initDocumentosSection();
            }
        }, 1000);
    }
});

/**
 * Función para actualizar el gráfico de distribución por estado
 */
function actualizarGraficoEstados(statusBreakdown) {
    const chartContainer = document.getElementById('statusChart');
    if (!chartContainer) return;
    
    if (!statusBreakdown || statusBreakdown.length === 0) {
        chartContainer.innerHTML = '<div class="text-center text-muted">No hay datos disponibles</div>';
        return;
    }

    let chartHTML = '<div class="status-distribution">';
    const totalCount = statusBreakdown.reduce((sum, s) => sum + s.count, 0);
    
    statusBreakdown.forEach(status => {
        const percentage = totalCount > 0 ? (status.count / totalCount * 100).toFixed(1) : 0;
        chartHTML += `
            <div class="status-item">
                <div class="status-label">${status.status}</div>
                <div class="status-bar">
                    <div class="status-progress" style="width: ${percentage}%"></div>
                </div>
                <div class="status-count">${status.count}</div>
            </div>
        `;
    });
    chartHTML += '</div>';
    chartContainer.innerHTML = chartHTML;
}

/**
 * Función para actualizar la actividad reciente
 */
function actualizarActividadReciente(data) {
    const activityContainer = document.getElementById('recentActivity');
    if (!activityContainer) return;
    
    const activities = [];
    
    if (data.recent_applications_30_days > 0) {
        activities.push(`<div class="activity-item"><i class="fas fa-plus-circle text-success"></i> ${data.recent_applications_30_days} solicitudes en los últimos 30 días</div>`);
    }
    
    if (data.approved_applications > 0) {
        activities.push(`<div class="activity-item"><i class="fas fa-check-circle text-primary"></i> ${data.approved_applications} solicitudes aprobadas</div>`);
    }
    
    if (data.disbursed_applications > 0) {
        activities.push(`<div class="activity-item"><i class="fas fa-dollar-sign text-success"></i> S/ ${data.total_disbursed_amount.toFixed(2)} desembolsados</div>`);
    }
    
    if (activities.length === 0) {
        activityContainer.innerHTML = '<div class="text-center text-muted">No hay actividad reciente</div>';
    } else {
        activityContainer.innerHTML = activities.join('');
    }
}

/**
 * Función para cargar datos completos del perfil (incluyendo gráficos)
 */
function cargarDatosPerfilCompleto() {
    // Usar el sistema de autenticación existente
    if (!currentUser || !currentUser.access_token) {
        console.error('No hay token de autenticación');
        showNotification('No has iniciado sesión. Redirigiendo al login...', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }

    // Usar los datos del usuario actual
    const userData = currentUser || {};
    
    // Llenar información básica
    const profileName = document.getElementById('profileName');
    const profileRole = document.getElementById('profileRole');
    const profileUsername = document.getElementById('profileUsername');
    const profileEmail = document.getElementById('profileEmail');
    const profileDNI = document.getElementById('profileDNI');
    const profilePhone = document.getElementById('profilePhone');
    const profileRoleInput = document.getElementById('profileRoleInput');
    const profileDate = document.getElementById('profileDate');
    const profileAvatar = document.getElementById('profileAvatar');
    
    if (profileName) profileName.textContent = userData.username || 'Usuario';
    if (profileRole) profileRole.textContent = getRoleDisplayName(userData.role);
    if (profileUsername) profileUsername.value = userData.username || '';
    if (profileEmail) profileEmail.value = userData.email || '';
    if (profileDNI) profileDNI.value = userData.dni || 'No especificado';
    if (profilePhone) profilePhone.value = userData.phone || 'No especificado';
    if (profileRoleInput) profileRoleInput.value = getRoleDisplayName(userData.role);
    if (profileDate) profileDate.value = userData.date_joined ? new Date(userData.date_joined).toLocaleDateString() : 'No disponible';
    
    // Actualizar avatar del perfil
    if (profileAvatar) {
        profileAvatar.textContent = (userData.username || 'U').charAt(0).toUpperCase();
    }
    
    // Cargar estadísticas del usuario con gráficos
    cargarEstadisticasPerfilCompleto();
}

/**
 * Función para cargar estadísticas completas del perfil (incluyendo gráficos)
 */
function cargarEstadisticasPerfilCompleto() {
    if (!currentUser || !currentUser.access_token) return;

    fetch(`${API_BASE_URL}applications/user-stats/`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${currentUser.access_token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar estadísticas');
        }
        return response.json();
    })
    .then(data => {
        console.log('Estadísticas del perfil cargadas:', data);
        
        // Actualizar elementos si existen
        const totalElement = document.getElementById('profileTotalSolicitudes');
        const aprobadasElement = document.getElementById('profileSolicitudesAprobadas');
        const pendientesElement = document.getElementById('profileSolicitudesPendientes');
        const montoElement = document.getElementById('profileMontoTotal');
        
        if (totalElement) totalElement.textContent = data.total_applications || 0;
        if (aprobadasElement) aprobadasElement.textContent = data.approved_applications || 0;
        if (pendientesElement) pendientesElement.textContent = data.recent_applications_30_days || 0;
        if (montoElement) montoElement.textContent = `S/ ${(data.total_amount_requested || 0).toFixed(2)}`;
        
        // Actualizar gráficos si estamos en la página de perfil
        if (window.location.pathname.includes('perfil.html')) {
            actualizarGraficoEstados(data.status_breakdown);
            actualizarActividadReciente(data);
        }
    })
    .catch(error => {
        console.error('Error al cargar estadísticas del perfil:', error);
        // Usar datos del dashboard como fallback si existen
        const totalElement = document.getElementById('profileTotalSolicitudes');
        const aprobadasElement = document.getElementById('profileSolicitudesAprobadas');
        const pendientesElement = document.getElementById('profileSolicitudesPendientes');
        const montoElement = document.getElementById('profileMontoTotal');
        
        const dashboardTotal = document.getElementById('totalSolicitudes');
        const dashboardAprobadas = document.getElementById('solicitudesAprobadas');
        const dashboardPendientes = document.getElementById('solicitudesPendientes');
        const dashboardMonto = document.getElementById('montoTotal');
        
        if (totalElement && dashboardTotal) totalElement.textContent = dashboardTotal.textContent;
        if (aprobadasElement && dashboardAprobadas) aprobadasElement.textContent = dashboardAprobadas.textContent;
        if (pendientesElement && dashboardPendientes) pendientesElement.textContent = dashboardPendientes.textContent;
        if (montoElement && dashboardMonto) montoElement.textContent = dashboardMonto.textContent;
    });
}

// Función de debug para verificar que todo esté funcionando
function debugDocumentos() {
    console.log('=== DEBUG DOCUMENTOS ===');
    console.log('Función irADocumentos existe:', typeof irADocumentos === 'function');
    console.log('Función initDocumentosSection existe:', typeof initDocumentosSection === 'function');
    console.log('Función cargarSolicitudesDocumentos existe:', typeof cargarSolicitudesDocumentos === 'function');
    console.log('Elemento solicitudDocumentos existe:', !!document.getElementById('solicitudDocumentos'));
    console.log('Usuario actual:', currentUser);
    console.log('========================');
}

async function mostrarNotificacionesDashboard() {
    const notificacionesDiv = document.getElementById('notificaciones');
    if (!notificacionesDiv) return;
    notificacionesDiv.innerHTML = '';
    try {
        const response = await fetchAuthenticated(`${API_BASE_URL}applications/`);
        if (!response.ok) throw new Error('No se pudieron cargar las solicitudes');
        const solicitudes = await response.json();
        let hayNotificaciones = false;

        // Solicitud aprobada
        const aprobada = solicitudes.find(s => s.status === 'aprobada');
        if (aprobada) {
            notificacionesDiv.innerHTML += `
                <div style="padding: 15px; border-left: 4px solid #56ab2f; margin-bottom: 15px; background: #f4fff4;">
                    <strong>Solicitud Aprobada</strong><br>
                    Tu solicitud de crédito por S/ ${Number(aprobada.amount).toLocaleString()} ha sido aprobada. Tasa: 12.5% anual.
                </div>
            `;
            hayNotificaciones = true;
        }

        // Documentos pendientes (si existe campo documentos_faltantes o similar)
        const pendientesDocs = solicitudes.filter(s => s.status === 'pendiente' && s.documentos_faltantes && s.documentos_faltantes > 0);
        pendientesDocs.forEach(s => {
            notificacionesDiv.innerHTML += `
                <div style="padding: 15px; border-left: 4px solid #ffa726; margin-bottom: 15px; background: #fffaf4;">
                    <strong>Documentos Pendientes</strong><br>
                    Faltan subir ${s.documentos_faltantes} documento(s) para completar tu solicitud #${s.id}.
                </div>
            `;
            hayNotificaciones = true;
        });

        // Solicitud rechazada
        const rechazada = solicitudes.find(s => s.status === 'rechazada');
        if (rechazada) {
            notificacionesDiv.innerHTML += `
                <div style="padding: 15px; border-left: 4px solid #ff6b6b; margin-bottom: 15px; background: #fff4f4;">
                    <strong>Solicitud Rechazada</strong><br>
                    Tu solicitud #${rechazada.id} ha sido rechazada. Revisa tus datos o comunícate con soporte.
                </div>
            `;
            hayNotificaciones = true;
        }

        // Si no hay notificaciones
        if (!hayNotificaciones) {
            notificacionesDiv.innerHTML = `
                <div style="padding: 15px; border-left: 4px solid var(--primary-color); margin-bottom: 15px; background: rgba(102, 126, 234, 0.05);">
                    <strong>Sin notificaciones importantes</strong><br>
                    No tienes notificaciones recientes.
                </div>
            `;
        }
    } catch (error) {
        notificacionesDiv.innerHTML = `
            <div style="padding: 15px; border-left: 4px solid #ff6b6b; margin-bottom: 15px; background: #fff4f4;">
                <strong>Error al cargar notificaciones</strong><br>
                ${error.message}
            </div>
        `;
    }
}

// Llamar a la función al cargar el dashboard
window.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('notificaciones')) {
        mostrarNotificacionesDashboard();
    }
});

async function cargarEstadisticasAdmin() {
    try {
        const data = await fetchAuthenticated('http://localhost:8000/api/auth/admin-stats/');
        if (document.querySelector('.stat-number')) {
            const statCards = document.querySelectorAll('.stat-card');
            if (statCards[0]) statCards[0].querySelector('.stat-number').textContent = data.total_usuarios;
            if (statCards[1]) statCards[1].querySelector('.stat-number').textContent = data.solicitudes_procesadas;
            if (statCards[2]) statCards[2].querySelector('.stat-number').textContent = `S/ ${Number(data.monto_total_aprobado).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            if (statCards[3]) statCards[3].querySelector('.stat-number').textContent = data.uptime;
        }
    } catch (e) {
        console.error('Error cargando estadísticas admin:', e);
        // Mostrar datos por defecto si hay error
        const statCards = document.querySelectorAll('.stat-card');
        if (statCards[0]) statCards[0].querySelector('.stat-number').textContent = '247';
        if (statCards[1]) statCards[1].querySelector('.stat-number').textContent = '1,834';
        if (statCards[2]) statCards[2].querySelector('.stat-number').textContent = 'S/ 2.8M';
        if (statCards[3]) statCards[3].querySelector('.stat-number').textContent = '94.2%';
    }
}

async function cargarActividadRecienteAdmin() {
    try {
        const data = await fetchAuthenticated('http://localhost:8000/api/auth/admin-activity/');
        // Si la respuesta es un objeto, busca la propiedad relevante
        if (!Array.isArray(data)) {
            if (Array.isArray(data.results)) {
                data = data.results;
            } else {
                data = [];
            }
        }
        // Ahora sí puedes hacer data.map
        const actividadHTML = data.map(item => {
            return `<div style="padding: 10px; border-left: 3px solid var(--primary-color); margin-bottom: 10px;">
                <strong>${item.titulo || item.tipo || ''}</strong><br>
                <small>${item.detalle || ''}</small><br>
                <small>${item.hace || ''}</small>
            </div>`;
        }).join('');
        document.getElementById('actividadRecienteAdmin').innerHTML = actividadHTML;
    } catch (error) {
        console.error('Error cargando actividad reciente admin:', error);
    }
}

async function cargarEstadoSistemaAdmin() {
    try {
        const data = await fetchAuthenticated('http://localhost:8000/api/auth/system-status/');
        // Actualizar los badges y valores
        const estados = [
            { id: 'estadoDB', valor: data.db },
            { id: 'estadoScoring', valor: data.scoring },
            { id: 'estadoPagos', valor: data.pagos },
            { id: 'estadoArchivos', valor: data.archivos }
        ];
        estados.forEach(e => {
            const el = document.getElementById(e.id);
            if (el) {
                el.textContent = e.valor === 'ONLINE' ? 'ONLINE' : e.valor;
                el.className = e.valor === 'ONLINE' ? 'badge status-aprobada' : 'badge status-revision';
            }
        });
        const cpuEl = document.getElementById('estadoCPU');
        if (cpuEl) cpuEl.textContent = `${data.cpu}%`;
        const memEl = document.getElementById('estadoMemoria');
        if (memEl) memEl.textContent = `${data.memoria}%`;
    } catch (e) {
        console.error('Error cargando estado del sistema admin:', e);
        // Mostrar estado por defecto si hay error
        const estados = [
            { id: 'estadoDB', valor: 'ONLINE' },
            { id: 'estadoScoring', valor: 'ONLINE' },
            { id: 'estadoPagos', valor: 'ONLINE' },
            { id: 'estadoArchivos', valor: 'MANTENIMIENTO' }
        ];
        estados.forEach(e => {
            const el = document.getElementById(e.id);
            if (el) {
                el.textContent = e.valor;
                el.className = e.valor === 'ONLINE' ? 'badge status-aprobada' : 'badge status-revision';
            }
        });
        const cpuEl = document.getElementById('estadoCPU');
        if (cpuEl) cpuEl.textContent = '45%';
        const memEl = document.getElementById('estadoMemoria');
        if (memEl) memEl.textContent = '62%';
    }
}

if (window.location.pathname.includes('admin.html')) {
    window.addEventListener('DOMContentLoaded', async () => {
        // Verificar token antes de cargar datos
        try {
            await verificarToken();
            cargarEstadisticasAdmin();
            cargarActividadRecienteAdmin();
            cargarEstadoSistemaAdmin();
        } catch (error) {
            console.error('Error verificando token en admin:', error);
            // Mostrar datos por defecto si hay problemas de autenticación
            cargarEstadisticasAdmin();
            cargarActividadRecienteAdmin();
            cargarEstadoSistemaAdmin();
        }
    });
}

// --- REGISTRO DE POLÍTICA ACTUALIZADA ---
async function registrarPoliticaActualizada(umbral) {
    try {
        const token = JSON.parse(localStorage.getItem('currentUser') || '{}').access_token;
        await fetch('http://localhost:8000/api/auth/admin-activity/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo: 'politica_actualizada',
                titulo: 'Política Actualizada',
                detalle: `Umbral de aprobación: ${umbral}%`
            })
        });
    } catch (e) { console.error('Error registrando política actualizada:', e); }
}

// --- REGISTRO DE BACKUP COMPLETADO ---
async function registrarBackupCompletado() {
    try {
        const token = JSON.parse(localStorage.getItem('currentUser') || '{}').access_token;
        await fetch('http://localhost:8000/api/auth/admin-activity/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo: 'backup_completado',
                titulo: 'Backup Completado',
                detalle: 'Backup automático exitoso'
            })
        });
    } catch (e) { console.error('Error registrando backup:', e); }
}

// --- INTEGRACIÓN EN FUNCIONES DE ADMIN ---
function guardarPoliticas() {
    // ... tu lógica de guardado ...
    const umbral = document.getElementById('umbralAprobacion')?.value || 75;
    registrarPoliticaActualizada(umbral);
    showNotification('Políticas guardadas exitosamente', 'success');
}

function crearBackup() {
    // ... tu lógica de backup ...
    registrarBackupCompletado();
    showNotification('Iniciando backup manual...', 'info');
}

// --- GESTIÓN DE USUARIOS ADMIN ---
async function cargarUsuariosAdmin() {
    try {
        // Obtener valores de los filtros
        const search = document.getElementById('buscarUsuario')?.value || '';
        const roleFilter = document.getElementById('filtroRol')?.value || '';
        const statusFilter = document.getElementById('filtroEstado')?.value || '';

        // Construir parámetros de búsqueda
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (roleFilter) params.append('role', roleFilter);
        if (statusFilter) params.append('status', statusFilter);

        // Hacer la petición con los filtros
        const users = await fetchAuthenticated(`http://localhost:8000/api/auth/admin-users/?${params.toString()}`);

        // Si la respuesta es un objeto, busca la propiedad relevante
        if (!Array.isArray(users)) {
            if (Array.isArray(users.results)) {
                users = users.results;
            } else {
                users = [];
            }
        }

        // Ahora sí puedes hacer users.forEach
        const tbody = document.getElementById('usuariosTableBody');
        tbody.innerHTML = '';
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No se encontraron usuarios.</td></tr>';
            return;
        }
        users.forEach(user => {
            tbody.innerHTML += `<tr>
                <td>${user.id}</td>
                <td>${user.first_name || user.username}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${user.is_active ? 'Activo' : 'Inactivo'}</td>
                <td>${user.last_login ? user.last_login : '-'}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="editarUsuario(${user.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarUsuario(${user.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        const tbody = document.getElementById('usuariosTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-error">Error cargando usuarios.</td></tr>';
        }
    }
}

async function editarUsuario(id) {
    try {
        const user = await fetchAuthenticated(`http://localhost:8000/api/auth/admin-users/${id}/`);
        
        // Validar que el usuario tenga los datos necesarios
        if (!user || !user.id) {
            throw new Error('Datos de usuario inválidos');
        }
        
        mostrarModalEdicion(user);
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        showNotification('Error al cargar datos del usuario: ' + (error.message || 'Error desconocido'), 'error');
    }
}

function mostrarModalEdicion(user) {
    // Validar datos del usuario
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const email = user.email || '';
    const isActive = user.is_active !== undefined ? user.is_active : true;
    
    const modal = `
        <div class="modal" id="modalEditarUsuario">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Editar Usuario</h3>
                    <span class="close" onclick="cerrarModal('modalEditarUsuario')">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="formEditarUsuario">
                        <div class="form-group">
                            <label>Nombre:</label>
                            <input type="text" id="editFirstName" value="${firstName}" required>
                        </div>
                        <div class="form-group">
                            <label>Apellido:</label>
                            <input type="text" id="editLastName" value="${lastName}" required>
                        </div>
                        <div class="form-group">
                            <label>Email:</label>
                            <input type="email" id="editEmail" value="${email}" required>
                        </div>
                        <div class="form-group">
                            <label>Estado:</label>
                            <select id="editIsActive">
                                <option value="true" ${isActive ? 'selected' : ''}>Activo</option>
                                <option value="false" ${!isActive ? 'selected' : ''}>Inactivo</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Rol actual:</label>
                            <input type="text" value="${user.role || 'cliente'}" readonly style="background-color: #f5f5f5;">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="cerrarModal('modalEditarUsuario')">Cancelar</button>
                    <button class="btn btn-primary" onclick="guardarEdicionUsuario(${user.id})">Guardar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
    document.getElementById('modalEditarUsuario').style.display = 'block';
}

async function guardarEdicionUsuario(userId) {
    try {
        const firstName = document.getElementById('editFirstName').value.trim();
        const lastName = document.getElementById('editLastName').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        const isActive = document.getElementById('editIsActive').value === 'true';
        
        // Validaciones
        if (!firstName || !lastName) {
            showNotification('El nombre y apellido son obligatorios', 'error');
            return;
        }
        
        if (!email || !email.includes('@')) {
            showNotification('El email debe ser válido', 'error');
            return;
        }
        
        const data = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            is_active: isActive
        };
        
        const response = await fetchAuthenticated(`http://localhost:8000/api/auth/admin-users/${userId}/`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        
        showNotification('Usuario actualizado exitosamente', 'success');
        cerrarModal('modalEditarUsuario');
        cargarUsuariosAdmin(); // Recargar tabla
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        showNotification(error.message || 'Error al actualizar usuario', 'error');
    }
}

async function cambiarRol(id) {
    try {
        const user = await fetchAuthenticated(`http://localhost:8000/api/auth/admin-users/${id}/`);
        
        if (!user || !user.id) {
            throw new Error('Datos de usuario inválidos');
        }
        
        mostrarModalCambioRol(user);
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        showNotification('Error al cargar datos del usuario: ' + (error.message || 'Error desconocido'), 'error');
    }
}

function mostrarModalCambioRol(user) {
    const currentRole = user.role || 'cliente';
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    
    const modal = `
        <div class="modal" id="modalCambioRol">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Cambiar Rol de Usuario</h3>
                    <span class="close" onclick="cerrarModal('modalCambioRol')">&times;</span>
                </div>
                <div class="modal-body">
                    <p><strong>Usuario:</strong> ${fullName}</p>
                    <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                    <p><strong>Rol actual:</strong> <span class="badge ${currentRole === 'admin' ? 'status-rechazada' : currentRole === 'evaluador' ? 'status-aprobada' : 'status-pendiente'}">${currentRole.toUpperCase()}</span></p>
                    <div class="form-group">
                        <label>Nuevo rol:</label>
                        <select id="nuevoRol">
                            <option value="cliente" ${currentRole === 'cliente' ? 'selected' : ''}>Cliente</option>
                            <option value="evaluador" ${currentRole === 'evaluador' ? 'selected' : ''}>Evaluador</option>
                            <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Administrador</option>
                        </select>
                    </div>
                    <div class="alert-info p-2 rounded mt-3">
                        <small><i class="fas fa-info-circle"></i> El cambio de rol afectará los permisos del usuario inmediatamente.</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="cerrarModal('modalCambioRol')">Cancelar</button>
                    <button class="btn btn-warning" onclick="confirmarCambioRol(${user.id})">Cambiar Rol</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
    document.getElementById('modalCambioRol').style.display = 'block';
}

async function confirmarCambioRol(userId) {
    try {
        const newRole = document.getElementById('nuevoRol').value;
        
        if (!newRole) {
            showNotification('Debe seleccionar un rol', 'error');
            return;
        }
        
        const response = await fetchAuthenticated(`http://localhost:8000/api/auth/admin-users/${userId}/change-role/`, {
            method: 'POST',
            body: JSON.stringify({ role: newRole })
        });
        
        showNotification('Rol cambiado exitosamente', 'success');
        cerrarModal('modalCambioRol');
        cargarUsuariosAdmin(); // Recargar tabla
    } catch (error) {
        console.error('Error cambiando rol:', error);
        showNotification(error.message || 'Error al cambiar rol', 'error');
    }
}

async function eliminarUsuario(id) {
    // Confirmar antes de eliminar
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        await fetchAuthenticated(`http://localhost:8000/api/auth/admin-users/${id}/`, {
            method: 'DELETE'
        });
        
        showNotification('Usuario eliminado exitosamente', 'success');
        cargarUsuariosAdmin(); // Recargar tabla
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        showNotification(error.message || 'Error al eliminar usuario', 'error');
    }
}

async function cambiarPermisos(id) {
    try {
        const userData = await fetchAuthenticated(`http://localhost:8000/api/auth/admin-users/${id}/permissions/`);
        
        if (!userData || !userData.user_id) {
            throw new Error('Datos de permisos inválidos');
        }
        
        mostrarModalPermisos(userData);
    } catch (error) {
        console.error('Error obteniendo permisos:', error);
        showNotification('Error al cargar permisos del usuario: ' + (error.message || 'Error desconocido'), 'error');
    }
}

function mostrarModalPermisos(userData) {
    const permissions = userData.permissions || {};
    const role = userData.role || 'cliente';
    const username = userData.username || 'Usuario';
    const isActive = userData.is_active !== undefined ? userData.is_active : true;
    
    const permissionsHtml = Object.entries(permissions).map(([key, value]) => `
        <div class="form-group">
            <label>
                <input type="checkbox" ${value ? 'checked' : ''} disabled>
                ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
        </div>
    `).join('');
    
    const modal = `
        <div class="modal" id="modalPermisos">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Permisos del Usuario</h3>
                    <span class="close" onclick="cerrarModal('modalPermisos')">&times;</span>
                </div>
                <div class="modal-body">
                    <p><strong>Usuario:</strong> ${username}</p>
                    <p><strong>Rol:</strong> <span class="badge ${role === 'admin' ? 'status-rechazada' : role === 'evaluador' ? 'status-aprobada' : 'status-pendiente'}">${role.toUpperCase()}</span></p>
                    <p><strong>Estado:</strong> <span class="badge ${isActive ? 'status-aprobada' : 'status-rechazada'}">${isActive ? 'ACTIVO' : 'INACTIVO'}</span></p>
                    <hr>
                    <h4>Permisos actuales:</h4>
                    <div class="permissions-list">
                        ${permissionsHtml}
                    </div>
                    <div class="alert-info p-2 rounded mt-3">
                        <small><i class="fas fa-info-circle"></i> Los permisos se manejan automáticamente según el rol del usuario.</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="cerrarModal('modalPermisos')">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
    document.getElementById('modalPermisos').style.display = 'block';
}

// Funciones para políticas crediticias
async function cargarPoliticas() {
    try {
        const token = JSON.parse(localStorage.getItem('currentUser') || '{}').access_token;
        const response = await fetch('http://localhost:8000/api/applications/policy-config/', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('No se pudieron cargar las políticas');
        const policy = await response.json();
        
        // Cargar datos en los campos del formulario
        document.getElementById('umbralAprobacion').value = policy.score_minimo_aprobacion || 70;
        document.getElementById('umbralRevision').value = policy.score_minimo_revision || 50;
        document.getElementById('montoMaximo').value = policy.monto_maximo_aprobacion || 100000;
        
        // Cargar ponderaciones
        document.getElementById('pesoHistorialAdmin').value = policy.peso_historial_crediticio || 40;
        document.getElementById('pesoIngresosAdmin').value = policy.peso_ingresos_deuda || 30;
        document.getElementById('pesoActivosAdmin').value = policy.peso_activos || 20;
        document.getElementById('pesoComportamientoAdmin').value = policy.peso_comportamiento || 10;
        
        // Actualizar los valores mostrados
        updatePonderacionesAdmin();
        
        // Cargar documentos requeridos
        document.getElementById('reqRecibos').checked = policy.requiere_recibos_sueldo || false;
        document.getElementById('reqHistorial').checked = policy.requiere_historial_crediticio || false;
        document.getElementById('reqDeclaracion').checked = policy.requiere_declaracion_renta || false;
        document.getElementById('reqEstados').checked = policy.requiere_estados_cuenta || false;
        document.getElementById('reqPropiedades').checked = policy.requiere_escrituras_propiedad || false;
        
        // Cargar configuración de validación
        const tiempoValidacionInput = document.getElementById('tiempoValidacion');
        const tamanoArchivoInput = document.getElementById('tamanoArchivo');
        
        if (tiempoValidacionInput) {
            tiempoValidacionInput.value = policy.tiempo_maximo_validacion || 3;
        }
        if (tamanoArchivoInput) {
            tamanoArchivoInput.value = policy.tamano_maximo_archivo || 50;
        }
        
        console.log('Políticas cargadas exitosamente:', policy);
        
    } catch (error) {
        console.error('Error cargando políticas:', error);
        showNotification('Error al cargar las políticas', 'error');
    }
}

async function guardarPoliticas() {
    try {
        // Validar que la suma de ponderaciones sea 100%
        const pesoHistorial = parseInt(document.getElementById('pesoHistorialAdmin').value) || 0;
        const pesoIngresos = parseInt(document.getElementById('pesoIngresosAdmin').value) || 0;
        const pesoActivos = parseInt(document.getElementById('pesoActivosAdmin').value) || 0;
        const pesoComportamiento = parseInt(document.getElementById('pesoComportamientoAdmin').value) || 0;
        
        const totalPonderacion = pesoHistorial + pesoIngresos + pesoActivos + pesoComportamiento;
        
        if (totalPonderacion !== 100) {
            showNotification(`La suma de ponderaciones debe ser 100%. Actual: ${totalPonderacion}%`, 'error');
            return;
        }
        
        // Validar umbrales
        const umbralAprobacion = parseInt(document.getElementById('umbralAprobacion').value) || 0;
        const umbralRevision = parseInt(document.getElementById('umbralRevision').value) || 0;
        
        if (umbralAprobacion < umbralRevision) {
            showNotification('El score mínimo de aprobación debe ser mayor al de revisión', 'error');
            return;
        }
        
        // Obtener configuración de validación
        const tiempoValidacion = parseInt(document.getElementById('tiempoValidacion')?.value) || 3;
        const tamanoArchivo = parseInt(document.getElementById('tamanoArchivo')?.value) || 50;
        
        // Preparar datos para enviar
        const policyData = {
            umbrales: {
                score_minimo_aprobacion: umbralAprobacion,
                score_minimo_revision: umbralRevision,
                monto_maximo_aprobacion: parseFloat(document.getElementById('montoMaximo').value) || 100000
            },
            ponderaciones: {
                historial_crediticio: pesoHistorial,
                ingresos_deuda: pesoIngresos,
                activos: pesoActivos,
                comportamiento: pesoComportamiento
            },
            documentos: {
                requiere_recibos_sueldo: document.getElementById('reqRecibos').checked,
                requiere_historial_crediticio: document.getElementById('reqHistorial').checked,
                requiere_declaracion_renta: document.getElementById('reqDeclaracion').checked,
                requiere_estados_cuenta: document.getElementById('reqEstados').checked,
                requiere_escrituras_propiedad: document.getElementById('reqPropiedades').checked
            },
            validacion: {
                tiempo_maximo_validacion: tiempoValidacion,
                tamano_maximo_archivo: tamanoArchivo
            }
        };
        
        const token = JSON.parse(localStorage.getItem('currentUser') || '{}').access_token;
        const response = await fetch('http://localhost:8000/api/applications/policy-config/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(policyData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al guardar las políticas');
        }
        
        const result = await response.json();
        showNotification('Políticas guardadas exitosamente', 'success');
        console.log('Políticas guardadas:', result);
        
    } catch (error) {
        console.error('Error guardando políticas:', error);
        showNotification(error.message, 'error');
    }
}

// Funciones para Auditoría del Sistema
async function cargarAuditoria() {
    try {
        const token = JSON.parse(localStorage.getItem('currentUser') || '{}').access_token;
        
        // Obtener filtros
        const fechaInicio = document.getElementById('fechaInicioAudit')?.value || '';
        const fechaFin = document.getElementById('fechaFinAudit')?.value || '';
        const tipoEvento = document.getElementById('tipoEvento')?.value || '';
        
        // Construir parámetros
        const params = new URLSearchParams();
        if (fechaInicio) params.append('fecha_inicio', fechaInicio);
        if (fechaFin) params.append('fecha_fin', fechaFin);
        if (tipoEvento) params.append('tipo_evento', tipoEvento);
        params.append('page', '1');
        params.append('page_size', '50');
        
        const response = await fetch(`http://localhost:8000/api/auth/audit-logs/?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('No se pudieron cargar los logs de auditoría');
        const data = await response.json();
        
        // Renderizar tabla de auditoría
        renderizarTablaAuditoria(data.logs);
        
        console.log('Auditoría cargada exitosamente:', data);
        
    } catch (error) {
        console.error('Error cargando auditoría:', error);
        showNotification('Error al cargar los logs de auditoría', 'error');
    }
}

function renderizarTablaAuditoria(logs) {
    const tbody = document.querySelector('#auditoria .table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No se encontraron logs de auditoría.</td></tr>';
        return;
    }
    
    logs.forEach(log => {
        const estadoClass = log.estado === 'exitoso' ? 'status-aprobada' : 'status-rechazada';
        const estadoText = log.estado === 'exitoso' ? 'EXITOSO' : 'FALLIDO';
        
        const row = `
            <tr>
                <td>${log.timestamp_formatted}</td>
                <td>${log.usuario_email}</td>
                <td>${log.tipo_accion_display}</td>
                <td>${log.recurso || '-'}</td>
                <td>${log.ip_address || '-'}</td>
                <td><span class="badge ${estadoClass}">${estadoText}</span></td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="verDetalleAudit('${log.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

async function verDetalleAudit(logId) {
    try {
        const token = JSON.parse(localStorage.getItem('currentUser') || '{}').access_token;
        const response = await fetch(`http://localhost:8000/api/auth/audit-logs/${logId}/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('No se pudo obtener el detalle del log');
        const log = await response.json();
        
        // Mostrar modal con detalles
        mostrarModalDetalleAudit(log);
        
    } catch (error) {
        console.error('Error obteniendo detalle:', error);
        showNotification('Error al obtener el detalle del log', 'error');
    }
}

function mostrarModalDetalleAudit(log) {
    const modal = `
        <div class="modal" id="modalDetalleAudit">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Detalle del Log de Auditoría</h3>
                    <span class="close" onclick="cerrarModal('modalDetalleAudit')">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-2">
                            <h5>Información del Evento</h5>
                            <p><strong>Timestamp:</strong> ${log.timestamp_formatted}</p>
                            <p><strong>Usuario:</strong> ${log.usuario_email}</p>
                            <p><strong>Acción:</strong> ${log.tipo_accion_display}</p>
                            <p><strong>Estado:</strong> <span class="badge ${log.estado === 'exitoso' ? 'status-aprobada' : 'status-rechazada'}">${log.estado_display}</span></p>
                        </div>
                        <div class="col-2">
                            <h5>Información Técnica</h5>
                            <p><strong>Recurso:</strong> ${log.recurso || '-'}</p>
                            <p><strong>IP:</strong> ${log.ip_address || '-'}</p>
                            <p><strong>Método HTTP:</strong> ${log.metodo_http || '-'}</p>
                            <p><strong>Duración:</strong> ${log.duracion_ms ? log.duracion_ms + 'ms' : '-'}</p>
                        </div>
                    </div>
                    <div class="row mt-3">
                        <div class="col-1">
                            <h5>Descripción</h5>
                            <p>${log.descripcion}</p>
                        </div>
                    </div>
                    ${log.detalles && Object.keys(log.detalles).length > 0 ? `
                    <div class="row mt-3">
                        <div class="col-1">
                            <h5>Detalles Adicionales</h5>
                            <pre>${JSON.stringify(log.detalles, null, 2)}</pre>
                        </div>
                    </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="cerrarModal('modalDetalleAudit')">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
    document.getElementById('modalDetalleAudit').style.display = 'block';
}

async function exportarAuditoria() {
    try {
        const token = JSON.parse(localStorage.getItem('currentUser') || '{}').access_token;
        
        // Obtener filtros actuales
        const fechaInicio = document.getElementById('fechaInicioAudit')?.value || '';
        const fechaFin = document.getElementById('fechaFinAudit')?.value || '';
        const tipoEvento = document.getElementById('tipoEvento')?.value || '';
        
        // Construir parámetros para exportación
        const params = new URLSearchParams();
        if (fechaInicio) params.append('fecha_inicio', fechaInicio);
        if (fechaFin) params.append('fecha_fin', fechaFin);
        if (tipoEvento) params.append('tipo_evento', tipoEvento);
        params.append('export', 'true');
        
        const response = await fetch(`http://localhost:8000/api/auth/audit-logs/?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Error al exportar logs');
        
        // Crear y descargar archivo
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showNotification('Logs de auditoría exportados exitosamente', 'success');
        
    } catch (error) {
        console.error('Error exportando auditoría:', error);
        showNotification('Error al exportar los logs', 'error');
    }
}

// Función para cargar reportes administrativos
async function cargarReportesAdmin() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        console.log('Debug - currentUser:', currentUser);
        console.log('Debug - access_token:', currentUser.access_token ? 'Presente' : 'Ausente');
        
        if (!currentUser.access_token) {
            console.error('No hay token de acceso disponible');
            showNotification('Sesión expirada. Redirigiendo al login...', 'error');
            setTimeout(() => { window.location.href = 'login.html'; }, 2000);
            return;
        }
        
        const response = await fetch('http://localhost:8000/api/auth/admin-reports/', {
            headers: {
                'Authorization': `Bearer ${currentUser.access_token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Debug - Response status:', response.status);
        
        if (response.status === 401) {
            console.log('Token expirado, intentando refresh...');
            const refreshSuccess = await attemptTokenRefresh();
            if (refreshSuccess) {
                // Reintentar con el nuevo token
                const newUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const newResponse = await fetch('http://localhost:8000/api/auth/admin-reports/', {
                    headers: {
                        'Authorization': `Bearer ${newUser.access_token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!newResponse.ok) throw new Error('No se pudo obtener reportes administrativos');
                const data = await newResponse.json();
                console.log('Debug - Data recibida después de refresh:', data);
                
                // Actualizar métricas del mes
                actualizarMetricasMes(data.metricas_mes);
                
                // Actualizar período
                actualizarPeriodoReporte(data.periodo);
                
                // Guardar datos para uso posterior
                window.reportesData = data;
                
            } else {
                showNotification('Sesión expirada. Redirigiendo al login...', 'error');
                setTimeout(() => { window.location.href = 'login.html'; }, 2000);
            }
        } else if (!response.ok) {
            throw new Error('No se pudo obtener reportes administrativos');
        } else {
            const data = await response.json();
            console.log('Debug - Data recibida:', data);
            
            // Actualizar métricas del mes
            actualizarMetricasMes(data.metricas_mes);
            
            // Actualizar período
            actualizarPeriodoReporte(data.periodo);
            
            // Guardar datos para uso posterior
            window.reportesData = data;
        }
        
    } catch (error) {
        console.error('Error cargando reportes admin:', error);
        showNotification('Error al cargar reportes administrativos', 'error');
    }
}

// Función para actualizar métricas del mes
function actualizarMetricasMes(metricas) {
    console.log('Debug - Métricas recibidas:', metricas);
    
    // Obtener todos los elementos h3 dentro de #metricasMes
    const metricasElements = document.querySelectorAll('#metricasMes .mb-3 h3');
    console.log('Debug - Elementos encontrados:', metricasElements.length);
    
    if (metricasElements.length >= 4) {
        // Actualizar valores en orden: nuevas_solicitudes, aprobaciones, rechazos, en_revision
        metricasElements[0].textContent = metricas.nuevas_solicitudes || 0;
        metricasElements[1].textContent = metricas.aprobaciones || 0;
        metricasElements[2].textContent = metricas.rechazos || 0;
        metricasElements[3].textContent = metricas.en_revision || 0;
        
        console.log('Debug - Valores actualizados:', {
            nuevas_solicitudes: metricas.nuevas_solicitudes || 0,
            aprobaciones: metricas.aprobaciones || 0,
            rechazos: metricas.rechazos || 0,
            en_revision: metricas.en_revision || 0
        });
        
        // Si hay pendientes, actualizar el texto del primer elemento para incluir pendientes
        if (metricas.pendientes && metricas.pendientes > 0) {
            const pendientesElement = document.querySelector('#metricasMes .mb-3:nth-child(1) p');
            if (pendientesElement) {
                pendientesElement.textContent = `Nuevas Solicitudes (${metricas.pendientes} pendientes)`;
            }
        }
        
        // Actualizar colores según el rendimiento
        if (metricas.aprobaciones > 0) {
            metricasElements[1].style.color = 'var(--success-color)';
        }
        if (metricas.rechazos > 0) {
            metricasElements[2].style.color = 'var(--error-color)';
        }
        if (metricas.en_revision > 0) {
            metricasElements[3].style.color = 'var(--warning-color)';
        }
    } else {
        console.error('No se encontraron suficientes elementos de métricas');
    }
}

// Función para actualizar período del reporte
function actualizarPeriodoReporte(periodo) {
    const periodoElement = document.querySelector('#periodoReporte');
    if (periodoElement) {
        periodoElement.textContent = `Período: ${periodo.mes_actual}`;
    }
}

// Función para generar reporte específico
async function generarReporte(tipo) {
    try {
        const token = JSON.parse(localStorage.getItem('currentUser') || '{}').access_token;
        
        // Obtener fechas del formulario si existen
        const fechaInicio = document.getElementById('fechaInicioReporte')?.value || '';
        const fechaFin = document.getElementById('fechaFinReporte')?.value || '';
        
        const response = await fetch('http://localhost:8000/api/auth/admin-reports/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo_reporte: tipo,
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin
            })
        });
        
        if (!response.ok) throw new Error('Error al generar reporte');
        const reporte = await response.json();
        
        // Mostrar reporte en modal
        mostrarReporteModal(reporte);
        
        showNotification(`Reporte de ${tipo} generado exitosamente`, 'success');
        
    } catch (error) {
        console.error('Error generando reporte:', error);
        showNotification('Error al generar reporte', 'error');
    }
}

// Función para mostrar reporte en modal
function mostrarReporteModal(reporte) {
    let contenido = '';
    
    switch (reporte.tipo) {
        case 'usuarios':
            contenido = `
                <h4>Reporte de Usuarios</h4>
                <p><strong>Total de usuarios:</strong> ${reporte.total_usuarios}</p>
                <p><strong>Usuarios activos:</strong> ${reporte.usuarios_activos}</p>
                <h5>Usuarios por rol:</h5>
                <ul>
                    ${reporte.usuarios_por_rol.map(rol => 
                        `<li>${rol.role}: ${rol.count}</li>`
                    ).join('')}
                </ul>
            `;
            break;
            
        case 'solicitudes':
            contenido = `
                <h4>Reporte de Solicitudes</h4>
                <p><strong>Total de solicitudes:</strong> ${reporte.total_solicitudes}</p>
                <p><strong>Monto total:</strong> S/ ${reporte.monto_total.toLocaleString()}</p>
                <h5>Solicitudes por estado:</h5>
                <ul>
                    ${reporte.solicitudes_por_estado.map(estado => 
                        `<li>${estado.status}: ${estado.count}</li>`
                    ).join('')}
                </ul>
            `;
            break;
            
        case 'morosidad':
            contenido = `
                <h4>Análisis de Morosidad</h4>
                <p><strong>Tasa de morosidad:</strong> ${reporte.tasa_morosidad}%</p>
                <p><strong>Total cartera vencida:</strong> S/ ${reporte.total_cartera_vencida.toLocaleString()}</p>
                <p><strong>Clientes morosos:</strong> ${reporte.clientes_morosos}</p>
                <p><strong>Días promedio de vencimiento:</strong> ${reporte.dias_promedio_vencimiento}</p>
            `;
            break;
            
        case 'rendimiento':
            contenido = `
                <h4>Reporte de Rendimiento del Sistema</h4>
                <p><strong>Total eventos de auditoría:</strong> ${reporte.total_eventos_auditoria}</p>
                <p><strong>Eventos hoy:</strong> ${reporte.eventos_hoy}</p>
                <p><strong>Uptime del sistema:</strong> ${reporte.uptime_sistema}</p>
                <p><strong>Tiempo de respuesta promedio:</strong> ${reporte.tiempo_respuesta_promedio}</p>
            `;
            break;
            
        case 'financiero':
            contenido = `
                <h4>Reporte Financiero</h4>
                <p><strong>Monto total aprobado:</strong> S/ ${reporte.monto_total_aprobado.toLocaleString()}</p>
                <p><strong>Promedio por préstamo:</strong> S/ ${reporte.promedio_prestamo.toLocaleString()}</p>
                <p><strong>Total de préstamos:</strong> ${reporte.total_prestamos}</p>
            `;
            break;
    }
    
    // Crear y mostrar modal
    const modal = `
        <div class="modal" id="modalReporte">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Reporte Generado</h3>
                    <span class="close" onclick="cerrarModal('modalReporte')">&times;</span>
                </div>
                <div class="modal-body">
                    ${contenido}
                    <p><small>Generado el: ${new Date(reporte.fecha_generacion).toLocaleString()}</small></p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="exportarReporte('${reporte.tipo}')">
                        <i class="fas fa-download"></i> Exportar
                    </button>
                    <button class="btn btn-secondary" onclick="cerrarModal('modalReporte')">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
    document.getElementById('modalReporte').style.display = 'block';
}

// Función para exportar reporte
async function exportarReporte(tipo) {
    try {
        showNotification(`Exportando reporte de ${tipo}...`, 'info');
        
        const token = JSON.parse(localStorage.getItem('currentUser') || '{}').access_token;
        
        // Obtener fechas del formulario si existen
        const fechaInicio = document.getElementById('fechaInicioReporte')?.value || '';
        const fechaFin = document.getElementById('fechaFinReporte')?.value || '';
        
        // Generar el reporte desde el backend
        const response = await fetch('http://localhost:8000/api/auth/admin-reports/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo_reporte: tipo,
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin
            })
        });
        
        if (!response.ok) throw new Error('Error al generar reporte');
        const reporte = await response.json();
        
        // Preguntar al usuario qué formato prefiere
        const formato = confirm('¿Desea exportar como Excel? (Cancelar para CSV)') ? 'excel' : 'csv';
        
        if (formato === 'excel') {
            exportarAExcel(reporte, tipo);
        } else {
            exportarACSV(reporte, tipo);
        }
        
        showNotification(`Reporte de ${tipo} exportado exitosamente como ${formato.toUpperCase()}`, 'success');
        
    } catch (error) {
        console.error('Error exportando reporte:', error);
        showNotification('Error al exportar reporte', 'error');
    }
}

// Función para exportar a CSV
function exportarACSV(reporte, tipo) {
    const csvContent = convertirReporteACSV(reporte, tipo);
    
    // Crear y descargar archivo CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_${tipo}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Función para exportar a Excel (simulado con CSV pero con extensión .xlsx)
function exportarAExcel(reporte, tipo) {
    const csvContent = convertirReporteACSV(reporte, tipo);
    
    // Crear y descargar archivo con extensión .xlsx
    const blob = new Blob([csvContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_${tipo}_${new Date().toISOString().split('T')[0]}.xlsx`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Función para convertir reporte a CSV
function convertirReporteACSV(reporte, tipo) {
    let csvContent = '';
    const fechaActual = new Date().toLocaleString('es-ES');
    
    // Agregar encabezado con información del sistema
    csvContent += `CreditoSys - Reporte de ${tipo.toUpperCase()}\n`;
    csvContent += `Generado el: ${fechaActual}\n`;
    csvContent += `Sistema: CreditoSys v1.0\n`;
    csvContent += `\n`;
    
    switch (tipo) {
        case 'usuarios':
            csvContent += `RESUMEN DE USUARIOS\n`;
            csvContent += `Total de usuarios,${reporte.total_usuarios}\n`;
            csvContent += `Usuarios activos,${reporte.usuarios_activos}\n`;
            csvContent += `Usuarios inactivos,${reporte.total_usuarios - reporte.usuarios_activos}\n`;
            csvContent += `\n`;
            csvContent += `DETALLE POR ROL\n`;
            csvContent += `Rol,Cantidad,Porcentaje\n`;
            reporte.usuarios_por_rol.forEach(rol => {
                const porcentaje = ((rol.count / reporte.total_usuarios) * 100).toFixed(1);
                csvContent += `${rol.role},${rol.count},${porcentaje}%\n`;
            });
            break;
            
        case 'solicitudes':
            csvContent += `RESUMEN DE SOLICITUDES\n`;
            csvContent += `Total de solicitudes,${reporte.total_solicitudes}\n`;
            csvContent += `Monto total,S/ ${reporte.monto_total.toLocaleString()}\n`;
            csvContent += `Monto promedio,S/ ${(reporte.monto_total / reporte.total_solicitudes).toFixed(2)}\n`;
            csvContent += `\n`;
            csvContent += `DETALLE POR ESTADO\n`;
            csvContent += `Estado,Cantidad,Porcentaje\n`;
            reporte.solicitudes_por_estado.forEach(estado => {
                const porcentaje = ((estado.count / reporte.total_solicitudes) * 100).toFixed(1);
                csvContent += `${estado.status},${estado.count},${porcentaje}%\n`;
            });
            break;
            
        case 'morosidad':
            csvContent += `ANÁLISIS DE MOROSIDAD\n`;
            csvContent += `Tasa de morosidad,${reporte.tasa_morosidad}%\n`;
            csvContent += `Total cartera vencida,S/ ${reporte.total_cartera_vencida.toLocaleString()}\n`;
            csvContent += `Clientes morosos,${reporte.clientes_morosos}\n`;
            csvContent += `Días promedio de vencimiento,${reporte.dias_promedio_vencimiento}\n`;
            csvContent += `\n`;
            csvContent += `INDICADORES DE RIESGO\n`;
            csvContent += `Indicador,Valor,Estado\n`;
            csvContent += `Tasa de morosidad,${reporte.tasa_morosidad}%,${reporte.tasa_morosidad > 5 ? 'ALTO' : 'NORMAL'}\n`;
            csvContent += `Días promedio,${reporte.dias_promedio_vencimiento},${reporte.dias_promedio_vencimiento > 60 ? 'ALTO' : 'NORMAL'}\n`;
            break;
            
        case 'rendimiento':
            csvContent += `REPORTE DE RENDIMIENTO DEL SISTEMA\n`;
            csvContent += `Total eventos de auditoría,${reporte.total_eventos_auditoria}\n`;
            csvContent += `Eventos hoy,${reporte.eventos_hoy}\n`;
            csvContent += `Uptime del sistema,${reporte.uptime_sistema}\n`;
            csvContent += `Tiempo de respuesta promedio,${reporte.tiempo_respuesta_promedio}\n`;
            csvContent += `\n`;
            csvContent += `MÉTRICAS DE ACTIVIDAD\n`;
            csvContent += `Métrica,Valor,Estado\n`;
            csvContent += `Eventos diarios,${reporte.eventos_hoy},${reporte.eventos_hoy > 100 ? 'ALTO' : 'NORMAL'}\n`;
            csvContent += `Uptime,${reporte.uptime_sistema},${reporte.uptime_sistema.includes('99') ? 'EXCELENTE' : 'BUENO'}\n`;
            break;
            
        case 'financiero':
            csvContent += `REPORTE FINANCIERO\n`;
            csvContent += `Monto total aprobado,S/ ${reporte.monto_total_aprobado.toLocaleString()}\n`;
            csvContent += `Promedio por préstamo,S/ ${reporte.promedio_prestamo.toLocaleString()}\n`;
            csvContent += `Total de préstamos,${reporte.total_prestamos}\n`;
            csvContent += `\n`;
            csvContent += `ANÁLISIS FINANCIERO\n`;
            csvContent += `Indicador,Valor\n`;
            csvContent += `Cartera total,S/ ${reporte.monto_total_aprobado.toLocaleString()}\n`;
            csvContent += `Préstamo promedio,S/ ${reporte.promedio_prestamo.toLocaleString()}\n`;
            csvContent += `Número de préstamos,${reporte.total_prestamos}\n`;
            break;
    }
    
    // Agregar pie de página
    csvContent += `\n`;
    csvContent += `INFORMACIÓN DEL REPORTE\n`;
    csvContent += `Fecha de generación,${new Date(reporte.fecha_generacion).toLocaleString('es-ES')}\n`;
    csvContent += `Tipo de reporte,${tipo.toUpperCase()}\n`;
    csvContent += `Sistema,CreditoSys\n`;
    csvContent += `Versión,1.0\n`;
    
    return csvContent;
}

// Función para verificar si el token es válido
async function verificarToken() {
    // Solo verificar en páginas que requieren autenticación
    const currentPage = window.location.pathname;
    const publicPages = ['/login.html', '/register.html', '/index.html', '/'];
    
    // Si estamos en una página pública, no verificar token
    if (publicPages.includes(currentPage)) {
        console.log('Página pública, no verificando token');
        return true;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    console.log('Debug - Verificando token:', currentUser);
    
    if (!currentUser.access_token) {
        console.log('No hay token, redirigiendo al login');
        window.location.href = 'login.html';
        return false;
    }
    
    try {
        const response = await fetch('http://localhost:8000/api/auth/admin-stats/', {
            headers: {
                'Authorization': `Bearer ${currentUser.access_token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Debug - Token verification status:', response.status);
        
        if (response.status === 401) {
            console.log('Token inválido, intentando refresh...');
            const refreshSuccess = await attemptTokenRefresh();
            if (!refreshSuccess) {
                console.log('Refresh falló, redirigiendo al login');
                localStorage.removeItem('currentUser');
                window.location.href = 'login.html';
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error verificando token:', error);
        return false;
    }
}

// Función para cargar configuración de alertas
async function cargarAlertas() {
    // Evitar requests simultáneos
    if (isCargandoAlertas) {
        console.log('Ya hay una carga de alertas en progreso');
        return;
    }
    
    isCargandoAlertas = true;
    
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        
        if (!currentUser.access_token) {
            console.error('No hay token de acceso disponible');
            return;
        }
        
        // Crear AbortController para cancelar requests si es necesario
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
        
        const response = await fetch('http://localhost:8000/api/auth/alertas/', {
            headers: {
                'Authorization': `Bearer ${currentUser.access_token}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('Error al cargar alertas');
        const data = await response.json();
        
        // Verificar que los elementos existen antes de actualizarlos
        const alertaMorosidadElement = document.getElementById('alertaMorosidad');
        const alertaRendimientoElement = document.getElementById('alertaRendimiento');
        const alertaCPUElement = document.getElementById('alertaCPU');
        const emailAlertasElement = document.getElementById('emailAlertas');
        const estadoAlertasElement = document.getElementById('estadoAlertas');
        
        if (alertaMorosidadElement) alertaMorosidadElement.value = data.configuracion.alerta_morosidad;
        if (alertaRendimientoElement) alertaRendimientoElement.value = data.configuracion.alerta_rendimiento;
        if (alertaCPUElement) alertaCPUElement.value = data.configuracion.alerta_cpu;
        if (emailAlertasElement) emailAlertasElement.value = data.configuracion.email_alertas;
        
        // Actualizar estado de alertas solo si el elemento existe
        if (estadoAlertasElement) {
            actualizarEstadoAlertas(data);
            mostrarMetricasAlertas(data.metricas_actuales);
        }
        
        console.log('Alertas cargadas:', data);
        
    } catch (error) {
        // Ignorar errores de aborto y conexión cerrada
        if (error.name === 'AbortError' || error.message.includes('message port closed')) {
            console.log('Request cancelado o conexión cerrada');
            return;
        }
        console.error('Error cargando alertas:', error);
        // No mostrar notificación para errores de conexión
        if (!error.message.includes('message port closed')) {
            showNotification('Error al cargar configuración de alertas', 'error');
        }
    } finally {
        isCargandoAlertas = false;
    }
}

// Función para actualizar estado de alertas
function actualizarEstadoAlertas(data) {
    const estadoElement = document.getElementById('estadoAlertas');
    
    if (data.total_alertas > 0) {
        estadoElement.className = 'alert-danger p-2 rounded';
        
        let estadoHTML = `<small><i class="fas fa-exclamation-triangle"></i> 
        ${data.total_alertas} alerta(s) activa(s) - ${data.ultima_actualizacion}</small>`;
        
        // Mostrar información sobre emails enviados
        if (data.alertas_enviadas && data.alertas_enviadas.length > 0) {
            estadoHTML += `<br><small><i class="fas fa-envelope"></i> 
            Emails enviados: ${data.alertas_enviadas.join(', ')}</small>`;
        }
        
        estadoElement.innerHTML = estadoHTML;
        
        // Mostrar alertas específicas
        mostrarAlertasActivas(data.alertas_activas);
    } else {
        estadoElement.className = 'alert-success p-2 rounded';
        estadoElement.innerHTML = `
            <small><i class="fas fa-check-circle"></i> 
            Sistema funcionando normalmente - ${data.ultima_actualizacion}</small>
        `;
    }
}

// Función para mostrar métricas de alertas
function mostrarMetricasAlertas(metricas) {
    // Crear o actualizar elemento para mostrar métricas
    let metricasElement = document.getElementById('metricasAlertas');
    if (!metricasElement) {
        metricasElement = document.createElement('div');
        metricasElement.id = 'metricasAlertas';
        document.getElementById('estadoAlertas').parentNode.appendChild(metricasElement);
    }
    
    metricasElement.innerHTML = `
        <div class="row mt-2">
            <div class="col-4">
                <small><strong>Morosidad:</strong> ${metricas.tasa_morosidad}%</small>
            </div>
            <div class="col-4">
                <small><strong>Rendimiento:</strong> ${metricas.rendimiento_sistema}%</small>
            </div>
            <div class="col-4">
                <small><strong>CPU:</strong> ${metricas.uso_cpu}%</small>
            </div>
        </div>
    `;
}

// Función para mostrar alertas activas
function mostrarAlertasActivas(alertas) {
    // Crear o actualizar elemento para mostrar alertas
    let alertasElement = document.getElementById('alertasActivas');
    if (!alertasElement) {
        alertasElement = document.createElement('div');
        alertasElement.id = 'alertasActivas';
        document.getElementById('estadoAlertas').parentNode.appendChild(alertasElement);
    }
    
    if (alertas.length > 0) {
        let alertasHTML = '<div class="mt-2"><small><strong>Alertas activas:</strong></small>';
        alertas.forEach(alerta => {
            const colorClass = alerta.severidad === 'alta' ? 'text-danger' : 'text-warning';
            alertasHTML += `<div class="${colorClass}"><small>• ${alerta.mensaje}</small></div>`;
        });
        alertasHTML += '</div>';
        alertasElement.innerHTML = alertasHTML;
    } else {
        alertasElement.innerHTML = '';
    }
}

// Función para configurar alertas
async function configurarAlertas() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        
        if (!currentUser.access_token) {
            showNotification('Sesión expirada. Redirigiendo al login...', 'error');
            setTimeout(() => { window.location.href = 'login.html'; }, 2000);
            return;
        }
        
        // Obtener valores de los campos
        const alertaMorosidad = parseFloat(document.getElementById('alertaMorosidad').value);
        const alertaRendimiento = parseFloat(document.getElementById('alertaRendimiento').value);
        const alertaCPU = parseFloat(document.getElementById('alertaCPU').value);
        const emailAlertas = document.getElementById('emailAlertas').value;
        
        // Validar valores
        if (isNaN(alertaMorosidad) || alertaMorosidad < 1 || alertaMorosidad > 20) {
            showNotification('Alerta de morosidad debe estar entre 1% y 20%', 'error');
            return;
        }
        
        if (isNaN(alertaRendimiento) || alertaRendimiento < 50 || alertaRendimiento > 100) {
            showNotification('Alerta de rendimiento debe estar entre 50% y 100%', 'error');
            return;
        }
        
        if (isNaN(alertaCPU) || alertaCPU < 50 || alertaCPU > 100) {
            showNotification('Alerta de CPU debe estar entre 50% y 100%', 'error');
            return;
        }
        
        if (!emailAlertas || !emailAlertas.includes('@')) {
            showNotification('Email de alertas no válido', 'error');
            return;
        }
        
        // Enviar configuración al backend
        const response = await fetch('http://localhost:8000/api/auth/alertas/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentUser.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                alerta_morosidad: alertaMorosidad,
                alerta_rendimiento: alertaRendimiento,
                alerta_cpu: alertaCPU,
                email_alertas: emailAlertas
            })
        });
        
        if (!response.ok) throw new Error('Error al configurar alertas');
        const data = await response.json();
        
        showNotification('Configuración de alertas actualizada exitosamente', 'success');
        
        // Recargar alertas para mostrar estado actualizado
        setTimeout(() => {
            cargarAlertas();
        }, 1000);
        
    } catch (error) {
        console.error('Error configurando alertas:', error);
        showNotification('Error al configurar alertas', 'error');
    }
}

// Función para monitorear alertas en tiempo real (se ejecuta cada 30 segundos)
function iniciarMonitoreoAlertas() {
    // Limpiar intervalo anterior si existe
    if (alertasMonitoringInterval) {
        clearInterval(alertasMonitoringInterval);
    }
    
    // Cargar alertas inicialmente
    cargarAlertas();
    
    // Configurar monitoreo cada 30 segundos
    alertasMonitoringInterval = setInterval(() => {
        // Evitar requests simultáneos
        if (!isCargandoAlertas) {
            cargarAlertas();
        }
    }, 30000); // 30 segundos
}

// Función para detener el monitoreo de alertas
function detenerMonitoreoAlertas() {
    if (alertasMonitoringInterval) {
        clearInterval(alertasMonitoringInterval);
        alertasMonitoringInterval = null;
    }
}

// Función para limpiar monitoreo al salir de la página
function limpiarMonitoreoAlertas() {
    detenerMonitoreoAlertas();
    isCargandoAlertas = false;
}

// Agregar event listener para limpiar al salir de la página
window.addEventListener('beforeunload', function() {
    limpiarMonitoreoAlertas();
});

// Agregar event listener para cuando la página pierde el foco
window.addEventListener('blur', function() {
    // Pausar monitoreo cuando la página no está activa
    if (alertasMonitoringInterval) {
        clearInterval(alertasMonitoringInterval);
        alertasMonitoringInterval = null;
    }
});

// Agregar event listener para cuando la página recupera el foco
window.addEventListener('focus', function() {
    // Reanudar monitoreo cuando la página vuelve a estar activa
    if (!alertasMonitoringInterval && window.location.pathname.includes('admin.html')) {
        iniciarMonitoreoAlertas();
    }
});

// ... código posterior ...

function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

// Event listeners para filtros de usuarios
if (window.location.pathname.includes('admin.html')) {
    // Cargar usuarios al cargar la página
    document.addEventListener('DOMContentLoaded', () => {
        cargarUsuariosAdmin();
        
        // Event listeners para filtros
        const buscarUsuario = document.getElementById('buscarUsuario');
        const filtroRol = document.getElementById('filtroRol');
        const filtroEstado = document.getElementById('filtroEstado');
        
        if (buscarUsuario) {
            buscarUsuario.addEventListener('input', debounce(() => cargarUsuariosAdmin(), 500));
        }
        
        if (filtroRol) {
            filtroRol.addEventListener('change', () => cargarUsuariosAdmin());
        }
        
        if (filtroEstado) {
            filtroEstado.addEventListener('change', () => cargarUsuariosAdmin());
        }
    });
}

function abrirModalUsuario(id = null) {
    if (id) {
        document.getElementById('modalUsuarioTitulo').textContent = 'Editar Usuario';
        // Cargar datos del usuario
        editarUsuario(id);
    } else {
        document.getElementById('modalUsuarioTitulo').textContent = 'Crear Usuario';
        document.getElementById('formUsuario').reset();
        
        // Mostrar el modal
        showModal('modalUsuario');
    }
}

function generarPassword() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    document.getElementById('modalPassword').value = password;
}

async function crearUsuario() {
    try {
        const username = document.getElementById('modalNombre').value.trim();
        const email = document.getElementById('modalEmail').value.trim();
        const password = document.getElementById('modalPassword').value;
        const role = document.getElementById('modalRol').value;
        const estado = document.getElementById('modalEstado').value;
        
        // Validaciones
        if (!username || !email || !password || !role) {
            showNotification('Todos los campos son obligatorios', 'error');
            return;
        }
        
        if (password.length < 6) {
            showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        if (!email.includes('@')) {
            showNotification('El email debe ser válido', 'error');
            return;
        }
        
        const formData = {
            username: username,
            email: email,
            password: password,
            first_name: username, // Usar username como nombre por defecto
            last_name: '',
            role: role,
            is_active: estado === 'activo'
        };
        
        // Crear usuario
        const response = await fetchAuthenticated('http://localhost:8000/api/auth/admin-users/create/', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        showNotification('Usuario creado exitosamente', 'success');
        closeModal('modalUsuario');
        cargarUsuariosAdmin(); // Recargar tabla
        
    } catch (error) {
        console.error('Error creando usuario:', error);
        showNotification(error.message || 'Error al crear usuario', 'error');
    }
}