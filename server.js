// ═══════════════════════════════════════════════════════════
// SST-Gestão — API + Servidor Estático (Produção)
// ═══════════════════════════════════════════════════════════
// Inicia com:  node server.js   (dev)  ou  pm2 start ecosystem.config.js  (prod)
// ═══════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'sst-secret-key-2026';

// ── CORS (restrinja a origin em produção) ──
app.use(cors());
app.use(express.json());

/*
 * ═══════════════════════════════════════════════════════════
 * 🖼️  ARQUIVOS ESTÁTICOS — ATENÇÃO PARA DEPLOY
 * ═══════════════════════════════════════════════════════════
 *
 * Os arquivos abaixo DEVEM estar presentes na pasta "public/"
 * no servidor de produção. Sem eles, a interface quebra:
 *
 *   📁 public/
 *   ├── logotipo.png     ← 60px de altura no cabeçalho (telas app)
 *   ├── logo01.jpeg      ← 24px (w-24) na tela de login
 *   ├── index.html       ← SPA principal
 *   ├── css/style.css
 *   ├── js/app.js
 *   └── assets/          ← (opcional, fallback de logos)
 *
 * Verifique antes de subir: ls -la public/logotipo.png public/logo01.jpeg
 * ═══════════════════════════════════════════════════════════
 */
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const db = new Database('database.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ══════════════════ TABELAS ══════════════════
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, email TEXT UNIQUE,
    senha_hash TEXT, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT, razao_social TEXT, nome_fantasia TEXT,
    cnpj TEXT UNIQUE, inscricao_municipal TEXT, inscricao_estadual TEXT,
    endereco TEXT, celular TEXT, email TEXT, contato TEXT, tipo TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS localidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT, empresa_id INTEGER,
    cidade TEXT, estado TEXT, endereco_completo TEXT,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS colaboradores (
    id INTEGER PRIMARY KEY AUTOINCREMENT, empresa_id INTEGER,
    nome TEXT, email TEXT, cpf TEXT, data_nascimento DATE, funcao TEXT,
    nacionalidade TEXT DEFAULT 'Brasileiro', tipo_trabalho TEXT DEFAULT 'FIXO',
    localidade_id INTEGER, data_alocacao_inicio DATE, data_alocacao_fim DATE,
    status TEXT DEFAULT 'ativo', criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY (localidade_id) REFERENCES localidades(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, empresa_id INTEGER,
    categoria TEXT, nome_arquivo TEXT, caminho_arquivo TEXT,
    data_emissao DATE, data_validade DATE, observacao TEXT,
    status TEXT DEFAULT 'CONFORME', criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS nrs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, codigo TEXT UNIQUE, descricao TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS colaborador_nrs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, colaborador_id INTEGER, nr_id INTEGER,
    certificado_url TEXT, nome_arquivo TEXT, data_emissao DATE, data_validade DATE,
    status TEXT DEFAULT 'PENDENTE', criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE,
    FOREIGN KEY (nr_id) REFERENCES nrs(id)
  );
  CREATE TABLE IF NOT EXISTS usuario_empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER, empresa_id INTEGER,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
  );
`);

// ══════════════════ AUTO-SEED (produção) ══════════════════
// Cria o usuário admin padrão se a tabela estiver vazia
// Garante que o Render sempre tenha um login funcional
const usuarioCount = db.prepare('SELECT COUNT(*) as c FROM usuarios').get().c;
if (usuarioCount === 0) {
  const hash = bcrypt.hashSync('123456', 10);
  db.prepare('INSERT INTO usuarios (id,nome,email,senha_hash) VALUES (?,?,?,?)').run(1, 'Administrador', 'admin@empresa.com', hash);
  console.log('🌱 Auto-seed: usuário admin criado (admin@empresa.com / 123456)');
}

// Cria as 16 NRs (normas regulamentadoras) se a tabela estiver vazia
const nrCount = db.prepare('SELECT COUNT(*) as c FROM nrs').get().c;
if (nrCount === 0) {
  const nrs = [
    ['RNM','Registro Nacional Migratório'],['NR01','Ordem de Serviço (SESMT)'],['NR06','Equipamento de Proteção Individual — EPI'],
    ['NR10','Segurança em Instalações e Serviços em Eletricidade'],['NR11','Transporte, Movimentação e Armazenagem de Materiais'],
    ['NR12','Segurança no Trabalho em Máquinas e Equipamentos'],['NR18','Segurança e Saúde na Ind. da Construção Civil'],
    ['NR20','Segurança e Saúde com Inflamáveis e Combustíveis'],['NR25','Resíduos Industriais'],
    ['NR26','Sinalização de Segurança'],['NR33','Segurança em Espaço Confinado'],['NR35','Trabalho em Altura'],
    ['eSocial','Registro e Social (RH)'],['FEPI','Ficha de EPIs (SESMT)'],['ASO','Atestado de Saúde Ocupacional (SESMT)'],
    ['NR01MILI','NR 01 - Integração MILI (Individual)'],
  ];
  const ins = db.prepare('INSERT OR IGNORE INTO nrs (codigo,descricao) VALUES (?,?)');
  for (const [cod,desc] of nrs) ins.run(cod,desc);
  console.log('🌱 Auto-seed: 16 NRs criadas');
}

// ══════════════════ MULTER ══════════════════
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ══════════════════ AUTH ══════════════════
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token inválido' }); }
}

function calcStatus(validade) {
  if (!validade) return 'PENDENTE';
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const d = new Date(validade + 'T00:00:00');
  if (d < hoje) return 'VENCIDO';
  if ((d - hoje) / 86400000 <= 30) return 'A_VENCER';
  return 'CONFORME';
}

// ══════════════════ LOGIN ══════════════════
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.senha_hash))
    return res.status(401).json({ error: 'Credenciais inválidas' });
  const token = jwt.sign({ id: user.id, nome: user.nome, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, nome: user.nome, email: user.email } });
});

// ══════════════════ EMPRESAS ══════════════════
app.get('/api/empresas', auth, (req, res) => {
  let empresas = db.prepare(`
    SELECT e.* FROM empresas e
    JOIN usuario_empresas ue ON ue.empresa_id = e.id
    WHERE ue.usuario_id = ? ORDER BY e.nome_fantasia
  `).all(req.user.id);
  if (!empresas.length) empresas = db.prepare('SELECT * FROM empresas ORDER BY nome_fantasia').all();
  const result = empresas.map(e => ({
    ...e,
    localidades: db.prepare('SELECT * FROM localidades WHERE empresa_id = ?').all(e.id)
  }));
  res.json(result);
});

app.get('/api/empresas/:id', auth, (req, res) => {
  const e = db.prepare('SELECT * FROM empresas WHERE id = ?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Não encontrada' });
  e.localidades = db.prepare('SELECT * FROM localidades WHERE empresa_id = ?').all(e.id);
  res.json(e);
});

app.put('/api/empresas/:id', auth, (req, res) => {
  const e = req.body;
  db.prepare(`UPDATE empresas SET nome_fantasia=?,razao_social=?,cnpj=?,inscricao_municipal=?,inscricao_estadual=?,endereco=?,celular=?,email=?,contato=?,tipo=? WHERE id=?`)
    .run(e.nome_fantasia,e.razao_social,e.cnpj,e.inscricao_municipal,e.inscricao_estadual,e.endereco,e.celular,e.email,e.contato,e.tipo,req.params.id);
  res.json({ ok: true });
});

app.post('/api/empresas', auth, (req, res) => {
  const e = req.body;
  const r = db.prepare(`INSERT INTO empresas (razao_social,nome_fantasia,cnpj,inscricao_municipal,inscricao_estadual,endereco,celular,email,contato,tipo) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(e.razao_social||'', e.nome_fantasia||'', e.cnpj||'', e.inscricao_municipal||'', e.inscricao_estadual||'', e.endereco||'', e.celular||'', e.email||'', e.contato||'', e.tipo||'');
  // Vincula a empresa ao usuário autenticado
  db.prepare('INSERT OR IGNORE INTO usuario_empresas (usuario_id,empresa_id) VALUES (?,?)').run(req.user.id, r.lastInsertRowid);
  res.status(201).json({ id: r.lastInsertRowid });
});

