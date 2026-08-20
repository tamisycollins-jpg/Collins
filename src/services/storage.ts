import {
  Article,
  MouvementStock,
  Arrivage,
  Vente,
  LigneVente,
  Reglement,
  Inventaire,
  LigneInventaire,
  StatutLigneInventaire,
  Parametres,
  HistoriqueAction,
  DatabaseSchema,
  AuthUser,
  NetworkSyncStatus,
} from '../types';

const STORAGE_KEY = 'kospam_gestion_db_v1';
const AUTH_KEY = 'kospam_gestion_auth_user_v1';
const AUTH_TOKEN_KEY = 'kospam_gestion_auth_token_v1';
const DELETED_IDS_KEY = 'kospam_deleted_article_ids_v1';

// Unique client identifier per device/tab
const CLIENT_ID = typeof window !== 'undefined'
  ? 'client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now()
  : 'server_worker';

// Local multi-tab broadcast channel
let localBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    localBroadcastChannel = new BroadcastChannel('clinic_auto_multitab_sync');
    localBroadcastChannel.onmessage = (event) => {
      if (event?.data?.type === 'TAB_DB_UPDATED') {
        notifyListeners();
      }
    };
  } catch (e) {
    console.warn('BroadcastChannel not supported', e);
  }
}

export const DEFAULT_PARAMETRES: Parametres = {
  nomEntreprise: 'CLINIC AUTO',
  slogan: 'Dépôt & Distribution de Pièces Détachées',
  logoUrl: '',
  adresse: 'Madagascar',
  telephone: '+261 34 00 000 00',
  email: 'contact@clinicauto.mg',
  nifStat: '',
  devise: 'Ar',
  tauxCommissionDefaut: 10,
  seuilStockDefaut: 2,
  texteFacture: 'Merci pour votre confiance !',
  conditionsVente: 'Les marchandises vendues ne sont ni reprises ni échangées après 48h.',
};

const INITIAL_EMPTY_DB: DatabaseSchema = {
  articles: [],
  mouvements: [],
  arrivages: [],
  ventes: [],
  reglements: [],
  inventaires: [],
  parametres: DEFAULT_PARAMETRES,
  historique: [],
  lastInvoiceSequence: 0,
  lastArrivalSequence: 0,
  lastPaymentSequence: 0,
  lastInventorySequence: 0,
  version: '1.0.0',
};

// Network status listener
let currentNetworkStatus: NetworkSyncStatus = 'CONNECTE';
let lastSyncTimestamp: string = new Date().toISOString();

type NetworkStatusListener = (status: NetworkSyncStatus) => void;
const networkListeners: Set<NetworkStatusListener> = new Set();

export function getNetworkStatus(): NetworkSyncStatus {
  return currentNetworkStatus;
}

export function getNetworkSyncInfo() {
  return {
    status: currentNetworkStatus,
    lastSync: lastSyncTimestamp,
    clientId: CLIENT_ID,
    isSecured: true,
  };
}

export function subscribeToNetworkStatus(listener: NetworkStatusListener): () => void {
  networkListeners.add(listener);
  return () => {
    networkListeners.delete(listener);
  };
}

function updateNetworkStatus(status: NetworkSyncStatus) {
  if (currentNetworkStatus !== status) {
    currentNetworkStatus = status;
    networkListeners.forEach((l) => {
      try {
        l(status);
      } catch (e) {
        console.error(e);
      }
    });
  }
}

// Event listener mechanism for reactivity
type Listener = (db: DatabaseSchema) => void;
const listeners: Set<Listener> = new Set();

export function subscribeToDatabase(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  const currentDb = getDatabase();
  listeners.forEach((listener) => {
    try {
      listener(currentDb);
    } catch (err) {
      console.error('Error notifying database listener:', err);
    }
  });

  // Notify other browser tabs on same device
  try {
    localBroadcastChannel?.postMessage({ type: 'TAB_DB_UPDATED', timestamp: Date.now() });
  } catch {}
}

function getDeletedArticleIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addDeletedArticleId(id: string) {
  try {
    const current = getDeletedArticleIds();
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(current));
    }
  } catch {}
}

// Low-level read/write
export function getDatabase(): DatabaseSchema {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First boot: initialize empty DB
      saveDatabase(INITIAL_EMPTY_DB, false);
      return INITIAL_EMPTY_DB;
    }
    const parsed = JSON.parse(raw) as DatabaseSchema;
    // Ensure all arrays exist
    const dbResult: DatabaseSchema = {
      articles: Array.isArray(parsed.articles) ? parsed.articles : [],
      mouvements: Array.isArray(parsed.mouvements) ? parsed.mouvements : [],
      arrivages: Array.isArray(parsed.arrivages) ? parsed.arrivages : [],
      ventes: Array.isArray(parsed.ventes) ? parsed.ventes : [],
      reglements: Array.isArray(parsed.reglements) ? parsed.reglements : [],
      parametres: { ...DEFAULT_PARAMETRES, ...(parsed.parametres || {}) },
      historique: Array.isArray(parsed.historique) ? parsed.historique : [],
      lastInvoiceSequence: parsed.lastInvoiceSequence || 0,
      lastArrivalSequence: parsed.lastArrivalSequence || 0,
      lastPaymentSequence: parsed.lastPaymentSequence || 0,
      version: parsed.version || '1.0.0',
    };

    if (!dbResult.parametres.devise || dbResult.parametres.devise === 'FCFA') {
      dbResult.parametres.devise = 'Ar';
    }

    return dbResult;
  } catch (err) {
    console.error('Error loading database, returning empty DB:', err);
    return INITIAL_EMPTY_DB;
  }
}

