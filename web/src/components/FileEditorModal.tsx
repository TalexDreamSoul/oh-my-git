import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { useEffect, useRef, useState } from 'react';

type FileEditorModalProps = {
  file: string;
  content: string;
  theme: 'dark' | 'light';
  onChange(content: string): void;
  onSave(): void;
  onClose(): void;
};

function languageForFile(file: string) {
  if (file.endsWith('.md')) return markdown();
  if (/\.(js|jsx|ts|tsx|json)$/.test(file)) return javascript({ jsx: true, typescript: /\.(ts|tsx)$/.test(file) });
  return [];
}

export function FileEditorModal({ file, content, theme, onChange, onSave, onClose }: FileEditorModalProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const [stats, setStats] = useState(() => ({
    chars: content.length,
    lines: content.split('\n').length,
    line: 1,
    column: 1
  }));
  onChangeRef.current = onChange;

  function updateStats(view: EditorView) {
    const doc = view.state.doc;
    const selectionHead = view.state.selection.main.head;
    const line = doc.lineAt(selectionHead);
    setStats({
      chars: doc.length,
      lines: doc.lines,
      line: line.number,
      column: selectionHead - line.from + 1
    });
  }

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: content,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
            if (update.docChanged || update.selectionSet) updateStats(update.view);
          }),
          languageForFile(file),
          theme === 'dark' ? oneDark : []
        ]
      })
    });
    viewRef.current = view;
    updateStats(view);
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [file, theme]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === content) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: content } });
  }, [content]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal editor-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>{file}</h2>
          <div className="modal-actions">
            <button onClick={onSave}>保存</button>
            <button onClick={onClose}>关闭</button>
          </div>
        </header>
        <div className="codemirror-host" ref={hostRef} />
        <footer className="editor-statusbar">
          <span>行 {stats.line}, 列 {stats.column}</span>
          <span>{stats.lines} 行</span>
          <span>{stats.chars} 字符</span>
          <span>UTF-8</span>
          <span>LF</span>
        </footer>
      </section>
    </div>
  );
}
