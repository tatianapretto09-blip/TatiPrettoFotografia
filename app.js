/* Tati Pretto Fotografia — galerias
   O endereço do programa do Google Drive fica em config.js.
   Enquanto estiver vazio, o site funciona em modo demonstração. */
const CONFIG = Object.assign({ API: '', ESTUDIO: 'Tati Pretto Fotografia' }, window.TP_CONFIG || {});

/* ===================== utilidades ===================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const app = $('#app');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const params = new URLSearchParams(location.search);
const DEMO = !CONFIG.API;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
  sdel(k) { try { sessionStorage.removeItem(k); } catch (e) {} },
};
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
function dataBR(ms) { return ms ? new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''; }
function dataCurta(ms) { return ms ? new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''; }
async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); toast('Copiado'); }
  catch (e) { prompt('Copie o texto:', texto); }
}
const doisDig = n => String(n).padStart(2, '0');
function foneBR(d) {
  d = String(d || '').replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}
function linkWhats(d, texto = '') {
  d = String(d || '').replace(/\D/g, '');
  if (d.length <= 11) d = '55' + d;
  return `https://wa.me/${d}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;
}

const ICONS = {
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  mute: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M3 3l18 18"/>',
  cloud: '<path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4.3 12.5 3.5 3.5 0 0 0 6.5 19z"/><path d="m9 14 3-3 3 3M12 11v7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 5.1A10.5 10.5 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  dn: '<path d="m6 9 6 6 6-6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  back: '<path d="M19 12H5m0 0 7 7m-7-7 7-7"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/>',
  wa: '<path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.4z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-1 .8a4 4 0 0 1-2.1-2.1l.8-1-1-2z"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
};
const ic = (n, extra = '') => `<svg class="svg" viewBox="0 0 24 24" ${extra}>${ICONS[n] || ''}</svg>`;

/* ===================== imagens ===================== */
const DEMO_FOTOS = { 1: [960, 536], 2: [960, 717], 3: [960, 717], 4: [717, 960], 5: [960, 717], 6: [960, 717] };
const DEMO_URLS = {};
function demoSrc(id) { const m = /^demo-(\d)/.exec(id || ''); return m ? (DEMO_URLS[m[1]] || '') : null; }
async function carregarFotosDemo() {
  // as fotos de exemplo vêm do site antigo (já hospedado), só no modo demonstração
  try {
    const html = await (await fetch('demo/fotos-exemplo.html')).text();
    const todas = html.match(/data:image\/jpeg;base64,[A-Za-z0-9+\/=]+/g) || [];
    await Promise.all([0, 3, 4, 5, 6, 7].map(async (k, i) => {
      if (!todas[k]) return;
      DEMO_URLS[i + 1] = URL.createObjectURL(await (await fetch(todas[k])).blob());
    }));
  } catch (e) { /* sem fotos de exemplo */ }
}
function foto(id, larg) { return demoSrc(id) || `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${larg}`; }
function original(id) { return demoSrc(id) || `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`; }
function linkPasta(id) { return `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`; }
function musicaUrl(u) {
  u = String(u || '').trim();
  const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/);
  return m ? `https://drive.google.com/uc?export=download&id=${m[1]}` : u;
}
function marcaFundo(texto) {
  const t = String(texto || CONFIG.ESTUDIO).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='280' height='180'><g transform='rotate(-28 140 90)' font-family='Georgia,serif' font-size='18' text-anchor='middle'><text x='140' y='95' fill='black' fill-opacity='0.2' stroke='black' stroke-opacity='0.14' stroke-width='2'>${t}</text><text x='140' y='95' fill='white' fill-opacity='0.6'>${t}</text></g></svg>`;
  return `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg).replace(/'/g, '%27')}')`;
}
function tile(f, attrs = '', cls = '') {
  const r = (f.w && f.h) ? f.w / f.h : 1.5;
  return `<figure class="tile ${cls}" ${attrs} style="flex-grow:${r.toFixed(4)};flex-basis:calc(var(--row) * ${r.toFixed(4)})">
    <div class="ph" style="padding-top:${(100 / r).toFixed(3)}%"><img loading="lazy" alt="" src="${esc(foto(f.id, 1000))}"></div></figure>`;
}
const posicao = p => 'center ' + (p === 'top' ? '20%' : p === 'bottom' ? '80%' : '50%');

/* ===================== comunicação com o Drive ===================== */
async function api(acao, dados = {}) {
  if (DEMO) return demoApi(acao, JSON.parse(JSON.stringify(dados)));
  let r;
  try {
    r = await fetch(CONFIG.API, { method: 'POST', body: JSON.stringify(Object.assign({ acao }, dados)), redirect: 'follow' });
  } catch (e) { throw new Error('Sem conexão. Verifique a internet e tente de novo.'); }
  let j;
  try { j = await r.json(); } catch (e) { throw new Error('O servidor não respondeu como esperado. Tente de novo em instantes.'); }
  if (!j.ok) throw new Error(j.erro || 'Algo deu errado.');
  return j;
}

/* ===================== modo demonstração ===================== */
function demoSeed() {
  const ft = (k, s = '') => ({ id: `demo-${k}${s}`, n: `TP_${doisDig(k).padStart(4, '0')}${s}.jpg`, w: DEMO_FOTOS[k][0], h: DEMO_FOTOS[k][1], t: 4800000 });
  const sel = [1, 2, 3, 4, 5, 6, 2, 5, 1, 6, 3, 4].map((k, i) => ft(k, i < 6 ? '' : '-' + i));
  const now = Date.now();
  const base = { ativa: true, criadaEm: now, atualizadaEm: now, capaPosicao: 'center', musica: '', emailDrive: '', pessoas: {},
    transferencia: { estado: 'nenhuma', email: '', feitos: 0, total: 0, aceitos: 0 }, congelada: false };
  return {
    galerias: {
      'exemplo-selecao': Object.assign({}, base, {
        slug: 'exemplo-selecao', tipo: 'selecao', cliente: 'Família Souza', titulo: 'Família Souza', subtitulo: 'Ensaio de família',
        frase: 'Escolha suas fotos favoritas com calma. Cada pessoa da família pode fazer o seu cadastro e escolher as suas.', pin: '1234',
        pastaId: 'demo-pasta-sel', pastas: [{ id: 'demo-pasta-sel', nome: 'Fotos', frase: '', oculta: false, fotos: sel }],
        limite: 5, marca: 'Tati Pretto Fotografia', capa: 'demo-1',
        pessoas: { 'pdemo1': { id: 'pdemo1', nome: 'Marina (avó)', whats: '51999990000', email: '', fotos: { 'demo-2': 'Essa vai para o porta-retrato!', 'demo-4': '' }, finalizadaEm: now - 86400000, criadaEm: now - 90000000 } },
      }),
      'exemplo-entrega': Object.assign({}, base, {
        slug: 'exemplo-entrega', tipo: 'entrega', cliente: 'Clara & Gabriel', titulo: 'Clara & Gabriel', subtitulo: '14 de setembro de 2026 • Villa Toscana',
        frase: 'Cada detalhe deste dia guardado com carinho, para vocês reviverem sempre que quiserem.', pin: '1234',
        pastaId: 'demo-pasta-ent', limite: 0, marca: '', capa: 'demo-2', atualizadaEm: now - 1000,
        pastas: [
          { id: 'demo-p1', nome: 'Cerimônia', frase: 'Foi o dia em que o tempo parou para olhar a gente.', oculta: false, fotos: [ft(1), ft(2), ft(4), ft(6, '-b'), ft(3, '-c'), ft(5, '-c'), ft(2, '-c'), ft(4, '-c'), ft(1, '-c')] },
          { id: 'demo-p2', nome: 'Detalhes', frase: 'Os pequenos gestos que ninguém viu, mas a câmera guardou.', oculta: false, fotos: [ft(3), ft(6), ft(1, '-b'), ft(4, '-d')] },
          { id: 'demo-p3', nome: 'Festa', frase: 'E a noite terminou com luzes, abraços e muita dança.', oculta: false, fotos: [ft(5), ft(2, '-b'), ft(4, '-b'), ft(3, '-b'), ft(6, '-d')] },
        ],
      }),
    },
  };
}
function demoDb() {
  const raw = store.get('tp_demo_v2');
  if (raw) { try { return JSON.parse(raw); } catch (e) {} }
  const db = demoSeed(); store.set('tp_demo_v2', JSON.stringify(db)); return db;
}
function demoSave(db) { store.set('tp_demo_v2', JSON.stringify(db)); }
const espera = ms => new Promise(r => setTimeout(r, ms));
function todas(g) { const l = []; g.pastas.forEach(p => p.fotos.forEach(f => l.push(f))); return l; }
const visaoPessoa = p => p ? { id: p.id, nome: p.nome, fotos: p.fotos || {}, finalizadaEm: p.finalizadaEm || null } : null;
function demoVisao(g, pid) {
  const b = { slug: g.slug, tipo: g.tipo, cliente: g.cliente, titulo: g.titulo, subtitulo: g.subtitulo, frase: g.frase, estudio: CONFIG.ESTUDIO };
  if (g.tipo === 'selecao') return Object.assign(b, { fotos: todas(g), limite: g.limite, marca: g.marca, pessoa: visaoPessoa(g.pessoas[pid]) });
  return Object.assign(b, {
    pastas: g.pastas.filter(p => !p.oculta && p.fotos.length), capa: g.capa, capaPosicao: g.capaPosicao, musica: g.musica,
    emailDrive: g.emailDrive, transferencia: g.transferencia,
  });
}
function demoResumo(g) {
  const f = todas(g); const ps = Object.values(g.pessoas || {});
  return { slug: g.slug, tipo: g.tipo, cliente: g.cliente, titulo: g.titulo, pin: g.pin, ativa: g.ativa !== false, capa: g.capa || (f[0] && f[0].id),
    totalFotos: f.length, pessoas: ps.length, finalizadas: ps.filter(p => p.finalizadaEm).length,
    escolhidas: ps.reduce((s, p) => s + Object.keys(p.fotos || {}).length, 0), limite: g.limite,
    transferencia: g.transferencia.estado, atualizadaEm: g.atualizadaEm, link: location.origin + location.pathname + '?g=' + g.slug };
}
function demoCompleta(g) { return Object.assign({}, g, { link: location.origin + location.pathname + '?g=' + g.slug, pastaUrl: '#' }); }
async function demoApi(acao, d) {
  await espera(220);
  const db = demoDb();
  const pega = slug => { const g = db.galerias[slug]; if (!g) throw new Error('Galeria não encontrada. Confira o link que você recebeu.'); return g; };
  const cliente = () => { const g = pega(d.slug); if (g.ativa === false) throw new Error('Galeria não encontrada.'); if (String(d.pin || '').trim() !== g.pin) throw new Error('Senha incorreta.'); return g; };
  const adm = () => { if (d.senha !== 'demo') throw new Error('Senha incorreta. No modo demonstração a senha é: demo'); };
  const r = o => { demoSave(db); return Object.assign({ ok: true }, o); };
  switch (acao) {
    case 'abrir': return r({ galeria: demoVisao(cliente(), d.pessoa) });
    case 'entrarPessoa': {
      const g = cliente();
      const nome = String(d.nome || '').trim(), whats = String(d.whats || '').replace(/\D/g, ''), email = String(d.email || '').trim().toLowerCase();
      if (nome.length < 2) throw new Error('Digite seu nome.');
      if (whats.length < 10) throw new Error('Digite seu WhatsApp com DDD.');
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('E-mail inválido.');
      let p = Object.values(g.pessoas).find(x => x.whats === whats);
      if (!p) { const id = Math.random().toString(36).slice(2, 12); p = g.pessoas[id] = { id, nome, whats, email, fotos: {}, finalizadaEm: null, criadaEm: Date.now() }; }
      else { p.nome = nome; if (email) p.email = email; }
      g.atualizadaEm = Date.now();
      return r({ pessoa: visaoPessoa(p) });
    }
    case 'salvarEscolha': case 'finalizarEscolha': {
      const g = cliente(); const p = g.pessoas[d.pessoa];
      if (!p) throw new Error('Faça seu cadastro de novo, por favor.');
      if (p.finalizadaEm) throw new Error('Sua escolha já foi enviada.');
      p.fotos = d.fotos || {};
      if (acao === 'finalizarEscolha') { if (!Object.keys(p.fotos).length) throw new Error('Escolha pelo menos uma foto antes de enviar.'); p.finalizadaEm = Date.now(); }
      g.atualizadaEm = Date.now();
      return r({ pessoa: visaoPessoa(p) });
    }
    case 'enviarParaDrive': {
      const g = cliente(); const t = g.transferencia;
      if (t.estado === 'nenhuma') {
        const email = (g.emailDrive || d.email || '').trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Informe um e-mail válido do Google Drive.');
        g.transferencia = { estado: 'enviando', email, feitos: 0, total: todas(g).length + g.pastas.length + 1, aceitos: 0 };
      }
      const tt = g.transferencia;
      if (tt.estado === 'enviando') { await espera(600); tt.feitos = Math.min(tt.total, tt.feitos + 5); if (tt.feitos >= tt.total) tt.estado = 'aguardando_aceite'; }
      return r({ transferencia: tt });
    }
    case 'painelEntrar': adm(); return r({ email: 'tatianapretto09@gmail.com', pastaSelecao: '#', pastaEntrega: '#' });
    case 'painelListar': adm(); return r({ galerias: Object.values(db.galerias).map(demoResumo).sort((a, b) => b.atualizadaEm - a.atualizadaEm) });
    case 'painelAbrir': adm(); return r({ galeria: demoCompleta(pega(d.slug)) });
    case 'painelCriar': {
      adm();
      if (!String(d.cliente || '').trim()) throw new Error('Informe o nome do cliente.');
      const base = String(d.cliente).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'galeria';
      const slug = base + '-' + Math.random().toString(36).slice(2, 6);
      const tipo = d.tipo === 'entrega' ? 'entrega' : 'selecao';
      const fotos = [1, 2, 3, 4, 5, 6].map(k => ({ id: `demo-${k}-${slug}`, n: `TP_000${k}.jpg`, w: DEMO_FOTOS[k][0], h: DEMO_FOTOS[k][1], t: 4800000 }));
      const g = {
        slug, tipo, cliente: d.cliente.trim(), titulo: d.cliente.trim(), subtitulo: '',
        frase: tipo === 'entrega' ? 'Cada detalhe deste dia guardado com carinho, para vocês reviverem sempre que quiserem.' : 'Escolha suas fotos favoritas com calma. Cada pessoa pode fazer o seu cadastro e escolher as suas.',
        pin: /^\d{4,8}$/.test(d.pin || '') ? d.pin : String(Math.floor(1000 + Math.random() * 9000)),
        pastaId: 'demo-' + slug, pastas: tipo === 'entrega'
          ? [{ id: 'demo-a-' + slug, nome: 'Principais', frase: '', oculta: false, fotos: fotos.slice(0, 3) }, { id: 'demo-b-' + slug, nome: 'Família', frase: '', oculta: false, fotos: fotos.slice(3) }]
          : [{ id: 'demo-a-' + slug, nome: 'Fotos', frase: '', oculta: false, fotos }],
        ativa: true, criadaEm: Date.now(), atualizadaEm: Date.now(), limite: Number(d.limite || 0), marca: d.marca || CONFIG.ESTUDIO,
        pessoas: {}, capa: fotos[0].id, capaPosicao: 'center', musica: '', emailDrive: (d.emailDrive || '').toLowerCase(),
        transferencia: { estado: 'nenhuma', email: '', feitos: 0, total: 0, aceitos: 0 }, congelada: false,
      };
      db.galerias[slug] = g;
      return r({ galeria: demoCompleta(g) });
    }
    case 'painelSalvar': {
      adm(); const g = pega(d.slug); const x = d.dados || {};
      ['cliente', 'titulo', 'subtitulo', 'frase', 'marca', 'musica', 'capa', 'capaPosicao'].forEach(k => { if (k in x) g[k] = String(x[k] || '').trim(); });
      if ('pin' in x) { if (!/^\d{4,8}$/.test(String(x.pin))) throw new Error('A senha precisa ter de 4 a 8 números.'); g.pin = String(x.pin); }
      if ('limite' in x) g.limite = Math.max(0, Number(x.limite) || 0);
      if ('ativa' in x) g.ativa = !!x.ativa;
      if ('emailDrive' in x) {
        const e = String(x.emailDrive || '').trim().toLowerCase();
        if (e && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('E-mail do Drive inválido.');
        if (g.transferencia.estado !== 'nenhuma' && e !== g.emailDrive) throw new Error('A transferência já começou; o e-mail não pode mais ser trocado.');
        g.emailDrive = e;
      }
      if (Array.isArray(x.pastas)) {
        const m = {}; g.pastas.forEach(p => m[p.id] = p);
        g.pastas = x.pastas.filter(p => m[p.id]).map(p => Object.assign(m[p.id], { nome: String(p.nome || '').trim() || m[p.id].nome, frase: String(p.frase || '').trim(), oculta: !!p.oculta }));
      }
      g.atualizadaEm = Date.now();
      return r({ galeria: demoCompleta(g) });
    }
    case 'painelAtualizarFotos': adm(); await espera(400); return r({ galeria: demoCompleta(pega(d.slug)) });
    case 'painelNovaPasta': {
      adm(); const g = pega(d.slug);
      if (!String(d.nome || '').trim()) throw new Error('Dê um nome para a pasta.');
      g.pastas.push({ id: 'demo-n-' + Date.now(), nome: d.nome.trim(), frase: '', oculta: false, fotos: [] });
      return r({ galeria: demoCompleta(g) });
    }
    case 'painelReabrirEscolha': { adm(); const g = pega(d.slug); const p = g.pessoas[d.pessoa]; if (!p) throw new Error('Cadastro não encontrado.'); p.finalizadaEm = null; return r({ galeria: demoCompleta(g) }); }
    case 'painelExcluirPessoa': { adm(); const g = pega(d.slug); delete g.pessoas[d.pessoa]; return r({ galeria: demoCompleta(g) }); }
    case 'painelExcluir': adm(); pega(d.slug); delete db.galerias[d.slug]; return r({});
    case 'painelVerificarTransferencia': {
      adm(); const g = pega(d.slug); const t = g.transferencia;
      if (t.estado === 'nenhuma') throw new Error('O cliente ainda não pediu as fotos no Drive.');
      if (t.estado === 'aguardando_aceite') { t.aceitos = t.total; t.estado = 'aceita'; t.bytesAceitos = todas(g).length * 4800000; }
      return r({ galeria: demoCompleta(g) });
    }
    case 'painelLiberarEspaco': {
      adm(); const g = pega(d.slug); const t = g.transferencia;
      if (t.estado !== 'aceita') return r({ galeria: demoCompleta(g), removidos: 0, aindaSeus: t.total });
      t.estado = 'liberada'; g.congelada = true;
      return r({ galeria: demoCompleta(g), removidos: t.total, aindaSeus: 0 });
    }
  }
  throw new Error('Ação desconhecida.');
}

/* ===================== janelas ===================== */
function abrirJanela(html, opcoes = {}) {
  const bg = document.createElement('div');
  bg.className = 'janela-fundo';
  bg.innerHTML = `<div class="janela" role="dialog" aria-modal="true" style="${opcoes.largura ? 'max-width:' + opcoes.largura + 'px' : ''}">${html}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg && !opcoes.fixa) fecharJanela(bg); });
  document.body.appendChild(bg);
  document.body.style.overflow = 'hidden';
  return bg;
}
function fecharJanela(bg) {
  const alvo = bg || $$('.janela-fundo').pop();
  if (alvo) alvo.remove();
  if (!$('.janela-fundo') && !$('.lb')) document.body.style.overflow = '';
}
function confirmar(titulo, texto, botao = 'Confirmar', perigo = false) {
  return new Promise(res => {
    const j = abrirJanela(`<h3>${esc(titulo)}</h3><p>${texto}</p>
      <div class="janela-acoes"><button class="btn btn-linha" data-n>Cancelar</button><button class="btn ${perigo ? 'btn-perigo' : 'btn-ouro'}" data-s>${esc(botao)}</button></div>`);
    $('[data-n]', j).onclick = () => { fecharJanela(j); res(false); };
    $('[data-s]', j).onclick = () => { fecharJanela(j); res(true); };
  });
}