let isSyncingToServer = false;

export function getAuthToken(): string {
  if (typeof localStorage === 'undefined') return 'token_clinic_auto_master_session_2026';
  return localStorage.getItem(AUTH_TOKEN_KEY) || 'token_clinic_auto_master_session_2026';
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-auth-user': 'Clinic Auto',
    'x-client-id': CLIENT_ID,
  };
}

export function saveDatabase(db: DatabaseSchema, triggerServerPush: boolean = true): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    notifyListeners();

    if (triggerServerPush && !isSyncingToServer) {
      pushToServerAsync(db);
    }
  } catch (err) {
    console.error('Error saving database to localStorage:', err);
    throw new Error('Erreur lors de la sauvegarde locale.');
  }
}

// Push local data to the central network server
async function pushToServerAsync(db: DatabaseSchema) {
  try {
    isSyncingToServer = true;
    updateNetworkStatus('SYNCHRONISATION');

    const deletedArticleIds = getDeletedArticleIds();
    const payload = {
      db: {
        ...db,
        deletedArticleIds,
      },
      clientId: CLIENT_ID,
    };

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.db) {
        lastSyncTimestamp = new Date().toISOString();
        const localCurrent = localStorage.getItem(STORAGE_KEY);
        const serverJson = JSON.stringify(data.db);
        if (localCurrent !== serverJson) {
          localStorage.setItem(STORAGE_KEY, serverJson);
          notifyListeners();
        }
      }
      updateNetworkStatus('CONNECTE');
    } else {
      updateNetworkStatus('HORS_LIGNE');
    }
  } catch (err) {
    updateNetworkStatus('HORS_LIGNE');
  } finally {
    isSyncingToServer = false;
  }
}

// Pull latest data from central server and merge intelligently
export async function pullDatabaseFromServer(): Promise<boolean> {
  try {
    const res = await fetch('/api/sync', {
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      updateNetworkStatus('HORS_LIGNE');
      return false;
    }

    const json = await res.json();
    if (json && json.db) {
      const serverDb = json.db as DatabaseSchema;
      const localRaw = localStorage.getItem(STORAGE_KEY);
      const serverRaw = JSON.stringify(serverDb);

      lastSyncTimestamp = new Date().toISOString();

      if (localRaw !== serverRaw) {
        localStorage.setItem(STORAGE_KEY, serverRaw);
        notifyListeners();
      }

      updateNetworkStatus('CONNECTE');
      return true;
    }
    return false;
  } catch (err) {
    updateNetworkStatus('HORS_LIGNE');
    return false;
  }
}

// Initialize background network sync & SSE push listener
let eventSource: EventSource | null = null;
let syncInterval: any = null;

export function startNetworkAutoSync() {
  if (typeof window === 'undefined') return;

  // 1. Initial pull
  pullDatabaseFromServer();

  // 2. Setup Server-Sent Events (SSE) for 0-second instant synchronization
  if (typeof EventSource !== 'undefined' && !eventSource) {
    try {
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        updateNetworkStatus('CONNECTE');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'DB_UPDATED') {
            // Update originated from another device/tab -> pull immediately
            if (data.sourceClientId !== CLIENT_ID) {
              pullDatabaseFromServer();
            }
          }
        } catch (e) {
          console.error('SSE parse error', e);
        }
      };

      eventSource.onerror = () => {
        // EventSource will auto-reconnect; fallback polling ensures updates
      };
    } catch (e) {
      console.warn('Failed to start EventSource', e);
    }
  }

  // 3. Fallback Periodic Polling (every 2.5 seconds)
  if (!syncInterval) {
    syncInterval = setInterval(() => {
      pullDatabaseFromServer();
    }, 2500);
  }

  // 4. Sync on window focus / tab visibility / online
  window.addEventListener('focus', () => pullDatabaseFromServer());
  window.addEventListener('online', () => pullDatabaseFromServer());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pullDatabaseFromServer();
    }
  });
}

// ==========================================
// AUTHENTICATION MANAGEMENT
// ==========================================
export function getCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isUserLoggedIn(): boolean {
  return !!getCurrentUser();
}

export async function loginUser(username: string, password: string): Promise<{ success: boolean; user?: AuthUser; message?: string }> {
  const cleanUser = String(username || '').trim();
  const cleanPass = String(password || '').trim();

  // Try API first
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUser, password: cleanPass }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
        if (data.token) {
          localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        }
        await pullDatabaseFromServer();
        return { success: true, user: data.user };
      }
    }
  } catch (err) {
    console.warn('Backend login unavailable, fallback to local verification', err);
  }

  // Local / Offline fallback verification for requested credentials:
  // NOM: Clinic Auto
  // MDP: Clinic auto123
  const isMatchUser = cleanUser.toLowerCase() === 'clinic auto';
  const isMatchPass = cleanPass === 'Clinic auto123' || cleanPass.toLowerCase() === 'clinic auto123';

  if (isMatchUser && isMatchPass) {
    const user: AuthUser = {
      id: 'usr_clinic_auto',
      username: 'Clinic Auto',
      role: 'ADMIN',
      loginTime: new Date().toISOString(),
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    localStorage.setItem(AUTH_TOKEN_KEY, 'token_clinic_auto_master_session_2026');
    pullDatabaseFromServer();
    return { success: true, user };
  }

  return {
    success: false,
    message: 'Identifiant ou mot de passe incorrect. (Ex: Clinic Auto / Clinic auto123)',
  };
}

