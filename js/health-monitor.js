// Chức năng theo dõi sức khỏe

// Phần tử DOM
const heartRateElement = document.getElementById('heart-rate');
const spo2Element = document.getElementById('spo2');
const heartStatusElement = document.getElementById('heart-status');
const oxygenStatusElement = document.getElementById('oxygen-status');
const heartStatusSummaryElement = document.getElementById('heart-status-summary');
const oxygenStatusSummaryElement = document.getElementById('oxygen-status-summary');
const fallStatusElement = document.getElementById('fall-status');
const fallAlertElement = document.getElementById('fall-alert');
const alertModal = document.getElementById('alertModal');
const acknowledgeBtn = document.getElementById('acknowledgeBtn');
const alertSound = document.getElementById('alertSound');

// Khởi tạo tham chiếu đến phần tử âm thanh
const heartRateSound = document.getElementById('heartRateSound');
const oxygenSound = document.getElementById('oxygenSound');

// Lưu trữ giá trị trước đó để hiệu ứng và so sánh
let prevValues = {
    heartRate: null,
    spo2: null
};

// Ngưỡng gia tốc cho phát hiện té ngã
const FALL_THRESHOLD = 2.0;
// Ngưỡng ổn định sau khi té ngã (ít thay đổi)
const STABILITY_THRESHOLD = 0.3;
// Thời gian theo dõi sau té ngã (mili giây)
const UNCONSCIOUS_CHECK_TIME = 15000; // 15 giây

// Lưu trữ giá trị gia tốc kế trước đó để so sánh
let prevAccel = { x: 0, y: 0, z: 0 };
let fallDetected = false;
let fallTimestamp = null;
let unconsciousDetected = false;
let stabilityCounter = 0;

// Hàm thêm hiệu ứng khi giá trị thay đổi
function animateValueChange(element, newValue, prevValue) {
    if (newValue !== prevValue) {
        element.classList.remove('value-update');
        void element.offsetWidth; // Kích hoạt reflow
        element.classList.add('value-update');
    }
}

// Hàm cập nhật chỉ báo trạng thái
function updateStatus(type, value) {
    let status, statusClass, indicatorClass;
    
    if (type === 'heart') {
        // Cập nhật trạng thái nhịp tim
        if (value >= 60 && value <= 100) {
            status = 'Bình Thường';
            statusClass = 'status-normal';
            indicatorClass = 'indicator-normal';
            heartStatusSummaryElement.innerHTML = '<div class="heart-pulse"></div>Bình Thường';
        } else if ((value >= 50 && value < 60) || (value > 100 && value <= 120)) {
            status = 'Cao';
            statusClass = 'status-warning';
            indicatorClass = 'indicator-warning';
            heartStatusSummaryElement.innerHTML = '<div class="heart-pulse"></div>Cao';
        } else {
            status = 'Nguy Hiểm';
            statusClass = 'status-critical';
            indicatorClass = 'indicator-critical';
            heartStatusSummaryElement.innerHTML = '<div class="heart-pulse"></div>Nguy Hiểm';
        }
        
        heartStatusElement.className = `vital-status ${statusClass}`;
        heartStatusElement.innerHTML = `<span class="status-indicator ${indicatorClass}"></span>${status}`;
    } else if (type === 'oxygen') {
        // Cập nhật trạng thái nồng độ oxy
        if (value >= 95) {
            status = 'Bình Thường';
            statusClass = 'status-normal';
            indicatorClass = 'indicator-normal';
            oxygenStatusSummaryElement.innerHTML = `<span class="status-indicator ${indicatorClass}"></span>Bình Thường`;
        } else if (value >= 90 && value < 95) {
            status = 'Thiếu Oxy Nhẹ';
            statusClass = 'status-warning';
            indicatorClass = 'indicator-warning';
            // Thêm hiệu ứng nhấp nháy cho trạng thái cảnh báo
            oxygenStatusSummaryElement.innerHTML = `<div class="oxygen-pulse"></div>Thấp`;
        } else {
            status = 'Thiếu Oxy Nghiêm Trọng';
            statusClass = 'status-critical';
            indicatorClass = 'indicator-critical';
            // Thêm hiệu ứng nhấp nháy cho trạng thái nguy hiểm
            oxygenStatusSummaryElement.innerHTML = `<div class="oxygen-pulse"></div>Nguy Hiểm`;
        }
        
        oxygenStatusElement.className = `vital-status ${statusClass}`;
        oxygenStatusElement.innerHTML = `<span class="status-indicator ${indicatorClass}"></span>${status}`;
    }
}

