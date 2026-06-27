// ══════════════════ SST GESTÃO — SPA ROUTER ══════════════════
const API = 'https://sst-gestao-1.onrender.com';
let token = '', usuario = null, empresaAtiva = null;

function setAuth(t, u) { token = t; usuario = u; localStorage.setItem('sst_auth', JSON.stringify({ token, usuario })); }
function clearAuth() { token = ''; usuario = null; empresaAtiva = null; localStorage.clear(); }

async function api(url, opts = {}) {
  const headers = { ...opts.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + url, { ...opts, headers });
  if (res.status === 401) { clearAuth(); show('tela-login'); return null; }
  return res;
}

function show(id) { document.querySelectorAll('#tela-login,#tela-empresas,#tela-app').forEach(t => t.classList.add('hidden')); document.getElementById(id)?.classList.remove('hidden'); }

// ═══════ LOGIN ═══════
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = await fetch(API + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: document.getElementById('login-email').value, password: document.getElementById('login-senha').value }) });
  const data = await res.json();
  if (!res.ok) { document.getElementById('login-erro').textContent = data.error; return; }
  setAuth(data.token, data.user); loadEmpresas();
});

// ═══════ EMPRESAS ═══════
async function loadEmpresas() {
  const res = await api('/api/empresas'); if (!res?.ok) return;
  const emps = await res.json();
  window._empresas = emps;
  document.getElementById('user-info').textContent = `👤 ${usuario?.nome || ''}`;

  document.getElementById('empresas-grid').innerHTML = `
    <div class="empresas-layout">
      <!-- COLUNA ESQUERDA — Painel de Controle -->
      <aside class="empresas-sidebar">
        <div class="sidebar-card">
          <div class="sidebar-icon">⚙️</div>
          <h2 class="sidebar-title">Painel do Administrador</h2>
          <p class="sidebar-sub">Gerencie suas empresas</p>
          <button onclick="modalEmpresa()" class="btn-nova-empresa">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
            Nova Empresa
          </button>
        </div>
        <div class="sidebar-stats">
          <div class="stat-item">
            <span class="stat-num">${emps.length}</span>
            <span class="stat-label">Empresas</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">${emps.reduce((s,e) => s + (e.localidades?.length||0), 0)}</span>
            <span class="stat-label">Localidades</span>
          </div>
        </div>
      </aside>

      <!-- COLUNA DIREITA — Listagem -->
      <main class="empresas-main">
        <div class="empresas-main-header">
          <h2 class="empresas-main-title">Selecione uma Empresa</h2>
          <span class="empresas-main-count">${emps.length} disponíveis</span>
        </div>
        <div class="empresas-grid-cards">${emps.map(e => `
          <div class="empresa-card" onclick="selEmpresa(${e.id},'${e.nome_fantasia.replace(/'/g,"\\'")}')">
            <div class="empresa-card-body">
              <div class="empresa-card-icon">🏢</div>
              <div class="empresa-card-info">
                <h3 class="empresa-card-nome">${e.nome_fantasia}</h3>
                <p class="empresa-card-cnpj">CNPJ: ${e.cnpj}</p>
                <p class="empresa-card-locs">📍 ${e.localidades.length} localidade(s)</p>
              </div>
            </div>
            <div class="empresa-card-actions">
              <button onclick="event.stopPropagation();editarEmpresa(${e.id})" class="acao-btn acao-editar" title="Editar empresa">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                Editar
              </button>
              <button onclick="event.stopPropagation();excluirEmpresa(${e.id},'${e.nome_fantasia.replace(/'/g,"\\'")}')" class="acao-btn acao-excluir" title="Excluir empresa">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                Excluir
              </button>
            </div>
          </div>`).join('')}</div>
      </main>
    </div>`;
  show('tela-empresas');
}

function selEmpresa(id, nome) {
  empresaAtiva = { id, nome_fantasia: nome };
  localStorage.setItem('sst_empresa', JSON.stringify(empresaAtiva));
  show('tela-app'); setupNav(); telaWelcome();
}

function trocarEmpresa() { empresaAtiva = null; localStorage.removeItem('sst_empresa'); loadEmpresas(); }
async function logout() { await api('/api/logout', { method: 'POST' }).catch(()=>{}); clearAuth(); show('tela-login'); }

