import axios, { AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import { storage } from './storage';

function isProxyMode(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    (window as any).__KAVITA_PROXY__ === true
  );
}

const STORAGE_KEYS = {
  SERVER_URL: 'kavita_server_url',
  API_KEY: 'kavita_api_key',
  JWT_TOKEN: 'kavita_jwt_token',
};

export interface Library {
  id: number;
  name: string;
  type: number; // 0=Manga, 1=Comic, 2=Book
  coverImage?: string;
  series: number;
}

export interface Series {
  id: number;
  name: string;
  originalName: string;
  localizedName: string;
  sortName: string;
  summary?: string;
  coverImage?: string;
  libraryId: number;
  libraryName?: string;
  pagesRead: number;
  pages: number;
  userRating: number;
  format: number; // 0=Unknown, 1=Archive(CBZ), 2=Unknown, 3=Epub, 4=PDF
  created: string;
  lastModified: string;
}

export interface Volume {
  id: number;
  number: number;
  name: string;
  chapters: Chapter[];
  pagesRead: number;
  pages: number;
  coverImage?: string;
}

export interface Chapter {
  id: number;
  number: string;
  range: string;
  title: string;
  pages: number;
  pagesRead: number;
  coverImage?: string;
  volumeId: number;
  isSpecial: boolean;
  summary?: string;
  files: ChapterFile[];
}

export interface ChapterFile {
  id: number;
  filePath: string;
  pages: number;
  format: number; // 0=Unknown, 1=Archive(CBZ), 2=Unknown, 3=Epub, 4=PDF, 9=AZW3/MOBI
}

export interface SeriesDetail {
  id: number;
  name: string;
  summary?: string;
  coverImage?: string;
  volumes: Volume[];
}

export interface Collection {
  id: number;
  title: string;
  promoted: boolean;
  coverImage?: string;
  summary?: string;
}

export interface Genre {
  id: number;
  title: string;
}

export interface Tag {
  id: number;
  title: string;
}

// The metadata object returned by GET /api/Series/metadata?seriesId=X
export interface SeriesMetadata {
  id: number;
  seriesId: number;
  summary?: string;
  genres: Genre[];
  tags: Tag[];
  writers?: { id: number; name: string }[];
  coverArtists?: { id: number; name: string }[];
  publishers?: { id: number; name: string }[];
  characters?: { id: number; name: string }[];
  pencillers?: { id: number; name: string }[];
  inkers?: { id: number; name: string }[];
  colorists?: { id: number; name: string }[];
  letterers?: { id: number; name: string }[];
  editors?: { id: number; name: string }[];
  translators?: { id: number; name: string }[];
  ageRating?: number;
  releaseYear?: number;
  language?: string;
  maxCount?: number;
  totalCount?: number;
  publicationStatus?: number;
}

export interface ChapterInfo {
  chapterId: number;
  seriesId: number;
  volumeId: number;
  libraryId: number;
  pages: number;
  fileName: string;
  isSpecial: boolean;
}

// Format preference order: PDF (4) > EPUB (3) > Archive/CBZ (1) > other
// Lower return value = higher preference
function formatPriority(fmt: number): number {
  if (fmt === 4) return 0; // PDF — highest preference
  if (fmt === 3) return 1; // EPUB
  if (fmt === 1) return 2; // Archive/CBZ
  return 3;                // Unknown / Azw3 / Mobi etc.
}

// Given a list of chapter files, return the one with the best (lowest priority) format
export function pickBestFile(files: ChapterFile[]): ChapterFile | undefined {
  if (!files?.length) return undefined;
  return [...files].sort((a, b) => formatPriority(a.format) - formatPriority(b.format))[0];
}

// Given a chapter, return its effective format using pickBestFile
export function chapterEffectiveFormat(chapter: Chapter): number {
  const best = pickBestFile(chapter.files);
  return best?.format ?? chapter.files?.[0]?.format ?? 0;
}