/* ===================== visualizador de fotos ===================== */
function abrirVisualizador(lista, indice, opcoes) {
  let i = Math.max(0, indice);
  const lb = document.createElement('div');
  lb.className = 'lb' + (opcoes.protegida ? ' protege' : '');
  document.body.appendChild(lb);
  document.body.style.overflow = 'hidden';
  function desenhar() {
    const f = lista[i];
    lb.innerHTML = `
      <div class="lb-topo"><span>${i + 1} de ${lista.length}</span><span class="espaco"></span>${opcoes.topo ? opcoes.topo(f) : ''}
        <button class="icon-btn" data-fechar aria-label="Fechar">${ic('x')}</button></div>
      <div class="lb-palco">
        <button class="lb-seta lb-ant" data-ant aria-label="Anterior">${ic('left')}</button>
        <div class="lb-fig"><img src="${esc(foto(f.id, opcoes.largura || 2000))}" alt="" draggable="false">
          ${opcoes.marca ? `<div class="wm" style="background-image:${marcaFundo(opcoes.marca)}"></div>` : ''}</div>
        <button class="lb-seta lb-prox" data-prox aria-label="Próxima">${ic('right')}</button>
      </div>
      <div class="lb-base">${opcoes.base ? opcoes.base(f) : ''}</div>`;
    $('[data-fechar]', lb).onclick = fechar;
    $('[data-ant]', lb).onclick = () => ir(-1);
    $('[data-prox]', lb).onclick = () => ir(1);
    if (opcoes.ligar) opcoes.ligar(lb, f, desenhar);
    const prox = lista[(i + 1) % lista.length];
    if (prox) { const pre = new Image(); pre.src = foto(prox.id, opcoes.largura || 2000); }
  }
  function ir(d) { if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') document.activeElement.blur(); i = (i + d + lista.length) % lista.length; desenhar(); }
  function fechar() { document.removeEventListener('keydown', teclas); lb.remove(); if (!$('.janela-fundo')) document.body.style.overflow = ''; if (opcoes.aoFechar) opcoes.aoFechar(); }
  function teclas(e) {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') { if (e.key === 'Escape') e.target.blur(); return; }
    if (e.key === 'Escape') fechar(); else if (e.key === 'ArrowLeft') ir(-1); else if (e.key === 'ArrowRight') ir(1);
  }
  document.addEventListener('keydown', teclas);
  let x0 = null, y0 = null;
  lb.addEventListener('touchstart', e => { if (e.target.closest('textarea,button')) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) ir(dx < 0 ? 1 : -1);
    x0 = null;
  });
  if (opcoes.protegida) lb.addEventListener('contextmenu', e => e.preventDefault());
  desenhar();
}