// ── CRUD Empresas ──
function modalEmpresa(dados = null) {
  const editando = !!dados;
  modal(editando ? 'Editar Empresa' : 'Nova Empresa', `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Nome Fantasia *</label><input id="emp-fantasia" value="${dados?.nome_fantasia||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Razão Social</label><input id="emp-razao" value="${dados?.razao_social||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">CNPJ *</label><input id="emp-cnpj" value="${dados?.cnpj||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Email</label><input id="emp-email" value="${dados?.email||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Celular</label><input id="emp-celular" value="${dados?.celular||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Tipo</label><input id="emp-tipo" value="${dados?.tipo||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div class="md:col-span-2"><label class="text-xs font-semibold text-gray-500 uppercase">Endereço</label><input id="emp-endereco" value="${dados?.endereco||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div class="md:col-span-2"><label class="text-xs font-semibold text-gray-500 uppercase">Contato</label><input id="emp-contato" value="${dados?.contato||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <input id="emp-estadual" value="${dados?.inscricao_estadual||''}" type="hidden">
      <input id="emp-municipal" value="${dados?.inscricao_municipal||''}" type="hidden">
    </div>
  `, async () => {
    const payload = {
      nome_fantasia: q('#emp-fantasia'), razao_social: q('#emp-razao'), cnpj: q('#emp-cnpj'),
      email: q('#emp-email'), celular: q('#emp-celular'), tipo: q('#emp-tipo'),
      endereco: q('#emp-endereco'), contato: q('#emp-contato'),
      inscricao_estadual: q('#emp-estadual'), inscricao_municipal: q('#emp-municipal'),
    };
    if (!payload.nome_fantasia || !payload.cnpj) { alert('Nome Fantasia e CNPJ são obrigatórios.'); return; }
    if (editando) {
      await api(`/api/empresas/${dados.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/api/empresas', { method: 'POST', body: JSON.stringify(payload) });
    }
    closeModal(); loadEmpresas();
  });
}

function editarEmpresa(id) {
  const e = window._empresas?.find(x => x.id === id);
  if (!e) return;
  modalEmpresa(e);
}

async function excluirEmpresa(id, nome) {
  if (!confirm(`Excluir "${nome}"?\n\nIsso apagará TODOS os dados: localidades, colaboradores, documentos e NRs vinculadas.\nEsta ação é irreversível.`)) return;
  await api(`/api/empresas/${id}`, { method: 'DELETE' });
  loadEmpresas();
}

// ═══════ WELCOME ═══════
function telaWelcome() {
  document.getElementById('main-content').innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mt-12 mb-10">
      <div onclick="telaMeusDados()" class="bg-white rounded-xl border p-8 text-center cursor-pointer hover:shadow-lg transition" style="border-color:#FFB81C">
        <div class="text-4xl mb-3">⚙️</div><h3 class="font-bold text-gray-800">Meus Dados</h3><p class="text-xs text-gray-400 mt-1 uppercase">VER MEUS DADOS</p></div>
      <div onclick="telaDocumentos()" class="bg-white rounded-xl border p-8 text-center cursor-pointer hover:shadow-lg transition" style="border-color:#FFB81C">
        <div class="text-4xl mb-3">📄</div><h3 class="font-bold text-gray-800">Documentos empresa</h3><p class="text-xs text-gray-400 mt-1 uppercase">VERIFICAR DOCUMENTOS</p></div>
      <div onclick="telaColaboradores()" class="bg-white rounded-xl border p-8 text-center cursor-pointer hover:shadow-lg transition" style="border-color:#FFB81C">
        <div class="text-4xl mb-3">👥</div><h3 class="font-bold text-gray-800">Colaboradores</h3><p class="text-xs text-gray-400 mt-1 uppercase">VERIFICAR COLABORADORES</p></div>
    </div>
    <!-- Sobre o Sistema -->
    <div class="max-w-2xl mx-auto bg-white rounded-xl border p-6" style="border-color:#FFB81C">
      <h3 class="font-bold text-lg mb-3" style="color:#111">ℹ️ Sobre o Sistema</h3>
      <div class="text-sm space-y-1" style="color:#475569">
        <p><strong>Nome:</strong> ERP Management System (SST)</p>
        <p><strong>Versão:</strong> 2.4.1-stable</p>
        <p><strong>Autor:</strong> Dilceu Junior</p>
        <p class="mt-2 text-xs" style="color:#64748b">O Sistema de Gerenciamento de Empresas é uma SPA nativa voltada à conformidade documental em SST, apresentando arquitetura multi-empresa com travamento de escopo e matriz de conformidade individual. O sistema automatiza o controle de Normas Regulamentadoras e documentos críticos através de 9 categorias estratégicas e um módulo de upload com alertas inteligentes (A Vencer/Vencido).</p>
      </div>
    </div>`;
}

// ═══════ MEUS DADOS ═══════
async function telaMeusDados() {
  const res = await api(`/api/empresas/${empresaAtiva.id}`); if (!res?.ok) return; const e = await res.json();
  const locs = e.localidades || [];
  document.getElementById('main-content').innerHTML = `
    <h2 class="text-xl font-bold text-gray-800 mb-4">Meus Dados — ${e.nome_fantasia}</h2>
    <form id="frm-dados" class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl bg-white rounded-xl border p-6">
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Nome fantasia</label><input id="md-fantasia" value="${e.nome_fantasia||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Razão social</label><input id="md-razao" value="${e.razao_social||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">CNPJ/CPF</label><input id="md-cnpj" value="${e.cnpj||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Inscrição estadual</label><input id="md-estadual" value="${e.inscricao_estadual||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Inscrição municipal</label><input id="md-municipal" value="${e.inscricao_municipal||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Celular*</label><input id="md-celular" value="${e.celular||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Tipo</label><input id="md-tipo" value="${e.tipo||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Email*</label><input id="md-email" value="${e.email||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Contato*</label><input id="md-contato" value="${e.contato||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>

      <!-- Localidades / Unidades -->
      <div class="localidades-section">
        <h4>📍 Localidades / Unidades</h4>
        <div class="localidade-add-row">
          <input id="loc-cidade" placeholder="Cidade" class="flex-[1.2]">
          <input id="loc-estado" placeholder="UF" maxlength="2" style="max-width:50px;text-align:center">
          <input id="loc-endereco" placeholder="Endereço completo" class="flex-[2.5]">
          <button type="button" class="btn-add-localidade" onclick="adicionarLocalidade()">+ Adicionar</button>
        </div>
        <div class="localidades-list" id="localidades-list">${renderLocalidades(locs)}</div>
      </div>

      <div class="md:col-span-2"><label class="flex items-center gap-2 text-sm mt-4"><input type="checkbox" id="lgpd-check"> Confirmo que li e aceito os termos da LGPD</label></div>
      <div class="md:col-span-2 flex gap-3 mt-2"><button type="button" onclick="telaMeusDados()" class="px-6 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button><button type="submit" class="px-6 py-2 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800">Salvar</button></div>
    </form>`;
  document.getElementById('frm-dados').addEventListener('submit', async (ev) => {
    ev.preventDefault(); if (!document.getElementById('lgpd-check').checked) { alert('Aceite LGPD'); return; }
    await api(`/api/empresas/${empresaAtiva.id}`, { method: 'PUT', body: JSON.stringify({
      nome_fantasia: q('#md-fantasia'), razao_social: q('#md-razao'), cnpj: q('#md-cnpj'), inscricao_estadual: q('#md-estadual'),
      inscricao_municipal: q('#md-municipal'), celular: q('#md-celular'), tipo: q('#md-tipo'),
      email: q('#md-email'), contato: q('#md-contato')
    })}); alert('✅ Dados salvos!');
  });
}

function renderLocalidades(locs) {
  if (!locs.length) return '<p class="text-xs text-gray-400 py-2">Nenhuma unidade cadastrada</p>';
  return locs.map(l => `
    <div class="localidade-tag">
      <div class="loc-info">
        <span class="loc-cidade">${l.cidade} - ${l.estado}</span>
        <span class="loc-endereco">${l.endereco_completo||''}</span>
      </div>
      <button type="button" class="loc-remove" onclick="removerLocalidade(${l.id})" title="Remover">×</button>
    </div>`).join('');
}

async function adicionarLocalidade() {
  const cidade = q('#loc-cidade');
  const estado = q('#loc-estado').toUpperCase();
  const endereco_completo = q('#loc-endereco');
  if (!cidade || !estado) { alert('Preencha pelo menos Cidade e UF.'); return; }
  await api(`/api/empresas/${empresaAtiva.id}/localidades`, { method: 'POST', body: JSON.stringify({ cidade, estado, endereco_completo }) });
  // Recarrega só a lista de localidades
  const res = await api(`/api/empresas/${empresaAtiva.id}/localidades`);
  const locs = res?.ok ? await res.json() : [];
  document.getElementById('localidades-list').innerHTML = renderLocalidades(locs);
  // Limpa inputs
  document.getElementById('loc-cidade').value = '';
  document.getElementById('loc-estado').value = '';
  document.getElementById('loc-endereco').value = '';
}

async function removerLocalidade(id) {
  if (!confirm('Remover esta localidade? Colaboradores vinculados ficarão sem unidade.')) return;
  await api(`/api/localidades/${id}`, { method: 'DELETE' });
  const res = await api(`/api/empresas/${empresaAtiva.id}/localidades`);
  const locs = res?.ok ? await res.json() : [];
  document.getElementById('localidades-list').innerHTML = renderLocalidades(locs);
}

function q(id) { return document.querySelector(id)?.value || ''; }

/** Download autenticado — fetch + blob + download forçado */
async function downloadAuth(url, filename) {
  try {
    const res = await fetch(API + url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error('Download falhou');
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename || 'documento.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  } catch (e) {
    alert('Erro ao baixar: ' + e.message);
  }
}

// ═══════ DOCUMENTOS ═══════
const CATS = ['LTCAT (SESMT)','PCMSO (SESMT)','PGR (SESMT)','CERTIDÃO NEGATIVA MUNICIPAL','CERTIDÃO NEGATIVA ESTADUAL','CERTIDÃO NEGATIVA FEDERAL','CERTIDÃO FGTS','CONTRATO PRESTAÇÃO DE SERVIÇO','COMPROVANTE DE SITUAÇÃO CADASTRAL'];

async function telaDocumentos() {
  const res = await api(`/api/empresas/${empresaAtiva.id}/documentos`); if (!res?.ok) return;
  window._docs = await res.json();
  const cats = CATS.map(c => { const ds = window._docs.filter(d => d.categoria === c); return { nome: c, qtd: ds.length, st: ds.length ? (ds.every(d => d.status === 'CONFORME') ? 'CONFORME' : (ds.some(d => d.status === 'VENCIDO') ? 'VENCIDO' : 'A_VENCER')) : 'NÃO ENVIADO' }; });
  document.getElementById('main-content').innerHTML = `
    <h2 class="text-xl font-bold text-gray-800 mb-4">Documentos da Empresa</h2>
    <div class="flex flex-wrap gap-2 mb-4">${cats.map(c => `<div onclick="telaDocsCat('${c.nome.replace(/'/g,"\\'")}')" class="bg-white rounded-lg border px-4 py-3 cursor-pointer hover:border-blue-500 transition text-sm font-medium">${c.nome} <span class="ml-2 px-2 py-0.5 rounded text-xs font-bold ${c.st==='VENCIDO'?'bg-red-100 text-red-700':c.st==='A_VENCER'?'bg-yellow-100 text-yellow-700':c.st==='CONFORME'?'bg-green-100 text-green-700':'bg-red-50 text-red-500'}">${c.st}</span></div>`).join('')}</div>
    <button onclick="modalDoc()" class="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-800 mb-4">+ Estampar</button>
    <div id="docs-table" class="bg-white rounded-xl border overflow-hidden"><p class="text-center text-gray-400 py-10">Selecione uma categoria acima</p></div>`;
}

function telaDocsCat(cat) {
  const ds = window._docs.filter(d => d.categoria === cat);
  document.getElementById('docs-table').innerHTML = `
    <table class="w-full text-sm"><thead><tr class="bg-gray-50 text-left text-xs uppercase text-gray-500"><th class="p-3">Nome Arquivo</th><th class="p-3">Dt Emissão</th><th class="p-3">Dt Validade</th><th class="p-3">Observação</th><th class="p-3">Status</th><th class="p-3 w-28">Ações</th></tr></thead>
      <tbody>${ds.map(d => {
        const stBadge = d.status==='VENCIDO'?'bg-red-100 text-red-800':d.status==='A_VENCER'?'bg-yellow-100 text-yellow-800':d.status==='CONFORME'?'bg-green-100 text-green-800':'bg-gray-100 text-gray-600';
        return `<tr class="border-t"><td class="p-3 font-medium">${d.nome_arquivo||'—'}</td><td class="p-3">${d.data_emissao||'—'}</td><td class="p-3">${d.data_validade||'—'}</td><td class="p-3 text-xs max-w-[200px] truncate">${d.observacao||''}</td><td class="p-3"><span class="px-2 py-1 rounded text-[10px] font-bold uppercase ${stBadge}">${d.status}</span></td>
        <td class="p-3"><div class="flex gap-1">
          <button onclick="editDoc(${d.id})" title="Editar" class="p-1.5 rounded hover:bg-blue-50 text-blue-600"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
          <button onclick="downloadAuth('/api/documentos/download/${d.id}','${(d.nome_arquivo||'documento').replace(/'/g,"\\'")}.pdf')" title="Download" class="p-1.5 rounded hover:bg-green-50 text-green-600"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
          <button onclick="delDoc(${d.id})" title="Excluir" class="p-1.5 rounded hover:bg-red-50 text-red-500"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
        </div></td></tr>`;
      }).join('') || '<tr><td colspan="6" class="text-center text-gray-400 py-6">Nenhum documento</td></tr>'}</tbody></table>`;
}

// Modal de edição de documento (com status, datas, download)
function editDoc(id) {
  const d = window._docs.find(x => x.id === id); if (!d) return;
  modal('Editar Documento', `
    <label class="text-xs font-semibold text-gray-500 uppercase">Status</label>
    <select id="edit-status" class="w-full border rounded-lg px-3 py-2 text-sm mb-3">
      <option ${d.status==='CONFORME'?'selected':''}>CONFORME</option>
      <option ${d.status==='EM ANÁLISE'?'selected':''}>EM ANÁLISE</option>
      <option ${d.status==='NÃO CONFORME'?'selected':''}>NÃO CONFORME</option>
      <option ${d.status==='VENCIDO'?'selected':''}>VENCIDO</option>
      <option ${d.status==='A_VENCER'?'selected':''}>A_VENCER</option>
    </select>
    <label class="text-xs font-semibold text-gray-500 uppercase">Data de Emissão</label><input type="date" id="edit-emissao" value="${d.data_emissao||''}" class="w-full border rounded-lg px-3 py-2 text-sm mb-3">
    <label class="text-xs font-semibold text-gray-500 uppercase">Data de Validade</label><input type="date" id="edit-validade" value="${d.data_validade||''}" class="w-full border rounded-lg px-3 py-2 text-sm mb-3">
    <label class="text-xs font-semibold text-gray-500 uppercase">Observações</label><textarea id="edit-obs" rows="3" class="w-full border rounded-lg px-3 py-2 text-sm mb-3">${d.observacao||''}</textarea>
  `, async () => {
    await api(`/api/documentos/editar/${id}`, { method: 'PUT', body: JSON.stringify({
      status: q('#edit-status'), data_emissao: q('#edit-emissao'), data_validade: q('#edit-validade'), observacao: q('#edit-obs')
    })});
    closeModal(); telaDocumentos();
  }, [
    { text: '📥 Download', cls: 'bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700', onclick: `downloadAuth('/api/documentos/download/${id}','${(d.nome_arquivo||'documento').replace(/'/g,"\\'")}.pdf')` }
  ]);
}

function modalDoc() {
  modal('Estampar Documento', `
    <label class="text-xs font-semibold text-gray-500 uppercase">Categoria</label><select id="doc-cat" class="w-full border rounded-lg px-3 py-2 text-sm mb-3">${CATS.map(c => `<option>${c}</option>`)}</select>
    <label class="text-xs font-semibold text-gray-500 uppercase">Dt Emissão</label><input type="date" id="doc-emissao" class="w-full border rounded-lg px-3 py-2 text-sm mb-3">
    <label class="text-xs font-semibold text-gray-500 uppercase">Dt Validade</label><input type="date" id="doc-validade" class="w-full border rounded-lg px-3 py-2 text-sm mb-3">
    <label class="text-xs font-semibold text-gray-500 uppercase">Observação</label><textarea id="doc-obs" rows="2" class="w-full border rounded-lg px-3 py-2 text-sm mb-3"></textarea>
    <div class="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 transition mb-3" id="doc-drop" ondragover="event.preventDefault()" ondrop="event.preventDefault();document.getElementById('doc-file').files=event.dataTransfer.files;document.getElementById('doc-fname').textContent=event.dataTransfer.files[0]?.name||''">
      <p class="text-2xl mb-1">📁</p><p class="text-sm text-gray-500">Clique ou arraste o arquivo</p><p class="text-xs text-gray-400">PDF, JPG, PNG — Máx 10MB</p>
      <input type="file" id="doc-file" accept="image/*,.pdf" class="hidden" onchange="document.getElementById('doc-fname').textContent=this.files[0]?.name||''"><p id="doc-fname" class="text-sm text-blue-600 font-medium mt-2"></p>
    </div>
  `, async () => {
    const fd = new FormData(); fd.append('categoria', q('#doc-cat')); fd.append('data_emissao', q('#doc-emissao')); fd.append('data_validade', q('#doc-validade')); fd.append('observacao', q('#doc-obs'));
    const f = document.getElementById('doc-file').files[0]; if (f) fd.append('arquivo', f);
    await api(`/api/empresas/${empresaAtiva.id}/documentos`, { method: 'POST', body: fd }); closeModal(); telaDocumentos();
  });
  document.getElementById('doc-drop').addEventListener('click', () => document.getElementById('doc-file').click());
}
async function delDoc(id) { if (confirm('Excluir?')) { await api(`/api/documentos/${id}`, { method: 'DELETE' }); telaDocumentos(); } }

// ═══════ DASHBOARD SST ═══════
let dashCharts = {};

async function telaDashboard() {
  const [resDocs, resNrs] = await Promise.all([
    api(`/api/empresas/${empresaAtiva.id}/documentos`),
    api(`/api/empresas/${empresaAtiva.id}/colaboradores`)
  ]);
  const docs = resDocs?.ok ? await resDocs.json() : [];
  const cols = resNrs?.ok ? await resNrs.json() : [];

  // Carregar NRs de todos colaboradores
  // NRs com nome do colaborador
  const todosNrs = [];
  for (const c of cols) {
    const r = await api(`/api/colaboradores/${c.id}/nrs`);
    if (r?.ok) {
      const nrs = await r.json();
      for (const n of nrs) {
        if (n.col_nr_id) todosNrs.push({ ...n, _colNome: c.nome });
      }
    }
  }

  // Combinar documentos + NRs com origem real
  const todos = [
    ...docs.map(d => ({ tipo: d.categoria, nome: d.nome_arquivo, emissao: d.data_emissao, validade: d.data_validade, status: d.status, origem: empresaAtiva.nome_fantasia })),
    ...todosNrs.map(n => ({ tipo: `NR: ${n.codigo}`, nome: n.nome_arquivo||n.codigo, emissao: n.data_emissao, validade: n.data_validade, status: n.nr_status, origem: n._colNome || 'Colaborador' }))
  ];

  // Contagens
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const d30 = new Date(hoje); d30.setDate(d30.getDate()+30);
  const d60 = new Date(hoje); d60.setDate(d60.getDate()+60);

  let vencidos = 0, avencer30 = 0, avencer60 = 0, conformes = 0;
  for (const d of todos) {
    if (!d.validade) { conformes++; continue; }
    const v = new Date(d.validade + 'T00:00:00');
    if (v < hoje) vencidos++;
    else if (v <= d30) avencer30++;
    else if (v <= d60) avencer60++;
    else conformes++;
  }

  window._dashData = todos;

  document.getElementById('main-content').innerHTML = `
    <h2 class="text-xl font-bold text-gray-800 mb-4">📊 Dashboard de Monitoramento SST</h2>
    <button onclick="exportarExcelSST()" class="mb-4 px-5 py-2.5 rounded-lg text-sm font-bold transition" style="background:#111;color:#fff">📥 Exportar para Excel</button>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div class="bg-white rounded-xl border p-5" style="border-color:#e2e8f0">
        <h3 class="text-sm font-bold text-gray-600 mb-3">📊 Status dos Documentos</h3>
        <canvas id="chart-doughnut" height="200"></canvas>
      </div>
      <div class="bg-white rounded-xl border p-5" style="border-color:#e2e8f0">
        <h3 class="text-sm font-bold text-gray-600 mb-3">📊 Distribuição por Origem</h3>
        <canvas id="chart-bar" height="200"></canvas>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div class="bg-white rounded-xl border p-4 text-center" style="border-left:4px solid #dc2626">
        <div class="text-2xl font-black" style="color:#dc2626">${vencidos}</div><div class="text-xs text-gray-500 mt-1">🔴 Vencidos</div></div>
      <div class="bg-white rounded-xl border p-4 text-center" style="border-left:4px solid #FFB81C">
        <div class="text-2xl font-black" style="color:#FFB81C">${avencer30}</div><div class="text-xs text-gray-500 mt-1">🟡 Vence em 30 dias</div></div>
      <div class="bg-white rounded-xl border p-4 text-center" style="border-left:4px solid #fbbf24">
        <div class="text-2xl font-black" style="color:#fbbf24">${avencer60}</div><div class="text-xs text-gray-500 mt-1">🟠 Vence em 60 dias</div></div>
      <div class="bg-white rounded-xl border p-4 text-center" style="border-left:4px solid #16a34a">
        <div class="text-2xl font-black" style="color:#16a34a">${conformes}</div><div class="text-xs text-gray-500 mt-1">🟢 Conformes</div></div>
    </div>

    <div class="bg-white rounded-xl border overflow-x-auto" style="border-color:#e2e8f0">
      <table class="w-full text-sm"><thead><tr><th class="p-3">Origem</th><th class="p-3">Tipo</th><th class="p-3">Documento</th><th class="p-3">Emissão</th><th class="p-3">Validade</th><th class="p-3">Status</th></tr></thead>
        <tbody>${todos.map(d => {
          const stBadge = d.status==='VENCIDO'?'bg-red-100 text-red-800':d.status==='A_VENCER'?'bg-yellow-100 text-yellow-800':d.status==='CONFORME'?'bg-green-100 text-green-800':'bg-gray-100 text-gray-600';
          return `<tr class="border-t"><td class="p-2 text-xs">${d.origem}</td><td class="p-2 text-xs">${d.tipo}</td><td class="p-2">${d.nome||'—'}</td><td class="p-2 text-xs">${d.emissao||'—'}</td><td class="p-2 text-xs">${d.validade||'—'}</td><td class="p-2"><span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${stBadge}">${d.status}</span></td></tr>`;
        }).join('')}</tbody></table>
    </div>`;

  // Chart.js — rosca (doughnut)
  setTimeout(() => {
    Object.values(dashCharts).forEach(c => c.destroy());
    dashCharts = {};

    const ctx1 = document.getElementById('chart-doughnut');
    if (ctx1) dashCharts.doughnut = new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: ['Vencidos', 'Vence 30d', 'Vence 60d', 'Conformes'],
        datasets: [{ data: [vencidos, avencer30, avencer60, conformes], backgroundColor: ['#dc2626','#FFB81C','#fbbf24','#16a34a'], borderWidth: 0 }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    const ctx2 = document.getElementById('chart-bar');
    const empresaCount = docs.length;
    const colabCount = todosNrs.length;
    if (ctx2) dashCharts.bar = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: ['Documentos Empresa', 'NRs Colaboradores'],
        datasets: [{ data: [empresaCount, colabCount], backgroundColor: ['#111111','#FFB81C'], borderRadius: 6 }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  }, 200);
}

function exportarExcelSST() {
  const data = window._dashData || [];
  const csv = '﻿Origem,Tipo,Documento,Emissão,Validade,Status\n' +
    data.map(d => `"${d.origem}","${d.tipo}","${d.nome||''}","${d.emissao||''}","${d.validade||''}","${d.status}"`).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `dashboard_sst_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

