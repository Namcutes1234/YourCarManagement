// ==========================================
// CẤU HÌNH HỆ THỐNG API & KHỞI TẠO BIẾN
// ==========================================
const GROQ_API_KEY = "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";
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
 * Vẽ danh sách lịch sử các phiên chat lên Sidebar trái (Màu trắng phẳng)
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
    event.stopPropagation(); // Ngăn chặn sự kiện kích hoạt mở lại tab chat khi bấm nút xóa
    
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
    chatContent.scrollTop = chatContent.scrollHeight; // Tự động cuộn xuống dưới cùng khi có chữ mới
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
            return "Người dùng hiện chưa đăng ký phương tiện nào.";
        }

        let context = "Dữ liệu các phương tiện hiện có của người dùng:\n\n";
        Object.values(data).forEach((car, index) => {
            context += `- Xe ${index + 1}: ${car.brand || ''} ${car.name || ''} [Biển số: ${car.plate || 'Chưa rõ'}]\n`;
            if (car.km) context += `  + ODO: ${car.km} km\n`;
            if (car.registry) context += `  + Hạn đăng kiểm: ${car.registry}\n`;
            if (car.insurance) context += `  + Hạn bảo hiểm: ${car.insurance}\n`;
            if (car.roadfee) context += `  + Phí đường bộ: ${car.roadfee}\n`;
            if (car.oil) context += `  + Hạn thay dầu: ${car.oil}\n`;
            if (car.filter) context += `  + Lọc gió/nhớt: ${car.filter}\n`;
            if (car.tire) context += `  + Hạn đảo lốp: ${car.tire}\n`;
            if (car.brake) context += `  + Bảo dưỡng phanh: ${car.brake}\n`;
            if (car.aircon) context += `  + Vệ sinh máy lạnh: ${car.aircon}\n`;
            if (car.licenseExpiry) context += `  + Hạn bằng lái: ${car.licenseExpiry}\n`;
            if (car.note) context += `  + Ghi chú riêng: ${car.note}\n`;
            context += "\n";
        });
        return context;
    } catch (err) {
        console.warn("Không lấy được dữ liệu xe từ Firebase:", err);
        return "Không có dữ liệu xe (Lỗi kết nối hệ thống dữ liệu).";
    }
}

/**
 * Gọi API Groq xử lý hội thoại dựa trên mô hình llama-3.1-8b-instant có trí nhớ dài hạn
 */
async function callGroq(userMsg) {
    const vehicleData = await getVehiclesContext();
    const cleanKey = GROQ_API_KEY.trim();

    const systemPrompt = `Bạn là một trợ lý ảo thông minh, nhiệt tình và cực kỳ am hiểu về xe của ứng dụng YourCarManagement.
Hôm nay là ngày 07/07/2026.

Nhiệm vụ của bạn là hỗ trợ người dùng quản lý xe. Khi người dùng hỏi về tình trạng xe, tuyệt đối KHÔNG liệt kê một danh sách dài thô kệch, khô khan. Hãy tuân thủ phong cách trả lời sau:
1. Đón chào bằng giọng điệu hào hứng, thân thiện kèm emoji phù hợp (Ví dụ: 🚗, ✨, 🛠️).
2. Tóm tắt nhanh tình trạng xe. Hãy chủ động phân loại các mốc thời gian so với hôm nay (07/07/2026):
   - ⚠️ Nhóm Khẩn cấp (Đã quá hạn hoặc sát ngày): Đưa lên đầu, nhắc nhở chủ xe đi xử lý ngay.
   - 📅 Nhóm Sắp đến hạn (Trong tháng này): Nhắc nhở để họ sắp xếp lịch trình.
   - ✅ Nhóm An tâm (Còn lâu mới đến hạn): Điểm qua ngắn gọn để chủ xe yên tâm.
3. Luôn đưa ra lời khuyên thực tế, hữu ích ở cuối câu trả lời.

Dưới đây là thông tin thực tế về xe của người dùng để bạn phân tích (Chỉ sử dụng khéo léo khi cần):
${vehicleData}`;

    // 1. Khởi tạo mảng hội thoại bắt đầu bằng System Prompt
    let apiMessages = [{ "role": "system", "content": systemPrompt }];

    // 2. Tìm phiên chat hiện tại trong bộ nhớ lưu trữ
    const currentSession = chatSessions.find(s => s.id === currentSessionId);

    if (currentSession && currentSession.messages && currentSession.messages.length > 0) {
        // Duyệt qua toàn bộ lịch sử tin nhắn đã lưu của session này để nạp vào API
        currentSession.messages.forEach(m => {
            apiMessages.push({
                // Trong DB của bạn lưu 'bot', nhưng API Groq yêu cầu vai trò là 'assistant'
                "role": m.role === 'user' ? 'user' : 'assistant', 
                "content": m.text
            });
        });
        
        // Thêm chính câu hỏi hiện tại mà người dùng vừa gõ vào cuối mảng lịch sử
        apiMessages.push({ "role": "user", "content": userMsg });
    } else {
        // Nếu là phiên chat mới tinh chưa có lịch sử, chỉ gửi câu hỏi hiện tại
        apiMessages.push({ "role": "user", "content": userMsg });
    }

    // 3. Đóng gói Request Body gửi lên Groq
    const requestBody = {
        "model": "llama-3.1-8b-instant",
        "messages": apiMessages, // Mảng này bây giờ đã chứa trọn vẹn lịch sử hội thoại
        "temperature": 0.75,
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

    // Tiến hành tạo ID phiên chat mới nếu đang gõ ở trạng thái tab trống
    if (!currentSessionId) {
        currentSessionId = 'session-' + Date.now();
        const shortTitle = text.length > 20 ? text.substring(0, 20) + '...' : text;
        
        chatSessions.unshift({
            id: currentSessionId,
            title: shortTitle,
            messages: []
        });
        localStorage.setItem(`current_session_id_${user}`, currentSessionId);
        chatContent.innerHTML = ''; // Dọn dẹp tin nhắn chào mặc định
    }

    const session = chatSessions.find(s => s.id === currentSessionId);

    // Lưu và hiển thị ngay tin nhắn của người dùng
    appendMessage('user', text);
    session.messages.push({ role: 'user', text: text });
    localStorage.setItem(`chat_sessions_${user}`, JSON.stringify(chatSessions));
    renderSidebar();
    chatInput.value = '';

    // Tạo hiệu ứng phân tích chờ xử lý dữ liệu
    const loadingId = 'loading-' + Date.now();
    const loadingMsg = document.createElement('div');
    loadingMsg.id = loadingId;
    loadingMsg.className = 'bot-msg-wrapper';
    loadingMsg.innerHTML = `<div class="bot-msg shadow-sm opacity-50"><i class="fas fa-spinner fa-spin me-2"></i>Đang suy nghĩ...</div>`;
    chatContent.appendChild(loadingMsg);
    chatContent.scrollTop = chatContent.scrollHeight;

    // Thực thi lấy phản hồi từ lõi AI
    const aiReply = await callGroq(text);

    // Gỡ bỏ hiệu ứng loading
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();

    // Lưu và kết xuất kết quả phản hồi cuối cùng ra giao diện rộng
    appendMessage('bot', aiReply);
    session.messages.push({ role: 'bot', text: aiReply });
    localStorage.setItem(`chat_sessions_${user}`, JSON.stringify(chatSessions));
}