// get HTML elements
const imageInput = document.getElementById('imageInput');
const messageInput = document.getElementById('message');
const passwordInput = document.getElementById('password');
const encodeBtn = document.getElementById('encodeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const decodeBtn = document.getElementById('decodeBtn');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const decodedMessage = document.getElementById('decodedMessage');
const maxLength = document.getElementById('maxLength');

const advancedToggle = document.getElementById('advancedToggle');
const advancedFeatures = document.getElementById('advancedFeatures');
const affectedPixelsCanvas = document.getElementById('affectedPixelsCanvas');
const affectedCtx = affectedPixelsCanvas.getContext('2d');
const advancedStatus = document.getElementById('advancedStatus');

let img = new Image();

// toggle advanced features visibility
advancedToggle.addEventListener('change', () => {
    advancedFeatures.style.display = advancedToggle.checked ? 'block' : 'none';
});

// load image on file input
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// draw image on canvas and calculate maximum message length
img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    status.textContent = "Image loaded!";

    // calculate maximum message length
    const totalPixels = img.width * img.height;
    const maxMessageLength = Math.floor(totalPixels / 8); // 8 bits per character
    maxLength.textContent = `Maximum message length: ${maxMessageLength} characters.`;

    downloadBtn.disabled = true;
    decodeBtn.disabled = false;
};

// function to generate a random noise image
function generateNoiseImage(width, height) {
    canvas.width = width;
    canvas.height = height;
    const imgData = ctx.createImageData(width, height);
    const pixels = imgData.data;

    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = Math.floor(Math.random() * 256);     // red channel
        pixels[i + 1] = Math.floor(Math.random() * 256); // green channel
        pixels[i + 2] = Math.floor(Math.random() * 256); // blue channel
        pixels[i + 3] = 255;                            // alpha channel (fully opaque)
    }
    
    ctx.putImageData(imgData, 0, 0);
}

function generateRandomSequence(password, length) {
    const sha256 = CryptoJS.SHA256(password).toString(); // generate SHA-256 hash
    let seed = parseInt(sha256.slice(0, 16), 16); // use the first 16 characters of hash as seed

    // generate a sequential array of indices
    const sequence = [...Array(length).keys()];

    // use a PRNG for shuffling
    function random() {
        seed ^= seed << 13;
        seed ^= seed >> 17;
        seed ^= seed << 5;
        return Math.abs(seed) / 0x7fffffff; // Normalize to [0, 1)
    }

    // fisher-yates shuffle with improved randomness
    for (let i = sequence.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1)); // random index between 0 and i
        [sequence[i], sequence[j]] = [sequence[j], sequence[i]]; // swap
    }
    
    console.log(sequence);
    return sequence;
}

function calculateEntropy() {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;

    // create an array to store the frequency of grayscale values (0-255)
    const histogram = new Array(256).fill(0);

    // loop through each pixel, convert it to grayscale and update the histogram
    for (let i = 0; i < pixels.length; i += 4) {
        // calculate grayscale value using average method (R+G+B)/3
        const gray = Math.floor((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);
        histogram[gray]++;
    }

    // calculate the total number of pixels
    const totalPixels = canvas.width * canvas.height;

    // calculate the entropy
    let entropy = 0;
    for (let i = 0; i < histogram.length; i++) {
        const p = histogram[i] / totalPixels;
        if (p > 0) {
            entropy -= p * Math.log2(p);
        }
    }

    // display the entropy value
    console.log("Entropy of the image: " + entropy.toFixed(4));
    return entropy;
}

// encrypt a message using AES
function encryptMessage(message, password) {
    return CryptoJS.AES.encrypt(message, password).toString();
}

// decrypt a message using AES
function decryptMessage(encryptedMessage, password) {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, password);
    return bytes.toString(CryptoJS.enc.Utf8);
}

