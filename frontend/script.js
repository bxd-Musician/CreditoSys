/* ============================================================================
   CREDITOSYS - JAVASCRIPT CENTRALIZADO ARREGLADO
   Sistema de Gestión de Créditos
   ============================================================================ */

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================
let currentUser = null; // Almacenará los datos del usuario logueado, incluyendo tokens
let isLoading = false;
const API_BASE_URL = 'http://localhost:8000/api/auth/'; // URL base de tus APIs de autenticación

// ============================================================================
// UTILIDADES GENERALES
// ============================================================================

// Mostrar notificación
function showNotification(message, type = 'info', duration = 4000) {
    const notification = document.getElementById('notification') || createNotification();
    const notificationText = notification.querySelector('#notificationText') || notification.querySelector('span');
    
    notificationText.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
}

// Crear elemento de notificación si no existe
function createNotification() {
    const notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = 'notification';
    notification.innerHTML = '<span id="notificationText"></span>';
    document.body.appendChild(notification);
    return notification;
}

// Mostrar pantalla de carga
function showLoading() {
    isLoading = true;
    const loading = document.getElementById('loadingScreen') || createLoading();
    loading.classList.add('active');
}

// Ocultar pantalla de carga
function hideLoading() {
    isLoading = false;
    const loading = document.getElementById('loadingScreen');
    if (loading) {
        loading.classList.remove('active');
    }
}

// Crear elemento de carga si no existe
function createLoading() {
    const loading = document.createElement('div');
    loading.id = 'loadingScreen';
    loading.className = 'loading';
    loading.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loading);
    return loading;
}

// ============================================================================
// GESTIÓN DE USUARIO Y SESIÓN
// ============================================================================

// Cargar datos del usuario desde localStorage
function loadUserData() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            // Puedes añadir aquí lógica para verificar la expiración del token si es necesario
            // For now, we assume if it's there, it's valid enough for initial checks
        } catch (e) {
            console.error("Error parsing currentUser from localStorage:", e);
            localStorage.removeItem('currentUser'); // Clear corrupt data
            currentUser = null;
        }
    }
    // console.log('User data loaded:', currentUser); // This console log can be here or in checkPageAccess
    return !!currentUser; // Return true if user data was loaded, false otherwise
}


// Actualizar interfaz con datos del usuario
function updateUserInterface() {
    if (!currentUser) return;
    
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    const userAvatarElement = document.getElementById('userAvatar');
    
    // Usamos 'username' y 'role' directamente de la respuesta del backend
    if (userNameElement) userNameElement.textContent = currentUser.username;
    if (userRoleElement) {
        // Capitalizamos la primera letra del rol para la visualización
        userRoleElement.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    }
    if (userAvatarElement) {
        // Si el username es 'admin', el avatar podría ser 'AD' o las dos primeras letras del username
        const initials = currentUser.username.substring(0, 2).toUpperCase();
        userAvatarElement.textContent = initials;
    }
    
    // Mostrar/ocultar elementos según el rol
    updateRoleBasedUI();
}

// Actualizar UI basada en roles
function updateRoleBasedUI() {
    if (!currentUser) return;
    
    const evaluacionTab = document.getElementById('evaluacionTab');
    const adminTab = document.getElementById('adminTab');
    const reportesTab = document.getElementById('reportesTab');
    const actionEvaluacion = document.getElementById('actionEvaluacion');
    const actionAdmin = document.getElementById('actionAdmin');
    
    console.log('Actualizando UI para rol:', currentUser.role);
    
    // Ocultar todos los elementos de rol por defecto al inicio
    if (evaluacionTab) evaluacionTab.classList.add('d-none');
    if (adminTab) adminTab.classList.add('d-none');
    if (reportesTab) reportesTab.classList.add('d-none');
    if (actionEvaluacion) actionEvaluacion.classList.add('d-none');
    if (actionAdmin) actionAdmin.classList.add('d-none');


    // Mostrar elementos para EVALUADORES y ADMINISTRADORES
    if (currentUser.role === 'evaluador' || currentUser.role === 'admin') {
        if (evaluacionTab) {
            evaluacionTab.classList.remove('d-none');
            evaluacionTab.style.display = 'flex';
        }
        if (reportesTab) { // Reportes también suele ser para evaluadores/admins
            reportesTab.classList.remove('d-none');
            reportesTab.style.display = 'flex';
        }
        if (actionEvaluacion) {
            actionEvaluacion.classList.remove('d-none');
            actionEvaluacion.style.display = 'block';
        }
    }
    
    // Mostrar elementos específicos para ADMINISTRADORES
    if (currentUser.role === 'admin') {
        if (adminTab) {
            adminTab.classList.remove('d-none');
            adminTab.style.display = 'flex';
        }
        if (actionAdmin) {
            actionAdmin.classList.remove('d-none');
            actionAdmin.style.display = 'block';
        }
    }

    // Para clientes, solo se mostrará lo que no está oculto por defecto
    // Si necesitas ocultar elementos específicos para clientes, agrégalos aquí.
}