// ═══════ COLABORADORES ═══════
async function telaColaboradores() {
  const [r1, r2] = await Promise.all([api(`/api/empresas/${empresaAtiva.id}/colaboradores`), api(`/api/empresas/${empresaAtiva.id}/localidades`)]);
  if (!r1?.ok) return; window._cols = await r1.json(); window._locs = r2?.ok ? await r2.json() : [];
  document.getElementById('main-content').innerHTML = `
    <div class="flex items-center justify-between mb-4"><h2 class="text-xl font-bold text-gray-800">Colaboradores</h2><button onclick="modalCol()" class="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-800">+ Novo</button></div>
    <div class="bg-white rounded-xl border overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50 text-left text-xs uppercase text-gray-500"><th class="p-3">ID</th><th class="p-3">NOME</th><th class="p-3">Função</th><th class="p-3">Localidade</th><th class="p-3">Tipo</th><th class="p-3">Alocação</th><th class="p-3">Status</th><th class="p-3">Ações</th></tr></thead>
      <tbody>${window._cols.map(c => `<tr class="border-t"><td class="p-3">${c.id}</td><td class="p-3"><a href="#" onclick="event.preventDefault();perfilCol(${c.id})" class="text-blue-700 font-semibold hover:underline">${c.nome}</a></td><td class="p-3">${c.funcao||'-'}</td><td class="p-3 text-xs">${c.cidade||''}${c.estado?'-'+c.estado:''}</td><td class="p-3"><span class="px-2 py-0.5 rounded text-xs font-bold ${c.tipo_trabalho==='FIXO'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}">${c.tipo_trabalho}</span></td><td class="p-3 text-xs">${c.data_alocacao_inicio||'-'} → ${c.data_alocacao_fim||'-'}</td><td class="p-3"><span class="px-2 py-0.5 rounded text-xs font-bold ${c.status==='ativo'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}">${c.status==='ativo'?'ATIVO':'DESLIGADO'}</span></td><td class="p-3 relative">
        <button onclick="event.stopPropagation();this.nextElementSibling.classList.toggle('hidden')" class="text-gray-500 font-bold text-lg leading-none px-1">...</button>
        <div class="hidden absolute right-0 top-8 bg-white border rounded-lg shadow-lg z-10 w-40 py-1 text-sm">
          <a href="#" onclick="event.preventDefault();editCol(${c.id})" class="block px-4 py-2 hover:bg-gray-50">✏️ Editar</a>
          <a href="#" onclick="event.preventDefault();toggleColStatus(${c.id},'${c.status}')" class="block px-4 py-2 hover:bg-gray-50">🔛 ${c.status==='ativo'?'Desligar':'Ligar'}</a>
          <a href="#" onclick="event.preventDefault();delCol(${c.id})" class="block px-4 py-2 hover:bg-gray-50 text-red-600">🗑️ Excluir</a>
        </div></td></tr>`).join('')}</tbody></table></div>`;
}
document.addEventListener('click', () => document.querySelectorAll('.relative .hidden').forEach(m => m.classList.add('hidden')));

