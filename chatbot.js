const GEMINI_API_KEY = "AIzaSyDsQRlsNhc6tbmrzGsEBS18Pijox--6PEY";
const FIREBASE_BASE_URL = "https://yourcarmanagement-default-rtdb.asia-southeast1.firebasedatabase.app/";
const MODEL_NAME = "gemini-3.1-flash-lite-preview"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
async function getVehicleContext() {
    const username = sessionStorage.getItem('logged_in_user');
    if (!username) return "Phương chưa đăng nhập.";
    try {
        const response = await fetch(`${FIREBASE_BASE_URL}users/${username}/cars.json`);
        const data = await response.json();
        if (!data) return "Phương hiện chưa có xe nào trên hệ thống đám mây.";
        const cars = Object.values(data);
        let ctx = "Danh sách xe Global của Phương:\n";
        cars.forEach((c, i) => {
            ctx += `${i+1}. ${c.brand} ${c.name} (Biển: ${c.plate}). ODO: ${c.km}km.\n`;
        });
        return ctx;
    } catch (err) {
        console.error("Lỗi Firebase:", err);
        return "Lỗi kết nối Global Storage.";
    }
}
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const content = document.getElementById('chat-content');
    const userText = input.value.trim();
    if (!userText) return;
    content.innerHTML += `<div class="msg-wrapper d-flex justify-content-end mb-3"><div class="user-msg shadow-sm">${userText}</div></div>`;
    input.value = "";
    content.scrollTop = content.scrollHeight;
    const loadingId = "loading-" + Date.now();
    content.innerHTML += `<div class="msg-wrapper d-flex justify-content-start mb-3" id="${loadingId}"><div class="bot-msg shadow-sm border bg-light small"><i class="fas fa-bolt text-success"></i> Đang đọc dữ liệu đám mây...</div></div>`;
    try {
        const vehicleInfo = await getVehicleContext();
        
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Bạn là trợ lý YourCar AI. Phương đang hỏi. Ngữ cảnh xe từ Firebase: ${vehicleInfo}\n\nCâu hỏi: ${userText}` }]
                }]
            })
        });

        const data = await response.json();
        const botReply = data.candidates[0].content.parts[0].text;

        document.getElementById(loadingId).innerHTML = `
            <div class="bot-msg shadow-sm border bg-white">
                <small class="text-success fw-bold d-block mb-1">YourCar AI (3.1 Lite Cloud)</small>
                ${botReply.replace(/\n/g, '<br>')}
            </div>`;
    } catch (err) {
        document.getElementById(loadingId).innerHTML = `<div class="bot-msg text-danger">Lỗi: ${err.message}</div>`;
    }
    content.scrollTop = content.scrollHeight;
}
