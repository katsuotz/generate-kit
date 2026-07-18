<script lang="ts">
  import { onMount } from 'svelte';

  export let value: string;
  export let onChange: (value: string) => void;
  export let onCompile: () => void;
  export let diagnosticLine: number | null = null;

  let host: HTMLDivElement;
  let view: import('@codemirror/view').EditorView | undefined;
  let internalValue = value;

  $: if (view && value !== internalValue) {
    internalValue = value;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }

  $: if (view && diagnosticLine) {
    const line = view.state.doc.line(Math.min(diagnosticLine, view.state.doc.lines));
    view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
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
              'aria-label': 'LaTeX source editor',
              'aria-describedby': 'editor-help'
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
                color: '#322a24',
                fontSize: '14px'
              },
              '.cm-scroller': {
                fontFamily: '"IBM Plex Mono", "Courier New", monospace',
                lineHeight: '1.75',
                padding: '22px 0 40px'
              },
              '.cm-content': { padding: '0 24px', caretColor: '#a54d2d' },
              '.cm-gutters': {
                backgroundColor: 'transparent',
                color: '#a3978c',
                border: 'none',
                paddingLeft: '8px'
              },
              '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'rgba(175, 91, 57, .07)' },
              '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
                backgroundColor: 'rgba(177, 102, 68, .2)'
              },
              '&.cm-focused': {
                outline: 'none',
                boxShadow: '0 0 0 3px #f5f0e7, 0 0 0 5px #a65333'
              },
              '.cm-cursor': { borderLeftColor: '#a54d2d', borderLeftWidth: '2px' }
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