export function logoutUser(): void {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

// Generate unique sequential IDs
function getNextInvoiceNumber(db: DatabaseSchema): { invoiceNumber: string; newSeq: number } {
  const currentYear = new Date().getFullYear();
  const nextSeq = (db.lastInvoiceSequence || 0) + 1;
  const seqStr = String(nextSeq).padStart(6, '0');
  const invoiceNumber = `FAC-${currentYear}-${seqStr}`;
  return { invoiceNumber, newSeq: nextSeq };
}

function getNextArrivalNumber(db: DatabaseSchema): { arrivalNumber: string; newSeq: number } {
  const currentYear = new Date().getFullYear();
  const nextSeq = (db.lastArrivalSequence || 0) + 1;
  const seqStr = String(nextSeq).padStart(4, '0');
  const arrivalNumber = `ARR-${currentYear}-${seqStr}`;
  return { arrivalNumber, newSeq: nextSeq };
}

function getNextPaymentNumber(db: DatabaseSchema): { paymentNumber: string; newSeq: number } {
  const currentYear = new Date().getFullYear();
  const nextSeq = (db.lastPaymentSequence || 0) + 1;
  const seqStr = String(nextSeq).padStart(6, '0');
  const paymentNumber = `REG-${currentYear}-${seqStr}`;
  return { paymentNumber, newSeq: nextSeq };
}

export function getNextInventoryNumber(db: DatabaseSchema): { inventoryNumber: string; newSeq: number } {
  const currentYear = new Date().getFullYear();
  const nextSeq = (db.lastInventorySequence || db.inventaires?.length || 0) + 1;
  const seqStr = String(nextSeq).padStart(6, '0');
  const inventoryNumber = `INV-${currentYear}-${seqStr}`;
  return { inventoryNumber, newSeq: nextSeq };
}

function generateUUID(): string {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

// ==========================================
// ARTICLES MANAGEMENT
// ==========================================

export function addArticle(data: {
  reference: string;
  designation: string;
  affectation: string;
  prixVente: number;
  stockInitial: number;
  seuilMin?: number;
  codeBarre?: string;
}): Article {
  const db = getDatabase();
  const cleanRef = data.reference.trim().toUpperCase();

  // Check unique reference (case insensitive)
  const existing = db.articles.find(
    (a) => a.reference.trim().toUpperCase() === cleanRef
  );
  if (existing) {
    throw new Error('Cette référence existe déjà.');
  }

  if (!cleanRef) throw new Error('La référence est obligatoire.');
  if (!data.designation.trim()) throw new Error('La désignation est obligatoire.');
  if (data.prixVente < 0) throw new Error('Le prix de vente doit être positif.');
  const initialQty = Math.max(0, Number(data.stockInitial) || 0);
  const minThreshold = data.seuilMin !== undefined ? Number(data.seuilMin) : db.parametres.seuilStockDefaut;

  const now = new Date().toISOString();
  const newArticle: Article = {
    id: generateUUID(),
    reference: cleanRef,
    designation: data.designation.trim(),
    affectation: data.affectation.trim(),
    prixVente: Number(data.prixVente) || 0,
    stockActuel: initialQty,
    seuilMin: Math.max(0, minThreshold),
    codeBarre: data.codeBarre ? data.codeBarre.trim() : undefined,
    status: 'ACTIF',
    createdAt: now,
    updatedAt: now,
  };

  db.articles.push(newArticle);

  // If initial stock > 0, record initial stock movement
  if (initialQty > 0) {
    const mouvement: MouvementStock = {
      id: generateUUID(),
      articleId: newArticle.id,
      articleReference: newArticle.reference,
      articleDesignation: newArticle.designation,
      type: 'INITIAL',
      quantite: initialQty,
      stockAvant: 0,
      stockApres: initialQty,
      date: now,
      motif: 'Stock initial à la création',
    };
    db.mouvements.push(mouvement);
  }

  // History log
  db.historique.push({
    id: generateUUID(),
    date: now,
    typeAction: 'CREATION',
    description: `Création article ${newArticle.reference} - ${newArticle.designation} (Stock initial: ${initialQty})`,
  });

  saveDatabase(db);
  return newArticle;
}

export function updateArticle(
  id: string,
  data: {
    designation?: string;
    affectation?: string;
    prixVente?: number;
    seuilMin?: number;
    codeBarre?: string;
    status?: 'ACTIF' | 'INACTIF';
  }
): Article {
  const db = getDatabase();
  const articleIndex = db.articles.findIndex((a) => a.id === id);
  if (articleIndex === -1) throw new Error('Article non trouvé.');

  const existing = db.articles[articleIndex];
  const now = new Date().toISOString();

  const updated: Article = {
    ...existing,
    designation: data.designation !== undefined ? data.designation.trim() : existing.designation,
    affectation: data.affectation !== undefined ? data.affectation.trim() : existing.affectation,
    prixVente: data.prixVente !== undefined ? Number(data.prixVente) : existing.prixVente,
    seuilMin: data.seuilMin !== undefined ? Number(data.seuilMin) : existing.seuilMin,
    codeBarre: data.codeBarre !== undefined ? (data.codeBarre.trim() ? data.codeBarre.trim() : undefined) : existing.codeBarre,
    status: data.status !== undefined ? data.status : existing.status,
    updatedAt: now,
  };

  db.articles[articleIndex] = updated;

  db.historique.push({
    id: generateUUID(),
    date: now,
    typeAction: 'MODIFICATION',
    description: `Modification article ${updated.reference} (${updated.designation})`,
  });

  saveDatabase(db);
  return updated;
}

export function deleteArticle(id: string): { success: boolean; reference: string; designation: string } {
  const db = getDatabase();
  const articleIndex = db.articles.findIndex((a) => a.id === id);
  if (articleIndex === -1) throw new Error('Article non trouvé.');

  const article = db.articles[articleIndex];
  const now = new Date().toISOString();

  // Remove article permanently from db.articles
  db.articles.splice(articleIndex, 1);
  addDeletedArticleId(id);

  // Add deletion log to history
  db.historique.push({
    id: generateUUID(),
    date: now,
    typeAction: 'SUPPRESSION',
    description: `Suppression définitive de l'article ${article.reference} (${article.designation})`,
  });

  saveDatabase(db);
  return { success: true, reference: article.reference, designation: article.designation };
}

// ==========================================
// ARRIVAGES MANAGEMENT
// ==========================================

export function addArrivage(data: {
  articleId: string;
  quantite: number;
  date?: string;
  remarque?: string;
}): Arrivage {
  const db = getDatabase();
  const article = db.articles.find((a) => a.id === data.articleId);
  if (!article) throw new Error('Article sélectionné introuvable.');

  const qty = Number(data.quantite);
  if (!qty || qty <= 0) {
    throw new Error('La quantité reçue doit être strictement supérieure à 0.');
  }

  const { arrivalNumber, newSeq } = getNextArrivalNumber(db);
  db.lastArrivalSequence = newSeq;

  const now = data.date || new Date().toISOString();
  const stockAvant = article.stockActuel;
  const stockApres = stockAvant + qty;

  const arrivage: Arrivage = {
    id: generateUUID(),
    numeroArrivage: arrivalNumber,
    articleId: article.id,
    articleReference: article.reference,
    articleDesignation: article.designation,
    quantite: qty,
    date: now,
    remarque: data.remarque?.trim(),
    createdAt: new Date().toISOString(),
  };

  // Update article stock
  article.stockActuel = stockApres;
  article.updatedAt = new Date().toISOString();

  // Create movement record
  const mouvement: MouvementStock = {
    id: generateUUID(),
    articleId: article.id,
    articleReference: article.reference,
    articleDesignation: article.designation,
    type: 'ARRIVAGE',
    quantite: qty,
    stockAvant,
    stockApres,
    date: now,
    motif: data.remarque ? `Arrivage ${arrivalNumber}: ${data.remarque}` : `Arrivage ${arrivalNumber}`,
    referenceDoc: arrivalNumber,
  };

  db.arrivages.unshift(arrivage);
  db.mouvements.unshift(mouvement);

  db.historique.push({
    id: generateUUID(),
    date: new Date().toISOString(),
    typeAction: 'ARRIVAGE',
    description: `Arrivage de ${qty}x ${article.reference} (${arrivalNumber}) - Nouveau stock: ${stockApres}`,
  });

  saveDatabase(db);
  return arrivage;
}

// ==========================================
// VENTES MANAGEMENT
// ==========================================

export interface LigneVenteInput {
  articleId: string;
  quantite: number;
  prixUnitaire?: number; // fallback to article current price
}

export function createVente(data: {
  lignes: LigneVenteInput[];
  clientNom?: string;
  clientTelephone?: string;
  tauxCommission?: number;
  montantPayeClient?: number;
  date?: string;
  notes?: string;
}): Vente {
  const db = getDatabase();

  if (!data.lignes || data.lignes.length === 0) {
    throw new Error('La vente doit contenir au moins un article.');
  }

  // 1. Validate each line and check stock
  const validatedLines: LigneVente[] = [];
  const articlesToUpdate: { article: Article; newStock: number; qty: number }[] = [];

  for (const item of data.lignes) {
    const article = db.articles.find((a) => a.id === item.articleId);
    if (!article) {
      throw new Error(`Article introuvable pour la ligne.`);
    }

    const qty = Number(item.quantite);
    if (!qty || qty <= 0) {
      throw new Error(`Quantité invalide pour l'article ${article.reference}.`);
    }

    // STRICT STOCK CHECK
    if (article.stockActuel < qty) {
      throw new Error(
        `Stock insuffisant pour ${article.designation} (${article.reference}). Stock disponible : ${article.stockActuel}.`
      );
    }

    const unitPrice = item.prixUnitaire !== undefined ? Number(item.prixUnitaire) : article.prixVente;
    const lineTotal = qty * unitPrice;

    validatedLines.push({
      id: generateUUID(),
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

  // 2. Generate Invoice Number (FAC-YYYY-000001)
  const { invoiceNumber, newSeq } = getNextInvoiceNumber(db);
  db.lastInvoiceSequence = newSeq;

  const saleDate = data.date || new Date().toISOString();
  const commissionRate = data.tauxCommission !== undefined ? Number(data.tauxCommission) : db.parametres.tauxCommissionDefaut;

  const totalVente = validatedLines.reduce((sum, l) => sum + l.totalLigne, 0);
  const commissionGeneree = Math.round(totalVente * (commissionRate / 100));
  const partFournisseur = totalVente - commissionGeneree; // Exact remaining (usually 90%)

  const montantPaye = data.montantPayeClient !== undefined ? Number(data.montantPayeClient) : totalVente;
  const resteAPayer = Math.max(0, totalVente - montantPaye);

  const newVente: Vente = {
    id: generateUUID(),
    numeroFacture: invoiceNumber,
    date: saleDate,
    clientNom: data.clientNom?.trim(),
    clientTelephone: data.clientTelephone?.trim(),
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
    notes: data.notes?.trim(),
    createdAt: new Date().toISOString(),
  };

  // 3. Atomically update articles stock and create movement logs
  for (const item of articlesToUpdate) {
    const stockAvant = item.article.stockActuel;
    item.article.stockActuel = item.newStock;
    item.article.updatedAt = new Date().toISOString();

    const mouvement: MouvementStock = {
      id: generateUUID(),
      articleId: item.article.id,
      articleReference: item.article.reference,
      articleDesignation: item.article.designation,
      type: 'VENTE',
      quantite: -item.qty,
      stockAvant,
      stockApres: item.newStock,
      date: saleDate,
      motif: `Vente ${invoiceNumber}`,
      referenceDoc: invoiceNumber,
    };
    db.mouvements.unshift(mouvement);
  }

  // 4. Save sale
  db.ventes.unshift(newVente);

  db.historique.push({
    id: generateUUID(),
    date: new Date().toISOString(),
    typeAction: 'VENTE',
    description: `Nouvelle vente ${invoiceNumber} - Total: ${totalVente} ${db.parametres.devise}`,
  });

  saveDatabase(db);
  return newVente;
}

export async function createVenteOnlineAtomic(data: {
  lignes: LigneVenteInput[];
  clientNom?: string;
  clientTelephone?: string;
  tauxCommission?: number;
  montantPayeClient?: number;
  date?: string;
  notes?: string;
}): Promise<Vente> {
  // 1. Try atomic server-side transaction first
  try {
    const res = await fetch('/api/transactions/sale', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...data,
        clientId: CLIENT_ID,
      }),
    });

    if (res.ok) {
      const result = await res.json();
      if (result && result.vente) {
        // Update local database cache with response
        if (result.db) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(result.db));
          notifyListeners();
        }
        return result.vente;
      }
    } else {
      const errJson = await res.json().catch(() => null);
      if (errJson && errJson.message) {
        throw new Error(errJson.message);
      }
    }
  } catch (netErr: any) {
    if (netErr.message && netErr.message.includes('Stock insuffisant')) {
      throw netErr;
    }
    console.warn('Direct server atomic sale failed, falling back to local engine + auto-push', netErr);
  }

  // 2. Offline fallback (or if server is unreachable)
  return createVente(data);
}