/* ===================== entrada ===================== */
const faixaDemo = () => DEMO ? `<div class="faixa-demo">Modo demonstração — o site ainda não está ligado ao seu Google Drive. As fotos são de exemplo.</div>` : '';

function telaInicio() {
  document.title = CONFIG.ESTUDIO + ' • Galerias';
  app.innerHTML = `${faixaDemo()}
  <div class="portao"><div class="portao-card">
    <div class="marca">${esc(CONFIG.ESTUDIO)}<small>Galerias</small></div>
    <h1>Acesse sua <em class="ouro">galeria</em></h1>
    <p>Abra o link que você recebeu. Se preferir, digite o código da galeria e a senha.</p>
    <form id="f">
      <label class="campo"><input class="input" name="codigo" placeholder="Código da galeria" autocomplete="off" required></label>
      <label class="campo"><input class="input" name="pin" placeholder="Senha" inputmode="numeric" autocomplete="off" required></label>
      <button class="btn btn-ouro" style="width:100%">Entrar</button>
    </form>
    ${DEMO ? `<div class="orn">✦</div><div class="demo-cards">
      <a class="demo-card" href="?g=exemplo-entrega"><img src="${demoSrc('demo-1')}" alt=""><div><b>Exemplo: fotos prontas</b><span>Estilo revista • senha 1234</span></div></a>
      <a class="demo-card" href="?g=exemplo-selecao"><img src="${demoSrc('demo-2')}" alt=""><div><b>Exemplo: escolha de fotos</b><span>Cadastro, escolha e comentários • senha 1234</span></div></a>
      <a class="demo-card" href="?painel"><img src="${demoSrc('demo-3')}" alt=""><div><b>Painel da fotógrafa</b><span>Editar tudo • senha demo</span></div></a>
    </div>` : ''}
    <p style="margin-top:30px"><a href="?painel" class="muted" style="font-size:12.5px;text-decoration:none">Área da fotógrafa</a></p>
  </div></div>`;
  $('#f').onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const codigo = String(fd.get('codigo')).trim().replace(/^.*[?&]g=/, '');
    store.set('tp_pin_' + codigo, String(fd.get('pin')).trim());
    location.href = '?g=' + encodeURIComponent(codigo);
  };
}

/* ===================== galeria do cliente ===================== */
let G = null, PIN = '', SLUG = '';

async function abrirGaleria(slug) {
  SLUG = slug;
  const pin = store.get('tp_pin_' + slug);
  if (!pin) return telaSenha();
  app.innerHTML = `<div class="loading"><div class="spin"></div>Abrindo sua galeria…</div>`;
  let r;
  try { r = await api('abrir', { slug, pin, pessoa: store.get('tp_pessoa_' + slug) || '' }); }
  catch (e) { store.del('tp_pin_' + slug); return telaSenha(e.message); }
  G = r.galeria; PIN = pin;
  document.title = G.titulo + ' • ' + CONFIG.ESTUDIO;
  if (G.tipo === 'selecao') {
    if (!G.pessoa) { store.del('tp_pessoa_' + slug); return telaCadastro(); }
    return telaSelecao();
  }
  telaRevista();
}

function telaSenha(erro = '') {
  document.title = CONFIG.ESTUDIO;
  window.scrollTo(0, 0);
  app.innerHTML = `${faixaDemo()}<div class="portao"><div class="portao-card">
    <div class="marca">${esc(CONFIG.ESTUDIO)}<small>Galeria privada</small></div>
    <h1>Que bom ter <em class="ouro">você aqui</em></h1>
    <p>Digite a senha que você recebeu para ver suas fotos.</p>
    <form id="f">
      <input class="input pin" name="pin" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="••••" aria-label="Senha" required autofocus>
      <button class="btn btn-ouro" style="width:100%;margin-top:14px">Ver minhas fotos</button>
      <div class="erro">${esc(erro)}</div>
    </form>
    ${DEMO ? '<p class="dica">No exemplo, a senha é 1234.</p>' : ''}
  </div></div>`;
  $('#f').onsubmit = e => {
    e.preventDefault();
    store.set('tp_pin_' + SLUG, String(new FormData(e.target).get('pin')).trim());
    abrirGaleria(SLUG);
  };
}

/* ---------- cadastro de quem vai escolher ---------- */
function telaCadastro(erro = '') {
  window.scrollTo(0, 0);
  app.innerHTML = `${faixaDemo()}<div class="portao"><div class="portao-card">
    <div class="marca">${esc(G.titulo)}<small>Escolha de fotos</small></div>
    <h1>Quem está <em class="ouro">escolhendo?</em></h1>
    <p>Cada pessoa pode fazer o seu cadastro e escolher as suas fotos.</p>
    <form id="f" autocomplete="on">
      <label class="campo"><span>Seu nome</span><input class="input" name="nome" autocomplete="name" placeholder="Ex.: Ana Souza" required></label>
      <label class="campo"><span>Seu WhatsApp (com DDD)</span><input class="input" name="whats" type="tel" inputmode="tel" autocomplete="tel" placeholder="(51) 99999-9999" required></label>
      <label class="campo"><span>E-mail <i class="muted" style="font-style:normal">(opcional)</i></span><input class="input" name="email" type="email" autocomplete="email" placeholder="voce@email.com"></label>
      <button class="btn btn-ouro" style="width:100%">Começar a escolher</button>
      <div class="erro" id="er">${esc(erro)}</div>
    </form>
    <p class="dica" style="margin-top:18px">Já começou em outro celular? Use o mesmo WhatsApp e suas fotos aparecem do jeito que você deixou.</p>
  </div></div>`;
  $('#f').onsubmit = async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    const b = $('#f button'); b.disabled = true; b.textContent = 'Entrando…';
    try {
      const r = await api('entrarPessoa', Object.assign({ slug: G.slug, pin: PIN }, fd));
      store.set('tp_pessoa_' + G.slug, r.pessoa.id);
      G.pessoa = r.pessoa;
      telaSelecao();
    } catch (err) { $('#er').textContent = err.message; b.disabled = false; b.textContent = 'Começar a escolher'; }
  };
}

