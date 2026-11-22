// Folium invite page: https://<user>.github.io/folium/invitar/?c=<code>&n=<name>
// Reads `c` and `n` from the URL only (never calls Supabase).
// The inviter's name comes from the URL: it is always written with textContent.

// Install links. Fill them in when the first installable builds exist.
// While one is empty, its button shows "Pronto", dimmed and without a link.
export const ANDROID_URL = ''; // APK from EAS
export const IPHONE_URL = ''; // TestFlight invite link

export const INVITE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const MAX_NAME_LENGTH = 40; // same as profiles.display_name
export const COPIED_MS = 2000;

const CODE_RE = new RegExp(`^[${INVITE_ALPHABET}]{8}$`);
// Same characters public.normalize_invite_code removes:
// whitespace, "·", "." and the hyphen/dash family (- ‐ ‑ ‒ – —).
const SEPARATORS_RE = /[\s·.‐-—-]/g;

/** Code as typed -> as stored (mirrors public.normalize_invite_code). */
export function normalizeInviteCode(raw) {
  return String(raw ?? '').replace(SEPARATORS_RE, '').toUpperCase();
}

/** Valid 8-character code, or null. */
export function parseInviteCode(raw) {
  const code = normalizeInviteCode(raw);
  return CODE_RE.test(code) ? code : null;
}

/** 7KQM3XRH -> 7KQM·3XRH (only for display). */
export function formatInviteCode(code) {
  return `${code.slice(0, 4)}·${code.slice(4)}`;
}

/** Trimmed name cut to 40 characters (code points, like char_length), or null. */
export function parseInviterName(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  return Array.from(trimmed).slice(0, MAX_NAME_LENGTH).join('').trim();
}

export function appLink(code) {
  return `folium://invitar/${code}`;
}

export function readInvite(search) {
  const params = new URLSearchParams(search);
  return { code: parseInviteCode(params.get('c')), name: parseInviterName(params.get('n')) };
}

export function titleText(name) {
  return name ? `${name} te invita a Folium` : 'Te invitan a Folium';
}

export function footerText(name) {
  return (
    '¿Ya tienes Folium? Abre este enlace en tu teléfono y toca «Abrir en Folium»: ' +
    `te preguntará si quieres conectar con ${name ?? 'quien te invitó'}.`
  );
}

/** What an install button shows: a link, or "Pronto" while its URL is empty. */
export function installButton(url) {
  const href = String(url ?? '').trim();
  return href ? { href, label: 'Descárgala para' } : { href: null, label: 'Pronto' };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers / blocked clipboard API: select a hidden field and copy.
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    field.remove();
    return ok;
  }
}

function renderInstall(el, url) {
  const { href, label } = installButton(url);
  el.querySelector('[data-install-label]').textContent = label;
  if (href) {
    el.setAttribute('href', href);
    el.removeAttribute('aria-disabled');
    el.removeAttribute('tabindex');
    el.classList.remove('is-soon');
  } else {
    el.removeAttribute('href');
    el.setAttribute('aria-disabled', 'true');
    el.classList.add('is-soon');
  }
}

export function renderInvite(doc, search) {
  const { code, name } = readInvite(search);
  const $ = (id) => doc.getElementById(id);

  const title = titleText(name);
  doc.title = title;
  $('title').textContent = title;
  $('footer').textContent = footerText(name);

  if (code) {
    $('code').textContent = formatInviteCode(code);
    $('open-app').setAttribute('href', appLink(code));

    const copyButton = $('copy');
    const copyLabel = $('copy-label');
    let timer;
    copyButton.addEventListener('click', async () => {
      if (!(await copyText(code))) return;
      copyLabel.textContent = '¡Copiado!';
      clearTimeout(timer);
      timer = setTimeout(() => {
        copyLabel.textContent = 'Copiar código';
      }, COPIED_MS);
    });
  } else {
    $('code-card').hidden = true;
    $('open-app').hidden = true;
    $('footer').hidden = true;
    $('broken-link').hidden = false;
  }

  renderInstall($('install-android'), ANDROID_URL);
  renderInstall($('install-iphone'), IPHONE_URL);
}

if (typeof document !== 'undefined') {
  renderInvite(document, location.search);
}
