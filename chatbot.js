// ==========================================
// CẤU HÌNH HỆ THỐNG API & KHỞI TẠO BIẾN
// ==========================================
const GROQ_API_KEY = process.env.ENV_GROQ_API_KEY || ""; 
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const user = sessionStorage.getItem('logged_in_user');
const chatContent = document.getElementById('chat-content');
const chatInput = document.getElementById('chat-input');
const historyList = document.getElementById('history-list');

// Kiểm tra quyền truy cập đăng nhập
if (!user) {
    window.location.href = 'index.html';
}

// Khởi tạo mảng lưu lịch sử chat từ LocalStorage theo từng user riêng biệt
let chatSessions = JSON.parse(localStorage.getItem(`chat_sessions_${user}`)) || [];
let currentSessionId = localStorage.getItem(`current_session_id_${user}`) || null;

// Sự kiện lắng nghe phím Enter trên ô gõ nội dung
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Chạy khởi tạo giao diện sau khi cây DOM đã sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
    renderSidebar();
    if (currentSessionId) {
        loadSession(currentSessionId);
    } else {
        showDefaultGreeting();
    }
});

// ==========================================
// CÁC HÀM QUẢN LÝ GIAO DIỆN & PHIÊN CHAT
// ==========================================

/**
 * Hiển thị lời chào mặc định ban đầu
 */
function showDefaultGreeting() {
    chatContent.innerHTML = `
        <div class="bot-msg-wrapper">
            <div class="bot-name"><i class="fas fa-robot me-1"></i> YourCarManagement AI</div>
            <div class="bot-msg shadow-sm">Xin chào! Mình là trợ lý thông minh của YourCarManagement. Bạn cần mình hỗ trợ hay giải đáp thắc mắc gì hôm nay không?</div>
        </div>
    `;
    chatContent.scrollTop = chatContent.scrollHeight;
}

/**
 * Vẽ danh sách lịch sử các phiên chat lên Sidebar trái
 */