app.delete('/api/empresas/:id', auth, (req, res) => {
  const e = db.prepare('SELECT * FROM empresas WHERE id = ?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Empresa não encontrada' });
  // ON DELETE CASCADE limpa localidades, colaboradores, documentos, usuario_empresas
  db.prepare('DELETE FROM empresas WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/empresas/:id/localidades', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM localidades WHERE empresa_id = ?').all(req.params.id));
});

app.post('/api/empresas/:id/localidades', auth, (req, res) => {
  const { cidade, estado, endereco_completo } = req.body;
  const r = db.prepare('INSERT INTO localidades (empresa_id,cidade,estado,endereco_completo) VALUES (?,?,?,?)')
    .run(req.params.id, cidade, estado, endereco_completo);
  res.status(201).json({ id: r.lastInsertRowid });
});

app.put('/api/localidades/:id', auth, (req, res) => {
  const { cidade, estado, endereco_completo } = req.body;
  db.prepare('UPDATE localidades SET cidade=?,estado=?,endereco_completo=? WHERE id=?')
    .run(cidade||'', estado||'', endereco_completo||'', req.params.id);
  res.json({ ok: true });
});

app.delete('/api/localidades/:id', auth, (req, res) => {
  // Colaboradores vinculados a esta localidade terao localidade_id = NULL (ON DELETE SET NULL)
  db.prepare('DELETE FROM localidades WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ══════════════════ COLABORADORES ══════════════════
app.get('/api/empresas/:id/colaboradores', auth, (req, res) => {
  const { localidade_id, tipo_trabalho } = req.query;
  let sql = 'SELECT c.*, l.cidade, l.estado FROM colaboradores c LEFT JOIN localidades l ON c.localidade_id = l.id WHERE c.empresa_id = ?';
  const params = [req.params.id];
  if (localidade_id) { sql += ' AND c.localidade_id = ?'; params.push(localidade_id); }
  if (tipo_trabalho) { sql += ' AND c.tipo_trabalho = ?'; params.push(tipo_trabalho); }
  sql += ' ORDER BY c.nome ASC';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/empresas/:id/colaboradores', auth, (req, res) => {
  const c = req.body;
  const r = db.prepare(`INSERT INTO colaboradores (empresa_id,nome,email,cpf,data_nascimento,funcao,nacionalidade,tipo_trabalho,localidade_id,data_alocacao_inicio,data_alocacao_fim) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(req.params.id, c.nome, c.email||'', c.cpf||'', c.data_nascimento||null, c.funcao||'', c.nacionalidade||'Brasileiro', c.tipo_trabalho||'FIXO', c.localidade_id||null, c.data_alocacao_inicio, c.data_alocacao_fim);
  res.status(201).json({ id: r.lastInsertRowid });
});

app.put('/api/colaboradores/:id', auth, (req, res) => {
  const c = req.body;
  db.prepare(`UPDATE colaboradores SET nome=?,email=?,cpf=?,data_nascimento=?,funcao=?,nacionalidade=?,tipo_trabalho=?,localidade_id=?,data_alocacao_inicio=?,data_alocacao_fim=?,status=? WHERE id=?`)
    .run(c.nome,c.email,c.cpf,c.data_nascimento,c.funcao,c.nacionalidade,c.tipo_trabalho,c.localidade_id,c.data_alocacao_inicio,c.data_alocacao_fim,c.status||'ativo',req.params.id);
  res.json({ ok: true });
});

app.put('/api/colaboradores/:id/status', auth, (req, res) => {
  db.prepare('UPDATE colaboradores SET status=? WHERE id=?').run(req.body.status, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/colaboradores/:id', auth, (req, res) => {
  db.prepare('DELETE FROM colaboradores WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ══════════════════ DOCUMENTOS ══════════════════
app.get('/api/empresas/:id/documentos', auth, (req, res) => {
  const docs = db.prepare('SELECT * FROM documentos WHERE empresa_id=? ORDER BY data_validade ASC').all(req.params.id);
  res.json(docs);
});

app.post('/api/empresas/:id/documentos', auth, upload.single('arquivo'), (req, res) => {
  const { categoria, data_emissao, data_validade, observacao } = req.body;
  const status = calcStatus(data_validade);
  const r = db.prepare('INSERT INTO documentos (empresa_id,categoria,nome_arquivo,caminho_arquivo,data_emissao,data_validade,observacao,status) VALUES (?,?,?,?,?,?,?,?)')
    .run(req.params.id, categoria, req.file?.originalname||'', req.file?.path||'', data_emissao, data_validade, observacao||'', status);
  res.status(201).json({ id: r.lastInsertRowid, status });
});

app.put('/api/documentos/:id', auth, upload.single('arquivo'), (req, res) => {
  const { data_emissao, data_validade, observacao } = req.body;
  const status = calcStatus(data_validade);
  if (req.file) {
    db.prepare('UPDATE documentos SET data_emissao=?,data_validade=?,observacao=?,status=?,nome_arquivo=?,caminho_arquivo=? WHERE id=?')
      .run(data_emissao, data_validade, observacao, status, req.file.originalname, req.file.path, req.params.id);
  } else {
    db.prepare('UPDATE documentos SET data_emissao=?,data_validade=?,observacao=?,status=? WHERE id=?')
      .run(data_emissao, data_validade, observacao, status, req.params.id);
  }
  res.json({ ok: true, status });
});

app.get('/api/documentos/download/:id', auth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documentos WHERE id=?').get(req.params.id);
  if (!doc || !doc.caminho_arquivo) return res.status(404).json({ error: 'Arquivo não encontrado' });
  const filePath = require('path').resolve(doc.caminho_arquivo);
  res.download(filePath, doc.nome_arquivo || 'documento.pdf');
});

app.put('/api/documentos/editar/:id', auth, upload.single('arquivo'), (req, res) => {
  const { status, data_emissao, data_validade, observacao } = req.body;
  const updates = {};
  if (status) updates.status = status;
  if (data_emissao) updates.data_emissao = data_emissao;
  if (data_validade) { updates.data_validade = data_validade; updates.status = calcStatus(data_validade); }
  if (observacao !== undefined) updates.observacao = observacao;
  if (req.file) { updates.nome_arquivo = req.file.originalname; updates.caminho_arquivo = req.file.path; }
  const fields = Object.keys(updates).map(k => `${k}=?`).join(',');
  const values = Object.values(updates);
  db.prepare(`UPDATE documentos SET ${fields} WHERE id=?`).run(...values, req.params.id);
  const updated = db.prepare('SELECT * FROM documentos WHERE id=?').get(req.params.id);
  res.json({ ok: true, documento: updated });
});

app.delete('/api/documentos/:id', auth, (req, res) => {
  db.prepare('DELETE FROM documentos WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ══════════════════ NRs ══════════════════
app.get('/api/nrs', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM nrs ORDER BY id').all());
});

app.get('/api/colaboradores/:id/nrs', auth, (req, res) => {
  const nrs = db.prepare(`
    SELECT n.*, cn.id as col_nr_id, cn.certificado_url, cn.nome_arquivo,
      cn.data_emissao, cn.data_validade, cn.status as nr_status, cn.criado_em
    FROM nrs n
    LEFT JOIN colaborador_nrs cn ON cn.nr_id = n.id AND cn.colaborador_id = ?
    ORDER BY n.id
  `).all(req.params.id);
  for (const n of nrs) {
    if (n.data_validade && n.nr_status !== calcStatus(n.data_validade) && n.col_nr_id) {
      const ns = calcStatus(n.data_validade);
      db.prepare('UPDATE colaborador_nrs SET status=? WHERE id=?').run(ns, n.col_nr_id);
      n.nr_status = ns;
    }
    if (!n.nr_status) n.nr_status = 'PENDENTE';
  }
  res.json(nrs);
});

app.post('/api/colaboradores/:id/nrs', auth, upload.single('certificado'), (req, res) => {
  const { nr_id, data_emissao, data_validade } = req.body;
  const status = calcStatus(data_validade);
  const r = db.prepare('INSERT INTO colaborador_nrs (colaborador_id,nr_id,certificado_url,nome_arquivo,data_emissao,data_validade,status) VALUES (?,?,?,?,?,?,?)')
    .run(req.params.id, nr_id, req.file?.path||'', req.file?.originalname||'', data_emissao||'', data_validade, status);
  res.status(201).json({ id: r.lastInsertRowid, status });
});

app.put('/api/colaboradores/nrs/:id', auth, upload.single('certificado'), (req, res) => {
  const { data_emissao, data_validade } = req.body;
  const status = calcStatus(data_validade);
  if (req.file) {
    db.prepare('UPDATE colaborador_nrs SET data_emissao=?,data_validade=?,status=?,certificado_url=?,nome_arquivo=? WHERE id=?')
      .run(data_emissao, data_validade, status, req.file.path, req.file.originalname, req.params.id);
  } else {
    db.prepare('UPDATE colaborador_nrs SET data_emissao=?,data_validade=?,status=? WHERE id=?')
      .run(data_emissao, data_validade, status, req.params.id);
  }
  res.json({ ok: true, status });
});

app.delete('/api/colaboradores/nrs/:id', auth, (req, res) => {
  db.prepare('DELETE FROM colaborador_nrs WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ══════════════════ HEALTH CHECK ══════════════════
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    ambiente: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    db: 'conectado',
    timestamp: new Date().toISOString(),
  });
});

// ══════════════════ START ══════════════════
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ SST Gestão — http://0.0.0.0:${PORT} (${process.env.NODE_ENV || 'development'})`);
});
