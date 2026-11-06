/* Tati Pretto Fotografia — catálogo de produtos, pedido e pagamento (InfinitePay ou Mercado Pago).
   Carregado depois do painel.js. */

const brl = v => (Math.round(Number(v || 0) * 100) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const numBR = v => {
  if (typeof v === 'number') return v;
  let t = String(v == null ? '' : v).replace(/[^\d,.-]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t); return isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
const precoTxt = n => (Math.round(Number(n || 0) * 100) / 100).toFixed(2).replace('.', ',');
const novoId = () => Math.random().toString(36).slice(2, 10);

/* ===================== cliente ===================== */

/** Conta do pedido feita no aparelho (o valor final é sempre confirmado pelo servidor). */
function contaPedido(g, escolha, carrinho) {
  const prods = {}; ((g.loja && g.loja.produtos) || []).forEach(x => { prods[x.id] = x; });
  const itens = carrinho.filter(it => prods[it.produto]).map(it => {
    const pr = prods[it.produto];
    return { nome: pr.nome, preco: pr.preco, qtd: it.qtd, subtotal: Math.round(pr.preco * it.qtd * 100) / 100, fotos: it.fotos, texto: it.texto };
  });
  const n = Object.keys(escolha).length;
  const qtd = g.limite ? Math.max(0, n - g.limite) : 0;
  const unit = (g.loja && g.loja.valorExtra) || 0;
  const extras = { qtd, valorUnit: unit, subtotal: Math.round(qtd * unit * 100) / 100 };
  return { itens, extras, total: Math.round((itens.reduce((s, i) => s + i.subtotal, 0) + extras.subtotal) * 100) / 100 };
}

function linhasPedido(o) {
  const l = o.itens.map(i => `<div class="pd-linha"><span>${i.qtd}× ${esc(i.nome)}${i.texto ? `<small>“${esc(i.texto)}”</small>` : ''}</span><b>${brl(i.subtotal)}</b></div>`);
  if (o.extras && o.extras.qtd && o.extras.subtotal) l.push(`<div class="pd-linha"><span>${o.extras.qtd} ${o.extras.qtd === 1 ? 'foto' : 'fotos'} além do pacote<small>${brl(o.extras.valorUnit)} cada</small></span><b>${brl(o.extras.subtotal)}</b></div>`);
  return l.join('');
}

function textoParcelas(n, semJuros) {
  if (semJuros > 1) return `Pix ou cartão em até ${semJuros}x sem juros${n > semJuros ? ` (ou até ${n}x)` : ''}`;
  return n > 1 ? `Pix ou cartão em até ${n}x` : 'Pix ou cartão';
}
const nomeProvedor = v => v === 'infinitepay' ? 'InfinitePay' : v === 'mercadopago' ? 'Mercado Pago' : 'site de pagamento';

/** Bloco do pedido que aparece depois que a escolha foi enviada. */
function blocoPedidoCliente(p, g) {
  const o = p.pedido;
  if (!o || (!o.itens.length && !(o.extras && o.extras.subtotal))) return '';
  const st = {
    pago: `<div class="pd-status ok">${ic('check')} Pagamento confirmado${o.pagoEm ? ' em ' + dataBR(o.pagoEm) : ''}. Obrigada!</div>${o.comprovante ? `<a class="btn btn-ghost btn-sm" style="padding-left:0" href="${esc(o.comprovante)}" target="_blank" rel="noopener">Ver comprovante</a>` : ''}`,
    processando: `<div class="pd-status">Pagamento em análise. Assim que for confirmado, aparece aqui.</div>`,
    aguardando: o.link ? `<a class="btn btn-ouro" style="width:100%" href="${esc(o.link)}">${ic('lock')} Pagar ${brl(o.aPagar)}</a><div class="dica" style="text-align:center;margin:8px 0 0">${textoParcelas(o.parcelas, o.semJuros)}</div>` : '',
    erro_link: `<div class="pd-status">A Tati vai te enviar o link de pagamento.</div>`,
    sem_link: `<div class="pd-status">A Tati vai te enviar a forma de pagamento.</div>`,
  }[o.status] || '';
  return `<div class="pd-caixa"><div class="cap" style="margin-bottom:10px">Seu pedido</div>${linhasPedido(o)}
    <div class="pd-total"><span>Total</span><b>${brl(o.total)}</b></div>
    ${o.pagoAntes ? `<div class="pd-linha"><span>Já pago antes</span><b>− ${brl(o.pagoAntes)}</b></div><div class="pd-total"><span>A pagar</span><b>${brl(o.aPagar)}</b></div>` : ''}
    ${st}</div>`;
}

/** Catálogo em tela cheia. ctx: { g, escolha, carrinho, numero, aoMudar, aoContinuar } */
function abrirLoja(ctx) {
  const g = ctx.g, L = g.loja;
  const el = document.createElement('div');
  el.className = 'loja';
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  const prods = {}; L.produtos.forEach(x => { prods[x.id] = x; });
  const fechar = () => { el.remove(); if (!$('.janela-fundo') && !$('.lb')) document.body.style.overflow = ''; };

  function pintar() {
    const c = ctx.carrinho.filter(it => prods[it.produto]);
    const soma = c.reduce((s, it) => s + prods[it.produto].preco * it.qtd, 0);
    el.innerHTML = `
      <div class="loja-topo"><div class="wrap"><div><span class="cap">Antes de enviar</span><h2>Nossos <em class="ouro">produtos</em></h2></div>
        <span class="espaco"></span><button class="icon-btn" data-fechar aria-label="Fechar">${ic('x')}</button></div></div>
      <div class="wrap loja-corpo">
        <p class="loja-intro">Transforme suas fotos favoritas em lembranças para guardar. Escolha o produto, as fotos e a quantidade. É opcional.</p>
        ${c.length ? `<div class="pd-caixa" style="margin-bottom:28px"><div class="cap" style="margin-bottom:10px">Seu pedido</div>
          ${c.map(it => { const pr = prods[it.produto]; return `<div class="loja-item">
            ${it.fotos[0] ? `<img src="${esc(foto(it.fotos[0], 200))}" alt="">` : '<i class="loja-sem-img">✦</i>'}
            <div class="li-txt"><b>${it.qtd}× ${esc(pr.nome)}</b><span>${pr.fotos ? `${it.fotos.length} de ${pr.fotos} ${pr.fotos === 1 ? 'foto' : 'fotos'}` : ''}${it.texto ? ` • “${esc(it.texto)}”` : ''}</span></div>
            <b class="li-preco">${brl(pr.preco * it.qtd)}</b>
            <div class="li-acoes"><button class="btn btn-linha btn-sm" data-edit="${esc(it.id)}">Editar</button><button class="btn btn-ghost btn-sm" data-rem="${esc(it.id)}">${ic('trash')}</button></div>
          </div>`; }).join('')}</div>` : ''}
        <div class="loja-grade">${L.produtos.map(pr => `<div class="prod">
          <div class="prod-img">${pr.imagem ? `<img loading="lazy" src="${esc(foto(pr.imagem, 700))}" alt="">` : '<i>✦</i>'}</div>
          <div class="prod-corpo"><h3>${esc(pr.nome)}</h3><div class="prod-preco">${brl(pr.preco)}</div>
            ${pr.descricao ? `<p>${esc(pr.descricao)}</p>` : ''}
            <div class="prod-info">${pr.fotos ? `${ic('heart')} ${pr.fotos === 1 ? '1 foto' : `até ${pr.fotos} fotos`}` : ''}${pr.pedeTexto ? ` ${ic('msg')} com texto` : ''}</div>
            <button class="btn btn-ouro btn-sm" data-prod="${esc(pr.id)}">${ic('plus')} Escolher</button></div></div>`).join('')}</div>
      </div>
      <div class="rodape-sel"><div class="in">
        <div class="txt">${c.length ? `${c.length} ${c.length === 1 ? 'produto' : 'produtos'} • <b style="color:var(--gold2)">${brl(soma)}</b>` : 'Nenhum produto escolhido'}<small>Você pode mudar até enviar a escolha</small></div>
        <span class="espaco"></span>
        <button class="btn ${ctx.aoContinuar ? 'btn-ouro' : 'btn-linha'}" data-ok>${ctx.aoContinuar ? (c.length ? 'Continuar' : 'Continuar sem produtos') : 'Voltar às fotos'}</button>
      </div></div>`;
    $('[data-fechar]', el).onclick = fechar;
    $('[data-ok]', el).onclick = () => { fechar(); if (ctx.aoContinuar) ctx.aoContinuar(); };
    $$('[data-prod]', el).forEach(b => b.onclick = () => configurarItem(ctx, prods[b.dataset.prod], null, pintar));
    $$('[data-edit]', el).forEach(b => b.onclick = () => { const it = ctx.carrinho.find(x => x.id === b.dataset.edit); configurarItem(ctx, prods[it.produto], it, pintar); });
    $$('[data-rem]', el).forEach(b => b.onclick = () => { const k = ctx.carrinho.findIndex(x => x.id === b.dataset.rem); if (k >= 0) ctx.carrinho.splice(k, 1); ctx.aoMudar(); pintar(); });
  }
  pintar();
}

/** Janela para montar um produto: escolher fotos, texto e quantidade. */
function configurarItem(ctx, pr, item, depois) {
  const g = ctx.g;
  const minhas = g.fotos.filter(f => f.id in ctx.escolha);
  const sel = item ? item.fotos.filter(id => id in ctx.escolha) : [];
  let qtd = item ? item.qtd : 1;
  const j = abrirJanela(`<h3>${esc(pr.nome)}</h3><p style="margin-bottom:6px"><span class="ouro">${brl(pr.preco)}</span>${pr.descricao ? ` • ${esc(pr.descricao)}` : ''}</p>
    ${pr.fotos ? `<div class="cap" style="margin:16px 0 8px">Escolha ${pr.fotos === 1 ? 'a foto' : `até ${pr.fotos} fotos`} <span id="ctf"></span></div>
      ${minhas.length ? `<div class="mini-sel">${minhas.map(f => `<button type="button" class="ms" data-f="${esc(f.id)}"><img src="${esc(foto(f.id, 300))}" alt="" draggable="false"><div class="wm" style="background-image:${marcaFundo(g.marca)}"></div><span class="ms-num">Foto ${ctx.numero(f.id)}</span><i class="ms-ord"></i></button>`).join('')}</div>`
        : '<div class="aviso">Primeiro escolha suas fotos favoritas. Depois volte aqui para colocar no produto.</div>'}` : ''}
    ${pr.pedeTexto ? `<label class="campo" style="margin-top:16px"><span>${esc(pr.dicaTexto || 'Texto')}</span><textarea class="input" id="txp" rows="2" maxlength="300" placeholder="${esc(pr.dicaTexto || 'Escreva aqui o que quer no produto')}">${esc(item ? item.texto : '')}</textarea></label>` : ''}
    <div class="qtd-linha"><span>Quantidade</span>
      <div class="qtd"><button type="button" class="icon-btn" data-q="-1" aria-label="Menos">−</button><b id="qv"></b><button type="button" class="icon-btn" data-q="1" aria-label="Mais">+</button></div>
      <span class="espaco"></span><b class="ouro" id="sub"></b></div>
    <div class="erro" id="erp"></div>
    <div class="janela-acoes"><button class="btn btn-linha" data-n>Cancelar</button><button class="btn btn-ouro" data-s>${item ? 'Salvar' : 'Adicionar ao pedido'}</button></div>`, { largura: 640 });
  function pintar() {
    $$('.ms', j).forEach(b => { const k = sel.indexOf(b.dataset.f); b.classList.toggle('on', k >= 0); $('.ms-ord', b).textContent = k >= 0 ? (pr.fotos > 1 ? k + 1 : '✓') : ''; });
    const c = $('#ctf', j); if (c) c.textContent = `(${sel.length} de ${pr.fotos})`;
    $('#qv', j).textContent = qtd;
    $('#sub', j).textContent = brl(pr.preco * qtd);
  }
  $$('.ms', j).forEach(b => b.onclick = () => {
    const id = b.dataset.f, k = sel.indexOf(id);
    if (k >= 0) sel.splice(k, 1);
    else if (pr.fotos === 1) { sel.length = 0; sel.push(id); }
    else if (sel.length < pr.fotos) sel.push(id);
    else { toast(`Este produto leva até ${pr.fotos} fotos`); return; }
    pintar();
  });
  $$('[data-q]', j).forEach(b => b.onclick = () => { qtd = Math.max(1, Math.min(99, qtd + Number(b.dataset.q))); pintar(); });
  $('[data-n]', j).onclick = () => fecharJanela(j);
  $('[data-s]', j).onclick = () => {
    if (pr.fotos && !sel.length) { $('#erp', j).textContent = minhas.length ? 'Toque na foto que você quer usar neste produto.' : 'Escolha suas fotos antes.'; return; }
    const tx = $('#txp', j);
    const novo = { id: item ? item.id : novoId(), produto: pr.id, fotos: sel.slice(), texto: tx ? tx.value.trim() : '', qtd };
    if (item) Object.assign(item, novo); else ctx.carrinho.push(novo);
    ctx.aoMudar(); fecharJanela(j); if (depois) depois();
    toast(item ? 'Produto atualizado' : 'Produto adicionado ao pedido');
  };
  pintar();
}

/** Volta do site de pagamento: confere o pagamento e avisa. */
async function voltaPagamento(g, p, depois) {
  const q = new URLSearchParams(location.search);
  if (!q.has('pagamento')) return;
  const deu = q.get('pagamento') === '1';
  const transacao = {};
  ['order_nsu', 'slug', 'transaction_nsu', 'receipt_url'].forEach(k => { if (q.get(k)) transacao[k] = q.get(k); });
  history.replaceState(null, '', '?g=' + encodeURIComponent(g.slug));
  let pessoa = p;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try { pessoa = (await api('verificarPagamento', { slug: g.slug, pin: PIN, pessoa: p.id, transacao })).pessoa; Object.assign(p, pessoa); if (depois) depois(); } catch (e) { /* mostra o aviso mesmo assim */ }
    if (!deu || (p.pedido && p.pedido.status === 'pago')) break;
    await espera(2500);
  }
  const st = p.pedido && p.pedido.status;
  const msg = st === 'pago' ? ['Pagamento <em class="ouro">confirmado</em>', 'Obrigada! A Tati já recebeu seu pedido e o pagamento.']
    : deu || st === 'processando' ? ['Pagamento <em class="ouro">recebido</em>', 'Estamos confirmando com o banco. No Pix costuma levar poucos minutos. A Tati recebe o aviso assim que for confirmado.']
    : ['Pagamento não <em class="ouro">concluído</em>', 'Tudo bem: sua escolha está salva. Quando quiser, toque em “Pagar” para tentar de novo.'];
  abrirJanela(`<div class="orn" style="margin-top:0">✦</div><h3 style="text-align:center">${msg[0]}</h3><p style="text-align:center">${msg[1]}</p><div class="janela-acoes" style="justify-content:center"><button class="btn btn-ouro" onclick="fecharJanela()">Fechar</button></div>`);
}

/* ===================== painel: catálogo e pagamento ===================== */

async function telaCatalogo() {
  window.onbeforeunload = null;
  history.replaceState(null, '', '?painel&catalogo');
  app.innerHTML = `${topoAdm()}<main class="wrap adm"><div class="loading" style="min-height:30vh"><div class="spin"></div>Abrindo o catálogo…</div></main>`;
  ligarTopo();
  let r;
  try { r = await adm('painelCatalogo'); } catch (e) { $('.adm').innerHTML = `<div class="vazio">${esc(e.message)}</div>`; return; }
  pintarCatalogo(r.catalogo, r.mpConfigurado);
}

function pintarCatalogo(cat, mpOk) {
  const prov = cat.provedor || (cat.infiniteTag ? 'infinitepay' : mpOk ? 'mercadopago' : '');
  const prods = cat.produtos.map(x => Object.assign({}, x));
  let sujo = false;
  $('.adm').innerHTML = `
    <button class="btn btn-ghost" id="volta" style="padding-left:0">${ic('back')} Galerias</button>
    <div class="adm-cab" style="margin-top:6px"><div><span class="cap">Seleção</span><h1 style="margin-top:8px">Produtos e pagamento</h1></div>
      <button class="btn btn-ouro" id="novo">${ic('plus')} Novo produto</button></div>

    <section class="sec"><h2>Pagamento</h2>
      <label class="campo"><span>Onde o cliente paga</span><select class="input" id="prov">
        <option value="infinitepay" ${prov === 'infinitepay' ? 'selected' : ''}>InfinitePay (Pix e cartão)</option>
        <option value="mercadopago" ${prov === 'mercadopago' ? 'selected' : ''}>Mercado Pago (Pix e cartão)</option>
        <option value="" ${prov === '' ? 'selected' : ''}>Nenhum: só mostrar o total, eu combino o pagamento</option></select></label>
      <div data-so="infinitepay">
        <div class="aviso ${cat.infiniteTag ? 'ouro' : 'alerta'}">${cat.infiniteTag ? `${ic('check')} InfinitePay ligada em <b>$${esc(cat.infiniteTag)}</b>. Ao enviar a escolha, o cliente recebe o link para pagar.` : 'Coloque sua InfiniteTag para ligar a InfinitePay.'}</div>
        <div class="g2">
          <label class="campo"><span>Sua InfiniteTag</span><input class="input" id="itag" value="${esc(cat.infiniteTag || '')}" placeholder="Ex.: tatipretto (sem o $)" autocomplete="off">
            <div class="dica">Está no app da InfinitePay, no seu perfil (começa com $).</div></label>
          <label class="campo"><span>Parcelas sem juros para o cliente</span><select class="input" id="sjur">${Array.from({ length: 13 }, (_, k) => `<option value="${k}" ${(cat.parcelasSemJuros || 0) === k ? 'selected' : ''}>${k ? `Até ${k}x sem juros` : 'Nenhuma (juros por conta do cliente)'}</option>`).join('')}</select>
            <div class="dica">Use o mesmo número que está no app da InfinitePay, em <b>Configurações do Checkout → Parcelamento e taxas</b>. Aqui é só o texto que o cliente vê.</div></label>
        </div>
      </div>
      <div data-so="mercadopago">
        <div class="aviso ${mpOk ? 'ouro' : 'alerta'}">${mpOk ? `${ic('check')} Mercado Pago ligado.` : 'Cole o Access Token para ligar o Mercado Pago.'}</div>
        <label class="campo"><span>Access Token de produção do Mercado Pago</span><input class="input" id="tok" type="password" autocomplete="off" placeholder="${mpOk ? 'Já configurado. Cole outro só se quiser trocar' : 'APP_USR-…'}">
          <div class="dica">Fica guardado só no seu Google. Não aparece de novo aqui nem no site. ${mpOk ? '<a href="#" id="remtok">Apagar o token</a>' : ''}</div></label>
        <label class="campo"><span>Parcelar em até</span><select class="input" id="parc">${Array.from({ length: 12 }, (_, k) => `<option value="${k + 1}" ${cat.parcelas === k + 1 ? 'selected' : ''}>${k + 1}x${k ? '' : ' (só à vista)'}</option>`).join('')}</select></label>
      </div>
      <label class="campo" style="margin-bottom:0"><span>Valor de cada foto além do pacote (padrão)</span><input class="input" id="vext" inputmode="decimal" value="${cat.valorExtraPadrao ? precoTxt(cat.valorExtraPadrao) : ''}" placeholder="Ex.: 24,90 (em branco = não cobra)">
        <div class="dica">Dá para mudar em cada galeria.</div></label>
    </section>

    <section class="sec"><h2>Catálogo</h2><p class="dica">O cliente vê os produtos ativos antes de enviar a escolha, escolhe as fotos, escreve o texto e a quantidade.</p>
      <div id="lista" class="prods-adm"></div></section>`;
  const barra = document.createElement('div');
  barra.className = 'barra-salvar';
  barra.innerHTML = `<div class="wrap"><span class="dica" style="margin:0" id="st">Nenhuma alteração</span><span class="espaco"></span><button class="btn btn-ouro" id="sv" disabled>Salvar alterações</button></div>`;
  $('.adm').appendChild(barra);
  const marcar = () => { sujo = true; $('#sv').disabled = false; $('#st').textContent = 'Alterações não salvas'; };
  ['prov', 'itag', 'sjur', 'tok', 'parc', 'vext'].forEach(id => { $('#' + id).oninput = marcar; $('#' + id).onchange = marcar; });
  const mostraProv = () => $$('[data-so]').forEach(el => { el.style.display = el.dataset.so === $('#prov').value ? '' : 'none'; });
  $('#prov').addEventListener('change', mostraProv); mostraProv();
  let remover = false;
  const rt = $('#remtok'); if (rt) rt.onclick = async e => { e.preventDefault(); if (await confirmar('Apagar o token do Mercado Pago?', 'Ele sai do seu Google. Para usar o Mercado Pago de novo, será preciso colar outro.', 'Apagar', true)) { remover = true; marcar(); rt.textContent = 'Será apagado ao salvar'; } };
  $('#volta').onclick = async () => { if (sujo && !(await confirmar('Sair sem salvar?', 'As alterações do catálogo ainda não foram salvas.', 'Sair sem salvar', true))) return; telaLista(); };
  window.onbeforeunload = () => sujo ? true : undefined;

  function pintarLista() {
    $('#lista').innerHTML = prods.length ? prods.map((x, k) => `<div class="prod-adm ${x.ativo ? '' : 'off'}" data-pk="${k}">
      <button class="prod-adm-img" data-img="${k}" title="Trocar a foto do produto">${x.imagem ? `<img src="${esc(foto(x.imagem, 300))}" alt="">` : `<span>${ic('plus')}<br>Foto</span>`}</button>
      <div class="prod-adm-campos">
        <div class="g2"><label class="campo"><span>Nome</span><input class="input" data-c="nome" value="${esc(x.nome)}" placeholder="Ex.: Quadro 30x40"></label>
          <label class="campo"><span>Preço (R$)</span><input class="input" data-c="preco" inputmode="decimal" value="${x.preco || x.preco === 0 ? precoTxt(x.preco) : ''}" placeholder="Ex.: 189,90"></label></div>
        <label class="campo"><span>Descrição</span><input class="input" data-c="descricao" value="${esc(x.descricao || '')}" placeholder="Ex.: Impressão fine art, moldura de madeira"></label>
        <div class="g2"><label class="campo"><span>Quantas fotos o cliente escolhe</span><input class="input" data-c="fotos" type="number" min="0" max="200" value="${x.fotos}"><div class="dica">0 = produto sem foto</div></label>
          <label class="campo"><span>Texto personalizado</span><input class="input" data-c="dicaTexto" value="${esc(x.dicaTexto || '')}" placeholder="Ex.: Nome e data para a capa" ${x.pedeTexto ? '' : 'disabled'}>
            <label class="chave" style="margin-top:8px"><input type="checkbox" data-c="pedeTexto" ${x.pedeTexto ? 'checked' : ''}> Cliente pode escrever um texto</label></label></div>
        <div class="prod-adm-acoes"><label class="chave"><input type="checkbox" data-c="ativo" ${x.ativo ? 'checked' : ''}> Aparece para o cliente</label><span class="espaco"></span>
          <button class="icon-btn" data-up="${k}" title="Subir" ${k ? '' : 'disabled'}>${ic('up')}</button><button class="icon-btn" data-dn="${k}" title="Descer" ${k < prods.length - 1 ? '' : 'disabled'}>${ic('dn')}</button>
          <button class="btn btn-perigo btn-sm" data-del="${k}">${ic('trash')} Excluir</button></div>
      </div></div>`).join('') : '<div class="vazio">Nenhum produto ainda. Toque em “Novo produto”.</div>';
    $$('.prod-adm').forEach(el => {
      const x = prods[+el.dataset.pk];
      $$('[data-c]', el).forEach(i => {
        const f = () => {
          const c = i.dataset.c;
          x[c] = i.type === 'checkbox' ? i.checked : i.value;
          if (c === 'pedeTexto') $('[data-c="dicaTexto"]', el).disabled = !i.checked;
          if (c === 'ativo') el.classList.toggle('off', !i.checked);
          marcar();
        };
        i.oninput = f; i.onchange = f;
      });
    });
    $$('[data-up]').forEach(b => b.onclick = () => { const k = +b.dataset.up; [prods[k - 1], prods[k]] = [prods[k], prods[k - 1]]; marcar(); pintarLista(); });
    $$('[data-dn]').forEach(b => b.onclick = () => { const k = +b.dataset.dn; [prods[k + 1], prods[k]] = [prods[k], prods[k + 1]]; marcar(); pintarLista(); });
    $$('[data-del]').forEach(b => b.onclick = async () => { const k = +b.dataset.del; if (!(await confirmar('Excluir este produto?', `“${esc(prods[k].nome || 'Sem nome')}” sai do catálogo. Pedidos já feitos continuam guardados.`, 'Excluir', true))) return; prods.splice(k, 1); marcar(); pintarLista(); });
    $$('[data-img]').forEach(b => b.onclick = () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/webp';
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        if (f.size > 8 * 1048576) return toast('A imagem precisa ter até 8 MB');
        b.innerHTML = '<span>Enviando…</span>';
        try {
          const dados = await new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = erro; r.readAsDataURL(f); });
          prods[+b.dataset.img].imagem = (await adm('painelEnviarImagem', { nome: f.name, tipo: f.type, dados })).id;
          marcar(); pintarLista(); toast('Foto do produto enviada. Clique em Salvar alterações');
        } catch (e) { toast(e.message); pintarLista(); }
      };
      inp.click();
    });
  }
  pintarLista();
  $('#novo').onclick = () => { prods.push({ id: '', nome: '', descricao: '', preco: '', fotos: 1, pedeTexto: false, dicaTexto: '', imagem: '', ativo: true }); marcar(); pintarLista(); const ult = $$('.prod-adm').pop(); ult.scrollIntoView({ behavior: 'smooth', block: 'center' }); $('[data-c="nome"]', ult).focus(); };
  $('#sv').onclick = async () => {
    if (prods.some(x => !String(x.nome || '').trim())) return toast('Dê um nome para todos os produtos');
    const b = $('#sv'); b.disabled = true; b.textContent = 'Salvando…';
    try {
      const r = await adm('painelSalvarCatalogo', {
        mpToken: $('#tok').value.trim(), removerToken: remover,
        catalogo: { provedor: $('#prov').value, infiniteTag: $('#itag').value.trim().replace(/^[$@]+/, ''), parcelasSemJuros: Number($('#sjur').value),
          parcelas: Number($('#parc').value), valorExtraPadrao: $('#vext').value, produtos: prods.map(x => Object.assign({}, x, { preco: numBR(x.preco), fotos: Number(x.fotos) || 0 })) },
      });
      sujo = false; window.onbeforeunload = null; toast('Catálogo salvo'); pintarCatalogo(r.catalogo, r.mpConfigurado);
    } catch (e) { toast(e.message); b.disabled = false; b.textContent = 'Salvar alterações'; }
  };
}

