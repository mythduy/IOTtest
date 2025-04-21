// Cấu hình kết nối Blynk Cloud
const BLYNK_CONFIG = {
  TOKEN: "9smwm2ir7NamyVIrEnHvh1jXsa_Gfi1o",    // Token xác thực Blynk
  SERVER: "blynk.cloud",                        // Địa chỉ máy chủ Blynk
  PINS: {
    HEART_RATE: "V0",      // Pin đọc nhịp tim
    SPO2: "V1",            // Pin đọc nồng độ oxy trong máu
    ACCEL_X: "V2",         // Pin đọc gia tốc theo trục X
    ACCEL_Y: "V3",         // Pin đọc gia tốc theo trục Y
    ACCEL_Z: "V4"          // Pin đọc gia tốc theo trục Z
  }
};