// ==========================================
// ANNULATION DE VENTE
// ==========================================

export function annulerVente(venteId: string, motif?: string): Vente {
  const db = getDatabase();
  const vente = db.ventes.find((v) => v.id === venteId);
  if (!vente) throw new Error('Vente introuvable.');

  if (vente.status === 'ANNULEE') {
    throw new Error('Cette vente est déjà annulée.');
  }

  const now = new Date().toISOString();
  vente.status = 'ANNULEE';
  vente.annuleeAt = now;
  vente.annuleeMotif = motif?.trim() || 'Annulation manuelle par l’utilisateur';

  // Replenish stock for all items
  for (const ligne of vente.lignes) {
    const article = db.articles.find((a) => a.id === ligne.articleId);
    if (article) {
      const stockAvant = article.stockActuel;
      const stockApres = stockAvant + ligne.quantite;
      article.stockActuel = stockApres;
      article.updatedAt = now;

      const mouvement: MouvementStock = {
        id: generateUUID(),
        articleId: article.id,
        articleReference: article.reference,
        articleDesignation: article.designation,
        type: 'ANNULATION_VENTE',
        quantite: ligne.quantite,
        stockAvant,
        stockApres,
        date: now,
        motif: `Annulation vente ${vente.numeroFacture}${motif ? ` (${motif})` : ''}`,
        referenceDoc: vente.numeroFacture,
      };
      db.mouvements.unshift(mouvement);
    }
  }

  db.historique.push({
    id: generateUUID(),
    date: now,
    typeAction: 'ANNULATION',
    description: `Annulation de la vente ${vente.numeroFacture} - Remise en stock effectuée.`,
  });

  saveDatabase(db);
  return vente;
}