/** Pedido de uma pessoa, no painel. */
function blocoPedidoAdm(p) {
  const o = p.pedido;
  if (!o || (!o.itens.length && !(o.extras && o.extras.subtotal))) return '';
  const st = { pago: ['ok', 'Pago' + (o.pagoEm ? ' em ' + dataCurta(o.pagoEm) : '')], aguardando: ['alerta', 'Aguardando pagamento'], processando: ['ouro', 'Pagamento em análise'],
    erro_link: ['alerta', 'Link não foi gerado'], sem_link: ['alerta', 'Sem pagamento online: combine por fora'], sem_valor: ['', ''] }[o.status] || ['', o.status];
  return `<div class="pd-caixa pd-adm"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span class="cap">Pedido</span><span class="espaco"></span><span class="estado"><span class="ponto ${st[0]}"></span>${esc(st[1])}</span></div>
    ${o.itens.map(i => `<div class="pd-linha"><span>${i.qtd}× ${esc(i.nome)}${i.fotos.length ? `<small>Fotos: ${i.fotos.map(f => esc(String(f.n).replace(/\.[^.]+$/, ''))).join(', ')}</small>` : ''}${i.texto ? `<small>Texto: “${esc(i.texto)}”</small>` : ''}</span><b>${brl(i.subtotal)}</b></div>`).join('')}
    ${o.extras && o.extras.subtotal ? `<div class="pd-linha"><span>${o.extras.qtd} ${o.extras.qtd === 1 ? 'foto extra' : 'fotos extras'}<small>${brl(o.extras.valorUnit)} cada</small></span><b>${brl(o.extras.subtotal)}</b></div>` : ''}
    <div class="pd-total"><span>Total</span><b>${brl(o.total)}</b></div>
    ${o.pagoAntes ? `<div class="pd-linha"><span>Já pago antes</span><b>− ${brl(o.pagoAntes)}</b></div><div class="pd-total"><span>A pagar</span><b>${brl(o.aPagar)}</b></div>` : ''}
    ${o.status !== 'pago' && o.status !== 'sem_valor' ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      <button class="btn btn-linha btn-sm" data-vp>${ic('refresh')} ${o.link ? 'Verificar pagamento' : 'Gerar link de pagamento'}</button>
      ${o.link ? `<button class="btn btn-linha btn-sm" data-cl="${esc(o.link)}">${ic('copy')} Copiar link de pagamento</button>` : ''}
      <button class="btn btn-ghost btn-sm" data-mp>${ic('check')} Marcar como pago</button></div>` : ''}
    ${o.status === 'pago' && (o.comprovante || o.pagoManual || o.forma) ? `<div class="dica" style="margin:10px 0 0">${o.pagoManual ? 'Marcado como pago por você.' : o.forma === 'pix' ? 'Pago no Pix.' : o.forma ? `Pago no cartão${o.parcelasPagas > 1 ? ` em ${o.parcelasPagas}x` : ''}.` : ''} ${o.comprovante ? `<a href="${esc(o.comprovante)}" target="_blank" rel="noopener">Ver comprovante</a>` : ''}</div>` : ''}</div>`;
}
