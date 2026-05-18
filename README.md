# Photo Map App

A mobile app that displays your photos on a map based on where they were taken.

## Features

### Onboarding
- First-time launch shows a permission request screen
- Explains what the app does and why photo access is needed
- Permission request only happens once on first launch

### Albums Tab
- Displays all photo albums from your device
- Shows album thumbnail using the first photo
- Displays photo count for each album
- Loads albums asynchronously for better performance
- Handles permission requests gracefully
- **Create custom albums**: Tap the + button in the header to add a new album
  - Album names must be unique (case-insensitive check)
  - Custom albums appear at the top of the list with a folder icon
  - Album data persists across app restarts
- **Album Detail View**: Tap any album to view its photos
  - Comic book style 2-column layout with framed photos
  - Infinite scroll with pagination for smooth performance
  - Photos load asynchronously to prevent UI blocking
  - Back button to return to album list
  - **Album Options** (custom albums only): Tap the menu icon in the header
    - Edit Location: Set a location for the album (placeholder)
    - Delete Album: Remove the album permanently
      - Confirmation dialog before deletion
      - Removes album from all photos that reference it
      - Navigates back to album list after deletion
- **Photo Viewer**: Tap any photo to view it full screen
  - Full quality image display
  - Dark background for better viewing
  - Close button to return to album
  - **Edit photo details**: Tap the edit button to modify:
    - Title: Add a custom title for the photo
    - Location: Enter a place name or GPS coordinates
      - Autocomplete suggestions from geocoding
      - Use current location button
      - Supports both "Lisbon, Portugal" and "38.722252, -9.139337" formats
  - Edits persist between app restarts

### Map Tab
- Interactive map view (Apple Maps on iOS, Google Maps on Android)
- Shows user's current location
- **Photo Pins**: Photos with location data appear as circular thumbnail pins on the map
  - Pins show a small preview of the photo
  - Tap a pin to open the full photo viewer (where you can edit details)
  - Shows photos with GPS data from device AND manually added locations
  - Location edits persist between app restarts
  - Floating card shows count of photos currently on the map

### Settings
- Accessible via gear icon in top-right corner
- Manage photo library permissions
- View permission status (granted/denied)
- Quick link to device settings if permission was denied
- **Add markers on map**: Choose how map markers are displayed
  - "For current album only" (default): Only shows markers for photos from albums you have browsed. Each time you open an album, its photos with location data become visible on the map.
  - "For all albums and photos": Shows markers for all photos with location data across all albums immediately (photos are loaded in background on startup).

## Data Models

### Photo
Internal representation of a photo within the app (does not affect device gallery):
- `id`: string - Unique identifier matching the device's photo ID
- `title`: string - The title of the photo (defaults to filename)
- `date`: Date - The datetime when the photo was taken
- `location`: string - GPS coordinates as "latitude,longitude" if available
- `albums`: string[] - Array of album titles this photo belongs to (can be multiple)
- `uri`: string - Local URI for displaying the photo (stored separately for performance)

### Album
Internal representation of an album within the app (does not affect device gallery):
- `id`: string - Unique identifier matching the device's album ID
- `title`: string - The title of the album (defaults to device album title or ID)
- `location`: string - Location associated with the album (reserved for future use)
- `photoIds`: string[] - Array of photo IDs belonging to this album
- `isYearAlbum`: boolean (optional) - True if this is an auto-generated yearly album

### Yearly Albums
The app automatically creates yearly albums based on photo dates:
- **On app startup**: Creates a yearly album for the current year immediately
- **Background loading**: All device album photos are loaded in the background without blocking the UI
  - Photos are pre-loaded from all device albums asynchronously
  - Yearly albums are populated as photos are loaded
  - Album detail view uses pre-loaded data when available (instant loading)
  - Progress is tracked to avoid loading the same album twice
- When photos are loaded from any device album, the app checks each photo's creation date
- For each unique year found, a "yearly album" is created (e.g., "2024", "2023")
- Photos from that year are automatically added to the corresponding yearly album
- The photo's `albums` array is updated to include the year as well
- **Not persisted**: Yearly albums are regenerated on each app restart from the loaded photos
- Yearly albums appear in the album list with a calendar icon, sorted newest first
- Yearly albums show thumbnail from first photo when photos are loaded
- Opening a yearly album shows all photos taken during that year

### Photo Navigation
- **Swipe to navigate**: In photo detail view, swipe left/right to move between photos in the album
- **Circular navigation**: Loops from last photo to first and vice versa
- **Smooth animations**: Scale and fade transitions between photos
- **Navigation arrows**: Tap left/right arrows as an alternative to swiping
- **Photo counter**: Shows current position (e.g., "1 / 15")

## Tech Stack
- Expo SDK 53
- React Native with TypeScript
- expo-media-library for photo access
- react-native-maps for map display
- React Query for async data management
- NativeWind for styling
