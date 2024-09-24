import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { createEditor, Descendant, Text, Node as SlateNode } from 'slate';
import { Slate, Editable, withReact, RenderLeafProps } from 'slate-react';
import { withHistory } from 'slate-history';
import io from 'socket.io-client';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const EditorContainer = styled.div`
  flex: 1;
  padding: 20px;
  background-color: #1e1e1e;
  color: #dcdcdc;
  overflow-y: auto;
`;

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: 'Type your notes here...' }],
  },
];

interface LeafProps extends RenderLeafProps {
  leaf: {
    math?: boolean;
    [key: string]: any;
  };
}

const Leaf: React.FC<LeafProps> = ({ attributes, children, leaf }) => {
  if (leaf.math) {
    const html = katex.renderToString(SlateNode.string(leaf), {
      throwOnError: false,
    });
    return (
      <span {...attributes} dangerouslySetInnerHTML={{ __html: html }} />
    );
  }

  return <span {...attributes}>{children}</span>;
};

interface EditorProps {
  documentId: string;
  setTopic: (topic: string) => void;
}

const Editor: React.FC<EditorProps> = ({ documentId, setTopic }) => {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [value, setValue] = useState<Descendant[]>(initialValue);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:3002'); // Adjust the port as necessary

    socketRef.current.emit('get-document', documentId);

    socketRef.current.on('load-document', (document: string) => {
      setValue(JSON.parse(document));
    });

    socketRef.current.on('receive-changes', (delta: any) => {
      editor.apply(delta);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [editor, documentId]);

  const handleChange = (newValue: Descendant[]) => {
    setValue(newValue);

    // Extract topic (e.g., first line of the notes)
    const firstLine = SlateNode.string(newValue[0]);
    setTopic(firstLine);

    // Send changes to the server
    const delta = editor.operations
      .filter((o) => o.type !== 'set_selection' && o.type !== 'set_value')
      .map((o) => ({ ...o, data: undefined }));
    if (delta.length && socketRef.current) {
      socketRef.current.emit('send-changes', JSON.stringify(delta));
    }
  };

  const renderLeaf = useCallback((props: RenderLeafProps) => {
    return <Leaf {...props} />;
  }, []);

  const decorate = useCallback(([node, path]) => {
    const ranges = [];
    if (Text.isText(node)) {
      const { text } = node;
      const regex = /\$(.*?)\$/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;

        ranges.push({
          math: true,
          anchor: { path, offset: start },
          focus: { path, offset: end },
        });
      }
    }
    return ranges;
  }, []);

  return (
    <EditorContainer>
      <Slate editor={editor} value={value} onChange={handleChange}>
        <Editable renderLeaf={renderLeaf} decorate={decorate} />
      </Slate>
    </EditorContainer>
  );
};

export default Editor;
