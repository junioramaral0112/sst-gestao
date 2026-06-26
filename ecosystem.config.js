// ═══════════════════════════════════════════
// PM2 Ecosystem — SST-Gestão (Produção)
// ═══════════════════════════════════════════

module.exports = {
  apps: [
    {
      name: 'sst-gestao',
      script: 'server.js',

      // ── Ambiente ──────────────────────────
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        // ⚠️ Substitua por uma chave real no .env ou direto aqui
        JWT_SECRET: process.env.JWT_SECRET || 'sst-secret-key-2026',
      },

      // ── Processo ──────────────────────────
      instances: 1,              // 1 instância (SQLite não suporta cluster)
      exec_mode: 'fork',         // 'fork' obrigatório para SQLite
      autorestart: true,         // Reinicia se cair
      max_restarts: 10,          // Máx. de restarts em 1 min antes de parar
      restart_delay: 3000,       // Aguarda 3s entre restarts
      max_memory_restart: '200M',// Reinicia se passar de 200MB RAM

      // ── Logs ─────────────────────────────
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true,
      time: true,

      // ── Watch (opcional — desative em prod) ──
      watch: false,
      ignore_watch: ['node_modules', 'uploads', 'logs', 'database.db*'],
    },
  ],
};
