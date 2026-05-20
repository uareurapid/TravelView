/**
 * Demo data seeder — dev only.
 * Populates the app with 24 beautiful US landscape photos organized
 * into 6 "family trip" custom albums so you can take great screenshots.
 *
 * Usage:
 *   import { seedDemoData, clearDemoData, isDemoLoaded } from '@/lib/services/demo-data';
 */

import usePhotoStore, { PhotoWithUri } from '@/lib/state/photo-store';
import useAlbumStore from '@/lib/state/album-store';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function img(id: string) {
  return `https://images.unsplash.com/photo-${id}?w=800&q=80&fit=crop&crop=center`;
}

function p(
  suffix: string,
  title: string,
  iso: string,
  lat: number,
  lng: number,
  unsplashId: string,
  albumTitle: string,
): PhotoWithUri {
  return {
    id: `demo_${suffix}`,
    title,
    date: new Date(iso),
    location: `${lat},${lng}`,
    albums: [albumTitle],
    uri: img(unsplashId),
  };
}

// ─────────────────────────────────────────────────────────────
// Album titles (used as keys so we can detect & delete them)
// ─────────────────────────────────────────────────────────────

export const DEMO_ALBUM_TITLES = [
  'Yosemite 2024',
  'Grand Canyon 2023',
  'Rocky Mountains 2023',
  'Pacific Northwest 2022',
  'Yellowstone 2022',
  'Zion & Utah 2023',
] as const;

// ─────────────────────────────────────────────────────────────
// Photos — 24 shots across 6 trips
// ─────────────────────────────────────────────────────────────

const DEMO_PHOTOS: PhotoWithUri[] = [
  // ── Yosemite Family Trip ── June 15-18 2024 ──────────────
  p('y1', 'El Capitan Morning',   '2024-06-15T08:12:00', 37.7341, -119.5966, '1469854523086-cc02fe5d8800', 'Yosemite 2024'),
  p('y2', 'Half Dome Reflection', '2024-06-15T14:30:00', 37.7459, -119.5332, '1441974231531-c6227db76b6e', 'Yosemite 2024'),
  p('y3', 'Bridalveil Fall',      '2024-06-16T10:00:00', 37.7160, -119.6494, '1433086966628-253d9960bd46', 'Yosemite 2024'),
  p('y4', 'Valley Meadow Sunset', '2024-06-17T19:45:00', 37.7456, -119.5936, '1472214103451-9374bd1c798e', 'Yosemite 2024'),

  // ── Grand Canyon Adventure ── October 3-6 2023 ───────────
  p('gc1', 'South Rim Sunrise',    '2023-10-03T06:30:00', 36.0544, -112.1401, '1474044159687-1ee9f3a51722', 'Grand Canyon 2023'),
  p('gc2', 'Canyon Walls',         '2023-10-03T11:00:00', 36.0614, -112.1071, '1509316785289-025f5b846b35', 'Grand Canyon 2023'),
  p('gc3', 'Antelope Light Beams', '2023-10-04T13:15:00', 36.8619, -111.3743, '1591367032979-59014c22a8c7', 'Grand Canyon 2023'),
  p('gc4', 'Desert Overlook',      '2023-10-05T16:00:00', 36.2012, -112.0490, '1565098772267-60af42b81ef2', 'Grand Canyon 2023'),

  // ── Rocky Mountains Getaway ── August 10-14 2023 ─────────
  p('rm1', 'Trail Ridge Road',    '2023-08-10T09:00:00', 40.3972, -105.7170, '1507003211169-0a1dd7228f2d', 'Rocky Mountains 2023'),
  p('rm2', 'Above the Clouds',    '2023-08-11T12:00:00', 39.1178, -106.4453, '1506905925346-21bda4d32df4', 'Rocky Mountains 2023'),
  p('rm3', 'Alpine Wildflowers',  '2023-08-12T15:00:00', 40.3428, -105.6836, '1464822759023-fed622ff2c3b', 'Rocky Mountains 2023'),
  p('rm4', 'Golden Hour Peaks',   '2023-08-13T20:00:00', 39.0519, -108.5347, '1465146344425-f00d5f5c8f07', 'Rocky Mountains 2023'),

  // ── Pacific Northwest ── September 1-5 2022 ──────────────
  p('pn1', 'Mt Rainier Base',    '2022-09-01T08:00:00', 46.8523, -121.7603, '1551632811-561732d1e306', 'Pacific Northwest 2022'),
  p('pn2', 'Hoh Rain Forest',    '2022-09-02T11:00:00', 47.8600, -123.9347, '1500534314209-a25ddb2bd429', 'Pacific Northwest 2022'),
  p('pn3', 'Multnomah Falls',    '2022-09-03T14:00:00', 45.5762, -122.1158, '1482938289607-e9573fc25ebb', 'Pacific Northwest 2022'),
  p('pn4', 'Olympic Coastline',  '2022-09-04T17:00:00', 47.9764, -124.6645, '1518459031867-a89b944bffe4', 'Pacific Northwest 2022'),

  // ── Yellowstone ── July 20-24 2022 ───────────────────────
  p('ys1', 'Old Faithful Eruption',   '2022-07-20T10:30:00', 44.4605, -110.8281, '1416169607655-4b2d393f36a5', 'Yellowstone 2022'),
  p('ys2', 'Grand Prismatic Spring',  '2022-07-21T13:00:00', 44.5250, -110.8384, '1504280390367-361c6d9f38f4', 'Yellowstone 2022'),
  p('ys3', 'Lamar Valley Sunrise',    '2022-07-22T06:00:00', 44.8900, -110.1678, '1501854140801-50d01698950b', 'Yellowstone 2022'),
  p('ys4', 'Grand Canyon of YNP',     '2022-07-23T11:00:00', 44.7194, -110.4973, '1470770841072-f978cf4d019e', 'Yellowstone 2022'),

  // ── Zion & Utah ── March 12-15 2023 ──────────────────────
  p('zi1', 'Angels Landing Trail', '2023-03-12T09:00:00', 37.2691, -112.9473, '1478827387698-1527781a4887', 'Zion & Utah 2023'),
  p('zi2', 'The Narrows',          '2023-03-12T14:00:00', 37.3012, -112.9475, '1562622784-5f9c0a2a20c5', 'Zion & Utah 2023'),
  p('zi3', 'Bryce Canyon Hoodoos', '2023-03-13T10:00:00', 37.5930, -112.1871, '1513836279014-a89f7a76ae86', 'Zion & Utah 2023'),
  p('zi4', 'Monument Valley',      '2023-03-14T16:00:00', 36.9986, -110.0985, '1488866022504-f2584929ca5c', 'Zion & Utah 2023'),
];

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/** Returns true if demo data has already been seeded. */
export function isDemoLoaded(): boolean {
  return usePhotoStore.getState().photos.has('demo_y1');
}

