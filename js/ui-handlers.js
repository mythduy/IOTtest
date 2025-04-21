// Xử lý tương tác giao diện người dùng

// Biến theo dõi trạng thái âm thanh cảnh báo
let heartRateAlertActive = false;
let oxygenAlertActive = false;
let alertInterval = null;

// Hàm phát âm thanh cảnh báo ngã
function playAlertSound() {
    alertSound.currentTime = 0;
    let playPromise = alertSound.play();
    
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.warn("Phát âm thanh bị chặn:", error);
            document.addEventListener('click', function playOnClick() {
                alertSound.play();
                document.removeEventListener('click', playOnClick);
            }, { once: true });
        });
    }
}

// Hàm phát âm thanh cảnh báo nhịp tim (bíp bíp)
function playHeartRateAlert() {
    if (!heartRateSound) {
        console.warn("Chưa định nghĩa âm thanh cảnh báo nhịp tim");
        return;
    }
    
    heartRateSound.currentTime = 0;
    let playPromise = heartRateSound.play();
    
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.warn("Phát âm thanh nhịp tim bị chặn:", error);
        });
    }
}

// Hàm phát âm thanh cảnh báo oxy thấp (ting ting)
function playOxygenAlert() {
    if (!oxygenSound) {
        console.warn("Chưa định nghĩa âm thanh cảnh báo oxy");
        return;
    }
    
    oxygenSound.currentTime = 0;
    let playPromise = oxygenSound.play();
    
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.warn("Phát âm thanh oxy bị chặn:", error);
        });
    }
}

// Hàm bắt đầu cảnh báo nhịp tim (bíp bíp định kỳ)
function startHeartRateAlert() {
    if (heartRateAlertActive) return;
    
    heartRateAlertActive = true;
    playHeartRateAlert();
    
    // Chỉ tạo interval nếu chưa có
    if (!alertInterval) {
        alertInterval = setInterval(() => {
            if (heartRateAlertActive) {
                playHeartRateAlert();
            }
            if (oxygenAlertActive) {
                playOxygenAlert();
            }
        }, 6000); // Lặp lại mỗi 6 giây
    }
}

// Hàm dừng cảnh báo nhịp tim
function stopHeartRateAlert() {
    heartRateAlertActive = false;
    checkAndClearAlertInterval();
}

// Hàm bắt đầu cảnh báo oxy thấp (ting ting định kỳ)
function startOxygenAlert() {
    if (oxygenAlertActive) return;
    
    oxygenAlertActive = true;
    playOxygenAlert();
    
    // Chỉ tạo interval nếu chưa có
    if (!alertInterval) {
        alertInterval = setInterval(() => {
            if (heartRateAlertActive) {
                playHeartRateAlert();
            }
            if (oxygenAlertActive) {
                playOxygenAlert();
            }
        }, 6000); // Lặp lại mỗi 6 giây
    }
}

// Hàm dừng cảnh báo oxy thấp
function stopOxygenAlert() {
    oxygenAlertActive = false;
    checkAndClearAlertInterval();
}

// Kiểm tra và xóa interval nếu không còn cảnh báo nào hoạt động
function checkAndClearAlertInterval() {
    if (!heartRateAlertActive && !oxygenAlertActive && alertInterval) {
        clearInterval(alertInterval);
        alertInterval = null;
    }
}

// Hàm kích hoạt cảnh báo té ngã
function triggerFallAlert() {
    fallDetected = true;
    fallAlertElement.style.display = 'block';
    alertModal.style.display = 'flex';
    playAlertSound();
    fallStatusElement.innerHTML = '<span class="status-indicator indicator-critical"></span>Phát Hiện Ngã!';
}

// Hàm đặt lại cảnh báo té ngã
function resetFallAlert() {
    if (typeof resetFallDetection === 'function') {
        resetFallDetection();
    } else {
        fallDetected = false;
    }
    
    fallAlertElement.style.display = 'none';
    alertModal.style.display = 'none';
    alertSound.pause();
    alertSound.currentTime = 0;
    fallStatusElement.innerHTML = '<span class="status-indicator indicator-normal"></span>Không Có Rủi Ro';
    
    // Đặt lại nội dung thông báo mặc định nếu có phần tử
    const alertTitle = document.querySelector('.alert-modal h2');
    const alertMessage = document.querySelector('.alert-modal p');
    if (alertTitle && alertMessage) {
        alertTitle.textContent = "ĐÃ PHÁT HIỆN NGÃ";
        alertMessage.textContent = "Hệ thống giám sát đã phát hiện khả năng bệnh nhân bị ngã. Bệnh nhân có thể cần được chăm sóc y tế ngay lập tức. Vui lòng đến kiểm tra ngay.";
    }
}

// Cập nhật trạng thái âm thanh dựa trên dữ liệu sức khỏe
function updateAlertSounds(healthData) {
    // Cảnh báo nhịp tim
    if (healthData && healthData.heartRate !== null) {
        if (healthData.heartRate < 60 || healthData.heartRate > 100) {
            startHeartRateAlert();
        } else {
            stopHeartRateAlert();
        }
    }
    
    // Cảnh báo oxy thấp
    if (healthData && healthData.spo2 !== null) {
        if (healthData.spo2 < 95) {
            startOxygenAlert();
        } else {
            stopOxygenAlert();
        }
    }
}

// Người nghe sự kiện cho nút xác nhận
acknowledgeBtn.addEventListener('click', resetFallAlert);

// Cũng đóng hộp thoại cảnh báo khi nhấp vào bên ngoài (tùy chọn)
alertModal.addEventListener('click', function(e) {
    if (e.target === alertModal) {
        resetFallAlert();
    }
});

// Thêm hàm điều chỉnh âm lượng cho các âm thanh cảnh báo
function setAlertVolume(volume) {
    // Đảm bảo giá trị âm lượng nằm trong khoảng từ 0 đến 1
    const safeVolume = Math.min(Math.max(volume, 0), 1);
    
    // Thiết lập âm lượng cho tất cả các âm thanh cảnh báo
    if (alertSound) alertSound.volume = safeVolume;
    if (heartRateSound) heartRateSound.volume = safeVolume;
    if (oxygenSound) oxygenSound.volume = safeVolume;
}
