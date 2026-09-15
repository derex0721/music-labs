const status = document.getElementById('status');
document.getElementById('retry').addEventListener('click', () => location.reload());
window.verificationFailed = () => { status.textContent = '驗證載入失敗，請重新載入。 Verification failed. Please retry.'; };
window.verificationExpired = () => { status.textContent = '驗證已過期，請再試一次。 Verification expired.'; };
window.verified = async (token) => {
  status.textContent = '正在確認… Verifying…';
  try {
    const result = await fetch('/__verify', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    if (!result.ok) throw new Error('Verification failed');
    location.reload();
  } catch { window.verificationFailed(); window.turnstile?.reset(); }
};
setTimeout(() => { if (!window.turnstile) window.verificationFailed(); }, 15000);