/** Populate stores with 24 demo photos across 6 family trip albums. */
export function seedDemoData(): void {
  const photoStore = usePhotoStore.getState();
  const albumStore = useAlbumStore.getState();

  // 1. Add all photos to the photo store
  photoStore.addPhotos(DEMO_PHOTOS);

  // 2. Register photos in yearly albums (for stats screen)
  DEMO_PHOTOS.forEach((photo) => {
    const year = String(photo.date.getFullYear());
    albumStore.addPhotoToYearlyAlbum(year, photo.id);
  });

  // 3. Create custom albums if not already present, then populate
  DEMO_ALBUM_TITLES.forEach((title) => {
    let albumId: string;

    if (!albumStore.hasAlbumWithTitle(title)) {
      const album = albumStore.addCustomAlbum(title);
      albumId = album.id;
    } else {
      const existing = albumStore.customAlbums.find((a) => a.title === title);
      if (!existing) return;
      albumId = existing.id;
    }

    const photoIds = DEMO_PHOTOS
      .filter((photo) => photo.albums.includes(title))
      .map((photo) => photo.id);

    albumStore.addPhotosToCustomAlbum(albumId, photoIds);
  });
}

/**
 * Remove all demo photos and their custom albums.
 * Note: clears the entire in-memory photo store — real photos will
 * reload from cache the next time the app restarts.
 */
export function clearDemoData(): void {
  const photoStore = usePhotoStore.getState();
  const albumStore = useAlbumStore.getState();

  // Clear all in-memory photos (demo + real; real reload from cache on restart)
  photoStore.clearPhotos();

  // Delete only the albums we created
  const demoTitles = new Set<string>(DEMO_ALBUM_TITLES);
  albumStore.customAlbums
    .filter((a) => demoTitles.has(a.title))
    .forEach((a) => albumStore.deleteCustomAlbum(a.id));
}
