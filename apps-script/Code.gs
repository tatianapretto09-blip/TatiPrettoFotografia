/**
 * TATI PRETTO FOTOGRAFIA — Programa das galerias (Google Apps Script)
 *
 * Este programa roda na sua conta Google e é o "cérebro" do site:
 *  - guarda as galerias, os PINs e as escolhas dos clientes;
 *  - monta as galerias automaticamente a partir das pastas do seu Drive;
 *  - transfere as fotos prontas para o Drive do cliente (arquivos originais,
 *    sem perda de qualidade) e libera o seu espaço.
 *
 * ANTES DE TUDO: troque a senha do painel na linha abaixo.
 */
const SENHA_PAINEL = 'TROQUE-AQUI';

const NOME_ESTUDIO = 'Tati Pretto Fotografia';
const SITE_URL = 'https://tati-pretto-fotografia-platforma.vercel.app';
const NOME_PASTA_RAIZ = 'Tati Pretto • Galerias';
const NOME_PASTA_SELECAO = '1 • Seleção (fotos com marca d\'água)';
const NOME_PASTA_ENTREGA = '2 • Entregas (fotos prontas)';
const NOME_PASTA_EDITAR = '3 • Escolhidas para editar';
const NOME_PASTA_MUSICAS = '4 • Músicas dos sites';
const NOME_PASTA_CATALOGO = '5 • Catálogo de produtos';

/* ============================================================
 * 1) RODE ESTA FUNÇÃO UMA VEZ (botão ▶ Executar, com "configurar"
 *    selecionado). Ela pede as permissões, cria as pastas no seu
 *    Drive e liga a montagem automática das galerias.
 * ============================================================ */
function configurar() {
  const raiz = pastaRaiz_();
  pastaSelecao_();
  pastaEntrega_();
  arquivoDados_();
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'verificarNovasPastas')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('verificarNovasPastas').timeBased().everyMinutes(15).create();
  Logger.log('Tudo pronto! Suas pastas estão em: ' + raiz.getUrl());
}

/* ===================== Web app ===================== */

function doGet() {
  return json_({ ok: true, app: 'tati-galerias', versao: 1 });
}

