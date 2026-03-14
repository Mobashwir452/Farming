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

    // Mock user database
    // "01700000000" can be a user. Any other starts with "01" is signup
    const existingUsers = ['01711111111', '01822222222', '01933333333'];

    if (btnNextPhone && phoneNumberInput) {
        btnNextPhone.addEventListener('click', () => {
            const phone = phoneNumberInput.value.trim();

            if (phone.length !== 11 || !phone.startsWith('01')) {
                showToastMsg('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01xxxxxxxxx)', 'error');
                return;
            }

            // Check if existing user
            if (existingUsers.includes(phone)) {
                // Existing User -> Step 2 (Login)
                const disp = document.getElementById('loginPhoneDisp');
                if (disp) disp.innerText = `+৮৮০ ${phone.substring(0, 4)} ${phone.substring(4, 7)} ${phone.substring(7)}`;
                navigateTo(stepLogin);
            } else {
                // New User -> Step 3 (OTP)
                const disp = document.getElementById('otpPhoneDisp');
                if (disp) disp.innerText = `+৮৮০ ${phone.substring(0, 4)} ${phone.substring(4, 7)} ${phone.substring(7)}`;
                navigateTo(stepOtp);
                startOtpTimer();
            }
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
        btnVerifyOtp.addEventListener('click', () => {
            let otp = '';
            otpBoxes.forEach(box => otp += box.value);

            if (otp.length < 4) {
                otpBoxes.forEach(box => box.classList.add('error'));
                setTimeout(() => {
                    otpBoxes.forEach(box => box.classList.remove('error'));
                }, 500);
                showToastMsg('সঠিক ৪ ডিজিটের ওটিপি দিন।', 'error');
                return;
            }

            btnVerifyOtp.disabled = true;
            btnVerifyOtp.innerText = 'যাচাই করা হচ্ছে...';

            setTimeout(() => {
                btnVerifyOtp.disabled = false;
                btnVerifyOtp.innerText = 'যাচাই করুন';
                navigateTo(stepSignup);
            }, 1000);
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
            showToastMsg('নতুন ওটিপি পাঠানো হয়েছে।', 'success');
            startOtpTimer();
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
