// Quản lý xác thực người dùng

// Danh sách người dùng mặc định
const users = [
    { username: "admin", password: "admin123", displayName: "Quản trị viên" },
    { username: "doctor", password: "doctor123", displayName: "Bác sĩ Nguyễn" },
    { username: "nurse", password: "nurse123", displayName: "Y tá Trần" }
];

// Các phần tử DOM cho xác thực
const authContainer = document.getElementById('authContainer');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const registerSuccess = document.getElementById('registerSuccess');
const loginOverlay = document.getElementById('loginOverlay');
const userDisplayName = document.getElementById('userDisplayName');
const logoutBtn = document.getElementById('logoutBtn');
const logoutConfirm = document.getElementById('logoutConfirm');
const cancelLogout = document.getElementById('cancelLogout');
const confirmLogout = document.getElementById('confirmLogout');

// Chuyển đổi giữa biểu mẫu đăng nhập và đăng ký
showRegisterBtn.addEventListener('click', function() {
    authContainer.classList.add('show-register');
});

showLoginBtn.addEventListener('click', function() {
    authContainer.classList.remove('show-register');
});

// Lấy danh sách người dùng đã đăng ký từ localStorage hoặc sử dụng người dùng mặc định
function getUsers() {
    const storedUsers = localStorage.getItem('registeredUsers');
    if (storedUsers) {
        return [...users, ...JSON.parse(storedUsers)];
    }
    return users;
}

// Lưu người dùng đã đăng ký vào localStorage
function saveUser(user) {
    const storedUsers = localStorage.getItem('registeredUsers');
    let registeredUsers = [];
    
    if (storedUsers) {
        registeredUsers = JSON.parse(storedUsers);
    }
    
    registeredUsers.push(user);
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
}

// Kiểm tra xem tên người dùng đã tồn tại chưa
function usernameExists(username) {
    const allUsers = getUsers();
    return allUsers.some(user => user.username === username);
}

// Xử lý gửi biểu mẫu đăng ký
registerForm.addEventListener('submit', function(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('fullName').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Đặt lại thông báo lỗi
    registerError.style.display = 'none';
    registerSuccess.style.display = 'none';
    
    // Xác thực biểu mẫu
    if (usernameExists(username)) {
        registerError.textContent = 'Tên đăng nhập đã tồn tại, vui lòng chọn tên khác!';
        registerError.style.display = 'block';
        return;
    }
    
    if (password !== confirmPassword) {
        registerError.textContent = 'Mật khẩu xác nhận không khớp!';
        registerError.style.display = 'block';
        return;
    }
    
    if (password.length < 6) {
        registerError.textContent = 'Mật khẩu phải có ít nhất 6 ký tự!';
        registerError.style.display = 'block';
        return;
    }
    
    // Tạo người dùng mới
    const newUser = {
        username: username,
        password: password,
        displayName: fullName
    };
    
    // Lưu người dùng
    saveUser(newUser);
    
    // Hiển thị thông báo thành công
    registerSuccess.style.display = 'block';
    
    // Đặt lại biểu mẫu
    registerForm.reset();
    
    // Chuyển sang biểu mẫu đăng nhập sau 2 giây
    setTimeout(() => {
        authContainer.classList.remove('show-register');
    }, 2000);
});

// Kiểm tra xem người dùng đã đăng nhập chưa
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const savedUser = localStorage.getItem('user');
    
    if (isLoggedIn === 'true' && savedUser) {
        const user = JSON.parse(savedUser);
        userDisplayName.textContent = user.displayName;
        loginOverlay.style.opacity = '0';
        setTimeout(() => {
            loginOverlay.classList.add('hidden');
        }, 500);
    }
}

// Xử lý gửi biểu mẫu đăng nhập
loginForm.addEventListener('submit', function(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const allUsers = getUsers();
    const user = allUsers.find(u => u.username === username && u.password === password);
    
    if (user) {
        // Lưu trạng thái đăng nhập
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify({
            username: user.username,
            displayName: user.displayName
        }));
        
        // Cập nhật tên hiển thị
        userDisplayName.textContent = user.displayName;
        
        // Ẩn lớp phủ đăng nhập với hiệu ứng
        loginOverlay.style.opacity = '0';
        setTimeout(() => {
            loginOverlay.classList.add('hidden');
        }, 500);
        
        // Đặt lại biểu mẫu
        loginForm.reset();
        loginError.style.display = 'none';
    } else {
        loginError.style.display = 'block';
    }
});

// Chức năng đăng xuất
// Hiển thị hộp thoại xác nhận khi nhấn nút đăng xuất
logoutBtn.addEventListener('click', function() {
    logoutConfirm.style.display = 'flex';
});

// Hủy đăng xuất
cancelLogout.addEventListener('click', function() {
    logoutConfirm.style.display = 'none';
});

// Xác nhận đăng xuất
confirmLogout.addEventListener('click', function() {
    // Xóa dữ liệu người dùng khỏi bộ nhớ cục bộ
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    
    // Ẩn hộp thoại xác nhận
    logoutConfirm.style.display = 'none';
    
    // Hiển thị lớp phủ đăng nhập
    loginOverlay.style.opacity = '1';
    loginOverlay.classList.remove('hidden');
    
    // Đặt lại biểu mẫu
    loginForm.reset();
    registerForm.reset();
    loginError.style.display = 'none';
    registerError.style.display = 'none';
    registerSuccess.style.display = 'none';
    
    // Hiển thị biểu mẫu đăng nhập
    authContainer.classList.remove('show-register');
});

// Đóng hộp thoại khi nhấp vào bên ngoài
logoutConfirm.addEventListener('click', function(e) {
    if (e.target === logoutConfirm) {
        logoutConfirm.style.display = 'none';
    }
});

// Kiểm tra trạng thái xác thực khi trang tải
document.addEventListener('DOMContentLoaded', checkAuth);