function renderSidebar() {
    historyList.innerHTML = '';
    chatSessions.forEach(session => {
        const item = document.createElement('div');
        item.className = `history-item ${session.id === currentSessionId ? 'active' : ''}`;
        item.setAttribute('onclick', `loadSession('${session.id}')`);

        item.innerHTML = `
            <div class="history-title" title="${session.title}">
                <i class="far fa-comment-alt me-2"></i> ${session.title}
            </div>
            <button class="btn-delete-session" onclick="deleteSession(event, '${session.id}')">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        historyList.appendChild(item);
    });
}

/**
 * Nút nhấn bắt đầu một phiên hội thoại mới hoàn toàn
 */
function startNewSession() {
    currentSessionId = null;
    localStorage.removeItem(`current_session_id_${user}`);
    showDefaultGreeting();
    renderSidebar();
    chatInput.focus();
}

/**
 * Tải lại toàn bộ lịch sử tin nhắn của một phiên chat cũ lên khung bên phải
 */
function loadSession(id) {
    currentSessionId = id;
    localStorage.setItem(`current_session_id_${user}`, id);
    renderSidebar();

    const session = chatSessions.find(s => s.id === id);
    if (!session || session.messages.length === 0) {
        showDefaultGreeting();
        return;
    }

    chatContent.innerHTML = '';
    session.messages.forEach(msg => {
        appendMessage(msg.role, msg.text);
    });
}

/**
 * Xóa hẳn một phiên chat khỏi bộ nhớ
 */
function deleteSession(event, id) {
    event.stopPropagation();
    
    chatSessions = chatSessions.filter(s => s.id !== id);
    localStorage.setItem(`chat_sessions_${user}`, JSON.stringify(chatSessions));

    if (currentSessionId === id) {
        currentSessionId = null;
        localStorage.removeItem(`current_session_id_${user}`);
        showDefaultGreeting();
    }
    renderSidebar();
}

/**
 * Render cấu trúc bong bóng tin nhắn động ra không gian màn hình rộng
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

// ==========================================
// CÁC HÀM XỬ LÝ DỮ LIỆU & LÀM VIỆC VỚI API
// ==========================================

/**
 * Trích xuất làm sạch dữ liệu phương tiện từ cơ sở dữ liệu Firebase
 */
async function getVehiclesContext() {
    try {
        const res = await fetch(getUrl(`users/${user}/cars`));
        const data = await res.json();

        if (!data || Object.keys(data).length === 0) {
            return "Người dùng hiện chưa đăng ký phương tiện nào trong tài khoản.";
        }

        let context = "Dữ liệu danh sách xe của người dùng hiện có trên hệ thống:\n\n";
        Object.values(data).forEach((car, index) => {
            context += `- Xe ${index + 1}: ${car.brand || ''} ${car.name || ''} [Loại: ${car.type || 'Chưa rõ'}, Biển số: ${car.plate || 'Chưa rõ'}]\n`;
            if (car.fuel) context += `  + Loại nhiên liệu: ${car.fuel}\n`;
            if (car.driver) context += `  + Tài xế: ${car.driver} (${car.phone || 'Không có SĐT'})\n`;
            if (car.registry) context += `  + Hạn đăng kiểm: ${car.registry}\n`;
            if (car.licenseExpiry) context += `  + Hạn bằng lái: ${car.licenseExpiry}\n`;
            if (car.insuranceVatchat) context += `  + BH vật chất: ${car.insuranceVatchat}\n`;
            if (car.insuranceBatbuoc) context += `  + BH bắt buộc (TNDS): ${car.insuranceBatbuoc}\n`;
            if (car.dangky) context += `  + Hạn đăng ký xe: ${car.dangky}\n`;
            if (car.giayNganhang) context += `  + Hạn giấy đi đường ngân hàng: ${car.giayNganhang}\n`;
            if (car.oil) context += `  + Hạn thay dầu: ${car.oil}\n`;
            if (car.filter) context += `  + Lọc nhớt/gió: ${car.filter}\n`;
            if (car.tire) context += `  + Bảo dưỡng củ đề/máy phát: ${car.tire}\n`;
            if (car.brake) context += `  + Bảo dưỡng phanh: ${car.brake}\n`;
            if (car.aircon) context += `  + Vệ sinh máy lạnh: ${car.aircon}\n`;
            if (car.bommo) context += `  + Bơm mỡ: ${car.bommo}\n`;
            if (car.custom1_label && car.custom1_date) context += `  + ${car.custom1_label}: ${car.custom1_date}\n`;
            if (car.custom2_label && car.custom2_date) context += `  + ${car.custom2_label}: ${car.custom2_date}\n`;
            if (car.custom3_label && car.custom3_date) context += `  + ${car.custom3_label}: ${car.custom3_date}\n`;
            if (car.note) context += `  + Ghi chú: ${car.note}\n`;
            context += "\n";
        });
        return context;
    } catch (err) {
        console.warn("Không lấy được dữ liệu xe từ Firebase:", err);
        return "Không có dữ liệu xe (Chưa kết nối được hệ thống).";
    }
}

async function callGroq(userMsg) {
    const vehicleData = await getVehiclesContext();
    const cleanKey = GROQ_API_KEY.trim();
    const currentDateStr = new Date().toLocaleDateString('vi-VN');

    // System Prompt chung chung, linh hoạt giải đáp nhiều chủ đề
    const systemPrompt = `Bạn là trợ lý AI thông minh, thân thiện và am hiểu chuyên sâu của ứng dụng quản lý xe "YourCarManagement".

Nhiệm vụ của bạn:
1. Giải đáp thắc mắc của người dùng về tình trạng xe cá nhân, kỹ thuật ô tô/xe máy, quy trình bảo dưỡng, thủ tục pháp lý (đăng kiểm, bảo hiểm, bằng lái...) hoặc hướng dẫn sử dụng ứng dụng.
2. Trả lời linh hoạt, ngắn gọn, tự nhiên, văn phong lịch sự và sử dụng icon/emoji nhẹ nhàng khi phù hợp.
3. Nếu người dùng hỏi về danh sách xe hoặc tình trạng bảo dưỡng/hạn giấy tờ của họ, hãy dựa vào dữ liệu thực tế bên dưới để phân tích, tư vấn (Mốc thời gian hôm nay là ${currentDateStr}).
4. Nếu thắc mắc mang tính chung chung (kỹ thuật, kiến thức xe, hỏi đáp thông thường), hãy trả lời trực tiếp, chính xác mà không nhất thiết phải tham chiếu đến dữ liệu xe cá nhân trừ khi thực sự cần thiết.

[Dữ liệu xe của người dùng trên hệ thống]:
${vehicleData}`;

    // 1. Khởi tạo mảng hội thoại bắt đầu bằng System Prompt
    let apiMessages = [{ "role": "system", "content": systemPrompt }];

    // 2. Nạp toàn bộ lịch sử hội thoại của session hiện tại
    const currentSession = chatSessions.find(s => s.id === currentSessionId);

    if (currentSession && currentSession.messages && currentSession.messages.length > 0) {
        currentSession.messages.forEach(m => {
            apiMessages.push({
                "role": m.role === 'user' ? 'user' : 'assistant', 
                "content": m.text
            });
        });
        apiMessages.push({ "role": "user", "content": userMsg });
    } else {
        apiMessages.push({ "role": "user", "content": userMsg });
    }

    // 3. Đóng gói Request Body gửi lên Groq API
    const requestBody = {
        "model": "openai/gpt-oss-20b",
        "messages": apiMessages,
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
        if (!response.ok) {
            return `Lỗi hệ thống: ${result.error?.message || 'Yêu cầu không hợp lệ'}`;
        }

        if (result.choices && result.choices.length > 0 && result.choices[0].message) {
            return result.choices[0].message.content;
        }
        return "AI phản hồi trống, hãy thử lại.";
    } catch (error) {
        return "Không thể kết nối mạng internet hoặc máy chủ AI đang bận!";
    }
}

/**
 * Điều phối chính việc gửi nhận tin nhắn và đóng gói lưu trữ mảng Session
 */
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    if (!currentSessionId) {
        currentSessionId = 'session-' + Date.now();
        const shortTitle = text.length > 20 ? text.substring(0, 20) + '...' : text;
        
        chatSessions.unshift({
            id: currentSessionId,
            title: shortTitle,
            messages: []
        });
        localStorage.setItem(`current_session_id_${user}`, currentSessionId);
        chatContent.innerHTML = '';
    }

    const session = chatSessions.find(s => s.id === currentSessionId);

    appendMessage('user', text);
    session.messages.push({ role: 'user', text: text });
    localStorage.setItem(`chat_sessions_${user}`, JSON.stringify(chatSessions));
    renderSidebar();
    chatInput.value = '';

    const loadingId = 'loading-' + Date.now();
    const loadingMsg = document.createElement('div');
    loadingMsg.id = loadingId;
    loadingMsg.className = 'bot-msg-wrapper';
    loadingMsg.innerHTML = `<div class="bot-msg shadow-sm opacity-50"><i class="fas fa-spinner fa-spin me-2"></i>Đang suy nghĩ...</div>`;
    chatContent.appendChild(loadingMsg);
    chatContent.scrollTop = chatContent.scrollHeight;

    const aiReply = await callGroq(text);

    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();

    appendMessage('bot', aiReply);
    session.messages.push({ role: 'bot', text: aiReply });
    localStorage.setItem(`chat_sessions_${user}`, JSON.stringify(chatSessions));
}