function doPost(e) {
  let pedido;
  try {
    pedido = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, erro: 'Pedido inválido.' });
  }
  try {
    const acao = ACOES[pedido.acao];
    if (!acao) throw new Error('Ação desconhecida.');
    return json_(Object.assign({ ok: true }, acao(pedido) || {}));
  } catch (err) {
    return json_({ ok: false, erro: String((err && err.message) || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

const ACOES = {
  // ---- cliente ----
  abrir: req => { const db = carregar_(); return { galeria: visaoCliente_(galeriaCliente_(req, db), req.pessoa, db) }; },
  verificarPagamento: req => {
    const g = galeriaCliente_(req);
    if (!(g.pessoas || {})[req.pessoa]) throw new Error('Cadastro não encontrado.');
    return { pessoa: visaoPessoa_(consultarPagamento_(g.slug, req.pessoa)) };
  },
  entrarPessoa: req => entrarPessoa_(req),
  salvarEscolha: req => salvarEscolha_(req, false),
  finalizarEscolha: req => salvarEscolha_(req, true),
  enviarParaDrive: req => enviarParaDrive_(req),

  // ---- painel ----
  painelEntrar: req => {
    admin_(req);
    return {
      email: Session.getEffectiveUser().getEmail(),
      pastaSelecao: pastaSelecao_().getUrl(),
      pastaEntrega: pastaEntrega_().getUrl()
    };
  },
  painelListar: req => {
    admin_(req);
    const db = carregar_();
    const lista = Object.keys(db.galerias).map(k => resumo_(db.galerias[k]));
    lista.sort((a, b) => (b.atualizadaEm || 0) - (a.atualizadaEm || 0));
    return { galerias: lista };
  },
  painelAbrir: req => {
    admin_(req);
    return { galeria: completa_(galeriaPorSlug_(carregar_(), req.slug)) };
  },
  painelCriar: req => {
    admin_(req);
    return { galeria: completa_(criarGaleria_(req)) };
  },
  painelSalvar: req => {
    admin_(req);
    return { galeria: completa_(comTrava_(db => aplicarEdicao_(galeriaPorSlug_(db, req.slug), req.dados || {}))) };
  },
  painelAtualizarFotos: req => {
    admin_(req);
    return { galeria: completa_(comTrava_(db => sincronizar_(galeriaPorSlug_(db, req.slug)))) };
  },
  painelNovaPasta: req => {
    admin_(req);
    const nome = limpar_(req.nome, 80);
    if (!nome) throw new Error('Dê um nome para a pasta.');
    return { galeria: completa_(comTrava_(db => {
      const g = galeriaPorSlug_(db, req.slug);
      if (g.congelada) throw new Error('As fotos desta galeria já estão no Drive do cliente.');
      const nova = DriveApp.getFolderById(g.pastaId).createFolder(nome);
      g.pastas.push({ id: nova.getId(), nome: nome, frase: '', oculta: false, fotos: [] });
      g.atualizadaEm = Date.now();
      return g;
    })) };
  },
  painelReabrirEscolha: req => {
    admin_(req);
    return { galeria: completa_(comTrava_(db => {
      const g = galeriaPorSlug_(db, req.slug);
      const p = (g.pessoas || {})[req.pessoa];
      if (!p) throw new Error('Cadastro não encontrado.');
      p.finalizadaEm = null;
      g.atualizadaEm = Date.now();
      return g;
    })) };
  },
  painelArquivosEscolhidos: req => {
    admin_(req);
    const g = galeriaPorSlug_(carregar_(), req.slug);
    return { arquivos: arquivosEscolhidos_(g, req.pessoa), temPastaOriginais: !!g.pastaOriginais };
  },
  painelPastaEscolhidas: req => {
    admin_(req);
    return pastaEscolhidas_(galeriaPorSlug_(carregar_(), req.slug), req.pessoa);
  },
  painelEnviarMusica: req => {
    admin_(req);
    galeriaPorSlug_(carregar_(), req.slug);
    const tipo = String(req.tipo || '');
    const nome = limpar_(req.nome, 120) || 'musica.mp3';
    if (!/^audio\//.test(tipo) && !/\.(mp3|m4a)$/i.test(nome)) throw new Error('Envie um arquivo de música (MP3).');
    const bytes = Utilities.base64Decode(String(req.dados || ''));
    if (!bytes.length) throw new Error('O arquivo chegou vazio.');
    if (bytes.length > 20 * 1024 * 1024) throw new Error('A música precisa ter até 20 MB.');
    const arq = pastaMusicas_().createFile(Utilities.newBlob(bytes, /^audio\//.test(tipo) ? tipo : 'audio/mpeg', req.slug + ' • ' + nome));
    arq.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { url: 'https://drive.google.com/file/d/' + arq.getId() + '/view', nome: nome };
  },
  painelCatalogo: req => {
    admin_(req);
    return { catalogo: catalogo_(carregar_()), mpConfigurado: !!mpToken_() };
  },
  painelSalvarCatalogo: req => {
    admin_(req);
    if (req.removerToken) PropertiesService.getScriptProperties().deleteProperty('MP_ACCESS_TOKEN');
    const token = String(req.mpToken || '').trim();
    if (token) {
      if (!/^(APP_USR|TEST)-[\w-]{20,}$/.test(token)) throw new Error('Esse não parece um Access Token do Mercado Pago. Ele começa com APP_USR-.');
      const r = UrlFetchApp.fetch('https://api.mercadopago.com/users/me', { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
      if (r.getResponseCode() !== 200) throw new Error('O Mercado Pago recusou esse Access Token. Confira se copiou o de produção, inteiro.');
      PropertiesService.getScriptProperties().setProperty('MP_ACCESS_TOKEN', token);
    }
    const cat = comTrava_(db => {
      const atual = catalogo_(db);
      const c = req.catalogo || {};
      const antigos = {};
      atual.produtos.forEach(x => { antigos[x.id] = x; });
      if (Array.isArray(c.produtos)) {
        if (c.produtos.length > 80) throw new Error('O catálogo pode ter até 80 produtos.');
        atual.produtos = c.produtos.map(x => limparProduto_(x, antigos));
      }
      if ('parcelas' in c) atual.parcelas = Math.max(1, Math.min(12, Math.floor(Number(c.parcelas) || 1)));
      if ('valorExtraPadrao' in c) atual.valorExtraPadrao = Math.max(0, Math.min(100000, numeroBR_(c.valorExtraPadrao)));
      return atual;
    });
    return { catalogo: cat, mpConfigurado: !!mpToken_() };
  },
  painelEnviarImagem: req => {
    admin_(req);
    const tipo = String(req.tipo || '');
    if (!/^image\/(jpeg|png|webp|gif)$/.test(tipo)) throw new Error('Envie uma imagem JPG, PNG ou WEBP.');
    const bytes = Utilities.base64Decode(String(req.dados || ''));
    if (!bytes.length) throw new Error('A imagem chegou vazia.');
    if (bytes.length > 8 * 1024 * 1024) throw new Error('A imagem precisa ter até 8 MB.');
    const arq = pastaCatalogo_().createFile(Utilities.newBlob(bytes, tipo, limpar_(req.nome, 120) || 'produto.jpg'));
    arq.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { id: arq.getId() };
  },
  painelVerificarPagamento: req => {
    admin_(req);
    consultarPagamento_(req.slug, req.pessoa);
    return { galeria: completa_(galeriaPorSlug_(carregar_(), req.slug)) };
  },
  painelExcluirPessoa: req => {
    admin_(req);
    return { galeria: completa_(comTrava_(db => {
      const g = galeriaPorSlug_(db, req.slug);
      if (!(g.pessoas || {})[req.pessoa]) throw new Error('Cadastro não encontrado.');
      delete g.pessoas[req.pessoa];
      g.atualizadaEm = Date.now();
      return g;
    })) };
  },
  painelExcluir: req => {
    admin_(req);
    comTrava_(db => { galeriaPorSlug_(db, req.slug); delete db.galerias[req.slug]; });
    return {};
  },
  painelVerificarTransferencia: req => {
    admin_(req);
    return { galeria: completa_(verificarAceite_(req.slug)) };
  },
  painelLiberarEspaco: req => {
    admin_(req);
    return liberarEspaco_(req.slug);
  }
};

/* ===================== Pastas e dados ===================== */

function pastaPorPropriedade_(chave, criar) {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(chave);
  if (id) {
    try {
      const f = DriveApp.getFolderById(id);
      if (!f.isTrashed()) return f;
    } catch (e) { /* pasta apagada: cria de novo */ }
  }
  const nova = criar();
  props.setProperty(chave, nova.getId());
  return nova;
}

function pastaRaiz_() {
  return pastaPorPropriedade_('PASTA_RAIZ', () => DriveApp.createFolder(NOME_PASTA_RAIZ));
}
function pastaSelecao_() {
  return pastaPorPropriedade_('PASTA_SELECAO', () => pastaRaiz_().createFolder(NOME_PASTA_SELECAO));
}
function pastaCatalogo_() {
  return pastaPorPropriedade_('PASTA_CATALOGO', () => pastaRaiz_().createFolder(NOME_PASTA_CATALOGO));
}
function pastaMusicas_() {
  return pastaPorPropriedade_('PASTA_MUSICAS', () => pastaRaiz_().createFolder(NOME_PASTA_MUSICAS));
}
function pastaEditar_() {
  return pastaPorPropriedade_('PASTA_EDITAR', () => pastaRaiz_().createFolder(NOME_PASTA_EDITAR));
}
function pastaEntrega_() {
  return pastaPorPropriedade_('PASTA_ENTREGA', () => pastaRaiz_().createFolder(NOME_PASTA_ENTREGA));
}

function arquivoDados_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('ARQUIVO_DADOS');
  if (id) {
    try {
      const f = DriveApp.getFileById(id);
      if (!f.isTrashed()) return f;
    } catch (e) { /* recria abaixo */ }
  }
  const f = pastaRaiz_().createFile('dados-das-galerias (não apagar).json', JSON.stringify({ galerias: {} }), 'application/json');
  props.setProperty('ARQUIVO_DADOS', f.getId());
  return f;
}

function carregar_() {
  const texto = arquivoDados_().getBlob().getDataAsString();
  const db = texto ? JSON.parse(texto) : {};
  db.galerias = db.galerias || {};
  return db;
}

function comTrava_(fn) {
  const trava = LockService.getScriptLock();
  trava.waitLock(25000);
  try {
    const db = carregar_();
    const resultado = fn(db);
    arquivoDados_().setContent(JSON.stringify(db));
    return resultado;
  } finally {
    trava.releaseLock();
  }
}

/* ===================== Segurança ===================== */

function admin_(req) {
  if (SENHA_PAINEL === 'TROQUE-AQUI') {
    throw new Error('Troque a senha do painel na primeira linha do programa no Google Apps Script.');
  }
  const cache = CacheService.getScriptCache();
  const tentativas = Number(cache.get('tentativas_painel') || 0);
  if (tentativas >= 8) throw new Error('Muitas tentativas. Aguarde 15 minutos.');
  if (String(req.senha || '') !== SENHA_PAINEL) {
    cache.put('tentativas_painel', String(tentativas + 1), 900);
    throw new Error('Senha incorreta.');
  }
}

function galeriaCliente_(req, dbJa) {
  const db = dbJa || carregar_();
  const g = db.galerias[String(req.slug || '')];
  if (!g || g.ativa === false) throw new Error('Galeria não encontrada. Confira o link que você recebeu.');
  const cache = CacheService.getScriptCache();
  const chave = 'tentativas_' + g.slug;
  const tentativas = Number(cache.get(chave) || 0);
  if (tentativas >= 8) throw new Error('Muitas tentativas. Aguarde 15 minutos e tente de novo.');
  if (String(req.pin || '').trim() !== String(g.pin)) {
    cache.put(chave, String(tentativas + 1), 900);
    throw new Error('Senha incorreta.');
  }
  return g;
}

function galeriaPorSlug_(db, slug) {
  const g = db.galerias[String(slug || '')];
  if (!g) throw new Error('Galeria não encontrada.');
  return g;
}

/* ===================== Drive (API REST) ===================== */

function pedidoDrive_(metodo, caminho, corpo, consulta) {
  const p = {
    url: 'https://www.googleapis.com/drive/v3/' + caminho + (consulta ? '?' + consulta : ''),
    method: metodo,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  };
  if (corpo) {
    p.contentType = 'application/json';
    p.payload = JSON.stringify(corpo);
  }
  return p;
}

function drive_(metodo, caminho, corpo, consulta) {
  const r = UrlFetchApp.fetchAll([pedidoDrive_(metodo, caminho, corpo, consulta)])[0];
  const texto = r.getContentText();
  if (r.getResponseCode() >= 300) throw new Error('Google Drive respondeu: ' + texto.slice(0, 200));
  return texto ? JSON.parse(texto) : {};
}

function listarFilhos_(pastaId) {
  const itens = [];
  let pagina = '';
  do {
    const consulta = 'q=' + encodeURIComponent("'" + pastaId + "' in parents and trashed=false") +
      '&orderBy=name_natural&pageSize=1000' +
      '&fields=' + encodeURIComponent('nextPageToken,files(id,name,mimeType,size,imageMediaMetadata(width,height,rotation))') +
      (pagina ? '&pageToken=' + encodeURIComponent(pagina) : '');
    const r = drive_('get', 'files', null, consulta);
    (r.files || []).forEach(f => itens.push(f));
    pagina = r.nextPageToken || '';
  } while (pagina);
  return itens;
}

const TIPO_PASTA = 'application/vnd.google-apps.folder';
function ehFoto_(f) { return /^image\//.test(f.mimeType); }
function foto_(f) {
  const m = f.imageMediaMetadata || {};
  let w = m.width || 3, h = m.height || 2;
  if (m.rotation === 1 || m.rotation === 3) { const t = w; w = h; h = t; }
  return { id: f.id, n: f.name, w: w, h: h, t: Number(f.size || 0) };
}

function idDaPasta_(texto) {
  const s = String(texto || '').trim();
  if (!s) return '';
  const m = s.match(/folders\/([\w-]{10,})/) || s.match(/[?&]id=([\w-]{10,})/) || s.match(/^([\w-]{10,})$/);
  if (!m) throw new Error('Não reconheci o link da pasta do Drive.');
  return m[1];
}

/* ===================== Galerias ===================== */

function criarSlug_(nome, db) {
  const base = String(nome || 'galeria').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'galeria';
  let slug;
  do {
    slug = base + '-' + Math.random().toString(36).slice(2, 6);
  } while (db.galerias[slug]);
  return slug;
}

function pinAleatorio_() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function limpar_(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max || 300);
}

function criarGaleria_(req) {
  const tipo = req.tipo === 'entrega' ? 'entrega' : 'selecao';
  const cliente = limpar_(req.cliente, 80);
  if (!cliente) throw new Error('Informe o nome do cliente.');
  let pastaId = idDaPasta_(req.pasta);
  if (!pastaId) {
    const mae = tipo === 'entrega' ? pastaEntrega_() : pastaSelecao_();
    pastaId = mae.createFolder(cliente).getId();
  }
  return comTrava_(db => {
    const g = novaGaleria_(db, tipo, cliente, pastaId, req);
    sincronizar_(g);
    db.galerias[g.slug] = g;
    return g;
  });
}

function novaGaleria_(db, tipo, cliente, pastaId, opcoes) {
  opcoes = opcoes || {};
  const agora = Date.now();
  return {
    slug: criarSlug_(cliente, db),
    tipo: tipo,
    cliente: cliente,
    titulo: cliente,
    subtitulo: limpar_(opcoes.subtitulo, 120),
    frase: tipo === 'entrega'
      ? 'Cada detalhe deste dia guardado com carinho, para vocês reviverem sempre que quiserem.'
      : 'Escolha suas fotos favoritas com calma. Se quiser, deixe um comentário em cada uma.',
    pin: /^\d{4,8}$/.test(String(opcoes.pin || '')) ? String(opcoes.pin) : pinAleatorio_(),
    pastaId: pastaId,
    pastas: [],
    ativa: true,
    criadaEm: agora,
    atualizadaEm: agora,
    sincronizadaEm: 0,
    // seleção
    limite: Math.max(0, Number(opcoes.limite || 0)),
    marca: limpar_(opcoes.marca, 40) || NOME_ESTUDIO,
    pessoas: {},
    // entrega
    capa: '',
    capaPosicao: 'center',
    musica: '',
    emailDrive: limpar_(opcoes.emailDrive, 120).toLowerCase(),
    transferencia: { estado: 'nenhuma', email: '', feitos: 0, total: 0, aceitos: 0, falhas: 0 },
    congelada: false
  };
}

/** Lê as fotos da pasta do Drive e atualiza a galeria (mantém nomes e ordem que você editou). */
function sincronizar_(g) {
  if (g.congelada) return g;
  const raiz = DriveApp.getFolderById(g.pastaId);
  try {
    raiz.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) { /* algumas contas não permitem; as fotos continuam visíveis para você */ }

  const filhos = listarFilhos_(g.pastaId);
  const subpastas = filhos.filter(f => f.mimeType === TIPO_PASTA);
  const soltas = filhos.filter(ehFoto_).map(foto_);
  const lidas = [];
  if (soltas.length) lidas.push({ id: g.pastaId, nome: subpastas.length ? 'Destaques' : 'Fotos', fotos: soltas });
  subpastas.forEach(s => {
    lidas.push({ id: s.id, nome: s.name, fotos: listarFilhos_(s.id).filter(ehFoto_).map(foto_) });
  });

  const antigas = {};
  (g.pastas || []).forEach((p, i) => { antigas[p.id] = Object.assign({ ordem: i }, p); });
  const novas = lidas.map((p, i) => {
    const a = antigas[p.id];
    return {
      id: p.id,
      nome: a ? a.nome : p.nome,
      frase: a ? (a.frase || '') : '',
      oculta: a ? !!a.oculta : false,
      fotos: p.fotos,
      ordem: a ? a.ordem : 1000 + i
    };
  });
  novas.sort((a, b) => a.ordem - b.ordem);
  g.pastas = novas.map(p => ({ id: p.id, nome: p.nome, frase: p.frase, oculta: p.oculta, fotos: p.fotos }));

  const todas = todasFotos_(g);
  if (!g.capa || !todas.some(f => f.id === g.capa)) g.capa = todas.length ? todas[0].id : '';
  const existe = {};
  todas.forEach(f => { existe[f.id] = true; });
  Object.keys(g.pessoas || {}).forEach(pid => {
    const fotos = g.pessoas[pid].fotos || {};
    Object.keys(fotos).forEach(id => { if (!existe[id]) delete fotos[id]; });
  });
  g.sincronizadaEm = Date.now();
  g.atualizadaEm = Date.now();
  return g;
}

function todasFotos_(g) {
  const lista = [];
  (g.pastas || []).forEach(p => p.fotos.forEach(f => lista.push(f)));
  return lista;
}

function aplicarEdicao_(g, d) {
  const textos = { cliente: 80, titulo: 120, subtitulo: 120, frase: 600, marca: 40, musica: 500, musicaNome: 120,
    carta: 3000, cartaTitulo: 80, cartaAssinatura: 80, textoFim: 160 };
  Object.keys(textos).forEach(k => { if (k in d) g[k] = limpar_(d[k], textos[k]); });
  if ('pin' in d) {
    const pin = String(d.pin || '').trim();
    if (!/^\d{4,8}$/.test(pin)) throw new Error('O PIN precisa ter de 4 a 8 números.');
    g.pin = pin;
  }
  if ('limite' in d) g.limite = Math.max(0, Math.floor(Number(d.limite) || 0));
  if ('pastaOriginais' in d) {
    const id = idDaPasta_(d.pastaOriginais);
    if (id) {
      try { DriveApp.getFolderById(id).getName(); } catch (e) { throw new Error('Não consegui abrir a pasta dos originais. Confira o link.'); }
    }
    g.pastaOriginais = id;
  }
  if ('ativa' in d) g.ativa = !!d.ativa;
  if ('lojaAtiva' in d) g.lojaAtiva = !!d.lojaAtiva;
  if ('valorExtra' in d) g.valorExtra = String(d.valorExtra == null ? '' : d.valorExtra).trim() === '' ? null : Math.max(0, Math.min(100000, numeroBR_(d.valorExtra)));
  if ('cartaLetra' in d) g.cartaLetra = d.cartaLetra === 'manuscrita' ? 'manuscrita' : 'classica';
  if ('cartaPosicao' in d) g.cartaPosicao = d.cartaPosicao === 'fim' ? 'fim' : 'inicio';
  if ('musicaInicio' in d) g.musicaInicio = Math.max(0, Math.min(900, Math.floor(Number(d.musicaInicio) || 0)));
  if ('capaPosicao' in d && ['top', 'center', 'bottom'].indexOf(d.capaPosicao) >= 0) g.capaPosicao = d.capaPosicao;
  if ('capa' in d && todasFotos_(g).some(f => f.id === d.capa)) g.capa = d.capa;
  if ('emailDrive' in d) {
    const email = limpar_(d.emailDrive, 120).toLowerCase();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('E-mail do Drive inválido.');
    if (g.transferencia.estado !== 'nenhuma' && email !== g.emailDrive) {
      throw new Error('A transferência já começou; o e-mail não pode mais ser trocado.');
    }
    g.emailDrive = email;
  }
  if (Array.isArray(d.pastas)) {
    const atuais = {};
    g.pastas.forEach(p => { atuais[p.id] = p; });
    const reordenadas = [];
    d.pastas.forEach(p => {
      const a = atuais[p.id];
      if (!a) return;
      a.nome = limpar_(p.nome, 80) || a.nome;
      if ('frase' in p) a.frase = limpar_(p.frase, 300);
      a.oculta = !!p.oculta;
      reordenadas.push(a);
      delete atuais[p.id];
    });
    Object.keys(atuais).forEach(id => reordenadas.push(atuais[id]));
    g.pastas = reordenadas;
  }
  g.atualizadaEm = Date.now();
  return g;
}

/* ---- o que o cliente recebe ---- */
function visaoPessoa_(p) {
  if (!p) return null;
  const v = { id: p.id, nome: p.nome, fotos: p.fotos || {}, finalizadaEm: p.finalizadaEm || null, carrinho: p.carrinho || [] };
  if (p.pedido) {
    const o = p.pedido;
    v.pedido = { itens: o.itens, extras: o.extras, total: o.total, pagoAntes: o.pagoAntes, aPagar: o.aPagar,
      status: o.status, link: o.link || '', parcelas: o.parcelas || 1, criadoEm: o.criadoEm, pagoEm: o.pagoEm || null };
  }
  return v;
}

function visaoCliente_(g, pessoaId, db) {
  const base = {
    slug: g.slug, tipo: g.tipo, cliente: g.cliente, titulo: g.titulo,
    subtitulo: g.subtitulo, frase: g.frase, estudio: NOME_ESTUDIO
  };
  if (g.tipo === 'selecao') {
    return Object.assign(base, {
      fotos: todasFotos_(g).map(f => ({ id: f.id, n: f.n, w: f.w, h: f.h })),
      limite: g.limite, marca: g.marca,
      loja: visaoLoja_(g, db || carregar_()),
      pessoa: visaoPessoa_((g.pessoas || {})[pessoaId])
    });
  }
  return Object.assign(base, {
    pastas: g.pastas.filter(p => !p.oculta && p.fotos.length).map(p => ({
      id: p.id, nome: p.nome, frase: p.frase || '', fotos: p.fotos.map(f => ({ id: f.id, n: f.n, w: f.w, h: f.h }))
    })),
    capa: g.capa, capaPosicao: g.capaPosicao, musica: g.musica, musicaInicio: g.musicaInicio || 0,
    carta: g.carta || '', cartaTitulo: g.cartaTitulo || '', cartaAssinatura: g.cartaAssinatura || '',
    cartaLetra: g.cartaLetra || 'classica', cartaPosicao: g.cartaPosicao || 'inicio', textoFim: g.textoFim || '',
    emailDrive: g.emailDrive,
    transferencia: {
      estado: g.transferencia.estado, email: g.transferencia.email,
      feitos: g.transferencia.feitos, total: g.transferencia.total
    }
  });
}

/* ---- o que o painel recebe ---- */
function completa_(g) {
  return Object.assign({}, g, {
    link: SITE_URL + '/?g=' + encodeURIComponent(g.slug),
    pastaUrl: 'https://drive.google.com/drive/folders/' + g.pastaId
  });
}

function resumo_(g) {
  const fotos = todasFotos_(g);
  return {
    slug: g.slug, tipo: g.tipo, cliente: g.cliente, titulo: g.titulo, pin: g.pin, ativa: g.ativa !== false,
    capa: g.capa || (fotos[0] && fotos[0].id) || '',
    totalFotos: fotos.length,
    pessoas: Object.keys(g.pessoas || {}).length,
    finalizadas: Object.keys(g.pessoas || {}).filter(k => g.pessoas[k].finalizadaEm).length,
    escolhidas: Object.keys(g.pessoas || {}).reduce((s, k) => s + Object.keys(g.pessoas[k].fotos || {}).length, 0),
    limite: g.limite,
    transferencia: g.transferencia ? g.transferencia.estado : 'nenhuma',
    atualizadaEm: g.atualizadaEm,
    link: SITE_URL + '/?g=' + encodeURIComponent(g.slug)
  };
}

/* ===================== Seleção ===================== */

/** A própria pessoa se cadastra (nome + WhatsApp). Mesmo WhatsApp = mesmo cadastro, em qualquer aparelho. */
function entrarPessoa_(req) {
  const nome = limpar_(req.nome, 60);
  const whats = String(req.whats || '').replace(/\D/g, '').slice(0, 15);
  const email = limpar_(req.email, 120).toLowerCase();
  if (nome.length < 2) throw new Error('Digite seu nome.');
  if (whats.length < 10) throw new Error('Digite seu WhatsApp com DDD.');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('E-mail inválido.');
  const pessoa = comTrava_(db => {
    const g = galeriaCliente_(req);
    const real = db.galerias[g.slug];
    if (real.tipo !== 'selecao') throw new Error('Esta galeria não é de seleção.');
    real.pessoas = real.pessoas || {};
    let p = Object.keys(real.pessoas).map(k => real.pessoas[k]).filter(x => x.whats === whats)[0];
    if (!p) {
      if (Object.keys(real.pessoas).length >= 50) throw new Error('Esta galeria já tem o máximo de cadastros.');
      let id;
      do { id = Math.random().toString(36).slice(2, 12); } while (real.pessoas[id]);
      p = { id: id, nome: nome, whats: whats, email: email, fotos: {}, finalizadaEm: null, criadaEm: Date.now() };
      real.pessoas[id] = p;
    } else {
      p.nome = nome;
      if (email) p.email = email;
    }
    real.atualizadaEm = Date.now();
    return p;
  });
  return { pessoa: visaoPessoa_(pessoa) };
}

function salvarEscolha_(req, finalizar) {
  const resultado = comTrava_(db => {
    const g = galeriaCliente_(req);
    const real = db.galerias[g.slug];
    if (real.tipo !== 'selecao') throw new Error('Esta galeria não é de seleção.');
    const p = (real.pessoas || {})[req.pessoa];
    if (!p) throw new Error('Faça seu cadastro de novo, por favor.');
    if (p.finalizadaEm) throw new Error('Sua escolha já foi enviada. Fale com a Tati se quiser mudar algo.');
    const validas = {};
    todasFotos_(real).forEach(f => { validas[f.id] = true; });
    const fotos = {};
    const enviadas = req.fotos || {};
    Object.keys(enviadas).forEach(id => {
      if (validas[id]) fotos[id] = limpar_(enviadas[id], 500);
    });
    if (finalizar && !Object.keys(fotos).length) throw new Error('Escolha pelo menos uma foto antes de enviar.');
    p.fotos = fotos;
    if ('carrinho' in req || finalizar) p.carrinho = carrinhoValido_(Array.isArray(req.carrinho) ? req.carrinho : (p.carrinho || []), fotos, catalogo_(db), finalizar);
    p.atualizadaEm = Date.now();
    if (finalizar) {
      p.finalizadaEm = Date.now();
      p.pedido = calcularPedido_(real, p, catalogo_(db));
    }
    real.atualizadaEm = Date.now();
    return { g: real, p: p, parcelas: catalogo_(db).parcelas };
  });
  let p = resultado.p;
  if (finalizar) {
    if (p.pedido.status === 'aguardando') p = criarPagamento_(resultado.g, p, resultado.parcelas);
    avisarEscolhaFinalizada_(resultado.g, p);
  }
  return { pessoa: visaoPessoa_(p) };
}

function avisarEscolhaFinalizada_(g, p) {
  try {
    const nomes = {};
    todasFotos_(g).forEach(f => { nomes[f.id] = f.n; });
    const ids = Object.keys(p.fotos);
    const linhas = ids.map(id => '• ' + nomes[id] + (p.fotos[id] ? '  —  "' + p.fotos[id] + '"' : ''));
    const corpo = p.nome + ' (WhatsApp ' + p.whats + ') finalizou a escolha na galeria ' + g.cliente + ': ' +
      ids.length + ' foto(s)' + (g.limite ? ' (pacote: ' + g.limite + ')' : '') + '.\n\n' + linhas.join('\n') +
      '\n\nNomes dos arquivos para colar no Lightroom:\n' + ids.map(id => String(nomes[id]).replace(/\.[^.]+$/, '')).join(', ') +
      textoPedido_(p.pedido) +
      '\n\nVer no painel: ' + SITE_URL + '/?painel';
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Escolha finalizada • ' + p.nome + ' • ' + g.cliente, corpo);
  } catch (e) { /* o aviso por e-mail é opcional */ }
}

/* ===================== Originais das fotos escolhidas ===================== */

function nomeBase_(n) {
  return String(n || '').replace(/\.[^.]+$/, '').trim().toLowerCase();
}

/**
 * Lista os arquivos para baixar de quem escolheu (ou de todos).
 * Se a galeria tiver uma "pasta dos originais", procura cada foto lá pelo nome
 * (IMG_1234.jpg da seleção encontra IMG_1234.jpg, IMG_1234.CR3, IMG_1234.tif...).
 * Sem essa pasta, o original é o próprio arquivo que está na seleção.
 */
function arquivosEscolhidos_(g, pessoaId) {
  const todasPessoas = g.pessoas || {};
  let pessoas;
  if (pessoaId) {
    if (!todasPessoas[pessoaId]) throw new Error('Cadastro não encontrado.');
    pessoas = [todasPessoas[pessoaId]];
  } else {
    pessoas = Object.keys(todasPessoas).map(k => todasPessoas[k]);
  }
  const quem = {};
  pessoas.forEach(p => Object.keys(p.fotos || {}).forEach(id => {
    (quem[id] = quem[id] || []).push({ nome: p.nome, comentario: p.fotos[id] || '' });
  }));
  let mapa = null;
  if (g.pastaOriginais) {
    mapa = {};
    const add = f => {
      if (f.mimeType === TIPO_PASTA) return;
      const k = nomeBase_(f.name);
      (mapa[k] = mapa[k] || []).push({ id: f.id, n: f.name, t: Number(f.size || 0) });
    };
    listarFilhos_(g.pastaOriginais).forEach(f => {
      if (f.mimeType === TIPO_PASTA) listarFilhos_(f.id).forEach(add); else add(f);
    });
  }
  return todasFotos_(g).filter(f => quem[f.id]).map(f => ({
    id: f.id, n: f.n, quem: quem[f.id],
    originais: mapa ? (mapa[nomeBase_(f.n)] || []) : [{ id: f.id, n: f.n, t: f.t || 0 }]
  }));
}

/** Copia os originais escolhidos para uma pasta nova em "3 • Escolhidas para editar". */
function pastaEscolhidas_(g, pessoaId) {
  const inicio = Date.now();
  const arquivos = arquivosEscolhidos_(g, pessoaId);
  if (!arquivos.length) throw new Error('Ainda não há fotos escolhidas.');
  const quem = pessoaId ? g.pessoas[pessoaId].nome : 'todos';
  const data = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy HH.mm');
  const pasta = pastaEditar_().createFolder(g.cliente + ' • ' + quem + ' • ' + data);
  let copiados = 0, faltando = 0, parou = false;
  arquivos.forEach(a => {
    if (!a.originais.length) { faltando++; return; }
    a.originais.forEach(o => {
      if (parou) return;
      if (Date.now() - inicio > 300000) { parou = true; return; }
      DriveApp.getFileById(o.id).makeCopy(o.n, pasta);
      copiados++;
    });
  });
  return { url: pasta.getUrl(), copiados: copiados, faltando: faltando, incompleto: parou };
}

/* ===================== Envio para o Drive do cliente ===================== */

function itensParaTransferir_(g) {
  const ids = [g.pastaId];
  g.pastas.forEach(p => { if (ids.indexOf(p.id) < 0) ids.push(p.id); });
  todasFotos_(g).forEach(f => ids.push(f.id));
  return ids;
}

/**
 * O cliente pede para receber as fotos no Drive dele.
 * Usamos a "transferência de propriedade" do Google: os arquivos originais
 * passam a ser do cliente (mesma qualidade, mesmo arquivo), contam no espaço
 * dele e o site continua mostrando as fotos.
 * Cada chamada processa um lote; o site chama de novo até terminar.
 */
function enviarParaDrive_(req) {
  const g0 = galeriaCliente_(req);
  if (g0.tipo !== 'entrega') throw new Error('O envio para o Drive é só para galerias de fotos prontas.');

  const preparada = comTrava_(db => {
    const g = db.galerias[g0.slug];
    const t = g.transferencia;
    if (t.estado === 'nenhuma') {
      const email = (g.emailDrive || limpar_(req.email, 120)).toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Informe um e-mail válido do Google Drive.');
      if (email === Session.getEffectiveUser().getEmail().toLowerCase()) throw new Error('Use o e-mail do cliente, não o da fotógrafa.');
      g.transferencia = { estado: 'enviando', email: email, feitos: 0, total: itensParaTransferir_(g).length, aceitos: 0, falhas: 0, inicioEm: Date.now() };
    }
    return g;
  });

  const t = preparada.transferencia;
  if (t.estado !== 'enviando') return { transferencia: publicaTransf_(t) };

  const itens = itensParaTransferir_(preparada);
  const lote = itens.slice(t.feitos, t.feitos + 40);
  let falhas = 0;

  if (lote.length) {
    // 1) qualquer pessoa com o link continua vendo (o site depende disso)
    // 2) o cliente vira editor  3) o cliente vira "proprietário pendente"
    const leitura = lote.map(id => pedidoDrive_('post', 'files/' + id + '/permissions', { type: 'anyone', role: 'reader' }));
    const editor = lote.map(id => pedidoDrive_('post', 'files/' + id + '/permissions',
      { type: 'user', role: 'writer', emailAddress: t.email }, 'sendNotificationEmail=false&fields=id'));
    const r1 = UrlFetchApp.fetchAll(leitura.concat(editor));
    const respostasEditor = r1.slice(lote.length);

    const primeira = respostasEditor[0];
    if (primeira && primeira.getResponseCode() >= 300 && t.feitos === 0) {
      const msg = primeira.getContentText();
      comTrava_(db => { const g = db.galerias[g0.slug]; g.transferencia.estado = 'nenhuma'; g.transferencia.email = ''; });
      if (/invalidSharingRequest|notFound|no Google account|not a Google/i.test(msg)) {
        throw new Error('Esse e-mail não tem uma conta Google. Use um Gmail ou um e-mail ligado ao Google Drive.');
      }
      throw new Error('O Google não aceitou o envio agora. Tente de novo em alguns minutos.');
    }

    const pendentes = [];
    respostasEditor.forEach((r, i) => {
      if (r.getResponseCode() >= 300) { falhas++; return; }
      const permId = JSON.parse(r.getContentText()).id;
      pendentes.push(pedidoDrive_('patch', 'files/' + lote[i] + '/permissions/' + permId, { role: 'writer', pendingOwner: true }));
    });
    UrlFetchApp.fetchAll(pendentes).forEach(r => { if (r.getResponseCode() >= 300) falhas++; });
  }

  const final = comTrava_(db => {
    const g = db.galerias[g0.slug];
    const tt = g.transferencia;
    tt.feitos = Math.min(tt.total, tt.feitos + lote.length);
    tt.falhas = (tt.falhas || 0) + falhas;
    if (tt.feitos >= tt.total) { tt.estado = 'aguardando_aceite'; tt.enviadaEm = Date.now(); }
    g.atualizadaEm = Date.now();
    return g;
  });

  if (final.transferencia.estado === 'aguardando_aceite' && t.estado === 'enviando') avisarTransferencia_(final);
  return { transferencia: publicaTransf_(final.transferencia) };
}

function publicaTransf_(t) {
  return { estado: t.estado, email: t.email, feitos: t.feitos, total: t.total };
}

function avisarTransferencia_(g) {
  const t = g.transferencia;
  try {
    MailApp.sendEmail(t.email, 'Suas fotos estão chegando no seu Google Drive • ' + NOME_ESTUDIO,
      'Olá, ' + g.cliente + '!\n\n' +
      'Suas fotos em alta resolução (os arquivos originais, sem perda de qualidade) foram enviadas para o seu Google Drive.\n\n' +
      'Para elas ficarem guardadas com você, falta só aceitar:\n' +
      '1. Abra o Google Drive no computador: https://drive.google.com\n' +
      '2. Na busca, digite:  pendingowner:me  e aperte Enter\n' +
      '3. Selecione tudo (Ctrl+A ou Cmd+A), clique em Compartilhar e depois em "Aceitar a propriedade".\n\n' +
      'Você também pode receber avisos do próprio Google pedindo para aceitar — é a mesma coisa.\n' +
      'Depois de aceitar, as fotos passam a ocupar o seu espaço no Drive e continuam aparecendo no seu site:\n' +
      SITE_URL + '/?g=' + encodeURIComponent(g.slug) + '\n\nCom carinho,\n' + NOME_ESTUDIO);
  } catch (e) { /* segue mesmo sem o e-mail */ }
  try {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Fotos enviadas ao Drive do cliente • ' + g.cliente,
      g.cliente + ' pediu as fotos no Drive (' + t.email + '). ' + t.total + ' itens enviados' +
      (t.falhas ? ', ' + t.falhas + ' com erro' : '') + '.\n' +
      'Quando o cliente aceitar, use "Verificar aceite" e depois "Remover do meu Drive" no painel:\n' + SITE_URL + '/?painel');
  } catch (e) { /* opcional */ }
}

/** Confere quantos arquivos o cliente já aceitou (deixaram de ser seus). */
function verificarAceite_(slug) {
  const g0 = galeriaPorSlug_(carregar_(), slug);
  if (g0.transferencia.estado === 'nenhuma') throw new Error('O cliente ainda não pediu as fotos no Drive.');
  if (g0.transferencia.estado === 'liberada') return g0;
  const itens = itensParaTransferir_(g0);
  let aceitos = 0, bytes = 0;
  for (let i = 0; i < itens.length; i += 80) {
    const pedidos = itens.slice(i, i + 80).map(id => pedidoDrive_('get', 'files/' + id, null, 'fields=ownedByMe,size'));
    UrlFetchApp.fetchAll(pedidos).forEach(r => {
      if (r.getResponseCode() >= 300) return;
      const f = JSON.parse(r.getContentText());
      if (f.ownedByMe === false) { aceitos++; bytes += Number(f.size || 0); }
    });
  }
  return comTrava_(db => {
    const g = db.galerias[slug];
    g.transferencia.aceitos = aceitos;
    g.transferencia.bytesAceitos = bytes;
    g.transferencia.verificadaEm = Date.now();
    if (aceitos >= itens.length && g.transferencia.estado === 'aguardando_aceite') g.transferencia.estado = 'aceita';
    return g;
  });
}

/** Tira do seu Drive os arquivos que o cliente já aceitou. O site continua funcionando. */
function liberarEspaco_(slug) {
  const g = verificarAceite_(slug);
  const eu = drive_('get', 'about', null, 'fields=user(permissionId)').user.permissionId;
  const itens = itensParaTransferir_(g);
  let removidos = 0, aindaSeus = 0;
  for (let i = 0; i < itens.length; i += 80) {
    const parte = itens.slice(i, i + 80);
    const info = UrlFetchApp.fetchAll(parte.map(id => pedidoDrive_('get', 'files/' + id, null, 'fields=ownedByMe')));
    const remover = [];
    info.forEach((r, k) => {
      if (r.getResponseCode() >= 300) return;
      if (JSON.parse(r.getContentText()).ownedByMe === false) {
        remover.push(pedidoDrive_('delete', 'files/' + parte[k] + '/permissions/' + eu));
      } else {
        aindaSeus++;
      }
    });
    UrlFetchApp.fetchAll(remover).forEach(r => { if (r.getResponseCode() < 300) removidos++; });
  }
  const atualizada = comTrava_(db => {
    const x = db.galerias[slug];
    if (removidos && !aindaSeus) {
      x.transferencia.estado = 'liberada';
      x.congelada = true;
    }
    x.transferencia.liberadaEm = Date.now();
    x.atualizadaEm = Date.now();
    return x;
  });
  return { galeria: completa_(atualizada), removidos: removidos, aindaSeus: aindaSeus };
}

/* ===================== Montagem automática ===================== */

/**
 * Roda sozinho a cada 15 minutos (ligado pelo "configurar").
 * - Pasta nova dentro de "1 • Seleção" ou "2 • Entregas" vira galeria automaticamente.
 * - Fotos novas nas pastas das galerias aparecem no site.
 * Você recebe um e-mail com o link e o PIN de cada galeria nova.
 */
function verificarNovasPastas() {
  const db = carregar_();
  const conhecidas = {};
  Object.keys(db.galerias).forEach(k => { conhecidas[db.galerias[k].pastaId] = true; });

  const novas = [];
  [['selecao', pastaSelecao_()], ['entrega', pastaEntrega_()]].forEach(par => {
    const it = par[1].getFolders();
    while (it.hasNext()) {
      const pasta = it.next();
      if (conhecidas[pasta.getId()]) continue;
      // espera 10 minutos sem mudanças para não montar no meio do envio das fotos
      if (Date.now() - pasta.getLastUpdated().getTime() < 10 * 60 * 1000) continue;
      novas.push({ tipo: par[0], pasta: pasta });
    }
  });

  const criadas = [];
  novas.forEach(n => {
    try {
      const g = comTrava_(dbx => {
        const nova = novaGaleria_(dbx, n.tipo, n.pasta.getName(), n.pasta.getId(), {});
        sincronizar_(nova);
        if (!todasFotos_(nova).length) return null; // ainda vazia
        dbx.galerias[nova.slug] = nova;
        return nova;
      });
      if (g) criadas.push(g);
    } catch (e) { /* tenta de novo na próxima rodada */ }
  });

  // atualiza fotos das galerias ativas (no máximo 1 vez por hora cada)
  Object.keys(db.galerias).forEach(slug => {
    const g = db.galerias[slug];
    if (g.congelada || g.ativa === false) return;
    if (Date.now() - (g.sincronizadaEm || 0) < 60 * 60 * 1000) return;
    try { comTrava_(dbx => sincronizar_(galeriaPorSlug_(dbx, slug))); } catch (e) { /* ignora */ }
  });

  try { verificarPagamentosPendentes_(); } catch (e) { /* ignora */ }

  if (criadas.length) {
    const texto = criadas.map(g => (g.tipo === 'entrega' ? 'Fotos prontas' : 'Seleção') + ' • ' + g.cliente +
      '\nLink: ' + SITE_URL + '/?g=' + encodeURIComponent(g.slug) + '\nPIN: ' + g.pin).join('\n\n');
    try {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(),
        criadas.length === 1 ? 'Galeria montada • ' + criadas[0].cliente : criadas.length + ' galerias montadas',
        'Montei automaticamente a partir das pastas do seu Drive:\n\n' + texto +
        '\n\nPara mudar frase, capa, música ou pastas: ' + SITE_URL + '/?painel');
    } catch (e) { /* opcional */ }
  }
}


/* ===================== Catálogo de produtos e pagamento (Mercado Pago) ===================== */

function catalogo_(db) {
  db.catalogo = db.catalogo || {};
  const c = db.catalogo;
  c.produtos = Array.isArray(c.produtos) ? c.produtos : [];
  if (c.parcelas == null) c.parcelas = 12;
  if (c.valorExtraPadrao == null) c.valorExtraPadrao = 0;
  return c;
}

/** Aceita 149,90 • 149.90 • 1.249,90 • R$ 50 */
function numeroBR_(v) {
  if (typeof v === 'number') return isFinite(v) ? Math.round(v * 100) / 100 : 0;
  let t = String(v == null ? '' : v).replace(/[^\d,.-]/g, '');
  if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function brl_(v) {
  const n = (Math.round(Number(v || 0) * 100) / 100).toFixed(2).split('.');
  return 'R$ ' + n[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + n[1];
}

function limparProduto_(x, antigos) {
  let id = String(x.id || '');
  if (!antigos[id]) id = 'p' + Math.random().toString(36).slice(2, 10);
  const nome = limpar_(x.nome, 80);
  if (!nome) throw new Error('Todo produto precisa de um nome.');
  const imagem = String(x.imagem || '');
  return {
    id: id, nome: nome, descricao: limpar_(x.descricao, 400),
    preco: Math.max(0, Math.min(100000, numeroBR_(x.preco))),
    fotos: Math.max(0, Math.min(200, Math.floor(Number(x.fotos) || 0))),
    pedeTexto: !!x.pedeTexto, dicaTexto: limpar_(x.dicaTexto, 120),
    imagem: /^[\w-]{10,}$/.test(imagem) ? imagem : '',
    ativo: x.ativo !== false
  };
}

function valorExtra_(g, cat) {
  return g.valorExtra == null ? Number(cat.valorExtraPadrao || 0) : Number(g.valorExtra || 0);
}

function visaoLoja_(g, db) {
  const cat = catalogo_(db);
  if (g.lojaAtiva === false) return null;
  const produtos = cat.produtos.filter(x => x.ativo).map(x => ({
    id: x.id, nome: x.nome, descricao: x.descricao, preco: x.preco, fotos: x.fotos,
    pedeTexto: x.pedeTexto, dicaTexto: x.dicaTexto, imagem: x.imagem
  }));
  const extra = valorExtra_(g, cat);
  if (!produtos.length && !(extra > 0 && g.limite)) return null;
  return { produtos: produtos, valorExtra: extra, parcelas: cat.parcelas, pagamentoOnline: !!mpToken_() };
}

/** Confere o carrinho que veio do site: só produtos que existem, só fotos que a pessoa escolheu. */
function carrinhoValido_(lista, fotosEscolhidas, cat, rigoroso) {
  const prods = {};
  cat.produtos.forEach(x => { prods[x.id] = x; });
  const saida = [];
  lista.slice(0, 30).forEach(it => {
    const prod = prods[String(it && it.produto || '')];
    if (!prod || !prod.ativo) return;
    const vistas = {};
    const fotos = (Array.isArray(it.fotos) ? it.fotos : []).map(String)
      .filter(id => fotosEscolhidas[id] !== undefined && !vistas[id] && (vistas[id] = true))
      .slice(0, prod.fotos);
    if (rigoroso && prod.fotos > 0 && !fotos.length) throw new Error('Escolha a foto para o produto "' + prod.nome + '".');
    saida.push({
      id: limpar_(it.id, 20) || Math.random().toString(36).slice(2, 10),
      produto: prod.id, fotos: fotos,
      texto: prod.pedeTexto ? limpar_(it.texto, 300) : '',
      qtd: Math.max(1, Math.min(99, Math.floor(Number(it.qtd) || 1)))
    });
  });
  return saida;
}

function calcularPedido_(g, p, cat) {
  const prods = {};
  cat.produtos.forEach(x => { prods[x.id] = x; });
  const nomes = {};
  todasFotos_(g).forEach(f => { nomes[f.id] = f.n; });
  const itens = (p.carrinho || []).filter(it => prods[it.produto]).map(it => {
    const prod = prods[it.produto];
    return {
      produto: prod.id, nome: prod.nome, preco: prod.preco, qtd: it.qtd,
      subtotal: Math.round(prod.preco * it.qtd * 100) / 100,
      fotos: it.fotos.map(id => ({ id: id, n: nomes[id] || id })), texto: it.texto
    };
  });
  const n = Object.keys(p.fotos || {}).length;
  const qtdExtra = g.limite ? Math.max(0, n - g.limite) : 0;
  const unit = valorExtra_(g, cat);
  const extras = { qtd: qtdExtra, valorUnit: unit, subtotal: Math.round(qtdExtra * unit * 100) / 100 };
  const total = Math.round((itens.reduce((s, i) => s + i.subtotal, 0) + extras.subtotal) * 100) / 100;
  const pagoAntes = Math.round(Number(p.pagoTotal || 0) * 100) / 100;
  const aPagar = Math.max(0, Math.round((total - pagoAntes) * 100) / 100);
  let status = 'sem_valor';
  if (aPagar > 0) status = mpToken_() ? 'aguardando' : 'sem_link';
  else if (total > 0) status = 'pago';
  return {
    itens: itens, extras: extras, total: total, pagoAntes: pagoAntes, aPagar: aPagar, status: status,
    ref: g.slug + '|' + p.id + '|' + Date.now(), link: '', parcelas: cat.parcelas, criadoEm: Date.now(), pagoEm: null
  };
}

function textoPedido_(o) {
  if (!o || (!o.itens.length && !o.extras.qtd)) return '';
  const linhas = o.itens.map(i => '• ' + i.qtd + 'x ' + i.nome + ' — ' + brl_(i.subtotal) +
    (i.fotos.length ? '\n    fotos: ' + i.fotos.map(f => String(f.n).replace(/\.[^.]+$/, '')).join(', ') : '') +
    (i.texto ? '\n    texto: "' + i.texto + '"' : ''));
  if (o.extras.qtd) linhas.push('• ' + o.extras.qtd + ' foto(s) além do pacote — ' + brl_(o.extras.subtotal));
  const st = { aguardando: 'aguardando pagamento (link do Mercado Pago enviado ao cliente)', sem_link: 'sem link de pagamento — configure o Mercado Pago no painel',
    erro_link: 'não consegui gerar o link do Mercado Pago', pago: 'pago', processando: 'pagamento em análise', sem_valor: '' }[o.status] || o.status;
  return '\n\nPEDIDO\n' + linhas.join('\n') + '\nTotal: ' + brl_(o.total) +
    (o.pagoAntes ? '\nJá pago antes: ' + brl_(o.pagoAntes) + '\nA pagar agora: ' + brl_(o.aPagar) : '') + (st ? '\nSituação: ' + st : '');
}

function mpToken_() {
  return PropertiesService.getScriptProperties().getProperty('MP_ACCESS_TOKEN') || '';
}

/** Cria o link de pagamento (Checkout Pro): Pix ou cartão parcelado. */
function criarPagamento_(g, p, parcelas) {
  const o = p.pedido;
  let link = '', status = 'erro_link';
  try {
    const corpo = {
      items: [{
        id: 'pedido', title: (NOME_ESTUDIO + ' • ' + g.cliente).slice(0, 250), quantity: 1, currency_id: 'BRL', unit_price: o.aPagar,
        description: o.itens.map(i => i.qtd + 'x ' + i.nome).concat(o.extras.qtd ? [o.extras.qtd + ' foto(s) extra(s)'] : []).join(', ').slice(0, 250)
      }],
      payer: Object.assign({ name: p.nome }, p.email ? { email: p.email } : {}),
      external_reference: o.ref,
      back_urls: {
        success: SITE_URL + '/?g=' + encodeURIComponent(g.slug) + '&pagamento=1',
        pending: SITE_URL + '/?g=' + encodeURIComponent(g.slug) + '&pagamento=1',
        failure: SITE_URL + '/?g=' + encodeURIComponent(g.slug) + '&pagamento=0'
      },
      auto_return: 'approved',
      payment_methods: { installments: Math.max(1, Math.min(12, parcelas || 1)), excluded_payment_types: [{ id: 'ticket' }] },
      statement_descriptor: 'TATIPRETTO'
    };
    const r = UrlFetchApp.fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + mpToken_() }, payload: JSON.stringify(corpo)
    });
    if (r.getResponseCode() < 300) {
      const j = JSON.parse(r.getContentText());
      link = j.init_point || '';
      if (link) status = 'aguardando';
    }
  } catch (e) { /* fica erro_link; a Tati pode gerar de novo pelo painel */ }
  return comTrava_(db => {
    const real = galeriaPorSlug_(db, g.slug);
    const pp = real.pessoas[p.id];
    if (pp && pp.pedido && pp.pedido.ref === o.ref) { pp.pedido.link = link; pp.pedido.status = status; }
    return pp || p;
  });
}

/** Pergunta ao Mercado Pago se o pedido foi pago. */
function consultarPagamento_(slug, pessoaId) {
  const db = carregar_();
  const g = galeriaPorSlug_(db, slug);
  const p = (g.pessoas || {})[pessoaId];
  if (!p) throw new Error('Cadastro não encontrado.');
  const o = p.pedido;
  if (!o || ['aguardando', 'processando', 'erro_link', 'sem_link'].indexOf(o.status) < 0) return p;
  if (!mpToken_()) return p;
  if (o.status === 'erro_link' || o.status === 'sem_link') {
    o.status = 'aguardando';
    comTrava_(dbx => { const x = galeriaPorSlug_(dbx, slug).pessoas[pessoaId]; if (x && x.pedido && x.pedido.ref === o.ref) x.pedido.status = 'aguardando'; });
    return criarPagamento_(g, p, catalogo_(db).parcelas);
  }
  const r = UrlFetchApp.fetch('https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&external_reference=' + encodeURIComponent(o.ref), {
    headers: { Authorization: 'Bearer ' + mpToken_() }, muteHttpExceptions: true
  });
  if (r.getResponseCode() !== 200) return p;
  const res = (JSON.parse(r.getContentText()).results || []);
  let novo = o.status;
  if (res.some(x => x.status === 'approved')) novo = 'pago';
  else if (res.some(x => x.status === 'in_process' || x.status === 'pending' || x.status === 'authorized')) novo = 'processando';
  if (novo === o.status) return p;
  const atual = comTrava_(dbx => {
    const x = galeriaPorSlug_(dbx, slug).pessoas[pessoaId];
    if (!x || !x.pedido || x.pedido.ref !== o.ref || x.pedido.status === 'pago') return x;
    x.pedido.status = novo;
    if (novo === 'pago') { x.pedido.pagoEm = Date.now(); x.pagoTotal = Math.round((Number(x.pagoTotal || 0) + x.pedido.aPagar) * 100) / 100; }
    return x;
  });
  if (novo === 'pago') {
    try {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Pagamento confirmado • ' + p.nome + ' • ' + g.cliente,
        p.nome + ' pagou ' + brl_(o.aPagar) + ' pelo Mercado Pago (galeria ' + g.cliente + ').' + textoPedido_(atual.pedido) +
        '\n\nVer no painel: ' + SITE_URL + '/?painel');
    } catch (e) { /* opcional */ }
  }
  return atual;
}

/** Roda junto com a verificação automática: confere pedidos esperando pagamento (até 7 dias). */
function verificarPagamentosPendentes_() {
  if (!mpToken_()) return;
  const db = carregar_();
  let feitos = 0;
  Object.keys(db.galerias).forEach(slug => {
    const g = db.galerias[slug];
    Object.keys(g.pessoas || {}).forEach(pid => {
      const o = g.pessoas[pid].pedido;
      if (feitos >= 25 || !o || (o.status !== 'aguardando' && o.status !== 'processando') || !o.link) return;
      if (Date.now() - o.criadoEm > 7 * 24 * 3600 * 1000) return;
      feitos++;
      try { consultarPagamento_(slug, pid); } catch (e) { /* ignora */ }
    });
  });
}
