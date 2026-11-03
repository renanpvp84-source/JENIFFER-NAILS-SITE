(() => {
  const config = window.STUDIO;
  document.body.classList.add('motion-ready');
  if (!config) {
    document.body.classList.remove('motion-ready');
    return;
  }
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const whatsappUrl = (message = config.whatsappMessage) => {
    const phone = config.whatsapp.replace(/\D/g, '');
    return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message || '')}`;
  };
  if (config.whatsapp) {
    $$('[data-whatsapp-link]').forEach((link) => {
      link.href = whatsappUrl();
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    });
  }
  const bookingForm = $('#booking-form');
  const bookingDirect = $('#booking-direct');
  if (config.whatsapp) {
    bookingForm.hidden = false;
    bookingDirect.hidden = true;
  }
  const serviceList = $('#service-list');
  const serviceSelect = $('#booking-form select[name="service"]');
  const portfolioGrid = $('#portfolio-grid');
  const lightbox = $('#lightbox');
  let activePhotos = config.portfolio;
  let activePhotoIndex = 0;

  $('#year').textContent = new Date().getFullYear();
  document.title = `${config.name} | Nail Design em Presidente Prudente`;

  serviceList.replaceChildren();
  config.services.forEach((service, index) => {
    const item = document.createElement('article');
    item.className = 'service-item reveal';
    item.style.setProperty('--service-stagger', `${Math.min(index, 5) * 65}ms`);
    item.innerHTML = `<span class="service-thumb" aria-hidden="true"><img src="${service.image}" alt="" loading="lazy" width="248" height="330"><i>0${String(index + 1).padStart(2, '0')}</i></span><span class="service-copy"><h3>${service.name}</h3><p>${service.description}</p><button class="service-booking-cta" type="button" aria-label="Agendar ${service.name}" data-service="${service.name}">Agendar <span aria-hidden="true">↗</span></button></span><span class="service-price"><small>VALOR</small><strong>Sob consulta</strong></span>`;
    item.querySelector('.service-booking-cta').addEventListener('click', () => selectService(service.name));
    serviceList.append(item);
    const option = document.createElement('option');
    option.value = service.name;
    option.textContent = service.name;
    serviceSelect.append(option);
  });
  ['Consultar valores', 'Tirar uma dúvida'].forEach((label) => {
    const option = document.createElement('option');
    option.value = label;
    option.textContent = label;
    serviceSelect.append(option);
  });

  const bookingSteps = $$('.booking-step', bookingForm);
  const bookingProgress = $$('[data-booking-progress]', bookingForm);
  const selectedPhoto = $('#booking-selected-photo');
  const selectedServiceLabel = $('#booking-selected-service');
  let activeBookingStep = 1;
  function updateBookingPreview() {
    const service = config.services.find((entry) => entry.name === serviceSelect.value);
    if (service) {
      selectedPhoto.src = service.image;
      selectedPhoto.alt = `Referência do portfólio para ${service.name}`;
      selectedServiceLabel.textContent = service.name;
      $('.booking-live-preview').classList.add('is-selected');
    } else {
      selectedPhoto.src = 'assets/portfolio-rose.jpg';
      selectedPhoto.alt = 'Referência do portfólio da Jeniffer';
      selectedServiceLabel.textContent = serviceSelect.value ? 'Converse com a Jeniffer' : 'Seu design começa com uma escolha';
      $('.booking-live-preview').classList.remove('is-selected');
    }
    $('#booking-summary-service').textContent = serviceSelect.value || 'Serviço a escolher';
    const dateValue = $('#booking-form input[name="date"]').value;
    $('#booking-summary-date').textContent = dateValue
      ? new Date(`${dateValue}T12:00:00`).toLocaleDateString('pt-BR')
      : 'Data a combinar';
    const periodValue = $('#booking-form select[name="period"]').value;
    $('#booking-summary-period').textContent = periodValue ? `Período: ${periodValue}` : 'Período sem preferência';
  }
  function showBookingStep(stepNumber) {
    activeBookingStep = Math.max(1, Math.min(3, stepNumber));
    bookingSteps.forEach((step) => { step.hidden = Number(step.dataset.bookingStep) !== activeBookingStep; });
    bookingProgress.forEach((button) => {
      const number = Number(button.dataset.bookingProgress);
      if (number === activeBookingStep) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.dataset.complete = String(number < activeBookingStep);
      button.disabled = number >= activeBookingStep;
    });
    bookingForm.dataset.currentStep = String(activeBookingStep);
    if (activeBookingStep === 3) updateBookingPreview();
  }
  bookingProgress.forEach((button) => button.addEventListener('click', () => {
    const requestedStep = Number(button.dataset.bookingProgress);
    if (requestedStep < activeBookingStep) showBookingStep(requestedStep);
  }));
  $$('[data-booking-next]', bookingForm).forEach((button) => button.addEventListener('click', () => {
    const currentStep = bookingSteps.find((step) => Number(step.dataset.bookingStep) === activeBookingStep);
    const requiredField = currentStep.querySelector(':required');
    if (requiredField && !requiredField.reportValidity()) return;
    showBookingStep(activeBookingStep + 1);
    bookingSteps.find((step) => Number(step.dataset.bookingStep) === activeBookingStep)
      .querySelector('input,select,textarea')?.focus({ preventScroll: true });
  }));
  $$('[data-booking-back]', bookingForm).forEach((button) => button.addEventListener('click', () => {
    showBookingStep(activeBookingStep - 1);
    bookingSteps.find((step) => Number(step.dataset.bookingStep) === activeBookingStep)
      .querySelector('input,select,textarea')?.focus({ preventScroll: true });
  }));
  serviceSelect.addEventListener('change', updateBookingPreview);
  $('#booking-form input[name="date"]').addEventListener('change', updateBookingPreview);
  $('#booking-form select[name="period"]').addEventListener('change', updateBookingPreview);
  showBookingStep(1);

  const categories = ['Todos', ...new Set(config.portfolio.map((photo) => photo.category))];
  const filterWrap = $('#portfolio-filters');
  categories.forEach((category, index) => {
    const button = document.createElement('button');
    button.className = 'filter-button';
    button.type = 'button';
    button.textContent = category;
    button.setAttribute('aria-pressed', String(index === 0));
    button.addEventListener('click', () => {
      $$('.filter-button', filterWrap).forEach((filter) => filter.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', 'true');
      renderPortfolio(category);
    });
    filterWrap.append(button);
  });

  function renderPortfolio(category = 'Todos') {
    activePhotos = category === 'Todos' ? config.portfolio : config.portfolio.filter((photo) => photo.category === category);
    portfolioGrid.replaceChildren();
    activePhotos.forEach((photo, index) => {
      const tile = document.createElement('button');
      tile.className = 'portfolio-tile';
      tile.type = 'button';
      tile.setAttribute('aria-label', `Ampliar foto: ${photo.alt}`);
      tile.innerHTML = `<img src="${photo.src}" alt="${photo.alt}" loading="lazy" width="280" height="373"><span class="tile-caption">${photo.category}</span>`;
      tile.addEventListener('click', () => openLightbox(index));
      portfolioGrid.append(tile);
    });
  }
  renderPortfolio();

  function selectService(service) {
    serviceSelect.value = service;
    showBookingStep(1);
    updateBookingPreview();
    $('#agendamento').scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => serviceSelect.focus({ preventScroll: true }), 450);
  }

  const assistantButton = $('#assistant-button');
  const assistantPanel = $('#assistant-panel');
  function toggleAssistant(force) {
    const open = force ?? assistantPanel.hidden;
    assistantPanel.hidden = !open;
    assistantButton.setAttribute('aria-expanded', String(open));
  }
  assistantButton.addEventListener('click', () => toggleAssistant());
  $('.panel-close').addEventListener('click', () => toggleAssistant(false));
  $$('.assistant-option').forEach((button) => button.addEventListener('click', () => {
    toggleAssistant(false);
    switch (button.dataset.action) {
      case 'book': selectService(''); break;
      case 'services': $('#servicos').scrollIntoView({ behavior: 'smooth' }); break;
      case 'values': selectService('Consultar valores'); break;
      case 'portfolio': $('#portfolio').scrollIntoView({ behavior: 'smooth' }); break;
    }
  }));
  $$('[data-service]').forEach((link) => link.addEventListener('click', () => {
    if (link.tagName.toLowerCase() === 'a') selectService(link.dataset.service);
  }));

  const menuToggle = $('.menu-toggle');
  const mainNav = $('#main-nav');
  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    mainNav.classList.toggle('open', open);
  });
  $$('#main-nav a').forEach((link) => link.addEventListener('click', () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menu');
    mainNav.classList.remove('open');
  }));

  function openLightbox(index) {
    activePhotoIndex = index;
    updateLightbox();
    lightbox.showModal();
  }
  function updateLightbox() {
    const photo = activePhotos[activePhotoIndex];
    const image = $('figure img', lightbox);
    image.src = photo.src;
    image.alt = photo.alt;
    $('figcaption', lightbox).textContent = `${photo.category} · ${activePhotoIndex + 1} de ${activePhotos.length}`;
  }
  function moveLightbox(direction) {
    activePhotoIndex = (activePhotoIndex + direction + activePhotos.length) % activePhotos.length;
    updateLightbox();
  }
  $('.lightbox-prev').addEventListener('click', () => moveLightbox(-1));
  $('.lightbox-next').addEventListener('click', () => moveLightbox(1));
  $('.lightbox-close').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) lightbox.close(); });
  document.addEventListener('keydown', (event) => {
    if (!lightbox.open) return;
    if (event.key === 'ArrowLeft') moveLightbox(-1);
    if (event.key === 'ArrowRight') moveLightbox(1);
  });

  const dateInput = $('#booking-form input[name="date"]');
  dateInput.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $('#booking-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = form.get('name').trim();
    const service = form.get('service');
    if (!config.whatsapp) {
      $('#form-feedback').innerHTML = `O WhatsApp ainda não está configurado para este formulário. Para falar com a Jeniffer, chame pelo <a class="text-link" href="${config.instagram}" target="_blank" rel="noopener noreferrer">Instagram ↗</a>.`;
      return;
    }
    const date = form.get('date') ? new Date(`${form.get('date')}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem preferência';
    const period = form.get('period') || 'Sem preferência';
    const notes = form.get('notes').trim() || 'Nenhuma';
    const message = [
      `Olá, Jeniffer! Vim pelo seu site e gostaria de solicitar um agendamento.`,
      `Nome: ${name}`,
      `Procedimento: ${service}`,
      `Data de preferência: ${date}`,
      `Período: ${period}`,
      `Observações: ${notes}`,
      `Poderia me informar a disponibilidade e, se necessário, os valores?`
    ].join('\n');
    window.open(whatsappUrl(message), '_blank', 'noopener,noreferrer');
    $('#form-feedback').textContent = 'Solicitação preparada. O horário só estará confirmado após o retorno da profissional.';
  });

  const revealItems = $$('.reveal');
  const fadeTargets = $$('.fade-in-view');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fadeTransitionSupported = Boolean(window.CSS?.supports?.('transition', 'opacity 450ms ease-out'));
  const revealImmediately = () => {
    revealItems.forEach((item) => item.classList.add('is-visible'));
    fadeTargets.forEach((item) => {
      item.classList.remove('fade-in-view-pending');
      item.classList.add('fade-in-view-visible');
    });
  };

  if ('IntersectionObserver' in window && !reducedMotion) {
    const observedFades = fadeTransitionSupported ? fadeTargets : [];
    fadeTargets.filter((item) => !fadeTransitionSupported).forEach((item) => item.classList.add('fade-in-view-visible'));
    let remaining = revealItems.length + observedFades.length;
    try {
      const scrollObserver = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (observedFades.includes(entry.target)) {
            entry.target.classList.remove('fade-in-view-pending');
            entry.target.classList.add('fade-in-view-visible');
          } else entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
          remaining -= 1;
        });
        if (remaining <= 0) currentObserver.disconnect();
      }, { threshold: 0.1 });

      revealItems.forEach((item) => {
        try { scrollObserver.observe(item); }
        catch { item.classList.add('is-visible'); remaining -= 1; }
      });
      observedFades.forEach((item) => {
        // Only conceal this decorative target after the observer is ready.
        item.classList.add('fade-in-view-pending');
        try { scrollObserver.observe(item); }
        catch {
          item.classList.remove('fade-in-view-pending');
          item.classList.add('fade-in-view-visible');
          remaining -= 1;
        }
      });
      if (remaining <= 0) scrollObserver.disconnect();
    } catch { revealImmediately(); }
  } else revealImmediately();

  // Prepare the decorative rotation only after a one-shot observer is ready.
  const rotationTargets = $$('.rotation-entry');
  if (rotationTargets.length && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    try {
      const rotationObserver = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
            entry.target.classList.add('rotation-entry-visible');
            currentObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2 });

      rotationTargets.forEach((target) => {
        try {
          rotationObserver.observe(target);
          target.classList.add('rotation-entry-ready');
        } catch {
          target.classList.remove('rotation-entry-ready', 'rotation-entry-visible');
        }
      });
    } catch {
      rotationTargets.forEach((target) => target.classList.remove('rotation-entry-ready', 'rotation-entry-visible'));
    }
  }
})();