async function modalCol() {
  const locs = window._locs || [];
  modal('Novo Colaborador', `
    <div class="grid grid-cols-2 gap-3">
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Nome</label><input id="col-nome" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Email</label><input type="email" id="col-email" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">CPF</label><input id="col-cpf" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Data Nascimento</label><input type="date" id="col-nasc" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Função</label><input id="col-funcao" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">País</label><input id="col-nac" value="Brasileiro" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Início Alocação</label><input type="date" id="col-inicio" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Fim Alocação</label><input type="date" id="col-fim" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Localidade de Trabalho *</label><select id="col-loc" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="">Selecione a unidade...</option>${locs.map(l => `<option value="${l.id}">${l.cidade}-${l.estado}${l.endereco_completo?' — '+l.endereco_completo:''}</option>`)}</select></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Tipo Trabalho</label><div class="flex gap-4 mt-1"><label class="flex items-center gap-1 text-sm"><input type="radio" name="tipo" value="FIXO" checked> FIXO</label><label class="flex items-center gap-1 text-sm"><input type="radio" name="tipo" value="EXPORADICO"> EXPORÁDICO</label></div></div>
    </div>
  `, async () => {
    await api(`/api/empresas/${empresaAtiva.id}/colaboradores`, { method: 'POST', body: JSON.stringify({
      nome: q('#col-nome'), email: q('#col-email'), cpf: q('#col-cpf'), data_nascimento: q('#col-nasc'),
      funcao: q('#col-funcao'), nacionalidade: q('#col-nac'), data_alocacao_inicio: q('#col-inicio'),
      data_alocacao_fim: q('#col-fim'), localidade_id: parseInt(q('#col-loc')) || null,
      tipo_trabalho: document.querySelector('input[name="tipo"]:checked')?.value || 'FIXO'
    })}); closeModal(); telaColaboradores();
  });
}
async function editCol(id) {
  const c = window._cols.find(x => x.id === id); if (!c) return;
  const locs = window._locs || [];
  modal('Editar Colaborador', `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="md:col-span-2"><label class="text-xs font-semibold text-gray-500 uppercase">Nome *</label><input id="ec-nome" value="${c.nome||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Email</label><input type="email" id="ec-email" value="${c.email||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">CPF</label><input id="ec-cpf" value="${c.cpf||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Data Nascimento</label><input type="date" id="ec-nasc" value="${c.data_nascimento||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Função</label><input id="ec-funcao" value="${c.funcao||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Nacionalidade</label><input id="ec-nacionalidade" value="${c.nacionalidade||'Brasileiro'}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Localidade de Trabalho</label><select id="ec-localidade" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"><option value="">Nenhuma</option>${locs.map(l => `<option value="${l.id}" ${c.localidade_id===l.id?'selected':''}>${l.cidade}-${l.estado}${l.endereco_completo?' — '+l.endereco_completo:''}</option>`)}</select></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Tipo de Contrato</label><select id="ec-tipo" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"><option value="FIXO" ${c.tipo_trabalho==='FIXO'?'selected':''}>FIXO</option><option value="EXPORADICO" ${c.tipo_trabalho==='EXPORADICO'?'selected':''}>EXPORÁDICO</option></select></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Status</label><select id="ec-status" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"><option value="ativo" ${c.status==='ativo'?'selected':''}>ATIVO</option><option value="inativo" ${c.status==='inativo'?'selected':''}>INATIVO</option></select></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Início Alocação</label><input type="date" id="ec-inicio" value="${c.data_alocacao_inicio||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
      <div><label class="text-xs font-semibold text-gray-500 uppercase">Fim Alocação</label><input type="date" id="ec-fim" value="${c.data_alocacao_fim||''}" class="w-full border rounded-lg px-3 py-2 text-sm mt-1"></div>
    </div>
  `, async () => {
    const payload = {
      nome: q('#ec-nome'),
      email: q('#ec-email'),
      cpf: q('#ec-cpf'),
      data_nascimento: q('#ec-nasc'),
      funcao: q('#ec-funcao'),
      nacionalidade: q('#ec-nacionalidade'),
      localidade_id: parseInt(q('#ec-localidade')) || null,
      tipo_trabalho: q('#ec-tipo'),
      status: q('#ec-status'),
      data_alocacao_inicio: q('#ec-inicio'),
      data_alocacao_fim: q('#ec-fim'),
    };
    if (!payload.nome) { alert('Nome é obrigatório.'); return; }
    await api(`/api/colaboradores/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    closeModal(); telaColaboradores();
  }, [], 'Salvar Alterações');
}
async function toggleColStatus(id, st) { await api(`/api/colaboradores/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: st === 'ativo' ? 'inativo' : 'ativo' }) }); telaColaboradores(); }
async function delCol(id) { if (confirm('Excluir?')) { await api(`/api/colaboradores/${id}`, { method: 'DELETE' }); telaColaboradores(); } }

