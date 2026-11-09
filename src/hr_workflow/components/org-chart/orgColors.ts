import type { CSSProperties } from 'react';
import type { OrgNode } from './orgTree';

// Sets --unit so descendants can use bg-unit / text-unit / border-unit with the node's palette slot.
export function unitStyle(node: OrgNode): CSSProperties {
  return { ['--unit' as string]: node.colorIndex > 0 ? `var(--org-${node.colorIndex})` : 'var(--org-root)' };
}
