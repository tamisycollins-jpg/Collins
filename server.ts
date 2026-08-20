import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Data directory for persistence
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'server_db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial DB template
const defaultDb = {
  articles: [],
  arrivages: [],
  ventes: [],
  reglements: [],
  mouvements: [],
  parametres: {
    nomEntreprise: 'CLINIC AUTO',
    slogan: 'Gestion Dépositaire & Vente Pièces / Services',
    adresse: '',
    telephone: '',
    email: '',
    devise: 'Ar',
    commissionPourcentageDefaut: 10,
    partFournisseurPourcentageDefaut: 90,
    seuilStockDefaut: 2,
    texteFacture: 'Merci de votre confiance. Les articles vendus ne sont ni repris ni échangés après 48h.',
    conditionsVente: 'Facture établie selon les conditions générales de vente dépositaire.',
  },
  historique: [
    {
      id: 'init-1',
      date: new Date().toISOString(),
      typeAction: 'CREATION',
      description: 'Initialisation du serveur KOSPAM GESTION en réseau.',
    },
  ],
};

// Load or initialize server state
let currentDb = defaultDb;
let dbVersion = 1;
let lastUpdatedAt = new Date().toISOString();

try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.db) {
      currentDb = parsed.db;
      // Ensure currency is Ar (Ariary)
      if (!currentDb.parametres.devise || currentDb.parametres.devise === 'FCFA') {
        currentDb.parametres.devise = 'Ar';
      }
      dbVersion = parsed.version || 1;
      lastUpdatedAt = parsed.lastUpdatedAt || new Date().toISOString();
    }
  } else {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ db: currentDb, version: dbVersion, lastUpdatedAt }, null, 2),
      'utf-8'
    );
  }
} catch (e) {
  console.error('Error initializing server database file:', e);
}

function persistServerDb() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ db: currentDb, version: dbVersion, lastUpdatedAt }, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

// ============================================================
// API ROUTES
// ============================================================

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: dbVersion,
    lastUpdatedAt,
    totalArticles: currentDb.articles?.length || 0,
    totalVentes: currentDb.ventes?.length || 0,
  });
});

// 2. Authentication
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const cleanUser = String(username || '').trim();
  const cleanPass = String(password || '').trim();

  // Validate credentials requested by user:
  // NOM: Clinic Auto
  // MDP: Clinic auto123
  const isMatchUser = cleanUser.toLowerCase() === 'clinic auto';
  const isMatchPass = cleanPass === 'Clinic auto123' || cleanPass.toLowerCase() === 'clinic auto123';

  if (isMatchUser && isMatchPass) {
    return res.json({
      success: true,
      user: {
        id: 'usr_clinic_auto',
        username: 'Clinic Auto',
        role: 'ADMIN',
        loginTime: new Date().toISOString(),
      },
      token: `token_${Date.now()}_clinic_auto`,
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Identifiant ou mot de passe incorrect. (Ex: Clinic Auto / Clinic auto123)',
  });
});

// 3. Network Sync Pull: Get current state from server
app.get('/api/sync', (req, res) => {
  res.json({
    success: true,
    db: currentDb,
    version: dbVersion,
    lastUpdatedAt,
  });
});

// 4. Network Sync Push: Update server state and persist
app.post('/api/sync', (req, res) => {
  const { db, clientVersion } = req.body || {};

  if (!db || typeof db !== 'object') {
    return res.status(400).json({ success: false, message: 'Données de synchronisation invalides' });
  }

  // Deep update server DB
  currentDb = {
    articles: Array.isArray(db.articles) ? db.articles : currentDb.articles,
    arrivages: Array.isArray(db.arrivages) ? db.arrivages : currentDb.arrivages,
    ventes: Array.isArray(db.ventes) ? db.ventes : currentDb.ventes,
    reglements: Array.isArray(db.reglements) ? db.reglements : currentDb.reglements,
    mouvements: Array.isArray(db.mouvements) ? db.mouvements : currentDb.mouvements,
    parametres: db.parametres ? { ...currentDb.parametres, ...db.parametres } : currentDb.parametres,
    historique: Array.isArray(db.historique) ? db.historique : currentDb.historique,
  };

  dbVersion += 1;
  lastUpdatedAt = new Date().toISOString();
  persistServerDb();

  res.json({
    success: true,
    db: currentDb,
    version: dbVersion,
    lastUpdatedAt,
  });
});

// ============================================================
// VITE OR STATIC SERVING
// ============================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[KOSPAM GESTION] Network Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
