import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCXlZEkRpqzph1bog0QGobDeGF6qER3kjI",
    authDomain: "smartkhamar-9b521.firebaseapp.com",
    projectId: "smartkhamar-9b521",
    storageBucket: "smartkhamar-9b521.firebasestorage.app",
    messagingSenderId: "1057648659117",
    appId: "1:1057648659117:web:9219e249e8db29a3629424"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.useDeviceLanguage();

document.addEventListener('DOMContentLoaded', () => {
    // Basic Custom Toast if standard component not active
    const showToastMsg = (msg, type = 'info') => {
        if (window.showToast) {
            window.showToast(msg, type);
            return;
        }
        alert(msg); // Fallback
    };

    // Steps
    const step1 = document.getElementById('step1');
    const stepLogin = document.getElementById('stepLogin');
    const stepOtp = document.getElementById('stepOtp');
    const stepSignup = document.getElementById('stepSignup');
    let currentStep = step1;

    const navigateTo = (targetStep, direction = 'right') => {
        if (!currentStep || !targetStep) return;
        currentStep.classList.remove('active', 'slide-in-left');
        targetStep.classList.remove('slide-in-left');

        if (direction === 'left') {
            targetStep.classList.add('slide-in-left');
        }

        targetStep.classList.add('active');
        currentStep = targetStep;
    };

    // Back Links
    document.querySelectorAll('.back-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl) navigateTo(targetEl, 'left');
        });
    });

    // Step 1: Phone
    const btnNextPhone = document.getElementById('btnNextPhone');
    const phoneNumberInput = document.getElementById('phoneNumber');

    // Input Validation (Unlocks the Next button)
    if (phoneNumberInput) {
        phoneNumberInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (val.length === 11 && val.startsWith('01')) {
                if (btnNextPhone) {
                    btnNextPhone.disabled = false;
                    btnNextPhone.style.opacity = '1';
                    btnNextPhone.style.cursor = 'pointer';
                }
            } else {
                if (btnNextPhone) {
                    btnNextPhone.disabled = true;
                    btnNextPhone.style.opacity = '0.6';
                    btnNextPhone.style.cursor = 'not-allowed';
                }
            }
        });
    }

    // Global variable to hold confirmation result
    window.confirmationResult = null;

    // Initialize Recaptcha
    const initRecaptcha = () => {
        if (!window.recaptchaVerifier) {
            // Create a dedicated container for the visible Recaptcha so it doesn't break the button
            let recaptchaDiv = document.getElementById('recaptcha-container');
            if (!recaptchaDiv) {
                recaptchaDiv = document.createElement('div');
                recaptchaDiv.id = 'recaptcha-container';
                recaptchaDiv.style.marginTop = '15px';
                recaptchaDiv.style.marginBottom = '15px';
                btnNextPhone.parentNode.insertBefore(recaptchaDiv, btnNextPhone);
            }

            // Must use a visible widget with test numbers to prevent 400 errors on localhost
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'normal',
                'callback': (response) => {
                    // reCAPTCHA solved automatically.
                    console.log("Recaptcha resolved");
                }
            });
            window.recaptchaVerifier.render();
        }
    };

    const onSignInSubmit = async () => {
        let phone = phoneNumberInput.value.trim();
        // If user copied +880 or starts with 880, clean it up to ensure strict 11 digits
        if (phone.startsWith('+88')) phone = phone.slice(3);
        if (phone.startsWith('88')) phone = phone.slice(2);

        const fullPhone = '+88' + phone;

        btnNextPhone.disabled = true;
        btnNextPhone.innerHTML = '<span class="material-icons-round" style="animation: spin 1s linear infinite;">autorenew</span> প্রসেসিং...';

        try {
            // Check if verifier is built
            if (!window.recaptchaVerifier) {
                initRecaptcha();
            }

            const result = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier);
            window.confirmationResult = result;

            // Go to OTP Step
            const disp = document.getElementById('otpPhoneDisp');
            if (disp) disp.innerText = `+৮৮০ ${phone.substring(0, 4)} ${phone.substring(4, 7)} ${phone.substring(7)}`;
            navigateTo(stepOtp);
            startOtpTimer();
        } catch (error) {
            console.error(error);
            showToastMsg('ওটিপি পাঠাতে সমস্যা হয়েছে। Firebase Domain Auth চেক করুন।', 'error');
            btnNextPhone.disabled = false;
            btnNextPhone.innerHTML = 'এগিয়ে যান <span class="material-icons-round">arrow_forward</span>';
            // Note: the 400 error usually means 127.0.0.1 is not added to Firebase Authorized Domains

            // Reset Recaptcha so they can try again if they fix the domain
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.render().then(function (widgetId) {
                    grecaptcha.reset(widgetId);
                }).catch(e => console.log(e));
            }
        }
    };

    // Phone lookup store
    let currentLoginPhone = '';

    if (btnNextPhone && phoneNumberInput) {
        btnNextPhone.addEventListener('click', async (e) => {
            const phone = phoneNumberInput.value.trim();

            if (phone.length !== 11 || !phone.startsWith('01')) {
                showToastMsg('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01xxxxxxxxx)', 'error');
                e.preventDefault();
                e.stopImmediatePropagation();
                return;
            }

            btnNextPhone.disabled = true;
            btnNextPhone.innerHTML = '<span class="material-icons-round" style="animation: spin 1s linear infinite;">autorenew</span> চেক করা হচ্ছে...';
            
            // Clean phone for DB
            let cleanPhone = phone;
            if (cleanPhone.startsWith('+88')) cleanPhone = cleanPhone.slice(3);
            if (cleanPhone.startsWith('88')) cleanPhone = cleanPhone.slice(2);
            const fullPhone = '+88' + cleanPhone;

            try {
                // Pre-flight check: Does the user exist and have a PIN?
                const apiUrl = 'https://agritech-backend.mobashwir9.workers.dev';
                const res = await fetch(`${apiUrl}/api/auth/check-user`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: fullPhone })
                });

                if (res.ok) {
                    const data = await res.json();
                    currentLoginPhone = fullPhone; // Save for the PIN step
                    
                    if (data.exists && data.hasPin) {
                        // Returning User -> Go straight to PIN screen
                        btnNextPhone.disabled = false;
                        btnNextPhone.innerHTML = 'এগিয়ে যান <span class="material-icons-round">arrow_forward</span>';
                        navigateTo(stepLogin);
                        return; // Stop here, do not trigger OTP SMS
                    }
                }
                
                // If not exist, no pin, or error -> Fallback to standard OTP flow
                if (window.recaptchaVerifier) {
                    onSignInSubmit();
                } else {
                    initRecaptcha();
                    btnNextPhone.disabled = false;
                    btnNextPhone.innerText = "Recaptcha পূরণ করে আবার ক্লিক করুন";
                }

            } catch (err) {
                console.error("Check Error", err);
                // On error, let them try OTP anyway
                if (window.recaptchaVerifier) {
                    onSignInSubmit();
                } else {
                    initRecaptcha();
                    btnNextPhone.disabled = false;
                    btnNextPhone.innerText = "Recaptcha পূরণ করে আবার ক্লিক করুন";
                }
            }
        });
    }

    // Step 2: Login PIN
    const btnLogin = document.getElementById('btnLogin');
    const loginPin = document.getElementById('loginPin');

    if (btnLogin && loginPin) {
        btnLogin.addEventListener('click', async () => {
            const pin = loginPin.value.trim();
            if (pin.length < 4) {
                showToastMsg('অন্তত ৪ ডিজিটের পিন দিন।', 'error');
                return;
            }

            btnLogin.disabled = true;
            btnLogin.innerHTML = '<span class="material-icons-round" style="animation: spin 1s linear infinite;">autorenew</span> লগইন হচ্ছে...';

            try {
                const apiUrl = 'https://agritech-backend.mobashwir9.workers.dev';
                const response = await fetch(`${apiUrl}/api/auth/login-pin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: currentLoginPhone, pin: pin })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Login failed');
                }

                const data = await response.json();

                // Save JWT and user data
                localStorage.setItem('farmer_jwt', data.token);
                localStorage.setItem('farmer_profile', JSON.stringify(data.user));

                showToastMsg('সফলভাবে লগইন হয়েছে!', 'success');
                window.location.href = 'dashboard.html';

            } catch (error) {
                console.error("PIN Login Error:", error);
                btnLogin.disabled = false;
                btnLogin.innerHTML = 'লগইন করুন <span class="material-icons-round">login</span>';
                showToastMsg('পিন নম্বর ভুল হয়েছে। আবার চেষ্টা করুন।', 'error');
                loginPin.value = ''; // clear it
            }
        });
    }

    const btnForgotPin = document.getElementById('btnForgotPin');
    if (btnForgotPin) {
        btnForgotPin.addEventListener('click', () => {
            showToastMsg('আপনাকে একটি ওটিপি পাঠানো হচ্ছে...', 'info');
            setTimeout(() => {
                const phone = phoneNumberInput ? phoneNumberInput.value.trim() : '';
                const disp = document.getElementById('otpPhoneDisp');
                if (disp && phone) disp.innerText = `+৮৮০ ${phone.substring(0, 4)} ${phone.substring(4, 7)} ${phone.substring(7)}`;
                navigateTo(stepOtp);
                startOtpTimer();
            }, 1500);
        });
    }

    // Step 3: OTP Auto-focus
    const otpBoxes = document.querySelectorAll('.otp-input');
    otpBoxes.forEach((box, index) => {
        box.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < otpBoxes.length - 1) {
                otpBoxes[index + 1].focus();
            }
        });

        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                otpBoxes[index - 1].focus();
            }
        });
    });

    // OTP Verify
    const btnVerifyOtp = document.getElementById('btnVerifyOtp');
    if (btnVerifyOtp) {
        btnVerifyOtp.addEventListener('click', async () => {
            let otp = '';
            otpBoxes.forEach(box => otp += box.value);

            if (otp.length < 6) { // Firebase requires 6 digits
                otpBoxes.forEach(box => box.classList.add('error'));
                setTimeout(() => {
                    otpBoxes.forEach(box => box.classList.remove('error'));
                }, 500);
                showToastMsg('সঠিক ৬-ডিজিটের ওটিপি দিন।', 'error');
                return;
            }

            btnVerifyOtp.disabled = true;
            btnVerifyOtp.innerText = 'যাচাই করা হচ্ছে...';

            try {
                const result = await window.confirmationResult.confirm(otp);
                const user = result.user;
                console.log("Verified User:", user);

                // Get Firebase ID Token
                const idToken = await user.getIdToken();

                // When running via Live Server (e.g. port 5500) OR Production, 
                // explicitly point to the Live Wrangler Production URL 
                // so the user does not need to run `npx wrangler dev` locally.
                const apiUrl = 'https://agritech-backend.mobashwir9.workers.dev';

                // Call Cloudflare Worker to log the user into D1 and mint our custom JWT
                const response = await fetch(`${apiUrl}/api/auth/verify-firebase`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        idToken: idToken,
                        name: document.getElementById('signupName') ? document.getElementById('signupName').value : '',
                        pin: '' // Can be updated later in the profile stage
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Backend verification failed.');
                }

                const data = await response.json();

                // Keep the Worker's Custom JWT token structured for API usage
                localStorage.setItem('farmer_jwt', data.token);
                localStorage.setItem('farmer_profile', JSON.stringify(data.user));

                btnVerifyOtp.disabled = false;
                btnVerifyOtp.innerText = 'সফল হয়েছে!';

                showToastMsg('সফলভাবে ভেরিফাই ও লগইন হয়েছে!', 'success');

                // Direct to SignUp details step if they are a brand new user or have an incomplete profile
                if (data.isNewUser || data.needsProfileCompletion) {
                    navigateTo(stepSignup);
                } else {
                    window.location.href = 'dashboard.html';
                }

            } catch (error) {
                console.error("OTP Error:", error);
                btnVerifyOtp.disabled = false;
                btnVerifyOtp.innerText = 'যাচাই করুন';
                showToastMsg('ওটিপি ভুল হয়েছে, আবার চেষ্টা করুন।', 'error');
                otpBoxes.forEach(box => box.classList.add('error'));
            }
        });
    }

    // Step 4: Signup Final
    const btnSignup = document.getElementById('btnSignup');
    const signupName = document.getElementById('signupName');
    const signupPin = document.getElementById('signupPin');

    if (btnSignup && signupName && signupPin) {
        btnSignup.addEventListener('click', async () => {
            const name = signupName.value.trim();
            const pin = signupPin.value.trim();

            if (!name || pin.length < 4) {
                showToastMsg('সঠিক নাম ও অন্তত ৪ ডিজিটের পিন দিন।', 'error');
                return;
            }

            btnSignup.disabled = true;
            btnSignup.innerHTML = '<span class="material-icons-round" style="animation: spin 1s linear infinite;">autorenew</span> অ্যাকাউন্ট তৈরি হচ্ছে...';

            try {
                const token = localStorage.getItem('farmer_jwt');
                const apiUrl = 'https://agritech-backend.mobashwir9.workers.dev';

                const response = await fetch(`${apiUrl}/api/auth/profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name, pin })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to update profile');
                }

                const data = await response.json();

                // Update local profile with the new name
                localStorage.setItem('farmer_profile', JSON.stringify(data.user));

                showToastMsg('প্রোফাইল সফলভাবে তৈরি হয়েছে!', 'success');

                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);

            } catch (error) {
                console.error("Profile Error:", error);
                btnSignup.disabled = false;
                btnSignup.innerHTML = 'সম্পন্ন করুন <span class="material-icons-round">check_circle</span>';
                showToastMsg('প্রোফাইল সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
            }
        });
    }

    // OTP Timer Logic
    let otpInterval;
    const otpTimer = document.getElementById('otpTimer');
    const btnResendOtp = document.getElementById('btnResendOtp');

    const startOtpTimer = () => {
        if (!otpTimer || !btnResendOtp) return;
        clearInterval(otpInterval);
        let seconds = 59;
        btnResendOtp.disabled = true;
        btnResendOtp.style.opacity = '0.5';

        otpInterval = setInterval(() => {
            seconds--;
            otpTimer.innerText = `00:${seconds < 10 ? '0' + seconds : seconds}`;
            if (seconds <= 0) {
                clearInterval(otpInterval);
                btnResendOtp.disabled = false;
                btnResendOtp.style.opacity = '1';
                otpTimer.innerText = '00:00';
            }
        }, 1000);
    };

    if (btnResendOtp) {
        btnResendOtp.addEventListener('click', () => {
            if (window.recaptchaVerifier) window.recaptchaVerifier.render().then(function (widgetId) {
                grecaptcha.reset(widgetId);
            });
            onSignInSubmit();
            showToastMsg('নতুন ওটিপি রিকোয়েস্ট পাঠানো হচ্ছে...', 'info');
        });
    }

    // Toggle Password Visibility
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const input = e.currentTarget.previousElementSibling;
            const icon = e.currentTarget.querySelector('.material-icons-round');

            if (input.type === 'password') {
                input.type = 'text';
                icon.innerText = 'visibility';
                icon.style.color = 'var(--primary)';
            } else {
                input.type = 'password';
                icon.innerText = 'visibility_off';
                icon.style.color = '#94A3B8';
            }
        });
    });
});