/* ---------- seleção (simples) ---------- */
function telaSelecao() {
  const g = G, p = g.pessoa;
  const escolha = Object.assign({}, p.fotos || {});
  let enviada = !!p.finalizadaEm;
  let filtro = enviada ? 'escolhidas' : 'todas';
  let estado = '';
  const abertos = new Set();
  const loja = g.loja && g.loja.produtos && g.loja.produtos.length ? g.loja : null;
  const carrinho = (p.carrinho || []).map(x => Object.assign({}, x, { fotos: (x.fotos || []).slice() }));
  const chaveRasc = 'tp_rasc_' + g.slug + '_' + p.id;
  const rasc = store.get(chaveRasc);
  if (!enviada && rasc && !Object.keys(escolha).length) { try { Object.assign(escolha, JSON.parse(rasc)); } catch (e) {} }

  const salvar = debounce(async () => {
    if (enviada) return;
    estado = 'Salvando…'; pintarBarras();
    try { await api('salvarEscolha', { slug: g.slug, pin: PIN, pessoa: p.id, fotos: escolha, carrinho }); estado = 'Tudo salvo'; }
    catch (e) { estado = 'Não foi possível salvar agora'; }
    pintarBarras();
  }, 1000);
  function mudou() {
    carrinho.forEach(it => { it.fotos = it.fotos.filter(id => id in escolha); });
    store.set(chaveRasc, JSON.stringify(escolha)); estado = 'Salvando…'; pintarBarras(); salvar();
  }
  const ctxLoja = () => ({ g, escolha, carrinho, numero: id => numero(id), aoMudar: mudou });
  const total = () => Object.keys(escolha).length;
  const numero = id => g.fotos.findIndex(f => f.id === id) + 1;
  const visiveis = () => filtro === 'escolhidas' ? g.fotos.filter(f => f.id in escolha) : g.fotos;
  const partes = String(g.titulo).split(' & ');

  window.scrollTo(0, 0);
  app.innerHTML = `${faixaDemo()}
    <div class="sel-topo"><div class="wrap">
      <div class="ola">Olá, <b>${esc(p.nome)}</b><a id="trocar">Não é você? Trocar</a></div>
      <span class="espaco"></span>
      <div class="contador" id="cont"></div>
    </div><div class="barra-prog"><i id="prog"></i></div></div>
    <header class="wrap sel-cab">
      <span class="cap">${esc(g.subtitulo || 'Escolha de fotos')}</span>
      <h1>${esc(partes[0])}${partes[1] ? ` <em class="ouro">&amp; ${esc(partes.slice(1).join(' & '))}</em>` : ''}</h1>
      <p>${esc(g.frase)}</p>
      <div class="como">
        <div><b><i>1</i> Escolha</b>Toque em “Escolher” nas fotos que você mais gostou.</div>
        <div><b><i>2</i> Comente</b>Nas escolhidas, toque em “Comentar” se quiser pedir algum ajuste.</div>
        ${loja ? `<div><b><i>3</i> Produtos</b>Se quiser, veja o catálogo e coloque suas fotos em quadros, álbuns e mais.</div>` : ''}
        <div><b><i>${loja ? 4 : 3}</i> Envie</b>Quando terminar, toque em “Enviar minha escolha”.</div>
      </div>
    </header>
    <main class="wrap" style="padding-bottom:140px">
      <div id="aviso"></div>
      <div class="filtros" id="filtros"></div>
      <div class="grade-sel protege" id="grade"></div>
    </main>
    <div class="rodape-sel"><div class="in" id="rodape"></div></div>`;

  $('#trocar').onclick = () => { store.del('tp_pessoa_' + g.slug); G.pessoa = null; telaCadastro(); };

  function pintarBarras() {
    const n = total();
    const acima = g.limite && n > g.limite;
    $('#cont').className = 'contador' + (acima ? ' acima' : '');
    $('#cont').innerHTML = `<b>${n}</b><span>${g.limite ? `de ${g.limite} do pacote` : (n === 1 ? 'escolhida' : 'escolhidas')}</span>`;
    $('#prog').style.width = (g.limite ? Math.min(100, 100 * n / g.limite) : (n ? 100 : 0)) + '%';
    $('#rodape').innerHTML = enviada
      ? `<div class="txt">${ic('check', 'style="vertical-align:-4px;color:var(--gold)"')} Escolha enviada<small>${n} ${n === 1 ? 'foto' : 'fotos'} • ${dataBR(p.finalizadaEm)}</small></div>`
      : `<div class="txt">${n} ${n === 1 ? 'foto escolhida' : 'fotos escolhidas'}${acima ? ` <span style="color:var(--warn)">(${n - g.limite} além do pacote)</span>` : ''}<small>${esc(estado || 'Suas escolhas são salvas sozinhas')}</small></div>
         <span class="espaco"></span>${loja ? `<button class="btn btn-linha" id="produtos">${ic('plus')} Produtos${carrinho.length ? ` (${carrinho.length})` : ''}</button>` : ''}<button class="btn btn-ouro" id="enviar" ${n ? '' : 'disabled'}>Enviar minha escolha</button>`;
    const b = $('#enviar'); if (b) b.onclick = () => (loja && !carrinho.length ? abrirLoja(Object.assign(ctxLoja(), { aoContinuar: revisar })) : revisar());
    const bp = $('#produtos'); if (bp) bp.onclick = () => abrirLoja(ctxLoja());
    $('#filtros').innerHTML = `<button class="chip ${filtro === 'todas' ? 'on' : ''}" data-f="todas">Todas as fotos (${g.fotos.length})</button>
      <button class="chip ${filtro === 'escolhidas' ? 'on' : ''}" data-f="escolhidas">Minhas escolhidas (${n})</button>`;
    $$('[data-f]').forEach(x => x.onclick = () => { filtro = x.dataset.f; pintarBarras(); pintarGrade(); });
  }
  function cartao(f) {
    const on = f.id in escolha;
    const com = escolha[f.id] || '';
    const aberto = on && (abertos.has(f.id) || com);
    let baixo;
    if (enviada) baixo = on && com ? `<div class="coment" style="padding-top:12px"><div class="aviso ouro" style="margin:0">“${esc(com)}”</div></div>` : '';
    else baixo = `<div class="acoes">
        <button class="btn btn-linha btn-escolher ${on ? 'on' : ''}" data-esc>${ic('heart')} ${on ? 'Escolhida' : 'Escolher'}</button>
        ${on ? `<button class="btn btn-linha" data-com>${ic('msg')} ${com ? 'Comentário' : 'Comentar'}</button>` : ''}
      </div>
      ${aberto ? `<div class="coment"><textarea class="input" data-txt maxlength="500" placeholder="Ex.: clarear um pouco, tirar a mancha da parede…">${esc(com)}</textarea></div>` : ''}`;
    return `<div class="foto-sel ${on ? 'escolhida' : ''}" data-id="${esc(f.id)}">
      <div class="quadro" data-ver><img loading="lazy" src="${esc(foto(f.id, 900))}" alt="Foto ${numero(f.id)}" draggable="false">
        <div class="wm" style="background-image:${marcaFundo(g.marca)}"></div>
        <span class="num">Foto ${numero(f.id)}</span><span class="selo">${ic('heart', 'style="width:13px;height:13px;fill:currentColor"')} Escolhida</span></div>
      ${baixo}</div>`;
  }
  function pintarGrade() {
    const lista = visiveis();
    $('#aviso').innerHTML = enviada
      ? `<div class="feito"><b>Obrigada, ${esc(p.nome.split(' ')[0])}!</b> Sua escolha foi enviada${p.finalizadaEm ? ' em ' + dataBR(p.finalizadaEm) : ''}. Se precisar mudar algo, é só falar com a Tati.</div>${blocoPedidoCliente(p, g)}` : '';
    $('#grade').innerHTML = lista.length ? lista.map(cartao).join('')
      : `<div class="vazio" style="grid-column:1/-1">Você ainda não escolheu nenhuma foto. Toque em “Escolher” nas suas favoritas.</div>`;
  }
  function repintar(id) {
    const el = $(`.foto-sel[data-id="${CSS.escape(id)}"]`);
    if (!el) return;
    if (filtro === 'escolhidas' && !(id in escolha)) { el.remove(); if (!total()) pintarGrade(); return; }
    el.outerHTML = cartao(g.fotos.find(x => x.id === id));
  }
  function alternar(id) {
    if (enviada) return;
    if (id in escolha) { delete escolha[id]; abertos.delete(id); } else escolha[id] = '';
    repintar(id); mudou();
  }

  $('#grade').addEventListener('click', e => {
    const card = e.target.closest('.foto-sel'); if (!card) return;
    const id = card.dataset.id;
    if (e.target.closest('[data-esc]')) return alternar(id);
    if (e.target.closest('[data-com]')) {
      if (abertos.has(id) && !escolha[id]) abertos.delete(id); else abertos.add(id);
      repintar(id);
      const ta = $(`.foto-sel[data-id="${CSS.escape(id)}"] textarea`); if (ta) ta.focus();
      return;
    }
    if (e.target.closest('[data-ver]')) {
      const lista = visiveis();
      abrirVisualizador(lista, lista.findIndex(f => f.id === id), {
        protegida: true, marca: g.marca, largura: 1400,
        topo: f => `<span style="color:var(--gold2)">Foto ${numero(f.id)}</span>`,
        base: f => {
          const on = f.id in escolha;
          if (enviada) return on ? `<div class="cap">Escolhida${escolha[f.id] ? ` — “${esc(escolha[f.id])}”` : ''}</div>` : '';
          return `<button class="btn ${on ? 'btn-ouro' : 'btn-linha'}" data-lbesc>${ic('heart', on ? 'style="fill:currentColor"' : '')} ${on ? 'Escolhida' : 'Escolher esta foto'}</button>
            ${on ? `<textarea class="input" data-lbcom maxlength="500" rows="2" placeholder="Quer pedir algum ajuste? Escreva aqui (opcional)">${esc(escolha[f.id])}</textarea>` : ''}`;
        },
        ligar: (lb, f, redesenhar) => {
          const b = $('[data-lbesc]', lb); if (b) b.onclick = () => { alternar(f.id); redesenhar(); };
          const ta = $('[data-lbcom]', lb); if (ta) ta.oninput = () => { escolha[f.id] = ta.value; mudou(); };
        },
        aoFechar: () => pintarGrade(),
      });
    }
  });
  $('#grade').addEventListener('input', e => {
    const ta = e.target.closest('[data-txt]'); if (!ta) return;
    const id = ta.closest('.foto-sel').dataset.id;
    escolha[id] = ta.value; abertos.add(id); mudou();
    const b = ta.closest('.foto-sel').querySelector('[data-com]'); if (b) b.innerHTML = `${ic('msg')} ${ta.value ? 'Comentário' : 'Comentar'}`;
  });
  $('#grade').addEventListener('contextmenu', e => e.preventDefault());

  function revisar() {
    const ids = g.fotos.filter(f => f.id in escolha);
    const n = ids.length;
    let aviso = '';
    const conta = contaPedido(g, escolha, carrinho);
    const pagaOnline = conta.total > 0 && g.loja && g.loja.pagamentoOnline;
    if (g.limite && n > g.limite && !(g.loja && g.loja.valorExtra)) aviso = `<div class="aviso alerta">Você escolheu ${n} fotos e o pacote inclui ${g.limite}. As ${n - g.limite} fotos extras podem ter um valor adicional — a Tati combina isso com você.</div>`;
    else if (g.limite && n < g.limite) aviso = `<div class="aviso">Você ainda pode escolher mais ${g.limite - n} ${g.limite - n === 1 ? 'foto' : 'fotos'} do pacote.</div>`;
    const j = abrirJanela(`<h3>Confira sua <em class="ouro">escolha</em></h3>
      <p>${n} ${n === 1 ? 'foto escolhida' : 'fotos escolhidas'}. Depois de enviar, a escolha fica fechada.</p>${aviso}
      <div class="lista-esc">${ids.map(f => `<div class="it"><img src="${esc(foto(f.id, 200))}" alt=""><div><b>Foto ${numero(f.id)}</b><div>${escolha[f.id] ? '“' + esc(escolha[f.id]) + '”' : 'Sem comentário'}</div></div></div>`).join('')}</div>
      ${conta.total > 0 ? `<div class="pd-caixa"><div class="cap" style="margin-bottom:10px">Seu pedido</div>${linhasPedido(conta)}<div class="pd-total"><span>Total</span><b>${brl(conta.total)}</b></div>
        <div class="dica" style="margin:8px 0 0">${pagaOnline ? `Depois de enviar, você paga com segurança pelo Mercado Pago: ${textoParcelas(g.loja.parcelas)}.` : 'A Tati vai te enviar a forma de pagamento.'}</div></div>` : ''}
      ${loja ? `<button class="btn btn-ghost btn-sm" data-loja style="padding-left:0">${ic('plus')} ${carrinho.length ? 'Mudar produtos' : 'Ver produtos'}</button>` : ''}
      <div class="erro" id="errf"></div>
      <div class="janela-acoes"><button class="btn btn-linha" data-n>Voltar</button><button class="btn btn-ouro" data-s>${pagaOnline ? `Enviar e pagar ${brl(conta.total)}` : 'Enviar minha escolha'}</button></div>`, { largura: 560 });
    const bl = $('[data-loja]', j); if (bl) bl.onclick = () => { fecharJanela(j); abrirLoja(Object.assign(ctxLoja(), { aoContinuar: revisar })); };
    $('[data-n]', j).onclick = () => fecharJanela(j);
    $('[data-s]', j).onclick = async ev => {
      const btn = ev.currentTarget; btn.disabled = true; btn.textContent = 'Enviando…';
      try {
        const r = await api('finalizarEscolha', { slug: g.slug, pin: PIN, pessoa: p.id, fotos: escolha, carrinho });
        Object.assign(p, r.pessoa); enviada = true; store.del(chaveRasc);
        fecharJanela(j); filtro = 'escolhidas'; pintarBarras(); pintarGrade();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const o = p.pedido;
        if (o && o.status === 'aguardando' && o.link) {
          abrirJanela(`<div class="orn" style="margin-top:0">✦</div><h3 style="text-align:center">Escolha <em class="ouro">enviada</em></h3>
            <p style="text-align:center">A Tati recebeu suas ${n} fotos. Agora falta só o pagamento do pedido.</p>
            <div class="pd-caixa">${linhasPedido(o)}<div class="pd-total"><span>Total</span><b>${brl(o.aPagar)}</b></div></div>
            <a class="btn btn-ouro" style="width:100%;margin-top:6px" href="${esc(o.link)}">${ic('lock')} Pagar agora • ${textoParcelas(o.parcelas)}</a>
            <p class="dica" style="text-align:center;margin-top:12px">Você vai para o site seguro do Mercado Pago e volta para cá no final.</p>
            <div class="janela-acoes" style="justify-content:center"><button class="btn btn-ghost btn-sm" onclick="fecharJanela()">Pagar depois</button></div>`, { largura: 520 });
        } else {
          abrirJanela(`<div class="orn" style="margin-top:0">✦</div><h3 style="text-align:center">Escolha <em class="ouro">enviada</em></h3><p style="text-align:center">A Tati recebeu suas ${n} fotos${Object.values(escolha).some(Boolean) ? ' e seus comentários' : ''}${o && o.total ? ` e seu pedido de ${brl(o.total)}` : ''}. Agora é com ela!</p>${o && (o.status === 'sem_link' || o.status === 'erro_link') ? '<p class="dica" style="text-align:center">Ela vai te enviar a forma de pagamento.</p>' : ''}<div class="janela-acoes" style="justify-content:center"><button class="btn btn-ouro" onclick="fecharJanela()">Fechar</button></div>`);
        }
      } catch (e) { $('#errf', j).textContent = e.message; btn.disabled = false; btn.textContent = 'Enviar minha escolha'; }
    };
  }

  pintarBarras(); pintarGrade();
  if (enviada && p.pedido) voltaPagamento(g, p, () => pintarGrade());
}

