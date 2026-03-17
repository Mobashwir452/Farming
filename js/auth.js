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

    // Turnstile Callback (Unlocks the Next button)
    window.onTurnstileSuccess = function(token) {
        if (btnNextPhone) {
            btnNextPhone.disabled = false;
            btnNextPhone.style.opacity = '1';
            btnNextPhone.style.cursor = 'pointer';
            // Save token if needed for backend verification later
            window.turnstileToken = token;
        }
    };

    // Fallback for Localhost Testing if Turnstile dummy key doesn't fire callback automatically
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

    // Initialize Recaptcha (Invisible)
    const initRecaptcha = () => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'btnNextPhone', {
                'size': 'invisible',
                'callback': (response) => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                    onSignInSubmit();
                }
            });
        }
    };

    const onSignInSubmit = async () => {
        let phone = phoneNumberInput.value.trim();
        // If user copied +880 or starts with 880, clean it up to ensure strict 11 digits
        if(phone.startsWith('+88')) phone = phone.slice(3);
        if(phone.startsWith('88')) phone = phone.slice(2);
        
        const fullPhone = '+88' + phone;

        btnNextPhone.disabled = true;
        btnNextPhone.innerHTML = '<span class="material-icons-round" style="animation: spin 1s linear infinite;">autorenew</span> প্রসেসিং...';

        try {
            const result = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier);
            window.confirmationResult = result;
            
            // Go to OTP Step
            const disp = document.getElementById('otpPhoneDisp');
            if (disp) disp.innerText = `+৮৮০ ${phone.substring(0, 4)} ${phone.substring(4, 7)} ${phone.substring(7)}`;
            navigateTo(stepOtp);
            startOtpTimer();
        } catch (error) {
            console.error(error);
            showToastMsg('ওটিপি পাঠাতে সমস্যা হয়েছে। সঠিক নম্বর দিয়েছেন কিনা চেক করুন।', 'error');
            btnNextPhone.disabled = false;
            btnNextPhone.innerHTML = 'এগিয়ে যান <span class="material-icons-round">arrow_forward</span>';
            // Reset reCAPTCHA
            if(window.recaptchaVerifier) window.recaptchaVerifier.render().then(function(widgetId) {
                grecaptcha.reset(widgetId);
            });
        }
    };

    if (btnNextPhone && phoneNumberInput) {
        btnNextPhone.addEventListener('click', () => {
            const phone = phoneNumberInput.value.trim();

            if (phone.length !== 11 || !phone.startsWith('01')) {
                showToastMsg('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01xxxxxxxxx)', 'error');
                return;
            }

            initRecaptcha();
            
            // Programmatically trigger Recaptcha and flow
            onSignInSubmit();
        });
    }

    // Step 2: Login PIN
    const btnLogin = document.getElementById('btnLogin');
    const loginPin = document.getElementById('loginPin');

    if (btnLogin && loginPin) {
        btnLogin.addEventListener('click', () => {
            const pin = loginPin.value.trim();
            if (pin.length < 4) {
                showToastMsg('অন্তত ৪ ডিজিটের পিন দিন।', 'error');
                return;
            }

            btnLogin.disabled = true;
            btnLogin.innerHTML = '<span class="material-icons-round" style="animation: spin 1s linear infinite;">autorenew</span> লগইন হচ্ছে...';

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
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
                // In a real app, send user.uid to Cloudflare to check if profile exists
                btnVerifyOtp.disabled = false;
                btnVerifyOtp.innerText = 'সফল হয়েছে!';
                
                showToastMsg('সফলভাবে ভেরিফাই হয়েছে!', 'success');
                // Temporarily redirecting to signup/dashboard
                navigateTo(stepSignup); 
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
        btnSignup.addEventListener('click', () => {
            if (!signupName.value.trim() || signupPin.value.trim().length < 4) {
                showToastMsg('সঠিক নাম ও অন্তত ৪ ডিজিটের পিন দিন।', 'error');
                return;
            }

            btnSignup.disabled = true;
            btnSignup.innerHTML = '<span class="material-icons-round" style="animation: spin 1s linear infinite;">autorenew</span> অ্যাকাউন্ট তৈরি হচ্ছে...';

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
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
            if (window.recaptchaVerifier) window.recaptchaVerifier.render().then(function(widgetId) {
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
