import React, { useEffect, useState, forwardRef } from 'react';
import { Image, type ImageProps, type ImageSourcePropType } from './native';
import { useApp } from '../context/AppContext';
import { fetchSignedPhotoUrl } from '../services/assessmentApi';
import { isValidPhotoObjectKey } from '../utils/assessmentValidation';

export interface AssessmentImageProps extends Omit<ImageProps, 'source'> {
  photoObjectKey?: string;
  assessmentId?: string;
  source?: ImageSourcePropType | string | null;
}

/**
 * Reusable image component that resolves short-lived signed URLs for private
 * Backblaze B2 assessment photos via POST /api/photos/signed-url using the
 * current signed-in Firebase user's ID token.
 *
 * - Never constructs B2 URLs in the browser or persists signed URLs.
 * - Immediately clears stale signed URLs and aborts obsolete requests when
 *   `currentUser?.uid`, `photoObjectKey`, or `assessmentId` changes.
 * - Preserves normal rendering for ordinary images and legacy records without `photoObjectKey`.
 * - Falls back to the neutral `"Photo"` placeholder if resolution or image loading fails.
 */
export const AssessmentImage = forwardRef<HTMLImageElement, AssessmentImageProps>(
  ({ photoObjectKey, assessmentId, source, onError, ...rest }, ref) => {
    const { currentUser } = useApp();

    const activeUid = currentUser?.uid ?? '';
    const cleanKey =
      typeof photoObjectKey === 'string' && photoObjectKey.trim() ? photoObjectKey.trim() : '';
    const cleanAssessmentId =
      typeof assessmentId === 'string' && assessmentId.trim() ? assessmentId.trim() : '';
    const rawDirectSrc = typeof source === 'string' ? source : source?.uri;
    const directSrc =
      typeof rawDirectSrc === 'string' && rawDirectSrc.trim() ? rawDirectSrc.trim() : '';

    const [resolvedState, setResolvedState] = useState<{
      uid: string;
      photoObjectKey: string;
      assessmentId: string;
      url: string;
    } | null>(null);
    const [signedImageFailed, setSignedImageFailed] = useState(false);

    useEffect(() => {
      // Immediately clear stale signed URL and image failure state on identity or object changes
      setResolvedState(null);
      setSignedImageFailed(false);

      if (!cleanKey || !currentUser || !isValidPhotoObjectKey(cleanKey, activeUid)) {
        return;
      }

      let cancelled = false;
      const controller = new AbortController();

      (async () => {
        try {
          const idToken = await currentUser.getIdToken();
          if (!idToken || !idToken.trim()) {
            throw new Error('Missing Firebase ID token');
          }
          if (cancelled) return;

          const signedUrl = await fetchSignedPhotoUrl(cleanKey, idToken, {
            signal: controller.signal,
          });

          if (!cancelled) {
            setResolvedState({
              uid: activeUid,
              photoObjectKey: cleanKey,
              assessmentId: cleanAssessmentId,
              url: signedUrl,
            });
          }
        } catch {
          if (!cancelled && !controller.signal.aborted) {
            setResolvedState(null);
          }
        }
      })();

      return () => {
        cancelled = true;
        controller.abort();
      };
    }, [cleanKey, cleanAssessmentId, activeUid, currentUser]);

    // Ordinary image or legacy record without a private B2 photo_object_key
    if (!cleanKey) {
      return <Image ref={ref} source={directSrc} onError={onError} {...rest} />;
    }

    const activeSignedUrl =
      !signedImageFailed &&
      resolvedState &&
      resolvedState.uid === activeUid &&
      resolvedState.photoObjectKey === cleanKey &&
      resolvedState.assessmentId === cleanAssessmentId
        ? resolvedState.url
        : '';

    if (!activeSignedUrl) {
      // Neutral "Photo" placeholder until signed URL resolves or when resolution/loading fails
      return <Image ref={ref} source="" {...rest} />;
    }

    return (
      <Image
        ref={ref}
        key={`${activeUid}:${cleanAssessmentId}:${cleanKey}:${activeSignedUrl}`}
        source={activeSignedUrl}
        onError={(e) => {
          setSignedImageFailed(true);
          onError?.(e);
        }}
        {...rest}
      />
    );
  }
);

AssessmentImage.displayName = 'AssessmentImage';
