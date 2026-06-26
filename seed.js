const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const db = new Database('database.db');
db.pragma('foreign_keys = ON');

// Criar tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, email TEXT UNIQUE, senha_hash TEXT, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS empresas (id INTEGER PRIMARY KEY AUTOINCREMENT, razao_social TEXT, nome_fantasia TEXT, cnpj TEXT UNIQUE, inscricao_municipal TEXT, inscricao_estadual TEXT, endereco TEXT, celular TEXT, email TEXT, contato TEXT, tipo TEXT, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS localidades (id INTEGER PRIMARY KEY AUTOINCREMENT, empresa_id INTEGER, cidade TEXT, estado TEXT, endereco_completo TEXT, FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS colaboradores (id INTEGER PRIMARY KEY AUTOINCREMENT, empresa_id INTEGER, nome TEXT, email TEXT, cpf TEXT, data_nascimento DATE, funcao TEXT, nacionalidade TEXT DEFAULT 'Brasileiro', tipo_trabalho TEXT DEFAULT 'FIXO', localidade_id INTEGER, data_alocacao_inicio DATE, data_alocacao_fim DATE, status TEXT DEFAULT 'ativo', criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE, FOREIGN KEY (localidade_id) REFERENCES localidades(id) ON DELETE SET NULL);
  CREATE TABLE IF NOT EXISTS documentos (id INTEGER PRIMARY KEY AUTOINCREMENT, empresa_id INTEGER, categoria TEXT, nome_arquivo TEXT, caminho_arquivo TEXT, data_emissao DATE, data_validade DATE, observacao TEXT, status TEXT DEFAULT 'CONFORME', criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS nrs (id INTEGER PRIMARY KEY AUTOINCREMENT, codigo TEXT UNIQUE, descricao TEXT, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS colaborador_nrs (id INTEGER PRIMARY KEY AUTOINCREMENT, colaborador_id INTEGER, nr_id INTEGER, certificado_url TEXT, nome_arquivo TEXT, data_emissao DATE, data_validade DATE, status TEXT DEFAULT 'PENDENTE', criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE, FOREIGN KEY (nr_id) REFERENCES nrs(id));
  CREATE TABLE IF NOT EXISTS usuario_empresas (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER, empresa_id INTEGER, FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE, FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE);
`);

console.log('🌱 Semeando dados...');

// Limpar dados antigos
db.exec('DELETE FROM colaborador_nrs');
db.exec('DELETE FROM nrs');
db.exec('DELETE FROM documentos');
db.exec('DELETE FROM colaboradores');
db.exec('DELETE FROM localidades');
db.exec('DELETE FROM usuario_empresas');
db.exec('DELETE FROM empresas');
db.exec('DELETE FROM usuarios');

// Admin
const hash = bcrypt.hashSync('123456', 10);
db.prepare('INSERT INTO usuarios (id,nome,email,senha_hash) VALUES (?,?,?,?)').run(1, 'Administrador', 'admin@empresa.com', hash);

// Empresas
const empresas = [
  [1,'MACROMAQ EQUIP. ROD. E INDUSTRIAIS LTDA.','MACROMAQ','83.675.413/0004-46','','','RUA BOM JESUS DE IGUAPE, 5009','(99) 99999-9999','clientes.documentos@macromaq.com.br','LUIZ','Prestador de Serviços - EVENTUAL'],
  [2,'CONSTRUTORA BETA LTDA.','BETA CONSTRUÇÕES','12.345.678/0001-90','','','AVENIDA PAULISTA, 1000','(11) 99999-8888','contato@betaconstrucoes.com','MARIA','Prestador de Serviços'],
  [3,'TECH SOLUTIONS INFORMÁTICA LTDA.','TECH SOLUTIONS','98.765.432/0001-10','','','RUA DOS PROGRAMADORES, 100','(41) 99999-7777','contato@techsolutions.com','CARLOS','Prestador de Serviços - TI'],
  [4,'NORDESTE SERVIÇOS GERAIS EIRELI','NORDESTE SERVIÇOS','55.555.555/0001-55','','','RUA DO COMÉRCIO, 500','(85) 99999-6666','contato@nordesteservicos.com','ANA','Prestador de Serviços'],
  [5,'SUL LOGÍSTICA TRANSPORTES LTDA.','SUL LOGÍSTICA','77.777.777/0001-77','','','RUA DOS CAMINHÕES, 1000','(51) 99999-5555','contato@sullogistica.com','JOSÉ','Transportadora'],
  [6,'DENTAL PLUS EQUIPAMENTOS LTDA.','DENTAL PLUS','44.444.444/0001-44','','','RUA DOS DENTISTAS, 100','(11) 99999-4444','contato@dentalplus.com','ROBERTA','Comércio'],
  [7,'AGRO FORTE PRODUTOS AGRÍCOLAS LTDA.','AGRO FORTE','66.666.666/0001-66','','','RUA DO AGRONEGÓCIO, 500','(62) 99999-3333','contato@agroforte.com','FELIPE','Agronegócio'],
];
const insE = db.prepare('INSERT INTO empresas (id,razao_social,nome_fantasia,cnpj,inscricao_municipal,inscricao_estadual,endereco,celular,email,contato,tipo) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
for (const e of empresas) insE.run(...e);

// Localidades
const locs = [
  [1,1,'São Paulo','SP','Av. Paulista, 1000'],[2,1,'Campinas','SP','Rua Dr. Antonio, 500'],[3,1,'Ribeirão Preto','SP','Av. Independência, 200'],[4,1,'Santos','SP','Av. São Francisco, 150'],
  [5,2,'São Paulo','SP','Av. Paulista, 1000'],[6,2,'Osasco','SP','Rua das Flores, 300'],[7,2,'Guarulhos','SP','Av. Tancredo Neves, 500'],
  [8,3,'Curitiba','PR','Rua dos Programadores, 100'],[9,3,'Londrina','PR','Av. Tiradentes, 200'],[10,3,'Maringá','PR','Rua São Paulo, 300'],
  [11,4,'Fortaleza','CE','Rua do Comércio, 500'],[12,4,'Recife','PE','Av. Boa Viagem, 1000'],[13,4,'Salvador','BA','Av. Paralela, 200'],
  [14,5,'Porto Alegre','RS','Rua dos Caminhões, 1000'],[15,5,'Caxias do Sul','RS','Av. Industrial, 200'],[16,5,'Pelotas','RS','Rua do Porto, 300'],
  [17,6,'São Paulo','SP','Rua dos Dentistas, 100'],[18,6,'Rio de Janeiro','RJ','Av. Atlântica, 200'],
  [19,7,'Goiânia','GO','Rua do Agronegócio, 500'],[20,7,'Rio Verde','GO','Av. das Palmeiras, 200'],
];
const insL = db.prepare('INSERT INTO localidades (id,empresa_id,cidade,estado,endereco_completo) VALUES (?,?,?,?,?)');
for (const l of locs) insL.run(...l);

// Colaboradores
const cols = [
  [1,'João Silva','123.456.789-01','1985-03-15','Mecânico Pleno','Brasileiro','FIXO',1,'2026-01-01','2026-12-31'],
  [1,'Maria Santos','987.654.321-00','1990-07-22','Mecânico Sênior','Brasileiro','EXPORADICO',2,'2026-03-01','2026-08-31'],
  [1,'Pedro Oliveira','456.789.123-00','1988-11-10','Mecânico Líder','Brasileiro','FIXO',3,'2026-02-01','2026-12-31'],
  [2,'Carlos Eduardo','789.123.456-00','1982-05-05','Engenheiro Civil','Brasileiro','FIXO',5,'2026-01-01','2026-12-31'],
  [2,'Ana Paula','321.654.987-00','1995-12-12','Arquiteta','Brasileiro','FIXO',6,'2026-06-01','2026-11-30'],
];
const insC = db.prepare('INSERT INTO colaboradores (empresa_id,nome,cpf,data_nascimento,funcao,nacionalidade,tipo_trabalho,localidade_id,data_alocacao_inicio,data_alocacao_fim) VALUES (?,?,?,?,?,?,?,?,?,?)');
for (const c of cols) insC.run(...c);

// Documentos
const docs = [
  [1,'LTCAT (SESMT)','LTCAT2026.pdf','2026-03-15','2026-07-15','Vence em 3 semanas'],
  [1,'PCMSO (SESMT)','PCMSO2026.pdf','2026-01-10','2026-12-31',''],
  [1,'PGR (SESMT)','PGR2025.pdf','2025-10-17','2025-09-05','Vencido há 9 meses'],
  [1,'CERTIDÃO NEGATIVA MUNICIPAL','CertidaoMunicipal2026.pdf','2026-01-01','2026-06-30','Vence em 6 dias'],
  [2,'PGR (SESMT)','PGR_BETA_2025.pdf','2025-06-01','2025-12-01',''],
];
function st(v) { if(!v)return'CONFORME'; const h=new Date();h.setHours(0,0,0,0); const d=new Date(v+'T00:00:00'); if(d<h)return'VENCIDO'; if((d-h)/86400000<=30)return'A_VENCER'; return'CONFORME'; }
const insD = db.prepare('INSERT INTO documentos (empresa_id,categoria,nome_arquivo,data_emissao,data_validade,observacao,status) VALUES (?,?,?,?,?,?,?)');
for (const d of docs) insD.run(d[0],d[1],d[2],d[3],d[4],d[5],st(d[4]));

// 16 NRs
const nrs = [
  ['RNM','Registro Nacional Migratório'],['NR01','Ordem de Serviço (SESMT)'],['NR06','Equipamento de Proteção Individual — EPI'],
  ['NR10','Segurança em Instalações e Serviços em Eletricidade'],['NR11','Transporte, Movimentação e Armazenagem de Materiais'],
  ['NR12','Segurança no Trabalho em Máquinas e Equipamentos'],['NR18','Segurança e Saúde na Ind. da Construção Civil'],
  ['NR20','Segurança e Saúde com Inflamáveis e Combustíveis'],['NR25','Resíduos Industriais'],
  ['NR26','Sinalização de Segurança'],['NR33','Segurança em Espaço Confinado'],['NR35','Trabalho em Altura'],
  ['eSocial','Registro e Social (RH)'],['FEPI','Ficha de EPIs (SESMT)'],['ASO','Atestado de Saúde Ocupacional (SESMT)'],
  ['NR01MILI','NR 01 - Integração MILI (Individual)'],
];
for (const [cod,desc] of nrs) db.prepare('INSERT OR IGNORE INTO nrs (codigo,descricao) VALUES (?,?)').run(cod,desc);

// Vínculo
for (const e of empresas) db.prepare('INSERT INTO usuario_empresas (usuario_id,empresa_id) VALUES (?,?)').run(1,e[0]);

console.log(`✅ ${empresas.length} empresas | ${locs.length} locs | ${cols.length} cols | ${nrs.length} NRs`);
