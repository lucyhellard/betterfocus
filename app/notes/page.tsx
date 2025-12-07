'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import NotesEditor from '@/components/NotesEditor';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Note {
  id: string;
  title: string;
  plain_text: string;
  tags: string[];
  updated_at: string;
  task_id?: string;
  project_id?: string;
}

function NotesPageContent() {
  const searchParams = useSearchParams();
  const taskIdParam = searchParams.get('taskId');
  const taskTitleParam = searchParams.get('taskTitle');
  const projectTagParam = searchParams.get('projectTag');

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [taskId, setTaskId] = useState<string | undefined>(undefined);
  const [taskTitle, setTaskTitle] = useState<string | undefined>(undefined);
  const [projectTag, setProjectTag] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchNotes();
    fetchAllTags();

    // If taskId is provided in URL, check if note exists for this task
    if (taskIdParam) {
      setTaskId(taskIdParam);
      if (taskTitleParam) {
        setTaskTitle(taskTitleParam);
      }
      if (projectTagParam) {
        setProjectTag(projectTagParam);
      }
      checkExistingNoteForTask(taskIdParam);
    }
  }, [searchQuery, selectedTag, taskIdParam, taskTitleParam, projectTagParam]);

  const checkExistingNoteForTask = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('id')
        .eq('task_id', taskId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Note exists for this task, select it
        setSelectedNoteId(data.id);
        setIsCreatingNew(false);
      } else {
        // No note exists, create new one
        setSelectedNoteId(null);
        setIsCreatingNew(true);
      }
    } catch (error) {
      console.error('Error checking for existing note:', error);
      setIsCreatingNew(true);
    }
  };

  const fetchNotes = async () => {
    try {
      let query = supabase
        .from('notes')
        .select('id, title, plain_text, tags, updated_at, task_id, project_id')
        .order('updated_at', { ascending: false });

      // Filter by tag if selected
      if (selectedTag) {
        query = query.contains('tags', [selectedTag]);
      }

      // Search if query exists
      if (searchQuery) {
        query = query.textSearch('search_vector', searchQuery);
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const fetchAllTags = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('tags');

      if (error) throw error;

      // Extract unique tags
      const tagSet = new Set<string>();
      data?.forEach(note => {
        note.tags?.forEach((tag: string) => tagSet.add(tag));
      });

      setAllTags(Array.from(tagSet).sort());
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleCreateNew = () => {
    setSelectedNoteId(null);
    setIsCreatingNew(true);
  };

  const handleNoteSelect = (noteId: string) => {
    setSelectedNoteId(noteId);
    setIsCreatingNew(false);
  };

  const handleNoteSaved = async (noteId: string) => {
    setSelectedNoteId(noteId);
    setIsCreatingNew(false);
    await fetchNotes();
    await fetchAllTags();
  };

  const handleCancelNew = () => {
    setIsCreatingNew(false);
    setSelectedNoteId(null);
    setTaskId(undefined);
    setTaskTitle(undefined);
    setProjectTag(undefined);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      // First, get the note to extract image URLs
      const { data: noteData, error: fetchError } = await supabase
        .from('notes')
        .select('content')
        .eq('id', noteId)
        .single();

      if (fetchError) throw fetchError;

      // Extract and delete images from storage
      if (noteData?.content) {
        const imageUrls = extractImageUrls(noteData.content);
        for (const imageUrl of imageUrls) {
          try {
            // Extract file path from URL
            // URL format: https://{project}.supabase.co/storage/v1/object/public/notes/{filePath}
            const urlParts = imageUrl.split('/notes/');
            if (urlParts.length === 2) {
              const filePath = urlParts[1];
              await supabase.storage.from('notes').remove([filePath]);
              console.log('Deleted image:', filePath);
            }
          } catch (error) {
            console.error('Error deleting image:', error);
          }
        }
      }

      // Delete the note
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      if (selectedNoteId === noteId) {
        setSelectedNoteId(null);
        setIsCreatingNew(false);
      }

      fetchNotes();
      fetchAllTags();
    } catch (error) {
      console.error('Error deleting note:', error);
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

  const handleDeleteTag = async (tagToDelete: string) => {
    if (!confirm(`Delete the tag "${tagToDelete}" from all notes?`)) return;

    try {
      // Get all notes with this tag
      const { data: notesWithTag, error: fetchError } = await supabase
        .from('notes')
        .select('id, tags')
        .contains('tags', [tagToDelete]);

      if (fetchError) throw fetchError;

      // Update each note to remove the tag
      for (const note of notesWithTag || []) {
        const updatedTags = note.tags.filter((tag: string) => tag !== tagToDelete);
        const { error: updateError } = await supabase
          .from('notes')
          .update({ tags: updatedTags })
          .eq('id', note.id);

        if (updateError) throw updateError;
      }

      // Clear the selected tag filter if it was the deleted tag
      if (selectedTag === tagToDelete) {
        setSelectedTag(null);
      }

      // Refresh notes and tags
      fetchNotes();
      fetchAllTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('Failed to delete tag. Please try again.');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Notes</h1>
            <Link href="/" className="text-blue-500 hover:text-blue-600">
              Back
            </Link>
          </div>
          <button
            onClick={handleCreateNew}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + New Note
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full px-3 py-2 border rounded outline-none"
          />
        </div>

        {/* Tags Filter */}
        <div className="p-4 border-b flex flex-col max-h-64">
          <div className="text-sm font-semibold mb-2">Filter by Tag</div>
          <div className="flex flex-wrap gap-2 overflow-y-auto">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2 py-1 rounded text-sm flex-shrink-0 ${
                !selectedTag ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <div
                key={tag}
                className={`flex items-center gap-1 px-2 py-1 rounded text-sm flex-shrink-0 ${
                  selectedTag === tag ? 'bg-blue-500 text-white' : 'bg-gray-100'
                }`}
              >
                <button
                  onClick={() => setSelectedTag(tag)}
                  className="hover:opacity-80"
                >
                  {tag}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTag(tag);
                  }}
                  className="text-xs hover:opacity-80 ml-1"
                  title="Delete tag"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto">
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => handleNoteSelect(note.id)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                selectedNoteId === note.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{note.title}</h3>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {note.tags && note.tags.length > 0 ? (
                      note.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 italic">No tags</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNote(note.id);
                  }}
                  className="ml-2 text-red-500 hover:text-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {notes.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {searchQuery || selectedTag ? 'No notes found' : 'No notes yet. Create one!'}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        {(selectedNoteId || isCreatingNew) ? (
          <NotesEditor
            key={selectedNoteId || 'new'}
            noteId={selectedNoteId || undefined}
            taskId={taskId}
            initialTitle={taskTitle}
            initialTag={projectTag}
            onSave={handleNoteSaved}
            onCancel={handleCancelNew}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a note or create a new one
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotesPage() {
  return (
    <ProtectedRoute>
      <NotesPageContent />
    </ProtectedRoute>
  );
}
