/* Tati Pretto Fotografia — painel: seleção com originais em alta.
   Este arquivo é carregado depois do app.js e substitui a tela de edição da galeria. */

document.head.insertAdjacentHTML('beforeend', `<style>
.esc-adm figure{cursor:zoom-in}
.esc-adm figure:hover img{outline:1px solid var(--gold)}
.quem-lista{width:100%;max-width:640px;display:grid;gap:6px;text-align:center}
.quem-lista div{font-size:14.5px;color:var(--soft)}
.quem-lista b{color:var(--gold2);font-weight:400}
.quem-lista i{font-family:var(--serif);font-size:18px;color:var(--ink)}
.lb-base .linha-botoes{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
</style>`);

/* ---------- modo demonstração: novas ações ---------- */
const DEMO_API_BASE = demoApi;
demoApi = async function (acao, d) {
  const idPasta = v => {
    const s = String(v || '').trim(); if (!s) return '';
    const m = s.match(/folders\/([\w-]{10,})/) || s.match(/[?&]id=([\w-]{10,})/) || s.match(/^([\w-]{10,})$/);
    if (!m) throw new Error('Não reconheci o link da pasta do Drive.');
    return m[1];
  };
  if (acao === 'painelSalvar' && d.dados && 'pastaOriginais' in d.dados) {
    if (d.senha !== 'demo') throw new Error('Senha incorreta. No modo demonstração a senha é: demo');
    const db = demoDb(); const g = db.galerias[d.slug];
    if (g) { g.pastaOriginais = idPasta(d.dados.pastaOriginais); demoSave(db); }
    delete d.dados.pastaOriginais;
  }
  if (acao === 'painelArquivosEscolhidos' || acao === 'painelPastaEscolhidas') {
    await espera(300);
    if (d.senha !== 'demo') throw new Error('Senha incorreta. No modo demonstração a senha é: demo');
    const g = demoDb().galerias[d.slug]; if (!g) throw new Error('Galeria não encontrada.');
    const pessoas = d.pessoa ? [g.pessoas[d.pessoa]].filter(Boolean) : Object.values(g.pessoas || {});
    const quem = {};
    pessoas.forEach(p => Object.keys(p.fotos || {}).forEach(id => (quem[id] = quem[id] || []).push({ nome: p.nome, comentario: p.fotos[id] || '' })));
    const arquivos = todas(g).filter(f => quem[f.id]).map(f => ({ id: f.id, n: f.n, quem: quem[f.id], originais: [{ id: f.id, n: f.n, t: f.t || 4800000 }] }));
    if (acao === 'painelArquivosEscolhidos') return { ok: true, arquivos, temPastaOriginais: !!g.pastaOriginais };
    if (!arquivos.length) throw new Error('Ainda não há fotos escolhidas.');
    return { ok: true, url: '#', copiados: arquivos.length, faltando: 0, demo: true };
  }
  return DEMO_API_BASE(acao, d);
};

const mmss = n => { n = Math.max(0, Math.floor(Number(n) || 0)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); };
const segundos = v => { const s = String(v || '').trim(); const m = s.match(/^(\d+):(\d{1,2})$/); return m ? (+m[1]) * 60 + (+m[2]) : Math.max(0, Math.floor(Number(s.replace(',', '.')) || 0)); };
document.head.insertAdjacentHTML('beforeend', `<style>
.carta-prev{margin-top:6px;border:1px solid var(--line);border-radius:4px;padding:6px 0 0}
.carta-prev:empty{display:none}
.carta-prev .cap{display:block;text-align:center;margin-top:10px}
.carta-prev .carta{padding:14px 16px 24px}
select.input{appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--gold) 50%),linear-gradient(135deg,var(--gold) 50%,transparent 50%);background-position:calc(100% - 18px) 50%,calc(100% - 13px) 50%;background-size:5px 5px;background-repeat:no-repeat;padding-right:36px}
select.input option{background:#1a1714;color:var(--ink)}
</style>`);

