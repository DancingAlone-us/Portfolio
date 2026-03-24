document.addEventListener("DOMContentLoaded", () => {
  const getCurrencySymbol = (currency) => {
    const symbols = {
      'GBP': '£',
      'USD': '$',
      'EUR': '€',
      'JPY': '¥',
      'NPR': '₹',
      'INR': '₹',
      'AUD': '$',
    };
    return symbols[currency] || currency + ' ';
  };

  const convertPrices = (rate, currency) => {
    const currencySymbol = getCurrencySymbol(currency);
    console.log('Converting prices with rate:', rate, 'to currency:', currency);
    
    
    const elements = document.querySelectorAll('p, span, div, strong, h1, h2, h3, h4, h5, h6, td, th, label, li, a, button');
    
    elements.forEach(el => {
     
      if (el.children.length > 0) return;
      
      const text = el.textContent.trim();
      
      
      if (text && text.includes('£')) {
        if (!el.dataset.originalText) {
          el.dataset.originalText = text;
        }
        
        const originalText = el.dataset.originalText;
        const priceMatch = originalText.match(/£\s*([\d,]+\.?\d*)/);
        
        if (priceMatch) {
          const originalPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
          const convertedPrice = (originalPrice * rate).toFixed(2);
          const newText = originalText.replace(/£\s*[\d,]+\.?\d*/, `${currencySymbol}${convertedPrice}`);
          el.textContent = newText;
          console.log('Converted:', originalText, '→', newText);
        }
      }
      // Look for standalone numbers (prices without symbols)
      else if (text && /^\d+\.\d{2}$/.test(text)) {
        // Store original if not stored
        if (!el.dataset.originalPrice) {
          el.dataset.originalPrice = text;
        }
        
        const originalPrice = parseFloat(el.dataset.originalPrice);
        const convertedPrice = (originalPrice * rate).toFixed(2);
        
        // Add currency symbol and show converted price
        if (rate !== 1) {
          el.textContent = `${currencySymbol}${convertedPrice}`;
        } else {
          el.textContent = `${currencySymbol}${originalPrice.toFixed(2)}`;
        }
        console.log('Converted price:', originalPrice, '→', el.textContent);
      }
    });
  };

  const initCurrencySwitcher = () => {
    const currencyToggle = document.querySelector('.nav-item.dropdown .nav-link.dropdown-toggle #currentCurrency');
    const currencyItems = document.querySelectorAll('.dropdown-item[data-currency]');
    
    // Load saved currency from localStorage, default to GBP
    const savedCurrency = localStorage.getItem('selectedCurrency') || 'GBP';
    const savedRate = localStorage.getItem('exchangeRate') || '1';
    
    console.log('Saved currency:', savedCurrency, 'Rate:', savedRate);
    
    if (savedCurrency && currencyToggle) {
      currencyToggle.textContent = savedCurrency;
      
      // Convert prices if rate exists and is not GBP (rate = 1)
      if (savedRate && parseFloat(savedRate) !== 1) {
        // Multiple attempts to catch all content
        setTimeout(() => convertPrices(parseFloat(savedRate), savedCurrency), 100);
        setTimeout(() => convertPrices(parseFloat(savedRate), savedCurrency), 300);
        setTimeout(() => convertPrices(parseFloat(savedRate), savedCurrency), 600);
        setTimeout(() => convertPrices(parseFloat(savedRate), savedCurrency), 1000);
      }
    }
    
    // Handle currency selection
    currencyItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const currency = item.dataset.currency;
        const rate = parseFloat(item.dataset.rate) || 1;
        
        // Save to localStorage
        localStorage.setItem('selectedCurrency', currency);
        localStorage.setItem('exchangeRate', rate);
        
        // Update toggle display
        if (currencyToggle) {
          currencyToggle.textContent = currency;
        }
        
        // Reload to apply conversion
        location.reload();
      });
    });
  };

  initCurrencySwitcher();

  const initial = window.INITIAL_AVAILABILITY || null;

  const setCount = (location, value) => {
    const el = document.querySelector(`[data-rooms-for="${location}"]`);
    if (el) el.textContent = value;
  };

  const refreshAvailability = async () => {
    try {
      const res = await fetch("/api/availability", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Failed to fetch availability");
      const data = await res.json();
      const avail = data.availability || {};
      Object.entries(avail).forEach(([loc, count]) => setCount(loc, count));
    } catch (err) {
      console.warn(err);
    }
  };

  const formatLocationTitle = (location) =>
    location.charAt(0).toUpperCase() + location.slice(1);

  const book = async (location) => {
    const btn = document.querySelector(`.btn-book[data-location="${location}"]`);
    const original = btn ? btn.textContent : null;
    if (btn) { btn.disabled = true; btn.textContent = "Booking..."; }
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ location })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Booking failed");
      setCount(location, data.available);
    } catch (err) {
      alert(err.message || "Booking failed");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = original || `Book in ${formatLocationTitle(location)}`;
      }
    }
  };

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-book");
    if (!btn) return;
    const location = btn.getAttribute("data-location");
    if (location) book(location);
  });

  if (initial && typeof initial === "object") {
    Object.entries(initial).forEach(([loc, count]) => setCount(loc, count));
  }

  refreshAvailability();
});

