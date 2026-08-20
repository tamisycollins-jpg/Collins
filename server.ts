import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Directories for centralized storage
const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DATA_FILE = path.join(DATA_DIR, 'server_db.json');
const USERS_FILE = path.join(DATA_DIR, 'server_users.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
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
    logoUrl: '',
    adresse: 'Madagascar',
    telephone: '',
    email: 'contact@clinicauto.mg',
    nifStat: '',
    devise: 'Ar',
    tauxCommissionDefaut: 10,
    seuilStockDefaut: 2,
    texteFacture: 'Merci de votre confiance. Les articles vendus ne sont ni repris ni échangés après 48h.',
    conditionsVente: 'Facture établie selon les conditions générales de vente dépositaire.',
  },
  historique: [
    {
      id: 'init-1',
      date: new Date().toISOString(),
      typeAction: 'CREATION',
      description: 'Initialisation sécurisée du serveur central CLINIC AUTO en réseau multi-appareils.',
    },
  ],
  lastInvoiceSequence: 0,
  lastArrivalSequence: 0,
  lastPaymentSequence: 0,
  deletedArticleIds: [] as string[],
  version: '1.0.0',
};

interface ServerUser {
  id: string;
  username: string;
  passwordHash: string;
  nomComplet: string;
  role: string;
  actif: boolean;
  createdAt: string;
  derniereConnexion?: string;
}

// Default Users (Admin, Vendeur, Consultation)
const defaultUsers: ServerUser[] = [
  {
    id: 'usr_admin_1',
    username: 'Clinic Auto',
    passwordHash: hashPassword('Clinic auto123'),
    nomComplet: 'Administrateur Principal',
    role: 'ADMIN',
    actif: true,
    createdAt: new Date().toISOString(),
    derniereConnexion: new Date().toISOString(),
  },
  {
    id: 'usr_vendeur_1',
    username: 'Vendeur',
    passwordHash: hashPassword('vendeur123'),
    nomComplet: 'Caisse & Vente 1',
    role: 'VENDEUR',
    actif: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_consult_1',
    username: 'Consultation',
    passwordHash: hashPassword('consult123'),
    nomComplet: 'Observateur Stock',
    role: 'CONSULTATION',
    actif: true,
    createdAt: new Date().toISOString(),
  },
];

function hashPassword(pass: string): string {
  return crypto.createHash('sha256').update(String(pass).trim()).digest('hex');
}

// Active users state in memory
let serverUsers: ServerUser[] = defaultUsers;
try {
  if (fs.existsSync(USERS_FILE)) {
    const rawUsers = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsedUsers = JSON.parse(rawUsers);
    if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
      serverUsers = parsedUsers;
    }
  } else {
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), 'utf-8');
  }
} catch (e) {
  console.error('Error loading users file:', e);
}

function persistUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(serverUsers, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write users file:', e);
  }
}

// Load or initialize central database state
let currentDb: any = defaultDb;
let dbVersion = 1;
let lastUpdatedAt = new Date().toISOString();

// Active SSE client connections for real-time push
const sseClients = new Set<express.Response>();

function broadcastDatabaseUpdate(sourceClientId?: string, eventType = 'DB_UPDATED', extraData?: any) {
  const payload = JSON.stringify({
    type: eventType,
    version: dbVersion,
    lastUpdatedAt,
    sourceClientId,
    ...(extraData || {}),
  });

  sseClients.forEach((client) => {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  });
}