/* ---------- originais das fotos escolhidas ---------- */
const CACHE_ARQ = {};
async function arquivosDe(g, pid) {
  const k = g.slug + '|' + (pid || '*');
  if (!CACHE_ARQ[k]) CACHE_ARQ[k] = (await adm('painelArquivosEscolhidos', { slug: g.slug, pessoa: pid || '' })).arquivos;
  return CACHE_ARQ[k];
}
const mb = b => (b / 1048576).toFixed(b > 1048576 * 100 ? 0 : 1).replace('.', ',') + ' MB';

async function baixarOriginais(g, pid, soIds) {
  let arq;
  toast('Procurando os originais…');
  try { arq = await arquivosDe(g, pid); } catch (e) { return toast(e.message); }
  if (soIds) arq = arq.filter(a => soIds.includes(a.id));
  const lista = [], faltam = [];
  arq.forEach(a => a.originais.length ? a.originais.forEach(o => lista.push(o)) : faltam.push(a.n));
  if (!lista.length) return toast(faltam.length ? 'Não encontrei os originais na pasta indicada' : 'Nenhuma foto escolhida ainda');
  const total = lista.reduce((s, o) => s + (o.t || 0), 0);
  if (lista.length > 1 || faltam.length) {
    const ok = await confirmar(`Baixar ${lista.length} ${lista.length === 1 ? 'arquivo' : 'arquivos'}?`,
      `São os arquivos originais${total ? ` (${mb(total)} no total)` : ''}, prontos para abrir no Photoshop.<br><br>
      • O navegador pode perguntar se permite <b>vários downloads</b> — clique em <b>Permitir</b>.<br>
      • Fique logada na sua conta Google neste navegador.<br>
      • Para muitas fotos, a opção <b>Pasta no Drive</b> costuma ser mais prática.
      ${faltam.length ? `<br><br><span style="color:var(--warn)">Não encontrei na pasta dos originais: ${faltam.map(esc).join(', ')}</span>` : ''}`, 'Baixar agora');
    if (!ok) return;
  }
  for (let k = 0; k < lista.length; k++) {
    const o = lista[k];
    if (lista.length > 1) toast(`Baixando ${k + 1} de ${lista.length}…`);
    if (!DEMO && o.t > 95 * 1048576) { window.open(original(o.id), '_blank'); }
    else {
      const a = document.createElement('a');
      a.href = original(o.id); a.download = o.n || 'foto.jpg'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
    }
    await espera(1300);
  }
  if (lista.length > 1) toast('Downloads enviados para o navegador');
}

async function pastaNoDrive(g, pid) {
  const nome = pid ? g.pessoas[pid].nome : 'todas as pessoas';
  const ok = await confirmar('Montar uma pasta no Drive?',
    `Copio os originais escolhidos por <b>${esc(nome)}</b> para uma pasta nova dentro de <b>Tati Pretto • Galerias › 3 • Escolhidas para editar</b>.<br><br>
    Depois é só baixar a pasta inteira (o Drive entrega um .zip) ou abrir direto no computador pelo Google Drive para computador. As cópias ocupam espaço até você apagá-las.`, 'Montar pasta');
  if (!ok) return;
  toast('Copiando os originais… pode levar alguns minutos');
  try {
    const r = await adm('painelPastaEscolhidas', { slug: g.slug, pessoa: pid || '' });
    const j = abrirJanela(`<h3>Pasta <em class="ouro">pronta</em></h3>
      <p>${r.copiados} ${r.copiados === 1 ? 'arquivo copiado' : 'arquivos copiados'}${r.faltando ? `, ${r.faltando} não ${r.faltando === 1 ? 'encontrado' : 'encontrados'} na pasta dos originais` : ''}.${r.incompleto ? ' Eram muitos arquivos: clique de novo para copiar o restante.' : ''}</p>
      ${r.demo ? '<div class="aviso">No modo demonstração a pasta não é criada de verdade.</div>' : ''}
      <ol class="passos-lista"><li>Abra a pasta no Drive.</li><li>Clique com o botão direito nela → <b>Fazer download</b>.</li><li>Descompacte o .zip e abra as fotos no Photoshop.</li></ol>
      <div class="janela-acoes"><button class="btn btn-linha" data-x>Fechar</button>${r.demo ? '' : `<a class="btn btn-ouro" href="${esc(r.url)}" target="_blank" rel="noopener">${ic('folder')} Abrir a pasta no Drive</a>`}</div>`);
    $('[data-x]', j).onclick = () => fecharJanela(j);
  } catch (e) { toast(e.message); }
}

