(() => {
  'use strict';

  // Payments use an external Kaspi Pay link; reconciliation remains manual. No payment API or persisted donations.
  let campaign = { target: 1200000, received: null, updatedAt: null, status: 'active', closesAt: '2027-01-01T00:00:00+05:00', thanks: [], updates: [], reportUrl: null };
  let state = 'pending';
  const byId = (id) => document.getElementById(id);
  const money = (amount) => `${new Intl.NumberFormat('ru-KZ').format(amount)} ₸`;
  const sticky = byId('sticky-support');
  const primary = byId('primary-actions');
  const help = byId('help');
  const widthQuery = matchMedia('(max-width: 800px)');
  let framePending = false;

  function updateSticky() {
    framePending = false;
    const primaryBounds = primary.getBoundingClientRect();
    const helpBounds = help.getBoundingClientRect();
    const helpVisible = helpBounds.top < innerHeight && helpBounds.bottom > 0;
    const viewport = window.visualViewport;
    const magnified = (viewport && viewport.scale > 1.15) || parseFloat(getComputedStyle(document.body).fontSize) > 24;
    const obscured = viewport && innerHeight - viewport.height > 140;
    sticky.hidden = !widthQuery.matches || state === 'ended' || primaryBounds.bottom >= 0 || helpVisible || magnified || obscured || !!document.querySelector('dialog[open]');
  }

  function scheduleSticky() {
    if (!framePending) {
      framePending = true;
      requestAnimationFrame(updateSticky);
    }
  }

  const dateTime = value => new Intl.DateTimeFormat('ru-KZ', { timeZone: 'Asia/Almaty', dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));
  function render() {
    const { target, received, updatedAt } = campaign;
    const isPending = received === null;
    const isEnded = campaign.status === 'ended' || Date.now() >= Date.parse(campaign.closesAt);
    const isReached = !isPending && received >= target;
    const isStale = updatedAt && Date.now() - Date.parse(updatedAt) > 48 * 60 * 60 * 1000;
    state = isEnded ? 'ended' : isPending ? 'pending' : isReached ? 'reached' : isStale ? 'stale' : 'active';
    byId('progress-label').textContent = isEnded ? 'Итог сбора' : isReached ? 'Цель достигнута' : isPending ? 'Состояние сбора' : 'Собрано';
    byId('progress-value').textContent = isPending ? 'Данные готовятся' : money(received);
    const track = byId('progress-track');
    track.hidden = isPending;
    if (!isPending) {
      track.setAttribute('role', 'progressbar');
      track.setAttribute('aria-label', 'Состояние сбора');
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', String(target));
      track.setAttribute('aria-valuenow', String(Math.min(received, target)));
      track.setAttribute('aria-valuetext', `${money(received)} из ${money(target)}`);
      byId('progress-fill').style.width = `${Math.min(received / target * 100, 100)}%`;
    }
    byId('progress-tax').hidden = isPending;
    byId('progress-tax').textContent = isPending ? '' : `После вычета 3% налогов — ${money(Math.round(received * 0.97))}. Комиссия Kaspi вычитается отдельно.`;
    byId('progress-note').textContent = `${isStale && !isEnded ? 'Обновление задерживается. ' : ''}${updatedAt ? `Сверено ${dateTime(updatedAt)} (Алматы). ` : ''}Сумму и шкалу сбора обновляем вручную раз в сутки.`;
    primary.hidden = isEnded;
    byId('hero-result').hidden = !isEnded;
    byId('payment-button').hidden = isEnded;
    byId('ended-payment').hidden = !isEnded;
    byId('campaign-deadline').textContent = isEnded ? 'КАМПАНИЯ ДО 31 ДЕКАБРЯ 2026 · ЗАВЕРШЕНА' : 'ДО 31 ДЕКАБРЯ 2026';
    byId('updates-title').textContent = isEnded ? 'Сбор завершён. Спасибо за поддержку!' : isPending ? 'Данные о поступлениях готовятся' : isReached ? 'Цель достигнута. Продолжаем вместе.' : 'Как идёт сбор';
    byId('updates-copy').textContent = isEnded
      ? `${isPending ? 'Итоговая сверка поступлений готовится.' : `Собрано ${money(received)}.`} ${campaign.reportUrl ? 'Итоговый отчёт доступен ниже.' : 'Итоговый отчёт об использовании денег готовится; опубликуем его здесь.'}`
      : isPending ? 'Здесь будут подтверждённая сумма и датированные обновления. После завершения сбора — итог, дальнейший план и отчёт об использовании денег.'
      : 'Здесь учитываем подтверждённые разовые поступления, без резидентских взносов. Возврат из Kaspi сам по себе не подтверждает перевод.';
    const thanks = byId('thanks-list');
    thanks.replaceChildren(...campaign.thanks.map(name => { const li = document.createElement('li'); li.textContent = name; return li; }));
    thanks.hidden = !campaign.thanks.length;
    const updates = byId('campaign-updates');
    updates.replaceChildren(...campaign.updates.map(item => { const li = document.createElement('li'); const time = document.createElement('time'); time.dateTime = item.at; time.textContent = dateTime(item.at) + ' (Алматы)'; const text = document.createElement('p'); text.textContent = item.text; li.append(time, text); return li; }));
    updates.hidden = !campaign.updates.length;
    const report = byId('report-link');
    report.hidden = !campaign.reportUrl;
    if (campaign.reportUrl) report.href = campaign.reportUrl;
    document.body.dataset.campaignState = state;
    scheduleSticky();
  }

  function validData(data) {
    const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
    return data.target === 1200000 && (data.received === null || (Number.isSafeInteger(data.received) && data.received >= 0))
      && (data.received === null ? data.updatedAt === null : validDate(data.updatedAt))
      && ['active', 'ended'].includes(data.status) && data.closesAt === '2027-01-01T00:00:00+05:00'
      && Array.isArray(data.thanks) && data.thanks.every(name => typeof name === 'string' && name.trim().length > 0)
      && Array.isArray(data.updates) && data.updates.every(item => item && validDate(item.at) && typeof item.text === 'string')
      && (data.reportUrl === null || (typeof data.reportUrl === 'string' && /^https:\/\//.test(data.reportUrl)));
  }
  async function loadCampaign() {
    try {
      const response = await fetch('campaign.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Campaign data unavailable');
      const data = await response.json();
      if (!validData(data)) throw new Error('Invalid campaign data');
      campaign = data;
    } catch (error) {
      console.warn('Не удалось обновить данные сбора; сохраняем последнюю доступную сверку.', error);
    }
    render();
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const section = document.querySelector(link.getAttribute('href'));
      if (!section) return;
      event.preventDefault();
      section.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
      if (!section.hasAttribute('tabindex')) section.setAttribute('tabindex', '-1');
      section.focus({ preventScroll: true });
      history.replaceState(null, '', link.getAttribute('href'));
      scheduleSticky();
    });
  });
  addEventListener('scroll', scheduleSticky, { passive: true });
  addEventListener('resize', scheduleSticky, { passive: true });
  widthQuery.addEventListener('change', scheduleSticky);
  window.visualViewport?.addEventListener('resize', scheduleSticky, { passive: true });
  new ResizeObserver(scheduleSticky).observe(document.body);
  render();
  loadCampaign();
  setInterval(loadCampaign, 5 * 60 * 1000);
  setInterval(render, 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadCampaign(); });
})();