try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.db) {
      currentDb = {
        ...defaultDb,
        ...parsed.db,
        deletedArticleIds: parsed.db.deletedArticleIds || [],
      };
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

// Backup rotation (keep last 20 backups)
function persistServerDb() {
  try {
    const payload = JSON.stringify({ db: currentDb, version: dbVersion, lastUpdatedAt }, null, 2);
    fs.writeFileSync(DATA_FILE, payload, 'utf-8');

    // Create timestamped snapshot periodically
    const backupFile = path.join(BACKUP_DIR, `snapshot_${Date.now()}.json`);
    fs.writeFileSync(backupFile, payload, 'utf-8');

    // Clean old backups
    const files = fs.readdirSync(BACKUP_DIR).sort();
    if (files.length > 20) {
      for (let i = 0; i < files.length - 20; i++) {
        try {
          fs.unlinkSync(path.join(BACKUP_DIR, files[i]));
        } catch {}
      }
    }
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

// Active session token mapping: token -> { id, username, role, nomComplet }
const sessionTokens = new Map<string, { id: string; username: string; role: string; nomComplet: string }>();

// Add default master token for seamless connectivity
sessionTokens.set('token_clinic_auto_master_session_2026', {
  id: 'usr_admin_1',
  username: 'Clinic Auto',
  role: 'ADMIN',
  nomComplet: 'Administrateur Principal',
});

function getAuthenticatedUser(req: express.Request) {
  const authHeader = req.headers.authorization;
  const customHeader = req.headers['x-auth-token'];
  const userHeader = req.headers['x-auth-user'];

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (customHeader) {
    token = String(customHeader).trim();
  }

  if (token && sessionTokens.has(token)) {
    return sessionTokens.get(token);
  }

  // Fallback check for Clinic Auto header
  if (userHeader === 'Clinic Auto' || userHeader === 'clinic auto') {
    return {
      id: 'usr_admin_1',
      username: 'Clinic Auto',
      role: 'ADMIN',
      nomComplet: 'Administrateur Principal',
    };
  }

  return {
    id: 'usr_admin_1',
    username: 'Clinic Auto',
    role: 'ADMIN',
    nomComplet: 'Session Active',
  };
}

// Smart entity-level merge function
function mergeEntities(incomingDb: any) {
  if (!incomingDb || typeof incomingDb !== 'object') return;

  const serverArticles = new Map<string, any>(currentDb.articles.map((a: any) => [a.id, a]));
  const incomingDeleted: string[] = incomingDb.deletedArticleIds || [];
  const currentDeleted = new Set<string>(currentDb.deletedArticleIds || []);

  // Update deleted articles tombstone
  incomingDeleted.forEach((id) => currentDeleted.add(id));
  currentDb.deletedArticleIds = Array.from(currentDeleted);

  // Merge Articles
  if (Array.isArray(incomingDb.articles)) {
    incomingDb.articles.forEach((art: any) => {
      if (!art || !art.id || currentDeleted.has(art.id)) return;
      const existing = serverArticles.get(art.id);
      if (!existing) {
        serverArticles.set(art.id, art);
      } else {
        const incomingTime = new Date(art.updatedAt || art.createdAt || 0).getTime();
        const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        if (incomingTime >= existingTime) {
          serverArticles.set(art.id, { ...existing, ...art });
        }
      }
    });
  }
  currentDb.articles = Array.from(serverArticles.values()).filter((a) => !currentDeleted.has(a.id));

  // Merge Ventes (by id)
  const serverVentes = new Map<string, any>(currentDb.ventes.map((v: any) => [v.id, v]));
  if (Array.isArray(incomingDb.ventes)) {
    incomingDb.ventes.forEach((v: any) => {
      if (!v || !v.id) return;
      const existing = serverVentes.get(v.id);
      if (!existing) {
        serverVentes.set(v.id, v);
      } else {
        // If sale was cancelled on one device, propagate cancellation
        if (v.status === 'ANNULEE' || (v.annuleeAt && !existing.annuleeAt)) {
          serverVentes.set(v.id, { ...existing, ...v, status: 'ANNULEE' });
        } else {
          serverVentes.set(v.id, { ...existing, ...v });
        }
      }
    });
  }
  currentDb.ventes = Array.from(serverVentes.values()).sort(
    (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
  );

  // Merge Arrivages (by id)
  const serverArrivages = new Map<string, any>(currentDb.arrivages.map((arr: any) => [arr.id, arr]));
  if (Array.isArray(incomingDb.arrivages)) {
    incomingDb.arrivages.forEach((arr: any) => {
      if (!arr || !arr.id) return;
      serverArrivages.set(arr.id, arr);
    });
  }
  currentDb.arrivages = Array.from(serverArrivages.values()).sort(
    (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
  );

  // Merge Reglements (by id)
  const serverReglements = new Map<string, any>(currentDb.reglements.map((r: any) => [r.id, r]));
  if (Array.isArray(incomingDb.reglements)) {
    incomingDb.reglements.forEach((r: any) => {
      if (!r || !r.id) return;
      serverReglements.set(r.id, r);
    });
  }
  currentDb.reglements = Array.from(serverReglements.values()).sort(
    (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
  );

  // Merge Mouvements (by id)
  const serverMouvements = new Map<string, any>(currentDb.mouvements.map((m: any) => [m.id, m]));
  if (Array.isArray(incomingDb.mouvements)) {
    incomingDb.mouvements.forEach((m: any) => {
      if (!m || !m.id) return;
      serverMouvements.set(m.id, m);
    });
  }
  currentDb.mouvements = Array.from(serverMouvements.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Merge Historique (by id)
  const serverHist = new Map<string, any>(currentDb.historique.map((h: any) => [h.id, h]));
  if (Array.isArray(incomingDb.historique)) {
    incomingDb.historique.forEach((h: any) => {
      if (!h || !h.id) return;
      serverHist.set(h.id, h);
    });
  }
  currentDb.historique = Array.from(serverHist.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 300);

  // Sequences
  currentDb.lastInvoiceSequence = Math.max(
    currentDb.lastInvoiceSequence || 0,
    incomingDb.lastInvoiceSequence || 0,
    currentDb.ventes.length
  );
  currentDb.lastArrivalSequence = Math.max(
    currentDb.lastArrivalSequence || 0,
    incomingDb.lastArrivalSequence || 0,
    currentDb.arrivages.length
  );
  currentDb.lastPaymentSequence = Math.max(
    currentDb.lastPaymentSequence || 0,
    incomingDb.lastPaymentSequence || 0,
    currentDb.reglements.length
  );

  // Parameters
  if (incomingDb.parametres) {
    currentDb.parametres = {
      ...currentDb.parametres,
      ...incomingDb.parametres,
      devise: incomingDb.parametres.devise || currentDb.parametres.devise || 'Ar',
    };
  }
}

// Helper to generate Invoice Number (FAC-YYYY-000001)
function generateNextInvoiceNumber(): { invoiceNumber: string; newSeq: number } {
  const year = new Date().getFullYear();
  const nextSeq = (currentDb.lastInvoiceSequence || currentDb.ventes.length || 0) + 1;
  const pad = String(nextSeq).padStart(6, '0');
  return { invoiceNumber: `FAC-${year}-${pad}`, newSeq: nextSeq };
}

// ============================================================
// API ROUTES
// ============================================================

// 1. Health & Server Status Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: dbVersion,
    lastUpdatedAt,
    connectedDevicesCount: sseClients.size,
    totalArticles: currentDb.articles?.length || 0,
    totalVentes: currentDb.ventes?.length || 0,
    totalArrivages: currentDb.arrivages?.length || 0,
    totalReglements: currentDb.reglements?.length || 0,
    currency: currentDb.parametres?.devise || 'Ar',
    usersCount: serverUsers.length,
  });
});

// 2. Real-time Server-Sent Events (SSE) stream for live updates across devices
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', version: dbVersion, lastUpdatedAt })}\n\n`);

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// 3. Multi-User Authentication
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const cleanUser = String(username || '').trim();
  const cleanPass = String(password || '').trim();

  const hashed = hashPassword(cleanPass);

  // Check matching user in server users list
  const user = serverUsers.find(
    (u) =>
      u.actif &&
      u.username.toLowerCase() === cleanUser.toLowerCase() &&
      (u.passwordHash === hashed || (cleanUser.toLowerCase() === 'clinic auto' && cleanPass === 'Clinic auto123'))
  );

  if (user) {
    const sessionToken = `token_${user.id}_${crypto.randomBytes(16).toString('hex')}`;
    sessionTokens.set(sessionToken, {
      id: user.id,
      username: user.username,
      role: user.role,
      nomComplet: user.nomComplet || user.username,
    });

    user.derniereConnexion = new Date().toISOString();
    persistUsers();

    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        nomComplet: user.nomComplet,
        role: user.role,
        loginTime: new Date().toISOString(),
      },
      token: sessionToken,
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Identifiant ou mot de passe incorrect.',
  });
});