/* ---------- ver a seleção em tela cheia, com comentários ---------- */
function verSelecao(g, pid, comecarEm) {
  const fotos = []; g.pastas.forEach(p => p.fotos.forEach(f => fotos.push(f)));
  const pessoas = pid ? [g.pessoas[pid]] : Object.values(g.pessoas || {});
  const quem = {};
  pessoas.forEach(p => Object.keys(p.fotos || {}).forEach(id => (quem[id] = quem[id] || []).push({ nome: p.nome, comentario: p.fotos[id] || '' })));
  const lista = fotos.filter(f => quem[f.id]);
  if (!lista.length) return toast('Nenhuma foto escolhida ainda');
  const numero = id => fotos.findIndex(f => f.id === id) + 1;
  abrirVisualizador(lista, Math.max(0, lista.findIndex(f => f.id === comecarEm)), {
    largura: 2000,
    topo: f => `<span style="color:var(--gold2)">Foto ${numero(f.id)} • ${esc(f.n)}</span>`,
    base: f => `<div class="quem-lista">${quem[f.id].map(q => `<div><b>${esc(q.nome)}</b>${q.comentario ? ` — <i>“${esc(q.comentario)}”</i>` : ' — sem comentário'}</div>`).join('')}</div>
      <div class="linha-botoes"><button class="btn btn-ouro btn-sm" data-orig>${ic('down')} Baixar original</button></div>`,
    ligar: (lb, f) => { $('[data-orig]', lb).onclick = () => baixarOriginais(g, pid, [f.id]); },
  });
}