// ==========================================
// REGLEMENTS MANAGEMENT
// ==========================================

export function addReglement(data: {
  typePartie: 'COMMISSION' | 'FOURNISSEUR' | 'CLIENT';
  modePaiement: 'ESPECES' | 'MVOLA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY' | 'VIREMENT' | 'CHEQUE';
  montant: number;
  remarque?: string;
  venteId?: string;
  ventesIds?: string[];
  pieceJustificative?: string;
  date?: string;
}): Reglement {
  const db = getDatabase();
  const montant = Number(data.montant);
  if (!montant || montant <= 0) {
    throw new Error('Le montant du règlement doit être strictement positif.');
  }

  const { paymentNumber, newSeq } = getNextPaymentNumber(db);
  db.lastPaymentSequence = newSeq;

  const now = data.date || new Date().toISOString();

  const reglement: Reglement = {
    id: generateUUID(),
    numeroReglement: paymentNumber,
    date: now,
    typePartie: data.typePartie,
    modePaiement: data.modePaiement,
    montant,
    remarque: data.remarque?.trim(),
    venteId: data.venteId,
    ventesIds: data.ventesIds,
    pieceJustificative: data.pieceJustificative?.trim(),
    createdAt: new Date().toISOString(),
  };

  // If linked to a single sale, update the sale specific balances
  if (data.venteId) {
    const sale = db.ventes.find((v) => v.id === data.venteId);
    if (sale && sale.status !== 'ANNULEE') {
      if (data.typePartie === 'CLIENT') {
        sale.montantPayeClient = (sale.montantPayeClient || 0) + montant;
        sale.resteAPayerClient = Math.max(0, sale.totalVente - sale.montantPayeClient);
      } else if (data.typePartie === 'COMMISSION') {
        sale.commissionRecue = (sale.commissionRecue || 0) + montant;
        sale.commissionRestante = Math.max(0, sale.commissionGeneree - sale.commissionRecue);
      } else if (data.typePartie === 'FOURNISSEUR') {
        sale.fournisseurVerse = (sale.fournisseurVerse || 0) + montant;
        sale.fournisseurRestant = Math.max(0, sale.partFournisseur - sale.fournisseurVerse);
      }
    }
  }

  db.reglements.unshift(reglement);

  db.historique.push({
    id: generateUUID(),
    date: new Date().toISOString(),
    typeAction: 'REGLEMENT',
    description: `Règlement ${paymentNumber} (${data.typePartie}) de ${montant} ${db.parametres.devise}`,
  });

  saveDatabase(db);
  return reglement;
}

