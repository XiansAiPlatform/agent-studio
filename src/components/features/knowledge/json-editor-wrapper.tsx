'use client';

import { useEffect, useRef } from 'react';
import JSONEditor, { JSONEditorOptions } from 'jsoneditor';
import 'jsoneditor/dist/jsoneditor.css';
import './json-editor-theme.css';

interface JsonEditorWrapperProps {
  value: string;
  onChange: (value: string) => void;
  onValidationError?: (errors: any[]) => void;
  mode?: 'tree' | 'code' | 'view';
  readOnly?: boolean;
}

export function JsonEditorWrapper({
  value,
  onChange,
  onValidationError,
  mode = 'tree',
  readOnly = false,
}: JsonEditorWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<JSONEditor | null>(null);
  const isInternalChangeRef = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const options: JSONEditorOptions = {
      mode: readOnly ? 'view' : mode,
      modes: readOnly ? ['view'] : ['tree', 'code'],
      onChange: () => {
        if (readOnly) return; // Ignore changes in read-only mode
        
        try {
          const json = editorRef.current?.get();
          if (json !== undefined) {
            // Mark this as an internal change
            isInternalChangeRef.current = true;
            onChange(JSON.stringify(json, null, 2));
          }
        } catch (error) {
          // Handle error silently - validation will catch it
        }
      },
      onValidationError: (errors: any) => {
        if (!readOnly) {
          onValidationError?.(errors);
        }
      },
      onEditable: (node: any) => {
        if (readOnly) {
          // In read-only mode, prevent all editing operations
          return {
            field: false,
            value: false,
          };
        }
        return true;
      },
      mainMenuBar: !readOnly, // Hide menu bar in read-only mode
      navigationBar: true,
      statusBar: !readOnly, // Hide status bar in read-only mode
      search: true,
      history: !readOnly,
      enableSort: false,
      enableTransform: false,
    };

    editorRef.current = new JSONEditor(containerRef.current, options);

    // Set initial value
    if (value) {
      try {
        const json = JSON.parse(value);
        editorRef.current.set(json);
        if (readOnly) {
          requestAnimationFrame(() => {
            editorRef.current?.expand({
              path: [],
              isExpand: true,
              recursive: true,
            });
          });
        }
        initializedRef.current = true;
      } catch (error) {
        editorRef.current.setText(value);
        initializedRef.current = true;
      }
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
      initializedRef.current = false;
    };
  }, [mode, readOnly]);

  // Update editor content when value changes externally (not from internal edits)
  useEffect(() => {
    // Skip if this is an internal change or editor not initialized
    if (isInternalChangeRef.current || !initializedRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    if (editorRef.current && value) {
      try {
        const json = JSON.parse(value);
        const currentJson = editorRef.current.get();
        
        // Only update if the value actually changed
        if (JSON.stringify(currentJson) !== JSON.stringify(json)) {
          editorRef.current.update(json);
          if (readOnly) {
            requestAnimationFrame(() => {
              editorRef.current?.expand({
                path: [],
                isExpand: true,
                recursive: true,
              });
            });
          }
        }
      } catch (error) {
        // If invalid JSON, set as text
        editorRef.current.setText(value);
      }
    }
  }, [value, readOnly]);

  return (
    <div 
      ref={containerRef} 
      className="h-full w-full jsoneditor-react-container"
      style={{ minHeight: '300px' }}
      data-color-mode="auto"
      data-readonly={readOnly ? 'true' : 'false'}
    />
  );
}
