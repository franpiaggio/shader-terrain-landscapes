/* ============================================================
   quiz.js — tiny retrieval-practice widget. Immediate feedback.
   Markup:
     <div class="quiz" id="q1"
          data-q="Question text?"
          data-correct="2"
          data-options='["opt a","opt b","opt c"]'
          data-feedback="Why the answer is right."></div>
   Answers are rendered in DOM order with no formatting cues — keep them
   the same length so nothing leaks the correct one.
   ============================================================ */

function mount(div) {
  const question = div.dataset.q || '';
  const correct  = parseInt(div.dataset.correct, 10);
  const feedback = div.dataset.feedback || '';
  let options = [];
  try { options = JSON.parse(div.dataset.options || '[]'); } catch { options = []; }

  div.innerHTML = '';
  const q = document.createElement('div'); q.className = 'q'; q.textContent = question;
  div.appendChild(q);

  const fb = document.createElement('div'); fb.className = 'fb';
  let answered = false;

  options.forEach((text, i) => {
    const b = document.createElement('button');
    b.className = 'opt'; b.type = 'button'; b.textContent = text;
    b.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const right = i === correct;
      b.classList.add(right ? 'correct' : 'wrong');
      if (!right) {
        // also reveal the correct one
        div.querySelectorAll('.opt')[correct].classList.add('correct');
      }
      fb.textContent = (right ? '✓ ' : '✗ ') + feedback;
    });
    div.appendChild(b);
  });
  div.appendChild(fb);
}

// Clone the footer prev/Index/next nav into a sticky bar at the top of the page,
// so the reader can move back/forward without scrolling to the bottom.
function buildTopNav() {
  if (document.querySelector('.topbar')) return;
  const foot = document.querySelector('.lesson-nav');
  if (!foot) return;
  const bar = document.createElement('div');
  bar.className = 'topbar';
  bar.innerHTML = foot.innerHTML;
  document.body.insertBefore(bar, document.body.firstChild);
}

export function autoMount() {
  document.querySelectorAll('div.quiz[data-q]').forEach(mount);
  buildTopNav();
}

if (document.readyState !== 'loading') autoMount();
else addEventListener('DOMContentLoaded', autoMount);
