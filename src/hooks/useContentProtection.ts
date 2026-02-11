import { useEffect, useCallback, useState } from 'react';

/**
 * Content protection hook - prevents copying, printing, screenshots, and unauthorized access.
 * This creates a "soft DRM" layer that deters casual piracy while maintaining UX.
 */
export function useContentProtection(enabled: boolean = true) {
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);

  // Block keyboard shortcuts for copying, printing, saving
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Block Ctrl/Cmd + P (print), S (save), C (copy when on reader)
    if ((e.ctrlKey || e.metaKey) && ['p', 's', 'c', 'a', 'u'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Block PrintScreen
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      return false;
    }

    // Block F12 (dev tools) - deterrent only
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
  }, [enabled]);

  // Block right-click context menu
  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (!enabled) return;
    e.preventDefault();
    return false;
  }, [enabled]);

  // Block drag events (prevents dragging text/images)
  const handleDragStart = useCallback((e: DragEvent) => {
    if (!enabled) return;
    e.preventDefault();
    return false;
  }, [enabled]);

  // Detect window blur (potential screenshot via OS tools)
  const handleVisibilityChange = useCallback(() => {
    if (!enabled) return;
    setIsWindowBlurred(document.hidden);
  }, [enabled]);

  const handleWindowBlur = useCallback(() => {
    if (!enabled) return;
    setIsWindowBlurred(true);
  }, [enabled]);

  const handleWindowFocus = useCallback(() => {
    setIsWindowBlurred(false);
  }, []);

  // Block beforeprint event
  const handleBeforePrint = useCallback((e: Event) => {
    if (!enabled) return;
    e.preventDefault();
    // Clear the page content temporarily
    document.body.classList.add('print-protected');
  }, [enabled]);

  const handleAfterPrint = useCallback(() => {
    document.body.classList.remove('print-protected');
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    // Disable selection via CSS class
    document.body.classList.add('content-protected');

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('content-protected');
    };
  }, [enabled, handleKeyDown, handleContextMenu, handleDragStart, handleVisibilityChange, handleWindowBlur, handleWindowFocus, handleBeforePrint, handleAfterPrint]);

  return {
    isWindowBlurred,
  };
}

/**
 * Simple encryption for offline content storage.
 * Uses Web Crypto API with a user-derived key.
 */
export async function encryptContent(content: string, userKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  
  // Derive a key from the user ID
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userKey),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Generate a salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Derive the actual encryption key
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Encrypt the content
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  // Combine salt + iv + encrypted data and convert to base64
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

export async function decryptContent(encryptedData: string, userKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Decode from base64
  const combined = new Uint8Array(
    atob(encryptedData).split('').map(c => c.charCodeAt(0))
  );
  
  // Extract salt, iv, and encrypted content
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const data = combined.slice(28);
  
  // Derive the key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userKey),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  return decoder.decode(decrypted);
}
