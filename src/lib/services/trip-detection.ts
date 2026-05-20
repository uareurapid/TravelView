import { PhotoWithUri } from '@/lib/state/photo-store';

export interface DetectedTrip {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  photoCount: number;
  centerLat: number;
  centerLng: number;
  photoIds: string[];
  thumbnailUri?: string;
}

/** Max time gap between consecutive photos before starting a new trip */
const MAX_GAP_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

/** Min photos required for a cluster to be considered a trip */
const MIN_PHOTOS = 2;

function parseLocation(location: string): { latitude: number; longitude: number } | null {
  if (!location) return null;
  const parts = location.split(',');
  if (parts.length !== 2) return null;
  const latitude = parseFloat(parts[0].trim());
  const longitude = parseFloat(parts[1].trim());
  if (isNaN(latitude) || isNaN(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function isGpsCoord(location: string): boolean {
  return /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(location.trim());
}

function generateTripName(index: number, cluster: PhotoWithUri[]): string {
  // Prefer human-readable location strings over GPS coords
  const namedLocations = cluster
    .map((p) => p.location)
    .filter((loc) => loc && !isGpsCoord(loc));

  if (namedLocations.length > 0) {
    const freq: Record<string, number> = {};
    namedLocations.forEach((l) => {
      freq[l] = (freq[l] || 0) + 1;
    });
    const mostCommon = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    return `Trip to ${mostCommon}`;
  }

  return `Trip #${index + 1}`;
}

function formatDateRange(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  const startStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });

  const endStr = end.toLocaleDateString('en-US', {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (start.getTime() === end.getTime() || startStr === endStr) {
    return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return `${startStr} – ${endStr}`;
}

/**
 * Detects trips from a map of photos by clustering them into groups
 * separated by at most MAX_GAP_MS time gaps.
 * Only photos with valid GPS coordinates are considered.
 */
export function detectTrips(photos: Map<string, PhotoWithUri>): DetectedTrip[] {
  const gpsPhotos = Array.from(photos.values())
    .filter((p) => !!parseLocation(p.location))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (gpsPhotos.length < MIN_PHOTOS) return [];

  // Cluster by time gaps
  const clusters: PhotoWithUri[][] = [];
  let current: PhotoWithUri[] = [gpsPhotos[0]];

  for (let i = 1; i < gpsPhotos.length; i++) {
    const prev = gpsPhotos[i - 1];
    const curr = gpsPhotos[i];
    const gap = curr.date.getTime() - prev.date.getTime();

    if (gap > MAX_GAP_MS) {
      clusters.push(current);
      current = [curr];
    } else {
      current.push(curr);
    }
  }
  clusters.push(current);

  return clusters
    .filter((c) => c.length >= MIN_PHOTOS)
    .map((cluster, idx) => {
      const coords = cluster.map((p) => parseLocation(p.location)!);
      const avgLat = coords.reduce((s, c) => s + c.latitude, 0) / coords.length;
      const avgLng = coords.reduce((s, c) => s + c.longitude, 0) / coords.length;
      const startDate = cluster[0].date;
      const endDate = cluster[cluster.length - 1].date;
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationDays = Math.max(1, Math.ceil(durationMs / (24 * 60 * 60 * 1000)));

      // Pick a thumbnail from the middle of the cluster
      const thumbnailPhoto = cluster[Math.floor(cluster.length / 2)];

      return {
        id: `trip-${idx}-${startDate.getTime()}`,
        name: generateTripName(idx, cluster),
        startDate,
        endDate,
        durationDays,
        photoCount: cluster.length,
        centerLat: avgLat,
        centerLng: avgLng,
        photoIds: cluster.map((p) => p.id),
        thumbnailUri: thumbnailPhoto?.uri,
        dateRange: formatDateRange(startDate, endDate),
      } as DetectedTrip & { dateRange: string };
    })
    .reverse(); // Most recent trips first
}

/** Compute stats from a photo map */
export interface PhotoStats {
  totalPhotos: number;
  geotaggedPhotos: number;
  uniqueYears: number[];
  photosByYear: Record<string, number>;
}

export function computePhotoStats(photos: Map<string, PhotoWithUri>): PhotoStats {
  const photosByYear: Record<string, number> = {};
  let geotaggedPhotos = 0;

  photos.forEach((photo) => {
    const year = String(photo.date.getFullYear());
    photosByYear[year] = (photosByYear[year] || 0) + 1;
    if (parseLocation(photo.location)) {
      geotaggedPhotos++;
    }
  });

  const uniqueYears = Object.keys(photosByYear)
    .map(Number)
    .filter((y) => y > 1970)
    .sort((a, b) => a - b);

  return {
    totalPhotos: photos.size,
    geotaggedPhotos,
    uniqueYears,
    photosByYear,
  };
}
