/**
 * migrar_para_nuvem.js
 * Le os dados do SQLite local e faz upload para a API do Render.
 *
 * Uso:  node migrar_para_nuvem.js
 *
 * Requer:  npm install node-fetch@2  (ou usa fetch nativo no Node 18+)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ═══════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════
const API_BASE = 'https://sst-gestao-1.onrender.com';
const EMAIL = 'admin@empresa.com';
const SENHA = '123456';
const DB_LOCAL = 'database.db';
// ═══════════════════════════════════════════════

const db = new Database(DB_LOCAL, { readonly: true });

let token = '';

// ── Helpers ──────────────────────────────────
async function api(method, url, body = null) {
  const headers = { Authorization: `Bearer ${token}` };
  const opts = { method, headers };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(API_BASE + url, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${method} ${url} → ${res.status}: ${err}`);
  }
  return res.json();
}

function log(msg) { console.log(`  ${msg}`); }

// ── Main ─────────────────────────────────────
(async () => {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Migração Local → Render (SST-Gestão)   ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // 1. Login
  console.log('[1/5] Autenticando...');
  const authRes = await fetch(API_BASE + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: SENHA }),
  });
  if (!authRes.ok) {
    console.error('ERRO: Login falhou. O backend está no ar? As credenciais estão certas?');
    process.exit(1);
  }
  const auth = await authRes.json();
  token = auth.token;
  log(`Logado como: ${auth.user.nome} (${auth.user.email})`);

  // 2. Ler dados locais
  console.log('\n[2/5] Lendo banco local...');
  const empresas = db.prepare('SELECT * FROM empresas ORDER BY id').all();
  const localidades = db.prepare('SELECT * FROM localidades ORDER BY id').all();
  const colaboradores = db.prepare('SELECT * FROM colaboradores ORDER BY id').all();
  const documentos = db.prepare('SELECT * FROM documentos ORDER BY id').all();

  console.log(`  ${empresas.length} empresas`);
  console.log(`  ${localidades.length} localidades`);
  console.log(`  ${colaboradores.length} colaboradores`);
  console.log(`  ${documentos.length} documentos\n`);

  // 3. Migrar empresas
  console.log('[3/5] Enviando empresas...');
  const empresaMap = {}; // oldId → newId
  for (const e of empresas) {
    const { id, criado_em, ...payload } = e; // remove campos auto-gerados
    const nova = await api('POST', '/api/empresas', payload);
    empresaMap[id] = nova.id;
    log(`${e.nome_fantasia} → ID ${nova.id}`);
  }

  // 4. Migrar localidades
  console.log('\n[4/5] Enviando localidades...');
  const locMap = {}; // oldId → newId
  for (const l of localidades) {
    const { id, empresa_id, criado_em, ...payload } = l;
    const novoEmpresaId = empresaMap[empresa_id];
    if (!novoEmpresaId) { log(`PULADO localidade #${id} (empresa ${empresa_id} sem correspondencia)`); continue; }
    const nova = await api('POST', `/api/empresas/${novoEmpresaId}/localidades`, payload);
    locMap[id] = nova.id;
    log(`${l.cidade}-${l.estado} → ID ${nova.id} (empresa ${novoEmpresaId})`);
  }

  // 5. Migrar colaboradores
  console.log('\n[5/5] Enviando colaboradores...');
  for (const c of colaboradores) {
    const { id, empresa_id, localidade_id, criado_em, ...payload } = c;
    const novoEmpresaId = empresaMap[empresa_id];
    if (!novoEmpresaId) { log(`PULADO colaborador #${id} (empresa ${empresa_id} sem correspondencia)`); continue; }
    // Ajusta localidade_id para o novo ID
    payload.localidade_id = locMap[localidade_id] || null;
    await api('POST', `/api/empresas/${novoEmpresaId}/colaboradores`, payload);
    log(`${c.nome} → empresa ${novoEmpresaId}`);
  }

  // Documentos (sem arquivos — só metadados)
  console.log('\n[Extra] Enviando documentos (sem arquivos)...');
  for (const d of documentos) {
    const { id, empresa_id, caminho_arquivo, criado_em, ...payload } = d;
    const novoEmpresaId = empresaMap[empresa_id];
    if (!novoEmpresaId) { log(`PULADO documento #${id} (empresa ${empresa_id} sem correspondencia)`); continue; }
    // Documentos exigem upload de arquivo → manda sem arquivo (só metadados)
    // A API atual exige arquivo, então pulamos (ou podemos tentar sem)
    log(`PULADO "${d.nome_arquivo}" (upload de arquivo nao incluso na migracao)`);
  }

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  MIGRAÇÃO CONCLUÍDA!                    ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n  ${Object.keys(empresaMap).length} empresas migradas`);
  console.log(`  ${Object.keys(locMap).length} localidades migradas`);
  console.log(`\n  Acesse: ${API_BASE}`);
  console.log(`  Login:  ${EMAIL} / ${SENHA}\n`);

  db.close();
})();