/* ---------- fotos prontas: estilo revista ---------- */
function telaRevista() {
  const g = G;
  const audio = g.musica ? new Audio(musicaUrl(g.musica)) : null;
  if (audio) { audio.loop = true; audio.preload = 'none'; }
  const totalFotos = g.pastas.reduce((s, p) => s + p.fotos.length, 0);
  const capaId = g.capa || (g.pastas[0] && g.pastas[0].fotos[0] && g.pastas[0].fotos[0].id) || '';
  const partes = String(g.titulo).split(' & ');
  let atraso = 0;
  const letras = t => [...t].map(c => `<span class="l" style="transition-delay:${(atraso += 45)}ms">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
  const titulo = partes[1] ? `${letras(partes[0])}<em class="ouro">${letras('& ' + partes.slice(1).join(' & '))}</em>` : letras(g.titulo);

  const capitulos = g.pastas.map((p, k) => {
    const destaque = p.fotos[0];
    const faixa = p.fotos.length >= 8 ? p.fotos.slice(1, 6) : [];
    const resto = p.fotos.slice(1 + faixa.length);
    return `<section class="capitulo" id="cap-${k}" data-cap="${k}"><div class="wrap">
      <div class="cap-abre ${k % 2 ? 'inv' : ''}">
        <div class="cap-txt surge"><span class="cap">Capítulo ${doisDig(k + 1)}</span><h2>${esc(p.nome)}</h2><div class="linha"></div>
          ${p.frase ? `<p>${esc(p.frase)}</p>` : ''}<div class="qtd">${p.fotos.length} ${p.fotos.length === 1 ? 'fotografia' : 'fotografias'}</div>
          ${DEMO ? '' : `<a class="btn btn-linha btn-sm" style="margin-top:18px" href="${linkPasta(p.id)}" target="_blank" rel="noopener">${ic('down')} Baixar este capítulo</a>`}</div>
        <div class="revela" data-k="${k}" data-i="0"><img loading="lazy" src="${esc(foto(destaque.id, 1600))}" alt=""></div>
      </div>
      ${faixa.length ? `<div class="faixa">${faixa.map((f, j) => `<figure data-k="${k}" data-i="${j + 1}"><img loading="lazy" src="${esc(foto(f.id, 1000))}" alt=""><figcaption>${doisDig(j + 1)} — ${esc(p.nome)}</figcaption></figure>`).join('')}</div>` : ''}
      ${resto.length ? `<div class="cap-mais"><span class="cap">Todas as fotos</span></div>
        <div class="jg">${resto.map((f, j) => tile(f, `data-k="${k}" data-i="${1 + faixa.length + j}"`, 'surge')).join('')}</div>` : ''}
    </div></section>`;
  }).join('');

  window.scrollTo(0, 0);
  app.innerHTML = `${faixaDemo()}
    <section class="rv-hero">
      <div class="img"><img id="capa" src="${esc(foto(capaId, 2400))}" alt="" style="object-position:${posicao(g.capaPosicao)}"></div>
      <div class="topo"><div class="marca">${esc(CONFIG.ESTUDIO)}</div><span class="ed so-pc">${totalFotos} fotografias</span></div>
      <div class="texto">
        ${g.subtitulo ? `<span class="cap">${esc(g.subtitulo)}</span>` : ''}
        <h1 id="tit">${titulo}</h1>
        ${g.frase ? `<p class="frase" id="frase">${esc(g.frase)}</p>` : ''}
        <button class="btn btn-linha" id="ver">Ver as fotos ${ic('dn', 'style="width:16px;height:16px"')}</button>
      </div>
      <span class="rola">Role</span>
    </section>
    <nav class="rv-nav" id="nav"><div class="in">
      <div class="tit">${esc(g.titulo)}</div>
      <div class="indice" id="indice">${g.pastas.map((p, k) => `<a data-ir="${k}"><i>${doisDig(k + 1)}</i>${esc(p.nome)}</a>`).join('')}</div>
      <button class="btn btn-ouro btn-sm" id="baixar">${ic('cloud')}<span class="so-pc">Baixar fotos</span></button>
    </div></nav>
    ${capitulos || '<div class="wrap"><div class="vazio" style="margin:60px 0">As fotos ainda estão sendo preparadas.</div></div>'}
    <div class="fim surge"><div class="orn">✦</div><h3>Fim. <em class="ouro">Ou melhor: o começo.</em></h3><p>Com carinho, ${esc(CONFIG.ESTUDIO)}</p>
      <button class="btn btn-ouro" id="baixar2">${ic('cloud')} Guardar todas as fotos</button></div>
    <footer class="rodape"><div>${esc(CONFIG.ESTUDIO)}</div><div style="margin-top:10px"><a href="?painel">Área da fotógrafa</a></div></footer>
    ${audio ? `<button class="musica" id="som" aria-label="Música">${ic('music')}</button>` : ''}`;

  const capa = $('#capa');
  const mostrar = () => { capa.classList.add('in'); setTimeout(() => { $('#tit').classList.add('in'); const fr = $('#frase'); if (fr) fr.classList.add('in'); }, 300); };
  if (capa.complete) mostrar(); else { capa.onload = mostrar; capa.onerror = mostrar; }

  function tocar(ligar) {
    if (!audio) return;
    const b = $('#som');
    if (ligar) audio.play().then(() => { b.classList.add('on'); b.innerHTML = ic('music'); }).catch(() => {});
    else { audio.pause(); b.classList.remove('on'); b.innerHTML = ic('mute'); }
  }
  if (audio) $('#som').onclick = () => tocar(audio.paused);
  $('#ver').onclick = () => { const c = $('#cap-0'); (c || $('#nav')).scrollIntoView({ behavior: 'smooth' }); tocar(true); };
  $$('[data-ir]').forEach(a => a.onclick = () => { const c = $('#cap-' + a.dataset.ir); if (c) window.scrollTo({ top: c.offsetTop - 60, behavior: 'smooth' }); });
  $('#baixar').onclick = janelaDownload;
  $('#baixar2').onclick = janelaDownload;

  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.revela, .surge').forEach(el => io.observe(el));

  const heroImg = $('.rv-hero .img img');
  const secoes = $$('.capitulo');
  let agendado = false;
  window.onscroll = () => {
    if (agendado) return; agendado = true;
    requestAnimationFrame(() => {
      agendado = false;
      const y = window.scrollY;
      if (y < innerHeight * 1.2 && heroImg.classList.contains('in')) heroImg.style.transform = `translateY(${y * 0.28}px)`;
      let atual = -1;
      secoes.forEach((s, k) => { if (s.offsetTop - 140 <= y) atual = k; });
      $$('[data-ir]').forEach(a => a.classList.toggle('on', +a.dataset.ir === atual));
    });
  };

  app.addEventListener('click', e => {
    const alvo = e.target.closest('[data-k][data-i]'); if (!alvo) return;
    const p = g.pastas[+alvo.dataset.k];
    abrirVisualizador(p.fotos, +alvo.dataset.i, {
      largura: 2400,
      topo: () => `<span class="cap">${esc(p.nome)}</span>`,
      base: f => `<a class="btn btn-linha btn-sm" href="${esc(original(f.id))}" download="${esc(f.n || 'foto.jpg')}" target="_blank" rel="noopener">${ic('down')} Baixar em alta resolução</a>`,
    });
  });
}

function textoTransf(t) {
  if (t.estado === 'enviando') return `Enviando para ${esc(t.email)}… (${t.feitos} de ${t.total})`;
  return `As fotos foram enviadas para <b>${esc(t.email)}</b>.`;
}

function janelaDownload() {
  const g = G;
  const t = g.transferencia || { estado: 'nenhuma' };
  const pastas = g.pastas.map((p, k) => `<li><a href="${DEMO ? '#' : linkPasta(p.id)}" ${DEMO ? 'onclick="toast(\'No exemplo, os links do Drive ficam desativados\');return false"' : 'target="_blank" rel="noopener"'}>Capítulo ${doisDig(k + 1)} — ${esc(p.nome)}</a> <span class="muted">• ${p.fotos.length} fotos</span></li>`).join('');
  let corpo;
  if (t.estado === 'nenhuma') {
    corpo = `<p>As fotos vão direto para o seu Google Drive, nos <b>arquivos originais</b> — sem nenhuma perda de qualidade.</p>
      <label class="campo"><span>Seu e-mail do Google Drive</span>
        <input class="input" id="em" type="email" placeholder="seunome@gmail.com" value="${esc(g.emailDrive || '')}" ${g.emailDrive ? 'readonly' : ''}></label>
      ${g.emailDrive ? '<div class="dica" style="margin-top:-8px;margin-bottom:12px">Este é o e-mail que você combinou com a Tati.</div>' : ''}
      <div class="erro" id="er"></div>
      <div class="janela-acoes" style="justify-content:flex-start"><button class="btn btn-ouro" id="ir">${ic('cloud')} Enviar para o meu Drive</button></div>`;
  } else if (t.estado === 'enviando') {
    corpo = `<p id="tx">${textoTransf(t)}</p><div class="progresso"><i id="pg" style="width:${t.total ? Math.round(100 * t.feitos / t.total) : 0}%"></i></div>
      <div class="erro" id="er"></div><div class="janela-acoes" style="justify-content:flex-start"><button class="btn btn-ouro" id="ir">Continuar envio</button></div>`;
  } else corpo = blocoAceite(t);
  const j = abrirJanela(`<h3>Suas fotos em <em class="ouro">alta resolução</em></h3>${corpo}
    <div class="orn">✦</div>
    <p style="margin-bottom:6px"><b style="color:var(--ink)">Prefere baixar no computador?</b> Abra o capítulo e use “Fazer download” — o Google Drive entrega os arquivos originais.</p>
    <ul class="passos-lista" style="list-style:none;padding:0">${pastas}</ul>
    <div class="janela-acoes"><button class="btn btn-linha" data-x>Fechar</button></div>`, { largura: 560 });
  $('[data-x]', j).onclick = () => fecharJanela(j);
  const ir = $('#ir', j);
  if (ir) ir.onclick = async () => {
    const email = $('#em', j) ? $('#em', j).value.trim() : '';
    ir.disabled = true; $('#er', j).textContent = '';
    if ($('#em', j)) $('#em', j).closest('label').insertAdjacentHTML('afterend', `<p id="tx">Preparando…</p><div class="progresso"><i id="pg"></i></div>`);
    try {
      let r = await api('enviarParaDrive', { slug: g.slug, pin: PIN, email });
      while (r.transferencia.estado === 'enviando') {
        $('#tx', j).innerHTML = textoTransf(r.transferencia);
        $('#pg', j).style.width = Math.round(100 * r.transferencia.feitos / Math.max(1, r.transferencia.total)) + '%';
        r = await api('enviarParaDrive', { slug: g.slug, pin: PIN });
      }
      g.transferencia = r.transferencia;
      fecharJanela(j); janelaDownload();
    } catch (e) {
      $('#er', j).textContent = e.message; ir.disabled = false;
      if ($('#em', j)) { const tx = $('#tx', j); if (tx) tx.remove(); const pr = $('.progresso', j); if (pr) pr.remove(); }
    }
  };
}

function blocoAceite(t) {
  if (t.estado === 'aceita' || t.estado === 'liberada') {
    return `<div class="aviso ouro">${ic('check', 'style="vertical-align:-4px"')} Tudo certo! Suas fotos estão guardadas no Google Drive de <b>${esc(t.email)}</b>.</div>
      <p class="dica">Elas continuam aparecendo aqui sempre que você quiser rever.</p>`;
  }
  return `<div class="aviso ouro">${ic('check', 'style="vertical-align:-4px"')} ${textoTransf(t)}</div>
    <p style="margin-bottom:4px"><b style="color:var(--ink)">Falta só um passo:</b> aceitar as fotos no seu Drive.</p>
    <ol class="passos-lista">
      <li>Abra o Google Drive no computador (<a href="https://drive.google.com" target="_blank" rel="noopener">drive.google.com</a>).</li>
      <li>Na busca, digite <code class="k">pendingowner:me</code> e aperte Enter.</li>
      <li>Selecione tudo, clique em <b>Compartilhar</b> e depois em <b>Aceitar a propriedade</b>.</li>
    </ol>
    <p class="dica">Você também recebeu essas instruções por e-mail.</p>`;
}

/* ===================== painel da fotógrafa ===================== */
let SENHA = store.sget('tp_senha') || '';
let INFO = null, LISTA = [], FILTRO_ADM = 'todas';
const adm = (acao, dados = {}) => api(acao, Object.assign({ senha: SENHA }, dados));

function topoAdm() {
  return `${faixaDemo()}<div class="adm-topo"><div class="wrap">
    <a class="marca" href="?painel">${esc(CONFIG.ESTUDIO)}<small class="cap">Painel</small></a>
    <span class="espaco"></span>
    <button class="btn btn-ghost btn-sm" id="sair">${ic('sair')} Sair</button>
  </div></div>`;
}
function ligarTopo() { const s = $('#sair'); if (s) s.onclick = () => { store.sdel('tp_senha'); SENHA = ''; telaLogin(); }; }

async function abrirPainel() {
  document.title = 'Painel • ' + CONFIG.ESTUDIO;
  window.onscroll = null;
  if (!SENHA) return telaLogin();
  app.innerHTML = `<div class="loading"><div class="spin"></div>Entrando…</div>`;
  try {
    INFO = await adm('painelEntrar');
    const ed = new URLSearchParams(location.search).get('ed');
    if (ed) telaEditor(ed); else if (new URLSearchParams(location.search).has('catalogo')) telaCatalogo(); else telaLista();
  } catch (e) { store.sdel('tp_senha'); SENHA = ''; telaLogin(e.message); }
}

function telaLogin(erro = '') {
  app.innerHTML = `${faixaDemo()}<div class="portao"><div class="portao-card">
    <div class="marca">${esc(CONFIG.ESTUDIO)}<small>Painel da fotógrafa</small></div>
    <h1>Entrar no <em class="ouro">painel</em></h1>
    <form id="f">
      <input class="input" type="password" name="s" placeholder="Senha do painel" autocomplete="current-password" required autofocus>
      <button class="btn btn-ouro" style="width:100%;margin-top:12px">${ic('lock')} Entrar</button>
      <div class="erro">${esc(erro)}</div>
    </form>
    ${DEMO ? '<p class="dica">No modo demonstração, a senha é <b>demo</b>.</p>' : ''}
    <p style="margin-top:26px"><a class="muted" href="./" style="font-size:13px;text-decoration:none">Voltar ao site</a></p>
  </div></div>`;
  $('#f').onsubmit = e => { e.preventDefault(); SENHA = new FormData(e.target).get('s'); store.sset('tp_senha', SENHA); abrirPainel(); };
}

function estadoResumo(r) {
  if (!r.ativa) return ['', 'Desativada'];
  if (r.tipo === 'selecao') {
    if (!r.pessoas) return ['', `Aguardando cadastros • ${r.totalFotos} fotos`];
    if (r.finalizadas === r.pessoas) return ['ok', `${r.pessoas} ${r.pessoas === 1 ? 'pessoa enviou' : 'pessoas enviaram'} a escolha`];
    return ['ouro', `${r.pessoas} ${r.pessoas === 1 ? 'cadastro' : 'cadastros'} • ${r.finalizadas} ${r.finalizadas === 1 ? 'enviou' : 'enviaram'}`];
  }
  return ({
    nenhuma: ['', `Publicada • ${r.totalFotos} fotos`],
    enviando: ['ouro', 'Enviando ao Drive do cliente…'],
    aguardando_aceite: ['alerta', 'Aguardando o cliente aceitar no Drive'],
    aceita: ['ouro', 'Cliente aceitou • libere seu espaço'],
    liberada: ['ok', 'Fotos no Drive do cliente'],
  })[r.transferencia] || ['', ''];
}

function convite(g) {
  return g.tipo === 'selecao'
    ? `Oi, ${g.cliente}! Suas fotos já estão prontas para escolher 💛\n\n${g.link}\nSenha: ${g.pin}\n\nÉ só entrar, colocar seu nome e WhatsApp e tocar em "Escolher" nas favoritas. Cada pessoa da família pode fazer o seu cadastro e escolher as suas. Quando terminar, toque em "Enviar minha escolha".`
    : `Oi, ${g.cliente}! Suas fotos estão prontas 💛\n\n${g.link}\nSenha: ${g.pin}\n\nNo site você vê todas as fotos e pode guardar tudo no seu Google Drive em alta resolução.`;
}

async function telaLista() {
  window.onbeforeunload = null;
  history.replaceState(null, '', '?painel');
  app.innerHTML = `${topoAdm()}<main class="wrap adm"><div class="loading" style="min-height:30vh"><div class="spin"></div>Carregando galerias…</div></main>`;
  ligarTopo();
  try { LISTA = (await adm('painelListar')).galerias; }
  catch (e) { $('.adm').innerHTML = `<div class="vazio">${esc(e.message)}</div>`; return; }
  pintarLista();
}

function pintarLista() {
  const lista = LISTA.filter(r => FILTRO_ADM === 'todas' || r.tipo === FILTRO_ADM);
  $('.adm').innerHTML = `
    <div class="adm-cab"><h1>Galerias</h1><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-linha" id="cat">Produtos e pagamento</button><button class="btn btn-ouro" id="nova">${ic('plus')} Nova galeria</button></div></div>
    <div class="filtros" style="justify-content:flex-start;margin-top:0">
      ${[['todas', 'Todas'], ['selecao', 'Seleção'], ['entrega', 'Fotos prontas']].map(([k, t]) => `<button class="chip ${FILTRO_ADM === k ? 'on' : ''}" data-fa="${k}">${t}</button>`).join('')}
    </div>
    ${lista.length ? `<div class="cartoes">${lista.map(r => {
      const [cor, txt] = estadoResumo(r);
      return `<div class="cartao">
        <div class="cartao-img" data-ed="${esc(r.slug)}">${r.capa ? `<img loading="lazy" src="${esc(foto(r.capa, 600))}" alt="">` : ''}
          <span class="selo-tipo">${r.tipo === 'selecao' ? 'Seleção' : 'Fotos prontas'}</span></div>
        <div class="cartao-corpo"><h3>${esc(r.cliente)}</h3>
          <div class="estado"><span class="ponto ${cor}"></span>${esc(txt)}</div>
          <div class="dica" style="margin:2px 0 0">Senha ${esc(r.pin)}</div>
          <div class="cartao-acoes"><button class="btn btn-ouro btn-sm" data-ed="${esc(r.slug)}">Editar</button>
            <button class="btn btn-linha btn-sm" data-cv="${esc(r.slug)}">${ic('copy')} Convite</button></div>
        </div></div>`;
    }).join('')}</div>` : `<div class="vazio">Nenhuma galeria aqui ainda.</div>`}
    <div class="como-faz"><h4>Montagem automática pelo Drive</h4>
      <ol>
        <li>No seu Drive, abra a pasta <b>Tati Pretto • Galerias</b>.</li>
        <li>Para <b>seleção</b>: crie uma pasta com o nome do cliente dentro de <a href="${esc(INFO.pastaSelecao)}" target="_blank" rel="noopener">1 • Seleção</a> e coloque as fotos.</li>
        <li>Para <b>fotos prontas</b>: crie a pasta do cliente dentro de <a href="${esc(INFO.pastaEntrega)}" target="_blank" rel="noopener">2 • Entregas</a>. Cada subpasta (ex.: Cerimônia, Família, Detalhes) vira um capítulo no site.</li>
        <li>Em até 15 minutos o site do cliente fica pronto e você recebe o link e a senha no e-mail ${esc(INFO.email || '')}.</li>
      </ol>
    </div>`;
  $('#nova').onclick = () => janelaNova();
  $('#cat').onclick = () => telaCatalogo();
  $$('[data-fa]').forEach(b => b.onclick = () => { FILTRO_ADM = b.dataset.fa; pintarLista(); });
  $$('[data-ed]').forEach(b => b.onclick = () => telaEditor(b.dataset.ed));
  $$('[data-cv]').forEach(b => b.onclick = () => copiar(convite(LISTA.find(x => x.slug === b.dataset.cv))));
}

function janelaNova(base = {}) {
  let tipo = base.tipo || 'selecao';
  const j = abrirJanela(`<h3>Nova <em class="ouro">galeria</em></h3>
    <div class="seg">
      <label data-t="selecao"><input type="radio" name="t"><b>Seleção</b><span>Cada pessoa se cadastra e escolhe, com marca d'água</span></label>
      <label data-t="entrega"><input type="radio" name="t"><b>Fotos prontas</b><span>Site estilo revista e envio ao Drive</span></label>
    </div>
    <form id="fn" style="margin-top:18px">
      <label class="campo"><span>Nome do cliente</span><input class="input" name="cliente" value="${esc(base.cliente || '')}" placeholder="Ex.: Família Souza" required></label>
      <label class="campo"><span>Link da pasta no Google Drive (opcional)</span><input class="input" name="pasta" placeholder="https://drive.google.com/drive/folders/…">
        <div class="dica">Deixe em branco e eu crio a pasta para você colocar as fotos.</div></label>
      <div data-so="selecao" class="g2">
        <label class="campo"><span>Fotos no pacote (por pessoa)</span><input class="input" name="limite" type="number" min="0" placeholder="Ex.: 20 (0 = sem limite)"></label>
        <label class="campo"><span>Texto da marca d'água</span><input class="input" name="marca" value="${esc(CONFIG.ESTUDIO)}"></label>
      </div>
      <div data-so="entrega"><label class="campo"><span>E-mail do Google Drive do cliente (opcional)</span><input class="input" name="emailDrive" type="email" value="${esc(base.emailDrive || '')}" placeholder="cliente@gmail.com">
        <div class="dica">Se preencher, o cliente não precisa digitar.</div></label></div>
      <div class="erro" id="en"></div>
      <div class="janela-acoes"><button type="button" class="btn btn-linha" data-x>Cancelar</button><button class="btn btn-ouro" id="cr">Criar galeria</button></div>
    </form>`, { largura: 580 });
  function pintarTipo() {
    $$('[data-t]', j).forEach(l => l.classList.toggle('on', l.dataset.t === tipo));
    $$('[data-so]', j).forEach(d => d.classList.toggle('hidden', d.dataset.so !== tipo));
  }
  $$('[data-t]', j).forEach(l => l.onclick = () => { tipo = l.dataset.t; pintarTipo(); });
  pintarTipo();
  $('[data-x]', j).onclick = () => fecharJanela(j);
  $('#fn', j).onsubmit = async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    const b = $('#cr', j); b.disabled = true; b.textContent = 'Montando…';
    try {
      const r = await adm('painelCriar', Object.assign(fd, { tipo }));
      fecharJanela(j);
      telaEditor(r.galeria.slug, r.galeria, true);
    } catch (err) { $('#en', j).textContent = err.message; b.disabled = false; b.textContent = 'Criar galeria'; }
  };
}

async function telaEditor(slug, ja, nova = false) {
  history.replaceState(null, '', '?painel&ed=' + encodeURIComponent(slug));
  app.innerHTML = `${topoAdm()}<main class="wrap adm"><div class="loading" style="min-height:30vh"><div class="spin"></div>Abrindo…</div></main>`;
  ligarTopo();
  let g = ja;
  if (!g) {
    try { g = (await adm('painelAbrir', { slug })).galeria; }
    catch (e) { $('.adm').innerHTML = `<div class="vazio">${esc(e.message)}</div>`; return; }
  }
  pintarEditor(g, nova);
}

function pintarEditor(g, nova) {
  const ent = g.tipo === 'entrega';
  const fotos = []; g.pastas.forEach(p => p.fotos.forEach(f => fotos.push(f)));
  const nomeDe = {}; fotos.forEach(f => { nomeDe[f.id] = f.n; });
  const ed = { pastas: g.pastas.map(p => ({ id: p.id, nome: p.nome, frase: p.frase || '', oculta: !!p.oculta, n: p.fotos.length })), capa: g.capa, capaPosicao: g.capaPosicao || 'center' };
  const pessoas = Object.values(g.pessoas || {}).sort((a, b) => (b.finalizadaEm || 0) - (a.finalizadaEm || 0) || a.nome.localeCompare(b.nome));
  let sujo = false;
  const t = g.transferencia || { estado: 'nenhuma' };
  const semExt = n => String(n).replace(/\.[^.]+$/, '');

  $('.adm').innerHTML = `
    <button class="btn btn-ghost" id="volta" style="padding-left:0">${ic('back')} Galerias</button>
    <div class="adm-cab" style="margin-top:6px"><div>
        <span class="cap">${ent ? 'Fotos prontas' : 'Seleção'}</span>
        <h1 style="margin-top:8px">${esc(g.cliente)}</h1></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-linha btn-sm" id="ver">${ic('eye')} Ver como cliente</button>
        <a class="btn btn-linha btn-sm" href="https://wa.me/?text=${encodeURIComponent(convite(g))}" target="_blank" rel="noopener">${ic('wa')} WhatsApp</a>
        <button class="btn btn-ouro btn-sm" id="cv">${ic('copy')} Copiar convite</button>
      </div></div>
    ${nova ? `<div class="aviso ouro" style="margin-bottom:16px">Galeria montada com ${fotos.length} ${fotos.length === 1 ? 'foto' : 'fotos'}.${fotos.length ? '' : ' Coloque as fotos na pasta do Drive e clique em “Atualizar fotos do Drive”.'}</div>` : ''}

    ${ent ? '' : `<section class="sec"><h2>Quem escolheu</h2><p class="dica">Cada pessoa faz o próprio cadastro com nome e WhatsApp, e escolhe as suas fotos.</p>
      ${pessoas.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          <button class="btn btn-linha btn-sm" id="lrtodos">${ic('copy')} Copiar todas as escolhidas (Lightroom)</button>
          <button class="btn btn-ouro btn-sm" id="fe">Criar galeria de fotos prontas</button></div>
        <div class="pessoas">${pessoas.map(p => {
          const ids = fotos.filter(f => f.id in (p.fotos || {})).map(f => f.id);
          return `<div class="pessoa" data-p="${esc(p.id)}">
            <div class="pessoa-cab" data-abre>
              <div class="info"><b>${esc(p.nome)}</b><span>${esc(foneBR(p.whats))}${p.email ? ' • ' + esc(p.email) : ''}</span></div>
              <div class="estado"><span class="ponto ${p.finalizadaEm ? 'ok' : 'ouro'}"></span>${p.finalizadaEm ? `Enviou em ${dataCurta(p.finalizadaEm)}` : 'Escolhendo'} • ${ids.length} ${ids.length === 1 ? 'foto' : 'fotos'}</div>
              <a class="icon-btn" href="${linkWhats(p.whats)}" target="_blank" rel="noopener" title="Conversar no WhatsApp" data-nao>${ic('wa')}</a>
            </div>
            <div class="pessoa-corpo">
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${ids.length ? `<button class="btn btn-linha btn-sm" data-lr>${ic('copy')} Copiar nomes (Lightroom)</button>` : ''}
                ${p.finalizadaEm ? `<button class="btn btn-linha btn-sm" data-reabre>Reabrir escolha</button>` : ''}
                <button class="btn btn-perigo btn-sm" data-exclui>${ic('trash')} Excluir cadastro</button>
              </div>
              ${ids.length ? `<div class="esc-adm">${ids.map(id => `<figure><img loading="lazy" src="${esc(foto(id, 400))}" alt=""><figcaption><b>${esc(nomeDe[id])}</b>${p.fotos[id] ? `<i>“${esc(p.fotos[id])}”</i>` : ''}</figcaption></figure>`).join('')}</div>` : '<p class="dica">Ainda não escolheu nenhuma foto.</p>'}
            </div></div>`;
        }).join('')}</div>` : '<div class="vazio">Ninguém se cadastrou ainda. Envie o convite pelo WhatsApp.</div>'}
    </section>`}

    <section class="sec"><h2>Acesso</h2><p class="dica">O cliente entra pelo link e digita a senha.</p>
      <div class="g2">
        <label class="campo"><span>Link do cliente</span><div class="linha-link"><input class="input" value="${esc(g.link)}" readonly><button class="icon-btn" id="cl" title="Copiar link">${ic('copy')}</button></div></label>
        <label class="campo"><span>Senha (PIN)</span><input class="input" data-k="pin" value="${esc(g.pin)}" inputmode="numeric" maxlength="8"></label>
      </div>
      <label class="chave"><input type="checkbox" data-k="ativa" ${g.ativa !== false ? 'checked' : ''}> Galeria disponível para o cliente</label>
    </section>

    <section class="sec"><h2>Textos</h2><p class="dica">Aparecem na abertura do site do cliente. Use “&amp;” no título para o segundo nome ficar em dourado.</p>
      <div class="g2">
        <label class="campo"><span>Título</span><input class="input" data-k="titulo" value="${esc(g.titulo)}"></label>
        <label class="campo"><span>Linha de cima (data, local…)</span><input class="input" data-k="subtitulo" value="${esc(g.subtitulo)}" placeholder="Ex.: 14 de setembro de 2026 • Lajeado"></label>
      </div>
      <label class="campo"><span>Frase</span><textarea class="input" data-k="frase" rows="3">${esc(g.frase)}</textarea></label>
      <label class="campo" style="margin-bottom:0"><span>Nome do cliente (no painel e nos e-mails)</span><input class="input" data-k="cliente" value="${esc(g.cliente)}"></label>
    </section>

    ${ent ? `
    <section class="sec"><h2>Capa</h2><p class="dica">Toque numa foto para usar como fundo da abertura.</p>
      <div class="capa-prev"><img id="cp" src="${esc(foto(ed.capa, 1400))}" alt="" style="object-position:${posicao(ed.capaPosicao)}"><div class="t">${esc(g.titulo)}</div></div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap"><span class="dica" style="margin:0">Enquadramento:</span>
        ${[['top', 'Mais para cima'], ['center', 'Centro'], ['bottom', 'Mais para baixo']].map(([k, tx]) => `<button class="chip ${ed.capaPosicao === k ? 'on' : ''}" data-pos="${k}">${tx}</button>`).join('')}</div>
      <div class="mini-grade">${fotos.map(f => `<button class="mini ${f.id === ed.capa ? 'on' : ''}" data-capa="${esc(f.id)}"><img loading="lazy" src="${esc(foto(f.id, 240))}" alt=""></button>`).join('')}</div>
    </section>

    <section class="sec"><h2>Música</h2><p class="dica">Toca quando o cliente clica em “Ver as fotos”. Cole o link de um arquivo MP3 — pode ser do seu Drive, compartilhado como “qualquer pessoa com o link”.</p>
      <div class="linha-link"><input class="input" data-k="musica" value="${esc(g.musica)}" placeholder="https://drive.google.com/file/d/…"><button class="icon-btn" id="tm" title="Ouvir">${ic('music')}</button></div>
      <div class="dica">Deixe em branco para o site ficar sem música.</div>
    </section>

    <section class="sec"><h2>Capítulos</h2><p class="dica">Cada pasta do Drive vira um capítulo. Mude o nome, escreva uma frase, troque a ordem ou esconda um capítulo.</p>
      <div class="pastas" id="pl"></div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button class="btn btn-linha btn-sm" id="np" ${g.congelada ? 'disabled' : ''}>${ic('plus')} Novo capítulo</button>
        ${DEMO ? '' : `<a class="btn btn-ghost btn-sm" href="${esc(g.pastaUrl)}" target="_blank" rel="noopener">${ic('folder')} Abrir no Drive</a>`}
      </div>
    </section>

    <section class="sec"><h2>Drive do cliente</h2><p class="dica">Quando o cliente clicar em “Enviar para o meu Drive”, os arquivos originais passam para a conta dele. Depois que ele aceitar, você remove do seu Drive e o site continua funcionando.</p>
      <label class="campo"><span>E-mail do Google Drive do cliente</span><input class="input" type="email" data-k="emailDrive" value="${esc(g.emailDrive)}" placeholder="Opcional — se ficar em branco, o cliente digita" ${t.estado !== 'nenhuma' ? 'readonly' : ''}></label>
      <div id="tr"></div>
    </section>` : `
    <section class="sec"><h2>Seleção</h2><p class="dica">A marca d'água aparece sobre todas as fotos. Nesta galeria não há download.</p>
      <div class="g2">
        <label class="campo"><span>Fotos no pacote (por pessoa)</span><input class="input" type="number" min="0" data-k="limite" value="${esc(g.limite || 0)}"><div class="dica">0 = sem limite. A pessoa pode passar do limite; você combina o valor das extras.</div></label>
        <label class="campo"><span>Texto da marca d'água</span><input class="input" data-k="marca" value="${esc(g.marca)}"></label>
      </div>
    </section>`}

    <section class="sec" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-linha btn-sm" id="at" ${g.congelada ? 'disabled' : ''}>${ic('refresh')} Atualizar fotos do Drive</button>
      <span class="dica" style="margin:0;flex:1;min-width:200px">${g.congelada ? 'As fotos já estão no Drive do cliente; os capítulos não mudam mais.' : 'Use depois de colocar ou tirar fotos da pasta no Drive. Também atualiza sozinho a cada hora.'}</span>
      <button class="btn btn-perigo btn-sm" id="ex">${ic('trash')} Excluir galeria</button>
    </section>`;

  const barra = document.createElement('div');
  barra.className = 'barra-salvar';
  barra.innerHTML = `<div class="wrap"><span class="dica" style="margin:0" id="st">Nenhuma alteração</span><span class="espaco"></span><button class="btn btn-ouro" id="sv" disabled>Salvar alterações</button></div>`;
  $('.adm').appendChild(barra);

  const marcar = () => { sujo = true; $('#sv').disabled = false; $('#st').textContent = 'Alterações não salvas'; };
  $$('[data-k]').forEach(el => { el.oninput = marcar; el.onchange = marcar; });
  $('#volta').onclick = async () => { if (sujo && !(await confirmar('Sair sem salvar?', 'As alterações desta galeria ainda não foram salvas.', 'Sair sem salvar', true))) return; telaLista(); };
  $('#cv').onclick = () => copiar(convite(g));
  $('#cl').onclick = () => copiar(g.link);
  $('#ver').onclick = () => { store.set('tp_pin_' + g.slug, g.pin); window.open('?g=' + encodeURIComponent(g.slug), '_blank'); };
  const antesDeRecarregar = async () => !sujo || await confirmar('Salvar antes?', 'Isso recarrega a galeria. Salve suas alterações primeiro para não perder.', 'Continuar sem salvar', true);

  if (!ent && pessoas.length) {
    $('#lrtodos').onclick = () => {
      const todasIds = new Set(); pessoas.forEach(p => Object.keys(p.fotos || {}).forEach(id => todasIds.add(id)));
      copiar(fotos.filter(f => todasIds.has(f.id)).map(f => semExt(f.n)).join(', '));
    };
    $('#fe').onclick = () => janelaNova({ tipo: 'entrega', cliente: g.cliente });
    $$('.pessoa').forEach(el => {
      const p = g.pessoas[el.dataset.p];
      $('[data-abre]', el).onclick = e => { if (!e.target.closest('[data-nao]')) el.classList.toggle('aberta'); };
      const lr = $('[data-lr]', el); if (lr) lr.onclick = () => copiar(fotos.filter(f => f.id in p.fotos).map(f => semExt(f.n)).join(', '));
      const ra = $('[data-reabre]', el); if (ra) ra.onclick = async () => {
        if (!(await confirmar('Reabrir a escolha?', `${esc(p.nome)} vai poder mudar as fotos e enviar de novo.`, 'Reabrir'))) return;
        if (!(await antesDeRecarregar())) return;
        try { pintarEditor((await adm('painelReabrirEscolha', { slug: g.slug, pessoa: p.id })).galeria); toast('Escolha reaberta'); } catch (e) { toast(e.message); }
      };
      $('[data-exclui]', el).onclick = async () => {
        if (!(await confirmar('Excluir este cadastro?', `As escolhas de ${esc(p.nome)} serão apagadas.`, 'Excluir cadastro', true))) return;
        if (!(await antesDeRecarregar())) return;
        try { pintarEditor((await adm('painelExcluirPessoa', { slug: g.slug, pessoa: p.id })).galeria); toast('Cadastro excluído'); } catch (e) { toast(e.message); }
      };
    });
  }

  if (ent) {
    function pintarPastas() {
      $('#pl').innerHTML = ed.pastas.map((p, k) => `<div class="pasta ${p.oculta ? 'off' : ''}">
        <div class="l1"><span class="cap" style="min-width:26px">${doisDig(k + 1)}</span>
          <input class="input" data-pn="${k}" value="${esc(p.nome)}" aria-label="Nome do capítulo">
          <span class="qtd">${p.n} ${p.n === 1 ? 'foto' : 'fotos'}</span>
          <button class="icon-btn" data-pu="${k}" title="Subir" ${k === 0 ? 'disabled' : ''}>${ic('up')}</button>
          <button class="icon-btn" data-pd="${k}" title="Descer" ${k === ed.pastas.length - 1 ? 'disabled' : ''}>${ic('dn')}</button>
          <button class="icon-btn" data-po="${k}" title="${p.oculta ? 'Mostrar no site' : 'Esconder do site'}">${ic(p.oculta ? 'eyeoff' : 'eye')}</button>
          ${DEMO ? '' : `<a class="icon-btn" href="${linkPasta(p.id)}" target="_blank" rel="noopener" title="Abrir no Drive">${ic('folder')}</a>`}
        </div>
        <input class="input frase" data-pf="${k}" value="${esc(p.frase)}" placeholder="Frase do capítulo (opcional) — ex.: Os pequenos gestos que ninguém viu…">
      </div>`).join('') || '<div class="vazio">Nenhum capítulo com fotos ainda.</div>';
      $$('[data-pn]').forEach(i => i.oninput = () => { ed.pastas[+i.dataset.pn].nome = i.value; marcar(); });
      $$('[data-pf]').forEach(i => i.oninput = () => { ed.pastas[+i.dataset.pf].frase = i.value; marcar(); });
      $$('[data-pu]').forEach(b => b.onclick = () => { const k = +b.dataset.pu; [ed.pastas[k - 1], ed.pastas[k]] = [ed.pastas[k], ed.pastas[k - 1]]; marcar(); pintarPastas(); });
      $$('[data-pd]').forEach(b => b.onclick = () => { const k = +b.dataset.pd; [ed.pastas[k + 1], ed.pastas[k]] = [ed.pastas[k], ed.pastas[k + 1]]; marcar(); pintarPastas(); });
      $$('[data-po]').forEach(b => b.onclick = () => { const p = ed.pastas[+b.dataset.po]; p.oculta = !p.oculta; marcar(); pintarPastas(); });
    }
    pintarPastas();
    $$('[data-capa]').forEach(b => b.onclick = () => {
      ed.capa = b.dataset.capa; $$('.mini').forEach(m => m.classList.toggle('on', m === b));
      $('#cp').src = foto(ed.capa, 1400); marcar();
    });
    $$('[data-pos]').forEach(b => b.onclick = () => {
      ed.capaPosicao = b.dataset.pos; $$('[data-pos]').forEach(x => x.classList.toggle('on', x === b));
      $('#cp').style.objectPosition = posicao(ed.capaPosicao); marcar();
    });
    let ouvindo = null;
    $('#tm').onclick = () => {
      const u = $('[data-k="musica"]').value.trim();
      if (ouvindo) { ouvindo.pause(); ouvindo = null; $('#tm').innerHTML = ic('music'); return; }
      if (!u) return toast('Cole o link da música primeiro');
      ouvindo = new Audio(musicaUrl(u));
      ouvindo.play().then(() => { $('#tm').innerHTML = ic('mute'); }).catch(() => { toast('Não consegui tocar esse link. Confira se é um MP3 compartilhado.'); ouvindo = null; });
    };
    $('#np').onclick = () => {
      const j = abrirJanela(`<h3>Novo <em class="ouro">capítulo</em></h3><p>Eu crio a pasta no seu Drive, dentro da pasta deste cliente. Depois é só colocar as fotos nela.</p>
        <form id="fp"><input class="input" name="nome" placeholder="Ex.: Família, Making of, Detalhes" required autofocus>
        <div class="erro" id="ep"></div><div class="janela-acoes"><button type="button" class="btn btn-linha" data-x>Cancelar</button><button class="btn btn-ouro">Criar capítulo</button></div></form>`);
      $('[data-x]', j).onclick = () => fecharJanela(j);
      $('#fp', j).onsubmit = async e => {
        e.preventDefault();
        if (!(await antesDeRecarregar())) return;
        try { const r = await adm('painelNovaPasta', { slug: g.slug, nome: new FormData(e.target).get('nome') }); fecharJanela(j); toast('Capítulo criado'); pintarEditor(r.galeria); }
        catch (err) { $('#ep', j).textContent = err.message; }
      };
    };
    pintarTransf();
  }

  function pintarTransf() {
    const est = {
      nenhuma: 'O cliente ainda não pediu as fotos no Drive.',
      enviando: `Enviando para ${esc(t.email)}… (${t.feitos} de ${t.total})`,
      aguardando_aceite: `Enviado para <b>${esc(t.email)}</b>. Aguardando o cliente aceitar no Drive dele.`,
      aceita: `<b>${esc(t.email)}</b> aceitou ${t.aceitos || t.total} arquivos. O espaço já não conta mais no seu Drive.`,
      liberada: `Concluído: as fotos estão no Drive de <b>${esc(t.email)}</b> e saíram do seu. O site continua funcionando.`,
    }[t.estado] || '';
    const gb = t.bytesAceitos ? ` (${(t.bytesAceitos / 1073741824).toFixed(2).replace('.', ',')} GB)` : '';
    $('#tr').innerHTML = `<div class="aviso ${t.estado === 'aguardando_aceite' ? 'alerta' : t.estado === 'nenhuma' ? '' : 'ouro'}">${est}${t.estado === 'aceita' ? gb : ''}</div>
      ${['aguardando_aceite', 'aceita'].includes(t.estado) ? `<div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-linha btn-sm" id="va">${ic('refresh')} Verificar aceite</button>
        <button class="btn btn-ouro btn-sm" id="lb" ${t.estado === 'aceita' ? '' : 'disabled'}>Remover do meu Drive</button></div>` : ''}`;
    const va = $('#va');
    if (va) va.onclick = async () => {
      va.disabled = true; va.textContent = 'Verificando…';
      try { const r = await adm('painelVerificarTransferencia', { slug: g.slug }); pintarEditor(r.galeria); toast(r.galeria.transferencia.estado === 'aceita' ? 'O cliente aceitou!' : 'Ainda falta o cliente aceitar'); }
      catch (e) { toast(e.message); va.disabled = false; }
    };
    const lb = $('#lb');
    if (lb) lb.onclick = async () => {
      if (!(await confirmar('Remover do seu Drive?', 'As fotos que o cliente já aceitou saem do seu Drive. Elas continuam no Drive do cliente e o site continua mostrando tudo. Depois disso, os capítulos desta galeria não podem mais ser atualizados.', 'Remover do meu Drive', true))) return;
      lb.disabled = true; lb.textContent = 'Removendo…';
      try {
        const r = await adm('painelLiberarEspaco', { slug: g.slug });
        pintarEditor(r.galeria);
        toast(r.aindaSeus ? `${r.removidos} removidos • ${r.aindaSeus} ainda não aceitos` : 'Pronto! Espaço liberado');
      } catch (e) { toast(e.message); lb.disabled = false; }
    };
  }

  $('#at').onclick = async () => {
    if (!(await antesDeRecarregar())) return;
    const b = $('#at'); b.disabled = true; b.innerHTML = `${ic('refresh')} Atualizando…`;
    try { const r = await adm('painelAtualizarFotos', { slug: g.slug }); pintarEditor(r.galeria); toast('Fotos atualizadas'); }
    catch (e) { toast(e.message); b.disabled = false; }
  };
  $('#ex').onclick = async () => {
    if (!(await confirmar('Excluir esta galeria?', 'O link deixa de funcionar para o cliente. As fotos <b>não</b> são apagadas do Drive.', 'Excluir galeria', true))) return;
    try { await adm('painelExcluir', { slug: g.slug }); toast('Galeria excluída'); telaLista(); } catch (e) { toast(e.message); }
  };
  $('#sv').onclick = async () => {
    const dados = {};
    $$('[data-k]').forEach(el => { dados[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; });
    if (ent) Object.assign(dados, { capa: ed.capa, capaPosicao: ed.capaPosicao, pastas: ed.pastas.map(p => ({ id: p.id, nome: p.nome, frase: p.frase, oculta: p.oculta })) });
    const b = $('#sv'); b.disabled = true; b.textContent = 'Salvando…';
    try { const r = await adm('painelSalvar', { slug: g.slug, dados }); sujo = false; toast('Alterações salvas'); pintarEditor(r.galeria); }
    catch (e) { toast(e.message); b.disabled = false; b.textContent = 'Salvar alterações'; }
  };
  window.onbeforeunload = () => sujo ? true : undefined;
}

/* ===================== rotas ===================== */
(async () => {
  if (DEMO) await carregarFotosDemo();
  if (params.has('painel')) abrirPainel();
  else if (params.get('g')) abrirGaleria(params.get('g'));
  else telaInicio();
})();
