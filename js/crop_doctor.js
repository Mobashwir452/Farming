// crop_doctor.js
import { registerComponents } from './components.js';

registerComponents();

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const stateLanding = document.getElementById('state-landing');
    const stateScanning = document.getElementById('state-scanning');
    const stateResult = document.getElementById('state-result');

    const btnOpenCamera = document.getElementById('btn-open-camera');
    const btnOpenGallery = document.getElementById('btn-open-gallery');
    const fileUpload = document.getElementById('file-upload');
    const btnScanAgain = document.getElementById('btn-scan-again');

    const scannedImage = document.getElementById('scanned-image');
    const resultImage = document.getElementById('result-image');

    // Default mock image for demo purposes
    const MOCK_IMAGE_URL = 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';

    // State Management
    function switchState(stateId) {
        stateLanding.style.display = 'none';
        stateScanning.style.display = 'none';
        stateResult.style.display = 'none';

        document.getElementById(stateId).style.display = 'flex';
    }

    // Handlers
    function startScan(imageUrl) {
        // Set images
        scannedImage.src = imageUrl;
        resultImage.src = imageUrl;

        // Switch to scanning state
        switchState('state-scanning');

        // Capture land selection
        const landSelect = document.getElementById('land-select');
        const selectedLandText = landSelect.options[landSelect.selectedIndex].text;
        const selectedLandValue = landSelect.value;

        // Simulate API call and processing time (3 seconds)
        setTimeout(() => {
            switchState('state-result');
            showToast('রোগ সফলভাবে শনাক্ত করা হয়েছে', 'success');

            // If a land was selected, show a success overlay or message
            if (selectedLandValue !== "") {
                setTimeout(() => {
                    showToast(`ফলাফলটি "${selectedLandText}" এর টাইমলাইনে যুক্ত করা হয়েছে`, 'info');
                }, 1000);
            }
        }, 3000);
    }

    // Event Listeners
    btnOpenCamera.addEventListener('click', () => {
        // In a real app, this would use the MediaDevices API to open the camera stream
        // For this demo, we'll simulate taking a picture by just starting the scan with a mock image
        showToast('ক্যামেরা চালু করা হচ্ছে...', 'info');
        setTimeout(() => {
            startScan(MOCK_IMAGE_URL);
        }, 500);
    });

    btnOpenGallery.addEventListener('click', () => {
        fileUpload.click();
    });

    fileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                startScan(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    btnScanAgain.addEventListener('click', () => {
        // Reset file input
        fileUpload.value = '';
        switchState('state-landing');
    });
});
