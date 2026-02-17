<script setup>
import { ref, onMounted } from 'vue';
import { injectText, extractText } from './utils/steganography';

const activeTab = ref('inject'); // 'inject', 'extract', or 'help'
const originalImage = ref(null);
const resultImage = ref(null);
const secretText = ref('');
const seed = ref('');
const includeTimestamp = ref(true);
const includeLocation = ref(false);
const isProcessing = ref(false);
const progress = ref(0);
const error = ref('');
const success = ref('');
const extractedResult = ref('');
const showDisclaimer = ref(false);
const map = ref(null);
const marker = ref(null);

onMounted(() => {
  const lastAccepted = localStorage.getItem('disclaimer_accepted_at');
  const fortyEightHours = 48 * 60 * 60 * 1000;
  
  if (!lastAccepted || (Date.now() - parseInt(lastAccepted)) > fortyEightHours) {
    showDisclaimer.value = true;
  }
});

const acceptDisclaimer = () => {
  localStorage.setItem('disclaimer_accepted_at', Date.now().toString());
  showDisclaimer.value = false;
};

const handleDrop = (e, target) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    loadImage(file, target);
  }
};

const handleFileSelect = (e, target) => {
  const file = e.target.files[0];
  if (file) {
    loadImage(file, target);
  }
};

const loadImage = (file, target) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    if (target === 'inject') {
      originalImage.value = e.target.result;
      resultImage.value = null;
    } else {
      originalImage.value = e.target.result;
      extractedResult.value = '';
    }
    error.value = '';
    success.value = '';
    progress.value = 0;
  };
  reader.readAsDataURL(file);
};

