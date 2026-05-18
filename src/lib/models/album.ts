/**
 * Represents an album within the app.
 * This is an internal model and does not affect the actual device gallery album.
 */
export interface Album {
  /** Unique identifier matching the device's album ID */
  id: string;
  /** The title of the album */
  title: string;
  /** The location associated with the album (empty for now) */
  location: string;
  /** Array of photo IDs belonging to this album */
  photoIds: string[];
  /** Whether this is an auto-generated yearly album */
  isYearAlbum?: boolean;
}