// ═══════ PERFIL COLABORADOR (16 NRs) ═══════
async function perfilCol(colId) {
  window._lastColId = colId;
  const cols = window._cols || [];
  const col = cols.find(x => x.id === colId);
  if (!col) { alert('Não encontrado'); return; }

  const res = await api(`/api/colaboradores/${colId}/nrs`);
  const nrs = res?.ok ? await res.json() : [];

  document.getElementById('main-content').innerHTML = `
    <button onclick="telaColaboradores()" class="text-blue-700 hover:underline text-sm mb-4 inline-block">← Voltar</button>
    <h2 class="text-xl font-bold text-gray-800">Perfil: ${col.nome}</h2>
    <p class="text-sm text-gray-500 mb-4">${empresaAtiva.nome_fantasia} · ${col.funcao||''} · ${col.cidade||''}-${col.estado||''} · ${col.tipo_trabalho||''}</p>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">${nrs.map(n => {
      const enviado = !!n.col_nr_id;
      const st = enviado ? (n.nr_status === 'VENCIDO' ? 'VENCIDO' : 'ENVIADO') : 'NÃO ENVIADO';
      const badgeCls = enviado
        ? (n.nr_status === 'VENCIDO' ? 'bg-red-100 text-red-800' : n.nr_status === 'A_VENCER' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800')
        : 'bg-gray-100 text-gray-600';
      return `<div class="bg-white rounded-lg border p-4 flex flex-col items-center text-center hover:shadow-md transition min-h-[170px]">
        <svg class="w-7 h-7 text-blue-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        <span class="text-xs font-semibold text-gray-700 uppercase leading-tight mb-auto">${n.descricao||n.codigo} (${n.codigo})</span>
        <span class="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide mt-2 ${badgeCls}">${st}</span>
        ${enviado ? `<div class="flex gap-1 mt-2">
          <button onclick="event.stopPropagation();editNR(${n.col_nr_id})" title="Editar" class="p-1 rounded hover:bg-blue-50 text-blue-600"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
          <button onclick="downloadAuth('/${n.certificado_url||'#'}','${(n.nome_arquivo||'certificado').replace(/'/g,"\\'")}.pdf')" title="Download" class="p-1 rounded hover:bg-green-50 text-green-600"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
          <button onclick="event.stopPropagation();delNR(${n.col_nr_id})" title="Excluir" class="p-1 rounded hover:bg-red-50 text-red-500"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
        </div><div class="text-[10px] text-gray-400 mt-1">${n.data_validade||''}</div>` : `<button onclick="uploadNR(${colId},${n.id})" class="mt-2 text-xs text-blue-600 hover:underline">+ Adicionar</button>`}
      </div>`;
    }).join('')}</div>`;
}