// ==========================================
// INVENTAIRES PHYSIQUES MANAGEMENT
// ==========================================

export function computeInventaireMetrics(lignes: LigneInventaire[]): {
  nbArticlesTotal: number;
  nbArticlesComptes: number;
  nbArticlesNonComptes: number;
  nbArticlesConformes: number;
  nbArticlesAvecEcart: number;
  totalQuantiteManquante: number;
  totalQuantiteSurplus: number;
  valeurManquants: number;
  valeurSurplus: number;
  valeurEcartNet: number;
} {
  let nbArticlesComptes = 0;
  let nbArticlesConformes = 0;
  let nbArticlesAvecEcart = 0;
  let totalQuantiteManquante = 0;
  let totalQuantiteSurplus = 0;
  let valeurManquants = 0;
  let valeurSurplus = 0;

  for (const ligne of lignes) {
    if (ligne.stockReel !== null && ligne.stockReel !== undefined) {
      nbArticlesComptes++;
      const ecart = ligne.ecart ?? (ligne.stockReel - ligne.stockVirtuel);
      const val = Math.abs(ecart * (ligne.prixVente || 0));

      if (ecart > 0) {
        nbArticlesAvecEcart++;
        totalQuantiteSurplus += ecart;
        valeurSurplus += val;
      } else if (ecart < 0) {
        nbArticlesAvecEcart++;
        totalQuantiteManquante += ecart;
        valeurManquants += val;
      } else {
        nbArticlesConformes++;
      }
    }
  }

  return {
    nbArticlesTotal: lignes.length,
    nbArticlesComptes,
    nbArticlesNonComptes: lignes.length - nbArticlesComptes,
    nbArticlesConformes,
    nbArticlesAvecEcart,
    totalQuantiteManquante,
    totalQuantiteSurplus,
    valeurManquants,
    valeurSurplus,
    valeurEcartNet: valeurSurplus - valeurManquants,
  };
}

export function createInventaireDraft(options?: {
  utilisateur?: string;
  notes?: string;
  articleIds?: string[];
}): Inventaire {
  const db = getDatabase();
  const { inventoryNumber, newSeq } = getNextInventoryNumber(db);
  db.lastInventorySequence = newSeq;

  const currentUser = getCurrentUser();
  const user = options?.utilisateur || currentUser?.username || 'Clinic Auto';
  const now = new Date().toISOString();

  // Snapshot active articles
  const candidateArticles = db.articles.filter((a) => {
    if (a.status !== 'ACTIF') return false;
    if (options?.articleIds && options.articleIds.length > 0) {
      return options.articleIds.includes(a.id);
    }
    return true;
  });

  const lignes: LigneInventaire[] = candidateArticles.map((art) => ({
    id: generateUUID(),
    articleId: art.id,
    reference: art.reference,
    designation: art.designation,
    affectation: art.affectation || '',
    codeBarre: art.codeBarre || '',
    prixVente: art.prixVente || 0,
    stockVirtuel: art.stockActuel,
    stockReel: null, // Non compté initialement
    ecart: null,
    statut: 'NON_COMPTE',
    valeurEcart: 0,
  }));

  const metrics = computeInventaireMetrics(lignes);

  const inventaire: Inventaire = {
    id: generateUUID(),
    numeroInventaire: inventoryNumber,
    date: now,
    utilisateur: user,
    status: 'EN_COURS',
    lignes,
    ...metrics,
    notes: options?.notes || '',
    createdAt: now,
    updatedAt: now,
  };

  if (!Array.isArray(db.inventaires)) {
    db.inventaires = [];
  }

  db.inventaires.unshift(inventaire);

  db.historique.push({
    id: generateUUID(),
    date: now,
    typeAction: 'CREATION',
    description: `Ouverture de l’inventaire physique ${inventoryNumber} (${lignes.length} articles) par ${user}`,
  });

  saveDatabase(db);

  // Sync draft to server in background
  try {
    fetch('/api/transactions/inventory/save-draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ inventaire, clientId: CLIENT_ID }),
    }).catch(() => {});
  } catch {}

  return inventaire;
}

