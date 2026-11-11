import type { Explanation, VideoInfo } from '../types';

export interface CardActions {
  lessTopic(t: string): void; moreTopic(t: string): void; lessChannel(c: string): void; openDashboard(): void;
}
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const CSS = `
.wf-card{font-family:Roboto,Arial,sans-serif;margin:6px 0 4px;font-size:12px;color:#fff;position:relative;z-index:5}
.wf-pill{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:linear-gradient(135deg,#7C5CFC,#5B3FD6);font-size:11px;font-weight:600;box-shadow:0 2px 8px rgba(124,92,252,.35);transition:transform .15s}
.wf-pill:hover{transform:translateY(-1px)}
.wf-dot{width:7px;height:7px;border-radius:50%;background:#F6AD55}.wf-High .wf-dot{background:#20C997}.wf-Medium .wf-dot{background:#F6AD55}.wf-Low .wf-dot{background:#A0AEC0}
.wf-panel{display:none;margin-top:6px;padding:12px;border-radius:12px;background:#192438;border:1px solid #2A3A57;box-shadow:0 10px 30px rgba(0,0,0,.45);animation:wfIn .18s ease;max-width:320px}
.wf-card.wf-open .wf-panel{display:block}
@keyframes wfIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.wf-panel h4{margin:0 0 6px;font-size:12px;color:#20C997;font-weight:700;letter-spacing:.3px;text-transform:uppercase}
.wf-reason{font-size:13px;line-height:1.4;margin:0 0 8px}
.wf-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.wf-tag{padding:2px 8px;border-radius:6px;background:#121A2B;color:#A0AEC0;font-size:11px}
.wf-bar{height:5px;border-radius:3px;background:#121A2B;overflow:hidden;margin:4px 0 8px}.wf-bar i{display:block;height:100%;background:linear-gradient(90deg,#7C5CFC,#20C997)}
.wf-ev{margin:0 0 8px;padding-left:16px;color:#A0AEC0;line-height:1.4}
.wf-note{font-size:10.5px;color:#F6AD55;margin:0 0 8px}
.wf-btns{display:flex;gap:6px;flex-wrap:wrap}
.wf-btn{all:unset;cursor:pointer;padding:4px 9px;border-radius:7px;background:#121A2B;border:1px solid #2A3A57;font-size:11px;color:#fff}
.wf-btn:hover{border-color:#7C5CFC;background:#1b2740}
.wf-hidden{display:none!important}`;

export function ensureStyles() {
  if (document.getElementById('wf-style')) return;
  const s = document.createElement('style'); s.id = 'wf-style'; s.textContent = CSS; document.documentElement.appendChild(s);
}

export function removeAll() {
  document.querySelectorAll('.wf-card').forEach((n) => n.remove());
  document.querySelectorAll<HTMLElement>('[data-wf-id]').forEach((n) => { delete n.dataset.wfId; n.classList.remove('wf-hidden'); });
}

export function injectCard(host: HTMLElement, v: VideoInfo, x: Explanation, act: CardActions) {
  host.querySelectorAll(':scope .wf-card').forEach((n) => n.remove()); // avoid duplicates when YouTube recycles nodes
  const card = document.createElement('div');
  card.className = `wf-card wf-${x.confidence}`;
  const topic = x.topic ? esc(x.topic) : '';
  card.innerHTML = `
    <button class="wf-pill" type="button" aria-expanded="false"><span class="wf-dot"></span>Why this? · ${x.confidence}${x.preferred ? ' · ★' : ''}</button>
    <div class="wf-panel" role="dialog" aria-label="Estimated recommendation reason">
      <h4>Estimated reason</h4>
      <p class="wf-reason">${esc(x.reason)}</p>
      <div class="wf-row"><span class="wf-tag">Match ${x.score}/100</span><span class="wf-tag">Confidence: ${x.confidence}</span>
        ${topic ? `<span class="wf-tag">Topic: ${topic}</span>` : ''}${v.channel ? `<span class="wf-tag">Channel: ${esc(v.channel)}</span>` : ''}</div>
      <div class="wf-bar"><i style="width:${x.score}%"></i></div>
      <ul class="wf-ev">${x.evidence.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
      <p class="wf-note">Estimate from your local patterns only. WhyFeed cannot see YouTube's real algorithm.</p>
      <div class="wf-btns">
        ${topic ? `<button class="wf-btn" data-a="less">Show less “${topic}”</button><button class="wf-btn" data-a="more">Show more</button>` : ''}
        ${v.channel ? '<button class="wf-btn" data-a="chan">Reduce channel</button>' : ''}
        <button class="wf-btn" data-a="dash">Dashboard</button>
      </div></div>`;
  const stop = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
  card.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('.wf-pill')) { stop(e); const open = card.classList.toggle('wf-open'); card.querySelector('.wf-pill')!.setAttribute('aria-expanded', String(open)); return; }
    const a = t.closest<HTMLElement>('[data-a]')?.dataset.a;
    if (!a) { e.stopPropagation(); return; }
    stop(e);
    if (a === 'less') act.lessTopic(x.topic); else if (a === 'more') act.moreTopic(x.topic);
    else if (a === 'chan') act.lessChannel(v.channel); else act.openDashboard();
  });
  host.appendChild(card);
}