function editNR(colNrId) {
  // Buscar dados atuais do colaborador_nr e abrir modal de edição
  modal('Editar Certificado', `
    <label class="text-xs font-semibold text-gray-500 uppercase">Status</label>
    <select id="edit-nr-status" class="w-full border rounded-lg px-3 py-2 text-sm mb-3">
      <option>CONFORME</option><option>EM ANÁLISE</option><option>NÃO CONFORME</option><option>VENCIDO</option><option>A_VENCER</option>
    </select>
    <label class="text-xs font-semibold text-gray-500 uppercase">Data de Emissão</label><input type="date" id="edit-nr-emissao" class="w-full border rounded-lg px-3 py-2 text-sm mb-3">
    <label class="text-xs font-semibold text-gray-500 uppercase">Data de Validade</label><input type="date" id="edit-nr-validade" class="w-full border rounded-lg px-3 py-2 text-sm mb-3">
    <label class="text-xs font-semibold text-gray-500 uppercase">Observações</label><textarea id="edit-nr-obs" rows="2" class="w-full border rounded-lg px-3 py-2 text-sm mb-3"></textarea>
  `, async () => {
    await api(`/api/colaboradores/nrs/${colNrId}`, { method: 'PUT', body: JSON.stringify({
      data_emissao: q('#edit-nr-emissao'), data_validade: q('#edit-nr-validade')
    })});
    closeModal();
    // Recarregar perfil se estiver aberto
    const el = document.querySelector('#main-content h2');
    if (el?.textContent?.startsWith('Perfil:')) {
      const res = await api(`/api/colaboradores/nrs/${colNrId}`); // nao temos endpoint pra buscar col pelo nr_id, so recarrega
    }
  });
}
async function delNR(id) { if (confirm('Excluir este certificado?')) { await api(`/api/colaboradores/nrs/${id}`, { method: 'DELETE' }); perfilCol(window._lastColId); } }

