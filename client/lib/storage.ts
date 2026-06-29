'use client';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage, isFirebaseConfigured } from './firebase';

export async function uploadIssueMedia(file: File, userId: string): Promise<string> {
  const storage = getFirebaseStorage();
  if (!storage || !isFirebaseConfigured()) {
    throw new Error('Firebase Storage not configured');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `issues/${userId}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
