const DB_URL = "https://yourcarmanagement-default-rtdb.asia-southeast1.firebasedatabase.app/"; 
const getUrl = (path) => `${DB_URL}${path}.json`;
function checkAuth() {
    const user = sessionStorage.getItem('logged_in_user');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
    }
    return user;
}
function handleLogout() {
    sessionStorage.removeItem('logged_in_user');
    window.location.href = 'index.html';
}
const commonStyle = `
<style>
    html, body { height: 100%; margin: 0; }
    body { display: flex; flex-direction: column; min-height: 100vh; font-family: 'Segoe UI', Tahoma, sans-serif; }
    .content-wrapper { flex: 1 0 auto; }
    .navbar { padding: 0.8rem 0 !important; }
    .custom-nav .nav-link { font-size: 14px !important; font-weight: 500; px: 12px; }
    .navbar-brand { font-size: 1.1rem !important; fw: bold; }
    footer { flex-shrink: 0; font-size: 12px; }
</style>
`;
document.head.insertAdjacentHTML('beforeend', commonStyle);