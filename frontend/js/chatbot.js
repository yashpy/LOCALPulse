let CHAT_BUSINESS_ID = null;

function initChatbot(businessId) {
  CHAT_BUSINESS_ID = businessId;
  const toggle = document.getElementById('chat-toggle');
  const panel = document.getElementById('chat-panel');
  const closeBtn = document.getElementById('chat-close');
  const sendBtn = document.getElementById('chat-send');
  const input = document.getElementById('chat-input');

  toggle.addEventListener('click', async () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) await loadChatHistory();
  });
  closeBtn.addEventListener('click', () => panel.classList.add('hidden'));

  sendBtn.addEventListener('click', sendChatMessage);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(); });
}

function appendMessage(role, text) {
  const box = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = `<div class="bubble"></div>`;
  div.querySelector('.bubble').textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

async function loadChatHistory() {
  const box = document.getElementById('chat-messages');
  box.innerHTML = '';
  if (!CHAT_BUSINESS_ID) return;
  try {
    const history = await api(`/businesses/${CHAT_BUSINESS_ID}/chat`);
    if (history.length === 0) {
      appendMessage('assistant', "Hi! I'm your LOCALPulse advisor. Ask me how to improve your ratings, reviews, or visibility — I'll pull your live Yelp/Google data first.");
    }
    history.forEach((h) => appendMessage(h.role, h.message));
  } catch (e) {
    appendMessage('assistant', `Couldn't load chat history: ${e.message}`);
  }
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || !CHAT_BUSINESS_ID) return;
  input.value = '';
  appendMessage('user', text);
  appendMessage('assistant', 'Thinking…');
  const box = document.getElementById('chat-messages');

  try {
    const res = await api(`/businesses/${CHAT_BUSINESS_ID}/chat`, { method: 'POST', body: { message: text } });
    box.lastChild.remove();
    appendMessage('assistant', res.reply);
  } catch (e) {
    box.lastChild.remove();
    appendMessage('assistant', `Error: ${e.message}`);
  }
}
