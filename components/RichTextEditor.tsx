import React, { useEffect, useRef } from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Table, Undo, Redo, Type } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync content only once on mount or if content changes externally significantly
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
       // Chỉ update nếu khác biệt lớn để tránh mất focus
       if (Math.abs(editorRef.current.innerHTML.length - content.length) > 5) {
           editorRef.current.innerHTML = content;
       }
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) editorRef.current.focus();
  };

  const ToolButton = ({ cmd, icon: Icon, arg }: { cmd: string, icon: any, arg?: string }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); execCmd(cmd, arg); }}
      className="p-2 text-gray-600 hover:bg-gray-200 rounded transition"
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  const insertVariable = (variable: string) => {
      execCmd('insertText', variable);
  };

  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1 items-center">
        <ToolButton cmd="bold" icon={Bold} />
        <ToolButton cmd="italic" icon={Italic} />
        <ToolButton cmd="underline" icon={Underline} />
        <div className="w-[1px] h-5 bg-gray-300 mx-1"></div>
        <ToolButton cmd="justifyLeft" icon={AlignLeft} />
        <ToolButton cmd="justifyCenter" icon={AlignCenter} />
        <ToolButton cmd="justifyRight" icon={AlignRight} />
        <div className="w-[1px] h-5 bg-gray-300 mx-1"></div>
        <ToolButton cmd="insertUnorderedList" icon={List} />
        <ToolButton cmd="insertOrderedList" icon={ListOrdered} />
        
        {/* Variable Inserter */}
        <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Chèn biến nhanh:</span>
            <select 
                onChange={(e) => { 
                    if(e.target.value) {
                        insertVariable(e.target.value); 
                        e.target.value = "";
                    }
                }}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
                <option value="">-- Chọn biến --</option>
                <optgroup label="Khách hàng">
                    <option value="{{HO_TEN}}">Họ và tên</option>
                    <option value="{{SO_CCCD}}">Số CCCD</option>
                    <option value="{{NGAY_SINH}}">Ngày sinh</option>
                    <option value="{{THUONG_TRU}}">Thường trú</option>
                    <option value="{{QUE_QUAN}}">Quê quán</option>
                </optgroup>
                <optgroup label="Xe & Hợp đồng">
                    <option value="{{TEN_XE}}">Tên xe</option>
                    <option value="{{BIEN_SO}}">Biển số</option>
                    <option value="{{MAU_XE}}">Màu xe</option>
                    <option value="{{GIA_THUE}}">Giá thuê</option>
                    <option value="{{NGAY_THUE}}">Ngày thuê</option>
                    <option value="{{NGAY_TRA}}">Ngày trả</option>
                    <option value="{{TIEN_COC}}">Tiền cọc</option>
                </optgroup>
                 <optgroup label="Thời gian thực">
                    <option value="{{NGAY_TAO}}">Ngày hiện tại</option>
                    <option value="{{THANG_TAO}}">Tháng hiện tại</option>
                    <option value="{{NAM_TAO}}">Năm hiện tại</option>
                </optgroup>
            </select>
        </div>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="flex-1 p-8 outline-none overflow-y-auto prose max-w-none text-gray-900 min-h-[500px]"
        style={{ 
            lineHeight: '1.5',
            fontFamily: '"Times New Roman", Times, serif', // Cố định Font chuẩn hợp đồng
            fontSize: '13pt'
        }}
      >
      </div>
      
      {placeholder && !content && (
         <div className="absolute top-32 left-8 text-gray-300 pointer-events-none italic" style={{fontFamily: '"Times New Roman", Times, serif'}}>
             {placeholder}
         </div>
      )}
    </div>
  );
};