const generateImage = async () => {
  if (!originalImage.value || !secretText.value) {
    error.value = 'Please select an image and enter text.';
    return;
  }

  isProcessing.value = true;
  error.value = '';
  progress.value = 0;

  let finalMessage = secretText.value;
  let locInfo = '';

  if (includeLocation.value) {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
      });
      locInfo = ` | GPS: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
    } catch (e) {
      error.value = 'Could not get precise location (Permission denied or timeout).';
      isProcessing.value = false;
      return;
    }
  }

  if (includeTimestamp.value || locInfo) {
    const now = new Date();
    const ts = now.toLocaleString();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    finalMessage = `[Encoded: ${ts}${locInfo} | Zone: ${tz}]\n\n${finalMessage}`;
  }
  
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Simulate progress for UI feedback while processing
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      progress.value = p;
      if (p >= 90) clearInterval(interval);
    }, 50);

    setTimeout(() => {
      try {
        resultImage.value = injectText(canvas, finalMessage, seed.value);
        progress.value = 100;
        success.value = seed.value ? 'Text encrypted and hidden successfully!' : 'Text hidden successfully!';
      } catch (e) {
        error.value = e.message;
        progress.value = 0;
      } finally {
        clearInterval(interval);
        isProcessing.value = false;
      }
    }, 600);
  };
  img.src = originalImage.value;
};

const handleExtract = () => {
  if (!originalImage.value) return;
  
  isProcessing.value = true;
  error.value = '';
  extractedResult.value = '';
  progress.value = 0;

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    let p = 0;
    const interval = setInterval(() => {
      p += 20;
      progress.value = p;
      if (p >= 80) clearInterval(interval);
    }, 40);

    setTimeout(() => {
      try {
        extractedResult.value = extractText(canvas, seed.value);
        progress.value = 100;
        success.value = seed.value ? 'Text extracted and decrypted successfully!' : 'Text extracted successfully!';
        
        // Parse for GPS coordinates: GPS: 52.229676, 21.012229
        const gpsMatch = extractedResult.value.match(/GPS: ([-.\d]+), ([-.\d]+)/);
        if (gpsMatch) {
          const lat = parseFloat(gpsMatch[1]);
          const lon = parseFloat(gpsMatch[2]);
          updateMap(lat, lon);
        }
      } catch (e) {
        error.value = 'Decoding error: ' + e.message;
        progress.value = 0;
      } finally {
        clearInterval(interval);
        isProcessing.value = false;
      }
    }, 500);
  };
  img.src = originalImage.value;
};

const updateMap = (lat, lon) => {
  setTimeout(() => {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    if (!map.value) {
      map.value = L.map('map').setView([lat, lon], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map.value);
      marker.value = L.marker([lat, lon]).addTo(map.value);
    } else {
      map.value.setView([lat, lon], 13);
      marker.value.setLatLng([lat, lon]);
    }
  }, 100);
};

const downloadImage = () => {
  const link = document.createElement('a');
  link.download = seed.value ? 'secure_encoded_image.png' : 'encoded_image.png';
  link.href = resultImage.value;
  link.click();
};

const reset = () => {
  originalImage.value = null;
  resultImage.value = null;
  secretText.value = '';
  seed.value = '';
  extractedResult.value = '';
  error.value = '';
  success.value = '';
};
</script>

<template>
  <div class="vscode-layout">
    <!-- GDPR/Privacy Overlay -->
    <div v-if="showDisclaimer" class="disclaimer-overlay">
      <div class="disclaimer-modal">
        <h3>Privacy & Data Processing Notice</h3>
        <p>This application processes all data <strong>locally in your browser</strong>. We do not use any servers to transmit, store, or process your images or text. Everything stays on your machine.</p>
        <p>In accordance with EU GDPR and Cookie Law, we inform you that we use <code>localStorage</code> only to remember your acceptance of this notice (valid for 48h). No tracking or profiling cookies are used.</p>
        <button class="vscode-btn" @click="acceptDisclaimer">I UNDERSTAND AND ACCEPT</button>
      </div>
    </div>

    <!-- Activity Bar -->
    <div class="activity-bar">
      <div 
        class="icon" 
        :class="{ active: activeTab === 'inject' }" 
        @click="activeTab = 'inject'; reset()"
        title="Inject Text"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M11 7h2v7h-2V7zm0 10h2v2h-2v-2zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
      </div>
      <div 
        class="icon" 
        :class="{ active: activeTab === 'extract' }" 
        @click="activeTab = 'extract'; reset()"
        title="Extract Text"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
      </div>
      <div 
        class="icon" 
        :class="{ active: activeTab === 'help' }" 
        @click="activeTab = 'help'"
        title="Help & Instructions"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
      </div>
    </div>

    <!-- Sidebar / Editor Area -->
    <div class="main-content">
      <header class="tab-header">
        <div class="tab" :class="{ active: activeTab === 'inject' }" @click="activeTab = 'inject'; reset()">
          Inject.png
        </div>
        <div class="tab" :class="{ active: activeTab === 'extract' }" @click="activeTab = 'extract'; reset()">
          Extract.png
        </div>
        <div class="tab" :class="{ active: activeTab === 'help' }" @click="activeTab = 'help'">
          Help.md
        </div>
      </header>

      <div class="editor-pane">
        <div class="container">
          <div class="toolbar">
            <span class="breadcrumb">Projects > IMAGE_INJECTOR > <b>{{ activeTab.toUpperCase() }}</b></span>
          </div>

          <!-- HELP TAB CONTENT -->
          <div v-if="activeTab === 'help'" class="help-content">
            <h2>User Guide</h2>
            <section>
              <h3>1. How to Hide Text (Inject)</h3>
              <ul>
                <li>Go to the <strong>Inject.png</strong> tab.</li>
                <li>Drag & drop an image or click the box to upload one.</li>
                <li>(Optional) Enter a <strong>Seed</strong>. This acts as a password for encryption and randomizes data placement.</li>
                <li>Type your message in the text area.</li>
                <li>Click <strong>GENERATE IMAGE</strong>. The result will be a PNG file.</li>
                <li><strong>Important:</strong> Only PNG format preserves the hidden data!</li>
              </ul>
            </section>
            <section>
              <h3>2. How to Retrieve Text (Extract)</h3>
              <ul>
                <li>Go to the <strong>Extract.png</strong> tab.</li>
                <li>Upload the PNG image that contains the hidden message.</li>
                <li>If a <strong>Seed</strong> was used during injection, you must enter the exact same Seed now.</li>
                <li>Click <strong>EXTRACT CONTENT</strong>.</li>
              </ul>
            </section>
            <section>
              <h3>3. Security Notes</h3>
              <p>Without the correct Seed, the hidden message is mathematically distributed across the image pixels and encrypted using XOR. Even if someone knows the algorithm, they cannot retrieve the message without your key.</p>
            </section>
          </div>

          <div v-else class="grid">
            <!-- Left Side: Inputs -->
            <div class="pane left-pane">
              <div class="section-title">SOURCE</div>
              <div 
                class="drop-zone" 
                @dragover.prevent 
                @drop="handleDrop($event, activeTab)"
                @click="$refs.fileInput.click()"
              >
                <div v-if="!originalImage" class="drop-hint">
                  <span>Drop image here</span>
                  <small>or click to browse</small>
                </div>
                <img v-else :src="originalImage" class="preview-img" />
                <input 
                  type="file" 
                  ref="fileInput" 
                  style="display: none" 
                  accept="image/*" 
                  @change="handleFileSelect($event, activeTab)"
                />
              </div>

              <div v-if="activeTab === 'inject'" class="input-area">
                <div class="section-title">SECURITY OPTIONS</div>
                <div class="field">
                  <label>Seed (optional key):</label>
                  <input v-model="seed" type="text" class="vscode-input" placeholder="Enter seed for encryption and randomization..." />
                </div>

                <div class="field checkbox-field">
                  <label class="checkbox-container">
                    <input type="checkbox" v-model="includeTimestamp" />
                    <span class="checkmark"></span>
                    Include timestamp and timezone
                  </label>
                </div>

                <div class="field checkbox-field">
                  <label class="checkbox-container">
                    <input type="checkbox" v-model="includeLocation" />
                    <span class="checkmark"></span>
                    Include precise location (GPS)
                  </label>
                </div>

                <div class="section-title">MESSAGE TO HIDE</div>
                <textarea 
                  v-model="secretText" 
                  placeholder="Enter your message here..."
                ></textarea>
                <button class="vscode-btn" @click="generateImage" :disabled="isProcessing || !originalImage">
                  {{ isProcessing ? 'PROCESSING...' : 'GENERATE IMAGE' }}
                </button>
              </div>

              <div v-if="activeTab === 'extract'" class="input-area">
                <div class="section-title">DECODING OPTIONS</div>
                <div class="field">
                  <label>Seed (if used during encoding):</label>
                  <input v-model="seed" type="text" class="vscode-input" placeholder="Enter the exact seed..." />
                </div>
                <button class="vscode-btn" @click="handleExtract" :disabled="isProcessing || !originalImage">
                  {{ isProcessing ? 'DECODING...' : 'EXTRACT CONTENT' }}
                </button>
              </div>
            </div>

            <!-- Right Side: Results -->
            <div class="pane right-pane">
              <div class="section-title">OUTPUT</div>
              
              <div v-if="activeTab === 'inject'" class="result-area">
                <div class="drop-zone result-frame">
                  <div v-if="resultImage" class="result-ready">
                    <img :src="resultImage" class="preview-img" />
                  </div>
                  <div v-else class="empty-state">
                    <span v-if="!isProcessing">Waiting for generation...</span>
                    <span v-else>Processing image...</span>
                  </div>
                </div>

                <div v-if="isProcessing || progress > 0" class="progress-container">
                  <div class="progress-bar" :style="{ width: progress + '%' }"></div>
                  <span class="progress-text">{{ progress }}%</span>
                </div>

                <button v-if="resultImage" class="vscode-btn full-width" @click="downloadImage">
                  DOWNLOAD FILE
                </button>
              </div>

              <div v-if="activeTab === 'extract'" class="result-area">
                <div v-if="isProcessing" class="progress-container" style="margin-bottom: 15px;">
                  <div class="progress-bar" :style="{ width: progress + '%' }"></div>
                </div>

                <div v-if="extractedResult" class="extracted-text-area">
                  <div class="section-title">EXTRACTED CONTENT</div>
                  <pre>{{ extractedResult }}</pre>

                  <div v-if="extractedResult.includes('GPS:')" class="map-wrapper">
                    <div class="section-title">DECODED LOCATION</div>
                    <div id="map"></div>
                  </div>
                </div>
                <div v-else class="empty-state">
                  No data to display.
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Console/Status -->
          <footer class="status-bar" :class="{ 'error-bar': error }">
            <div class="status-left">
              <span v-if="error" class="error-text">✖ {{ error }}</span>
              <span v-if="success" class="success-text">✔ {{ success }}</span>
              <span v-if="!error && !success">Ready</span>
            </div>
            <div class="status-right">
              <span>UTF-8</span>
              <span>Vue 3 / Vite</span>
              <span>No Server / Local Only</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
:root {
  --vscode-bg: #1e1e1e;
  --vscode-sidebar: #252526;
  --vscode-activity-bar: #333333;
  --vscode-tab-active: #1e1e1e;
  --vscode-tab-inactive: #2d2d2d;
  --vscode-border: #3c3c3c;
  --vscode-btn: #007acc;
  --vscode-btn-hover: #0062a3;
  --vscode-text: #cccccc;
  --vscode-header: #bbbbbb;
  --vscode-input-bg: #3c3c3c;
}

body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  background-color: var(--vscode-bg);
  color: var(--vscode-text);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

#app {
  height: 100vh;
  display: flex;
}

.vscode-layout {
  display: flex;
  width: 100%;
  height: 100%;
}

/* Disclaimer Overlay */
.disclaimer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.8);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.disclaimer-modal {
  background: var(--vscode-sidebar);
  border: 1px solid var(--vscode-btn);
  padding: 30px;
  max-width: 500px;
  border-radius: 4px;
  text-align: center;
}

.disclaimer-modal h3 { color: #fff; margin-top: 0; }
.disclaimer-modal p { font-size: 14px; line-height: 1.6; margin-bottom: 20px; }

.activity-bar {
  width: 50px;
  background-color: var(--vscode-activity-bar);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10px;
  border-right: 1px solid var(--vscode-border);
}

.activity-bar .icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #858585;
  cursor: pointer;
  transition: color 0.2s;
}

.activity-bar .icon:hover { color: #fff; }
.activity-bar .icon.active {
  color: #fff;
  border-left: 2px solid #fff;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--vscode-bg);
}

.tab-header {
  height: 35px;
  background-color: var(--vscode-sidebar);
  display: flex;
  border-bottom: 1px solid var(--vscode-border);
}

.tab {
  padding: 0 20px;
  height: 100%;
  display: flex;
  align-items: center;
  background-color: var(--vscode-tab-inactive);
  border-right: 1px solid var(--vscode-border);
  font-size: 13px;
  cursor: pointer;
  color: #969696;
}

.tab.active {
  background-color: var(--vscode-tab-active);
  color: #fff;
  border-bottom: 1px solid var(--vscode-btn);
}

.editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.container {
  padding: 10px 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar {
  font-size: 12px;
  color: #888;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--vscode-border);
  margin-bottom: 15px;
}

.help-content {
  overflow-y: auto;
  padding-right: 20px;
}

.help-content h2 { color: #fff; }
.help-content h3 { color: var(--vscode-btn); margin-top: 25px; }
.help-content ul { padding-left: 20px; }
.help-content li { margin-bottom: 10px; font-size: 14px; }

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  flex: 1;
  overflow: hidden;
}

.pane {
  display: flex;
  flex-direction: column;
  gap: 15px;
  overflow-y: auto;
}

.section-title {
  font-size: 11px;
  font-weight: bold;
  color: #aaa;
  margin-bottom: 5px;
}

.drop-zone {
  border: 1px dashed var(--vscode-border);
  background: #252526;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
}

.drop-hint {
  text-align: center;
  color: #888;
}

.drop-hint small { display: block; margin-top: 5px; }

.preview-img {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field label {
  font-size: 11px;
  color: #888;
}

.checkbox-field {
  margin-top: 5px;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px !important;
  color: var(--vscode-text) !important;
  user-select: none;
}

.checkbox-container input {
  cursor: pointer;
}

.vscode-input {
  background: var(--vscode-input-bg);
  border: 1px solid var(--vscode-border);
  color: #ccc;
  padding: 8px;
  font-size: 13px;
  border-radius: 2px;
}

.vscode-input:focus {
  outline: 1px solid var(--vscode-btn);
}

textarea {
  width: 100%;
  height: 120px;
  background: var(--vscode-input-bg);
  border: 1px solid var(--vscode-border);
  color: #ccc;
  padding: 10px;
  font-family: 'Consolas', monospace;
  resize: none;
  border-radius: 2px;
}

textarea:focus {
  outline: 1px solid var(--vscode-btn);
}

.vscode-btn {
  background: var(--vscode-btn);
  color: white;
  border: none;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 12px;
  margin-top: 5px;
}

.vscode-btn:hover:not(:disabled) { background: var(--vscode-btn-hover); }
.vscode-btn:disabled { background: #333; color: #666; cursor: not-allowed; }

.vscode-btn.full-width {
  width: 100%;
  padding: 10px;
  margin-top: 15px;
  font-weight: bold;
}

.vscode-btn.secondary {
  background: #3a3d41;
}
.vscode-btn.secondary:hover { background: #45494e; }

.result-area {
  display: flex;
  flex-direction: column;
}

.result-frame {
  cursor: default;
}

.progress-container {
  width: 100%;
  height: 20px;
  background: #252526;
  border: 1px solid var(--vscode-border);
  margin-top: 15px;
  position: relative;
  overflow: hidden;
  border-radius: 2px;
}

.progress-bar {
  height: 100%;
  background: var(--vscode-btn);
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 2px rgba(0,0,0,0.5);
}

.extracted-text-area pre {
  background: #252526;
  padding: 15px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  color: #ce9178;
  font-family: 'Consolas', monospace;
  font-size: 13px;
  border: 1px solid var(--vscode-border);
}

.map-wrapper {
  margin-top: 15px;
}

#map {
  height: 250px;
  border: 1px solid var(--vscode-border);
  border-radius: 4px;
  z-index: 1;
}

.status-bar {
  height: 22px;
  background: var(--vscode-btn);
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  font-size: 11px;
}

.status-bar.error-bar { background: #b91010; }

.error-text { color: #ffbaba; font-weight: bold; }
.success-text { color: #afffb5; font-weight: bold; }

.status-right span { margin-left: 15px; }
</style>
