export function ensureGlobalX6Styles(): void {
  if (document.getElementById('sld-x6-style')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sld-x6-style';
  style.textContent = `
    .x6-widget-stencil { background-color: #fff; }
    .x6-widget-stencil-title { background-color: #fff; }
    .x6-widget-stencil-group-title { background-color: #fff !important; }
  `;
  document.head.appendChild(style);
}
