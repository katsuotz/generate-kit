<script lang="ts">
  import { onMount } from 'svelte';

  export let value: string;
  export let onChange: (value: string) => void;
  export let onCompile: () => void;
  export let diagnosticLine: number | null = null;
  export let diagnosticColumn: number | null = null;
  export let readOnly = false;
  export let colorScheme: 'light' | 'dark' = 'light';

  let host: HTMLDivElement;
  let view: import('@codemirror/view').EditorView | undefined;
  let internalValue = value;

  $: if (view && value !== internalValue) {
    internalValue = value;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }

  $: if (view && diagnosticLine) {
    const line = view.state.doc.line(Math.min(diagnosticLine, view.state.doc.lines));
    const column = Math.max(1, diagnosticColumn ?? 1);
    const anchor = Math.min(line.from + column - 1, line.to);
    view.dispatch({ selection: { anchor }, scrollIntoView: true });
    view.focus();
  }

  onMount(() => {
    let mounted = true;

    void (async () => {
      const [
        { basicSetup },
        { EditorState },
        { EditorView, keymap },
        { StreamLanguage },
        { stex },
        { defaultKeymap, indentWithTab }
      ] = await Promise.all([
        import('codemirror'),
        import('@codemirror/state'),
        import('@codemirror/view'),
        import('@codemirror/language'),
        import('@codemirror/legacy-modes/mode/stex'),
        import('@codemirror/commands')
      ]);

      if (!mounted) return;

      view = new EditorView({
        parent: host,
        state: EditorState.create({
          doc: value,
          extensions: [
            basicSetup,
            EditorState.readOnly.of(readOnly),
            EditorView.editable.of(!readOnly),
            StreamLanguage.define(stex),
            keymap.of([
              {
                key: 'Mod-Enter',
                run: () => {
                  onCompile();
                  return true;
                }
              },
              indentWithTab,
              ...defaultKeymap
            ]),
            EditorView.lineWrapping,
            EditorView.contentAttributes.of({
              'aria-label': readOnly ? 'LaTeX source viewer' : 'LaTeX source editor',
              'aria-readonly': readOnly ? 'true' : 'false'
            }),
            EditorView.updateListener.of((update) => {
              if (!update.docChanged) return;
              internalValue = update.state.doc.toString();
              onChange(internalValue);
            }),
            EditorView.theme({
              '&': {
                height: '100%',
                backgroundColor: 'transparent',
                color: colorScheme === 'dark' ? '#d5e2ee' : '#17212b',
                fontSize: '14px'
              },
              '.cm-scroller': {
                fontFamily: '"IBM Plex Mono", "Courier New", monospace',
                lineHeight: '1.75',
                padding: '22px 0 40px'
              },
              '.cm-content': { padding: '0 24px', caretColor: '#1769d2' },
              '.cm-gutters': {
                backgroundColor: 'transparent',
                color: colorScheme === 'dark' ? '#9fb0bf' : '#5d6b78',
                border: 'none',
                paddingLeft: '8px'
              },
              '.cm-activeLine, .cm-activeLineGutter': {
                backgroundColor:
                  colorScheme === 'dark' ? 'rgba(88, 166, 255, .16)' : 'rgba(23, 105, 210, .07)'
              },
              '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
                backgroundColor:
                  colorScheme === 'dark' ? 'rgba(88, 166, 255, .28)' : 'rgba(23, 105, 210, .2)'
              },
              '&.cm-focused': {
                outline: 'none',
                boxShadow:
                  colorScheme === 'dark'
                    ? '0 0 0 3px #18222d, 0 0 0 5px #58a6ff'
                    : '0 0 0 3px #ffffff, 0 0 0 5px #1769d2'
              },
              '.cm-cursor': {
                borderLeftColor: colorScheme === 'dark' ? '#58a6ff' : '#1769d2',
                borderLeftWidth: '2px'
              }
            })
          ]
        })
      });
    })();

    return () => {
      mounted = false;
      view?.destroy();
    };
  });
</script>

<div class="min-h-0 h-full flex-1 overflow-hidden" bind:this={host}></div>