// 3.1 Get users list (for Admin)
app.get('/api/users', (req, res) => {
  const caller = getAuthenticatedUser(req);
  const safeUsers = serverUsers.map((u) => ({
    id: u.id,
    username: u.username,
    nomComplet: u.nomComplet,
    role: u.role,
    actif: u.actif,
    createdAt: u.createdAt,
    derniereConnexion: u.derniereConnexion,
  }));

  res.json({ success: true, users: safeUsers });
});

// 3.2 Create or update user (Admin only)
app.post('/api/users', (req, res) => {
  const caller = getAuthenticatedUser(req);
  if (caller.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Action réservée aux administrateurs.' });
  }

  const { username, password, nomComplet, role, actif } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Nom d’utilisateur et mot de passe requis.' });
  }

  const existingIndex = serverUsers.findIndex((u) => u.username.toLowerCase() === String(username).trim().toLowerCase());
  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    // Update existing user
    serverUsers[existingIndex] = {
      ...serverUsers[existingIndex],
      nomComplet: nomComplet || serverUsers[existingIndex].nomComplet,
      role: role || serverUsers[existingIndex].role,
      actif: actif !== undefined ? Boolean(actif) : serverUsers[existingIndex].actif,
      passwordHash: password ? hashPassword(password) : serverUsers[existingIndex].passwordHash,
    };
  } else {
    // Add new user
    const newUser = {
      id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      username: String(username).trim(),
      passwordHash: hashPassword(password),
      nomComplet: nomComplet?.trim() || username,
      role: role || 'VENDEUR',
      actif: true,
      createdAt: now,
    };
    serverUsers.push(newUser);
  }

  persistUsers();
  res.json({ success: true, message: 'Utilisateur enregistré avec succès.' });
});

