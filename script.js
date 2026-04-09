// ==========================================
// 1. CẤU HÌNH & KIỂM TRA ĐĂNG NHẬP
// ==========================================
const currentUser = sessionStorage.getItem('logged_in_user');
if (!currentUser && !window.location.href.includes('index.html')) {
	window.location.href = "index.html";
}
function handleLogout() {
    if (confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
        sessionStorage.clear();
        window.location.href = "index.html";
    }
}
// ==========================================
// 2. HÀM TÍNH NGÀY CHÍNH XÁC (Sửa lỗi +1 ngày)
// ==========================================
function getDaysLeft(dateString) {
	if (!dateString) return null;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const targetDate = new Date(dateString);
	targetDate.setHours(0, 0, 0, 0);
	const diffInMs = targetDate.getTime() - today.getTime();
	const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
	
	return diffInDays;
}
// ==========================================
// 3. QUẢN LÝ DỮ LIỆU
// ==========================================
function getCarList() {
    const user = sessionStorage.getItem('logged_in_user');
    if (!user) return [];
    const data = localStorage.getItem(`cars_data_${user}`);
    return data ? JSON.parse(data) : [];
}

function saveCarList(list) {
	localStorage.setItem(`cars_data_${currentUser}`, JSON.stringify(list));
}

function goToEdit(id) {
	localStorage.setItem('editing_car_id', id);
	window.location.href = "editor.html";
}

function goToAddNew() {
	localStorage.removeItem('editing_car_id');
	window.location.href = "editor.html";
}

// ==========================================
// 4. LOGIC TRANG CHỦ (BÁO TRƯỚC 30 NGÀY CHO BẰNG LÁI)
// ==========================================
function renderHomeAlerts() {
	const list = getCarList();
	const container = document.getElementById('alert-container');
	const statTotal = document.getElementById('stat-total');
	const statAlert = document.getElementById('stat-alert');
	
	if (!container) return;

	statTotal.innerText = list.length;
	let alertCount = 0;
	container.innerHTML = "";

	list.forEach(c => {
		// Danh sách 10 mục cần kiểm tra
		const checkItems = [
			{ l: 'Đăng kiểm', d: c.d_reg, icon: 'fa-file-contract', col: '#e74c3c', limit: 7 },
			{ l: 'Bảo hiểm', d: c.d_ins, icon: 'fa-shield-alt', col: '#3498db', limit: 7 },
			{ l: 'Phí đường bộ', d: c.d_road, icon: 'fa-road', col: '#f1c40f', limit: 7 },
			{ l: 'Thay dầu', d: c.d_oil, icon: 'fa-oil-can', col: '#2c3e50', limit: 7 },
			{ l: 'Lọc gió/nhớt', d: c.d_filter, icon: 'fa-wind', col: '#27ae60', limit: 7 },
			{ l: 'Đảo lốp', d: c.d_tire, icon: 'fa-circle-notch', col: '#8e44ad', limit: 7 },
			{ l: 'Hệ thống phanh', d: c.d_brake, icon: 'fa-stop-circle', col: '#c0392b', limit: 7 },
			{ l: 'Điều hòa', d: c.d_ac, icon: 'fa-snowflake', col: '#16a085', limit: 7 },
			{ l: 'Bằng lái tài xế', d: c.d_lic, icon: 'fa-id-card', col: '#d35400', limit: 30 } // Báo trước 30 ngày
		];

		checkItems.forEach(item => {
			const left = getDaysLeft(item.d);
			
			if (left !== null && left <= item.limit) {
				alertCount++;
				const isExpired = left < 0;
				
				// Phân loại màu sắc Badge
				let badgeClass = "bg-warning text-dark"; // Mặc định là vàng
				if (isExpired) badgeClass = "bg-danger"; // Đỏ nếu quá hạn
				if (!isExpired && item.l.includes('Bằng lái') && left > 7) badgeClass = "bg-info text-white"; // Xanh nếu báo sớm (bằng lái)

				container.innerHTML += `
					<div class="col-md-6 col-lg-4 mb-3">
						<div class="card border-0 shadow-sm p-3 h-100" style="border-left: 5px solid ${item.col} !important; border-radius: 15px;">
							<div class="d-flex align-items-start">
								<div class="me-3 mt-1" style="color: ${item.col}"><i class="fas ${item.icon} fa-lg"></i></div>
								<div class="flex-grow-1">
									<h6 class="fw-bold mb-1 small">${item.l}</h6>
									<p class="mb-2 small text-muted">Xe: <b>${c.plate}</b><br>Tài xế: ${c.driver_name || 'Chưa rõ'}</p>
									<span class="badge ${badgeClass}" style="font-size: 0.75rem;">
										${isExpired ? 'Quá hạn ' + Math.abs(left) + ' ngày' : 'Còn ' + left + ' ngày'}
									</span>
								</div>
								<button onclick="goToEdit(${c.id})" class="btn btn-sm btn-light border-0"><i class="fas fa-edit text-primary"></i></button>
							</div>
						</div>
					</div>`;
			}
		});
	});

	statAlert.innerText = alertCount;
	if (alertCount === 0) {
		container.innerHTML = `<div class="text-center py-5 w-100 opacity-50"><i class="fas fa-check-circle fa-3x text-success mb-2"></i><p>Mọi thứ đều ổn định!</p></div>`;
	}
}

