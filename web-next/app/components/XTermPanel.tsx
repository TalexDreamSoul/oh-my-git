import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { useEffect, useRef } from 'react';
import { BrowserGit } from '../git/browserGit';
import { completeLine } from '../game/completion';
import { LocalShell } from '../game/localShell';

type XTermPanelProps = {
  git: BrowserGit;
  branch?: string;
  injectedCommand?: string;
  username: string;
  onAfterCommand(): Promise<void> | void;
  locked?: boolean;
  lockedMessage?: string;
  focusDisabled?: boolean;
};

export function XTermPanel({ git, branch, injectedCommand, username, onAfterCommand, locked = false, lockedMessage = 'Terminal locked.', focusDisabled = false }: XTermPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const shellRef = useRef<LocalShell | null>(null);
  const lineRef = useRef('');
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number | null>(null);
  const branchRef = useRef(branch);
  const onAfterCommandRef = useRef(onAfterCommand);
  const lockedRef = useRef(locked);
  const lockedMessageRef = useRef(lockedMessage);
  const focusDisabledRef = useRef(focusDisabled);

  branchRef.current = branch;
  onAfterCommandRef.current = onAfterCommand;
  lockedRef.current = locked;
  lockedMessageRef.current = lockedMessage;
  focusDisabledRef.current = focusDisabled;

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      fontSize: 14,
      lineHeight: 1.45,
      theme: {
        background: '#09090b',
        foreground: '#f4f4f5',
        cursor: '#f4f4f5',
        selectionBackground: '#3f3f46',
        black: '#09090b',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#f4f4f5',
        brightBlack: '#71717a',
        brightRed: '#fca5a5',
        brightGreen: '#86efac',
        brightYellow: '#fde047',
        brightBlue: '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#ffffff'
      }
    });
    const fit = new FitAddon();
    const shell = new LocalShell(git, username);

    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    if (!lockedRef.current && !focusDisabledRef.current) term.focus();

    termRef.current = term;
    fitRef.current = fit;
    shellRef.current = shell;

    const prompt = () => shell.prompt(branchRef.current);
    const writePrompt = () => term.write(prompt());
    const redrawInput = (ghost = '') => {
      term.write(`\r\x1b[2K${prompt()}${lineRef.current}`);
      if (ghost) {
        term.write(`\x1b[90m${ghost}\x1b[0m`);
        term.write(`\x1b[${ghost.length}D`);
      }
    };
    const refreshGhost = async () => {
      if (!lineRef.current) {
        redrawInput();
        return;
      }
      const completion = await completeLine(git, lineRef.current);
      const ghost = completion.suggestions.length === 0 && completion.line.startsWith(lineRef.current) ? completion.line.slice(lineRef.current.length) : '';
      redrawInput(ghost);
    };
    const showSuggestions = async (suggestions: string[]) => {
      if (suggestions.length === 0) return;
      term.write('\r\n');
      term.writeln(suggestions.join('    '));
      await refreshGhost();
    };

    term.writeln('\x1b[36m●\x1b[0m  \x1b[1;97mOh My Git! Web Terminal\x1b[0m');
    term.writeln('   \x1b[90mDesigned by\x1b[0m \x1b[35mTalexDreamSoul\x1b[0m');
    term.writeln('   \x1b[90mType\x1b[0m \x1b[33mhelp\x1b[0m \x1b[90mto see available commands. Use ↑/↓ for history.\x1b[0m');
    term.writeln('');
    writePrompt();

    const disposable = term.onData(async (data) => {
      if (data === '\r') {
        const command = lineRef.current.trim();
        term.write('\r\n');
        lineRef.current = '';
        historyIndexRef.current = null;

        if (command) {
          if (lockedRef.current) {
            term.writeln(`\x1b[33m${lockedMessageRef.current}\x1b[0m`);
            writePrompt();
            return;
          }
          historyRef.current = [command, ...historyRef.current.filter((item) => item !== command)].slice(0, 80);
          try {
            const result = await shell.execute(command);
            if (result.clear) {
              term.clear();
            } else if (result.output) {
              term.writeln(result.output.replace(/\n/g, '\r\n'));
            }
            await onAfterCommandRef.current();
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            term.writeln(`\x1b[31m${message}\x1b[0m`);
            await onAfterCommandRef.current();
          }
        }

        writePrompt();
        return;
      }

      if (data === '\u0003') {
        lineRef.current = '';
        term.write('^C\r\n');
        writePrompt();
        return;
      }

      if (data === '\u000c') {
        term.clear();
        await refreshGhost();
        return;
      }

      if (data === '\u007f') {
        if (lineRef.current.length > 0) {
          lineRef.current = lineRef.current.slice(0, -1);
          await refreshGhost();
        }
        return;
      }

      if (data === '\t') {
        const completion = await completeLine(git, lineRef.current);
        lineRef.current = completion.line;
        await refreshGhost();
        if (completion.suggestions.length > 1) await showSuggestions(completion.suggestions);
        return;
      }

      if (data === '\x1b[A') {
        if (historyRef.current.length === 0) return;
        const nextIndex = historyIndexRef.current === null ? 0 : Math.min(historyIndexRef.current + 1, historyRef.current.length - 1);
        historyIndexRef.current = nextIndex;
        lineRef.current = historyRef.current[nextIndex];
        await refreshGhost();
        return;
      }

      if (data === '\x1b[B') {
        if (historyIndexRef.current === null) return;
        const nextIndex = historyIndexRef.current - 1;
        if (nextIndex < 0) {
          historyIndexRef.current = null;
          lineRef.current = '';
        } else {
          historyIndexRef.current = nextIndex;
          lineRef.current = historyRef.current[nextIndex];
        }
        await refreshGhost();
        return;
      }

      if (data >= ' ' && data !== '\x7f') {
        lineRef.current += data;
        await refreshGhost();
      }
    });

    const resizeObserver = new ResizeObserver(() => fit.fit());
    resizeObserver.observe(containerRef.current);

    return () => {
      disposable.dispose();
      resizeObserver.disconnect();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      shellRef.current = null;
    };
  }, [git, username]);

  useEffect(() => {
    if (!termRef.current) return;
    if (locked || focusDisabled) termRef.current.blur();
  }, [focusDisabled, locked]);

  useEffect(() => {
    if (!injectedCommand || locked || focusDisabled || !termRef.current || !shellRef.current) return;
    lineRef.current = injectedCommand;
    termRef.current.write(`\r\x1b[2K${shellRef.current.prompt(branchRef.current)}${injectedCommand}`);
    termRef.current.focus();
  }, [focusDisabled, injectedCommand, locked]);

  return <div className={`xterm-container ${locked ? 'locked' : ''} ${focusDisabled ? 'focus-disabled' : ''}`} onMouseDownCapture={(event) => { if (focusDisabled) { event.preventDefault(); termRef.current?.blur(); } }} ref={containerRef} />;
}