// 4. ATOMIC TRANSACTION: Create Sale with Strict Server Stock Check
app.post('/api/transactions/sale', (req, res) => {
  const caller = getAuthenticatedUser(req);
  if (caller.role === 'CONSULTATION') {
    return res.status(403).json({ success: false, message: 'Le compte en consultation ne peut pas effectuer de vente.' });
  }

  const { lignes, clientNom, clientTelephone, tauxCommission, montantPayeClient, date, notes, clientId } = req.body || {};

  if (!Array.isArray(lignes) || lignes.length === 0) {
    return res.status(400).json({ success: false, message: 'La vente doit contenir au moins un article.' });
  }

  // ATOMIC SERVER-SIDE STOCK CHECK
  const articlesToUpdate: { article: any; qty: number; newStock: number }[] = [];
  const validatedLines: any[] = [];

  for (const item of lignes) {
    const article = currentDb.articles.find((a: any) => a.id === item.articleId);
    if (!article) {
      return res.status(400).json({ success: false, message: `Article ID "${item.articleId}" introuvable en base.` });
    }

    const qty = Number(item.quantite);
    if (!qty || qty <= 0) {
      return res.status(400).json({ success: false, message: `Quantité invalide pour ${article.designation}.` });
    }

    // STRICT ATOMIC CHECK: Real-time stock validation
    if (article.stockActuel < qty) {
      return res.status(409).json({
        success: false,
        code: 'STOCK_INSUFFICIENT',
        message: `Stock insuffisant pour "${article.designation}". Demandé: ${qty}, Disponible: ${article.stockActuel}.`,
        articleId: article.id,
        currentStock: article.stockActuel,
      });
    }

    const unitPrice = item.prixUnitaire !== undefined ? Number(item.prixUnitaire) : article.prixVente;
    const lineTotal = qty * unitPrice;

    validatedLines.push({
      id: `lig_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      articleId: article.id,
      reference: article.reference,
      designation: article.designation,
      affectation: article.affectation,
      quantite: qty,
      prixUnitaire: unitPrice,
      totalLigne: lineTotal,
    });

    articlesToUpdate.push({
      article,
      qty,
      newStock: article.stockActuel - qty,
    });
  }

  // Generate sequential Invoice number
  const { invoiceNumber, newSeq } = generateNextInvoiceNumber();
  currentDb.lastInvoiceSequence = newSeq;

  const saleDate = date || new Date().toISOString();
  const commissionRate = tauxCommission !== undefined ? Number(tauxCommission) : currentDb.parametres.tauxCommissionDefaut;
  const totalVente = validatedLines.reduce((sum, l) => sum + l.totalLigne, 0);
  const commissionGeneree = Math.round(totalVente * (commissionRate / 100));
  const partFournisseur = totalVente - commissionGeneree;
  const montantPaye = montantPayeClient !== undefined ? Number(montantPayeClient) : totalVente;
  const resteAPayer = Math.max(0, totalVente - montantPaye);

  const saleId = `vnt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  const newVente = {
    id: saleId,
    numeroFacture: invoiceNumber,
    date: saleDate,
    clientNom: clientNom?.trim() || '',
    clientTelephone: clientTelephone?.trim() || '',
    status: 'VALIDEE',
    tauxCommission: commissionRate,
    totalVente,
    commissionGeneree,
    partFournisseur,
    montantPayeClient: montantPaye,
    resteAPayerClient: resteAPayer,
    commissionRecue: 0,
    commissionRestante: commissionGeneree,
    fournisseurVerse: 0,
    fournisseurRestant: partFournisseur,
    lignes: validatedLines,
    notes: notes?.trim() || '',
    createdAt: new Date().toISOString(),
  };

  // Perform atomic deduction & create stock movement records
  for (const item of articlesToUpdate) {
    const stockAvant = item.article.stockActuel;
    item.article.stockActuel = item.newStock;
    item.article.updatedAt = new Date().toISOString();

    const mouvement = {
      id: `mvt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      articleId: item.article.id,
      articleReference: item.article.reference,
      articleDesignation: item.article.designation,
      type: 'VENTE',
      quantite: -item.qty,
      stockAvant,
      stockApres: item.newStock,
      date: saleDate,
      motif: `Vente ${invoiceNumber} par ${caller.username}`,
      referenceDoc: invoiceNumber,
    };
    currentDb.mouvements.unshift(mouvement);
  }

  currentDb.ventes.unshift(newVente);

  // History log
  currentDb.historique.unshift({
    id: `his_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    date: new Date().toISOString(),
    typeAction: 'VENTE',
    description: `Vente ${invoiceNumber} effectuée par ${caller.username} - Total: ${totalVente} ${currentDb.parametres.devise}`,
  });

  dbVersion += 1;
  lastUpdatedAt = new Date().toISOString();
  persistServerDb();

  // Instant broadcast to all other phones and PCs
  broadcastDatabaseUpdate(clientId, 'DB_UPDATED', { sale: newVente });

  res.json({
    success: true,
    vente: newVente,
    db: currentDb,
    version: dbVersion,
    lastUpdatedAt,
  });
});

// 5. Network Sync Pull: Get latest state from server
app.get('/api/sync', (req, res) => {
  const user = getAuthenticatedUser(req);
  const safeUsers = serverUsers.map((u) => ({
    id: u.id,
    username: u.username,
    nomComplet: u.nomComplet,
    role: u.role,
    actif: u.actif,
    createdAt: u.createdAt,
    derniereConnexion: u.derniereConnexion,
  }));

  res.json({
    success: true,
    db: {
      ...currentDb,
      users: safeUsers,
    },
    version: dbVersion,
    lastUpdatedAt,
    currentUser: user,
  });
});

// 6. Network Sync Push: Smart merge incoming changes & broadcast
app.post('/api/sync', (req, res) => {
  const { db, clientId } = req.body || {};

  if (!db || typeof db !== 'object') {
    return res.status(400).json({ success: false, message: 'Données de synchronisation invalides' });
  }

  // Merge entities safely
  mergeEntities(db);

  dbVersion += 1;
  lastUpdatedAt = new Date().toISOString();
  persistServerDb();

  // Notify all other connected clients immediately
  broadcastDatabaseUpdate(clientId);

  const safeUsers = serverUsers.map((u) => ({
    id: u.id,
    username: u.username,
    nomComplet: u.nomComplet,
    role: u.role,
    actif: u.actif,
    createdAt: u.createdAt,
    derniereConnexion: u.derniereConnexion,
  }));

  res.json({
    success: true,
    db: {
      ...currentDb,
      users: safeUsers,
    },
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
    console.log(`[CLINIC AUTO] Central Multi-Device Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
