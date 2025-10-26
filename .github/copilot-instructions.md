# Wanderlisi AI Agent Instructions

## Project Overview
Wanderlisi is a web application for tracking and displaying hiking activities. It reads GPX tracks and associated images, displaying them on an interactive map using OpenLayers.

## Architecture
- **Frontend-only Architecture**: Pure client-side application using vanilla JavaScript modules
- **Map Engine**: OpenLayers (loaded via Skypack CDN) for map visualization
- **Key Components**:
  - `main.js`: Core map setup and configuration
  - `lib/*.js`: Modular components for specific features
    - `gallery.js`: Image gallery handling
    - `track.js`: GPX track processing
    - `map.js`: Map interaction logic

## Data Flow
1. GPX tracks are stored in `tracks/` directory
2. `process.py` preprocesses tracks and images:
   - Resizes images to max dimension 1000px
   - Normalizes track data
   - Handles file organization

## Development Patterns
### Component Organization
- Each feature is modularized in `lib/` directory
- Components use ES6 classes with clear responsibility boundaries
- Example pattern from `gallery.js`:
  ```javascript
  export default class Gallery {
    visible = false;
    constructor() {
      // Component initialization
    }
    show(track) {
      // Feature implementation
    }
  }
  ```

### Map Integration
- Uses Swiss topographic maps (swisstopo)
- Map extent is fixed to Swiss coordinates
- Track visualization uses OpenLayers Vector layers

## Common Tasks
### Adding New Tracks
1. Place GPX file in `tracks/` directory
2. Run `./process.py <basedir> [dropbox-path]` to process
3. Associated images go in same-named directory as GPX

### Dependencies
- Python 3.x for track processing
- ImageMagick for image resizing
- Modern browser with ES6 module support

## Key Files
- `main.js`: Application entry point and map configuration
- `lib/track.js`: Track data model and processing
- `lib/gallery.js`: Image gallery implementation
- `process.py`: Track and image preprocessing script