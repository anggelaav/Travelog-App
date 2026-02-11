import L from 'leaflet';
import CONFIG from '../config';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

class MapService {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.markers = [];
    this.tileLayers = {};
    this.currentTileLayer = null;
    this.tileLayerIndex = 0;
  }

  initMap(center, zoom) {
    try {
      const container = document.getElementById(this.containerId);
      if (!container) {
        console.error('Map container not found:', this.containerId);
        return null;
      }
      
      if (this.map) {
        this.destroy();
      }
      
      if (container._leaflet_id) {
        container.removeAttribute('_leaflet_id');
        const leafletElements = container.querySelectorAll('.leaflet-layer, .leaflet-control-container, .leaflet-pane');
        leafletElements.forEach(el => el.remove());
      }
      
      console.log('Initializing new map...');
      this.map = L.map(this.containerId, { 
        preferCanvas: true,
        zoomControl: false,
        attributionControl: true
      }).setView(center, zoom);
      
      this.addTileLayer('streets', 'Jalan');
      
      L.control.zoom({
        position: 'topright'
      }).addTo(this.map);
      
      return this.map;
    } catch (error) {
      console.error('Error initializing map:', error);
      return null;
    }
  }

  fitBounds(bounds) {
    if (!this.map) {
      console.warn('Map not initialized');
      return;
    }
    
    try {
      this.map.fitBounds(bounds, { 
        padding: [20, 20],
        maxZoom: 15 
      });
    } catch (error) {
      console.error('Error fitting bounds:', error);
    }
  }

  // PERBAIKAN: Tambahkan method setView
  setView(center, zoom) {
    if (!this.map) {
      console.warn('Map not initialized');
      return;
    }
    
    this.map.setView(center, zoom);
  }

  // PERBAIKAN: Tambahkan method flyTo
  flyTo(center, zoom) {
    if (!this.map) {
      console.warn('Map not initialized');
      return;
    }
    
    this.map.flyTo(center, zoom, {
      duration: 1.5
    });
  }

  addMarker(latlng, popupContent) {
    if (!this.map) {
      console.warn('Map not initialized');
      return null;
    }
    
    try {
      const marker = L.marker(latlng).addTo(this.map);
      
      if (popupContent) {
        marker.bindPopup(popupContent);
      }
      
      this.markers.push(marker);
      return marker;
    } catch (error) {
      console.error('Error adding marker:', error);
      return null;
    }
  }

  clearMarkers() {
    this.markers.forEach(marker => {
      if (marker && marker.remove) {
        marker.remove();
      }
    });
    this.markers = [];
  }

  addTileLayer(style, name) {
    if (!this.map) {
      console.warn('Map not initialized');
      return;
    }
    
    const apiKey = 'ro0Q2olMiOxeLkHTU003';
    const url = `https://api.maptiler.com/maps/${style}/{z}/{x}/{y}.jpg?key=${apiKey}`;
    
    const tileLayer = L.tileLayer(url, {
      attribution: '© <a href="https://www.maptiler.com/">MapTiler</a> © <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
      maxZoom: 20
    });
    
    this.tileLayers[style] = { layer: tileLayer, name: name };
    
    if (Object.keys(this.tileLayers).length === 1) {
      tileLayer.addTo(this.map);
      this.currentTileLayer = style;
    }
  }

  toggleNextLayer() {
    if (!this.map) return;
    
    const styles = Object.keys(this.tileLayers);
    if (styles.length === 0) return;
    
    this.layerIndex = (this.layerIndex + 1) % styles.length;
    const nextStyle = styles[this.layerIndex];
    
    if (this.currentTileLayer) {
      this.tileLayers[this.currentTileLayer].layer.remove();
    }
    
    this.tileLayers[nextStyle].layer.addTo(this.map);
    this.currentTileLayer = nextStyle;
  }

  invalidateSize() {
    if (!this.map) return;
    
    setTimeout(() => {
      this.map.invalidateSize();
    }, 100);
  }

  isInitialized() {
    return this.map !== null && typeof this.map !== 'undefined';
  }

  destroy() {
    if (this.map) {
      this.clearMarkers();
      this.map.remove();
      this.map = null;
    }
    this.markers = [];
    this.tileLayers = {};
    this.currentTileLayer = null;
    this.layerIndex = 0;
  }

  addOSMFallback() {
    if (!this.map) return;

    const osmLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }
    );

    osmLayer.addTo(this.map);
    this.tileLayers['osm'] = { layer: osmLayer, name: 'OpenStreetMap' };
    this.currentTileLayer = 'osm';
  }

  addMarker(latlng, popupContent = '') {
    if (!this.map) return null;

    const marker = L.marker(latlng).addTo(this.map);
    
    if (popupContent) {
      marker.bindPopup(popupContent);
    }

    this.markers.push(marker);
    return marker;
  }

  clearMarkers() {
    this.markers.forEach(marker => {
      if (this.map) {
        this.map.removeLayer(marker);
      }
    });
    this.markers = [];
  }

  flyTo(latlng, zoom) {
    if (this.map) {
      this.map.flyTo(latlng, zoom);
    }
  }

  toggleNextLayer() {
    const styles = Object.keys(this.tileLayers);
    if (styles.length === 0) return;

    this.tileLayerIndex = (this.tileLayerIndex + 1) % styles.length;
    const nextStyle = styles[this.tileLayerIndex];
    
    this.switchTileLayer(nextStyle);
  }

  switchTileLayer(style) {
    if (!this.map || !this.tileLayers[style]) return;

    if (this.currentTileLayer && this.tileLayers[this.currentTileLayer]) {
      this.map.removeLayer(this.tileLayers[this.currentTileLayer].layer);
    }

    this.tileLayers[style].layer.addTo(this.map);
    this.currentTileLayer = style;
  }

  invalidateSize() {
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 100);
    }
  }
}

export default MapService;