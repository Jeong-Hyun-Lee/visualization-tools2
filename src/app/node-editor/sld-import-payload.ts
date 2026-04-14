/** ge-vernova-sld 내보내기 / X6 cells 배열 등에서 그래프 JSON 추출 */
export function parseSldImportPayload(data: unknown): { cells: object[] } {
  if (Array.isArray(data)) {
    return { cells: data as object[] };
  }
  if (data == null || typeof data !== 'object') {
    throw new Error('invalid root');
  }
  const root = data as Record<string, unknown>;
  if (root['format'] === 'ge-vernova-sld' && root['graph'] != null) {
    const g = root['graph'];
    if (g != null && typeof g === 'object') {
      const cells = (g as Record<string, unknown>)['cells'];
      if (Array.isArray(cells)) {
        return { cells: cells as object[] };
      }
    }
    throw new Error('missing graph.cells');
  }
  if (Array.isArray(root['cells'])) {
    return { cells: root['cells'] as object[] };
  }
  throw new Error('unsupported format');
}
