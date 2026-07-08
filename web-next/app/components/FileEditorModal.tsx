import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, selectAll } from '@codemirror/commands';
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

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
  const onSaveRef = useRef(onSave);
  const [stats, setStats] = useState(() => ({
    chars: content.length,
    lines: content.split('\n').length,
    line: 1,
    column: 1
  }));
  onChangeRef.current = onChange;
  onSaveRef.current = onSave;

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

  function saveAndStop(event: KeyboardEvent | ReactKeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
    onSaveRef.current();
  }

  function selectAllAndStop(event: KeyboardEvent | ReactKeyboardEvent) {
    const view = viewRef.current;
    if (!view) return;
    event.preventDefault();
    event.stopPropagation();
    selectAll({ state: view.state, dispatch: view.dispatch });
  }

  function handleShortcut(event: KeyboardEvent | ReactKeyboardEvent) {
    if (!event.ctrlKey && !event.metaKey) return;
    const key = event.key.toLowerCase();
    if (key === 's') saveAndStop(event);
    if (key === 'a') selectAllAndStop(event);
  }

  useEffect(() => {
    window.addEventListener('keydown', handleShortcut, true);
    return () => window.removeEventListener('keydown', handleShortcut, true);
  }, []);

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: content,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([
            {
              key: 'Mod-s',
              preventDefault: true,
              run: () => {
                onSaveRef.current();
                return true;
              }
            },
            {
              key: 'Ctrl-s',
              preventDefault: true,
              run: () => {
                onSaveRef.current();
                return true;
              }
            },
            { key: 'Ctrl-a', preventDefault: true, run: selectAll },
            ...defaultKeymap,
            ...historyKeymap
          ]),
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
    view.focus();
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
      <section className="modal editor-modal" onClick={(event) => event.stopPropagation()} onKeyDownCapture={handleShortcut}>
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
