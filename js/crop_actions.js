// Crop Action Menu Handlers
// Requires activeCrop and currentFarmId from land_details.js namespace

const CROP_API_URL = 'https://agritech-backend.mobashwir9.workers.dev';

document.addEventListener('DOMContentLoaded', () => {
    // Expose close functions for Modals
    window.closeCropActionModals = function() {
        ['cropActionSheet', 'editCropStatusModal', 'addCropNoteModal'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.remove('active');
        });
        document.body.style.overflow = '';
    };

    window.openCropActionSheet = function() {
        if (!activeCrop) {
            alert('কোনো সক্রিয় ফসল নেই!');
            return;
        }
        document.getElementById('cropActionSheet').classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.openStatusUpdateModal = function() {
        document.getElementById('cropActionSheet').classList.remove('active');
        document.getElementById('editCropStatusModal').classList.add('active');
        
        // Pre-fill current status loosely if possible
        const selectEl = document.getElementById('cropStatusSelect');
        if (selectEl && activeCrop) {
            // Mapping existing status to simplified manual options if direct match exists
            const s = activeCrop.status ? activeCrop.status.toLowerCase() : '';
            if(s.includes('weak') || s.includes('দুর্বল')) selectEl.value = 'Weak';
            else if(s.includes('damage') || s.includes('ক্ষতিগ্রস্ত')) selectEl.value = 'Damaged';
            else selectEl.value = 'Healthy';
        }
    };

    window.openAddNoteModal = function() {
        document.getElementById('cropActionSheet').classList.remove('active');
        document.getElementById('addCropNoteModal').classList.add('active');
        document.getElementById('cropNoteText').value = '';
    };

    window.saveCropStatus = async function() {
        const newStatus = document.getElementById('cropStatusSelect').value;
        if(!newStatus) return;

        try {
            const token = localStorage.getItem('farmer_jwt');
            const res = await fetch(`${CROP_API_URL}/api/crops/${activeCrop.id}/status`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if(data.success) {
                activeCrop.status = newStatus;
                const cropStatusEl = document.querySelector('.ld-crop-text p:nth-child(3) span');
                if (cropStatusEl) cropStatusEl.innerHTML = `${newStatus} (ম্যানুয়াল আপডেট)`;
                alert('ফসলের অবস্থা সফলভাবে আপডেট হয়েছে!');
                closeCropActionModals();
            } else {
                alert(data.error || 'Update failed');
            }
        } catch(e) { alert('Connection error'); }
    };

    window.saveCropNote = async function() {
        const noteText = document.getElementById('cropNoteText').value.trim();
        if(!noteText) {
            alert('দয়া করে নোট লিখুন।');
            return;
        }

        try {
            const token = localStorage.getItem('farmer_jwt');
            const res = await fetch(`${CROP_API_URL}/api/crops/${activeCrop.id}/notes`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: noteText })
            });
            const data = await res.json();
            if(data.success) {
                alert('নোট সফলভাবে যোগ করা হয়েছে! নতুন নোটগুলো দেখতে পেজটি রিফ্রেশ হচ্ছে...');
                closeCropActionModals();
                window.location.reload();
            } else alert(data.error || 'Failed to add note');
        } catch(e) { alert('Connection error adding note: ' + e.message); }
    };

    window.handleMarkCropCompleted = async function() {
        if(!confirm('আপনি কি নিশ্চিত যে এই ফসলটি সম্পূর্ণ/কাটা হয়েছে? (ইহা ইতিহাস সেকশনে চলে যাবে)')) return;
        
        try {
            const token = localStorage.getItem('farmer_jwt');
            const res = await fetch(`${CROP_API_URL}/api/crops/${activeCrop.id}/complete`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if(data.success) {
                alert('ফসলটি সফলভাবে সম্পন্ন হিসেবে মার্ক করা হয়েছে!');
                closeCropActionModals();
                window.location.reload(); 
            } else alert(data.error);
        } catch(e) { alert('Connection error'); }
    };

    window.handleDeleteCrop = async function() {
        if(!confirm('সতর্কতা: আপনি কি সম্পূর্ণ ফসলটি মুছে ফেলতে চান? এই ডেটা আর ফিরে পাওয়া যাবে না!')) return;
        
        try {
            const token = localStorage.getItem('farmer_jwt');
            const res = await fetch(`${CROP_API_URL}/api/crops/${activeCrop.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if(data.success) {
                alert('ফসলটি ডাটাবেস থেকে রিমুভ করা হয়েছে।');
                closeCropActionModals();
                window.location.href = 'khamar.html';
            } else alert(data.error);
        } catch(e) { alert('Connection error'); }
    };

    window.generateCropReport = async function() {
        if(!activeCrop) return;
        try {
            const token = localStorage.getItem('farmer_jwt');
            const res = await fetch(`${CROP_API_URL}/api/crops/${activeCrop.id}/report`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if(data.success) {
                const r = data.report_data;
                const safeName = r.crop_name || activeCrop.crop_name || 'অজানা';
                
                // Add toBngDigits helper internally if missing
                function toBngDigits(num) { return String(num).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]); }

                // Populate DOM
                document.getElementById('pdf-farm-name').innerText = r.farm_name || '--';
                document.getElementById('pdf-crop-name').innerText = safeName;
                document.getElementById('pdf-farm-area').innerText = `${toBngDigits(r.farm_area || 0)} শতাংশ`;
                document.getElementById('pdf-generated-date').innerText = new Date().toLocaleDateString('bn-BD');

                // Finance
                let finHtml = '';
                r.resources.forEach(resItem => {
                   finHtml += `<tr>
                     <td style="padding: 8px; border: 1px solid #e2e8f0;">[খরচ] ${resItem.name}</td>
                     <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${toBngDigits(resItem.cost)}</td>
                   </tr>`;
                });
                finHtml += `<tr>
                     <td style="padding: 8px; border: 1px solid #e2e8f0;">[সম্ভাব্য আয়] ফসল বিক্রয়</td>
                     <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; color:#10B981;">${toBngDigits(r.revenue)}</td>
                   </tr>`;
                
                document.getElementById('pdf-finance-body').innerHTML = finHtml;
                const netProfit = r.revenue - r.cost;
                document.getElementById('pdf-net-profit').innerText = `${toBngDigits(netProfit)} ৳`;

                // Notes
                let notesHtml = '';
                if(r.notes) {
                    r.notes.forEach(n => {
                       const bdDate = new Date(n.date || Date.now()).toLocaleDateString('bn-BD');
                       notesHtml += `<div style="margin-bottom: 8px; padding: 10px; background: #f8fafc; border-left: 3px solid #3b82f6;">
                           <strong style="font-size: 13px; color: #475569;">${bdDate}:</strong> 
                           <span style="font-size: 14px; margin-left: 8px;">${n.note || n.text}</span>
                       </div>`;
                    });
                }
                if(!r.notes || r.notes.length === 0) notesHtml = '<p style="color: #94a3b8;">কোনো নোট সংরক্ষণ করা হয়নি।</p>';
                document.getElementById('pdf-notes-list').innerHTML = notesHtml;

                // Fire html2pdf
                const element = document.getElementById('pdf-report-container');
                element.style.display = 'block'; // Unhide temporarily
                
                const opt = {
                    margin:       10,
                    filename:     `Crop_Report_${safeName.replace(/\s+/g,'_')}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2 },
                    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                html2pdf().set(opt).from(element).save().then(() => {
                    element.style.display = 'none'; // Re-hide
                    closeCropActionModals();
                });

            } else alert(data.error);
        } catch(e) { 
            console.error("PDF Generate Error", e);
            alert('Generate Error: ' + e.message + '\\n(দয়া করে পেজটি একবার রিলোড/রিফ্রেশ দিয়ে আবার চেষ্টা করুন)।'); 
        }
    };
});
