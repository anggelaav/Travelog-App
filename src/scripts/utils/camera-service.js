class CameraService {
  constructor(videoElementId, canvasElementId) {
    this.videoElement = document.getElementById(videoElementId);
    this.canvasElement = document.getElementById(canvasElementId);
    
    if (this.canvasElement) {
      this.canvasContext = this.canvasElement.getContext('2d');
    }
    
    this.stream = null;
    this.facingMode = 'environment';
    this.isCameraActive = false;
    this.videoWidth = 0;
    this.videoHeight = 0;
  }

  async startCamera() {
    try {
      await this.stopCamera();

      const constraints = {
        video: { 
          facingMode: this.facingMode,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          aspectRatio: { ideal: 4/3 }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        this.isCameraActive = true;
        this.videoElement.style.objectFit = 'cover';
        this.videoElement.style.width = '100%';
        this.videoElement.style.height = '100%';
      }
      
      return new Promise((resolve, reject) => {
        if (!this.videoElement) {
          reject(new Error('Video element not found'));
          return;
        }

        this.videoElement.onloadedmetadata = () => {
          this.videoWidth = this.videoElement.videoWidth;
          this.videoHeight = this.videoElement.videoHeight;
          
          console.log('Camera dimensions:', {
            videoWidth: this.videoWidth,
            videoHeight: this.videoHeight,
            aspectRatio: this.videoWidth / this.videoHeight,
            containerWidth: this.videoElement.clientWidth,
            containerHeight: this.videoElement.clientHeight
          });

          this.videoElement.play().then(resolve).catch(reject);
        };
        
        this.videoElement.onerror = reject;
        
        setTimeout(() => {
          if (this.videoElement.readyState >= 1) {
            if (this.videoWidth === 0) {
              this.videoWidth = this.videoElement.videoWidth || 1280;
              this.videoHeight = this.videoElement.videoHeight || 720;
            }
            resolve();
          }
        }, 1000);
      });
    } catch (error) {
      this.isCameraActive = false;
      throw new Error(`Tidak dapat mengakses kamera: ${error.message}`);
    }
  }

  async stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
      this.stream = null;
    }
    
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    
    this.isCameraActive = false;
    this.videoWidth = 0;
    this.videoHeight = 0;
  }

  async switchCamera() {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
    await this.startCamera();
  }

  capturePhoto() {
    return new Promise((resolve, reject) => {
      if (!this.isCameraActive || !this.stream) {
        reject(new Error('Kamera tidak aktif'));
        return;
      }

      if (!this.canvasElement || !this.videoElement) {
        reject(new Error('Element canvas atau video tidak ditemukan'));
        return;
      }

      try {
        const outputWidth = this.videoWidth;
        const outputHeight = this.videoHeight;

        console.log('Capturing photo with dimensions:', outputWidth, outputHeight);

        this.canvasElement.width = outputWidth;
        this.canvasElement.height = outputHeight;

        this.canvasContext.drawImage(
          this.videoElement,
          0, 0,                    
          outputWidth,              
          outputHeight           
        );

        this.canvasElement.toBlob((blob) => {
          if (blob) {
            console.log('Photo captured successfully, size:', blob.size, 'dimensions:', outputWidth + 'x' + outputHeight);
            resolve(blob);
          } else {
            reject(new Error('Gagal membuat blob dari foto'));
          }
        }, 'image/jpeg', 0.85); 
      } catch (error) {
        console.error('Error in capturePhoto:', error);
        reject(new Error('Gagal mengambil foto: ' + error.message));
      }
    });
  }

  capturePhotoToContainerSize() {
    return new Promise((resolve, reject) => {
      if (!this.isCameraActive || !this.stream) {
        reject(new Error('Kamera tidak aktif'));
        return;
      }

      try {
        const container = this.videoElement.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        const aspectRatio = this.videoWidth / this.videoHeight;
        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

        if (containerWidth / containerHeight > aspectRatio) {
          drawHeight = containerHeight;
          drawWidth = containerHeight * aspectRatio;
          offsetX = (containerWidth - drawWidth) / 2;
        } else {
          drawWidth = containerWidth;
          drawHeight = containerWidth / aspectRatio;
          offsetY = (containerHeight - drawHeight) / 2;
        }

        this.canvasElement.width = containerWidth;
        this.canvasElement.height = containerHeight;

        this.canvasContext.fillStyle = 'white';
        this.canvasContext.fillRect(0, 0, containerWidth, containerHeight);

        this.canvasContext.drawImage(
          this.videoElement,
          0, 0, this.videoWidth, this.videoHeight,
          offsetX, offsetY, drawWidth, drawHeight
        );

        this.canvasElement.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Gagal membuat blob dari foto'));
          }
        }, 'image/jpeg', 0.92);

      } catch (error) {
        reject(new Error('Gagal mengambil foto: ' + error.message));
      }
    });
  }

  async checkCameraSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Browser tidak mendukung akses kamera');
    }
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      return videoDevices.length > 0;
    } catch (error) {
      console.warn('Tidak dapat memeriksa perangkat kamera:', error);
      return true;
    }
  }

  destroy() {
    this.stopCamera();
  }
}

export default CameraService;