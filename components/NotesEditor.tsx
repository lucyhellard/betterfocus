'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/supabaseHelpers';

interface NotesEditorProps {
  noteId?: string;
  taskId?: string;
  projectId?: string;
  initialTitle?: string;
  initialTag?: string;
  onSave?: (noteId: string) => void;
  onCancel?: () => void;
}

interface Note {
  id: string;
  title: string;
  content: any;
  tags: string[];
  task_id?: string;
  project_id?: string;
}

export default function NotesEditor({ noteId, taskId, projectId, initialTitle, initialTag, onSave, onCancel }: NotesEditorProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc pl-4 my-1',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal pl-4 my-1',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'ml-4 my-0',
          },
        },
      }),
      Image.configure({
        inline: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your note...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[300px] p-4 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0 [&_li_p]:my-0 [&_p]:my-2',
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              handleClipboardImage(file);
            }
            return true;
          }
        }
        return false;
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (noteId) {
      loadNote();
    } else if (initialTitle) {
      // Set initial title for new notes from tasks
      setTitle(initialTitle);
      // Set initial tag if provided (from project/goal)
      if (initialTag && !tags.includes(initialTag)) {
        setTags([initialTag]);
      }
    }
  }, [noteId, initialTitle, initialTag]);

  // Load content into editor when both editor and note are ready
  useEffect(() => {
    if (editor && note && note.content) {
      editor.commands.setContent(note.content);
    }
  }, [editor, note]);

  // Auto-focus editor for new notes from tasks
  useEffect(() => {
    if (editor && !noteId && initialTitle) {
      // Small delay to ensure editor is fully mounted
      setTimeout(() => {
        editor?.commands.focus();
      }, 100);
    }
  }, [editor, noteId, initialTitle]);

  const loadNote = async () => {
    if (!noteId) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (error) throw error;

      setNote(data);
      setTitle(data.title);
      setTags(data.tags || []);
    } catch (error) {
      console.error('Error loading note:', error);
    }
  };

  // Extract image URLs from Tiptap content
  const extractImageUrls = (content: any): string[] => {
    const urls: string[] = [];

    const traverse = (node: any) => {
      if (node.type === 'image' && node.attrs?.src) {
        urls.push(node.attrs.src);
      }
      if (node.content) {
        node.content.forEach(traverse);
      }
    };

    if (content) traverse(content);
    return urls;
  };

  // Delete images from storage that are no longer in the note
  const cleanupUnusedImages = async (oldContent: any, newContent: any) => {
    const oldImages = extractImageUrls(oldContent);
    const newImages = extractImageUrls(newContent);

    // Find images that were removed
    const removedImages = oldImages.filter(url => !newImages.includes(url));

    // Delete removed images from storage
    for (const imageUrl of removedImages) {
      try {
        // Extract file path from URL
        // URL format: https://{project}.supabase.co/storage/v1/object/public/notes/{filePath}
        const urlParts = imageUrl.split('/notes/');
        if (urlParts.length === 2) {
          const filePath = urlParts[1];
          await supabase.storage.from('notes').remove([filePath]);
          console.log('Deleted unused image:', filePath);
        }
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const content = editor?.getJSON();
      const userId = await getCurrentUserId();

      if (!userId && !noteId) {
        console.error('No user logged in');
        setIsSaving(false);
        return;
      }

      const noteData = {
        title: title || 'Untitled Note',
        content,
        tags,
        task_id: taskId || note?.task_id,
        project_id: projectId || note?.project_id,
        ...(userId && !noteId ? { user_id: userId } : {}),
      };

      // Clean up unused images if updating existing note
      if (noteId && note?.content) {
        await cleanupUnusedImages(note.content, content);
      }

      if (noteId) {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update(noteData)
          .eq('id', noteId);

        if (error) throw error;

        // Update local note state with new content
        setNote({ ...note!, ...noteData });
        // Call onSave to refresh parent component
        onSave?.(noteId);
      } else {
        // Create new note
        const { data, error } = await supabase
          .from('notes')
          .insert([noteData])
          .select()
          .single();

        if (error) throw error;

        setNote(data);
        onSave?.(data.id);
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `note-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('notes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL (works with public buckets)
      const { data } = supabase.storage
        .from('notes')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
      return null;
    }
  };

  const handleClipboardImage = async (file: File) => {
    const url = await uploadImageToStorage(file);
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const url = await uploadImageToStorage(file);
      if (url) {
        editor?.chain().focus().setImage({ src: url }).run();
      }
    };
    input.click();
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Header */}
      <div className="border-b p-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              editor?.commands.focus();
            }
          }}
          placeholder="Note title..."
          className="text-2xl font-bold w-full outline-none"
        />
        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
          {lastSaved && (
            <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap gap-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 rounded ${editor.isActive('bold') ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
          type="button"
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded ${editor.isActive('italic') ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
          type="button"
        >
          Italic
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 rounded ${editor.isActive('bulletList') ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
          type="button"
        >
          Bullet List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 rounded ${editor.isActive('orderedList') ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
          type="button"
        >
          Numbered List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
          type="button"
        >
          Heading
        </button>
        <button
          onClick={handleImageUpload}
          className="px-3 py-1 rounded hover:bg-gray-100"
          type="button"
        >
          Add Image
        </button>
        <button
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={`px-3 py-1 rounded ${editor.isActive('link') ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
          type="button"
        >
          Link
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Tags */}
      <div className="border-t p-4">
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="text-blue-600 hover:text-blue-800"
                type="button"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
            placeholder="Add tag..."
            className="flex-1 px-3 py-1 border rounded outline-none"
          />
          <button
            onClick={addTag}
            className="px-4 py-1 bg-gray-200 rounded hover:bg-gray-300"
            type="button"
          >
            Add
          </button>
        </div>
      </div>

      {/* Footer with Save Button */}
      <div className="border-t p-4 flex justify-end gap-2">
        {!noteId && onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            type="button"
          >
            Discard
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          type="button"
        >
          {isSaving ? 'Saving...' : 'Save Note'}
        </button>
      </div>
    </div>
  );
}
