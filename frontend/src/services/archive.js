import { archiveAPI } from './api';

const ARCHIVE_KEY = 'archivedMaterials';
const ARCHIVE_EVENT = 'archive-updated';

const notifyArchiveChanged = () => {
  window.dispatchEvent(new CustomEvent(ARCHIVE_EVENT));
};

const readArchive = () => {
  try {
    return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
  } catch {
    return [];
  }
};

const getArchiveSnapshot = (items) => JSON.stringify(
  [...items]
    .map((item) => normalizeArchiveItem(item))
    .sort((left, right) => left.archive_key.localeCompare(right.archive_key))
);

const writeArchive = (items) => {
  const nextSnapshot = getArchiveSnapshot(items);
  const currentSnapshot = getArchiveSnapshot(readArchive());

  if (nextSnapshot === currentSnapshot) {
    return false;
  }

  localStorage.setItem(ARCHIVE_KEY, nextSnapshot);
  return true;
};

export const getMaterialArchiveKey = (item) => {
  const sourceType = item.source_type || 'class_file';
  const sourceId = item.source_id || item.id;
  return `${sourceType}:${sourceId}`;
};

export const getArchivedMaterials = () => readArchive();

const normalizeArchiveItem = (item) => ({
  archive_key: item.archive_key,
  archived_at: item.archived_at || new Date().toISOString(),
  source_type: item.source_type || 'class_file',
  source_id: String(item.source_id || item.id),
  id: item.id || item.source_id,
  class_id: item.class_id || null,
  class_name: item.class_name || item.className || null,
  deadline_id: item.deadline_id || null,
  deadline_title: item.deadline_title || null,
  title: item.title || 'Untitled',
  description: item.description || '',
  file_name: item.file_name || '',
  file_type: item.file_type || '',
  file_size: item.file_size || 0,
  file_url: item.file_url || '',
  file_path: item.file_path || ''
});

export const syncArchiveFromServer = async () => {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await archiveAPI.getMine();
    const serverItems = (response.data?.items || []).map(normalizeArchiveItem);
    if (writeArchive(serverItems)) {
      notifyArchiveChanged();
    }
  } catch {
    // Keep local cache when server sync is unavailable.
  }
};

export const clearArchiveCache = () => {
  if (writeArchive([])) {
    notifyArchiveChanged();
  }
};

export const archiveMaterial = (item) => {
  const items = readArchive();
  const archiveKey = getMaterialArchiveKey(item);
  if (items.some((i) => i.archive_key === archiveKey)) return;

  const archived = normalizeArchiveItem({
    ...item,
    archive_key: archiveKey,
    archived_at: new Date().toISOString(),
    source_id: String(item.source_id || item.id),
    id: item.id || item.source_id
  });

  if (writeArchive([archived, ...items])) {
    notifyArchiveChanged();
  }

  archiveAPI.archiveItem(archived)
    .then(() => syncArchiveFromServer())
    .catch(() => {
      // Fallback keeps local state if backend is unavailable.
    });
};

export const unarchiveMaterial = (archiveKey) => {
  const items = readArchive();
  if (writeArchive(items.filter((item) => item.archive_key !== archiveKey))) {
    notifyArchiveChanged();
  }

  archiveAPI.unarchiveItem(archiveKey)
    .then(() => syncArchiveFromServer())
    .catch(() => {
      // Fallback keeps local state if backend is unavailable.
    });
};

export const isMaterialArchived = (item) => {
  const archiveKey = getMaterialArchiveKey(item);
  return readArchive().some((a) => a.archive_key === archiveKey);
};

export const filterArchivedMaterials = (items) => {
  const archived = new Set(readArchive().map((a) => a.archive_key));
  return items.filter((item) => !archived.has(getMaterialArchiveKey(item)));
};

export const onArchiveChange = (callback) => {
  window.addEventListener(ARCHIVE_EVENT, callback);
  return () => window.removeEventListener(ARCHIVE_EVENT, callback);
};

export const isDeadlineArchived = (deadlineId) => {
  return readArchive().some((a) => a.archive_key === `deadline:${deadlineId}`);
};

export const filterArchivedDeadlines = (deadlines) => {
  const archived = new Set(readArchive().map((a) => a.archive_key));
  return deadlines.filter((d) => !archived.has(`deadline:${d.id}`));
};