export function saveInventaireDraft(
  inventaireId: string,
  lignes: LigneInventaire[],
  notes?: string
): Inventaire {
  const db = getDatabase();
  if (!Array.isArray(db.inventaires)) {
    db.inventaires = [];
  }

  const inventaire = db.inventaires.find((inv) => inv.id === inventaireId);
  if (!inventaire) {
    throw new Error('Inventaire introuvable.');
  }

  if (inventaire.status === 'VALIDE') {
    throw new Error('Cet inventaire est déjà validé et ne peut plus être modifié.');
  }

  const metrics = computeInventaireMetrics(lignes);
  const now = new Date().toISOString();

  inventaire.lignes = lignes;
  inventaire.nbArticlesTotal = metrics.nbArticlesTotal;
  inventaire.nbArticlesComptes = metrics.nbArticlesComptes;
  inventaire.nbArticlesNonComptes = metrics.nbArticlesNonComptes;
  inventaire.nbArticlesConformes = metrics.nbArticlesConformes;
  inventaire.nbArticlesAvecEcart = metrics.nbArticlesAvecEcart;
  inventaire.totalQuantiteManquante = metrics.totalQuantiteManquante;
  inventaire.totalQuantiteSurplus = metrics.totalQuantiteSurplus;
  inventaire.valeurManquants = metrics.valeurManquants;
  inventaire.valeurSurplus = metrics.valeurSurplus;
  inventaire.valeurEcartNet = metrics.valeurEcartNet;
  if (notes !== undefined) inventaire.notes = notes;
  inventaire.updatedAt = now;

  saveDatabase(db);

  // Sync draft with backend
  try {
    fetch('/api/transactions/inventory/save-draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ inventaire, clientId: CLIENT_ID }),
    }).catch(() => {});
  } catch {}

  return inventaire;
}

export async function validateInventaire(
  inventaireId: string,
  options?: { utilisateur?: string; notes?: string; lignes?: LigneInventaire[] }
): Promise<Inventaire> {
  const currentUser = getCurrentUser();
  const user = options?.utilisateur || currentUser?.username || 'Clinic Auto';

  // 1. Attempt atomic server-side validation first
  try {
    const res = await fetch('/api/transactions/inventory/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        inventaireId,
        lignes: options?.lignes,
        notes: options?.notes,
        clientId: CLIENT_ID,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.inventaire) {
        if (data.db) {
          saveDatabase(data.db);
        } else {
          await pullDatabaseFromServer();
        }
        return data.inventaire;
      }
    } else if (res.status === 409) {
      const errData = await res.json();
      throw new Error(errData.message || 'Cet inventaire a déjà été validé.');
    }
  } catch (err: any) {
    if (err.message && err.message.includes('déjà été validé')) {
      throw err;
    }
    console.warn('Direct server inventory validation fallback to local execution', err);
  }

  // 2. Local / Offline execution fallback
  const db = getDatabase();
  if (!Array.isArray(db.inventaires)) {
    db.inventaires = [];
  }

  const inventaire = db.inventaires.find((inv) => inv.id === inventaireId);
  if (!inventaire) {
    throw new Error('Inventaire introuvable.');
  }

  if (inventaire.status === 'VALIDE') {
    throw new Error('Cet inventaire a déjà été validé.');
  }

  const linesToProcess = options?.lignes || inventaire.lignes;
  const now = new Date().toISOString();

  let nbArticlesComptes = 0;
  let nbArticlesConformes = 0;
  let nbArticlesAvecEcart = 0;
  let totalQuantiteManquante = 0;
  let totalQuantiteSurplus = 0;
  let valeurManquants = 0;
  let valeurSurplus = 0;

  const processedLignes: LigneInventaire[] = [];

  for (const item of linesToProcess) {
    const article = db.articles.find((a) => a.id === item.articleId);
    if (!article) {
      processedLignes.push(item);
      continue;
    }

    const isCounted = item.stockReel !== null && item.stockReel !== undefined && !isNaN(Number(item.stockReel));
    if (!isCounted) {
      // NON COMPTÉ: stock is untouched!
      processedLignes.push({
        ...item,
        stockVirtuel: article.stockActuel,
        stockReel: null,
        ecart: null,
        statut: 'NON_COMPTE',
        valeurEcart: 0,
      });
      continue;
    }

    const realStock = Number(item.stockReel);
    if (realStock < 0) {
      throw new Error(`La quantité réelle ne peut pas être négative pour "${article.designation}".`);
    }

    nbArticlesComptes++;
    const virtualStock = article.stockActuel;
    const ecart = realStock - virtualStock;
    const unitPrice = item.prixVente || article.prixVente || 0;
    const valeurEcart = ecart * unitPrice;

    let statut: StatutLigneInventaire = 'CONFORME';
    if (ecart > 0) {
      statut = 'SURPLUS';
      nbArticlesAvecEcart++;
      totalQuantiteSurplus += ecart;
      valeurSurplus += Math.abs(valeurEcart);
    } else if (ecart < 0) {
      statut = 'MANQUANT';
      nbArticlesAvecEcart++;
      totalQuantiteManquante += ecart;
      valeurManquants += Math.abs(valeurEcart);
    } else {
      statut = 'CONFORME';
      nbArticlesConformes++;
    }

    processedLignes.push({
      ...item,
      stockVirtuel: virtualStock,
      stockReel: realStock,
      ecart,
      statut,
      valeurEcart,
    });

    // If écart, adjust article stock and record AJUSTEMENT_INVENTAIRE movement
    if (ecart !== 0) {
      const stockAvant = article.stockActuel;
      article.stockActuel = realStock;
      article.updatedAt = now;

      const mvt: MouvementStock = {
        id: generateUUID(),
        articleId: article.id,
        articleReference: article.reference,
        articleDesignation: article.designation,
        type: 'AJUSTEMENT_INVENTAIRE',
        quantite: ecart,
        stockAvant,
        stockApres: realStock,
        date: now,
        motif: `Ajustement ${inventaire.numeroInventaire} (${ecart > 0 ? '+' : ''}${ecart}) par ${user}`,
        referenceDoc: inventaire.numeroInventaire,
      };
      db.mouvements.unshift(mvt);
    }
  }

  // Update Inventory State
  inventaire.status = 'VALIDE';
  inventaire.valideAt = now;
  inventaire.validePar = user;
  inventaire.lignes = processedLignes;
  inventaire.nbArticlesTotal = processedLignes.length;
  inventaire.nbArticlesComptes = nbArticlesComptes;
  inventaire.nbArticlesNonComptes = processedLignes.length - nbArticlesComptes;
  inventaire.nbArticlesConformes = nbArticlesConformes;
  inventaire.nbArticlesAvecEcart = nbArticlesAvecEcart;
  inventaire.totalQuantiteManquante = totalQuantiteManquante;
  inventaire.totalQuantiteSurplus = totalQuantiteSurplus;
  inventaire.valeurManquants = valeurManquants;
  inventaire.valeurSurplus = valeurSurplus;
  inventaire.valeurEcartNet = valeurSurplus - valeurManquants;
  if (options?.notes) inventaire.notes = options.notes;

  db.historique.push({
    id: generateUUID(),
    date: now,
    typeAction: 'MODIFICATION',
    description: `Inventaire ${inventaire.numeroInventaire} validé par ${user} (${nbArticlesComptes} comptés, ${nbArticlesAvecEcart} ajustés, net: ${valeurSurplus - valeurManquants} ${db.parametres.devise})`,
  });

  saveDatabase(db);
  return inventaire;
}

