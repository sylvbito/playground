const params = new URLSearchParams(location.search);
const variant = params.get('variant') || 'nested';
document.documentElement.dataset.variant = variant;

const variantDescriptions = {
  nested: 'Faithful repro: parent and child both have view-transition-name, plus .chat still has its own height/opacity transition.',
  'parent-only': 'Only .message-box participates in the view transition.',
  'child-only': 'Only .chat participates in the view transition.',
  'nested-groups': 'Attempt to force parent/child nesting with view-transition-group.',
  'parent-only-fix': 'Parent-only, plus height:100% on old/new snapshots.'
};

const current = document.querySelector('[data-current-variant]');
if (current) current.textContent = variant;
const desc = document.querySelector('[data-variant-description]');
if (desc) desc.textContent = variantDescriptions[variant] || 'Custom variant';

for (const link of document.querySelectorAll('[data-variant-link]')) {
  const url = new URL(link.getAttribute('href'), location.href);
  url.searchParams.set('variant', variant);
  link.href = url.pathname + url.search;
}

for (const anchor of document.querySelectorAll('[data-variant-picker] a')) {
  const url = new URL(anchor.href, location.href);
  url.searchParams.set('variant', anchor.dataset.variant);
  anchor.href = url.pathname + url.search;
  if (anchor.dataset.variant === variant) {
    anchor.style.fontWeight = '600';
    anchor.style.textDecoration = 'underline';
  }
}