// encode message into image
encodeBtn.addEventListener('click', () => {
    const message = messageInput.value;
    const password = passwordInput.value;

    if (!message) {
        status.textContent = "Please enter a message to encode.";
        return;
    }

    // check if an image is uploaded, if not generate a noise image
    if (!img.src || img.src === '') {
        generateNoiseImage(1024, 1024); // default size for random noise image
        maxLength.textContent = `Maximum message length: 131072 characters.`;
    }

    let finalMessage = message;

    // encrypt the message if a password is provided
    if (password) {
        finalMessage = encryptMessage(message, password);
    }

    // convert the message to binary
    const binaryMessage = [...finalMessage]
        .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
        .join('') + '00000000'; // add a null character to signify the end of the message

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;

    if (binaryMessage.length > pixels.length / 4) {
        status.textContent = "Message is too long to encode in this image.";
        return;
    }

    // generate random pixel order if a password is provided
    const pixelOrder = password
        ? generateRandomSequence(password, pixels.length / 4)
        : [...Array(pixels.length / 4).keys()];

    // clear affected pixels canvas
    affectedCtx.clearRect(0, 0, affectedPixelsCanvas.width, affectedPixelsCanvas.height);
    affectedCtx.drawImage(canvas, 0, 0);

    // encode the binary message in the randomized pixel order
    let messageIndex = 0;
    for (let i = 0; i < pixelOrder.length; i++) {
        const pixelIndex = pixelOrder[i] * 4;
        if (messageIndex < binaryMessage.length) {
            // highlight affected pixels in the second canvas
            const x = pixelOrder[i] % canvas.width;
            const y = Math.floor(pixelOrder[i] / canvas.width);
            affectedCtx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // semi-transparent red
            affectedCtx.fillRect(x, y, 1, 1);

            // modify the pixel value in the original canvas
            pixels[pixelIndex] = (pixels[pixelIndex] & ~1) | parseInt(binaryMessage[messageIndex]);
            messageIndex++;
        }
    }

    ctx.putImageData(imgData, 0, 0);
    status.textContent = "Message encoded successfully!";

    // enable download and update advanced status
    downloadBtn.disabled = false;
    const entropy = calculateEntropy();
    advancedStatus.textContent = `Image Entropy: ${entropy.toFixed(4)}`;
});

// download the encoded image
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'encoded-image.png';
    link.href = canvas.toDataURL();
    link.click();
});

// decode message from image
decodeBtn.addEventListener('click', () => {
    const password = passwordInput.value;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;

    // generate random pixel order if password is provided
    const pixelOrder = password
        ? generateRandomSequence(password, pixels.length / 4)
        : [...Array(pixels.length / 4).keys()];

    let binaryMessage = "";
    for (let i = 0; i < pixelOrder.length; i++) {
        const pixelIndex = pixelOrder[i] * 4;
        binaryMessage += (pixels[pixelIndex] & 1).toString();
    }

    const chars = [];
    for (let i = 0; i < binaryMessage.length; i += 8) {
        const byte = binaryMessage.slice(i, i + 8);
        if (byte === "00000000") break; // stop at null character
        chars.push(String.fromCharCode(parseInt(byte, 2)));
    }

    const encryptedOrPlainText = chars.join('');

    // if password, decrypt message
    try {
        if (password) {
            const decryptedMessage = decryptMessage(encryptedOrPlainText, password);
            if (!decryptedMessage) throw new Error("Invalid decryption.");
            message.value = "";
            decodedMessage.value = decryptedMessage;
            status.textContent = "Message decoded successfully!";
        } else {
            message.value = "";
            decodedMessage.value = encryptedOrPlainText;
            status.textContent = "Message decoded successfully!";
        }
    } catch (error) {
        message.value = "";
        decodedMessage.value = "";
        status.textContent = "Failed to decode message. Incorrect password or corrupted data.";
    }
});

document.addEventListener('DOMContentLoaded', () => {
    let tooltip = null;
    let longPressTimer = null;

    const createTooltip = (text) => {
        tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        document.body.appendChild(tooltip);
    };

    const positionTooltip = (element) => {
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        const top = rect.top - tooltipRect.height - 10; // Position above the element
        const left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    };

    const showTooltip = (element) => {
        const tooltipText = element.getAttribute('data-tooltip');
        if (!tooltipText) return;

        createTooltip(tooltipText);
        positionTooltip(element);
        tooltip.classList.add('show');
    };

    const hideTooltip = () => {
        if (tooltip) {
            tooltip.classList.remove('show');
            tooltip.remove();
            tooltip = null;
        }

        // Clear the timer when the tooltip is hidden or the touch ends
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    };

    const tooltipElements = document.querySelectorAll('[data-tooltip]');

    tooltipElements.forEach((element) => {
        element.addEventListener('mouseenter', () => showTooltip(element));
        element.addEventListener('mouseleave', hideTooltip);
    });

    // hide tooltip if user taps elsewhere
    document.addEventListener('touchstart', (event) => {
        if (!event.target.closest('[data-tooltip]')) {
            hideTooltip();
        }
    });
});