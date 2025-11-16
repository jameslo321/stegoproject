---

# Steganography Project

A browser-based tool that hides messages inside images using LSB steganography, optional AES encryption, and password-based randomized pixel ordering. No backend required — everything runs locally in the browser.

## Features

* Encode & decode messages inside any uploaded image
* AES-256 encryption (CryptoJS) when a password is provided
* Deterministic pixel shuffling using a password-derived PRNG
* Automatic noise-image generation (1024×1024) if no image is uploaded
* Advanced mode showing:

  * Highlighted pixels affected during encoding
  * Image entropy calculation

## How It Works

1. The message is optionally encrypted with AES.
2. Text → binary (8-bit chars + null terminator).
3. Pixels are accessed in sequential or password-shuffled order.
4. Each bit is stored in the least significant bit (LSB) of the red channel.
5. Decoding reverses the process and reconstructs the message.
6. If a password exists:

   * Pixel order must match
   * Message must decrypt cleanly

If no password is used, decoding is fully reversible by anyone.

## Usage

1. Upload an image or let the tool generate noise automatically.
2. Enter a message and optional password.
3. Click Encode Message, then Download to save the new image.
4. To retrieve a hidden message, load the encoded image and click Decode.

## Security Notes

* LSB steganography is not resistant to image recompression or resizing.
* Encryption only protects message confidentiality, not detectability.
* Noise images produce very high entropy and hide modifications effectively.

## Project Structure

```
index.html       – UI layout  
style.css        – Basic styles & tooltip behavior  
script.js        – Encoding, decoding, AES, PRNG, entropy, UI logic
```

## License

MIT License — feel free to use and modify.

---