// Hàm lấy dữ liệu từ API Blynk
async function fetchBlynkData(pin) {
    try {
        const response = await fetch(`https://${BLYNK_CONFIG.SERVER}/external/api/get?token=${BLYNK_CONFIG.TOKEN}&${pin}`);
        if (!response.ok) {
            throw new Error(`Lỗi HTTP! Trạng thái: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Lỗi khi lấy dữ liệu Blynk cho pin ${pin}:`, error);
        return null;
    }
}

// Phát hiện té ngã bằng dữ liệu gia tốc kế
function detectFall(x, y, z) {
    const currentTime = Date.now();
    // Tính độ lớn gia tốc
    const accelerationMagnitude = Math.sqrt(x*x + y*y + z*z);
    
    // Tính sự thay đổi gia tốc
    const prevAccelMagnitude = Math.sqrt(
        prevAccel.x * prevAccel.x + 
        prevAccel.y * prevAccel.y + 
        prevAccel.z * prevAccel.z
    );
    
    const accelChange = Math.abs(accelerationMagnitude - prevAccelMagnitude);
    
    // Cập nhật giá trị gia tốc trước đó
    prevAccel = { x, y, z };
    
    // Nếu đang trong trạng thái theo dõi sau khi té ngã
    if (fallDetected && !unconsciousDetected && fallTimestamp) {
        // Kiểm tra xem đã quá thời gian theo dõi chưa
        if (currentTime - fallTimestamp > UNCONSCIOUS_CHECK_TIME) {
            // Nếu đếm đủ số mẫu ổn định, có thể người đang bất tỉnh
            if (stabilityCounter >= 4) { // Ít nhất 4 mẫu ổn định (12 giây với chu kỳ 3 giây)
                unconsciousDetected = true;
                console.log("Cảnh báo: Có thể bệnh nhân đang bất tỉnh sau té ngã!");
                updateFallStatusToUnconscious();
            } else {
                // Hồi phục sau té ngã
                console.log("Bệnh nhân có thể đã hồi phục sau té ngã");
                resetFallDetection();
            }
        } else {
            // Trong khoảng thời gian theo dõi, kiểm tra sự ổn định của gia tốc
            if (accelChange < STABILITY_THRESHOLD) {
                stabilityCounter++;
                console.log(`Phát hiện ổn định lần ${stabilityCounter}: ${accelChange.toFixed(2)}`);
            }
        }
    }
    
    // Kiểm tra xem thay đổi có vượt quá ngưỡng không để phát hiện té ngã mới
    if (accelChange > FALL_THRESHOLD && !fallDetected) {
        console.log(`Phát hiện té ngã! Thay đổi gia tốc: ${accelChange.toFixed(2)}`);
        fallDetected = true;
        fallTimestamp = currentTime;
        stabilityCounter = 0;
        triggerFallAlert();
        return true;
    }
    
    return false;
}

// Cập nhật trạng thái sau khi phát hiện bất tỉnh
function updateFallStatusToUnconscious() {
    fallStatusElement.innerHTML = '<span class="status-indicator indicator-critical"></span>Ngã và Bất tỉnh!';
    
    // Cập nhật thông báo cảnh báo với thông tin nghiêm trọng hơn
    const alertTitle = document.querySelector('.alert-modal h2');
    const alertMessage = document.querySelector('.alert-modal p');
    if (alertTitle && alertMessage) {
        alertTitle.textContent = "CẢNH BÁO KHẨN CẤP: NGÃ & BẤT TỈNH";
        alertMessage.textContent = "Hệ thống phát hiện bệnh nhân đã ngã và có thể đang bất tỉnh! Cần được chăm sóc y tế KHẨN CẤP ngay lập tức!";
    }
    
    // Phát lại âm thanh cảnh báo để nhấn mạnh tính khẩn cấp
    playAlertSound();
}

// Đặt lại trạng thái phát hiện té ngã
function resetFallDetection() {
    fallDetected = false;
    fallTimestamp = null;
    unconsciousDetected = false;
    stabilityCounter = 0;
}

// Cập nhật hàm resetFallAlert trong ui-handlers.js để gọi đến resetFallDetection
function resetFallAlert() {
    resetFallDetection();
    fallAlertElement.style.display = 'none';
    alertModal.style.display = 'none';
    alertSound.pause();
    alertSound.currentTime = 0;
    fallStatusElement.innerHTML = '<span class="status-indicator indicator-normal"></span>Không Có Rủi Ro';
    
    // Đặt lại nội dung thông báo mặc định
    const alertTitle = document.querySelector('.alert-modal h2');
    const alertMessage = document.querySelector('.alert-modal p');
    if (alertTitle && alertMessage) {
        alertTitle.textContent = "ĐÃ PHÁT HIỆN NGÃ";
        alertMessage.textContent = "Hệ thống giám sát đã phát hiện khả năng bệnh nhân bị ngã. Bệnh nhân có thể cần được chăm sóc y tế ngay lập tức. Vui lòng đến kiểm tra ngay.";
    }
}

// Hàm lấy tất cả dữ liệu sức khỏe từ Blynk
async function fetchHealthData() {
    try {
        // Lấy nhịp tim
        const heartRate = await fetchBlynkData(BLYNK_CONFIG.PINS.HEART_RATE);
        
        // Lấy SpO2
        const spo2 = await fetchBlynkData(BLYNK_CONFIG.PINS.SPO2);
        
        // Lấy dữ liệu gia tốc kế
        const accelX = await fetchBlynkData(BLYNK_CONFIG.PINS.ACCEL_X);
        const accelY = await fetchBlynkData(BLYNK_CONFIG.PINS.ACCEL_Y);
        const accelZ = await fetchBlynkData(BLYNK_CONFIG.PINS.ACCEL_Z);
        
        return {
            heartRate: heartRate !== null ? parseFloat(heartRate) : null,
            spo2: spo2 !== null ? parseFloat(spo2) : null,
            accel: {
                x: accelX !== null ? parseFloat(accelX) : 0,
                y: accelY !== null ? parseFloat(accelY) : 0,
                z: accelZ !== null ? parseFloat(accelZ) : 0
            }
        };
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu sức khỏe:', error);
        // Trả về dữ liệu mô phỏng làm dự phòng
        return simulateHealthData();
    }
}

// Dự phòng: Tạo dữ liệu sức khỏe mô phỏng trong trường hợp API thất bại
function simulateHealthData() {
    // Tạo giá trị nhịp tim thực tế (thỉnh thoảng không bình thường)
    const heartRate = Math.random() > 0.9 
        ? getRandomValue(40, 150)  // Thỉnh thoảng không bình thường
        : getRandomValue(60, 100); // Phần lớn là bình thường
        
    // Tạo giá trị SpO2 thực tế
    const spo2 = Math.random() > 0.9 
        ? getRandomValue(85, 94)   // Thỉnh thoảng thấp
        : getRandomValue(95, 100); // Phần lớn là bình thường
    
    // Tạo dữ liệu gia tốc kế ngẫu nhiên
    const accelX = getRandomValue(-10, 10) / 10;
    const accelY = getRandomValue(-10, 10) / 10;
    const accelZ = getRandomValue(8, 12) / 10; // Khoảng 1G khi thẳng đứng
        
    return { 
        heartRate, 
        spo2,
        accel: {
            x: accelX,
            y: accelY,
            z: accelZ
        }
    };
}

function getRandomValue(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Cập nhật giao diện người dùng với dữ liệu sức khỏe
async function updateAllData() {
    // Lấy dữ liệu sức khỏe Blynk (với dự phòng là mô phỏng)
    const healthData = await fetchHealthData();
    
    // Cập nhật nhịp tim nếu hợp lệ
    if (healthData.heartRate !== null) {
        heartRateElement.textContent = healthData.heartRate;
        animateValueChange(heartRateElement, healthData.heartRate, prevValues.heartRate);
        updateStatus('heart', healthData.heartRate);
        prevValues.heartRate = healthData.heartRate;
    }
    
    // Cập nhật SpO2 nếu hợp lệ
    if (healthData.spo2 !== null) {
        spo2Element.textContent = healthData.spo2;
        animateValueChange(spo2Element, healthData.spo2, prevValues.spo2);
        updateStatus('oxygen', healthData.spo2);
        prevValues.spo2 = healthData.spo2;
    }
    
    // Kiểm tra té ngã bằng dữ liệu gia tốc kế
    if (!fallDetected && healthData.accel) {
        detectFall(
            healthData.accel.x,
            healthData.accel.y,
            healthData.accel.z
        );
    }
    
    // Cập nhật âm thanh cảnh báo dựa trên dữ liệu sức khỏe
    if (typeof updateAlertSounds === 'function') {
        updateAlertSounds(healthData);
    }
}

// Khởi tạo với cập nhật đầu tiên
document.addEventListener('DOMContentLoaded', function() {
    updateAllData();
    
    // Cập nhật dữ liệu theo định kỳ (mỗi 3 giây)
    setInterval(updateAllData, 3000);
});