// ==========================================
// 5. LOGIC TRANG DANH SÁCH (list.html)
// ==========================================
function renderListPage() {
    const list = getCarList();
    const container = document.getElementById('car-list');
    const search = document.getElementById('searchInput')?.value.toLowerCase() || "";
    if (!container) return;

    const filtered = list.filter(c => 
        c.name.toLowerCase().includes(search) || 
        c.plate.toLowerCase().includes(search) || 
        c.brand.toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center py-5 w-100 opacity-50"><i class="fas fa-search fa-3x mb-3"></i><p>Không tìm thấy xe phù hợp</p></div>`;
        return;
    }

    container.innerHTML = filtered.map(c => `
        <div class="col-12 col-xl-6 mb-4">
            <div class="card border-0 shadow-sm overflow-hidden" style="border-radius: 20px;">
                <div class="row g-0">
                    <div class="col-4 col-md-3">
                        <img src="${c.photo || 'https://via.placeholder.com/300x200?text=No+Photo'}" 
                             style="height: 100%; width: 100%; object-fit: cover; min-height: 120px;">
                    </div>
                    
                    <div class="col-8 col-md-9 p-3 d-flex flex-column justify-content-between">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="fw-bold mb-1 text-dark">${c.brand} ${c.name}</h6>
                                <span class="badge bg-primary-subtle text-primary px-2 py-1" style="font-size: 0.75rem;">${c.plate}</span>
                            </div>
                            <div class="text-end">
                                <small class="text-muted d-block" style="font-size: 0.7rem;"><i class="fas fa-user me-1"></i>${c.driver_name || 'N/A'}</small>
                                <small class="text-muted d-block" style="font-size: 0.7rem;"><i class="fas fa-tachometer-alt me-1"></i>${c.km || 0} km</small>
                            </div>
                        </div>

                        <div class="d-flex gap-2 mt-3 pt-2 border-top">
                            <button onclick="goToEdit(${c.id})" class="btn btn-sm btn-outline-primary flex-grow-1 border-0 bg-light" style="border-radius: 8px;">
                                <i class="fas fa-edit me-1"></i> Sửa
                            </button>
                            <button onclick="deleteCar(${c.id})" class="btn btn-sm btn-outline-danger flex-grow-1 border-0 bg-light" style="border-radius: 8px;">
                                <i class="fas fa-trash-alt me-1"></i> Xóa
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).reverse().join('');
}
function deleteCar(id) {
	if (confirm("Xóa hồ sơ xe này?")) {
		let list = getCarList().filter(c => c.id != id);
		saveCarList(list);
		renderListPage();
	}
}

// ==========================================
// 6. LOGIC TRANG EDITOR (editor.html)
// ==========================================
function initEditorPage() {
	const editId = localStorage.getItem('editing_car_id');
	const imgTarget = document.getElementById('img-target');
	const carForm = document.getElementById('car-form');
	let currentBase64 = "";

	if (!carForm) return;

	if (editId) {
		const car = getCarList().find(c => c.id == editId);
		if (car) {
			document.getElementById('edit-id').value = car.id;
			document.getElementById('brand').value = car.brand || "";
			document.getElementById('name').value = car.name || "";
			document.getElementById('plate').value = car.plate || "";
			document.getElementById('fuel').value = car.fuel || "Xăng";
			document.getElementById('km').value = car.km || "";
			document.getElementById('driver_name').value = car.driver_name || "";
			document.getElementById('driver_phone').value = car.driver_phone || "";
			document.getElementById('driver_rank').value = car.driver_rank || "";
			const dates = ['d_reg', 'd_ins', 'd_road', 'd_oil', 'd_filter', 'd_tire', 'd_brake', 'd_ac', 'd_lic'];
			dates.forEach(d => { if(document.getElementById(d)) document.getElementById(d).value = car[d] || ""; });
			document.getElementById('tasks').value = car.tasks || "";
			if (car.photo) { imgTarget.src = car.photo; currentBase64 = car.photo; }
		}
	}

	document.getElementById('carImage').onchange = (e) => {
		const reader = new FileReader();
		reader.onload = (ev) => { currentBase64 = ev.target.result; imgTarget.src = currentBase64; };
		if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
	};

	carForm.onsubmit = (e) => {
		e.preventDefault();
		let list = getCarList();
		const idToSave = document.getElementById('edit-id').value;

		const data = {
			id: idToSave ? parseInt(idToSave) : Date.now(),
			photo: currentBase64,
			brand: document.getElementById('brand').value,
			name: document.getElementById('name').value,
			plate: document.getElementById('plate').value,
			fuel: document.getElementById('fuel').value,
			km: document.getElementById('km').value,
			driver_name: document.getElementById('driver_name').value,
			driver_phone: document.getElementById('driver_phone').value,
			driver_rank: document.getElementById('driver_rank').value,
			d_reg: document.getElementById('d_reg').value,
			d_ins: document.getElementById('d_ins').value,
			d_road: document.getElementById('d_road').value,
			d_oil: document.getElementById('d_oil').value,
			d_filter: document.getElementById('d_filter').value,
			d_tire: document.getElementById('d_tire').value,
			d_brake: document.getElementById('d_brake').value,
			d_ac: document.getElementById('d_ac').value,
			d_lic: document.getElementById('d_lic').value,
			tasks: document.getElementById('tasks').value
		};

		if (idToSave) {
			const idx = list.findIndex(c => c.id == idToSave);
			list[idx] = data;
		} else { list.push(data); }

		saveCarList(list);
		localStorage.removeItem('editing_car_id');
		window.location.href = "list.html";
	};
}

// ==========================================
// 7. XUẤT EXCEL
// ==========================================
function handleExport() {
	const list = getCarList();
	if (list.length === 0) return alert("Không có dữ liệu!");
	const ws = XLSX.utils.json_to_sheet(list);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, "CarsData");
	XLSX.writeFile(wb, `YourCarManagement_Export.xlsx`);
}