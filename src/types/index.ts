export interface Article {
  id: string;
  reference: string; // Unique
  designation: string;
  affectation: string; // Véhicule / modèle
  prixVente: number;
  stockActuel: number;
  seuilMin: number;
  codeBarre?: string; // Code-barres / EAN / SKU pour scanner
  status: 'ACTIF' | 'INACTIF';
  createdAt: string;
  updatedAt: string;
}

export type MouvementType = 
  | 'INITIAL' 
  | 'ARRIVAGE' 
  | 'VENTE' 
  | 'ANNULATION_VENTE' 
  | 'AJUSTEMENT';

export interface MouvementStock {
  id: string;
  articleId: string;
  articleReference: string;
  articleDesignation: string;
  type: MouvementType;
  quantite: number; // Positive or negative
  stockAvant: number;
  stockApres: number;
  date: string;
  motif?: string;
  referenceDoc?: string; // e.g. FAC-2026-000001 or ARR-2026-0001
}

export interface Arrivage {
  id: string;
  numeroArrivage: string;
  articleId: string;
  articleReference: string;
  articleDesignation: string;
  quantite: number;
  date: string;
  remarque?: string;
  createdAt: string;
}

export interface LigneVente {
  id: string;
  articleId: string;
  reference: string;
  designation: string;
  affectation: string;
  quantite: number;
  prixUnitaire: number;
  totalLigne: number;
}

export interface LigneVenteInput {
  articleId: string;
  quantite: number;
  prixUnitaire?: number;
}

export type VenteStatus = 'VALIDEE' | 'ANNULEE';

export interface Vente {
  id: string;
  numeroFacture: string; // e.g. FAC-2026-000001
  date: string;
  clientNom?: string;
  clientTelephone?: string;
  status: VenteStatus;
  tauxCommission: number; // percentage, e.g. 10
  totalVente: number;
  commissionGeneree: number; // totalVente * (tauxCommission / 100)
  partFournisseur: number; // totalVente * (1 - tauxCommission / 100)
  montantPayeClient: number;
  resteAPayerClient: number;
  
  // Reglements trackings for this sale (if linked directly)
  commissionRecue: number;
  commissionRestante: number;
  fournisseurVerse: number;
  fournisseurRestant: number;

  lignes: LigneVente[];
  notes?: string;
  createdAt: string;
  annuleeAt?: string;
  annuleeMotif?: string;
}

export type TypePartie = 'COMMISSION' | 'FOURNISSEUR' | 'CLIENT';
export type ModePaiement = 'ESPECES' | 'MVOLA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY' | 'VIREMENT' | 'CHEQUE';

export interface Reglement {
  id: string;
  numeroReglement: string; // e.g. REG-2026-000001
  date: string;
  typePartie: TypePartie; // COMMISSION: our commission received, FOURNISSEUR: supplier payout, CLIENT: customer payment
  modePaiement: ModePaiement;
  montant: number;
  remarque?: string;
  venteId?: string; // specific invoice if targeted
  ventesIds?: string[]; // multiple invoices if settled together
  pieceJustificative?: string;
  createdAt: string;
}

export interface Parametres {
  nomEntreprise: string;
  slogan: string;
  logoUrl?: string;
  adresse: string;
  telephone: string;
  email: string;
  nifStat?: string;
  devise: string; // "Ar"
  tauxCommissionDefaut: number; // 10
  seuilStockDefaut: number; // 2
  texteFacture: string;
  conditionsVente: string;
}

export interface HistoriqueAction {
  id: string;
  date: string;
  typeAction: 'CREATION' | 'MODIFICATION' | 'SUPPRESSION' | 'VENTE' | 'ARRIVAGE' | 'ANNULATION' | 'REGLEMENT' | 'SAUVEGARDE' | 'RESTAURATION';
  description: string;
  details?: Record<string, any>;
}

export type UserRole = 'ADMIN' | 'VENDEUR' | 'CONSULTATION';

export interface AppUser {
  id: string;
  username: string;
  role: UserRole;
  nomComplet?: string;
  actif: boolean;
  createdAt: string;
  derniereConnexion?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  loginTime: string;
  nomComplet?: string;
}

export type NetworkSyncStatus = 'CONNECTE' | 'SYNCHRONISATION' | 'HORS_LIGNE' | 'ERREUR';

export interface DatabaseSchema {
  articles: Article[];
  mouvements: MouvementStock[];
  arrivages: Arrivage[];
  ventes: Vente[];
  reglements: Reglement[];
  parametres: Parametres;
  historique: HistoriqueAction[];
  users?: AppUser[];
  lastInvoiceSequence: number;
  lastArrivalSequence: number;
  lastPaymentSequence: number;
  deletedArticleIds?: string[];
  version: string;
}
