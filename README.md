# Image Vault - Secure LSB Steganography Tool

![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Vue](https://img.shields.io/badge/Framework-Vue%203-42b883)

**Image Vault** is a professional, browser-based steganography tool designed with a VS Code aesthetic. It allows you to hide encrypted text messages within image pixels (LSB) using a deterministic shuffling algorithm and XOR cipher controlled by a user-provided Seed.

## 🚀 Key Features

- **Secure Injection**: Hide text in PNG images using Least Significant Bit (LSB) technique.
- **Seed-Based Security**: 
  - **Deterministic Shuffling**: Pixel placement is randomized based on your Seed (Mulberry32 PRNG).
  - **XOR Encryption**: The payload is encrypted with the Seed before injection.
- **Metadata Support**:
  - **Timestamp & Timezone**: Automatically log when the message was hidden.
  - **Precise Location**: Optional GPS coordinate injection with interactive Map decoding (Leaflet.js).
- **100% Private**: All processing happens locally in the browser. No data is ever sent to a server.
- **VS Code Theme**: Sleek, developer-friendly interface.
- **GDPR Compliant**: Local-only processing with clear privacy disclosures.

## 🛠 Tech Stack

- **Vue 3** (Composition API)
- **Vite** (Next Generation Frontend Tooling)
- **Leaflet.js** (Interactive Maps)
- **Vanilla JavaScript** (Core Cryptography & Steganography)
- **HTML5 Canvas** (Pixel Manipulation)

## 📖 How to Use

### Hiding a Message (Inject)
1.  Navigate to the **Inject.png** tab.
2.  Upload or drag-and-drop a source image.
3.  (Recommended) Enter a **Seed**. This acts as your secret key.
4.  Toggle "Include timestamp" or "Include precise location" if needed.
5.  Type your message and click **GENERATE IMAGE**.
6.  Download the resulting PNG file.

### Retrieving a Message (Extract)
1.  Navigate to the **Extract.png** tab.
2.  Upload the encoded PNG file.
3.  Enter the **Seed** used during the injection process.
4.  Click **EXTRACT CONTENT**.
5.  If location data was included, an interactive map will automatically appear.

## 🔒 Security Architecture

### Mathematical Distribution
Without the Seed, the hidden bits are placed linearly. When a Seed is provided:
1.  The Seed is hashed into a numeric state.
2.  A **Mulberry32 PRNG** is initialized with that state.
3.  Every available pixel index is shuffled deterministically.
4.  Data is injected into the shuffled indices, making pattern analysis nearly impossible.

### XOR Cipher
The text is Base64 encoded and then processed through a symmetric XOR cipher using the Seed string as the key before the LSB process begins.

## 📦 Installation & Development

To run this project locally:

```bash
# Clone the repository
git clone https://github.com/ussdeveloper/image-vault.git

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## ⚖️ Privacy
This application is serverless. Images and text never leave your machine. We use `localStorage` only to remember the GDPR disclaimer acceptance for 48 hours.

---
Created with ❤️ by GitHub Copilot.
