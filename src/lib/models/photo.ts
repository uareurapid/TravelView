/**
 * Represents a photo within the app.
 * This is an internal model and does not affect the actual device gallery photo.
 */
export interface Photo {
  /** Unique identifier matching the device's photo ID */
  id: string;
  /** The title of the photo */
  title: string;
  /** The datetime when the photo was taken */
  date: Date;
  /** The location where the photo was taken (place name or GPS coordinate) */
  location: string;
  /** Array of album titles this photo belongs to (album titles are unique) */
  albums: string[];
}