/* ---------- tela de edição da galeria (substitui a do app.js) ---------- */
function pintarEditor(g, nova) {
  const ent = g.tipo === 'entrega';
  const fotos = []; g.pastas.forEach(p => p.fotos.forEach(f => fotos.push(f)));
  const nomeDe = {}; fotos.forEach(f => { nomeDe[f.id] = f.n; });
  const ed = { pastas: g.pastas.map(p => ({ id: p.id, nome: p.nome, frase: p.frase || '', oculta: !!p.oculta, n: p.fotos.length })), capa: g.capa, capaPosicao: g.capaPosicao || 'center' };
  const pessoas = Object.values(g.pessoas || {}).sort((a, b) => (b.finalizadaEm || 0) - (a.finalizadaEm || 0) || a.nome.localeCompare(b.nome));
  let sujo = false;
  const t = g.transferencia || { estado: 'nenhuma' };
  const semExt = n => String(n).replace(/\.[^.]+$/, '');
  Object.keys(CACHE_ARQ).forEach(k => delete CACHE_ARQ[k]);

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
          <button class="btn btn-ouro btn-sm" id="vertodos">${ic('eye')} Ver todas as escolhidas</button>
          <button class="btn btn-linha btn-sm" id="baixartodos">${ic('down')} Baixar originais de todos</button>
          <button class="btn btn-linha btn-sm" id="pastatodos">${ic('folder')} Pasta no Drive (todos)</button>
          <button class="btn btn-linha btn-sm" id="lrtodos">${ic('copy')} Copiar nomes (Lightroom)</button>
          <button class="btn btn-linha btn-sm" id="fe">Criar galeria de fotos prontas</button></div>
        <div class="pessoas">${pessoas.map(p => {
          const ids = fotos.filter(f => f.id in (p.fotos || {})).map(f => f.id);
          return `<div class="pessoa" data-p="${esc(p.id)}">
            <div class="pessoa-cab" data-abre>
              <div class="info"><b>${esc(p.nome)}</b><span>${esc(foneBR(p.whats))}${p.email ? ' • ' + esc(p.email) : ''}</span></div>
              <div class="estado"><span class="ponto ${p.finalizadaEm ? 'ok' : 'ouro'}"></span>${p.finalizadaEm ? `Enviou em ${dataCurta(p.finalizadaEm)}` : 'Escolhendo'} • ${ids.length} ${ids.length === 1 ? 'foto' : 'fotos'}${p.pedido && p.pedido.total ? ` • ${p.pedido.status === 'pago' ? 'pago' : 'pedido'} ${brl(p.pedido.total)}` : ''}</div>
              <a class="icon-btn" href="${linkWhats(p.whats)}" target="_blank" rel="noopener" title="Conversar no WhatsApp" data-nao>${ic('wa')}</a>
            </div>
            <div class="pessoa-corpo">
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${ids.length ? `<button class="btn btn-ouro btn-sm" data-versel>${ic('eye')} Ver seleção</button>
                <button class="btn btn-linha btn-sm" data-baixar>${ic('down')} Baixar originais</button>
                <button class="btn btn-linha btn-sm" data-pasta>${ic('folder')} Pasta no Drive</button>
                <button class="btn btn-linha btn-sm" data-lr>${ic('copy')} Copiar nomes (Lightroom)</button>` : ''}
                ${p.finalizadaEm ? `<button class="btn btn-linha btn-sm" data-reabre>Reabrir escolha</button>` : ''}
                <button class="btn btn-perigo btn-sm" data-exclui>${ic('trash')} Excluir cadastro</button>
              </div>
              ${p.finalizadaEm ? blocoPedidoAdm(p) : ''}
              ${ids.length ? `<div class="esc-adm">${ids.map(id => `<figure data-vf="${esc(id)}"><img loading="lazy" src="${esc(foto(id, 400))}" alt=""><figcaption><b>${esc(nomeDe[id])}</b>${p.fotos[id] ? `<i>“${esc(p.fotos[id])}”</i>` : ''}</figcaption></figure>`).join('')}</div>` : '<p class="dica">Ainda não escolheu nenhuma foto.</p>'}
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

    <section class="sec"><h2>Música</h2><p class="dica">Toca quando o cliente clica em “Ver as fotos”. Envie um MP3 do seu computador ou cole um link (pode ser do seu Drive, compartilhado como “qualquer pessoa com o link”).</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <button class="btn btn-ouro btn-sm" id="upm">${ic('music')} Enviar música do computador</button>
        <input type="file" id="arqm" accept="audio/*,.mp3,.m4a" hidden>
        <span class="dica" id="nomem" style="margin:0;align-self:center">${g.musicaNome ? 'Música atual: ' + esc(g.musicaNome) : ''}</span>
      </div>
      <input type="hidden" data-k="musicaNome" value="${esc(g.musicaNome || '')}">
      <div class="linha-link"><input class="input" data-k="musica" value="${esc(g.musica)}" placeholder="…ou cole o link: https://drive.google.com/file/d/…"><button class="icon-btn" id="tm" title="Ouvir">${ic('music')}</button></div>
      <div class="g2" style="margin-top:12px">
        <label class="campo" style="margin-bottom:0"><span>Começar a música em</span><input class="input" data-k="musicaInicio" value="${esc(mmss(g.musicaInicio || 0))}" placeholder="0:00" inputmode="numeric"><div class="dica">Ex.: 0:35 para pular a introdução.</div></label>
      </div>
      <div class="dica">Deixe o link em branco para o site ficar sem música.</div>
    </section>

    <section class="sec"><h2>Texto personalizado</h2><p class="dica">Uma mensagem sua para o cliente, como uma carta, que aparece no site das fotos prontas. Pule uma linha para começar um novo parágrafo.</p>
      <div class="g2">
        <label class="campo"><span>Título da mensagem</span><input class="input" data-k="cartaTitulo" value="${esc(g.cartaTitulo || '')}" placeholder="Ex.: Para vocês"></label>
        <label class="campo"><span>Assinatura</span><input class="input" data-k="cartaAssinatura" value="${esc(g.cartaAssinatura || '')}" placeholder="Ex.: Com carinho, Tati"></label>
      </div>
      <label class="campo"><span>Mensagem</span><textarea class="input" data-k="carta" rows="7" maxlength="3000" placeholder="Ex.: Foi um presente acompanhar esse dia com vocês…">${esc(g.carta || '')}</textarea></label>
      <div class="g2">
        <label class="campo"><span>Estilo da letra</span><select class="input" data-k="cartaLetra">
          <option value="classica" ${g.cartaLetra !== 'manuscrita' ? 'selected' : ''}>Clássica (delicada)</option>
          <option value="manuscrita" ${g.cartaLetra === 'manuscrita' ? 'selected' : ''}>Manuscrita (caligrafia)</option></select></label>
        <label class="campo"><span>Onde aparece</span><select class="input" data-k="cartaPosicao">
          <option value="inicio" ${g.cartaPosicao !== 'fim' ? 'selected' : ''}>Logo depois da capa</option>
          <option value="fim" ${g.cartaPosicao === 'fim' ? 'selected' : ''}>No final, depois das fotos</option></select></label>
      </div>
      <div class="carta-prev" id="cprev"></div>
      <label class="campo" style="margin:16px 0 0"><span>Frase de encerramento</span><input class="input" data-k="textoFim" value="${esc(g.textoFim || '')}" placeholder="Fim. Ou melhor: o começo."><div class="dica">Aparece no fim do site. Em branco, fica a frase padrão.</div></label>
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
      <div class="g2">
        <label class="campo"><span>Valor de cada foto além do pacote (R$)</span><input class="input" data-k="valorExtra" inputmode="decimal" value="${g.valorExtra == null ? '' : precoTxt(g.valorExtra)}" placeholder="Em branco = valor padrão do catálogo"></label>
        <label class="campo"><span>Produtos</span><label class="chave" style="margin-top:10px"><input type="checkbox" data-k="lojaAtiva" ${g.lojaAtiva !== false ? 'checked' : ''}> Mostrar o catálogo de produtos nesta galeria</label></label>
      </div>
      <label class="campo" style="margin-bottom:0"><span>Pasta com os originais (opcional)</span><input class="input" data-k="pastaOriginais" value="${g.pastaOriginais ? esc(linkPasta(g.pastaOriginais)) : ''}" placeholder="https://drive.google.com/drive/folders/…">
        <div class="dica">Se na seleção você colocou fotos menores, cole aqui o link da pasta com os arquivos em alta (JPG, TIFF ou RAW). Eu encontro cada foto escolhida pelo nome do arquivo. Deixe em branco para baixar o próprio arquivo da seleção.</div></label>
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
    $('#vertodos').onclick = () => verSelecao(g, '');
    $('#baixartodos').onclick = () => baixarOriginais(g, '');
    $('#pastatodos').onclick = () => pastaNoDrive(g, '');
    $$('.pessoa').forEach(el => {
      const p = g.pessoas[el.dataset.p];
      $('[data-abre]', el).onclick = e => { if (!e.target.closest('[data-nao]')) el.classList.toggle('aberta'); };
      const vs = $('[data-versel]', el); if (vs) vs.onclick = () => verSelecao(g, p.id);
      const bx = $('[data-baixar]', el); if (bx) bx.onclick = () => baixarOriginais(g, p.id);
      const pz = $('[data-pasta]', el); if (pz) pz.onclick = () => pastaNoDrive(g, p.id);
      $$('[data-vf]', el).forEach(f => f.onclick = () => verSelecao(g, p.id, f.dataset.vf));
      const lr = $('[data-lr]', el); if (lr) lr.onclick = () => copiar(fotos.filter(f => f.id in p.fotos).map(f => semExt(f.n)).join(', '));
      const ra = $('[data-reabre]', el); if (ra) ra.onclick = async () => {
        if (!(await confirmar('Reabrir a escolha?', `${esc(p.nome)} vai poder mudar as fotos e enviar de novo.`, 'Reabrir'))) return;
        if (!(await antesDeRecarregar())) return;
        try { pintarEditor((await adm('painelReabrirEscolha', { slug: g.slug, pessoa: p.id })).galeria); toast('Escolha reaberta'); } catch (e) { toast(e.message); }
      };
      const vp = $('[data-vp]', el); if (vp) vp.onclick = async () => {
        if (!(await antesDeRecarregar())) return;
        vp.disabled = true; vp.textContent = 'Verificando…';
        try {
          const ng = (await adm('painelVerificarPagamento', { slug: g.slug, pessoa: p.id })).galeria;
          const st = ng.pessoas[p.id].pedido.status;
          pintarEditor(ng); $(`.pessoa[data-p="${CSS.escape(p.id)}"]`).classList.add('aberta');
          toast(st === 'pago' ? 'Pagamento confirmado!' : st === 'processando' ? 'Pagamento em análise' : ng.pessoas[p.id].pedido.link ? 'Ainda não aparece como pago' : 'Não consegui gerar o link. Confira a forma de pagamento em Produtos e pagamento');
        } catch (e) { toast(e.message); vp.disabled = false; }
      };
      const mpg = $('[data-mp]', el); if (mpg) mpg.onclick = async () => {
        if (!(await confirmar('Marcar como pago?', `Use quando ${esc(p.nome)} pagou por fora (Pix direto, dinheiro) ou quando você já viu o pagamento no app.`, 'Marcar como pago'))) return;
        if (!(await antesDeRecarregar())) return;
        try { pintarEditor((await adm('painelMarcarPago', { slug: g.slug, pessoa: p.id })).galeria); $(`.pessoa[data-p="${CSS.escape(p.id)}"]`).classList.add('aberta'); toast('Marcado como pago'); }
        catch (e) { toast(e.message); }
      };
      $$('[data-cl]', el).forEach(b => b.onclick = () => copiar(b.dataset.cl));
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
      const ini = segundos($('[data-k="musicaInicio"]').value);
      if (ini) ouvindo.addEventListener('loadedmetadata', () => { try { ouvindo.currentTime = ini; } catch (e) {} }, { once: true });
      ouvindo.play().then(() => { $('#tm').innerHTML = ic('mute'); }).catch(() => { toast('Não consegui tocar esse link. Confira se é um MP3 compartilhado.'); ouvindo = null; });
    };
    $('#upm').onclick = () => $('#arqm').click();
    $('#arqm').onchange = async () => {
      const f = $('#arqm').files[0]; $('#arqm').value = '';
      if (!f) return;
      if (!/^audio\//.test(f.type) && !/\.(mp3|m4a)$/i.test(f.name)) return toast('Escolha um arquivo de música (MP3)');
      if (f.size > 20 * 1048576) return toast('A música precisa ter até 20 MB');
      const b = $('#upm'); b.disabled = true; b.innerHTML = `${ic('music')} Enviando…`;
      try {
        let url;
        if (DEMO) url = URL.createObjectURL(f);
        else {
          const dados = await new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = erro; r.readAsDataURL(f); });
          url = (await adm('painelEnviarMusica', { slug: g.slug, nome: f.name, tipo: f.type || 'audio/mpeg', dados })).url;
        }
        $('[data-k="musica"]').value = url; $('[data-k="musicaNome"]').value = f.name;
        $('#nomem').textContent = 'Música escolhida: ' + f.name + (DEMO ? ' (no modo demonstração só toca nesta aba)' : '');
        marcar(); toast('Música enviada. Clique em Salvar alterações');
      } catch (e) { toast(e.message || 'Não consegui enviar a música'); }
      b.disabled = false; b.innerHTML = `${ic('music')} Enviar música do computador`;
    };
    const prevCarta = () => {
      const v = k => $(`[data-k="${k}"]`).value;
      $('#cprev').innerHTML = v('carta').trim() ? `<span class="cap">Prévia</span>` + cartaHtml({ carta: v('carta'), cartaTitulo: v('cartaTitulo'), cartaAssinatura: v('cartaAssinatura'), cartaLetra: v('cartaLetra') }).replace('class="carta-in surge"', 'class="carta-in"') : '';
    };
    ['carta', 'cartaTitulo', 'cartaAssinatura', 'cartaLetra'].forEach(k => $(`[data-k="${k}"]`).addEventListener('input', prevCarta));
    $('[data-k="cartaLetra"]').addEventListener('change', prevCarta);
    prevCarta();
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
    if ('musicaInicio' in dados) dados.musicaInicio = segundos(dados.musicaInicio);
    if (ent) Object.assign(dados, { capa: ed.capa, capaPosicao: ed.capaPosicao, pastas: ed.pastas.map(p => ({ id: p.id, nome: p.nome, frase: p.frase, oculta: p.oculta })) });
    const b = $('#sv'); b.disabled = true; b.textContent = 'Salvando…';
    try { const r = await adm('painelSalvar', { slug: g.slug, dados }); sujo = false; toast('Alterações salvas'); pintarEditor(r.galeria); }
    catch (e) { toast(e.message); b.disabled = false; b.textContent = 'Salvar alterações'; }
  };
  window.onbeforeunload = () => sujo ? true : undefined;
}

/* ===================== marca d'água, música e texto personalizado ===================== */
document.head.insertAdjacentHTML('beforeend', `<style>
/* carta personalizada nas fotos prontas */
.carta{padding:12vh 22px 4vh}
.carta-in{max-width:640px;margin:0 auto;text-align:center}
.carta .orn{color:var(--gold);font-size:14px;letter-spacing:.6em;margin-bottom:22px}
.carta h2{font-family:var(--serif);font-weight:300;font-style:italic;font-size:clamp(30px,4.4vw,46px);color:var(--gold2);margin:0 0 26px}
.carta-txt p{font-family:var(--serif);font-weight:300;font-size:clamp(19px,2.1vw,23px);line-height:1.75;color:var(--ink);margin:0 0 1.1em}
.carta .assina{font-family:'Pinyon Script',var(--serif);font-size:clamp(30px,3.6vw,40px);color:var(--gold);margin-top:18px}
.carta.manuscrita .carta-txt p{font-family:'Pinyon Script',var(--serif);font-size:clamp(25px,2.8vw,31px);line-height:1.55}
.carta.manuscrita h2{font-family:'Pinyon Script',var(--serif);font-style:normal;font-size:clamp(40px,5.4vw,58px)}
.wm{background-repeat:no-repeat,repeat;background-position:center,0 0;background-size:84% auto,260px 260px}
</style>`);

marcaFundo = function (texto) {
  const e = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  const t = e(texto || CONFIG.ESTUDIO);
  const url = svg => `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg).replace(/'/g, '%27')}')`;
  /* centro: CÓPIA NÃO AUTORIZADA */
  const centro = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 150'><g font-family='Georgia,serif' font-size='66' letter-spacing='9' text-anchor='middle'>
    <text x='500' y='98' fill='none' stroke='black' stroke-opacity='0.16' stroke-width='3'>CÓPIA NÃO AUTORIZADA</text>
    <text x='500' y='98' fill='white' fill-opacity='0.38'>CÓPIA NÃO AUTORIZADA</text></g>
    <line x1='70' y1='22' x2='930' y2='22' stroke='white' stroke-opacity='0.3' stroke-width='2'/><line x1='70' y1='128' x2='930' y2='128' stroke='white' stroke-opacity='0.3' stroke-width='2'/></svg>`;
  /* fundo: linhas diagonais finas + nome do estúdio */
  const fundo = `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'>
    <g stroke-width='1'><path d='M-10 70 L70 -10 M-10 200 L200 -10 M60 270 L270 60 M190 270 L270 190' stroke='white' stroke-opacity='0.22'/>
    <path d='M-10 71.5 L71.5 -10 M-10 201.5 L201.5 -10 M61.5 270 L270 61.5 M191.5 270 L270 191.5' stroke='black' stroke-opacity='0.07'/></g>
    <g transform='rotate(-45 130 130)' font-family='Georgia,serif' font-size='13' letter-spacing='2' text-anchor='middle'>
    <text x='130' y='134' fill='white' fill-opacity='0.34'>${t}</text></g></svg>`;
  return `${url(centro)}, ${url(fundo)}`;
};

/* ---------- carta / texto personalizado ---------- */
function cartaHtml(g) {
  const txt = String(g.carta || '').trim();
  if (!txt) return '';
  const pars = txt.split(/\n\s*\n/).map(b => `<p>${esc(b.trim()).replace(/\n/g, '<br>')}</p>`).join('');
  return `<section class="carta ${g.cartaLetra === 'manuscrita' ? 'manuscrita' : ''}" id="carta"><div class="carta-in surge">
    <div class="orn">✦</div>${g.cartaTitulo ? `<h2>${esc(g.cartaTitulo)}</h2>` : ''}
    <div class="carta-txt">${pars}</div>
    ${g.cartaAssinatura ? `<div class="assina">${esc(g.cartaAssinatura)}</div>` : ''}</div></section>`;
}

/* ---------- fotos prontas: estilo revista ---------- */
telaRevista = function () {
  const g = G;
  const audio = g.musica ? new Audio(musicaUrl(g.musica)) : null;
  if (audio) { audio.loop = true; audio.preload = 'none'; }
  let comecou = false;
  const carta = cartaHtml(g);
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
    ${g.cartaPosicao !== 'fim' ? carta : ''}
    ${capitulos || '<div class="wrap"><div class="vazio" style="margin:60px 0">As fotos ainda estão sendo preparadas.</div></div>'}
    ${g.cartaPosicao === 'fim' ? carta : ''}
    <div class="fim surge"><div class="orn">✦</div><h3>${g.textoFim ? esc(g.textoFim) : 'Fim. <em class="ouro">Ou melhor: o começo.</em>'}</h3><p>Com carinho, ${esc(CONFIG.ESTUDIO)}</p>
      <button class="btn btn-ouro" id="baixar2">${ic('cloud')} Guardar todas as fotos</button></div>
    <footer class="rodape"><div>${esc(CONFIG.ESTUDIO)}</div><div style="margin-top:10px"><a href="?painel">Área da fotógrafa</a></div></footer>
    ${audio ? `<button class="musica" id="som" aria-label="Música">${ic('music')}</button>` : ''}`;

  const capa = $('#capa');
  const mostrar = () => { capa.classList.add('in'); setTimeout(() => { $('#tit').classList.add('in'); const fr = $('#frase'); if (fr) fr.classList.add('in'); }, 300); };
  if (capa.complete) mostrar(); else { capa.onload = mostrar; capa.onerror = mostrar; }

  function tocar(ligar) {
    if (!audio) return;
    const b = $('#som');
    if (ligar && !comecou && g.musicaInicio) { try { audio.currentTime = g.musicaInicio; } catch (e) {} }
    if (ligar) comecou = true;
    if (ligar) audio.play().then(() => { b.classList.add('on'); b.innerHTML = ic('music'); }).catch(() => {});
    else { audio.pause(); b.classList.remove('on'); b.innerHTML = ic('mute'); }
  }
  if (audio) $('#som').onclick = () => tocar(audio.paused);
  $('#ver').onclick = () => { const c = $('#carta') && g.cartaPosicao !== 'fim' ? $('#carta') : $('#cap-0'); (c || $('#nav')).scrollIntoView({ behavior: 'smooth' }); tocar(true); };
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
};

/* modo demonstração: guarda e devolve os novos campos */
const CAMPOS_EXTRA = ['musicaNome', 'musicaInicio', 'carta', 'cartaTitulo', 'cartaAssinatura', 'cartaLetra', 'cartaPosicao', 'textoFim'];
const DEMO_API_2 = demoApi;
demoApi = async function (acao, d) {
  if (acao === 'painelSalvar' && d.dados) {
    const x = d.dados, extra = {};
    CAMPOS_EXTRA.forEach(k => { if (k in x) { extra[k] = x[k]; delete x[k]; } });
    const r = await DEMO_API_2(acao, d);
    const db = demoDb(); const g = db.galerias[d.slug];
    if (g && Object.keys(extra).length) {
      ['musicaNome', 'carta', 'cartaTitulo', 'cartaAssinatura', 'textoFim'].forEach(k => { if (k in extra) g[k] = String(extra[k] || '').trim(); });
      if ('cartaLetra' in extra) g.cartaLetra = extra.cartaLetra === 'manuscrita' ? 'manuscrita' : 'classica';
      if ('cartaPosicao' in extra) g.cartaPosicao = extra.cartaPosicao === 'fim' ? 'fim' : 'inicio';
      if ('musicaInicio' in extra) g.musicaInicio = Math.max(0, Math.min(900, Math.floor(Number(extra.musicaInicio) || 0)));
      demoSave(db);
      Object.assign(r.galeria, g, { link: r.galeria.link, pastaUrl: r.galeria.pastaUrl });
    }
    return r;
  }
  const r = await DEMO_API_2(acao, d);
  if (acao === 'abrir' && r.galeria && r.galeria.tipo === 'entrega') {
    const g = demoDb().galerias[d.slug] || {};
    CAMPOS_EXTRA.forEach(k => { if (g[k] != null) r.galeria[k] = g[k]; });
  }
  return r;
};
