// The browser sends conversation messages only. The Worker holds the API secret.
const endpoint = 'https://late-paper-f272.sgb5.workers.dev/api/chat';
const form = document.querySelector('#chat-form');
const question = document.querySelector('#question');
const transcript = document.querySelector('#messages');
const send = document.querySelector('#send');
const reset = document.querySelector('#reset');
const status = document.querySelector('#status');
const welcome = transcript.firstElementChild.textContent;
let history = [];

function showMessage(role, text) {
  const bubble = document.createElement('p');
  bubble.className = 'bubble ' + role;
  const label = document.createElement('span');
  label.className = 'visually-hidden';
  label.textContent = role === 'user' ? 'You: ' : 'Advisor: ';
  bubble.append(label, text);
  transcript.append(bubble);
  transcript.scrollTop = transcript.scrollHeight;
  return bubble;
}

document.querySelectorAll('[data-prompt]').forEach((button) => {
  button.addEventListener('click', () => {
    question.value = button.dataset.prompt;
    question.focus();
  });
});

reset.addEventListener('click', () => {
  history = [];
  transcript.replaceChildren();
  showMessage('advisor', welcome);
  question.value = '';
  status.textContent = '';
  question.focus();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const content = question.value.trim();
  if (!content || send.disabled) return;
  const userMessage = { role: 'user', content };
  const bubble = showMessage('user', content);
  question.value = '';
  question.readOnly = send.disabled = reset.disabled = true;
  status.textContent = 'The advisor is preparing a reply…';

  // Keep the first exchange and the latest four so early preferences can carry forward.
  const recentHistory = history.length > 10 ? [...history.slice(0, 2), ...history.slice(-8)] : history;
  const messages = [...recentHistory, userMessage];
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(30000),
    });
    const result = await response.json();
    if (!response.ok || !result.reply) throw new Error(result.error || 'Please try again.');
    showMessage('advisor', result.reply);
    history = [...messages, { role: 'assistant', content: result.reply.slice(0, 2400) }];
    status.textContent = '';
  } catch (error) {
    bubble.remove();
    question.value = content;
    status.textContent = error.name === 'TypeError' || error.name === 'TimeoutError'
      ? 'Could not connect. Please try again.' : error.message;
  } finally {
    question.readOnly = send.disabled = reset.disabled = false;
    question.focus();
  }
});