class KavitaAPI {
  private client: AxiosInstance;
  private serverUrl: string = '';
  private apiKey: string = '';
  private jwtToken: string = '';

  constructor() {
    this.client = axios.create({ timeout: 30000 });
    this.client.interceptors.request.use((config) => {
      if (this.jwtToken) config.headers.Authorization = `Bearer ${this.jwtToken}`;
      return config;
    });
  }

  async initialize() {
    try {
      const storedUrl = (await storage.getItem(STORAGE_KEYS.SERVER_URL)) || '';
      this.apiKey = (await storage.getItem(STORAGE_KEYS.API_KEY)) || '';
      this.jwtToken = (await storage.getItem(STORAGE_KEYS.JWT_TOKEN)) || '';
      if (isProxyMode()) {
        this.serverUrl = '';
        this.client.defaults.baseURL = '';
      } else if (storedUrl) {
        let cleanUrl = storedUrl.replace(/\/$/, '');
        if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'http://' + cleanUrl;
        this.serverUrl = cleanUrl;
        this.client.defaults.baseURL = cleanUrl;
        await storage.setItem(STORAGE_KEYS.SERVER_URL, cleanUrl);
      }
    } catch (e) {
      console.error('Failed to initialize KavitaAPI from storage', e);
    }
  }

  async saveCredentials(serverUrl: string, apiKey: string) {
    this.apiKey = apiKey;
    await storage.setItem(STORAGE_KEYS.API_KEY, apiKey);
    if (isProxyMode()) {
      this.serverUrl = '';
      this.client.defaults.baseURL = '';
      return;
    }
    let cleanUrl = serverUrl.trim().replace(/\/$/, '');
    if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'http://' + cleanUrl;
    this.serverUrl = cleanUrl;
    this.client.defaults.baseURL = cleanUrl;
    await storage.setItem(STORAGE_KEYS.SERVER_URL, cleanUrl);
  }

  async login(): Promise<boolean> {
    const response = await this.client.post('/api/Plugin/authenticate', null, {
      params: { apiKey: this.apiKey, pluginName: 'KavitaReaderApp' },
    });
    if (response.data?.token) {
      this.jwtToken = response.data.token;
      await storage.setItem(STORAGE_KEYS.JWT_TOKEN, this.jwtToken);
      return true;
    }
    return false;
  }

  async logout() {
    this.jwtToken = '';
    this.apiKey = '';
    this.serverUrl = '';
    await storage.deleteItem(STORAGE_KEYS.JWT_TOKEN);
    await storage.deleteItem(STORAGE_KEYS.API_KEY);
    await storage.deleteItem(STORAGE_KEYS.SERVER_URL);
  }

  isAuthenticated(): boolean { return !!this.jwtToken; }

  hasCredentials(): boolean {
    if (isProxyMode()) return !!this.apiKey;
    return !!this.serverUrl && !!this.apiKey;
  }

  getServerUrl(): string { return this.serverUrl; }
  getToken(): string { return this.jwtToken; }
  getApiKey(): string { return this.apiKey; }

  // ── Libraries ───────────────────────────────────────────────────────────────

  async getLibraries(): Promise<Library[]> {
    const response = await this.client.get('/api/Library');
    return response.data;
  }

  // ── Series ──────────────────────────────────────────────────────────────────

  async getSeriesForLibrary(libraryId: number, page = 0, pageSize = 30): Promise<Series[]> {
    // Kavita v0.7+ uses `libraries` (array); older versions use `libraryId` (scalar).
    // Send both so we work with either version.
    const response = await this.client.post('/api/Series/all', {
      libraries: [libraryId],
      libraryId,
      pageNumber: page,
      pageSize,
    });
    return response.data;
  }

  async getAllSeries(page = 0, pageSize = 30): Promise<Series[]> {
    const response = await this.client.post('/api/Series/all', {
      pageNumber: page,
      pageSize,
    });
    return response.data;
  }