function uploadNR(colId, nrId) {
  window._lastColId = colId;
  modal('Carregar Documento', `
    <div class="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 transition mb-3" id="nr-drop" ondragover="event.preventDefault()" ondrop="event.preventDefault();document.getElementById('nr-file').files=event.dataTransfer.files;document.getElementById('nr-fname').textContent=event.dataTransfer.files[0]?.name||''">
      <p class="text-2xl mb-1">📁</p><p class="text-sm text-gray-500">Clique ou arraste o arquivo</p><p class="text-xs text-gray-400">PDF, JPG, PNG — Máx 10MB</p>
      <input type="file" id="nr-file" accept="image/*,.pdf" class="hidden" onchange="document.getElementById('nr-fname').textContent=this.files[0]?.name||''"><p id="nr-fname" class="text-sm text-blue-600 font-medium mt-2"></p>
    </div>
    <label class="text-xs font-semibold text-gray-500 uppercase">Dt Emissão</label><input type="date" id="nr-emissao" class="w-full border rounded-lg px-3 py-2 text-sm mb-3">
    <label class="text-xs font-semibold text-gray-500 uppercase">Dt Validade</label><input type="date" id="nr-validade" class="w-full border rounded-lg px-3 py-2 text-sm mb-3">
  `, async () => {
    const fd = new FormData(); fd.append('nr_id', String(nrId));
    fd.append('data_emissao', q('#nr-emissao')); fd.append('data_validade', q('#nr-validade'));
    const f = document.getElementById('nr-file').files[0]; if (f) fd.append('certificado', f);
    await api(`/api/colaboradores/${colId}/nrs`, { method: 'POST', body: fd });
    closeModal(); perfilCol(colId);
  });
  document.getElementById('nr-drop').addEventListener('click', () => document.getElementById('nr-file').click());
}

