const getStorageBucket = () => process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

const getStorageObjectPath = (fileUrl, bucket = getStorageBucket()) => {
  if (!fileUrl) return null;

  try {
    const url = new URL(fileUrl);
    const publicPrefix = `/storage/v1/object/public/${bucket}/`;
    const publicIndex = url.pathname.indexOf(publicPrefix);

    if (publicIndex !== -1) {
      return decodeURIComponent(url.pathname.slice(publicIndex + publicPrefix.length));
    }

    return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  } catch (error) {
    return null;
  }
};

const uploadFileToStorage = async (client, { bucket = getStorageBucket(), objectPath, file }) => {
  const { error: uploadError } = await client.storage.from(bucket).upload(objectPath, file.buffer, {
    contentType: file.mimetype,
    upsert: false
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = client.storage.from(bucket).getPublicUrl(objectPath);
  return {
    objectPath,
    publicUrl: data?.publicUrl || ''
  };
};

const removeStorageObjectByUrl = async (client, fileUrl, bucket = getStorageBucket()) => {
  const storagePath = getStorageObjectPath(fileUrl, bucket);
  if (!storagePath) return false;

  const { error } = await client.storage.from(bucket).remove([storagePath]);
  if (error) {
    throw error;
  }

  return true;
};

module.exports = {
  getStorageBucket,
  getStorageObjectPath,
  uploadFileToStorage,
  removeStorageObjectByUrl
};