  async getSeriesDetail(seriesId: number): Promise<SeriesDetail> {
    const [seriesRes, volumesRes] = await Promise.all([
      this.client.get(`/api/Series/${seriesId}`),
      this.client.get(`/api/Series/volumes?seriesId=${seriesId}`),
    ]);
    return { ...seriesRes.data, volumes: volumesRes.data };
  }

  async getChapter(chapterId: number): Promise<Chapter> {
    const response = await this.client.get(`/api/Chapter?chapterId=${chapterId}`);
    return response.data;
  }

  // ── Series Metadata ──────────────────────────────────────────────────────────

  async getSeriesMetadata(seriesId: number): Promise<SeriesMetadata | null> {
    try {
      const response = await this.client.get(`/api/Series/metadata?seriesId=${seriesId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  async updateSeriesMetadata(metadata: SeriesMetadata): Promise<void> {
    // Try the v0.8 endpoint first, fall back to v0.7 format
    try {
      await this.client.post('/api/Series/metadata', metadata);
    } catch {
      await this.client.post('/api/Metadata/series-update', {
        seriesMetadatas: [metadata],
      });
    }
  }

  // ── Collections ─────────────────────────────────────────────────────────────

  async getCollections(): Promise<Collection[]> {
    try {
      const response = await this.client.get('/api/Collection');
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  }

  async getSeriesForCollection(collectionId: number, page = 0, pageSize = 30): Promise<Series[]> {
    const response = await this.client.post('/api/Series/all', {
      collectionTags: [collectionId],
      pageNumber: page,
      pageSize,
    });
    return response.data;
  }

  async addSeriesToCollection(collectionId: number, seriesId: number): Promise<void> {
    // Fetch ALL current series (up to 500) then add this one
    const current = await this.getSeriesForCollection(collectionId, 0, 500);
    const ids = [...new Set([...current.map(s => s.id), seriesId])];
    await this.client.post('/api/Collection/update-series', { id: collectionId, seriesIds: ids });
  }

  async removeSeriesFromCollection(collectionId: number, seriesId: number): Promise<void> {
    const current = await this.getSeriesForCollection(collectionId, 0, 500);
    const ids = current.map(s => s.id).filter(id => id !== seriesId);
    await this.client.post('/api/Collection/update-series', { id: collectionId, seriesIds: ids });
  }

  // ── Metadata — genres & tags ─────────────────────────────────────────────────

  async getGenres(libraryId?: number): Promise<Genre[]> {
    try {
      const params = libraryId ? { libraryIds: libraryId } : {};
      const response = await this.client.get('/api/Metadata/genres', { params });
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  }

  async getTags(libraryId?: number): Promise<Tag[]> {
    try {
      const params = libraryId ? { libraryIds: libraryId } : {};
      const response = await this.client.get('/api/Metadata/tags', { params });
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  }

  async getSeriesByGenre(genreId: number, page = 0, pageSize = 30): Promise<Series[]> {
    const response = await this.client.post('/api/Series/all', {
      genres: [genreId],
      pageNumber: page,
      pageSize,
    });
    return response.data;
  }

  async getSeriesByTag(tagId: number, page = 0, pageSize = 30): Promise<Series[]> {
    const response = await this.client.post('/api/Series/all', {
      tags: [tagId],
      pageNumber: page,
      pageSize,
    });
    return response.data;
  }

  // ── Reader ──────────────────────────────────────────────────────────────────

  async getChapterInfo(chapterId: number): Promise<ChapterInfo | null> {
    try {
      const response = await this.client.get(`/api/Reader/chapter-info?chapterId=${chapterId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  // ── Reading progress ─────────────────────────────────────────────────────────

  async saveReadingProgress(chapterId: number, page: number, seriesId: number, volumeId: number) {
    try {
      await this.client.post('/api/Reader/progress', {
        chapterId, pageNum: page, seriesId, volumeId,
      });
    } catch (e) {
      console.error('Failed to save reading progress', e);
    }
  }

  // ── File health ──────────────────────────────────────────────────────────────

  async scanLibrary(libraryId: number): Promise<void> {
    await this.client.post(`/api/Library/scan?libraryId=${libraryId}&force=true`);
  }

  async scanAllLibraries(): Promise<void> {
    await this.client.post('/api/Library/scan-all');
  }

  async analyzeFiles(): Promise<void> {
    await this.client.post('/api/Admin/analyze-files');
  }

  // ── Cover upload ─────────────────────────────────────────────────────────────

  async uploadSeriesCover(seriesId: number, base64DataUrl: string): Promise<void> {
    const url = base64DataUrl.startsWith('data:')
      ? base64DataUrl
      : `data:image/jpeg;base64,${base64DataUrl}`;
    try {
      await this.client.post('/api/Upload/series', { id: seriesId, url });
    } catch (e: any) {
      const kavitaMsg = e?.response?.data?.title ?? e?.response?.data ?? e?.message ?? 'Unknown error';
      throw new Error(`Cover upload failed: ${kavitaMsg}`);
    }
  }

  async uploadSeriesCoverFromUrl(seriesId: number, imageUrl: string): Promise<void> {
    const response = await fetch('/cover-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seriesId, imageUrl, token: this.jwtToken }),
    });
    const json = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    if (!json.ok && json.status !== 200) {
      const detail = json.body ? `Kavita ${json.status}: ${json.body}` : (json.error ?? `Upload failed (${response.status})`);
      throw new Error(detail);
    }
  }

  // ── Cover image URLs ─────────────────────────────────────────────────────────

  getSeriesCoverUrl(seriesId: number): string {
    return `${this.serverUrl}/api/image/series-cover?seriesId=${seriesId}&apiKey=${this.apiKey}`;
  }

  getChapterCoverUrl(chapterId: number): string {
    return `${this.serverUrl}/api/image/chapter-cover?chapterId=${chapterId}&apiKey=${this.apiKey}`;
  }

  getVolumeCoverUrl(volumeId: number): string {
    return `${this.serverUrl}/api/image/volume-cover?volumeId=${volumeId}&apiKey=${this.apiKey}`;
  }

  getLibraryCoverUrl(libraryId: number): string {
    return `${this.serverUrl}/api/image/library-cover?libraryId=${libraryId}&apiKey=${this.apiKey}`;
  }

  getCollectionCoverUrl(collectionId: number): string {
    return `${this.serverUrl}/api/image/collection-cover?collectionTagId=${collectionId}&apiKey=${this.apiKey}`;
  }

  // ── Reader URLs ──────────────────────────────────────────────────────────────

  getPdfReaderUrl(chapterId: number): string {
    return `${this.serverUrl}/api/Reader/pdf?chapterId=${chapterId}&apiKey=${this.apiKey}`;
  }

  getEpubReaderUrl(chapterId: number): string {
    return `${this.serverUrl}/api/Reader/epub?chapterId=${chapterId}&apiKey=${this.apiKey}`;
  }

  // ── Bookmarks ────────────────────────────────────────────────────────────────

  async bookmarkPage(chapterId: number, page: number, seriesId: number, volumeId: number) {
    try {
      await this.client.post('/api/Reader/bookmark', {
        chapterId, pageNum: page, seriesId, volumeId,
      });
    } catch (e) {
      console.error('Failed to bookmark page', e);
    }
  }

  // ── Recently read ────────────────────────────────────────────────────────────

  async getRecentlyRead(): Promise<any[]> {
    try {
      const response = await this.client.post('/api/Series/recently-read', {
        pageNumber: 0, pageSize: 20,
      });
      return response.data;
    } catch {
      return [];
    }
  }

  // ── Search ───────────────────────────────────────────────────────────────────

  async search(query: string): Promise<any> {
    try {
      const cleaned = query.replace(/["""''`]/g, '').trim();
      const response = await this.client.get(
        `/api/Search/search?queryString=${encodeURIComponent(cleaned)}`
      );
      return response.data;
    } catch {
      return { series: [], collections: [], readingLists: [] };
    }
  }
}

export const kavitaAPI = new KavitaAPI();