// ═══════ MODAL GENÉRICO ═══════
function modal(title, html, onSave, extraBtns = [], saveLabel = 'Estampar') {
  closeModal();
  const ov = document.createElement('div'); ov.id = 'modal-overlay'; ov.className = 'fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50';
  const extraHTML = extraBtns.map(b => b.href ? `<a href="${b.href}" target="_blank" class="${b.cls}">${b.text}</a>` : `<button onclick="${b.onclick||''}" class="${b.cls}">${b.text}</button>`).join('');
  ov.innerHTML = `<div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"><div class="px-6 py-4 border-b flex items-center justify-between"><h3 class="font-bold text-lg">${title}</h3><button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button></div><div class="p-6">${html}</div><div class="px-6 py-4 border-t flex gap-3 justify-between"><div>${extraHTML}</div><div class="flex gap-3"><button onclick="closeModal()" class="px-5 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button><button id="modal-save" class="px-5 py-2 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800">${saveLabel}</button></div></div></div>`;
  document.body.appendChild(ov);
  const btn = ov.querySelector('#modal-save');
  btn.addEventListener('click', async () => { btn.disabled = true; btn.textContent = 'Salvando...'; try { await onSave(); } catch (e) { console.error(e); alert('Erro: ' + e.message); } btn.disabled = false; btn.textContent = saveLabel; });
  ov.addEventListener('click', (e) => { if (e.target === ov) closeModal(); });
}
function closeModal() { document.getElementById('modal-overlay')?.remove(); }

// ═══════ NAV ═══════
function setupNav() {
  document.querySelectorAll('#app-nav a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('#app-nav a').forEach(x => { x.className = 'px-3 py-1.5 rounded-lg'; x.style.cssText = 'color:#94a3b8'; });
      a.className = 'px-3 py-1.5 rounded-lg'; a.style.cssText = 'background:#FFB81C;color:#111';
      const m = { welcome: telaWelcome, documentos: telaDocumentos, colaboradores: telaColaboradores, dashboard: telaDashboard, 'meus-dados': telaMeusDados };
      m[a.dataset.tela]?.();
    });
  });
}

// ═══════ INIT ═══════
const saved = localStorage.getItem('sst_auth');
if (saved) {
  const p = JSON.parse(saved); token = p.token; usuario = p.usuario;
  const emp = localStorage.getItem('sst_empresa');
  if (emp) { empresaAtiva = JSON.parse(emp); show('tela-app'); setupNav(); telaWelcome(); }
  else { loadEmpresas(); }
} else { show('tela-login'); }
