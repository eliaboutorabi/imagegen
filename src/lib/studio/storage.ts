import type { StudioProject, StudioSettings } from './types';
import { toCloneSafe } from './clone';

const SETTINGS_KEY = 'modyfi-studio-settings-v1';
const DATABASE_NAME = 'modyfi-studio';
const DATABASE_VERSION = 1;
const PROJECT_STORE = 'projects';
const LEGACY_ACTIVE_PROJECT_KEY = 'active-project';
const ACTIVE_PROJECT_ID_KEY = 'active-project-id';

function projectKey(id: string) {
	return `project:${id}`;
}

export const DEFAULT_SETTINGS: StudioSettings = {
	apiKey: '',
	plannerModel: 'gpt-5.6-luna',
	imageModel: 'gpt-image-2',
	quality: 'medium',
	defaultBatchSize: 4,
	autoGenerate: true,
	generationWallWidth: 420,
	theme: 'light'
};

export function loadSettings(): StudioSettings {
	if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;

	try {
		const saved = localStorage.getItem(SETTINGS_KEY);
		if (!saved) return DEFAULT_SETTINGS;
		const settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } as StudioSettings;
		if (['gpt-5.4', 'gpt-5', 'gpt-4.1'].includes(settings.plannerModel)) {
			settings.plannerModel = DEFAULT_SETTINGS.plannerModel;
		}
		return settings;
	} catch {
		return DEFAULT_SETTINGS;
	}
}

export function saveSettings(settings: StudioSettings) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
		request.onupgradeneeded = () => {
			const database = request.result;
			if (!database.objectStoreNames.contains(PROJECT_STORE)) {
				database.createObjectStore(PROJECT_STORE);
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export async function loadProject(): Promise<StudioProject | null> {
	if (typeof indexedDB === 'undefined') return null;

	try {
		const database = await openDatabase();
		const activeId = await new Promise<string | undefined>((resolve, reject) => {
			const transaction = database.transaction(PROJECT_STORE, 'readonly');
			const request = transaction.objectStore(PROJECT_STORE).get(ACTIVE_PROJECT_ID_KEY);
			request.onsuccess = () => resolve(request.result as string | undefined);
			request.onerror = () => reject(request.error);
			transaction.oncomplete = () => database.close();
		});
		if (activeId) return await loadProjectById(activeId);

		const legacyDatabase = await openDatabase();
		const legacy = await new Promise<StudioProject | null>((resolve, reject) => {
			const transaction = legacyDatabase.transaction(PROJECT_STORE, 'readonly');
			const request = transaction.objectStore(PROJECT_STORE).get(LEGACY_ACTIVE_PROJECT_KEY);
			request.onsuccess = () => resolve((request.result as StudioProject | undefined) ?? null);
			request.onerror = () => reject(request.error);
			transaction.oncomplete = () => legacyDatabase.close();
		});
		if (legacy) await saveProject(legacy);
		return legacy;
	} catch {
		return null;
	}
}

export async function loadProjectById(id: string): Promise<StudioProject | null> {
	if (typeof indexedDB === 'undefined') return null;
	try {
		const database = await openDatabase();
		return await new Promise((resolve, reject) => {
			const transaction = database.transaction(PROJECT_STORE, 'readonly');
			const request = transaction.objectStore(PROJECT_STORE).get(projectKey(id));
			request.onsuccess = () => resolve((request.result as StudioProject | undefined) ?? null);
			request.onerror = () => reject(request.error);
			transaction.oncomplete = () => database.close();
		});
	} catch {
		return null;
	}
}

export async function listProjects(): Promise<StudioProject[]> {
	if (typeof indexedDB === 'undefined') return [];
	try {
		const database = await openDatabase();
		const values = await new Promise<unknown[]>((resolve, reject) => {
			const transaction = database.transaction(PROJECT_STORE, 'readonly');
			const request = transaction.objectStore(PROJECT_STORE).getAll();
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
			transaction.oncomplete = () => database.close();
		});
		const projects = values.filter((value): value is StudioProject =>
			Boolean(value && typeof value === 'object' && 'id' in value && 'updatedAt' in value)
		);
		return [...new Map(projects.map((project) => [project.id, project])).values()].sort(
			(a, b) => b.updatedAt - a.updatedAt
		);
	} catch {
		return [];
	}
}

export async function saveProject(project: StudioProject): Promise<void> {
	if (typeof indexedDB === 'undefined') return;

	try {
		const database = await openDatabase();
		await new Promise<void>((resolve, reject) => {
			const transaction = database.transaction(PROJECT_STORE, 'readwrite');
			const store = transaction.objectStore(PROJECT_STORE);
			store.put(toCloneSafe(project), projectKey(project.id));
			store.put(project.id, ACTIVE_PROJECT_ID_KEY);
			transaction.oncomplete = () => {
				database.close();
				resolve();
			};
			transaction.onerror = () => reject(transaction.error);
		});
	} catch (error) {
		console.warn('Could not persist the current project.', error);
	}
}

export async function clearProject(id?: string): Promise<void> {
	if (typeof indexedDB === 'undefined') return;
	const projectId = id ?? (await loadProject())?.id;
	const database = await openDatabase();
	await new Promise<void>((resolve, reject) => {
		const transaction = database.transaction(PROJECT_STORE, 'readwrite');
		const store = transaction.objectStore(PROJECT_STORE);
		if (projectId) store.delete(projectKey(projectId));
		store.delete(ACTIVE_PROJECT_ID_KEY);
		store.delete(LEGACY_ACTIVE_PROJECT_KEY);
		transaction.oncomplete = () => {
			database.close();
			resolve();
		};
		transaction.onerror = () => reject(transaction.error);
	});
}

export async function activateProject(id: string): Promise<StudioProject | null> {
	const project = await loadProjectById(id);
	if (!project) return null;
	await saveProject(project);
	return project;
}
