import { PointerEvent, useEffect, useRef, useState } from 'react';
import { CommitSummary, RefSummary } from '../git/browserGit';

type CommitCanvasProps = {
  commits: CommitSummary[];
  refs?: RefSummary[];
  branch?: string;
  onCheckoutCommit?(oid: string): void | Promise<void>;
  onCreateBranch?(oid: string): void | Promise<void>;
};

type Point = { commit: CommitSummary; x: number; y: number };

type DrawState = {
  viewWidth: number;
  viewHeight: number;
  worldWidth: number;
  offsetX: number;
  points: Point[];
  minimap: { x: number; y: number; width: number; height: number; scale: number };
};

export function CommitCanvas({ commits, refs = [], branch, onCheckoutCommit, onCreateBranch }: CommitCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offsetRef = useRef(0);
  const drawStateRef = useRef<DrawState | null>(null);
  const dragRef = useRef<{ mode: 'canvas' | 'minimap'; startX: number; startOffset: number } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; commit: CommitSummary } | null>(null);

  const drawRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const draw = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const ordered = [...commits].reverse();
      const gap = 140;
      const worldWidth = Math.max(rect.width, 160 + Math.max(0, ordered.length - 1) * gap + 160);
      const maxOffset = Math.max(0, worldWidth - rect.width);
      offsetRef.current = Math.max(0, Math.min(offsetRef.current, maxOffset));

      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.save();
      ctx.translate(-offsetRef.current, 0);
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      for (let x = -64; x < worldWidth + 64; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, rect.height);
        ctx.stroke();
      }
      for (let y = 0; y < rect.height; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(worldWidth, y);
        ctx.stroke();
      }

      if (ordered.length === 0) {
        ctx.restore();
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '14px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('还没有提交。使用终端创建第一个 commit。', rect.width / 2, rect.height / 2);
        drawStateRef.current = { viewWidth: rect.width, viewHeight: rect.height, worldWidth, offsetX: offsetRef.current, points: [], minimap: { x: 0, y: 0, width: 0, height: 0, scale: 1 } };
        return;
      }

      const y = rect.height / 2;
      const points: Point[] = ordered.map((commit, index) => ({ commit, x: 80 + index * gap, y }));

      ctx.strokeStyle = '#71717a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const [index, point] of points.entries()) {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();

      for (const [index, point] of points.entries()) {
        const isHead = refs.some((ref) => ref.current && ref.oid === point.commit.oid) || (!refs.length && index === points.length - 1);
        ctx.beginPath();
        ctx.fillStyle = isHead ? '#f4f4f5' : '#09090b';
        ctx.strokeStyle = '#f4f4f5';
        ctx.lineWidth = 2;
        ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillStyle = '#d4d4d8';
        ctx.fillText(point.commit.oid.slice(0, 7), point.x, point.y + 34);

        ctx.font = '13px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#f4f4f5';
        const message = point.commit.message.length > 18 ? `${point.commit.message.slice(0, 18)}…` : point.commit.message;
        ctx.fillText(message, point.x, point.y - 24);

        const labels = refs.filter((ref) => ref.oid === point.commit.oid && ref.name !== 'HEAD');
        labels.forEach((ref, labelIndex) => {
          const label = ref.name;
          ctx.font = '12px Inter, system-ui, sans-serif';
          const width = ctx.measureText(label).width + 18;
          const labelY = point.y - 58 - labelIndex * 28;
          ctx.fillStyle = ref.current ? '#f4f4f5' : '#18181b';
          ctx.strokeStyle = '#3f3f46';
          ctx.beginPath();
          ctx.roundRect(point.x - width / 2, labelY, width, 24, 12);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = ref.current ? '#09090b' : '#f4f4f5';
          ctx.fillText(label, point.x, labelY + 16);
        });
      }
      ctx.restore();

      const miniWidth = 180;
      const miniHeight = 64;
      const miniX = rect.width - miniWidth - 16;
      const miniY = rect.height - miniHeight - 16;
      const miniScale = miniWidth / worldWidth;
      ctx.fillStyle = 'rgba(9,9,11,0.86)';
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(miniX, miniY, miniWidth, miniHeight, 8);
      ctx.fill();
      ctx.stroke();

      const miniLineY = miniY + miniHeight / 2;
      ctx.strokeStyle = '#71717a';
      ctx.beginPath();
      ctx.moveTo(miniX + 12, miniLineY);
      ctx.lineTo(miniX + miniWidth - 12, miniLineY);
      ctx.stroke();
      for (const point of points) {
        const x = miniX + point.x * miniScale;
        ctx.beginPath();
        ctx.fillStyle = '#f4f4f5';
        ctx.arc(x, miniLineY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      const viewportX = miniX + offsetRef.current * miniScale;
      const viewportWidth = Math.max(24, rect.width * miniScale);
      ctx.strokeStyle = '#22d3ee';
      ctx.strokeRect(viewportX, miniY + 8, viewportWidth, miniHeight - 16);

      drawStateRef.current = {
        viewWidth: rect.width,
        viewHeight: rect.height,
        worldWidth,
        offsetX: offsetRef.current,
        points,
        minimap: { x: miniX, y: miniY, width: miniWidth, height: miniHeight, scale: miniScale }
      };
    };

    drawRef.current = draw;
    draw();
    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  }, [commits, refs, branch]);

  function canvasPoint(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function findNode(x: number, y: number): CommitSummary | null {
    const state = drawStateRef.current;
    if (!state) return null;
    const worldX = x + offsetRef.current;
    return state.points.find((point) => Math.hypot(point.x - worldX, point.y - y) <= 18)?.commit ?? null;
  }

  function onContextMenu(event: PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const point = canvasPoint(event);
    const commit = findNode(point.x, point.y);
    if (!commit) {
      setMenu(null);
      return;
    }
    setMenu({ x: point.x, y: point.y, commit });
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    setMenu(null);
    const state = drawStateRef.current;
    if (!state) return;
    const { x, y } = canvasPoint(event);
    const insideMini = x >= state.minimap.x && x <= state.minimap.x + state.minimap.width && y >= state.minimap.y && y <= state.minimap.y + state.minimap.height;
    dragRef.current = { mode: insideMini ? 'minimap' : 'canvas', startX: x, startOffset: offsetRef.current };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    const state = drawStateRef.current;
    if (!drag || !state) return;
    const { x } = canvasPoint(event);
    const maxOffset = Math.max(0, state.worldWidth - state.viewWidth);
    if (drag.mode === 'canvas') {
      offsetRef.current = Math.max(0, Math.min(maxOffset, drag.startOffset - (x - drag.startX)));
    } else {
      offsetRef.current = Math.max(0, Math.min(maxOffset, (x - state.minimap.x - (state.viewWidth * state.minimap.scale) / 2) / state.minimap.scale));
    }
    drawRef.current();
  }

  function onPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <>
      <canvas className="commit-canvas" ref={canvasRef} onContextMenu={onContextMenu} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} />
      {menu && (
        <div className="canvas-menu" style={{ left: menu.x, top: menu.y }}>
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(menu.commit.oid);
              setMenu(null);
            }}
          >
            复制提交哈希
          </button>
          <button
            onClick={() => {
              void onCheckoutCommit?.(menu.commit.oid);
              setMenu(null);
            }}
          >
            checkout 到此提交
          </button>
          <button
            onClick={() => {
              void onCreateBranch?.(menu.commit.oid);
              setMenu(null);
            }}
          >
            从这里创建分支
          </button>
        </div>
      )}
    </>
  );
}