//Confirm Password
function checkPassword(){
  const password = document.getElementById("InputPassword1").value;
  const confirmPassword = document.getElementById("InputPassword2").value;
  
  if(password !=confirmPassword){
    alert("Incorrect Password.")
    return false;
  }

  return true;
}

// Differentitating between peak month and off season (booking page)
document.addEventListener('DOMContentLoaded', () => {
  const bookingTable = document.querySelector('#booking-table');
  if (!bookingTable) return;

  const peakMonths = [4, 5, 6, 7, 8, 11, 12];
  const availabilityDateInput = document.querySelector('#availability-checkin');
  const availabilityCheckoutInput = document.querySelector('#availability-checkout');
  const topFormDateInput = document.querySelector('#checkin');
  const topFormCheckoutHidden = document.querySelector('#checkout-hidden');

  const checkinInputs = [availabilityDateInput, topFormDateInput].filter(Boolean);
  if (checkinInputs.length === 0) return;

  const getIsPeak = (isoDate) => {
    if (!isoDate) return false;
    // Parse month from YYYY-MM-DD (avoid timezone shifts from Date parsing)
    const parts = String(isoDate).split('-');
    const month = Number.parseInt(parts[1] || '0', 10);
    return Number.isFinite(month) && peakMonths.includes(month);
  };

  const parseIsoToUtcMs = (isoDate) => {
    if (!isoDate) return null;
    const parts = String(isoDate).split('-');
    const y = Number.parseInt(parts[0] || '0', 10);
    const m = Number.parseInt(parts[1] || '0', 10);
    const d = Number.parseInt(parts[2] || '0', 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    if (y <= 0 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    return Date.UTC(y, m - 1, d);
  };

  const getNights = (checkinIso, checkoutIso) => {
    const inMs = parseIsoToUtcMs(checkinIso);
    const outMs = parseIsoToUtcMs(checkoutIso);
    if (inMs == null || outMs == null) return null;
    const diffDays = Math.round((outMs - inMs) / 86400000);
    return diffDays > 0 ? diffDays : null;
  };

  const getSelectedDates = () => {
    const checkin = availabilityDateInput?.value || topFormDateInput?.value || '';
    const checkout = availabilityCheckoutInput?.value || topFormCheckoutHidden?.value || '';
    return { checkin, checkout };
  };

  const syncCheckinInputs = (isoDate) => {
    checkinInputs.forEach((input) => {
      if (input.value !== isoDate) input.value = isoDate;
    });
  };

  const syncCheckoutInputs = (isoDate) => {
    if (availabilityCheckoutInput && availabilityCheckoutInput.value !== isoDate) {
      availabilityCheckoutInput.value = isoDate;
    }
    if (topFormCheckoutHidden) topFormCheckoutHidden.value = isoDate || '';
  };

  const updatePrices = () => {
    const { checkin, checkout } = getSelectedDates();
    const isPeak = getIsPeak(checkin);
    const nights = getNights(checkin, checkout) || 1;

    bookingTable.querySelectorAll('.price-cell').forEach((priceEl) => {
      const peak = Number.parseFloat(priceEl.dataset.peak || '0');
      const off = Number.parseFloat(priceEl.dataset.off || '0');
      const nightly = isPeak ? peak : off;
      const totalForStay = nightly * nights;
      priceEl.textContent = Number.isFinite(totalForStay) ? totalForStay.toFixed(2) : '—';
    });

    syncCheckinInputs(checkin);
    syncCheckoutInputs(checkout);
    calculateTotals();
  };

  const calculateTotals = () => {
  let grandTotal = 0;

  bookingTable.querySelectorAll('tbody tr').forEach((row) => {
    const priceEl = row.querySelector('.price-cell');
    const qtyEl = row.querySelector('input.room-qty[name="quantity"]');

    if (!priceEl || !qtyEl) return;

    const price = Number.parseFloat((priceEl.textContent || '').trim());
    const qty = Number.parseInt(qtyEl.value || '0', 10);

    if (Number.isFinite(price) && Number.isFinite(qty) && qty > 0) {
      grandTotal += price * qty;
    }
  });

  const grandTotalEl = document.getElementById('grand-total');
  if (grandTotalEl) {
    grandTotalEl.textContent = grandTotal.toFixed(2);
  }
  const grandTotalHidden = document.getElementById('grand-total-hidden');
  if (grandTotalHidden) {
    grandTotalHidden.value = grandTotal.toFixed(2);
  }
};


  [...checkinInputs, availabilityCheckoutInput].filter(Boolean).forEach((input) => {
    input.addEventListener('change', updatePrices);
  });

  const applyBtn = document.querySelector('#availability-apply');
  const searchForm = document.querySelector('#booking-search-form');
  if (applyBtn && searchForm) {
    applyBtn.addEventListener('click', () => {
      const { checkin, checkout } = getSelectedDates();
      if (!checkin) return;

      syncCheckinInputs(checkin);
      syncCheckoutInputs(checkout);

      if (typeof searchForm.requestSubmit === 'function') searchForm.requestSubmit();
      else searchForm.submit();
    });
  }

  bookingTable.addEventListener('input', (e) => {
    const qty = e.target.closest('input.room-qty[name="quantity"]');
    if (!qty) return;
    calculateTotals();
  });

  updatePrices();
});

const dateInput = document.getElementById('checkin');
const today = new Date().toISOString().split('T')[0];
dateInput.setAttribute('min', today);

document.addEventListener('DOMContentLoaded', () => {
  const checkin = document.getElementById('availability-checkin');
  const checkout = document.getElementById('availability-checkout');
  if (!checkin || !checkout) return;

  const dateToday = new Date().toLocaleDateString('en-CA'); // e.g. 2026-01-17

  checkin.setAttribute('min', dateToday);
  checkout.setAttribute('min', dateToday);

  const syncCheckoutMin = () => {
    if (!checkin.value) return;
    checkout.setAttribute('min', checkin.value);


    if (checkout.value && checkout.value < checkin.value) {
      checkout.value = checkin.value;
    }
  };

  checkin.addEventListener('input', syncCheckoutMin);
  checkin.addEventListener('change', syncCheckoutMin);


  checkout.addEventListener('input', () => {
    if (checkin.value && checkout.value < checkin.value) {
      checkout.value = checkin.value;
    }
  });


  syncCheckoutMin();
});

document.addEventListener('DOMContentLoaded', () => {
  const checkoutForm = document.getElementById('checkout-form');
  if (!checkoutForm) return;

  checkoutForm.addEventListener('submit', () => {
    const { checkin, checkout } = (() => {
      const availabilityDateInput = document.querySelector('#availability-checkin');
      const availabilityCheckoutInput = document.querySelector('#availability-checkout');
      const topFormDateInput = document.querySelector('#checkin');
      const checkinVal = (availabilityDateInput && availabilityDateInput.value) || (topFormDateInput && topFormDateInput.value) || '';
      const checkoutVal = (availabilityCheckoutInput && availabilityCheckoutInput.value) || '';
      return { checkin: checkinVal, checkout: checkoutVal };
    })();

    const hiddenCheckin = document.getElementById('checkin-hidden');
    const hiddenCheckout = document.getElementById('checkout-hidden');
    if (hiddenCheckin) hiddenCheckin.value = checkin;
    if (hiddenCheckout) hiddenCheckout.value = checkout;
  });
});


document.addEventListener('DOMContentLoaded', () => {
  const time = new Date();
  document.getElementById('date').innerHTML = time.toLocaleDateString();
});

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById('login');

  loginBtn.addEventListener('click', () => {
    alert('Logged in.')
  });
});

function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  const icon = button.querySelector('i');
            
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('bi-eye');
    icon.classList.add('bi-eye-slash');
  } else {
          input.type = 'password';
          icon.classList.remove('bi-eye-slash');
           icon.classList.add('bi-eye');
            }
          }