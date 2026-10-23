import type { DragEvent } from 'react';

/** What is being dragged on the Allocate screen: a balance-list student or a seated one. */
export type DragSource =
  | { from: 'balance'; roll: string }
  | { from: 'seat'; roomIdx: number; row: number; col: number };

export function startDrag(e: DragEvent, src: DragSource) {
  e.dataTransfer.setData('text/plain', JSON.stringify(src));
  e.dataTransfer.effectAllowed = 'move';
}

export function readDrag(e: DragEvent): DragSource | null {
  try {
    const src = JSON.parse(e.dataTransfer.getData('text/plain'));
    return src && (src.from === 'balance' || src.from === 'seat') ? src : null;
  } catch {
    return null;
  }
}