// Cerrar sesión
function logout() {
    // Aquí podrías opcionalmente enviar el refresh token al backend para invalidarlo
    // Pero para JWT, usualmente basta con eliminar los tokens del cliente.
    localStorage.removeItem('currentUser');
    currentUser = null; // Limpiar la variable global
    showNotification('Sesión cerrada exitosamente', 'success');

    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1500);
}

// ============================================================================
// NAVEGACIÓN Y PESTAÑAS
// ============================================================================

// Cambiar pestaña de formulario (si aplica en register/login.html)
function switchTab(tabName) {
    // Actualizar botones de pestaña
    document.querySelectorAll('.form-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    // event.target.classList.add('active'); // Ojo: event no siempre está definido globalmente
    // Una forma más segura sería pasar el elemento que dispara el evento
    // o seleccionar el tab basado en tabName
    const clickedTab = document.querySelector(`.form-tab[onclick*="${tabName}"]`);
    if (clickedTab) {
        clickedTab.classList.add('active');
    }
    
    // Actualizar contenido
    document.querySelectorAll('.form-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetContent = document.getElementById(tabName + 'Form');
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

// Mostrar sección
function showSection(sectionName) {
    // Actualizar pestañas de navegación
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    // if (event && event.target) { // Ojo: event no siempre está definido globalmente
    //     event.target.classList.add('active');
    // }
    const clickedNavTab = document.querySelector(`.nav-tab[onclick*="${sectionName}"]`);
    if (clickedNavTab) {
        clickedNavTab.classList.add('active');
    }
    
    // Actualizar secciones de contenido
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.classList.add('fade-in');
    }
}

// Funciones de navegación entre páginas
function irADashboard() {
    if (window.location.pathname.includes('dashboard')) {
        showSection('dashboard');
    } else {
        window.location.href = 'dashboard.html';
    }
}

function irASolicitudes() {
    window.location.href = 'solicitudes.html';
}

function irANuevaSolicitud() {
    window.location.href = 'nueva-solicitud.html';
}

function irAEvaluacion() {
    window.location.href = 'evaluacion.html';
}

function irAAdmin() {
    window.location.href = 'admin.html';
}

// ============================================================================
// REDIRECCIÓN INTELIGENTE POR ROLES
// ============================================================================

function redirectToUserPage() {
    if (!currentUser) {
        console.log('No hay usuario, redirigiendo a login');
        window.location.href = 'login.html';
        return;
    }
    
    console.log('Redirigiendo usuario:', currentUser.role); // Usamos currentUser.role
    
    switch(currentUser.role) { // Cambiado 'type' por 'role'
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


// ============================================================================
// VALIDACIONES DE FORMULARIO
// ============================================================================

// Validar email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validar DNI
function validateDNI(dni) {
    return /^[0-9]{8}$/.test(dni);
}

// Validar teléfono
function validatePhone(phone) {
    return /^[0-9]{9}$/.test(phone);
}

// Validar contraseña
function validatePassword(password) {
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[0-9]/.test(password);
}

// Mostrar/ocultar contraseña
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

// Verificar fortaleza de contraseña
function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('passwordStrengthBar');
    const lengthReq = document.getElementById('lengthReq');
    const upperReq = document.getElementById('upperReq');
    const numberReq = document.getElementById('numberReq');
    
    if (!strengthBar) return;
    
    let score = 0;
    
    // Verificar longitud
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
    
    // Verificar mayúscula
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
        lengthReq.classList.remove('valid');
        lengthReq.classList.add('invalid');
        lengthReq.querySelector('i').className = 'fas fa-times';
    }
    
    // Actualizar barra de fortaleza
    strengthBar.className = 'password-strength-bar';
    if (score === 1) {
        strengthBar.classList.add('strength-weak');
    } else if (score === 2) {
        strengthBar.classList.add('strength-fair');
    } else if (score === 3) {
        strengthBar.classList.add('strength-strong');
    }
}

// Verificar coincidencia de contraseñas
function checkPasswordMatch() {
    const password = document.getElementById('registerPassword');
    const confirmPassword = document.getElementById('registerConfirmPassword'); // Asegúrate que el ID es 'registerConfirmPassword'
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


// ============================================================================
// AUTENTICACIÓN (Integración con Django Backend)
// ============================================================================

// ***handleLogin - INTEGRADO CON DJANGO BACKEND***
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value; // Usar 'username' para Django SimpleJWT
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showNotification('Por favor, ingresa tu usuario y contraseña.', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}login/`, { // URL de tu API de login
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username, // Django SimpleJWT espera 'username'
                password: password,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            // La respuesta de login de SimpleJWT contiene 'access', 'refresh', 'username', 'email', 'role'
            currentUser = {
                username: data.username,
                email: data.email,
                role: data.role,
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
            const errorData = await response.json();
            let errorMessage = 'Error al iniciar sesión. ';
            if (errorData.detail) { // Errores generales de DRF/SimpleJWT
                errorMessage += errorData.detail;
            } else if (errorData) { // Otros errores detallados
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

// ***handleRegister - INTEGRADO CON DJANGO BACKEND***
async function handleRegister(event) {
    event.preventDefault();
    showLoading(); // Mostrar pantalla de carga (usando showLoading de tus utilidades)

    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const password2 = document.getElementById('registerConfirmPassword').value;
    const dni = document.getElementById('registerDNI').value;
    // Asegúrate de que el ID del campo de teléfono en tu HTML es 'registerPhone' o 'registerPhoneNumber'
    const phoneNumber = document.getElementById('registerPhone').value; 

    // Validaciones básicas de frontend
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
        const response = await fetch(`${API_BASE_URL}register/`, { // ¡URL de tu API de registro!
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password,
                password2: password2, // El backend lo espera para la validación del serializer
                dni: dni,
                phone_number: phoneNumber,
                role: 'cliente' // Por defecto, los registros públicos son para clientes
            }),
        });

        if (response.ok) { // Código 200-299, incluido 201 Created
            const data = await response.json();
            showNotification(data.message || 'Registro exitoso. ¡Ahora puedes iniciar sesión!', 'success');
            // Opcional: Limpiar formulario después del registro exitoso
            document.getElementById('registerForm').reset(); // Asume que tienes un formulario con id 'registerForm'
            // Redirigir al login después de un breve retraso
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            const errorData = await response.json();
            let errorMessage = 'Error en el registro. ';
            if (errorData) {
                // Iterar sobre los errores devueltos por Django/DRF
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
        hideLoading(); // Ocultar pantalla de carga
    }
}

// Eliminar usuarios demo y funciones relacionadas si ya no se necesitan
// const demoUsers = {}; // Ya no se usarán
// function demoLogin() {} // Ya no se usará
// function fillDemoData(userType) {} // Ya no se usará

// ============================================================================
// VERIFICACIÓN DE SESIÓN (permanece igual, pero ahora cargará de JWT)
// ============================================================================

// Verificar acceso a páginas protegidas
function checkPageAccess() {
    const currentPage = window.location.pathname;
    
    // Carga los datos del usuario. Si no hay, currentUser será null.
    const hasUserData = loadUserData(); 

    // Si no hay usuario y no está en login/register
    if (!hasUserData && !currentPage.includes('login') && !currentPage.includes('register')) {
        console.log('Sin sesión, redirigiendo a login');
        window.location.href = 'login.html';
        return false;
    }
    
    // Si hay usuario pero está en login/register
    if (hasUserData && (currentPage.includes('login') || currentPage.includes('register'))) {
        console.log('Ya hay sesión, redirigiendo según rol');
        redirectToUserPage();
        return false;
    }
    
    // Verificar permisos de página
    if (currentUser) {
        // Asegúrate de que los nombres de rol aquí coinciden con los que devuelves del backend ('cliente', 'evaluador', 'admin')
        if (currentPage.includes('evaluacion') && currentUser.role === 'cliente') {
            showNotification('No tienes permisos para acceder a esta página', 'error');
            window.location.href = 'dashboard.html';
            return false;
        }
        
        // Ajusta 'administrador' si tu backend solo devuelve 'admin'
        if (currentPage.includes('admin') && currentUser.role !== 'admin') { 
            showNotification('No tienes permisos para acceder a esta página', 'error');
            window.location.href = 'dashboard.html';
            return false;
        }
    }
    
    return true;
}

// ============================================================================
// MODALES (permanece igual)
// ============================================================================

// Mostrar modal
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

// Cerrar modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// ============================================================================
// INICIALIZACIÓN (permanece igual)
// ============================================================================

// Configurar event listeners
function setupEventListeners() {
    // Cerrar modales con Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
    
    // Cerrar modales al hacer click fuera
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('active');
        }
    });

    // Añadir event listeners a los formularios si están en esta página
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);

        // Opcional: Añadir listeners para validaciones en tiempo real
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

    // Añadir listener para botón de logout si existe
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
}

// Inicializar aplicación
function initApp() {
    // Verificar acceso a la página
    if (!checkPageAccess()) {
        return;
    }
    
    // Configurar event listeners
    setupEventListeners();
    
    // Actualizar interfaz si hay usuario (se llama también desde checkPageAccess)
    if (currentUser) {
        updateUserInterface();
    }
}

// ============================================================================
// CARGA DE LA PÁGINA (permanece igual)
// ============================================================================

// Ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initApp);

// Verificar sesión al cargar la ventana
window.addEventListener('load', function() {
    console.log('Página cargada:', window.location.pathname);
    
    // Verificar de nuevo después de que todo esté cargado
    setTimeout(() => {
        if (currentUser) {
            updateUserInterface();
        }
    }, 100);
});

// ============================================================================
// FUNCIONES DE AYUDA PARA PETICIONES AUTENTICADAS (NUEVO)
// ============================================================================

// Función de ayuda para hacer peticiones a APIs protegidas con JWT
async function fetchAuthenticated(url, options = {}) {
    showLoading(); // Usamos showLoading/hideLoading de tus utilidades
    loadUserData(); // Asegurarse de que currentUser esté actualizado

    if (!currentUser || !currentUser.access_token) { // Usar access_token
        hideLoading();
        showNotification('Tu sesión ha expirado o no has iniciado sesión. Por favor, vuelve a iniciar sesión.', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        throw new Error('No hay token de acceso disponible.');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentUser.access_token}`, // Añadir el token JWT
        ...options.headers, // Permitir headers adicionales
    };

    const config = {
        ...options,
        headers: headers,
    };

    try {
        const response = await fetch(url, config);

        if (response.status === 401) { // 401 Unauthorized, token expirado o inválido
            // Intentar refrescar el token si tienes un refresh token
            const refreshSuccess = await attemptTokenRefresh();
            if (refreshSuccess) {
                // Reintentar la petición original con el nuevo token
                headers['Authorization'] = `Bearer ${currentUser.access_token}`; // Actualizar con el nuevo token
                config.headers = headers;
                const newResponse = await fetch(url, config);
                if (newResponse.ok) {
                    hideLoading();
                    return newResponse;
                }
            }
            // Si el refresh falla o la respuesta sigue siendo 401, redirigir al login
            showNotification('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.', 'error');
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
            throw new Error('Sesión expirada. Redirigiendo al login.');
        }

        hideLoading();
        return response;

    } catch (error) {
        hideLoading();
        console.error('Error en petición autenticada:', error);
        showNotification('Error de conexión o autenticación. Inténtalo de nuevo.', 'error');
        throw error; // Re-lanzar el error para que la función que llama lo maneje
    }
}

// Función para intentar refrescar el token JWT
async function attemptTokenRefresh() {
    if (!currentUser || !currentUser.refresh_token) { // Usar refresh_token
        return false;
    }

    try {
        const response = await fetch(`${API_BASE_URL}login/refresh/`, { // Endpoint de refresh token
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: currentUser.refresh_token }), // Enviar refresh_token
        });

        if (response.ok) {
            const data = await response.json();
            currentUser.access_token = data.access; // Actualizar el token de acceso
            localStorage.setItem('currentUser', JSON.stringify(currentUser)); // Guardar cambios en localStorage
            console.log('Token de acceso refrescado exitosamente.');
            return true;
        } else {
            console.error('Error al refrescar token:', await response.json());
            localStorage.removeItem('currentUser'); // Eliminar tokens inválidos
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