export function deleteInventaireDraft(inventaireId: string): void {
  const db = getDatabase();
  if (!Array.isArray(db.inventaires)) return;

  const inv = db.inventaires.find((i) => i.id === inventaireId);
  if (!inv) return;

  if (inv.status === 'VALIDE') {
    throw new Error('Impossible de supprimer un inventaire déjà validé.');
  }

  db.inventaires = db.inventaires.filter((i) => i.id !== inventaireId);
  db.historique.push({
    id: generateUUID(),
    date: new Date().toISOString(),
    typeAction: 'SUPPRESSION',
    description: `Suppression du brouillon d’inventaire ${inv.numeroInventaire}`,
  });

  saveDatabase(db);
}

// ==========================================
// PARAMETRES & BACKUP
// ==========================================

export function updateParametres(data: Partial<Parametres>): Parametres {
  const db = getDatabase();
  db.parametres = {
    ...db.parametres,
    ...data,
  };
  saveDatabase(db);
  return db.parametres;
}

export function exportBackupJSON(): string {
  const db = getDatabase();
  return JSON.stringify(db, null, 2);
}

export function importBackupJSON(jsonString: string): { success: boolean; message: string; countArticles: number } {
  try {
    const parsed = JSON.parse(jsonString) as DatabaseSchema;
    if (!parsed || !Array.isArray(parsed.articles)) {
      throw new Error('Format de fichier de sauvegarde invalide.');
    }

    const validatedDb: DatabaseSchema = {
      articles: parsed.articles || [],
      mouvements: parsed.mouvements || [],
      arrivages: parsed.arrivages || [],
      ventes: parsed.ventes || [],
      reglements: parsed.reglements || [],
      parametres: { ...DEFAULT_PARAMETRES, ...(parsed.parametres || {}) },
      historique: parsed.historique || [],
      lastInvoiceSequence: parsed.lastInvoiceSequence || parsed.ventes?.length || 0,
      lastArrivalSequence: parsed.lastArrivalSequence || parsed.arrivages?.length || 0,
      lastPaymentSequence: parsed.lastPaymentSequence || parsed.reglements?.length || 0,
      version: parsed.version || '1.0.0',
    };

    validatedDb.historique.push({
      id: generateUUID(),
      date: new Date().toISOString(),
      typeAction: 'RESTAURATION',
      description: `Restauration complète de la base de données (${validatedDb.articles.length} articles).`,
    });

    saveDatabase(validatedDb);
    return {
      success: true,
      message: 'Restauration réussie.',
      countArticles: validatedDb.articles.length,
    };
  } catch (err: any) {
    console.error('Import error:', err);
    throw new Error(err.message || 'Impossible de lire le fichier de sauvegarde.');
  }
}

export function resetDatabase(): void {
  saveDatabase(INITIAL_EMPTY_DB);
}
