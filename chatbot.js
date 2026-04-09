const GEMINI_API_KEY = "AIzaSyDsQRlsNhc6tbmrzGsEBS18Pijox--6PEY";
const MODEL_NAME = "gemini-3.1-flash-lite-preview"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
function getVehicleContext() {
    const user = sessionStorage.getItem('logged_in_user') || "Phương";
    const cars = JSON.parse(localStorage.getItem(`cars_data_${user}`) || "[]");
    if (cars.length === 0) return "Phương chưa có xe nào.";
    return "Xe của Phương: " + cars.map(c => `${c.brand} ${c.name} (${c.plate})`).join(", ");
}
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const content = document.getElementById('chat-content');
    const userText = input.value.trim();
    if (!userText) return;
    content.innerHTML += `
        <div class="msg-wrapper d-flex justify-content-end mb-3">
            <div class="user-msg shadow-sm" style="background: #0d6efd; color: white;">
                ${userText}
            </div>
        </div>`;
    input.value = "";
    content.scrollTop = content.scrollHeight;
    const loadingId = "loading-" + Date.now();
    content.innerHTML += `
        <div class="msg-wrapper d-flex justify-content-start mb-3" id="${loadingId}">
            <div class="bot-msg shadow-sm border bg-light">
                <small class="text-success fw-bold d-block mb-1">
                    <i class="fas fa-bolt me-1"></i> YourCarManagement AI (3.1 Lite)
                </small>
                <div class="spinner-border spinner-border-sm text-success me-2" role="status"></div>
                <span class="status-msg">Đang trả lời...</span>
            </div>
        </div>`;
    content.scrollTop = content.scrollHeight;
    const systemInstruction = `Bạn là trợ lý ảo YourCarManagement AI dùng bản 3.1 Flash Lite. 
    Hãy trả lời Phương cực kỳ nhanh, ngắn gọn và chính xác. 
    Ngữ cảnh: ${getVehicleContext()}`;
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemInstruction + "\n\nPhương hỏi: " + userText }] }],
                generationConfig: {
                    temperature: 0.6,
                    maxOutputTokens: 500
                }
            })
        });
        const data = await response.json();
        if (data.error) {
            if (data.error.code === 429) throw new Error("Hệ thống đang bận, Phương đợi 10 giây nhé!");
            if (data.error.message.includes("not found")) throw new Error("Model chưa mở cho Key này.");
            throw new Error(data.error.message);
        }
        const reply = data.candidates[0].content.parts[0].text;
        document.getElementById(loadingId).innerHTML = `
            <div class="bot-msg shadow-sm border bg-white">
                <small class="text-success fw-bold d-block mb-1">
                    <i class="fas fa-bolt me-1"></i> YourCarManagement AI
                </small>
                ${reply.replace(/\n/g, '<br>')}
            </div>`;

    } catch (err) {
        document.getElementById(loadingId).innerHTML = `
            <div class="bot-msg text-danger border shadow-sm">
                <i class="fas fa-exclamation-triangle me-1"></i> ${err.message}
            </div>`;
    }
    content.scrollTop = content.scrollHeight;
}
document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});