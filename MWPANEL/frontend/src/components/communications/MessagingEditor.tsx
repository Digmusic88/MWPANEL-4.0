import React, { useState, useRef, useEffect } from 'react';
import {
  Button,
  Popover,
  Tooltip,
  Space,
  Divider,
  ColorPicker,
  Select,
  Modal,
  Input,
} from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  LinkOutlined,
  FontSizeOutlined,
  FontColorsOutlined,
  SmileOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { Color } from 'antd/es/color-picker';

const { Option } = Select;

interface MessagingEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onSend?: (content: string) => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
  sending?: boolean;
  hideSendButton?: boolean;
}

const MessagingEditor: React.FC<MessagingEditorProps> = ({
  value = "",
  onChange,
  onSend,
  onKeyPress,
  placeholder = "Escribe tu mensaje...",
  disabled = false,
  className = "",
  minHeight = 60,
  maxHeight = 200,
  sending = false,
  hideSendButton = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [selection, setSelection] = useState<Range | null>(null);
  const [internalValue, setInternalValue] = useState(value);
  // Modal de enlace (sustituye al prompt nativo, que no funciona bien en móvil)
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  // Solo sincronizar innerHTML desde el prop cuando el editor NO tiene foco.
  // Si el editor tiene foco, el usuario está escribiendo y resetear innerHTML
  // desplazaría el cursor al principio, bloqueando la inserción de nuevas líneas.
  useEffect(() => {
    if (editorRef.current && !isFocusedRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
      // Actualizar también internalValue para que isEmpty se calcule correctamente
      setInternalValue(value);
    }
  }, [value]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      setSelection(sel.getRangeAt(0));
    }
  };

  const restoreSelection = () => {
    if (selection) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(selection);
    }
  };

  const execCommand = (command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    updateContent();
    focusEditor();
  };

  const updateContent = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      setInternalValue(content);
      onChange?.(content);
    }
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter solo para nueva línea - NO enviar mensaje
    // Usuario debe hacer click en el botón de envío para enviar
    onKeyPress?.(e);
  };

  // También actualizar contenido en keyUp para mejor compatibilidad con móviles
  const handleKeyUp = () => {
    updateContent();
    saveSelection();
  };

  const handleSend = () => {
    if (editorRef.current && onSend) {
      const content = editorRef.current.innerHTML.trim();
      if (content && content !== '<br>' && content !== '<div><br></div>') {
        onSend(content);
        // Clear editor after sending
        editorRef.current.innerHTML = '';
        setInternalValue('');
        onChange?.('');
      }
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
    setShowToolbar(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Only hide toolbar if not clicking on toolbar buttons
    if (!e.relatedTarget?.closest('.messaging-editor-toolbar')) {
      isFocusedRef.current = false;
      setShowToolbar(false);
    }
  };

  const isCommandActive = (command: string): boolean => {
    return document.queryCommandState(command);
  };

  const insertEmoji = (emoji: string) => {
    restoreSelection();
    document.execCommand('insertText', false, emoji);
    updateContent();
    focusEditor();
  };

  const insertLink = () => {
    // Guardar la selección actual (al abrir el modal el editor pierde el foco)
    saveSelection();
    const selectedText = (window.getSelection()?.toString() || '').trim();
    setLinkText(selectedText);
    setLinkUrl('');
    setLinkModalOpen(true);
  };

  const confirmLink = () => {
    let url = (linkUrl || '').trim();
    if (!url) {
      setLinkModalOpen(false);
      return;
    }
    // Normalizar: si no tiene protocolo, anteponer https://
    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
      url = 'https://' + url;
    }
    restoreSelection();
    const sel = window.getSelection();
    const hasSelection = sel && sel.toString().trim().length > 0;
    if (hasSelection) {
      // Convertir el texto seleccionado en enlace
      document.execCommand('createLink', false, url);
    } else {
      // Insertar un enlace nuevo con el texto indicado (o la propia URL)
      const text = (linkText || url).replace(/"/g, '&quot;');
      document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>&nbsp;`);
    }
    updateContent();
    setLinkModalOpen(false);
    setLinkUrl('');
    setLinkText('');
    focusEditor();
  };

  const changeFontSize = (size: string) => {
    execCommand('fontSize', size);
  };

  const changeTextColor = (color: Color) => {
    execCommand('foreColor', color.toHexString());
  };

  // Emojis Unicode nativos: el dispositivo los renderiza con su propia fuente de emojis.
  const emojiCategories: { name: string; emojis: string[] }[] = [
    {
      name: 'Caras y emociones',
      emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','💩','🤡','👻','👽','🤖'],
    },
    {
      name: 'Gestos y personas',
      emojis: ['👍','👎','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤝','🙏','✍️','💪','🦾','👏','🙌','👐','🤲','🫶','👀','👁️','👅','👄','🧠','🦷','👶','🧒','👦','👧','🧑','👨','👩','🧓','👴','👵','👮','🕵️','💂','👷','🤴','👸','👰','🤵','🧑‍🏫','👨‍🏫','👩‍🏫','🧑‍🎓','👨‍🎓','👩‍🎓','🧑‍💻','👨‍💻','👩‍💻','🤰','🤱','🧑‍🍼'],
    },
    {
      name: 'Corazones y símbolos',
      emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','💯','💢','💥','💫','💦','💨','🕳️','💬','💭','🗯️','⭐','🌟','✨','⚡','🔥','🎉','🎊','✅','❌','❓','❗','‼️','⁉️','💲','➕','➖','✔️','☑️','🔔','🔕','⏰','⏳','⌛','🔒','🔓','🔑','📌','📎','✏️','🖊️','📝','📅','📆','🗓️','📊','📈','📉'],
    },
    {
      name: 'Animales y naturaleza',
      emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦉','🦄','🐝','🐛','🦋','🐌','🐞','🐢','🐍','🐙','🦑','🦀','🐠','🐟','🐬','🐳','🐋','🦈','🌳','🌲','🌴','🌵','🌷','🌸','🌹','🌻','🌼','🌺','🍀','🍁','🍂','🌍','🌙','☀️','⭐','🌈','☁️','⛅','🌧️','⛄','❄️','🔥','💧','🌊'],
    },
    {
      name: 'Comida y bebida',
      emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🥦','🥕','🌽','🌶️','🥔','🍠','🥐','🍞','🥖','🧀','🥚','🍳','🥞','🧇','🥓','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🥙','🍝','🍜','🍲','🍣','🍱','🍙','🍚','🍦','🍰','🎂','🧁','🍫','🍬','🍭','🍩','🍪','☕','🍵','🥤','🧃','🍷','🍺','🥂','🍾'],
    },
    {
      name: 'Actividades, viajes y objetos',
      emojis: ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥅','⛳','🏆','🥇','🥈','🥉','🎮','🎲','🧩','🎯','🎨','🎭','🎬','🎤','🎧','🎵','🎶','🎸','🎹','🥁','🚗','🚕','🚌','🚓','🚑','🚒','🚲','🛴','✈️','🚀','🛸','⛵','🚤','🏠','🏡','🏫','🏥','🏦','💻','🖥️','⌨️','🖱️','📱','☎️','📞','📷','📹','🔋','💡','🔦','📚','📖','✉️','📩','📨','📦','🎁','🏳️','🏴','🚩','🏁'],
    },
  ];

  const fontSizes = [
    { label: 'Pequeño', value: '2' },
    { label: 'Normal', value: '3' },
    { label: 'Grande', value: '4' },
    { label: 'Muy grande', value: '5' },
  ];

  const toolbarContent = (
    <div className="messaging-editor-toolbar" style={{ display: 'inline-flex', minWidth: 'min-content' }}>
      <Space split={<Divider type="vertical" />} size="small" style={{ flexWrap: 'nowrap' }}>
        {/* Text formatting */}
        <Space size="small">
          <Tooltip title="Negrita (Ctrl+B)">
            <Button
              size="small"
              type={isCommandActive('bold') ? 'primary' : 'text'}
              icon={<BoldOutlined />}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execCommand('bold')}
            />
          </Tooltip>
          <Tooltip title="Cursiva (Ctrl+I)">
            <Button
              size="small"
              type={isCommandActive('italic') ? 'primary' : 'text'}
              icon={<ItalicOutlined />}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execCommand('italic')}
            />
          </Tooltip>
          <Tooltip title="Subrayado (Ctrl+U)">
            <Button
              size="small"
              type={isCommandActive('underline') ? 'primary' : 'text'}
              icon={<UnderlineOutlined />}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execCommand('underline')}
            />
          </Tooltip>
          <Tooltip title="Tachado">
            <Button
              size="small"
              type={isCommandActive('strikeThrough') ? 'primary' : 'text'}
              icon={<StrikethroughOutlined />}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execCommand('strikeThrough')}
            />
          </Tooltip>
        </Space>

        {/* Lists */}
        <Space size="small">
          <Tooltip title="Lista con viñetas">
            <Button
              size="small"
              type={isCommandActive('insertUnorderedList') ? 'primary' : 'text'}
              icon={<UnorderedListOutlined />}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execCommand('insertUnorderedList')}
            />
          </Tooltip>
          <Tooltip title="Lista numerada">
            <Button
              size="small"
              type={isCommandActive('insertOrderedList') ? 'primary' : 'text'}
              icon={<OrderedListOutlined />}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execCommand('insertOrderedList')}
            />
          </Tooltip>
        </Space>

        {/* Font options */}
        <Space size="small">
          <Tooltip title="Tamaño de fuente">
            <Select
              size="small"
              defaultValue="3"
              style={{ width: 80 }}
              onSelect={changeFontSize}
              onMouseDown={(e) => e.preventDefault()}
            >
              {fontSizes.map((size) => (
                <Option key={size.value} value={size.value}>
                  {size.label}
                </Option>
              ))}
            </Select>
          </Tooltip>
          <Tooltip title="Color del texto">
            <ColorPicker
              size="small"
              onChangeComplete={changeTextColor}
              onOpenChange={() => saveSelection()}
              trigger="click"
            >
              <Button
                size="small"
                icon={<FontColorsOutlined />}
                onMouseDown={(e) => e.preventDefault()}
              />
            </ColorPicker>
          </Tooltip>
        </Space>

        {/* Link and emoji */}
        <Space size="small">
          <Tooltip title="Insertar enlace">
            <Button
              size="small"
              icon={<LinkOutlined />}
              onMouseDown={(e) => e.preventDefault()}
              onClick={insertLink}
            />
          </Tooltip>
          <Popover
            content={
              <div style={{ width: 296, maxHeight: 300, overflowY: 'auto', padding: 4 }}>
                {emojiCategories.map((cat) => (
                  <div key={cat.name} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: '#8c8c8c', margin: '4px 2px', fontWeight: 600 }}>{cat.name}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2 }}>
                      {cat.emojis.map((emoji, index) => (
                        <button
                          key={`${cat.name}-${index}`}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => insertEmoji(emoji)}
                          style={{
                            border: 'none', background: 'transparent', cursor: 'pointer',
                            fontSize: 22, lineHeight: '32px', height: 32, borderRadius: 6, padding: 0,
                          }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#f0f0f0')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            }
            title="Emojis"
            trigger="click"
          >
            <Button
              size="small"
              icon={<SmileOutlined />}
              onMouseDown={(e) => e.preventDefault()}
            />
          </Popover>
        </Space>
      </Space>
    </div>
  );

  const isEmpty = !internalValue || internalValue.trim() === '' || internalValue === '<br>' || internalValue === '<div><br></div>';

  return (
    <div className={`messaging-editor ${className}`} style={{ maxWidth: '100%', overflow: 'hidden' }}>
      {/* Toolbar - deslizable horizontalmente (una sola fila) para no ocupar alto en móvil */}
      {showToolbar && (
        <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded-t-lg"
          style={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', whiteSpace: 'nowrap' }}>
          {toolbarContent}
        </div>
      )}

      <div className="relative">
        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning={true}
          onInput={updateContent}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onFocus={handleFocus}
          onBlur={(e) => {
            handleBlur(e);
            updateContent(); // Actualizar al perder foco (importante para móviles)
          }}
          onMouseUp={saveSelection}
          onTouchEnd={updateContent} // Soporte táctil para móviles
          className={`
            w-full px-3 py-3 border border-gray-300 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            overflow-y-auto resize-none transition-all duration-200
            ${showToolbar ? 'rounded-t-none border-t-0' : ''}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-blue-300'}
            ${isEmpty && !showToolbar ? 'text-gray-400' : 'text-gray-900'}
          `}
          style={{
            minHeight: `${minHeight}px`,
            maxHeight: `${maxHeight}px`,
            paddingRight: !hideSendButton ? '48px' : undefined,
          }}
          data-placeholder={placeholder}
        />

        {/* Placeholder mejorado cuando está vacío */}
        {isEmpty && !showToolbar && (
          <div className="absolute top-3 left-3 text-gray-400 pointer-events-none flex items-center gap-2" style={{ right: '48px' }}>
            <SendOutlined style={{ fontSize: '14px', opacity: 0.6 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{placeholder}</span>
          </div>
        )}

        {/* Botón de envío — siempre visible, deshabilitado cuando está vacío */}
        {!hideSendButton && (
          <div style={{ position: 'absolute', bottom: '8px', right: '8px', flexShrink: 0 }}>
            <Button
              type="primary"
              size="small"
              icon={<SendOutlined />}
              loading={sending}
              onClick={handleSend}
              disabled={isEmpty || sending}
              className="shadow-lg"
              style={{ backgroundColor: isEmpty || sending ? undefined : '#579172', borderColor: isEmpty || sending ? undefined : '#579172' }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        .messaging-editor [contenteditable] {
          outline: none;
          line-height: 1.5;
        }
        
        .messaging-editor [contenteditable] p {
          margin: 0;
          padding: 0;
        }
        
        .messaging-editor [contenteditable] ul,
        .messaging-editor [contenteditable] ol {
          margin: 8px 0;
          padding-left: 20px;
        }
        
        .messaging-editor [contenteditable] li {
          margin: 4px 0;
        }
        
        .messaging-editor [contenteditable] a {
          color: #1890ff;
          text-decoration: underline;
        }

        .messaging-editor [contenteditable]:empty {
          color: transparent;
        }
        
        .messaging-editor .relative {
          position: relative;
        }
        
        .messaging-editor .absolute {
          position: absolute;
        }
      `}</style>

      {/* Modal de enlace — sustituye al prompt nativo (que no abre bien en móvil) */}
      <Modal
        title="Insertar enlace"
        open={linkModalOpen}
        onOk={confirmLink}
        onCancel={() => setLinkModalOpen(false)}
        okText="Insertar"
        cancelText="Cancelar"
        zIndex={2200}
        destroyOnClose
        width={420}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, color: '#6b7280' }}>Dirección (URL)</div>
            <Input
              autoFocus
              placeholder="https://ejemplo.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onPressEnter={confirmLink}
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, color: '#6b7280' }}>Texto a mostrar (opcional)</div>
            <Input
              placeholder="Texto del enlace"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              onPressEnter={confirmLink}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MessagingEditor;