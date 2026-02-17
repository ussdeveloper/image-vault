<script setup>
import { ref } from 'vue';
import { injectText, extractText } from './utils/steganography';

const activeTab = ref('inject'); // 'inject' or 'extract'
const originalImage = ref(null);
const resultImage = ref(null);
const secretText = ref('');
const seed = ref('');
const isProcessing = ref(false);
const error = ref('');
const success = ref('');
const extractedResult = ref('');

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
  };
  reader.readAsDataURL(file);
};

const generateImage = () => {
  if (!originalImage.value || !secretText.value) {
    error.value = 'Wybierz obraz i wpisz tekst.';
    return;
  }

  isProcessing.value = true;
  error.value = '';
  
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    try {
      resultImage.value = injectText(canvas, secretText.value, seed.value);
      success.value = seed.value ? 'Tekst został zaszyfrowany i ukryty!' : 'Tekst został ukryty!';
    } catch (e) {
      error.value = e.message;
    } finally {
      isProcessing.value = false;
    }
  };
  img.src = originalImage.value;
};

const handleExtract = () => {
  if (!originalImage.value) return;
  
  isProcessing.value = true;
  error.value = '';
  extractedResult.value = '';

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    try {
      extractedResult.value = extractText(canvas, seed.value);
      success.value = seed.value ? 'Tekst został odczytany i odszyfrowany!' : 'Tekst został odczytany!';
    } catch (e) {
      error.value = 'Błąd dekodowania: ' + e.message;
    } finally {
      isProcessing.value = false;
    }
  };
  img.src = originalImage.value;
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
    <!-- Activity Bar -->
    <div class="activity-bar">
      <div 
        class="icon" 
        :class="{ active: activeTab === 'inject' }" 
        @click="activeTab = 'inject'; reset()"
        title="Wstrzyknij tekst"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M11 7h2v7h-2V7zm0 10h2v2h-2v-2zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
      </div>
      <div 
        class="icon" 
        :class="{ active: activeTab === 'extract' }" 
        @click="activeTab = 'extract'; reset()"
        title="Odczytaj tekst"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
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
      </header>

      <div class="editor-pane">
        <div class="container">
          <div class="toolbar">
            <span class="breadcrumb">Nowe Projekty > BASE64IMAGEINJECTION > <b>{{ activeTab === 'inject' ? 'Inject' : 'Extract' }}</b></span>
          </div>

          <div class="grid">
            <!-- Left Side: Inputs -->
            <div class="pane left-pane">
              <div class="section-title">ŹRÓDŁO</div>
              <div 
                class="drop-zone" 
                @dragover.prevent 
                @drop="handleDrop($event, activeTab)"
                @click="$refs.fileInput.click()"
              >
                <div v-if="!originalImage" class="drop-hint">
                  <span>Przeciągnij obraz tutaj</span>
                  <small>lub kliknij by wybrać z pliku</small>
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
                <div class="section-title">OPCJE ZABEZPIECZEŃ</div>
                <div class="field">
                  <label>Seed (opcjonalny klucz):</label>
                  <input v-model="seed" type="text" class="vscode-input" placeholder="Wpisz seed dla losowania pikseli i szyfrowania..." />
                </div>
                
                <div class="section-title">TREŚĆ DO UKRYCIA</div>
                <textarea 
                  v-model="secretText" 
                  placeholder="Tutaj wpisz treść..."
                ></textarea>
                <button class="vscode-btn" @click="generateImage" :disabled="isProcessing || !originalImage">
                  {{ isProcessing ? 'PRZETWARZANIE...' : 'GENERUJ OBRAZ' }}
                </button>
              </div>

              <div v-if="activeTab === 'extract'" class="input-area">
                <div class="section-title">OPCJE DEKODOWANIA</div>
                <div class="field">
                  <label>Seed (jeśli użyto przy kodowaniu):</label>
                  <input v-model="seed" type="text" class="vscode-input" placeholder="Wpisz ten sam seed co przy kodowaniu..." />
                </div>
                <button class="vscode-btn" @click="handleExtract" :disabled="isProcessing || !originalImage">
                  {{ isProcessing ? 'DEKODOWANIE...' : 'ODCZYTAJ TREŚĆ' }}
                </button>
              </div>
            </div>

            <!-- Right Side: Results -->
            <div class="pane right-pane">
              <div class="section-title">WYNIK</div>
              
              <div v-if="activeTab === 'inject'" class="result-box">
                <div v-if="resultImage" class="result-ready">
                  <img :src="resultImage" class="preview-img" />
                  <button class="vscode-btn secondary" @click="downloadImage">POBIERZ PLIK</button>
                </div>
                <div v-else class="empty-state">
                  Oczekiwanie na generowanie...
                </div>
              </div>

              <div v-if="activeTab === 'extract'" class="result-box">
                <div v-if="extractedResult" class="extracted-text-area">
                  <div class="section-title">ODCZYTANA TREŚĆ</div>
                  <pre>{{ extractedResult }}</pre>
                </div>
                <div v-else class="empty-state">
                  Brak danych do wyświetlenia.
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Console/Status -->
          <footer class="status-bar">
            <div class="status-left">
              <span v-if="error" class="error-text">✖ {{ error }}</span>
              <span v-if="success" class="success-text">✔ {{ success }}</span>
              <span v-if="!error && !success">Gotowy</span>
            </div>
            <div class="status-right">
              <span>UTF-8</span>
              <span>Vue 3 / Vite</span>
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

.vscode-btn.secondary {
  background: #3a3d41;
}
.vscode-btn.secondary:hover { background: #45494e; }

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  font-style: italic;
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

.status-bar.error-state { background: #b91010; }

.error-text { color: #ffbaba; font-weight: bold; }
.success-text { color: #afffb5; font-weight: bold; }

.status-right span { margin-left: 15px; }
</style>
