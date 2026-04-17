// 1. Cấu hình - HÃY KIỂM TRA KỸ API KEY CỦA BẠN
const GROQ_API_KEY = "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"; 
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const user = sessionStorage.getItem('logged_in_user');
const chatContent = document.getElementById('chat-content');
const chatInput = document.getElementById('chat-input');

if (!user) {
    window.location.href = 'index.html';
}

/**
 * Lấy ngữ cảnh xe từ Firebase
 */
async function getVehiclesContext() {
    try {
        // Giả sử hàm getUrl đã được định nghĩa trong script.js của bạn
        const res = await fetch(getUrl(`users/${user}/cars`));
        const data = await res.json();
        
        if (!data || Object.keys(data).length === 0) {
            return "Người dùng hiện chưa đăng ký xe nào.";
        }

        let context = "Dữ liệu xe của người dùng hiện có:\n";
        Object.values(data).forEach((car, index) => {
            context += `- Xe ${index + 1}: ${car.brand} ${car.name}, Biển số: ${car.plate}, ODO: ${car.km}km, Hạn đăng kiểm: ${car.registry || 'N/A'}, Hạn bảo hiểm: ${car.insurance || 'N/A'}.\n`;
        });
        return context;
    } catch (err) {
        console.warn("Không lấy được dữ liệu xe:", err);
        return "Không có dữ liệu xe (Lỗi kết nối Firebase).";
    }
}

/**
 * Hàm gọi API Groq với xử lý lỗi 400
 */
async function callGroq(userMsg) {
    const vehicleData = await getVehiclesContext();
    const cleanKey = GROQ_API_KEY.trim(); // Loại bỏ khoảng trắng thừa nếu có

    // Tìm đoạn này trong chatbot.js
    const requestBody = {
        "model": "llama-3.1-8b-instant", // Thay llama3-8b-8192 thành llama-3.1-8b-instant
        "messages": [
            {
                "role": "system",
                "content": `Bạn là trợ lý ảo chuyên về bảo trì xe của YourCarManagement...`
            },
            {
                "role": "user",
                "content": userMsg
            }
        ],
        "temperature": 0.7,
        "max_tokens": 1024
    };

    try {
        const response = await fetch(GROQ_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${cleanKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        // Xử lý lỗi từ phía Server Groq (Lỗi 400, 401, 429...)
        if (!response.ok) {
            console.error("Lỗi API Groq:", result);
            return `Lỗi hệ thống: ${result.error?.message || 'Yêu cầu không hợp lệ'}`;
        }

        // Kiểm tra xem có dữ liệu trả về không trước khi truy cập [0]
        if (result.choices && result.choices.length > 0 && result.choices[0].message) {
            return result.choices[0].message.content;
        } else {
            console.error("Cấu trúc phản hồi không hợp lệ:", result);
            return "AI phản hồi trống, hãy thử lại.";
        }

    } catch (error) {
        console.error("Lỗi mạng/CORS:", error);
        return "Không thể kết nối internet hoặc lỗi bảo mật trình duyệt!";
    }
}

/**
 * Hiển thị tin nhắn
 */
function appendMessage(role, text) {
    const msgWrapper = document.createElement('div');
    if (role === 'user') {
        msgWrapper.className = 'user-msg-wrapper';
        msgWrapper.innerHTML = `<div class="user-msg shadow-sm">${text}</div>`;
    } else {
        msgWrapper.className = 'bot-msg-wrapper';
        msgWrapper.innerHTML = `
            <div class="bot-name"><i class="fas fa-robot me-1"></i> YourCarManagement AI</div>
            <div class="bot-msg shadow-sm">${text.replace(/\n/g, '<br>')}</div>
        `;
    }
    chatContent.appendChild(msgWrapper);
    chatContent.scrollTop = chatContent.scrollHeight;
}

/**
 * Xử lý gửi tin nhắn chính
 */
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage('user', text);
    chatInput.value = '';

    // Hiển thị trạng thái chờ
    const loadingId = 'loading-' + Date.now();
    const loadingMsg = document.createElement('div');
    loadingMsg.id = loadingId;
    loadingMsg.className = 'bot-msg-wrapper';
    loadingMsg.innerHTML = `<div class="bot-msg shadow-sm opacity-50">Đang phân tích...</div>`;
    chatContent.appendChild(loadingMsg);
    chatContent.scrollTop = chatContent.scrollHeight;

    const aiReply = await callGroq(text);

    // Xóa loading và hiện câu trả lời
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();
    
    appendMessage('bot', aiReply);
}

// Lắng nghe Enter
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
